// Five tiers (REGLES.md v0.5 §1): plankton below the sardine.
import { describe, expect, it } from 'vitest';
import { checkChain, legalChains } from '../chains';
import { FIVE_TIERS, makeConfig } from '../config';
import { applyMove, createGame } from '../game';
import { boardToString, parseBoard, parseTiers } from '../notation';
import { isNearFrenzy, minEnergyGain } from '../score';
import { ofType, path } from './helpers';

const config = makeConfig({ ...FIVE_TIERS, mode: 'moves', minValidMoves: 0, goldenChance: 0, wildChance: 0 });
const game = (text: string, queue = '') =>
  createGame({ seed: 1, config, board: parseBoard(text, 1, 5), spawnQueue: parseTiers(queue, 5) });
const row = (n: number) => path(...Array.from({ length: n }, (_, c): [number, number] => [0, c]));

describe('five tiers', () => {
  it('the full chain of 5 scores ×6 and the orca leaves', () => {
    const { state, events } = applyMove(game('K S T R O', 'K K K K K'), { path: row(5) });
    expect(ofType(events, 'chain')[0].points).toBe((5 + 10 + 30 + 100) * 6);
    expect(ofType(events, 'leave')[0].reason).toBe('sated');
    expect(state.chains4).toBe(0);
  });

  it('the tuna is now a predator and gathers energy', () => {
    const { state } = applyMove(game('K S T', 'K K'), { path: row(3) });
    expect(state.board[0][2]).toMatchObject({ tier: 3, energy: 2 });
    expect(minEnergyGain(3, config)).toBe(2);
    expect(isNearFrenzy({ id: 1, tier: 3, energy: 7 }, config)).toBe(true);
    expect(isNearFrenzy({ id: 1, tier: 5, energy: 8 }, config)).toBe(false);
  });

  it('counts chains of 3, 4 and 5', () => {
    expect(legalChains(parseBoard('K S T R O', 1, 5), config)).toHaveLength(3 + 2 + 1);
  });

  it('the octopus can fill any tier, including plankton', () => {
    const b = parseBoard('P S T R O', 1, 5);
    expect(checkChain(b, row(5), config)).toMatchObject({ valid: true, tiers: [1, 2, 3, 4, 5] });
  });

  it('notation uses K for plankton', () => {
    expect(boardToString(parseBoard('K S* T2 / R O P', 1, 5), 5)).toBe('K S* T2 / R O P');
    expect(() => parseBoard('K S', 1, 4)).toThrow();
  });
});
