// Seeded RNG (mulberry32). Pure: the state is a uint32 carried in GameState.
import { SPECIES_ORDER } from './config';
import type { Animal, GameConfig, SpawnWeights, Species } from './types';

const UINT32_RANGE = 4294967296;

export function seedToState(seed: number): number {
  return seed >>> 0;
}

/** Returns a float in [0, 1) and the next RNG state. */
export function nextRandom(state: number): [value: number, next: number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE, next];
}

export function spawnWeightsForTurn(turn: number, config: GameConfig): SpawnWeights {
  let weights: SpawnWeights | null = null;
  for (const entry of config.spawnSchedule ?? []) {
    if (entry.fromTurn <= turn) weights = entry.weights;
  }
  if (weights) return weights;
  const base = {} as Record<Species, number>;
  for (const s of SPECIES_ORDER) base[s] = config.species[s].spawnWeight;
  return base;
}

export function pickWeighted(weights: SpawnWeights, r: number): Species {
  const total = SPECIES_ORDER.reduce((sum, s) => sum + weights[s], 0);
  if (total <= 0) throw new Error('Spawn weights must add up to a positive number');
  let target = r * total;
  for (const s of SPECIES_ORDER) {
    target -= weights[s];
    if (target < 0) return s;
  }
  // Floating-point edge: fall back to the last species with weight.
  return [...SPECIES_ORDER].reverse().find((s) => weights[s] > 0)!;
}

export interface Draw {
  readonly animal: Animal;
  readonly rngState: number;
  readonly nextId: number;
}

export function drawAnimal(rngState: number, nextId: number, turn: number, config: GameConfig): Draw {
  const [r, next] = nextRandom(rngState);
  const species = pickWeighted(spawnWeightsForTurn(turn, config), r);
  return { animal: { id: nextId, species, energy: config.placedEnergy }, rngState: next, nextId: nextId + 1 };
}
