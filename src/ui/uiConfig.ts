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
  musicKey: 'animal-feast:music',
  /** Vibration patterns (ms on/off). */
  haptics: {
    step: [6],
    chain: [18],
    longChain: [25, 30, 25],
    frenzy: [35, 40, 70],
    invalid: [10, 40, 10],
    gameOver: [40, 60, 40],
  } as Record<string, number[]>,
  /** Celebrations: board shake (fraction of a cell). */
  shake: { frenzy: 0.12, longChain: 0.05 },
  /**
   * Canvas effects (fx/recipes.ts). Sizes and speeds in cells (speeds per second); lives in ms,
   * within maxAnimMs. spillPx lets effects spread past the board's edge.
   */
  fx: {
    spillPx: 48,
    chainParticles: 14, longChainExtra: 12, perWaveExtra: 6, sparks: 36,
    dotSize: 0.07, chainSpeed: 4.5, chainLifeMs: 460, ringLifeMs: 400,
    frenzyReach: 3.6, frenzyLifeMs: 500, whirlLifeMs: 480, whirlBubbles: 28,
    /** Predator bite: squash and stretch when it eats. */
    chompMs: 240,
    /** Screen flash strength by moment (opacity), and how much more each wave adds. */
    flash: { frenzy: 0.55, whirl: 0.4, wave: 0.12, perWave: 0.08, maxWave: 0.45 },
  },
  /**
   * Music of a move: an eaten chain plays up to maxRunNotes notes of the pentatonic ladder,
   * runStepMs apart; each wave starts rungsPerWave rungs higher (capped at maxWaveStep waves).
   */
  /**
   * Background bubbles (fx/Ambient.tsx). Speed in px/s; energy from big moments makes more and
   * faster bubbles and a glow, and fades by decayPerSecond.
   */
  ambient: {
    bubbles: 14, minRadius: 2, maxRadius: 7, speed: 28,
    maxEnergy: 3, decayPerSecond: 1.6, speedBoost: 1.5, countBoost: 1.2, glow: 0.12,
    boost: { wave: 0.5, whirl: 1, frenzy: 1.6 },
  },
  /** The reaction banner grows this much per extra wave. */
  waveTextGrow: 0.18,
  /**
   * Background music (music.ts): tempo, scheduler timing and voice levels. hotEnergy is the sea's
   * energy at which the music is at full intensity.
   */
  music: { bpm: 96, tickMs: 25, lookAheadMs: 120, pad: 0.018, bass: 0.07, melody: 0.025, kick: 0.09, shaker: 0.02, hat: 0.03, hotEnergy: 1.2 },
  sound: { maxRunNotes: 6, runStepMs: 55, rungsPerWave: 3, maxWaveStep: 4 },
  /** Clock ticks in the last seconds. */
  warningTickMs: 5000,
  /** End screen: score count-up and confetti (outside play, so not bound by maxAnimMs). */
  countUpMs: 500,
  confettiMs: 1100,
  confettiPieces: 28,
} as const;
