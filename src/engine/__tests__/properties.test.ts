// G12: property tests over random games with random valid chains.
import { describe, expect, it } from 'vitest';
import { isFull } from '../board';
import { countChains, legalChains } from '../chains';
import { makeConfig, type ConfigOverrides } from '../config';
import { applyMove, createGame, tick } from '../game';
import { nextInt } from '../rng';
import type { GameConfig, GameEvent } from '../types';

function disappeared(events: readonly GameEvent[]): number {
  return events.reduce((n, e) => n + (e.type === 'eat' || e.type === 'leave' ? 1 : e.type === 'regenerate' ? e.removed.length : 0), 0);
}

function appeared(events: readonly GameEvent[]): number {
  return events.reduce((n, e) => n + (e.type === 'spawn' ? 1 : e.type === 'regenerate' ? e.board.flat().length : 0), 0);
}

function eventPoints(events: readonly GameEvent[]): number {
  return events.reduce((n, e) => n + (e.type === 'chain' || e.type === 'frenzy' ? e.points : 0), 0);
}

const MAX_MOVES = 200;
const TIMEOUT_MS = 60_000;

function playRandomGames(games: number, config: GameConfig) {
  for (let seed = 1; seed <= games; seed++) {
    let s = createGame({ seed, config });
    let rng = seed * 7919;
    let atMs = 0;
    while (!s.gameOver) {
      const chains = legalChains(s.board, config);
      let i: number;
      [i, rng] = nextInt(rng, chains.length);
      atMs += 1000;
      // Time bonuses can outpace a fast player, so cap the game length and end it with tick.
      if (atMs >= s.timeLimitMs || s.moves >= MAX_MOVES) {
        s = tick(s, s.timeLimitMs - s.elapsedMs).state;
        expect(s.gameOver).toBe(true);
        break;
      }
      const { state, events } = applyMove(s, { path: chains[i], atMs });
      const fail = (what: string) => expect.fail(`${what} (seed ${seed}, move ${state.moves})`);
      if (!isFull(state.board)) fail('board not full');
      if (countChains(state.board, config) < config.minValidMoves) fail('too few chains');
      if (state.score - s.score !== eventPoints(events)) fail('score != sum of event points');
      if (disappeared(events) !== appeared(events)) fail('disappeared != appeared');
      s = state;
    }
  }
}

describe('G12: random-game properties', () => {
  it('1000 games with the default rules (moves mode, 30 moves)', () => {
    playRandomGames(1000, makeConfig({ mode: 'moves' }));
  }, TIMEOUT_MS);

  const variants: [string, ConfigOverrides][] = [
    ['adjacency 4', { adjacency: 4 }],
    ['no descending trace', { allowDescendingTrace: false }],
    ['7x7, frenzy 5', { boardSize: 7, frenzyThreshold: 5 }],
    ['minValidMoves 3', { minValidMoves: 3 }],
    ['time mode', { mode: 'time', durationMs: 30_000 }],
  ];
  it.each(variants)('100 games: %s', (_, overrides) => {
    playRandomGames(100, makeConfig({ mode: 'moves', ...overrides }));
  }, TIMEOUT_MS);
});
