// Turns game traces into the report metrics.
import type { GameConfig } from '../engine/types';
import type { GameTrace } from './run';

export interface Dist {
  readonly mean: number;
  readonly median: number;
  readonly p10: number;
  readonly p90: number;
  readonly min: number;
  readonly max: number;
}

export function dist(values: readonly number[]): Dist {
  const v = [...values].sort((a, b) => a - b);
  const at = (q: number) => v[Math.min(v.length - 1, Math.floor(q * v.length))];
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return { mean, median: at(0.5), p10: at(0.1), p90: at(0.9), min: v[0], max: v[v.length - 1] };
}

export interface MovesModeMetrics {
  readonly score: Dist;
  readonly pointsPerMove: number;
  readonly chain4PerGame: number;
  readonly frenziesPerGame: Dist;
}

export interface TimeModeMetrics {
  readonly secondsPerMove: number;
  readonly moves: Dist;
  readonly score: Dist;
  /** Game clock length in seconds (2 min + bonuses). */
  readonly clockSeconds: Dist;
  /** Clock + animation pauses (animMs per move). */
  readonly realSeconds: Dist;
  readonly frenziesPerGame: Dist;
  readonly chain4PerGame: number;
}

export interface BotMetrics {
  readonly games: number;
  readonly chainsAvailable: Dist;
  readonly chain4AvailablePct: number;
  readonly shufflePct: number;
  readonly regenerationsPerGame: number;
  /** Top-tier share of the board (%), sampled every 10 moves. */
  readonly topTierPctByMove: Record<number, number>;
  readonly movesMode: Record<number, MovesModeMetrics>;
  readonly timeMode: TimeModeMetrics[];
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

/** Time mode from a moves-mode trace: move k happens at k × spm if that is before the time limit. */
function timeGame(trace: GameTrace, config: GameConfig, spmMs: number) {
  let limit = config.durationMs;
  let bonus = 0;
  let k = 0;
  let score = 0;
  let frenzies = 0;
  let chain4 = 0;
  while (k < trace.moves.length && (k + 1) * spmMs < limit) {
    const m = trace.moves[k];
    score += m.points;
    frenzies += m.frenzies;
    chain4 += m.chainLength === 4 ? 1 : 0;
    for (let f = 0; f < m.frenzies; f++) {
      const add = Math.min(config.timeBonusMs.frenzy, config.maxTimeBonusMs - bonus);
      bonus += add;
      limit += add;
    }
    k++;
  }
  const truncated = k === trace.moves.length && (k + 1) * spmMs < limit;
  return { moves: k, score, frenzies, chain4, clockMs: limit, truncated };
}

export function botMetrics(traces: readonly GameTrace[], config: GameConfig, opts: { movesModes: number[]; spm: number[]; animMs: number }): BotMetrics & { truncatedTimeGames: number } {
  const boards = traces.flatMap((t) => t.chainsAvailable);
  const chain4Avail = traces.flatMap((t) => t.chain4Available);
  const allMoves = traces.flatMap((t) => t.moves);
  const topTierPctByMove: Record<number, number> = {};
  const longest = Math.max(...traces.map((t) => t.topTierShare.length));
  for (let m = 0; m < longest; m += 10) {
    const xs = traces.filter((t) => t.topTierShare.length > m).map((t) => t.topTierShare[m]);
    topTierPctByMove[m] = (100 * sum(xs)) / xs.length;
  }
  const movesMode: Record<number, MovesModeMetrics> = {};
  for (const n of opts.movesModes) {
    const games = traces.map((t) => t.moves.slice(0, n));
    const scores = games.map((g) => sum(g.map((m) => m.points)));
    movesMode[n] = {
      score: dist(scores),
      pointsPerMove: sum(scores) / (games.length * n),
      chain4PerGame: sum(games.map((g) => g.filter((m) => m.chainLength === 4).length)) / games.length,
      frenziesPerGame: dist(games.map((g) => sum(g.map((m) => m.frenzies)))),
    };
  }
  let truncatedTimeGames = 0;
  const timeMode = opts.spm.map((s) => {
    const games = traces.map((t) => timeGame(t, config, s * 1000));
    truncatedTimeGames += games.filter((g) => g.truncated).length;
    return {
      secondsPerMove: s,
      moves: dist(games.map((g) => g.moves)),
      score: dist(games.map((g) => g.score)),
      clockSeconds: dist(games.map((g) => g.clockMs / 1000)),
      realSeconds: dist(games.map((g) => (g.clockMs + g.moves * opts.animMs) / 1000)),
      frenziesPerGame: dist(games.map((g) => g.frenzies)),
      chain4PerGame: sum(games.map((g) => g.chain4)) / games.length,
    };
  });
  return {
    games: traces.length,
    chainsAvailable: dist(boards),
    chain4AvailablePct: (100 * chain4Avail.filter(Boolean).length) / chain4Avail.length,
    shufflePct: (100 * allMoves.filter((m) => m.shuffled || m.regenerated).length) / allMoves.length,
    regenerationsPerGame: allMoves.filter((m) => m.regenerated).length / traces.length,
    topTierPctByMove,
    movesMode,
    timeMode,
    truncatedTimeGames,
  };
}
