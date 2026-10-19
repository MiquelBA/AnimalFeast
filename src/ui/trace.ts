// Pure tracing geometry: which cell a finger is over, and how the traced path grows or shrinks.
import { areNeighbours, samePos } from '../engine/board';
import type { Adjacency, Pos } from '../engine/types';

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The cell whose centre is within radius × cellSize of the point, if any. */
export function hitCell(p: Point, cellSize: number, rows: number, cols: number, radius: number): Pos | null {
  const col = Math.floor(p.x / cellSize);
  const row = Math.floor(p.y / cellSize);
  if (row < 0 || col < 0 || row >= rows || col >= cols) return null;
  const dx = p.x - (col + 0.5) * cellSize;
  const dy = p.y - (row + 0.5) * cellSize;
  return Math.hypot(dx, dy) <= radius * cellSize ? { row, col } : null;
}

/** Cells hit along a segment, in order (so fast swipes don't skip cells). */
export function cellsAlong(a: Point, b: Point, cellSize: number, rows: number, cols: number, radius: number): Pos[] {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (cellSize * 0.2)));
  const hits: Pos[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const hit = hitCell({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, cellSize, rows, cols, radius);
    if (hit && !(hits.length && samePos(hits[hits.length - 1], hit))) hits.push(hit);
  }
  return hits;
}

/**
 * Path after the finger reaches `pos`: going back to the previous cell unmarks the last one;
 * a new neighbouring cell is added (up to maxLength); anything else leaves the path as it is.
 */
export function extendPath(path: readonly Pos[], pos: Pos, adjacency: Adjacency, maxLength: number): readonly Pos[] {
  if (path.length === 0) return [pos];
  const last = path[path.length - 1];
  if (samePos(last, pos)) return path;
  if (path.length >= 2 && samePos(path[path.length - 2], pos)) return path.slice(0, -1);
  if (path.some((p) => samePos(p, pos))) return path;
  if (path.length >= maxLength || !areNeighbours(last, pos, adjacency)) return path;
  return [...path, pos];
}

export function cellCentre(pos: Pos, cellSize: number): Point {
  return { x: (pos.col + 0.5) * cellSize, y: (pos.row + 0.5) * cellSize };
}
