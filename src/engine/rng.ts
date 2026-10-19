// Seeded RNG (mulberry32). Pure: the state is a uint32 carried in GameState.
import type { GameConfig, Tier } from './types';

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

/** Integer in [0, n). */
export function nextInt(state: number, n: number): [value: number, next: number] {
  const [r, next] = nextRandom(state);
  return [Math.floor(r * n), next];
}

export function pickTier(config: GameConfig, r: number): Tier {
  const weights = config.tiers.map((t) => t.spawnWeight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) throw new Error('Spawn weights must add up to a positive number');
  let target = r * total;
  for (let i = 0; i < weights.length; i++) {
    target -= weights[i];
    if (target < 0) return i + 1;
  }
  // Floating-point edge: last tier with weight.
  return weights.findLastIndex((w) => w > 0) + 1;
}
