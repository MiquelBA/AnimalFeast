// Presentation values (timings, sizes). Gameplay values live in src/engine/config.ts.
export const UI = {
  /** Board width as a fraction of the viewport, capped in px. */
  boardWidthFraction: 0.92,
  boardMaxPx: 480,
  /** A cell is marked only when the finger is within this fraction of the cell size from its centre. */
  hitRadius: 0.35,
  /** Countdown before each game: 3, 2, 1 one step apart, then "go" stays on screen goMs. */
  countdown: { steps: 3, stepMs: 750, goMs: 700 },
  /** How-to-play walkthrough (Tutorial.tsx): cell size, the pace of the finger, and of the chain's pairs. */
  tutorial: { cellPx: 62, startMs: 700, stepMs: 480, eatMs: 900, restMs: 600, pairMs: 1400 },
  /** Set when the player ticks "don't show again" on the walkthrough. */
  tutorialHiddenKey: 'animal-feast:tutorial-hidden',
  /** Idle time before a possible chain glows. */
  hintDelayMs: 5000,
  /** Animation durations; no normal animation goes over maxAnimMs. */
  anim: { eat: 260, fall: 300, frenzy: 480, whirl: 460, shuffle: 400, shake: 300, pop: 220, floatText: 500 },
  maxAnimMs: 500,
  /** Extra scale for a predator at full energy. */
  energyScale: 0.12,
  /** Clock turns red under this many ms. */
  clockWarningMs: 10_000,
  /** Combo text by combo count (index = count − 2, last one repeats). */
  comboTextKeys: ['comboGreat', 'comboAmazing', 'comboFeast'] as const,
  soundKey: 'animal-feast:sound',
  /** Visual mock-ups to try with ?look=<name> (?look=original goes back); the phone remembers the choice. */
  looks: ['adhesius', 'illustrat', 'contrast'] as readonly string[],
  lookKey: 'animal-feast:look',
  /** The daily challenge: where its day changes, and where the phone keeps its attempt and streak. */
  daily: { timeZone: 'Europe/Madrid', key: 'animal-feast:daily', tickMs: 10_000 },
  /** Vibration patterns (ms on/off). */
  haptics: {
    step: [12],
    land: [14],
    chain: [45],
    longChain: [70, 35, 90],
    wave: [90, 30, 60, 30, 120],
    whirl: [180, 40, 70, 40, 70, 40, 140],
    frenzy: [120, 45, 120, 45, 280],
    invalid: [25, 40, 25],
    count: [30],
    go: [120],
    gameOver: [260, 120, 420],
  } as Record<string, number[]>,
  /**
   * Punch (impact.ts): every moment gets an impact level (1 = chain of 3, up to max) that scales the
   * freeze after the hit, the screen shake, vibration and the boom under the sound.
   */
  impact: {
    perExtraPrey: 1, perWave: 1.2, perExtraChain: 0.6, shuffle: 1, whirl: 6, frenzy: 7, max: 8,
    /** Freeze frame after the hit, for impacts of `from` and up. */
    hitStop: { from: 2, baseMs: 70, perImpactMs: 25, maxMs: 220 },
    /** Whole-screen shake: px at impact 1, more per level, capped; big hits also twist. */
    shake: { basePx: 3, perImpactPx: 2.2, maxPx: 18, twistFrom: 4, twistDeg: 1.6, ms: 380 },
    /** Scale punch of the board on a hit. */
    punch: { perImpact: 0.008, max: 0.05, ms: 260 },
  },
  /**
   * Canvas effects (fx/recipes.ts). Sizes and speeds in cells (speeds per second); lives in ms,
   * within maxAnimMs. spillPx lets effects spread past the board's edge.
   */
  fx: {
    spillPx: 48,
    chainParticles: 24, longChainExtra: 20, perWaveExtra: 10, sparks: 60,
    dotSize: 0.095, chainSpeed: 6, chainLifeMs: 480, ringLifeMs: 440,
    frenzyReach: 4.8, frenzyLifeMs: 500, whirlLifeMs: 480, whirlBubbles: 40,
    /** Predator bite: squash and stretch when it eats. */
    chompMs: 300,
    /** Screen flash strength by moment (opacity), and how much more each wave adds. */
    flash: { frenzy: 0.8, whirl: 0.6, chain: 0.06, wave: 0.2, perWave: 0.1, maxWave: 0.6 },
  },
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
   * Music of a move: an eaten chain plays up to maxRunNotes notes of the pentatonic ladder,
   * runStepMs apart; each wave starts rungsPerWave rungs higher (capped at maxWaveStep waves).
   */
  sound: { maxRunNotes: 6, runStepMs: 55, rungsPerWave: 3, maxWaveStep: 4 },
  /** Clock ticks in the last seconds. */
  warningTickMs: 5000,
  /** End screen: score count-up and confetti (outside play, so not bound by maxAnimMs). */
  countUpMs: 500,
  /** Longest feedback message (the database allows 1000). */
  feedbackMaxChars: 1000,
  confettiMs: 1100,
  confettiPieces: 28,
} as const;
