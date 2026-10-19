// Rule variants compared by the simulator (one change at a time from the v0.3 defaults).
import { DEFAULT_CONFIG, makeConfig, type ConfigOverrides } from '../engine/config';
import type { GameConfig } from '../engine/types';

export function withSpawnWeights(weights: readonly number[], base: GameConfig = DEFAULT_CONFIG): ConfigOverrides {
  if (weights.length !== base.tiers.length) throw new Error(`Expected ${base.tiers.length} spawn weights`);
  return { tiers: base.tiers.map((t, i) => ({ ...t, spawnWeight: weights[i] })) };
}

export const VARIANTS: Readonly<Record<string, { label: string; overrides: ConfigOverrides }>> = {
  'v0.2': {
    label: 'v0.2 (orca es queda, +3 s per frenesí sense límit)',
    overrides: { maxTierLeaves: false, timeBonusMs: { frenzy: 3000 }, maxTimeBonusMs: Number.MAX_SAFE_INTEGER },
  },
  base: { label: 'v0.3 per defecte (frenesí 6)', overrides: {} },
  thr9: { label: 'frenzyThreshold 9', overrides: { frenzyThreshold: 9 } },
  thr12: { label: 'frenzyThreshold 12', overrides: { frenzyThreshold: 12 } },
  size7: { label: 'boardSize 7', overrides: { boardSize: 7 } },
  adj4: { label: 'adjacency 4', overrides: { adjacency: 4 } },
  noDesc: { label: 'sense traçat descendent', overrides: { allowDescendingTrace: false } },
  wA: { label: 'pesos 35/30/22/13', overrides: withSpawnWeights([35, 30, 22, 13]) },
  wB: { label: 'pesos 40/30/20/10', overrides: withSpawnWeights([40, 30, 20, 10]) },
  // Candidates from the exploration (see FITA2.md).
  candA: {
    label: 'A: v0.3 + pesos 38/30/24/8, frenesí 12, mín. 3 cadenes',
    overrides: { ...withSpawnWeights([38, 30, 24, 8]), frenzyThreshold: 12, minValidMoves: 3 },
  },
  candB: {
    label: 'B: com A però la cadena de 4 no fa frenesí (pesos 33/30/23/14, frenesí 9)',
    overrides: { ...withSpawnWeights([33, 30, 23, 14]), frenzyThreshold: 9, minValidMoves: 3, fullChainFrenzy: false },
  },
};

export function variantConfig(name: string, extra: ConfigOverrides = {}): GameConfig {
  const v = VARIANTS[name];
  if (!v) throw new Error(`Unknown variant "${name}". Known: ${Object.keys(VARIANTS).join(', ')}`);
  return makeConfig({ ...v.overrides, ...extra });
}
