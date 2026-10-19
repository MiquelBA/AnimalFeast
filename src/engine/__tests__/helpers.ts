import { makeConfig, type ConfigOverrides } from '../config';
import { applyMove, createGame } from '../game';
import { boardToString, parseBoard } from '../notation';
import type { GameConfig, GameState, MoveResult, Species } from '../types';

const LETTERS: Record<string, Species> = { S: 'SARDINE', T: 'TUNA', R: 'SHARK', O: 'ORCA' };

/** Builds a state from board text, with `letter` as first hand card (rest are sardines). */
export function setup(boardText: string, letter: string, overrides: ConfigOverrides = {}): GameState {
  const config: GameConfig = makeConfig(overrides);
  const board = parseBoard(boardText, config.boardSize);
  return createGame({ seed: 1, config, board, hand: [LETTERS[letter], 'SARDINE', 'SARDINE'] });
}

/** Places the first hand card at (row, col). */
export function place(state: GameState, row: number, col: number): MoveResult {
  return applyMove(state, { handIndex: 0, row, col });
}

/** Board text normalised through the parser, for readable comparisons. */
export function board(text: string, size = 6): string {
  return boardToString(parseBoard(text, size));
}

export function captures(result: MoveResult) {
  return result.events.filter((e) => e.type === 'capture');
}
