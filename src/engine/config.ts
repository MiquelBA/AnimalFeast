// All gameplay values live here (see REGLES.md v0.2). No magic numbers elsewhere.
import type { GameConfig } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  boardSize: 7,
  tiers: [
    { energyValue: 1, basePoints: 10, spawnWeight: 33 },
    { energyValue: 2, basePoints: 30, spawnWeight: 30 },
    { energyValue: 3, basePoints: 100, spawnWeight: 23 },
    { energyValue: 4, basePoints: 300, spawnWeight: 14 },
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
  frenzyThreshold: 9,
  frenzyMultiplier: 2,
  frenzyAdjacency: 8,
  minValidMoves: 3,
  minInitialMoves: 3,
  maxShuffleAttempts: 20,
  maxBoardGenerationAttempts: 1000,
  mode: 'time',
  durationMs: 120_000,
  timeBonusMs: { frenzy: 2000 },
  maxTimeBonusMs: 20_000,
  maxTierLeaves: true,
  fullChainFrenzy: false,
  pauseClockDuringResolution: true,
  maxMoves: 30,
};

export type ConfigOverrides = Partial<GameConfig>;

export function makeConfig(overrides: ConfigOverrides = {}, base: GameConfig = DEFAULT_CONFIG): GameConfig {
  return { ...base, ...overrides };
}
