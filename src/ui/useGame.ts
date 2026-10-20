// Game session for the UI: engine state, countdown, clock, animation queue, hint, pause and best score.
import { useCallback, useEffect, useRef, useState } from 'react';
import { legalChains } from '../engine/chains';
import { applyMove, createGame, isLegalMove, remainingMs, tick } from '../engine/game';
import type { Board, GameConfig, GameState, Pos } from '../engine/types';
import { buildFrames, tilesOf, type Effect, type Frame, type FrameKind } from './frames';
import type { Scenario } from '../scenarios';
import { loadBest, saveBest } from './storage';
import { UI } from './uiConfig';

/**
 * 'start' waits for the first tap (phones only allow sound after one); 'ready' is the 3, 2, 1
 * countdown before the clock starts.
 */
export type Phase = 'start' | 'ready' | 'playing' | 'paused' | 'over';

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

export interface NewGameOptions {
  readonly seed?: number;
  readonly config?: GameConfig;
  /** Starting board (debug); the config's board size is ignored. */
  readonly board?: Board;
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

/** Feedback hooks (sound, vibration): called as frames show and when the game ends. */
export interface GameFeedback {
  readonly onFrame?: (frame: Frame) => void;
  readonly onFinish?: (newBest: boolean) => void;
  /** Each countdown number (3, 2, 1), then 0 as play starts. */
  readonly onCountdown?: (count: number) => void;
}

/** A game in `scenario`; `initialConfig` (a debug variant) defaults to the scenario's rules. */
export function useGame(scenario: Scenario, initialConfig: GameConfig = scenario.config, feedback: GameFeedback = {}) {
  const feedbackRef = useRef(feedback);
  useEffect(() => { feedbackRef.current = feedback; });
  const [game, setGame] = useState(() => createGame({ seed: newSeed(), config: initialConfig }));
  const gameRef = useRef(game);
  const config = game.config;
  const [display, setDisplay] = useState<Display>(() => idleDisplay(game.board, 0));
  const [phase, setPhaseState] = useState<Phase>('start');
  const phaseRef = useRef<Phase>('start');
  const [animating, setAnimatingState] = useState(false);
  const animatingRef = useRef(false);
  /** True during a move's last fall: the final board is known, so a new trace may start. */
  const [settling, setSettlingState] = useState(false);
  const settlingRef = useRef(false);
  const [clockMs, setClockMs] = useState(() => clockOf(game));
  const [best, setBest] = useState(() => loadBest(scenario.recordKey));
  const [newBest, setNewBest] = useState(false);
  /** Only games with the default rules count for the record. */
  const recordsBest = useRef(initialConfig === scenario.config);
  const [records, setRecords] = useState(initialConfig === scenario.config);
  const [floaters, setFloaters] = useState<readonly Floater[]>([]);
  const [hint, setHint] = useState<readonly Pos[] | null>(null);
  const [activity, setActivity] = useState(0);
  /** The number shown by the countdown (0 = go), or null when none is shown. */
  const [countdown, setCountdown] = useState<number | null>(null);
  /** Changes with every new game, so a new countdown starts even if one was running. */
  const [round, setRound] = useState(0);
  /** Pausing during the countdown makes resuming count down again. */
  const pausedInCountdown = useRef(false);
  const timers = useRef<number[]>([]);
  const frameTimer = useRef<number | null>(null);
  const seq = useRef(0);

  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p); }, []);
  const setAnimating = useCallback((a: boolean) => { animatingRef.current = a; setAnimatingState(a); }, []);
  const setSettling = useCallback((s: boolean) => { settlingRef.current = s; setSettlingState(s); }, []);
  const later = useCallback((fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); }, []);

  const finish = useCallback((state: GameState) => {
    gameRef.current = state;
    setGame(state);
    setClockMs(clockOf(state));
    setPhase('over');
    const isBest = recordsBest.current && state.score > loadBest(scenario.recordKey);
    if (isBest) {
      saveBest(scenario.recordKey, state.score);
      setBest(state.score);
      setNewBest(true);
    }
    feedbackRef.current.onFinish?.(isBest);
  }, [scenario, setPhase]);

  // Clock: runs only while playing and (by rule) not while a move's animations play.
  const clockStopped = phase !== 'playing' || config.mode !== 'time' || (animating && config.pauseClockDuringResolution);
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

  const pause = useCallback(() => {
    const now = phaseRef.current;
    if (now !== 'playing' && now !== 'ready') return;
    pausedInCountdown.current = now === 'ready';
    setPhase('paused');
  }, [setPhase]);
  /** The first tap: starts the countdown. */
  const begin = useCallback(() => { if (phaseRef.current === 'start') setPhase('ready'); }, [setPhase]);
  const resume = useCallback(() => {
    if (phaseRef.current === 'paused') setPhase(pausedInCountdown.current ? 'ready' : 'playing');
  }, [setPhase]);

  // Countdown: 3, 2, 1, go! The clock starts on "go".
  useEffect(() => {
    if (phase !== 'ready') return;
    const { steps, stepMs } = UI.countdown;
    const show = (count: number) => { setCountdown(count); feedbackRef.current.onCountdown?.(count); };
    show(steps);
    const ids = Array.from({ length: steps }, (_, i) => window.setTimeout(() => {
      const count = steps - 1 - i;
      show(count);
      if (count === 0) setPhase('playing');
    }, (i + 1) * stepMs));
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      setCountdown((c) => (c === 0 ? c : null));
    };
  }, [phase, round, setPhase]);
  useEffect(() => {
    if (countdown !== 0) return;
    const id = window.setTimeout(() => setCountdown(null), UI.countdown.goMs);
    return () => window.clearTimeout(id);
  }, [countdown]);

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
  const hintable = phase === 'playing' && !animating;
  useEffect(() => {
    if (!hintable) return;
    const id = window.setTimeout(() => setHint(pickHint(gameRef.current.board, gameRef.current.config)), UI.hintDelayMs);
    return () => { window.clearTimeout(id); setHint(null); };
  }, [hintable, activity, game]);

  const noteActivity = useCallback(() => setActivity((n) => n + 1), []);

  const addFloaters = useCallback((effects: readonly Effect[]) => {
    const shown = effects.filter((e) => e.type === 'points' || e.type === 'text').map((effect) => ({ id: ++seq.current, effect }));
    if (!shown.length) return;
    setFloaters((f) => [...f, ...shown]);
    const ids = new Set(shown.map((f) => f.id));
    later(() => setFloaters((f) => f.filter((x) => !ids.has(x.id))), UI.anim.floatText);
  }, [later]);

  const stopFrames = useCallback(() => {
    if (frameTimer.current !== null) window.clearTimeout(frameTimer.current);
    frameTimer.current = null;
  }, []);

  /** Ends a move's animation: the board shows the engine's state and accepts traces again. */
  const settle = useCallback(() => {
    stopFrames();
    const state = gameRef.current;
    setDisplay(idleDisplay(state.board, ++seq.current));
    setGame(state);
    setSettling(false);
    setAnimating(false);
    if (state.gameOver) finish(state);
  }, [finish, setAnimating, setSettling, stopFrames]);

  const runFrames = useCallback((frames: readonly Frame[]) => {
    const step = (i: number) => {
      if (i >= frames.length) { settle(); return; }
      const frame = frames[i];
      setDisplay({ ...frame, frameId: ++seq.current });
      addFloaters(frame.effects);
      feedbackRef.current.onFrame?.(frame);
      if (i === frames.length - 1 && frame.kind === 'fall' && !gameRef.current.gameOver) {
        setGame(gameRef.current);
        setSettling(true);
      }
      frameTimer.current = window.setTimeout(() => step(i + 1), frame.duration);
    };
    step(0);
  }, [addFloaters, settle, setSettling]);

  /** Plays a traced chain. Returns false (and changes nothing) when it can't be played. */
  const play = useCallback((path: readonly Pos[]): boolean => {
    if (phaseRef.current !== 'playing') return false;
    if (animatingRef.current && !settlingRef.current) return false;
    const before = gameRef.current;
    const move = { path, atMs: before.elapsedMs };
    if (!isLegalMove(before, move)) return false;
    if (animatingRef.current) settle(); // released during the last fall: skip to its end
    const { state, events } = applyMove(before, move);
    gameRef.current = state;
    setAnimating(true);
    runFrames(buildFrames(before.board, events));
    return true;
  }, [runFrames, setAnimating, settle]);

  const restart = useCallback((options: NewGameOptions = {}) => {
    stopFrames();
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    const config = options.config ?? gameRef.current.config;
    recordsBest.current = config === scenario.config && !options.board;
    setRecords(recordsBest.current);
    const fresh = createGame({ seed: options.seed ?? newSeed(), config, board: options.board });
    gameRef.current = fresh;
    setGame(fresh);
    setDisplay(idleDisplay(fresh.board, ++seq.current));
    setClockMs(clockOf(fresh));
    setFloaters([]);
    setNewBest(false);
    setSettling(false);
    setAnimating(false);
    pausedInCountdown.current = false;
    setRound((r) => r + 1);
    setPhase('ready');
  }, [scenario, setAnimating, setPhase, setSettling, stopFrames]);

  useEffect(() => () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    if (frameTimer.current !== null) window.clearTimeout(frameTimer.current);
  }, []);

  return {
    game, config, display, phase, countdown, animating, settling, clockMs, best, records, newBest, floaters, hint,
    play, begin, pause, resume, restart, noteActivity,
  };
}
