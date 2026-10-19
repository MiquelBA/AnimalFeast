// Points and energy (REGLES.md v0.2 §3–4, §6).
import type { Animal, GameConfig } from './types';

/** Points for one prey before multipliers. */
export function preyValue(prey: Animal, config: GameConfig): number {
  return config.tiers[prey.tier - 1].basePoints + prey.energy * config.pointsPerPreyEnergy;
}

export function energyFromPrey(prey: Animal, config: GameConfig): number {
  return config.tiers[prey.tier - 1].energyValue + Math.floor(prey.energy * config.inheritRatio);
}

export function chainPoints(prey: readonly Animal[], lengthMultiplier: number, comboMultiplier: number, config: GameConfig): number {
  const sum = prey.reduce((s, a) => s + preyValue(a, config), 0);
  return Math.round(sum * lengthMultiplier * comboMultiplier);
}

export function frenzyPoints(prey: Animal, config: GameConfig): number {
  return Math.round(preyValue(prey, config) * config.frenzyMultiplier);
}

/** Multiplier for the n-th consecutive fast move (n ≥ 1). */
export function comboMultiplier(count: number, config: GameConfig): number {
  const m = config.comboMultipliers;
  return m[Math.min(count, m.length) - 1];
}
