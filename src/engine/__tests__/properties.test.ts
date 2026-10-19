// T13: property tests over random games, for every rule variant.
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../config';
import { applyMove, createGame, legalMoves } from '../game';
import { nextRandom } from '../rng';
import { countAnimals, isStable } from '../rules';
import type { EatRule, GameConfig } from '../types';

// Safety cap: with some rule sets random play never fills the board (see summary / simulator).
const MAX_TURNS = 200;

function playRandomGame(seed: number, config: GameConfig, check: (info: { before: number; after: number; captures: number; points: number; stable: boolean }) => void) {
  let state = createGame({ seed, config });
  let pick = seed ^ 0x9e3779b9;
  while (!state.gameOver && state.turn < MAX_TURNS) {
    const moves = legalMoves(state);
    let r: number;
    [r, pick] = nextRandom(pick);
    const before = countAnimals(state.board);
    const { state: next, events } = applyMove(state, moves[Math.floor(r * moves.length)]);
    const caps = events.filter((e) => e.type === 'capture');
    check({
      before,
      after: countAnimals(next.board),
      captures: caps.length,
      points: next.score - state.score - caps.reduce((sum, e) => sum + e.points, 0),
      stable: isStable(next.board, config),
    });
    state = next;
  }
  return state;
}

const variants: { eatRule: EatRule; predatorMovesIntoPrey: boolean; sameSpeciesCaptures: boolean }[] = [];
for (const eatRule of ['oneLevelBelow', 'anyLower'] as const)
  for (const predatorMovesIntoPrey of [true, false])
    for (const sameSpeciesCaptures of [true, false]) variants.push({ eatRule, predatorMovesIntoPrey, sameSpeciesCaptures });

describe('T13: random-game properties', () => {
  it.each(variants)('holds for %o', (variant) => {
    const config = makeConfig(variant);
    const games = variant.eatRule === 'oneLevelBelow' && variant.predatorMovesIntoPrey && variant.sameSpeciesCaptures ? 1000 : 200;
    let maxCaptures = 0;
    for (let seed = 1; seed <= games; seed++) {
      playRandomGame(seed, config, (t) => {
        // Stability invariant after every turn.
        if (!t.stable) expect.fail(`unstable board (seed ${seed})`);
        // Each capture removes exactly one animal (placed animal counts +1).
        if (t.after !== t.before + 1 - t.captures) expect.fail(`animal count mismatch (seed ${seed})`);
        if (t.points !== 0) expect.fail(`score != sum of capture points (seed ${seed})`);
        maxCaptures = Math.max(maxCaptures, t.captures);
      });
    }
    expect(maxCaptures).toBeLessThanOrEqual(36);
  });
});
