// Spontaneous chains (config.spontaneousLines): straight rows or columns in food-chain order.
import { cols, rows } from './board';
import type { Board, GameConfig, Pos } from './types';

/** A wildcard never forms part of a spontaneous chain. */
function tierAt(board: Board, pos: Pos): number {
  const a = board[pos.row][pos.col];
  return a && !a.wild ? a.tier : 0;
}

/** Maximal runs along one line where each next animal is exactly one tier above, in ascending order. */
function ascendingRuns(board: Board, line: readonly Pos[], config: GameConfig): Pos[][] {
  const shortest = Math.max(config.minLineLength, Math.min(...config.chainLengths));
  const longest = Math.max(...config.chainLengths);
  const runs: Pos[][] = [];
  for (const cells of [line, [...line].reverse()]) {
    let i = 0;
    while (i < cells.length) {
      let j = i;
      while (j + 1 < cells.length && tierAt(board, cells[i]) > 0 && tierAt(board, cells[j + 1]) === tierAt(board, cells[j]) + 1) j++;
      const length = j - i + 1;
      // A run longer than the longest chain keeps its top part: the predator end.
      if (length >= shortest) runs.push(cells.slice(Math.max(i, j + 1 - longest), j + 1));
      i = j + 1;
    }
  }
  return runs;
}

/**
 * Spontaneous chains on the board, prey first and predator last, none sharing a cell. Longer ones
 * win; ties go to rows (top first) before columns (left first).
 */
export function findLines(board: Board, config: GameConfig): Pos[][] {
  const lines: Pos[][] = [];
  for (let r = 0; r < rows(board); r++) lines.push(Array.from({ length: cols(board) }, (_, c) => ({ row: r, col: c })));
  for (let c = 0; c < cols(board); c++) lines.push(Array.from({ length: rows(board) }, (_, r) => ({ row: r, col: c })));
  const runs = lines.flatMap((line) => ascendingRuns(board, line, config));
  runs.sort((a, b) => b.length - a.length);
  const used = new Set<string>();
  const chosen: Pos[][] = [];
  for (const run of runs) {
    if (run.some((p) => used.has(`${p.row},${p.col}`))) continue;
    run.forEach((p) => used.add(`${p.row},${p.col}`));
    chosen.push(run);
  }
  return chosen;
}

export function hasLines(board: Board, config: GameConfig): boolean {
  return config.spontaneousLines && findLines(board, config).length > 0;
}
