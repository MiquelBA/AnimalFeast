// Special pieces (REGLES.md v0.5 §9): golden animals and the wildcard octopus.
import { describe, expect, it } from 'vitest';
import { checkChain, legalChains, traceStatus } from '../chains';
import { makeConfig } from '../config';
import { createGame } from '../game';
import { boardToString, parseBoard } from '../notation';
import { board, ofType, path, setup, trace } from './helpers';

const noShuffle = { minValidMoves: 0 };

describe('golden animals', () => {
  it('a golden prey doubles the chain', () => {
    const { events } = trace(setup('S* T R', { queue: 'S S', config: noShuffle }), [[0, 0], [0, 1], [0, 2]]);
    const chain = ofType(events, 'chain')[0];
    expect(chain.goldenMultiplier).toBe(2);
    expect(chain.points).toBe((10 + 30) * 2);
  });

  it('a golden predator doubles the chain too, and stays golden', () => {
    const { state, events } = trace(setup('S T R*', { queue: 'S S', config: noShuffle }), [[0, 0], [0, 1], [0, 2]]);
    expect(ofType(events, 'chain')[0].points).toBe(80);
    expect(state.board[0][2]).toMatchObject({ golden: true, energy: 3 });
  });

  it('several goldens stack, with the length multiplier', () => {
    const { state, events } = trace(setup('S* T* R O', { queue: 'S S S', config: noShuffle }), [[0, 0], [0, 1], [0, 2], [0, 3]]);
    expect(ofType(events, 'chain')[0].points).toBe((10 + 30 + 100) * 3 * 4);
    expect(state.goldenChains).toBe(1);
  });

  it('every spawn is golden when goldenChance is 1, none when 0', () => {
    const all = createGame({ seed: 3, config: makeConfig({ goldenChance: 1, wildChance: 0 }) });
    expect(all.board.flat().every((a) => a?.golden)).toBe(true);
    const none = createGame({ seed: 3, config: makeConfig({ goldenChance: 0, wildChance: 0 }) });
    expect(none.board.flat().some((a) => a?.golden || a?.wild)).toBe(false);
  });
});

describe('octopus (wildcard)', () => {
  const s = setup('S P R / P T P / R P S', { config: noShuffle });
  const check = (cells: [number, number][]) => checkChain(s.board, path(...cells), s.config);

  it('stands in for the missing tier, both ways', () => {
    expect(check([[0, 0], [0, 1], [0, 2]])).toMatchObject({ valid: true, tiers: [1, 2, 3] });
    expect(check([[0, 2], [0, 1], [0, 0]])).toMatchObject({ valid: true, tiers: [1, 2, 3] });
    expect(check([[1, 0], [1, 1], [0, 2]])).toMatchObject({ valid: true, tiers: [1, 2, 3] }); // P as sardine
    expect(check([[1, 0], [0, 1], [0, 2]])).toMatchObject({ valid: true, tiers: [1, 2, 3] }); // two octopuses
  });

  it('is never the predator', () => {
    expect(check([[0, 0], [1, 1], [1, 2]]).valid).toBe(false); // S T P
    expect(check([[1, 2], [1, 1], [0, 0]]).valid).toBe(false); // P T S, traced down
  });

  it('scores and feeds the predator as the tier it plays', () => {
    const { state, events } = trace(setup('S P R', { queue: 'S S', config: noShuffle }), [[0, 0], [0, 1], [0, 2]]);
    expect(ofType(events, 'chain')[0].points).toBe(10 + 30);
    expect(state.board[0][2]).toMatchObject({ tier: 3, energy: 1 + 2 });
    expect(state.wildChains).toBe(1);
  });

  it('is not eaten by a frenzy', () => {
    const st = setup('P S T / T R8 .', { queue: 'S S', config: noShuffle });
    const { state, events } = trace(st, [[0, 1], [0, 2], [1, 1]]);
    const frenzy = ofType(events, 'frenzy')[0];
    expect(frenzy.prey.some((p) => p.animal.wild)).toBe(false);
    expect(state.board.flat().some((a) => a?.wild)).toBe(true);
  });

  it('counts each set of cells once in legalChains', () => {
    const chains = legalChains(parseBoard('P P R'), makeConfig());
    expect(chains).toHaveLength(1);
    expect(legalChains(parseBoard('S P R O'), makeConfig())).toHaveLength(3);
  });

  it('gives live trace feedback', () => {
    const st = (cells: [number, number][]) => traceStatus(s.board, path(...cells), s.config);
    expect(st([[0, 1]])).toBe('partial');
    expect(st([[0, 0], [0, 1]])).toBe('partial');
    expect(st([[0, 0], [1, 1], [1, 2]])).toBe('partial'); // S T P: an orca could still close it
    expect(st([[1, 1], [1, 2], [2, 2]])).toBe('invalid'); // T P S fits no sequence
  });
});

describe('notation', () => {
  it('round-trips golden animals and octopuses', () => {
    expect(board('R*6 P S / O* T2 .')).toBe('R*6 P S / O* T2 .');
    expect(() => parseBoard('P3')).toThrow();
    expect(boardToString(parseBoard('S* P'))).toBe('S* P');
  });
});
