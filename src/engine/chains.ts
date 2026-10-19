// Chain validation and enumeration (REGLES.md v0.2 §2, §7).
import { areNeighbours, cols, inBounds, neighbourPositions, rows, samePos } from './board';
import type { Board, GameConfig, Pos } from './types';

export type ChainCheck =
  | { readonly valid: true; /** Prey first, predator last. */ readonly ascending: readonly Pos[] }
  | { readonly valid: false; readonly reason: ChainError };

export type ChainError = 'length' | 'bounds' | 'empty' | 'repeat' | 'notAdjacent' | 'tiers';

export function checkChain(board: Board, path: readonly Pos[], config: GameConfig): ChainCheck {
  if (!config.chainLengths.includes(path.length)) return { valid: false, reason: 'length' };
  if (path.some((p) => !inBounds(board, p))) return { valid: false, reason: 'bounds' };
  if (path.some((p) => !board[p.row][p.col])) return { valid: false, reason: 'empty' };
  if (path.some((p, i) => path.findIndex((q) => samePos(p, q)) !== i)) return { valid: false, reason: 'repeat' };
  for (let i = 1; i < path.length; i++) {
    if (!areNeighbours(path[i - 1], path[i], config.adjacency)) return { valid: false, reason: 'notAdjacent' };
  }
  const tiers = path.map((p) => board[p.row][p.col]!.tier);
  const steps = tiers.slice(1).map((t, i) => t - tiers[i]);
  if (steps.every((s) => s === 1)) return { valid: true, ascending: path };
  if (config.allowDescendingTrace && steps.every((s) => s === -1)) return { valid: true, ascending: [...path].reverse() };
  return { valid: false, reason: 'tiers' };
}

export function isValidChain(board: Board, path: readonly Pos[], config: GameConfig): boolean {
  return checkChain(board, path, config).valid;
}

/**
 * Every possible chain, once per set of cells (a chain and its reverse count as one), in ascending
 * order. Tiers in a chain are all different, so a set of cells has exactly one ascending path.
 */
export function legalChains(board: Board, config: GameConfig): Pos[][] {
  const maxLength = Math.max(...config.chainLengths);
  const result: Pos[][] = [];
  const extend = (path: Pos[]) => {
    if (config.chainLengths.includes(path.length)) result.push(path);
    if (path.length >= maxLength) return;
    const last = path[path.length - 1];
    const tier = board[last.row][last.col]!.tier;
    for (const n of neighbourPositions(board, last, config.adjacency)) {
      if (board[n.row][n.col]?.tier === tier + 1) extend([...path, n]);
    }
  };
  for (let r = 0; r < rows(board); r++) {
    for (let c = 0; c < cols(board); c++) if (board[r][c]) extend([{ row: r, col: c }]);
  }
  return result;
}

export function countChains(board: Board, config: GameConfig): number {
  return legalChains(board, config).length;
}
