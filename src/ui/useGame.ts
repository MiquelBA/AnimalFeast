// Game session for the UI: engine state, clock, animation queue, hint, pause and best score.
import { useCallback, useEffect, useRef, useState } from 'react';
import { legalChains } from '../engine/chains';
import { DEFAULT_CONFIG } from '../engine/config';
import { applyMove, createGame, isLegalMove, remainingMs, tick } from '../engine/game';
import type { Board, GameConfig, GameState, Pos } from '../engine/types';
import { buildFrames, tilesOf, type Effect, type Frame, type FrameKind } from './frames';
import { loadBest, saveBest } from './storage';
import { UI } from './uiConfig';

export type Phase = 'ready' | 'playing' | 'paused' | 'over';

/** What the board draws right now: a frame of a move's animation, or the idle board. */
export interface Display extends Omit<Frame, 'kind'> {
  readonly kind: FrameKind | 'idle';
  /** Changes with every frame shown, so the board knows when to animate. */
  readonly frameId: number;
}

export interface Floater {
  readonly id: number;
  readonly effect: Effect;
}

function idleDisplay(board: Board, frameId: number): Display {
  return { kind: 'idle', tiles: tilesOf(board), ghosts: [], entering: new Map(), effects: [], duration: 0, frameId };
}

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

/** Clock shown in tenths of a second, so the HUD doesn't re-render on every animation frame. */
function clockOf(state: GameState): number {
  return Math.ceil(remainingMs(state) / 100) * 100;
}

/** A chain to suggest after a while without playing: the longest one available. */
function pickHint(board: Board, config: GameConfig): readonly Pos[] | null {
  const chains = legalChains(board, config);
  if (!chains.length) return null;
  return chains.reduce((best, c) => (c.length > best.length ? c : best));
}

export function useGame(config: GameConfig = DEFAULT_CONFIG) {
  const [game, setGame] = useState(() => createGame({ seed: newSeed(), config }));
  const gameRef = useRef(game);
  const [display, setDisplay] = useState<Display>(() => idleDisplay(game.board, 0));
  const [phase, setPhaseState] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  const [animating, setAnimatingState] = useState(false);
  const animatingRef = useRef(false);
  const [clockMs, setClockMs] = useState(() => clockOf(game));
  const [best, setBest] = useState(loadBest);
  const [newBest, setNewBest] = useState(false);
  const [floaters, setFloaters] = useState<readonly Floater[]>([]);
  const [hint, setHint] = useState<readonly Pos[] | null>(null);
  const [activity, setActivity] = useState(0);
  const timers = useRef<number[]>([]);
  const seq = useRef(0);

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); }, []);
  const setAnimating = useCallback((a: boolean) => { animatingRef.current = a; setAnimatingState(a); }, []);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  const finish = useCallback((state: GameState) => {
    gameRef.current = state;
    setGame(state);
    setClockMs(0);
    setPhase('over');
    if (state.score > loadBest()) {
      saveBest(state.score);
      setBest(state.score);
      setNewBest(true);
    }
  }, [setPhase]);

  // Clock: runs only while playing and (by rule) not while a move's animations play.
  const clockStopped = phase !== 'playing' || (animating && config.pauseClockDuringResolution);
  useEffect(() => {
    if (clockStopped) return;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const { state, events } = tick(gameRef.current, now - last);
      last = now;
      gameRef.current = state;
      if (events.some((e) => e.type === 'gameOver')) { finish(state); return; }
      setClockMs(clockOf(state));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [clockStopped, finish]);

  const pause = useCallback(() => { if (phaseRef.current === 'playing') setPhase('paused'); }, [setPhase]);
  const resume = useCallback(() => { if (phaseRef.current === 'paused') setPhase('playing'); }, [setPhase]);

  // Auto-pause when the player leaves the app.
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', pause);
    };
  }, [pause]);

  // Hint: after a while without playing, a possible chain glows.
  const hintable = (phase === 'ready' || phase === 'playing') && !animating;
  useEffect(() => {
    if (!hintable) return;
    const id = window.setTimeout(() => setHint(pickHint(gameRef.current.board, config)), UI.hintDelayMs);
    return () => { window.clearTimeout(id); setHint(null); };
  }, [hintable, activity, game, config]);

  const noteActivity = useCallback(() => setActivity((n) => n + 1), []);

  const addFloaters = useCallback((effects: readonly Effect[]) => {
    const shown = effects.filter((e) => e.type === 'points' || e.type === 'text').map((effect) => ({ id: ++seq.current, effect }));
    if (!shown.length) return;
    setFloaters((f) => [...f, ...shown]);
    const ids = new Set(shown.map((f) => f.id));
    later(() => setFloaters((f) => f.filter((x) => !ids.has(x.id))), UI.anim.floatText);
  }, [later]);

  const runFrames = useCallback((frames: readonly Frame[]) => {
    const step = (i: number) => {
      if (i >= frames.length) {
        const state = gameRef.current;
        setDisplay(idleDisplay(state.board, ++seq.current));
        setGame(state);
        setAnimating(false);
        if (state.gameOver) finish(state);
        return;
      }
      const frame = frames[i];
      setDisplay({ ...frame, frameId: ++seq.current });
      addFloaters(frame.effects);
      later(() => step(i + 1), frame.duration);
    };
    step(0);
  }, [addFloaters, finish, later, setAnimating]);

  /** Plays a traced chain. Returns false (and changes nothing) when it can't be played. */
  const play = useCallback((path: readonly Pos[]): boolean => {
    const phaseNow = phaseRef.current;
    if (animatingRef.current || (phaseNow !== 'ready' && phaseNow !== 'playing')) return false;
    const before = gameRef.current;
    const move = { path, atMs: before.elapsedMs };
    if (!isLegalMove(before, move)) return false;
    const { state, events } = applyMove(before, move);
    gameRef.current = state;
    if (phaseNow === 'ready') setPhase('playing');
    setAnimating(true);
    runFrames(buildFrames(before.board, events));
    return true;
  }, [runFrames, setAnimating, setPhase]);

  const restart = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const fresh = createGame({ seed: newSeed(), config });
    gameRef.current = fresh;
    setGame(fresh);
    setDisplay(idleDisplay(fresh.board, ++seq.current));
    setClockMs(clockOf(fresh));
    setFloaters([]);
    setNewBest(false);
    setAnimating(false);
    setPhase('ready');
  }, [config, setAnimating, setPhase]);

  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  return { game, display, phase, animating, clockMs, best, newBest, floaters, hint, play, pause, resume, restart, noteActivity };
}
