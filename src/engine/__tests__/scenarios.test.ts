// Mandatory scenarios G1–G11 from REGLES.md v0.2 §10 (G12 is in properties.test.ts).
import { describe, expect, it } from 'vitest';
import { cloneBoard, type Spawner } from '../board';
import { checkChain, countChains, legalChains } from '../chains';
import { makeConfig } from '../config';
import { applyMove, createGame, ensurePlayable, isLegalMove, moveError, replay, tick } from '../game';
import { boardToString, parseBoard } from '../notation';
import { nextInt } from '../rng';
import type { Move } from '../types';
import { board, ofType, path, setup, trace } from './helpers';

const G1 = 'O O O / S S S / S T R';

describe('REGLES.md v0.2 §10 scenarios', () => {
  it('G1: simple chain with gravity', () => {
    // minValidMoves: 0 because the expected board has no chain left: with the default (1) it would be shuffled.
    const r = trace(setup(G1, { queue: 'T T', config: { minValidMoves: 0 } }), [[2, 0], [2, 1], [2, 2]]);
    expect(boardToString(r.state.board)).toBe(board('T T O / O O S / S S R3'));
    expect(r.state.score).toBe(40);
    expect(ofType(r.events, 'chain')[0].points).toBe(40);
  });

  it('G1 with default minValidMoves: the resulting board has no chains, so it is shuffled', () => {
    const r = trace(setup(G1, { queue: 'T T' }), [[2, 0], [2, 1], [2, 2]]);
    expect(ofType(r.events, 'shuffle')).toHaveLength(1);
    expect(countChains(r.state.board, r.state.config)).toBeGreaterThanOrEqual(1);
    expect(r.state.score).toBe(40);
  });

  it('G2: diagonal chains are valid', () => {
    const s = setup(G1);
    expect(checkChain(s.board, path([2, 0], [1, 1], [0, 2]), s.config).valid).toBe(false); // S S O on G1
    const diag = setup('O O R / S T S / S T R');
    expect(isLegalMove(diag, { path: path([2, 0], [1, 1], [0, 2]) })).toBe(true);
  });

  it('G3: tracing backwards gives the same result; the predator is R', () => {
    const fwd = trace(setup(G1, { queue: 'T T', config: { minValidMoves: 0 } }), [[2, 0], [2, 1], [2, 2]]);
    const back = trace(setup(G1, { queue: 'T T', config: { minValidMoves: 0 } }), [[2, 2], [2, 1], [2, 0]]);
    expect(back.state.board).toEqual(fwd.state.board);
    expect(back.events).toEqual(fwd.events);
    expect(ofType(back.events, 'chain')[0].predator.tier).toBe(3);
  });

  it('G4: invalid chains', () => {
    const s = setup('S T S / R . . / S T R');
    const reason = (cells: [number, number][], st = s) => checkChain(st.board, path(...cells), st.config);
    expect(reason([[0, 0], [1, 0]])).toMatchObject({ reason: 'length' }); // S → R (also a skipped tier)
    expect(reason([[0, 0], [1, 0], [2, 1]])).toMatchObject({ reason: 'tiers' }); // S → R → T skips a tier
    expect(reason([[0, 0], [0, 1]])).toMatchObject({ reason: 'length' }); // S → T
    expect(reason([[0, 0], [0, 1], [0, 2]])).toMatchObject({ reason: 'tiers' }); // S → T → S
    expect(reason([[2, 0], [2, 1], [2, 0]])).toMatchObject({ reason: 'repeat' });
    expect(reason([[0, 0], [2, 1], [2, 2]])).toMatchObject({ reason: 'notAdjacent' });
    const four = setup('S . . / . T . / . . R', { config: { adjacency: 4 } });
    expect(reason([[0, 0], [1, 1], [2, 2]], four)).toMatchObject({ reason: 'notAdjacent' });
    const eight = setup('S . . / . T . / . . R');
    expect(reason([[0, 0], [1, 1], [2, 2]], eight)).toMatchObject({ valid: true });
  });

  it('G5: full chain, the orca frenzies and leaves (v0.3)', () => {
    const s = setup('T T T T / S T R O', { queue: 'S S S R R R R', config: { mode: 'time' } });
    const r = trace(s, [[1, 0], [1, 1], [1, 2], [1, 3]], 1000);
    const [chain] = ofType(r.events, 'chain');
    expect(chain.points).toBe(420);
    expect(ofType(r.events, 'energyGain')).toHaveLength(0); // the orca gains no energy
    const [frenzy] = ofType(r.events, 'frenzy');
    expect(frenzy.pos).toEqual({ row: 1, col: 3 });
    expect(frenzy.prey.map((p) => [p.pos.row, p.pos.col, p.points])).toEqual([[0, 2, 20], [0, 3, 60], [1, 2, 60]]);
    expect(frenzy.points).toBe(140);
    expect(ofType(r.events, 'leave')).toMatchObject([{ reason: 'frenzy', pos: { row: 1, col: 3 } }]);
    expect(boardToString(r.state.board)).toBe(board('S S R R / T T R R'));
    expect(r.state.score).toBe(560);
    expect(ofType(r.events, 'timeBonus').map((e) => [e.reason, e.ms])).toEqual([['frenzy', 2000]]);
    expect(r.state.timeLimitMs).toBe(120_000 + 2000);
    expect(r.state).toMatchObject({ chains4: 1, frenzies: 1, bestMove: 560 });
  });

  it('G5 with fullChainFrenzy: false: the orca leaves without a frenzy', () => {
    const s = setup('T T T T / S T R O', { queue: 'S S S S', config: { fullChainFrenzy: false, minValidMoves: 0 } });
    const r = trace(s, [[1, 0], [1, 1], [1, 2], [1, 3]]);
    expect(ofType(r.events, 'frenzy')).toHaveLength(0);
    expect(ofType(r.events, 'leave')).toMatchObject([{ reason: 'sated' }]);
    expect(r.state.score).toBe(420);
  });

  it('G5 with maxTierLeaves: false (v0.2): gravity before the frenzy, orca energy 6', () => {
    const s = setup('T T T T / S T R O', { queue: 'S S S R R R R', config: { maxTierLeaves: false, frenzyThreshold: 99, minValidMoves: 0 } });
    const r = trace(s, [[1, 0], [1, 1], [1, 2], [1, 3]]);
    expect(boardToString(r.state.board)).toBe(board('S S S T / T T T O6'));
  });

  it('G6: a 2-3-4 chain disappears entirely (the orca eats and leaves)', () => {
    const r = trace(setup('S S S / T R3 O', { queue: 'S S S', config: { minValidMoves: 0 } }), [[1, 0], [1, 1], [1, 2]]);
    expect(ofType(r.events, 'chain')[0].points).toBe(160);
    expect(ofType(r.events, 'energyGain')).toHaveLength(0);
    expect(ofType(r.events, 'leave')).toMatchObject([{ reason: 'sated', pos: { row: 1, col: 2 } }]);
    expect(ofType(r.events, 'frenzy')).toHaveLength(0);
    expect(boardToString(r.state.board)).toBe(board('S S S / S S S'));
  });

  it('G6 with maxTierLeaves: false (v0.2): energy inheritance, the orca reaches 6 and frenzies', () => {
    const r = trace(setup('S S S / T R3 O', { config: { maxTierLeaves: false } }), [[1, 0], [1, 1], [1, 2]]);
    expect(ofType(r.events, 'chain')[0].points).toBe(160);
    expect(ofType(r.events, 'energyGain')[0]).toMatchObject({ from: 0, to: 6 });
    expect(ofType(r.events, 'frenzy')).toHaveLength(1);
  });

  it('sharks accumulate energy and frenzy at the threshold', () => {
    const first = trace(setup('T T T / S T R', { queue: 'O O', config: { minValidMoves: 0 } }), [[1, 0], [1, 1], [1, 2]]);
    expect(ofType(first.events, 'energyGain')[0]).toMatchObject({ from: 0, to: 3 });
    expect(ofType(first.events, 'frenzy')).toHaveLength(0);
    const second = trace(setup('O O O / S T R3', { config: { minValidMoves: 0 } }), [[1, 0], [1, 1], [1, 2]]);
    expect(ofType(second.events, 'frenzy')).toHaveLength(1);
    const high = trace(setup('O O O / S T R3', { config: { minValidMoves: 0, frenzyThreshold: 9 } }), [[1, 0], [1, 1], [1, 2]]);
    expect(ofType(high.events, 'frenzy')).toHaveLength(0);
  });

  describe('G7: speed combo', () => {
    const rows3 = 'S T R / S T R / S T R';
    const play = (secondAt: number) => {
      const s = setup(rows3, { queue: 'S T S T', config: { mode: 'time' } });
      const first = trace(s, [[2, 0], [2, 1], [2, 2]], 1000);
      return trace(first.state, [[2, 0], [2, 1], [2, 2]], secondAt);
    };
    it('second chain 1.5 s later gets ×1.2', () => {
      const r = play(2500);
      expect(ofType(r.events, 'chain')[0]).toMatchObject({ comboMultiplier: 1.2, points: 48 });
      expect(ofType(r.events, 'combo')[0]).toMatchObject({ count: 2 });
      expect(r.state.maxCombo).toBe(2);
    });
    it('second chain 4 s later gets ×1', () => {
      const r = play(5000);
      expect(ofType(r.events, 'chain')[0]).toMatchObject({ comboMultiplier: 1, points: 40 });
    });
    it('moves mode never applies the combo', () => {
      const s = setup(rows3, { queue: 'S T S T' });
      const first = trace(s, [[2, 0], [2, 1], [2, 2]], 1000);
      const r = trace(first.state, [[2, 0], [2, 1], [2, 2]], 1500);
      expect(ofType(r.events, 'chain')[0].comboMultiplier).toBe(1);
    });
  });

  describe('G8: time', () => {
    const timed = () => setup('S T R O / S T R O', { config: { mode: 'time' } });
    it('rejects a move that arrives after time is up', () => {
      const s = timed();
      const move: Move = { path: path([1, 0], [1, 1], [1, 2]), atMs: 120_000 };
      expect(moveError(s, move)).toBe('timeUp');
      expect(() => applyMove(s, move)).toThrow();
      expect(moveError(s, { path: move.path })).toBe('missingTime');
    });
    it('tick to zero ends the game, and later moves are rejected', () => {
      const a = tick(timed(), 119_999);
      expect(a.state.gameOver).toBe(false);
      const b = tick(a.state, 1);
      expect(b.state.gameOver).toBe(true);
      expect(b.events).toMatchObject([{ type: 'gameOver' }]);
      expect(moveError(b.state, { path: path([1, 0], [1, 1], [1, 2]), atMs: 119_000 })).toBe('gameOver');
    });
    it('time bonuses extend the limit', () => {
      const s = setup('T T T T / S T R O', { queue: 'S S S R R R R', config: { mode: 'time' } });
      const r = trace(s, [[1, 0], [1, 1], [1, 2], [1, 3]], 1000);
      expect(tick(r.state, 121_999 - 1000).state.gameOver).toBe(false);
      expect(tick(r.state, 122_000 - 1000).state.gameOver).toBe(true);
    });
    it('time bonuses are capped by maxTimeBonusMs', () => {
      const config = { mode: 'time' as const, maxTimeBonusMs: 3000 };
      const a = trace(setup('T T T T / S T R O / S T R O', { queue: 'S S S R R R R S S S R R R R', config }), [[1, 0], [1, 1], [1, 2], [1, 3]], 1000);
      const full = a.state.board.findIndex((row) => row.map((x) => x!.tier).join() === '1,2,3,4');
      expect(full).toBeGreaterThanOrEqual(0);
      const b = trace(a.state, [[full, 0], [full, 1], [full, 2], [full, 3]], 2000);
      expect(ofType(b.events, 'timeBonus')).toMatchObject([{ ms: 1000 }]);
      expect(b.state.timeLimitMs).toBe(123_000);
    });
  });

  it('G9: moves mode ends after maxMoves', () => {
    const s = setup('S T R / S T R / S T R', { config: { maxMoves: 2 } });
    const a = trace(s, [[2, 0], [2, 1], [2, 2]]);
    expect(a.state.gameOver).toBe(false);
    const b = trace(a.state, [[2, 0], [2, 1], [2, 2]]);
    expect(b.state.gameOver).toBe(true);
    expect(b.events.at(-1)).toMatchObject({ type: 'gameOver', stats: { moves: 2, chains: 2 } });
  });

  it('G10: a board with no chains is shuffled, keeping energies', () => {
    const config = makeConfig({ minValidMoves: 3 });
    const start = parseBoard('T T1 T T / S S2 S S / O O O3 O / R R R4 R');
    expect(countChains(start, config)).toBe(0);
    const spawner: Spawner = { rngState: 99, spawnQueue: [], nextId: 100 };
    const { board: after, events } = ensurePlayable(cloneBoard(start), spawner, config);
    expect(events[0].type).toBe('shuffle');
    expect(countChains(after, config)).toBeGreaterThanOrEqual(3);
    const key = (b: typeof start) => b.flat().map((a) => `${a!.id}:${a!.tier}:${a!.energy}`).sort();
    expect(key(after)).toEqual(key(start));
  });

  it('G10: a board that can never have chains is regenerated', () => {
    const config = makeConfig({ minValidMoves: 1, minInitialMoves: 3 });
    const start = parseBoard('S S S / S S S / S S S');
    const { board: after, events } = ensurePlayable(start, { rngState: 5, spawnQueue: [], nextId: 100 }, config);
    expect(events[0]).toMatchObject({ type: 'regenerate' });
    expect(countChains(after, config)).toBeGreaterThanOrEqual(3);
  });

  it('G11: same seed and moves give the same state and events', () => {
    const play = () => {
      let s = createGame({ seed: 42, config: makeConfig({ mode: 'moves' }) });
      let rng = 7;
      const events: unknown[] = [];
      while (!s.gameOver) {
        const chains = legalChains(s.board, s.config);
        let i: number;
        [i, rng] = nextInt(rng, chains.length);
        const r = applyMove(s, { path: chains[i] });
        events.push(r.events);
        s = r.state;
      }
      return { s, events };
    };
    const a = play();
    const b = play();
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(replay({ seed: 42, config: makeConfig({ mode: 'moves' }) }, a.s.history)).toEqual(a.s);
  });
});

describe('chains', () => {
  it('counts a chain and its reverse once', () => {
    const config = makeConfig();
    expect(legalChains(parseBoard('S T R'), config)).toHaveLength(1);
    // 1-2-3, 2-3-4 and 1-2-3-4.
    expect(legalChains(parseBoard('S T R O'), config)).toHaveLength(3);
  });

  it('counts every distinct set of cells', () => {
    // Two sardines share one tuna and one shark: 2 chains.
    expect(legalChains(parseBoard('S T R / S . .'), makeConfig())).toHaveLength(2);
  });

  it('allowDescendingTrace: false rejects R → T → S', () => {
    const s = setup('S T R', { config: { allowDescendingTrace: false } });
    expect(checkChain(s.board, path([0, 2], [0, 1], [0, 0]), s.config).valid).toBe(false);
    expect(checkChain(s.board, path([0, 0], [0, 1], [0, 2]), s.config).valid).toBe(true);
  });

  it('chainLengths limits valid lengths', () => {
    const s = setup('S T R O', { config: { chainLengths: [3] } });
    expect(checkChain(s.board, path([0, 0], [0, 1], [0, 2], [0, 3]), s.config).valid).toBe(false);
  });
});

describe('createGame', () => {
  it('generates a full board with at least minInitialMoves chains', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const s = createGame({ seed });
      expect(s.board.flat().every(Boolean)).toBe(true);
      expect(countChains(s.board, s.config)).toBeGreaterThanOrEqual(s.config.minInitialMoves);
    }
  });
});

describe('notation', () => {
  it('round-trips rectangular boards', () => {
    const text = 'O . R3 / S T12 .';
    expect(boardToString(parseBoard(text))).toBe(text);
    expect(boardToString(parseBoard('S T\nR O'))).toBe('S T / R O');
  });
  it('rejects bad tokens and ragged rows', () => {
    expect(() => parseBoard('X')).toThrow();
    expect(() => parseBoard('S T / R')).toThrow();
  });
});

describe('applyMove', () => {
  it('does not mutate the input state', () => {
    const s = setup(G1, { queue: 'T T' });
    const snapshot = JSON.stringify(s);
    trace(s, [[2, 0], [2, 1], [2, 2]]);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});
