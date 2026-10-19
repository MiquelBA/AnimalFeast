// Scoring and energy (REGLES.md §4–5, §8).
import type { Animal, GameConfig } from './types';

/** Points for a capture before the chain multiplier. */
export function captureValue(predator: Animal, prey: Animal, config: GameConfig): number {
  const base = config.species[prey.species].basePoints + prey.energy * config.pointsPerPreyEnergy;
  return base * (predator.species === prey.species ? config.sameSpeciesMultiplier : 1);
}

/** Multiplier for the i-th capture of a turn (1-based). */
export function chainMultiplier(chain: number, config: GameConfig): number {
  const m = config.chainMultipliers;
  return m[Math.min(chain, m.length) - 1];
}

export function capturePoints(value: number, chain: number, config: GameConfig): number {
  return Math.round(value * chainMultiplier(chain, config));
}

export function energyGained(prey: Animal, config: GameConfig): number {
  return config.species[prey.species].energyValue + Math.floor(prey.energy * config.inheritRatio);
}

/** Visual tier: index of the highest threshold in energyTiers reached by `energy`. */
export function energyTier(energy: number, config: GameConfig): number {
  let tier = 0;
  config.energyTiers.forEach((threshold, i) => { if (energy >= threshold) tier = i; });
  return tier;
}
