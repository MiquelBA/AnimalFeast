import { makeConfig, type ConfigOverrides } from '../config';
import { applyMove, createGame } from '../game';
import { boardToString, parseBoard, parseTiers } from '../notation';
import type { GameEvent, GameState, MoveResult, Pos } from '../types';

/** Builds a state from board text. Defaults to moves mode so tests need no clock. */
export function setup(boardText: string, opts: { queue?: string; config?: ConfigOverrides } = {}): GameState {
  const config = makeConfig({ mode: 'moves', maxMoves: 1000, ...opts.config });
  return createGame({ seed: 1, config, board: parseBoard(boardText), spawnQueue: parseTiers(opts.queue ?? '') });
}

/** "(2,0) (2,1) (2,2)" or [[2,0],[2,1]] → Pos[] */
export function path(...cells: [number, number][]): Pos[] {
  return cells.map(([row, col]) => ({ row, col }));
}

export function trace(state: GameState, cells: [number, number][], atMs?: number): MoveResult {
  return applyMove(state, { path: path(...cells), atMs });
}

export function board(text: string): string {
  return boardToString(parseBoard(text));
}

export function ofType<T extends GameEvent['type']>(events: readonly GameEvent[], type: T) {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}
