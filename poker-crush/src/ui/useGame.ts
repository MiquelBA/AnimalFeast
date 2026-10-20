// The game loop for React: engine state, the clock, and the queue of animation frames. The UI only
// plays back the engine's events; it never decides a rule.
import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_CONFIG } from '../engine/config';
import { applyMove, findHands, newGame, tick } from '../engine/game';
import type { GameEvent, GameState, GameStats, HandType, Pos } from '../engine/types';
import { playHand, playSound } from './audio';
import { idleFrame, moveFrames, type Frame } from './frames';
import { vibrate } from './haptics';
import { HAND_TIER, UI } from './uiConfig';

export type Phase = 'menu' | 'countdown' | 'playing' | 'over';

export interface Floater {
  readonly id: number;
  readonly kind: 'points' | 'combo' | 'time' | 'golden' | 'shuffle' | 'blast';
  readonly text?: string;
  readonly value: number;
  /** Cell position (fractional) for points; banners have none. */
  readonly at?: { readonly row: number; readonly col: number };
}

let nextFloaterId = 1;

/** The big name of the hand just played, on screen a little longer than its animation. */
export interface Banner {
  readonly id: number;
  readonly hand: HandType;
  readonly tier: number;
  readonly points: number;
}

export interface GameApi {
  readonly state: GameState;
  readonly frame: Frame;
  readonly phase: Phase;
  readonly paused: boolean;
  readonly countdown: number | null;
  readonly floaters: readonly Floater[];
  readonly banner: Banner | null;
  readonly hint: readonly Pos[] | null;
  readonly busy: boolean;
  readonly stats: GameStats | null;
  readonly seed: number;
  start(seed: number): void;
  play(path: readonly Pos[]): boolean;
  setPaused(p: boolean): void;
  quit(): void;
  activity(): void;
}

export function useGame(onOver: (state: GameState) => void): GameApi {
  const [state, setState] = useState<GameState>(() => newGame({ seed: 7, config: DEFAULT_CONFIG }));
  const [frame, setFrame] = useState<Frame>(() => idleFrame(state.board));
  const [phase, setPhase] = useState<Phase>('menu');
  const [paused, setPausedState] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [hint, setHint] = useState<readonly Pos[] | null>(null);
  const [stats, setStats] = useState<GameStats | null>(null);
  const [seed, setSeed] = useState(7);
  const stateRef = useRef(state);
  const queue = useRef<Frame[]>([]);
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const timers = useRef<number[]>([]);
  const lastActivity = useRef(performance.now());
  const pausedRef = useRef(false);
  const phaseRef = useRef<Phase>('menu');
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const commit = (s: GameState) => {
    stateRef.current = s;
    setState(s);
  };
  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const float = useCallback((f: Omit<Floater, 'id'>, delayMs = 0) => {
    const add = () => {
      const id = nextFloaterId++;
      setFloaters((list) => [...list, { ...f, id }]);
      window.setTimeout(() => setFloaters((list) => list.filter((x) => x.id !== id)), UI.anim.floatText + 600);
    };
    if (delayMs) window.setTimeout(add, delayMs);
    else add();
  }, []);

  const finish = useCallback((s: GameState) => {
    const over = () => {
      setPhaseBoth('over');
      setHint(null);
      setStats({ score: s.score, moves: s.moves, maxCombo: s.maxCombo, bestMove: s.bestMove, bestHand: s.bestHand, handCounts: s.handCounts });
      playSound('gameOver');
      vibrate('gameOver');
      onOverRef.current(s);
    };
    if (busyRef.current) later(over, 400);
    else over();
  }, []);

  // ------------------------------------------------------------ frames
  const runQueue = useCallback(() => {
    const next = queue.current.shift();
    if (!next) {
      busyRef.current = false;
      setBusy(false);
      setFrame(idleFrame(stateRef.current.board));
      lastActivity.current = performance.now();
      if (stateRef.current.gameOver && phaseRef.current === 'playing') finish(stateRef.current);
      return;
    }
    setFrame(next);
    if (next.kind === 'shuffle') {
      playSound('shuffle');
      float({ kind: 'shuffle', value: 0 });
    }
    if (next.kind === 'fall') later(() => playSound('land'), next.duration * 0.7);
    later(runQueue, next.duration);
  }, [finish, float]);

  // ------------------------------------------------------------ start / quit
  const start = useCallback((newSeed: number) => {
    clearTimers();
    queue.current = [];
    busyRef.current = false;
    setBusy(false);
    const s = newGame({ seed: newSeed, config: DEFAULT_CONFIG });
    commit(s);
    setSeed(newSeed);
    setFrame(idleFrame(s.board));
    setFloaters([]);
    setBanner(null);
    setHint(null);
    setStats(null);
    pausedRef.current = false;
    setPausedState(false);
    setPhaseBoth('countdown');
    const { steps, stepMs, goMs } = UI.countdown;
    for (let i = 0; i < steps; i++) {
      later(() => {
        setCountdown(steps - i);
        playSound('count');
        vibrate('count');
      }, i * stepMs);
    }
    later(() => {
      setCountdown(0);
      playSound('go');
      vibrate('go');
      setPhaseBoth('playing');
      lastActivity.current = performance.now();
    }, steps * stepMs);
    later(() => setCountdown(null), steps * stepMs + goMs);
  }, []);

  const quit = useCallback(() => {
    clearTimers();
    queue.current = [];
    busyRef.current = false;
    setBusy(false);
    setCountdown(null);
    pausedRef.current = false;
    setPausedState(false);
    setPhaseBoth('menu');
    setFrame(idleFrame(stateRef.current.board));
  }, []);

  const setPaused = useCallback((p: boolean) => {
    if (phaseRef.current !== 'playing') return;
    pausedRef.current = p;
    setPausedState(p);
    lastActivity.current = performance.now();
  }, []);

  // ------------------------------------------------------------ playing a hand
  const play = useCallback((path: readonly Pos[]): boolean => {
    const s = stateRef.current;
    if (phaseRef.current !== 'playing' || pausedRef.current || busyRef.current) return false;
    const { state: next, events } = applyMove(s, { path, atMs: s.elapsedMs });
    if (!events.length) return false;
    setHint(null);
    lastActivity.current = performance.now();
    commit(next);
    react(events);
    queue.current = moveFrames(s.board, events, next.board);
    busyRef.current = true;
    setBusy(true);
    runQueue();
    return true;
  }, [runQueue]);

  /** Sound, vibration and floating texts for a move's events. */
  const react = (events: readonly GameEvent[]) => {
    const handEvent = events.find((e) => e.type === 'hand');
    if (handEvent?.type !== 'hand') return;
    const tier = HAND_TIER[handEvent.hand];
    const combo = events.find((e) => e.type === 'combo');
    const comboCount = combo?.type === 'combo' ? combo.count : 1;
    playHand(tier, comboCount);
    const bannerId = nextFloaterId++;
    setBanner({ id: bannerId, hand: handEvent.hand, tier, points: handEvent.points });
    window.setTimeout(() => setBanner((b) => (b?.id === bannerId ? null : b)), UI.anim.banner[tier]);
    vibrate(tier >= 3 ? 'huge' : tier >= 2 ? 'big' : 'hand');
    const at = {
      row: handEvent.path.reduce((a, p) => a + p.row, 0) / handEvent.path.length,
      col: handEvent.path.reduce((a, p) => a + p.col, 0) / handEvent.path.length,
    };
    const collectMs = UI.anim.collect[tier];
    float({ kind: 'points', value: handEvent.points, at }, collectMs * 0.55);
    if (handEvent.goldenMultiplier > 1) {
      float({ kind: 'golden', value: handEvent.goldenMultiplier }, 120);
      later(() => playSound('golden'), 120);
    }
    if (combo?.type === 'combo') {
      float({ kind: 'combo', value: combo.count, text: String(combo.multiplier) }, 200);
      later(() => playSound('combo'), 200);
    }
    for (const e of events) {
      if (e.type === 'blast') {
        later(() => playSound('blast'), collectMs);
        float({ kind: 'blast', value: e.points, at: e.origin }, collectMs + 200);
      }
      if (e.type === 'timeBonus') {
        float({ kind: 'time', value: e.ms }, collectMs * 0.7);
        later(() => playSound('timeBonus'), collectMs * 0.7);
      }
    }
  };

  // ------------------------------------------------------------ clock
  useEffect(() => {
    if (phase !== 'playing') return;
    let raf = 0;
    let last = performance.now();
    let lastWarn = -1;
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      const s = stateRef.current;
      if (!pausedRef.current && !busyRef.current && !s.gameOver) {
        const r = tick(s, dt);
        commit(r.state);
        const left = r.state.timeLimitMs - r.state.elapsedMs;
        const sec = Math.ceil(left / 1000);
        if (left <= UI.warningTickMs && sec !== lastWarn && left > 0) {
          lastWarn = sec;
          playSound('warning');
        }
        if (r.state.gameOver) {
          finish(r.state);
          return;
        }
        // A hint after a while without playing.
        if (now - lastActivity.current > UI.hintDelayMs) {
          lastActivity.current = now;
          const hands = findHands(r.state.board, r.state.config, 12);
          if (hands.length) setHint(hands[Math.floor(Math.random() * hands.length)].path);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, finish]);

  // Pause when the app goes to the background.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && phaseRef.current === 'playing') setPaused(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [setPaused]);

  useEffect(() => () => clearTimers(), []);

  // Development only: lets automated checks read and set the game.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __pc: unknown }).__pc = {
      get: () => stateRef.current,
      set: (s: GameState) => { commit(s); setFrame(idleFrame(s.board)); },
    };
  }, []);

  const activity = useCallback(() => {
    lastActivity.current = performance.now();
    setHint(null);
  }, []);

  return { state, frame, phase, paused, countdown, floaters, banner, hint, busy, stats, seed, start, play, setPaused, quit, activity };
}
