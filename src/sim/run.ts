// Plays one simulated game and records per-move data; metrics are derived from these traces.
import { legalChains } from '../engine/chains';
import { applyMove, createGame } from '../engine/game';
import type { GameConfig } from '../engine/types';
import { chooseChain, type BotName, type BotOptions } from './bots';

export interface MoveTrace {
  readonly points: number;
  readonly frenzies: number;
  readonly chainLength: number;
  readonly shuffled: boolean;
  readonly regenerated: boolean;
}

export interface GameTrace {
  readonly moves: MoveTrace[];
  /** Possible chains on the board before each move. */
  readonly chainsAvailable: number[];
  readonly chain4Available: boolean[];
  /** Fraction of top-tier animals on the board before move i (index = move number). */
  readonly topTierShare: number[];
}

/** Plays `moves` moves in moves mode (time mode is derived later from the trace). */
export function playGame(config: GameConfig, bot: BotName, seed: number, moves: number, options: BotOptions): GameTrace {
  const cfg: GameConfig = { ...config, mode: 'moves', maxMoves: moves };
  let state = createGame({ seed, config: cfg });
  const ctx = { rng: (seed * 2654435761) >>> 0 };
  const maxTier = cfg.tiers.length;
  const trace: GameTrace = { moves: [], chainsAvailable: [], chain4Available: [], topTierShare: [] };
  while (!state.gameOver) {
    const cells = state.board.flat();
    trace.topTierShare.push(cells.filter((a) => a!.tier === maxTier).length / cells.length);
    const chains = legalChains(state.board, cfg);
    trace.chainsAvailable.push(chains.length);
    trace.chain4Available.push(chains.some((c) => c.length === 4));
    const path = chains[chooseChain(bot, state, chains, ctx, options)];
    const { state: next, events } = applyMove(state, { path });
    trace.moves.push({
      points: next.score - state.score,
      frenzies: next.frenzies - state.frenzies,
      chainLength: path.length,
      shuffled: events.some((e) => e.type === 'shuffle'),
      regenerated: events.some((e) => e.type === 'regenerate'),
    });
    state = next;
  }
  return trace;
}
