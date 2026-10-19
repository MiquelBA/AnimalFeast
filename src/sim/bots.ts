// Bots for the simulator. Each picks one of the legal chains for the current state.
import { nextInt } from '../engine/rng';
import { previewMove } from '../engine/game';
import { checkChain } from '../engine/chains';
import { chainPoints, energyFromPrey, goldenMultiplier } from '../engine/score';
import type { GameState, Pos } from '../engine/types';

export type BotName = 'random' | 'greedy' | 'greedy+frenzy';

export const BOT_NAMES: readonly BotName[] = ['random', 'greedy', 'greedy+frenzy'];

export interface BotContext {
  rng: number;
}

/** Heuristic value of one point of shark energy for greedy+frenzy (tunable from the CLI). */
export interface BotOptions {
  readonly energyWeight: number;
}

export const DEFAULT_BOT_OPTIONS: BotOptions = { energyWeight: 1 };

/** Immediate points of a chain. Only chains that can trigger a frenzy need a full preview. */
function evaluate(state: GameState, path: readonly Pos[]): { points: number; energyGained: number; tier: number } {
  const { config, board } = state;
  const check = checkChain(board, path, config);
  if (!check.valid) throw new Error('Bots only evaluate legal chains');
  const top = check.ascending[check.ascending.length - 1];
  const predator = board[top.row][top.col]!;
  const prey = check.ascending.slice(0, -1).map((p, i) => ({ animal: board[p.row][p.col]!, tier: check.tiers[i] }));
  const maxTier = config.tiers.length;
  const leaves = config.maxTierLeaves && predator.tier === maxTier;
  const energyGained = leaves ? 0 : prey.reduce((e, p) => e + energyFromPrey(p.animal, config, p.tier), 0);
  const mayFrenzy = (leaves && config.fullChainFrenzy && path.length === maxTier) || (!leaves && predator.energy + energyGained >= config.frenzyThreshold);
  if (mayFrenzy) {
    const p = previewMove(state, { path, atMs: state.lastMoveAtMs ?? 0 });
    return { points: p.points, energyGained: p.energyGained, tier: predator.tier };
  }
  const multipliers = {
    length: config.lengthMultiplier[path.length] ?? 1,
    combo: 1,
    golden: goldenMultiplier([...prey.map((p) => p.animal), predator], config),
  };
  return { points: chainPoints(prey, multipliers, config), energyGained, tier: predator.tier };
}

function argmaxRandomTie(values: readonly number[], ctx: BotContext): number {
  const best = Math.max(...values);
  const ties = values.flatMap((v, i) => (v === best ? [i] : []));
  let i: number;
  [i, ctx.rng] = nextInt(ctx.rng, ties.length);
  return ties[i];
}

export function chooseChain(bot: BotName, state: GameState, chains: readonly Pos[][], ctx: BotContext, options: BotOptions = DEFAULT_BOT_OPTIONS): number {
  if (bot === 'random') {
    let i: number;
    [i, ctx.rng] = nextInt(ctx.rng, chains.length);
    return i;
  }
  const evals = chains.map((c) => evaluate(state, c));
  if (bot === 'greedy') return argmaxRandomTie(evals.map((e) => e.points), ctx);
  // greedy+frenzy: also values energy a shark stores towards its next frenzy. A frenzy is worth
  // roughly half the neighbours (lower tiers) × their frenzy value; spread over the threshold.
  const { config } = state;
  const frenzyEstimate = 4 * ((config.tiers[0].basePoints + config.tiers[1].basePoints) / 2) * config.frenzyMultiplier;
  const perEnergy = (options.energyWeight * frenzyEstimate) / config.frenzyThreshold;
  return argmaxRandomTie(evals.map((e) => e.points + e.energyGained * perEnergy), ctx);
}
