// Chain validation and enumeration (REGLES.md v0.5 §2, §7, §9).
// A wildcard (octopus) takes whatever tier the chain needs at its place, but never the predator's.
import { areNeighbours, cols, inBounds, neighbourPositions, rows, samePos } from './board';
import type { Animal, Board, GameConfig, Pos, Tier } from './types';

export type ChainCheck =
  | {
      readonly valid: true;
      /** Prey first, predator last. */
      readonly ascending: readonly Pos[];
      /** Tier each cell of `ascending` plays (wildcards included). */
      readonly tiers: readonly Tier[];
    }
  | { readonly valid: false; readonly reason: ChainError };

export type ChainError = 'length' | 'bounds' | 'empty' | 'repeat' | 'notAdjacent' | 'tiers';

/**
 * Tiers the animals play when read as consecutive tiers going `dir` (+1 up, −1 down), or null.
 * Wildcards fill in; at least one real animal anchors the sequence.
 */
function fitTiers(animals: readonly Animal[], dir: 1 | -1, maxTier: number): Tier[] | null {
  const anchor = animals.findIndex((a) => !a.wild);
  if (anchor < 0) return null;
  const start = animals[anchor].tier - dir * anchor;
  const tiers = animals.map((_, i) => start + dir * i);
  if (tiers.some((t) => t < 1 || t > maxTier)) return null;
  return animals.every((a, i) => a.wild || a.tier === tiers[i]) ? tiers : null;
}

export function checkChain(board: Board, path: readonly Pos[], config: GameConfig): ChainCheck {
  if (!config.chainLengths.includes(path.length)) return { valid: false, reason: 'length' };
  if (path.some((p) => !inBounds(board, p))) return { valid: false, reason: 'bounds' };
  if (path.some((p) => !board[p.row][p.col])) return { valid: false, reason: 'empty' };
  if (path.some((p, i) => path.findIndex((q) => samePos(p, q)) !== i)) return { valid: false, reason: 'repeat' };
  for (let i = 1; i < path.length; i++) {
    if (!areNeighbours(path[i - 1], path[i], config.adjacency)) return { valid: false, reason: 'notAdjacent' };
  }
  const animals = path.map((p) => board[p.row][p.col]!);
  const maxTier = config.tiers.length;
  const up = fitTiers(animals, 1, maxTier);
  if (up && !animals[animals.length - 1].wild) return { valid: true, ascending: path, tiers: up };
  const down = config.allowDescendingTrace ? fitTiers(animals, -1, maxTier) : null;
  if (down && !animals[0].wild) return { valid: true, ascending: [...path].reverse(), tiers: [...down].reverse() };
  return { valid: false, reason: 'tiers' };
}

export function isValidChain(board: Board, path: readonly Pos[], config: GameConfig): boolean {
  return checkChain(board, path, config).valid;
}

/**
 * Every possible chain, once per set of cells (a chain and its reverse count as one), in ascending
 * order. Without wildcards a set of cells has exactly one ascending path; with them, the first found is kept.
 */
export function legalChains(board: Board, config: GameConfig): Pos[][] {
  const maxLength = Math.max(...config.chainLengths);
  const maxTier = config.tiers.length;
  const result: Pos[][] = [];
  const seen = new Set<string>();
  const extend = (path: Pos[], tier: Tier) => {
    const last = path[path.length - 1];
    if (config.chainLengths.includes(path.length) && !board[last.row][last.col]!.wild) {
      const key = path.map((p) => p.row * 1000 + p.col).sort((a, b) => a - b).join(',');
      if (!seen.has(key)) { seen.add(key); result.push(path); }
    }
    if (path.length >= maxLength || tier >= maxTier) return;
    for (const n of neighbourPositions(board, last, config.adjacency)) {
      const a = board[n.row][n.col];
      if (!a || path.some((p) => samePos(p, n))) continue;
      if (a.wild || a.tier === tier + 1) extend([...path, n], tier + 1);
    }
  };
  for (let r = 0; r < rows(board); r++) {
    for (let c = 0; c < cols(board); c++) {
      const a = board[r][c];
      if (!a) continue;
      if (!a.wild) extend([{ row: r, col: c }], a.tier);
      else for (let t = 1; t < maxTier; t++) extend([{ row: r, col: c }], t);
    }
  }
  return result;
}

export function countChains(board: Board, config: GameConfig): number {
  return legalChains(board, config).length;
}

export type TraceStatus = 'empty' | 'partial' | 'valid' | 'invalid';

/**
 * Status of a chain being traced, for live feedback: 'valid' when it can be played as is,
 * 'partial' when it could still become valid by adding cells, 'invalid' otherwise.
 */
export function traceStatus(board: Board, path: readonly Pos[], config: GameConfig): TraceStatus {
  if (path.length === 0) return 'empty';
  if (checkChain(board, path, config).valid) return 'valid';
  const maxLength = Math.max(...config.chainLengths);
  if (path.length >= maxLength) return 'invalid';
  if (path.some((p) => !inBounds(board, p) || !board[p.row][p.col])) return 'invalid';
  if (path.some((p, i) => path.findIndex((q) => samePos(p, q)) !== i)) return 'invalid';
  for (let i = 1; i < path.length; i++) if (!areNeighbours(path[i - 1], path[i], config.adjacency)) return 'invalid';
  const needed = Math.min(...config.chainLengths.filter((l) => l > path.length)) - path.length;
  if (!Number.isFinite(needed)) return 'invalid';
  const animals = path.map((p) => board[p.row][p.col]!);
  const maxTier = config.tiers.length;
  // Only wildcards so far: anything is still possible.
  if (animals.every((a) => a.wild)) return path.length + needed <= maxTier ? 'partial' : 'invalid';
  // Going up, the chain grows past its last cell; going down, the predator must already be first and real.
  const up = fitTiers(animals, 1, maxTier);
  if (up && maxTier - up[up.length - 1] >= needed) return 'partial';
  const down = config.allowDescendingTrace && !animals[0].wild ? fitTiers(animals, -1, maxTier) : null;
  if (down && down[down.length - 1] - 1 >= needed) return 'partial';
  return 'invalid';
}
