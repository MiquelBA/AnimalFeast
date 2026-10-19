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
  anim: { eat: 260, fall: 300, frenzy: 480, shuffle: 400, shake: 300, pop: 220, floatText: 500 },
  maxAnimMs: 500,
  /** Energy pips shown on predators. */
  energyPips: 3,
  /** Extra scale for a predator at full energy. */
  energyScale: 0.12,
  /** Clock turns red under this many ms. */
  clockWarningMs: 10_000,
  /** Combo text by combo count (index = count − 2, last one repeats). */
  comboTextKeys: ['comboGreat', 'comboAmazing', 'comboFeast'] as const,
  bestScoreKey: 'animal-feast:best',
} as const;
