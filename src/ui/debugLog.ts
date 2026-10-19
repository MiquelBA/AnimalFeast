// Move log for playtesting: everything needed to replay a game exactly.
import { replay } from '../engine/game';
import { parseBoard } from '../engine/notation';
import type { GameConfig, GameState, Move } from '../engine/types';

export interface MoveLog {
  readonly game: 'animal-feast';
  readonly seed: number;
  readonly variant: string;
  readonly config: GameConfig;
  /** Starting board in notation (the seed alone rebuilds it when absent). */
  readonly startBoard?: string;
  readonly score: number;
  readonly moves: readonly Move[];
}

export function makeLog(state: GameState, variant: string, startBoard?: string): MoveLog {
  return {
    game: 'animal-feast', seed: state.seed, variant, config: state.config,
    ...(startBoard ? { startBoard } : {}), score: state.score, moves: state.history,
  };
}

/** Rebuilds the game a log describes. */
export function replayLog(log: MoveLog): GameState {
  const board = log.startBoard ? parseBoard(log.startBoard, 1, log.config.tiers.length) : undefined;
  return replay({ seed: log.seed, config: log.config, board }, log.moves);
}
