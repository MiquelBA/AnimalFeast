// Whirlpool (config.whirlpoolChainLength): left by a long traced chain; swallows its row and column.
import { describe, expect, it } from 'vitest';
import { parseBoard, boardToString } from '../notation';
import { ofType, setup, trace } from './helpers';

const config = { whirlpoolChainLength: 4, minValidMoves: 0 };

describe('whirlpool', () => {
  it('a 4-chain leaves one where the chain started', () => {
    const { state, events } = trace(setup('S T R O / O O O O', { queue: 'S S S', config }), [[0, 0], [0, 1], [0, 2], [0, 3]]);
    expect(ofType(events, 'create')).toHaveLength(1);
    expect(state.board[0][0]).toMatchObject({ whirl: true, wild: true });
  });

  it('a 3-chain does not, and nothing appears when the option is off', () => {
    expect(ofType(trace(setup('S T R / O O O', { queue: 'S S', config }), [[0, 0], [0, 1], [0, 2]]).events, 'create')).toHaveLength(0);
    const off = setup('S T R O / O O O O', { queue: 'S S S S', config: { minValidMoves: 0 } });
    expect(ofType(trace(off, [[0, 0], [0, 1], [0, 2], [0, 3]]).events, 'create')).toHaveLength(0);
  });

  it('plays as a wildcard and swallows its row and column, but not the predator', () => {
    const { state, events } = trace(setup('S W R / T O T / O O O', { queue: 'S S S S', config }), [[0, 0], [0, 1], [0, 2]]);
    const [w] = ofType(events, 'whirlpool');
    expect(w.pos).toEqual({ row: 0, col: 1 });
    expect(w.swallowed.map((s) => s.pos)).toEqual([{ row: 1, col: 1 }, { row: 2, col: 1 }]);
    expect(w.points).toBe(600);
    expect(state.score).toBe(40 + 600);
    expect(state.board[0][2]).toMatchObject({ tier: 3, energy: 3 });
    expect(state.whirlpools).toBe(1);
  });

  it('another whirlpool caught in it goes off too; a chain that used one leaves no new one', () => {
    const { events } = trace(setup('S W R O / O W O O / O O O O', { queue: 'S S S S S S S', config }), [[0, 0], [0, 1], [0, 2], [0, 3]]);
    const whirls = ofType(events, 'whirlpool');
    expect(whirls).toHaveLength(2);
    expect(whirls[1].pos).toEqual({ row: 1, col: 1 });
    expect(ofType(events, 'create')).toHaveLength(0);
  });

  it('round-trips in notation as W', () => {
    expect(boardToString(parseBoard('W P S'))).toBe('W P S');
  });
});
