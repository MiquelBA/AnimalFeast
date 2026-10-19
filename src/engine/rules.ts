// Board geometry and who-eats-whom (REGLES.md §1–2).
import type { Animal, Board, Cell, Direction, GameConfig, Pos } from './types';

/** Fixed direction order, also used to break ties: N, E, S, W. */
export const DIRECTIONS: readonly { readonly dir: Direction; readonly dr: number; readonly dc: number }[] = [
  { dir: 'N', dr: -1, dc: 0 },
  { dir: 'E', dr: 0, dc: 1 },
  { dir: 'S', dr: 1, dc: 0 },
  { dir: 'W', dr: 0, dc: -1 },
];

export interface Neighbour {
  readonly dir: Direction;
  readonly pos: Pos;
  readonly animal: Animal;
}

export function inBounds(pos: Pos, size: number): boolean {
  return pos.row >= 0 && pos.row < size && pos.col >= 0 && pos.col < size;
}

export function cellAt(board: Board, pos: Pos): Cell {
  return board[pos.row]?.[pos.col] ?? null;
}

/** Occupied orthogonal neighbours, in N, E, S, W order. */
export function occupiedNeighbours(board: Board, pos: Pos): Neighbour[] {
  const result: Neighbour[] = [];
  for (const { dir, dr, dc } of DIRECTIONS) {
    const p = { row: pos.row + dr, col: pos.col + dc };
    if (!inBounds(p, board.length)) continue;
    const animal = cellAt(board, p);
    if (animal) result.push({ dir, pos: p, animal });
  }
  return result;
}

export function levelOf(animal: Animal, config: GameConfig): number {
  return config.species[animal.species].level;
}

/** Whether `predator` can eat `prey`, assuming they are orthogonal neighbours. */
export function canEat(predator: Animal, prey: Animal, config: GameConfig): boolean {
  if (predator.species === prey.species) {
    return config.sameSpeciesCaptures && predator.energy > prey.energy;
  }
  const lp = levelOf(predator, config);
  const lq = levelOf(prey, config);
  return config.eatRule === 'oneLevelBelow' ? lp === lq + 1 : lp > lq;
}

export function emptyCells(board: Board): Pos[] {
  const cells: Pos[] = [];
  board.forEach((row, r) => row.forEach((cell, c) => { if (!cell) cells.push({ row: r, col: c }); }));
  return cells;
}

export function countAnimals(board: Board): number {
  return board.reduce((n, row) => n + row.filter(Boolean).length, 0);
}

/** True if no pair of neighbours can eat each other (the end-of-turn stability invariant). */
export function isStable(board: Board, config: GameConfig): boolean {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) {
      const a = board[r][c];
      if (!a) continue;
      for (const n of occupiedNeighbours(board, { row: r, col: c })) {
        if (canEat(a, n.animal, config)) return false;
      }
    }
  }
  return true;
}
