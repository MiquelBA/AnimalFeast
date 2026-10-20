// Presentation values (timings, sizes). Gameplay values live in src/engine/config.ts.
export const UI = {
  /** Board width as a fraction of the viewport, capped in px. */
  boardWidthFraction: 0.92,
  boardMaxPx: 480,
  /** A cell is marked only when the finger is within this fraction of the cell size from its centre. */
  hitRadius: 0.35,
  /** Idle time before a possible chain glows. */
  hintDelayMs: 5000,
  /** Animation durations; no normal animation goes over maxAnimMs. */
  anim: { eat: 260, fall: 300, frenzy: 480, whirl: 460, shuffle: 400, shake: 300, pop: 220, floatText: 500 },
  maxAnimMs: 500,
  /** Energy pips shown on predators. */
  energyPips: 3,
  /** Extra scale for a predator at full energy. */
  energyScale: 0.12,
  /** Clock turns red under this many ms. */
  clockWarningMs: 10_000,
  /** Combo text by combo count (index = count − 2, last one repeats). */
  comboTextKeys: ['comboGreat', 'comboAmazing', 'comboFeast'] as const,
  /** v0.6 changed scoring a lot, so its record starts fresh. */
  bestScoreKey: 'animal-feast:best:v0.6',
  soundKey: 'animal-feast:sound',
  /** Vibration patterns (ms on/off). */
  haptics: {
    step: [6],
    chain: [18],
    longChain: [25, 30, 25],
    frenzy: [35, 40, 70],
    invalid: [10, 40, 10],
    gameOver: [40, 60, 40],
  } as Record<string, number[]>,
  /** Celebrations: board shake (fraction of a cell) and particles per burst. */
  shake: { frenzy: 0.12, longChain: 0.05 },
  particles: {
    chain: 10, longChain: 16, frenzy: 26,
    /** Sizes as fractions of a cell (every fourth one is big) and how far they fly, in cells. */
    big: 0.2, small: 0.12, reach: 1.3, frenzyReach: 2.4,
  },
  /**
   * Music of a move: an eaten chain plays up to maxRunNotes notes of the pentatonic ladder,
   * runStepMs apart; each wave starts rungsPerWave rungs higher (capped at maxWaveStep waves).
   */
  sound: { maxRunNotes: 6, runStepMs: 55, rungsPerWave: 3, maxWaveStep: 4 },
  /** Clock ticks in the last seconds. */
  warningTickMs: 5000,
  /** End screen: score count-up and confetti (outside play, so not bound by maxAnimMs). */
  countUpMs: 500,
  confettiMs: 1100,
  confettiPieces: 28,
} as const;
