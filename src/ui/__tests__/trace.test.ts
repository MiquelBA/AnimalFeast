import { describe, expect, it } from 'vitest';
import { cellsAlong, extendPath, hitCell } from '../trace';
import { UI } from '../uiConfig';

const p = (row: number, col: number) => ({ row, col });

describe('hitCell', () => {
  it('marks a cell only inside the 35% circle around its centre', () => {
    expect(hitCell({ x: 150, y: 50 }, 100, 7, 7, UI.hitRadius)).toEqual(p(0, 1));
    expect(hitCell({ x: 150 + 34, y: 50 }, 100, 7, 7, UI.hitRadius)).toEqual(p(0, 1));
    expect(hitCell({ x: 150 + 36, y: 50 }, 100, 7, 7, UI.hitRadius)).toBeNull();
    // Corners between cells mark nothing, so diagonals are easy to trace.
    expect(hitCell({ x: 200, y: 100 }, 100, 7, 7, UI.hitRadius)).toBeNull();
    expect(hitCell({ x: -10, y: 50 }, 100, 7, 7, UI.hitRadius)).toBeNull();
  });
});

describe('cellsAlong', () => {
  it('does not skip cells on a fast swipe', () => {
    expect(cellsAlong({ x: 50, y: 50 }, { x: 350, y: 50 }, 100, 7, 7, UI.hitRadius)).toEqual([p(0, 0), p(0, 1), p(0, 2), p(0, 3)]);
    expect(cellsAlong({ x: 50, y: 50 }, { x: 250, y: 250 }, 100, 7, 7, UI.hitRadius)).toEqual([p(0, 0), p(1, 1), p(2, 2)]);
  });
});

describe('extendPath', () => {
  it('adds neighbours, backtracks one step, ignores the rest', () => {
    let path = extendPath([], p(0, 0), 8, 4);
    path = extendPath(path, p(1, 1), 8, 4);
    expect(path).toEqual([p(0, 0), p(1, 1)]);
    expect(extendPath(path, p(3, 3), 8, 4)).toBe(path); // not adjacent
    expect(extendPath(path, p(0, 0), 8, 4)).toEqual([p(0, 0)]); // back
    path = extendPath(path, p(1, 2), 8, 4);
    path = extendPath(path, p(0, 1), 8, 4);
    expect(path).toHaveLength(4);
    expect(extendPath(path, p(0, 2), 8, 4)).toBe(path); // max length
    expect(extendPath(path, p(1, 1), 8, 4)).toBe(path); // already marked, not the previous one
    expect(extendPath([p(0, 0)], p(1, 1), 4, 4)).toEqual([p(0, 0)]); // no diagonals with adjacency 4
  });
});

describe('UI timings', () => {
  it('no normal animation goes over the budget', () => {
    for (const ms of Object.values(UI.anim)) expect(ms).toBeLessThanOrEqual(UI.maxAnimMs);
  });
});
