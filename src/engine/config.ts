// All gameplay values live here (see REGLES.md v0.2). No magic numbers elsewhere.
import type { GameConfig } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  boardSize: 6,
  tiers: [
    { energyValue: 1, basePoints: 10, spawnWeight: 30 },
    { energyValue: 2, basePoints: 30, spawnWeight: 28 },
    { energyValue: 3, basePoints: 100, spawnWeight: 24 },
    { energyValue: 4, basePoints: 300, spawnWeight: 18 },
  ],
  adjacency: 8,
  allowDescendingTrace: true,
  chainLengths: [3, 4],
  spawnEnergy: 0,
  inheritRatio: 0.5,
  pointsPerPreyEnergy: 10,
  lengthMultiplier: { 3: 1, 4: 3 },
  comboWindowMs: 2500,
  comboMultipliers: [1, 1.2, 1.5, 2],
  frenzyThreshold: 6,
  frenzyMultiplier: 2,
  frenzyAdjacency: 8,
  minValidMoves: 1,
  minInitialMoves: 3,
  maxShuffleAttempts: 20,
  maxBoardGenerationAttempts: 1000,
  mode: 'time',
  durationMs: 120_000,
  timeBonusMs: { chain4: 2000, frenzy: 3000 },
  pauseClockDuringResolution: true,
  maxMoves: 30,
};

export type ConfigOverrides = Partial<GameConfig>;

export function makeConfig(overrides: ConfigOverrides = {}, base: GameConfig = DEFAULT_CONFIG): GameConfig {
  return { ...base, ...overrides };
}
