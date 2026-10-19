// Mandatory scenarios T1–T12 and T14 from REGLES.md §9 (T13 is in properties.test.ts).
import { describe, expect, it } from 'vitest';
import { boardToString, parseBoard } from '../notation';
import { applyMove, createGame, replay } from '../game';
import { board, captures, place, setup } from './helpers';

describe('REGLES.md §9 scenarios', () => {
  it('T1: simple capture, predator moves into prey', () => {
    const r = place(setup('. . / . S', 'T'), 1, 0);
    expect(boardToString(r.state.board)).toBe(board('. . / . T1'));
    expect(r.state.score).toBe(10);
    expect(r.state.longestChain).toBe(1);
  });

  it('T2: no capture across two levels', () => {
    const r = place(setup('. . / . S', 'R'), 1, 0);
    expect(boardToString(r.state.board)).toBe(board('. . / R S'));
    expect(captures(r)).toHaveLength(0);
    expect(r.state.score).toBe(0);
  });

  it('T3: the placed animal is hunted', () => {
    const r = place(setup('. . / . T', 'S'), 1, 2);
    expect(boardToString(r.state.board)).toBe(board('. . . / . . T1'));
    expect(r.state.score).toBe(10);
    expect(captures(r)[0]).toMatchObject({ kind: 'hunted', predatorTo: { row: 1, col: 2 }, vacated: { row: 1, col: 1 } });
  });

  it('T4: serial hunting with chain multiplier', () => {
    const r = place(setup('. S S', 'T'), 1, 1);
    expect(captures(r).map((e) => e.points)).toEqual([10, 15]);
    expect(boardToString(r.state.board)).toBe(board('. . T2'));
    expect(r.state.score).toBe(25);
    expect(r.state.longestChain).toBe(2);
  });

  it('T5: big cascade', () => {
    const r = place(setup('. O . / . S R', 'T'), 1, 0);
    const cs = captures(r);
    expect(cs.map((e) => [e.predator.species, e.prey.species, e.points])).toEqual([
      ['TUNA', 'SARDINE', 10],
      ['SHARK', 'TUNA', 60],
      ['ORCA', 'SHARK', 240],
    ]);
    expect(boardToString(r.state.board)).toBe(board('. . / . O4'));
    expect(r.state.score).toBe(310);
    expect(r.state.longestChain).toBe(3);
  });

  it('T6: same-species capture', () => {
    const r = place(setup('. . / . R3', 'R'), 1, 2);
    expect(boardToString(r.state.board)).toBe(board('. . . / . . R6'));
    expect(r.state.score).toBe(200);
  });

  it('T7: same species, same energy: no capture', () => {
    const r = place(setup('. . / . R', 'R'), 1, 2);
    expect(boardToString(r.state.board)).toBe(board('. . . / . R R'));
    expect(captures(r)).toHaveLength(0);
  });

  it('T8: predator conflict, higher energy wins', () => {
    const r = place(setup('. T . / . . T2', 'S'), 1, 1);
    expect(captures(r).map((e) => e.points)).toEqual([10, 90]);
    expect(boardToString(r.state.board)).toBe(board('. T5'));
    expect(r.state.score).toBe(100);
    expect(r.state.longestChain).toBe(2);
  });

  it('T9: tie broken by direction (North first)', () => {
    const r = place(setup('. T . / . . T', 'S'), 1, 1);
    const [first, second] = captures(r);
    expect(first.predatorFrom).toEqual({ row: 0, col: 1 });
    expect(first.points).toBe(10);
    expect(second.points).toBe(90);
    expect(boardToString(r.state.board)).toBe(board('. . . / . . T3'));
    expect(r.state.score).toBe(100);
  });

  it('T10: orca only eats sharks', () => {
    const tuna = place(setup('. . / . T', 'O'), 1, 0);
    expect(captures(tuna)).toHaveLength(0);
    const shark = place(setup('. . / . R', 'O'), 1, 0);
    expect(captures(shark)).toHaveLength(1);
    expect(boardToString(shark.state.board)).toBe(board('. . / . O3'));
  });

  it('T11: game over when the board fills without a capture', () => {
    const full = 'S S S S S S / S S S S S S / S S S S S S / S S S S S S / S S S S S S / S S S S S .';
    const noCapture = place(setup(full, 'S'), 5, 5);
    expect(noCapture.state.gameOver).toBe(true);
    expect(noCapture.events.at(-1)).toMatchObject({ type: 'gameOver' });
    const capture = place(setup(full, 'T'), 5, 5);
    expect(captures(capture).length).toBeGreaterThan(0);
    expect(capture.state.gameOver).toBe(false);
  });

  it('T12: same seed and moves give the same state and score', () => {
    const moves = [];
    let s = createGame({ seed: 42 });
    for (let i = 0; !s.gameOver && i < 200; i++) {
      const empty = s.board.flatMap((row, r) => row.map((a, c) => (a ? null : { row: r, col: c }))).filter(Boolean);
      const cell = empty[(i * 7) % empty.length]!;
      const move = { handIndex: i % 3, ...cell };
      moves.push(move);
      s = applyMove(s, move).state;
    }
    const again = replay({ seed: 42 }, moves);
    expect(again).toEqual(s);
    expect(JSON.stringify(again)).toBe(JSON.stringify(s));
  });

  it('T14: anyLower lets a shark eat a sardine', () => {
    const r = place(setup('. . / . S', 'R', { eatRule: 'anyLower' }), 1, 0);
    expect(boardToString(r.state.board)).toBe(board('. . / . R1'));
  });
});

describe('rule variants', () => {
  it('predatorMovesIntoPrey: false keeps the predator in place', () => {
    const r = place(setup('. . / . S', 'T', { predatorMovesIntoPrey: false }), 1, 0);
    expect(boardToString(r.state.board)).toBe(board('. . / T1 .'));
    expect(captures(r)[0]).toMatchObject({ predatorTo: { row: 1, col: 0 }, vacated: { row: 1, col: 1 } });
  });

  it('predatorMovesIntoPrey: false in a cascade (T5 board)', () => {
    const r = place(setup('. O . / . S R', 'T', { predatorMovesIntoPrey: false }), 1, 0);
    // T eats S and stays at (1,0); T is no longer next to R or O, so the chain stops.
    expect(boardToString(r.state.board)).toBe(board('. O . / T1 . R'));
    expect(r.state.score).toBe(10);
  });

  it('sameSpeciesCaptures: false disables T6', () => {
    const r = place(setup('. . / . R3', 'R', { sameSpeciesCaptures: false }), 1, 2);
    expect(captures(r)).toHaveLength(0);
  });

  it('prey choice prefers the highest capture value (anyLower orca)', () => {
    // Orca placed between a sardine (W) and a shark (E): it eats the shark first.
    const r = place(setup('S . R', 'O', { eatRule: 'anyLower' }), 0, 1);
    expect(captures(r)[0].prey.species).toBe('SHARK');
  });

  it('chain multiplier caps at the last value', () => {
    // Tuna eats four sardines in a row: 10, 15, 20, 30.
    const r = place(setup('. S S S S', 'T'), 1, 1);
    expect(captures(r).map((e) => e.points)).toEqual([10, 15, 20, 30]);
  });
});

describe('notation', () => {
  it('round-trips board text', () => {
    const text = 'O . R3 . . . / S T12 . . . . / . . . . . . / . . . . . . / . . . . . . / . . . . . .';
    expect(boardToString(parseBoard(text, 6))).toBe(text);
  });

  it('rejects unknown letters', () => {
    expect(() => parseBoard('X', 6)).toThrow();
  });
});

describe('applyMove', () => {
  it('rejects illegal moves', () => {
    const s = setup('S', 'T');
    expect(() => applyMove(s, { handIndex: 0, row: 0, col: 0 })).toThrow();
    expect(() => applyMove(s, { handIndex: 3, row: 1, col: 1 })).toThrow();
    expect(() => applyMove(s, { handIndex: 0, row: 6, col: 0 })).toThrow();
  });

  it('does not mutate the input state', () => {
    const s = setup('. S S', 'T');
    const snapshot = JSON.stringify(s);
    place(s, 1, 1);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('refills only the used hand slot', () => {
    const s = createGame({ seed: 7 });
    const r = applyMove(s, { handIndex: 1, row: 0, col: 0 });
    expect(r.state.hand[0]).toEqual(s.hand[0]);
    expect(r.state.hand[2]).toEqual(s.hand[2]);
    expect(r.state.hand[1].id).not.toBe(s.hand[1].id);
  });
});
