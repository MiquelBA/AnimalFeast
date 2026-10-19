// All gameplay values live here (see REGLES.md). No magic numbers elsewhere.
import type { GameConfig, Species, SpeciesDef } from './types';

/** Species ordered by level; also the canonical order for weights and stats. */
export const SPECIES_ORDER: readonly Species[] = ['SARDINE', 'TUNA', 'SHARK', 'ORCA'];

export const DEFAULT_CONFIG: GameConfig = {
  boardSize: 6,
  handSize: 3,
  species: {
    SARDINE: { level: 1, energyValue: 1, basePoints: 10, spawnWeight: 45 },
    TUNA: { level: 2, energyValue: 2, basePoints: 30, spawnWeight: 30 },
    SHARK: { level: 3, energyValue: 3, basePoints: 100, spawnWeight: 20 },
    ORCA: { level: 4, energyValue: 4, basePoints: 300, spawnWeight: 5 },
  },
  eatRule: 'oneLevelBelow',
  sameSpeciesCaptures: true,
  predatorMovesIntoPrey: true,
  placedEnergy: 0,
  inheritRatio: 0.5,
  pointsPerPreyEnergy: 10,
  sameSpeciesMultiplier: 2,
  chainMultipliers: [1, 1.5, 2, 3],
  spawnSchedule: null,
  energyTiers: [0, 1, 3, 6],
};

export type ConfigOverrides = Partial<Omit<GameConfig, 'species'>> & {
  species?: Partial<Record<Species, Partial<SpeciesDef>>>;
};

/** Builds a config from DEFAULT_CONFIG (or `base`) plus overrides; species are merged per field. */
export function makeConfig(overrides: ConfigOverrides = {}, base: GameConfig = DEFAULT_CONFIG): GameConfig {
  const { species: speciesOverrides, ...rest } = overrides;
  const species = { ...base.species };
  for (const s of SPECIES_ORDER) {
    const o = speciesOverrides?.[s];
    if (o) species[s] = { ...species[s], ...o };
  }
  return { ...base, ...rest, species };
}
