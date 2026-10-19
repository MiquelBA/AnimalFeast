// Deterministic hunt resolution around the focus (REGLES.md §4).
import { levelOf, canEat, cellAt, occupiedNeighbours, type Neighbour } from './rules';
import { captureValue, capturePoints, chainMultiplier, energyGained, energyTier } from './score';
import type { Animal, Board, Cell, GameConfig, GameEvent, Pos } from './types';

export interface ResolveResult {
  readonly board: Board;
  readonly events: GameEvent[];
  readonly chain: number;
  readonly points: number;
}

/** First candidate (in N, E, S, W order) that is strictly better than all earlier ones. */
function pickBest(candidates: Neighbour[], better: (a: Neighbour, b: Neighbour) => boolean): Neighbour | null {
  let best: Neighbour | null = null;
  for (const c of candidates) if (!best || better(c, best)) best = c;
  return best;
}

export function resolve(input: Board, focusStart: Pos, config: GameConfig): ResolveResult {
  const board: Cell[][] = input.map((row) => [...row]);
  const events: GameEvent[] = [];
  let focusPos = focusStart;
  let chain = 0;
  let points = 0;

  for (;;) {
    const focus = cellAt(board, focusPos);
    if (!focus) throw new Error('Focus cell is empty');
    const neighbours = occupiedNeighbours(board, focusPos);

    // A. The focus hunts: prey with the highest capture value, ties by direction.
    const prey = pickBest(
      neighbours.filter((n) => canEat(focus, n.animal, config)),
      (a, b) => captureValue(focus, a.animal, config) > captureValue(focus, b.animal, config),
    );
    if (prey) {
      focusPos = capture(focusPos, focus, prey.pos, prey.animal, 'hunt');
      continue;
    }

    // B. The focus is hunted: highest level, then highest energy, then direction.
    const predator = pickBest(
      neighbours.filter((n) => canEat(n.animal, focus, config)),
      (a, b) => {
        const la = levelOf(a.animal, config);
        const lb = levelOf(b.animal, config);
        return la > lb || (la === lb && a.animal.energy > b.animal.energy);
      },
    );
    if (predator) {
      focusPos = capture(predator.pos, predator.animal, focusPos, focus, 'hunted');
      continue;
    }

    // C. Nothing left to resolve.
    return { board, events, chain, points };
  }

  /** Applies one capture to `board`; returns the predator's final position (the new focus). */
  function capture(predPos: Pos, predator: Animal, preyPos: Pos, prey: Animal, kind: 'hunt' | 'hunted'): Pos {
    chain += 1;
    const value = captureValue(predator, prey, config);
    const multiplier = chainMultiplier(chain, config);
    const gained = capturePoints(value, chain, config);
    points += gained;

    const energy = predator.energy + energyGained(prey, config);
    const fed: Animal = { ...predator, energy };
    const moves = config.predatorMovesIntoPrey;
    const predatorTo = moves ? preyPos : predPos;
    const vacated = moves ? predPos : preyPos;
    board[predatorTo.row][predatorTo.col] = fed;
    board[vacated.row][vacated.col] = null;

    events.push(
      {
        type: 'capture', kind, predator, prey, predatorFrom: predPos, preyPos, predatorTo, vacated,
        sameSpecies: predator.species === prey.species, value, multiplier, points: gained, chain,
      },
      {
        type: 'energyGain', animalId: predator.id, pos: predatorTo, from: predator.energy, to: energy,
        tierFrom: energyTier(predator.energy, config), tierTo: energyTier(energy, config),
      },
      { type: 'chainStep', chain, multiplier, turnPoints: points },
    );
    return predatorTo;
  }
}
