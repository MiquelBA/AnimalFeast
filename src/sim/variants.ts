// Rule variants compared by the simulator (one change at a time from the defaults, plus older rule sets).
import { DEFAULT_CONFIG, makeConfig, type ConfigOverrides } from '../engine/config';
import type { GameConfig } from '../engine/types';

export function withSpawnWeights(weights: readonly number[], base: GameConfig = DEFAULT_CONFIG): ConfigOverrides {
  if (weights.length !== base.tiers.length) throw new Error(`Expected ${base.tiers.length} spawn weights`);
  return { tiers: base.tiers.map((t, i) => ({ ...t, spawnWeight: weights[i] })) };
}

export const VARIANTS: Readonly<Record<string, { label: string; overrides: ConfigOverrides }>> = {
  'v0.2': {
    label: 'v0.2 (orca es queda, +3 s per frenesí sense límit)',
    overrides: {
      ...withSpawnWeights([30, 28, 24, 18]), frenzyThreshold: 6, minValidMoves: 1, fullChainFrenzy: true,
      maxTierLeaves: false, timeBonusMs: { frenzy: 3000 }, maxTimeBonusMs: Number.MAX_SAFE_INTEGER,
    },
  },
  base: { label: 'v0.4 per defecte (= candidata B)', overrides: {} },
  'v0.3': {
    label: 'v0.3 (c4 fa frenesí, pesos 30/28/24/18, frenesí 6, mín. 1 cadena)',
    overrides: { ...withSpawnWeights([30, 28, 24, 18]), frenzyThreshold: 6, minValidMoves: 1, fullChainFrenzy: true },
  },
  thr6: { label: 'frenzyThreshold 6', overrides: { frenzyThreshold: 6 } },
  thr12: { label: 'frenzyThreshold 12', overrides: { frenzyThreshold: 12 } },
  size7: { label: 'boardSize 7', overrides: { boardSize: 7 } },
  adj4: { label: 'adjacency 4', overrides: { adjacency: 4 } },
  noDesc: { label: 'sense traçat descendent', overrides: { allowDescendingTrace: false } },
  wA: { label: 'pesos 35/30/25/10', overrides: withSpawnWeights([35, 30, 25, 10]) },
  wB: { label: 'pesos 30/28/24/18', overrides: withSpawnWeights([30, 28, 24, 18]) },
  minMoves1: { label: 'minValidMoves 1', overrides: { minValidMoves: 1 } },
  // Candidates from the exploration (see FITA2.md).
  candA: {
    label: 'A: v0.3 + pesos 38/30/24/8, frenesí 12, mín. 3 cadenes',
    overrides: { ...withSpawnWeights([38, 30, 24, 8]), frenzyThreshold: 12, fullChainFrenzy: true },
  },
};

export function variantConfig(name: string, extra: ConfigOverrides = {}): GameConfig {
  const v = VARIANTS[name];
  if (!v) throw new Error(`Unknown variant "${name}". Known: ${Object.keys(VARIANTS).join(', ')}`);
  return makeConfig({ ...v.overrides, ...extra });
}
