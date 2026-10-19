import { describe, expect, it } from 'vitest';
import { legalChains } from '../../engine/chains';
import { DEFAULT_CONFIG, makeConfig } from '../../engine/config';
import { applyMove, createGame } from '../../engine/game';
import { boardToString, parseBoard } from '../../engine/notation';
import type { GameState } from '../../engine/types';
import { makeLog, replayLog } from '../debugLog';

function playSome(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n && !s.gameOver; i++) {
    const chain = legalChains(s.board, s.config)[0];
    if (!chain) break;
    s = applyMove(s, { path: chain, atMs: s.elapsedMs + 1500 }).state;
  }
  return s;
}

describe('move log', () => {
  it('replays a seeded game to the same state, through JSON', () => {
    const end = playSome(createGame({ seed: 42, config: DEFAULT_CONFIG }), 15);
    const log = JSON.parse(JSON.stringify(makeLog(end, 'base')));
    const again = replayLog(log);
    expect(again.score).toBe(end.score);
    expect(boardToString(again.board)).toBe(boardToString(end.board));
  });

  it('replays a game that started from a typed board', () => {
    const config = makeConfig({ mode: 'moves', minValidMoves: 0 });
    const text = 'S T R O / T S T R / R T S T / O R T S';
    const end = playSome(createGame({ seed: 7, config, board: parseBoard(text) }), 5);
    const again = replayLog(JSON.parse(JSON.stringify(makeLog(end, 'base', text))));
    expect(again.score).toBe(end.score);
    expect(boardToString(again.board)).toBe(boardToString(end.board));
  });
});
