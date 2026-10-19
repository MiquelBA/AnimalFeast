// Points and energy (REGLES.md v0.5 §3–4, §6, §9).
import type { Animal, GameConfig, Tier } from './types';

/** Points for one prey before multipliers; `tier` is the tier it plays (a wildcard's is the one it fills). */
export function preyValue(prey: Animal, config: GameConfig, tier: Tier = prey.tier): number {
  return config.tiers[tier - 1].basePoints + prey.energy * config.pointsPerPreyEnergy;
}

export function energyFromPrey(prey: Animal, config: GameConfig, tier: Tier = prey.tier): number {
  return config.tiers[tier - 1].energyValue + Math.floor(prey.energy * config.inheritRatio);
}

/** goldenMultiplier for each golden animal in the chain (prey or predator); they stack. */
export function goldenMultiplier(animals: readonly Animal[], config: GameConfig): number {
  return config.goldenMultiplier ** animals.filter((a) => a.golden).length;
}

/** Points of a chain: prey values (at the tiers they play) × length × combo × golden multipliers. */
export function chainPoints(
  prey: readonly { readonly animal: Animal; readonly tier: Tier }[],
  multipliers: { readonly length: number; readonly combo: number; readonly golden: number },
  config: GameConfig,
): number {
  const sum = prey.reduce((s, p) => s + preyValue(p.animal, config, p.tier), 0);
  return Math.round(sum * multipliers.length * multipliers.combo * multipliers.golden);
}

export function frenzyPoints(prey: Animal, config: GameConfig): number {
  return Math.round(preyValue(prey, config) * config.frenzyMultiplier);
}

/** Multiplier for the n-th consecutive fast move (n ≥ 1). */
export function comboMultiplier(count: number, config: GameConfig): number {
  const m = config.comboMultipliers;
  return m[Math.min(count, m.length) - 1];
}

/** Smallest energy a predator of this tier can gain in one chain (0 if it never ends a chain or can't keep energy). */
export function minEnergyGain(tier: number, config: GameConfig): number {
  const shortest = Math.min(...config.chainLengths);
  if (tier < shortest || (config.maxTierLeaves && tier === config.tiers.length)) return 0;
  let gain = 0;
  for (let t = tier - shortest + 1; t < tier; t++) gain += config.tiers[t - 1].energyValue;
  return gain;
}

/** True when the next chain this animal finishes will certainly trigger its frenzy (visual hint). */
export function isNearFrenzy(animal: Animal, config: GameConfig): boolean {
  const gain = minEnergyGain(animal.tier, config);
  return gain > 0 && animal.energy < config.frenzyThreshold && animal.energy + gain >= config.frenzyThreshold;
}
