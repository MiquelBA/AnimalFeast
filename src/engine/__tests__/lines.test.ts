// Spontaneous chains (config.spontaneousLines): straight lines in food-chain order eat themselves.
import { describe, expect, it } from 'vitest';
import { countChains, legalChains } from '../chains';
import { makeConfig } from '../config';
import { applyMove, createGame, replay } from '../game';
import { findLines } from '../lines';
import { parseBoard } from '../notation';
import { ofType, setup, trace } from './helpers';

const on = makeConfig({ spontaneousLines: true });
const cells = (line: { row: number; col: number }[]) => line.map((p) => [p.row, p.col]);

describe('findLines', () => {
  it('finds rows and columns, prey first, in either direction', () => {
    expect(findLines(parseBoard('S T R'), on).map(cells)).toEqual([[[0, 0], [0, 1], [0, 2]]]);
    expect(findLines(parseBoard('R T S'), on).map(cells)).toEqual([[[0, 2], [0, 1], [0, 0]]]);
    expect(findLines(parseBoard('O / R / T'), on).map(cells)).toEqual([[[2, 0], [1, 0], [0, 0]]]);
  });

  it('ignores diagonals, short runs and octopuses', () => {
    expect(findLines(parseBoard('S O O / O T O / O O R'), on)).toEqual([]);
    expect(findLines(parseBoard('S T S T'), on)).toEqual([]);
    expect(findLines(parseBoard('S P R'), on)).toEqual([]);
  });

  it('prefers the longer line when two share a cell', () => {
    const lines = findLines(parseBoard('S T R O / O O T O / O O S O'), on);
    expect(lines.map(cells)).toEqual([[[0, 0], [0, 1], [0, 2], [0, 3]]]);
  });
});

describe('waves', () => {
  // Tracing S T R down column 0 drops the top sardine next to T R: that row eats itself.
  const start = () => setup('S O O / S O O / T T R / R O O', { queue: 'O O O O', config: { spontaneousLines: true, minValidMoves: 0 } });

  it('a fall that lines up S T R starts a wave, scored with the wave multiplier', () => {
    const { state, events } = trace(start(), [[1, 0], [2, 0], [3, 0]]);
    const chains = ofType(events, 'chain');
    expect(chains.map((c) => c.wave)).toEqual([0, 1]);
    expect(chains[1].waveMultiplier).toBe(2);
    expect(chains[1].points).toBe((10 + 30) * 2);
    expect(state.score).toBe(40 + 80);
    expect(state.spontaneousChains).toBe(1);
    expect(state.maxWaves).toBe(1);
    expect(findLines(state.board, on)).toEqual([]);
  });

  it('is off by default', () => {
    const s = setup('S O O / S O O / T T R / R O O', { queue: 'O O O O', config: { minValidMoves: 0 } });
    expect(ofType(trace(s, [[1, 0], [2, 0], [3, 0]]).events, 'chain')).toHaveLength(1);
  });
});

describe('whole games with spontaneous chains', () => {
  for (const [name, overrides] of [
    ['traced as now', { spontaneousLines: true, refillRerolls: 10 }],
    ['traced in a cross', { spontaneousLines: true, adjacency: 4 as const, refillRerolls: 100, minValidMoves: 2 }],
  ] as const) {
    it(`${name}: boards stay calm and playable, ids stay unique, replays match`, () => {
      const config = makeConfig({ ...overrides, mode: 'moves', maxMoves: 40 });
      for (let seed = 1; seed <= 6; seed++) {
        let state = createGame({ seed, config });
        expect(findLines(state.board, config)).toEqual([]);
        while (!state.gameOver) {
          const chains = legalChains(state.board, config);
          const { state: next, events } = applyMove(state, { path: chains[seed % chains.length] });
          const waves = ofType(events, 'chain').map((c) => c.wave);
          expect(waves[0]).toBe(0);
          state = next;
          expect(findLines(state.board, config)).toEqual([]);
          expect(countChains(state.board, config)).toBeGreaterThanOrEqual(config.minValidMoves);
          const ids = state.board.flat().map((a) => a!.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
        expect(replay({ seed, config }, state.history).score).toBe(state.score);
      }
    });
  }
});
