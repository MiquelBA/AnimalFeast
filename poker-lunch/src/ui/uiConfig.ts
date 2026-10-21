// Presentation values (timings, sizes, colours). Gameplay values live in src/engine/config.ts.
import type { HandType } from '../engine/types';

/** How loud a hand is on screen: 0 small, up to 4 for the royal flush. */
export const HAND_TIER: Readonly<Record<HandType, number>> = {
  trips: 0,
  twoPair: 1,
  straight: 1,
  flush: 1,
  fullHouse: 2,
  quads: 2,
  straightFlush: 3,
  fiveKind: 3,
  royalFlush: 4,
};

export const SUIT_COLORS = ['#15171C', '#E0263A', '#1C6BE0', '#0E9A48'] as const;
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'] as const;

export const UI = {
  /** Cells are taller than wide, so cards look like cards. */
  cellAspect: 1.28,
  /** A cell is marked only when the finger is within this fraction of the cell from its centre. */
  hitRadius: 0.4,
  countdown: { steps: 3, stepMs: 700, goMs: 650 },
  hintDelayMs: 5000,
  /**
   * Animation of a move, by hand tier: the cards gather and burst (collect), the blast, the fall.
   * The clock stops meanwhile, so big hands can take their time.
   */
  anim: {
    collect: [380, 460, 640, 900, 1500] as readonly number[],
    blast: 560,
    fall: 340,
    shuffle: 520,
    /** New game: one card dealt every dealStep ms, each falling for dealCard ms. */
    dealStep: 38,
    dealCard: 420,
    /** Turning the cards over at "Som-hi!": a wave from the top-left corner. */
    flip: 460,
    flipStep: 45,
    shake: 280,
    floatText: 900,
    banner: [800, 1100, 1400, 1800, 2600] as readonly number[],
  },
  clockWarningMs: 10_000,
  warningTickMs: 5000,
  soundKey: 'poker-lunch:sound',
  bestKey: 'poker-lunch:best',
  daily: { timeZone: 'Europe/Madrid', key: 'poker-lunch:daily' },
  helpSeenKey: 'poker-lunch:help-seen',
  haptics: {
    step: [10],
    hand: [40],
    big: [80, 40, 120],
    huge: [140, 50, 140, 50, 300],
    invalid: [25, 40, 25],
    count: [25],
    go: [100],
    gameOver: [240, 120, 380],
  } as Record<string, number[]>,
  /** Screen shake (px) and board punch by hand tier. */
  shakePx: [0, 3, 8, 14, 20] as readonly number[],
  punch: [0.01, 0.02, 0.035, 0.05, 0.07] as readonly number[],
  /** Whole-screen flash (opacity) by hand tier. */
  flash: [0.05, 0.14, 0.32, 0.55, 0.8] as readonly number[],
  fx: {
    spillPx: 260,
    /** Particles by hand tier. */
    particles: [18, 30, 48, 80, 120] as readonly number[],
    dotSize: 0.09,
    speed: 6,
    lifeMs: 700,
    ringLifeMs: 560,
  },
  /** Comb text (index = combo count − 2; last one repeats). */
  comboTextKeys: ['comboHot', 'comboFire', 'comboBoom'] as const,
  sound: { runStepMs: 55 },
  countUpMs: 700,
} as const;
