// Every game value lives here (REGLES.md). No magic numbers in the engine or the UI.
import type { GameConfig } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  // 6×6 rather than 7×7: bigger, readable cards, and fewer hands within reach (npm run sim).
  rows: 6,
  cols: 6,
  minLength: 3,
  maxLength: 5,
  decks: 2,
  jokersPerShoe: 3,
  goldenChance: 0.04,
  goldenMultiplier: 2,
  hands: {
    trips: { points: 60, timeBonusMs: 0, power: 'joker' },
    twoPair: { points: 100, timeBonusMs: 0, power: 'time' },
    straight: { points: 200, timeBonusMs: 0, power: 'row' },
    flush: { points: 250, timeBonusMs: 0, power: 'storm' },
    fullHouse: { points: 400, timeBonusMs: 2000, power: 'gild' },
    quads: { points: 800, timeBonusMs: 3000, blast: 'cross', power: 'double' },
    straightFlush: { points: 1500, timeBonusMs: 4000, blast: 'suit', power: 'double' },
    fiveKind: { points: 3000, timeBonusMs: 4000, blast: 'rank', power: 'double' },
    royalFlush: { points: 5000, timeBonusMs: 5000, blast: 'board', power: 'double' },
  },
  pointsPerPip: 2,
  blastPointsPerCard: 25,
  // Three of the same hand fire its power (REGLES.md).
  powerStreak: 3,
  powerTimeMs: 3000,
  comboWindowMs: 2500,
  comboMultipliers: [1, 1.2, 1.5, 2],
  minValidMoves: 3,
  maxShuffleAttempts: 20,
  mode: 'time',
  durationMs: 120_000,
  maxTimeBonusMs: 20_000,
  maxMoves: 30,
};

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
