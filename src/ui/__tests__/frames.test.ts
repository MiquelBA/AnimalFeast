import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../engine/config';
import { applyMove, createGame } from '../../engine/game';
import { boardToString, parseBoard, parseTiers } from '../../engine/notation';
import type { Board, Cell } from '../../engine/types';
import { buildFrames, type Frame } from '../frames';
import { legalChains } from '../../engine/chains';
import { UI } from '../uiConfig';

function boardOf(frame: Frame, like: Board): string {
  const b: Cell[][] = like.map((row) => row.map(() => null));
  for (const t of frame.tiles) b[t.pos.row][t.pos.col] = t.animal;
  return boardToString(b);
}

describe('buildFrames', () => {
  it('G1: eat, then fall with spawns entering from above', () => {
    const config = makeConfig({ mode: 'moves', minValidMoves: 0 });
    const s = createGame({ seed: 1, config, board: parseBoard('O O O / S S S / S T R'), spawnQueue: parseTiers('T T') });
    const { state, events } = applyMove(s, { path: [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }] });
    const frames = buildFrames(s.board, events);
    expect(frames.map((f) => f.kind)).toEqual(['eat', 'fall']);
    expect(frames[0].ghosts.map((g) => g.kind)).toEqual(['swallow', 'swallow']);
    expect(frames[0].effects).toContainEqual({ type: 'points', pos: { row: 2, col: 2 }, points: 40 });
    expect(boardOf(frames[1], s.board)).toBe(boardToString(state.board));
    expect([...frames[1].entering.values()]).toEqual([{ row: -1, col: 0 }, { row: -1, col: 1 }]);
  });

  it('frenzy produces its own frame followed by a fall, and the last frame matches the state', () => {
    const config = makeConfig({ mode: 'time', minValidMoves: 0, fullChainFrenzy: true });
    const s = createGame({ seed: 1, config, board: parseBoard('T T T T / S T R O'), spawnQueue: parseTiers('S S S R R R R') });
    const { state, events } = applyMove(s, { path: [0, 1, 2, 3].map((col) => ({ row: 1, col })), atMs: 1000 });
    const frames = buildFrames(s.board, events);
    expect(frames.map((f) => f.kind)).toEqual(['eat', 'fall', 'frenzy', 'fall']);
    expect(frames[2].ghosts.filter((g) => g.kind === 'burst')).toHaveLength(1);
    expect(frames[2].effects.some((e) => e.type === 'text' && e.text === 'timeBonus')).toBe(true);
    expect(boardOf(frames[3], s.board)).toBe(boardToString(state.board));
  });

  it('every frame stays within the animation budget, over random games', () => {
    let s = createGame({ seed: 5, config: makeConfig({ mode: 'moves' }) });
    for (let i = 0; i < 30 && !s.gameOver; i++) {
      const r = applyMove(s, { path: legalChains(s.board, s.config)[0] });
      const frames = buildFrames(s.board, r.events);
      for (const f of frames) expect(f.duration).toBeLessThanOrEqual(UI.maxAnimMs);
      expect(boardOf(frames[frames.length - 1], s.board)).toBe(boardToString(r.state.board));
      s = r.state;
    }
  });
});
