// Rule variants (simulator and debug panel) (one change at a time from the defaults, plus older rule sets).
import { DEFAULT_CONFIG, FEAST, FIVE_TIERS, makeConfig, type ConfigOverrides } from './config';
import type { GameConfig } from './types';

export function withSpawnWeights(
  weights: readonly number[],
  base: GameConfig = weights.length === FIVE_TIERS.tiers!.length ? makeConfig(FIVE_TIERS) : DEFAULT_CONFIG,
): ConfigOverrides {
  if (weights.length !== base.tiers.length) throw new Error(`Expected ${base.tiers.length} spawn weights`);
  return { tiers: base.tiers.map((t, i) => ({ ...t, spawnWeight: weights[i] })) };
}

export const VARIANTS: Readonly<Record<string, { label: string; overrides: ConfigOverrides }>> = {
  'v0.2': {
    label: 'v0.2 (orca es queda, +3 s per frenesí sense límit)',
    overrides: {
      boardSize: 6, ...withSpawnWeights([30, 28, 24, 18]), frenzyThreshold: 6, minValidMoves: 1, fullChainFrenzy: true,
      maxTierLeaves: false, timeBonusMs: { frenzy: 3000 }, maxTimeBonusMs: Number.MAX_SAFE_INTEGER, goldenChance: 0, wildChance: 0,
    },
  },
  base: { label: 'v0.6 per defecte (festí: 5 nivells, cadenes espontànies, remolí)', overrides: FEAST },
  'v0.5': { label: 'v0.5 (4 nivells, daurats 3%, pop 5%)', overrides: {} },
  'v0.4': { label: 'v0.4 (sense daurats ni pop)', overrides: { goldenChance: 0, wildChance: 0 } },
  tiers5: { label: '5 nivells (plàncton), pesos 24/24/22/18/12', overrides: FIVE_TIERS },
  tiers5x8: { label: '5 nivells en un tauler 8×8', overrides: { ...FIVE_TIERS, boardSize: 8 } },
  lines: { label: 'cadenes espontànies (traç com ara)', overrides: { spontaneousLines: true, refillRerolls: 10 } },
  linesCross: {
    label: 'cadenes espontànies + traç en creu',
    overrides: { spontaneousLines: true, adjacency: 4, refillRerolls: 100, minValidMoves: 2 },
  },
  feast: { label: 'festí (el mateix que v0.6; enllaç antic)', overrides: FEAST },
  goldOnly: { label: 'només daurats (3%)', overrides: { wildChance: 0 } },
  wildOnly: { label: 'només pop (5%)', overrides: { goldenChance: 0 } },
  wild2: { label: 'pop 2% (abans)', overrides: { wildChance: 0.02 } },
  gold6: { label: 'daurats 6%', overrides: { goldenChance: 0.06 } },
  'v0.3': {
    label: 'v0.3 (c4 fa frenesí, pesos 30/28/24/18, frenesí 6, mín. 1 cadena)',
    overrides: { boardSize: 6, ...withSpawnWeights([30, 28, 24, 18]), frenzyThreshold: 6, minValidMoves: 1, fullChainFrenzy: true, goldenChance: 0, wildChance: 0 },
  },
  thr6: { label: 'frenzyThreshold 6', overrides: { frenzyThreshold: 6 } },
  thr12: { label: 'frenzyThreshold 12', overrides: { frenzyThreshold: 12 } },
  size6: { label: 'boardSize 6', overrides: { boardSize: 6 } },
  adj4: { label: 'adjacency 4', overrides: { adjacency: 4 } },
  noDesc: { label: 'sense traçat descendent', overrides: { allowDescendingTrace: false } },
  wA: { label: 'pesos 35/30/25/10', overrides: withSpawnWeights([35, 30, 25, 10]) },
  wB: { label: 'pesos 30/28/24/18', overrides: withSpawnWeights([30, 28, 24, 18]) },
  minMoves1: { label: 'minValidMoves 1', overrides: { minValidMoves: 1 } },
  // Candidates from the exploration (see FITA2.md).
  candA: {
    label: 'A: v0.3 + pesos 38/30/24/8, frenesí 12, mín. 3 cadenes',
    overrides: { ...withSpawnWeights([38, 30, 24, 8]), frenzyThreshold: 12, fullChainFrenzy: true, boardSize: 6 },
  },
};

export function variantConfig(name: string, extra: ConfigOverrides = {}): GameConfig {
  const v = VARIANTS[name];
  if (!v) throw new Error(`Unknown variant "${name}". Known: ${Object.keys(VARIANTS).join(', ')}`);
  return makeConfig({ ...v.overrides, ...extra });
}
