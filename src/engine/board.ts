// Board geometry, spawning, gravity and refill (REGLES.md v0.2 §1, §5).
import { nextRandom, pickTier } from './rng';
import type { Adjacency, Animal, Board, Cell, Fall, GameConfig, GameEvent, Pos, Tier } from './types';

const ORTHOGONAL: readonly (readonly [number, number])[] = [[-1, 0], [0, 1], [1, 0], [0, -1]];
const DIAGONAL: readonly (readonly [number, number])[] = [[-1, 1], [1, 1], [1, -1], [-1, -1]];

export function offsets(adjacency: Adjacency): readonly (readonly [number, number])[] {
  return adjacency === 8 ? [...ORTHOGONAL, ...DIAGONAL] : ORTHOGONAL;
}

export function rows(board: Board): number {
  return board.length;
}

export function cols(board: Board): number {
  return board[0]?.length ?? 0;
}

export function inBounds(board: Board, pos: Pos): boolean {
  return pos.row >= 0 && pos.row < rows(board) && pos.col >= 0 && pos.col < cols(board);
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col;
}

export function areNeighbours(a: Pos, b: Pos, adjacency: Adjacency): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  if (dr + dc === 0) return false;
  return adjacency === 8 ? dr <= 1 && dc <= 1 : dr + dc === 1;
}

export function neighbourPositions(board: Board, pos: Pos, adjacency: Adjacency): Pos[] {
  return offsets(adjacency)
    .map(([dr, dc]) => ({ row: pos.row + dr, col: pos.col + dc }))
    .filter((p) => inBounds(board, p));
}

export function cloneBoard(board: Board): Cell[][] {
  return board.map((row) => [...row]);
}

export function isFull(board: Board): boolean {
  return board.every((row) => row.every(Boolean));
}

export function countAnimals(board: Board): number {
  return board.reduce((n, row) => n + row.filter(Boolean).length, 0);
}

export function findAnimal(board: Board, id: number): Pos | null {
  for (let r = 0; r < rows(board); r++) {
    for (let c = 0; c < cols(board); c++) if (board[r][c]?.id === id) return { row: r, col: c };
  }
  return null;
}

/** Mutable source of new animals during one engine call: fixed queue first, then the RNG. */
export interface Spawner {
  rngState: number;
  spawnQueue: Tier[];
  nextId: number;
}

export function spawnAnimal(spawner: Spawner, config: GameConfig): Animal {
  let tier = spawner.spawnQueue.shift();
  if (tier === undefined) {
    const [r, next] = nextRandom(spawner.rngState);
    spawner.rngState = next;
    tier = pickTier(config, r);
  }
  return { id: spawner.nextId++, tier, energy: config.spawnEnergy };
}

/**
 * Gravity then refill, in place. Survivors fall keeping their order and energy; empty cells are
 * refilled column by column, left to right, from the lowest empty cell upwards.
 */
export function applyGravity(board: Cell[][], spawner: Spawner, config: GameConfig): GameEvent[] {
  const falls: Fall[] = [];
  const spawns: GameEvent[] = [];
  for (let c = 0; c < cols(board); c++) {
    let target = rows(board) - 1;
    for (let r = rows(board) - 1; r >= 0; r--) {
      const animal = board[r][c];
      if (!animal) continue;
      if (r !== target) {
        board[target][c] = animal;
        board[r][c] = null;
        falls.push({ id: animal.id, from: { row: r, col: c }, to: { row: target, col: c } });
      }
      target--;
    }
    for (let r = target; r >= 0; r--) {
      const animal = spawnAnimal(spawner, config);
      board[r][c] = animal;
      spawns.push({ type: 'spawn', animal, pos: { row: r, col: c } });
    }
  }
  return falls.length ? [{ type: 'fall', falls }, ...spawns] : spawns;
}
