// Game lifecycle: creation, applyMove (pure and deterministic), replay and stats.
import { DEFAULT_CONFIG, SPECIES_ORDER } from './config';
import { drawAnimal, seedToState } from './rng';
import { resolve } from './resolve';
import { emptyCells, inBounds } from './rules';
import type { Animal, Board, GameConfig, GameEvent, GameState, GameStats, Move, MoveResult, Species } from './types';

export interface CreateGameOptions {
  readonly seed: number;
  readonly config?: GameConfig;
  /** Starting board (defaults to empty). Animal ids must be unique. */
  readonly board?: Board;
  /** Fixed starting hand (defaults to drawing handSize animals from the RNG). */
  readonly hand?: readonly Species[];
}

export function emptyBoard(size: number): Board {
  return Array.from({ length: size }, () => Array<null>(size).fill(null));
}

export function createGame({ seed, config = DEFAULT_CONFIG, board, hand }: CreateGameOptions): GameState {
  const startBoard = board ?? emptyBoard(config.boardSize);
  if (startBoard.length !== config.boardSize || startBoard.some((row) => row.length !== config.boardSize)) {
    throw new Error(`Board must be ${config.boardSize}x${config.boardSize}`);
  }
  let nextId = 1 + Math.max(0, ...startBoard.flat().map((a) => a?.id ?? 0));
  let rngState = seedToState(seed);
  const cards: Animal[] = [];
  if (hand) {
    if (hand.length !== config.handSize) throw new Error(`Hand must have ${config.handSize} animals`);
    for (const species of hand) cards.push({ id: nextId++, species, energy: config.placedEnergy });
  } else {
    for (let i = 0; i < config.handSize; i++) {
      const draw = drawAnimal(rngState, nextId, 0, config);
      cards.push(draw.animal);
      rngState = draw.rngState;
      nextId = draw.nextId;
    }
  }
  return {
    config, seed, rngState, nextId, board: startBoard, hand: cards, turn: 0, score: 0,
    totalCaptures: 0, longestChain: 0, gameOver: emptyCells(startBoard).length === 0, history: [],
  };
}

export function isLegalMove(state: GameState, move: Move): boolean {
  return (
    !state.gameOver &&
    Number.isInteger(move.handIndex) && move.handIndex >= 0 && move.handIndex < state.hand.length &&
    Number.isInteger(move.row) && Number.isInteger(move.col) &&
    inBounds(move, state.config.boardSize) &&
    state.board[move.row][move.col] === null
  );
}

export function legalMoves(state: GameState): Move[] {
  if (state.gameOver) return [];
  const cells = emptyCells(state.board);
  return state.hand.flatMap((_, handIndex) => cells.map(({ row, col }) => ({ handIndex, row, col })));
}

export function gameStats(state: GameState): GameStats {
  const finalBoard = Object.fromEntries(SPECIES_ORDER.map((s) => [s, 0])) as Record<Species, number>;
  for (const a of state.board.flat()) if (a) finalBoard[a.species] += 1;
  return {
    score: state.score, totalCaptures: state.totalCaptures, longestChain: state.longestChain,
    turns: state.turn, finalBoard,
  };
}

/** Plays one move. Pure: never mutates `state`. Throws on an illegal move. */
export function applyMove(state: GameState, move: Move): MoveResult {
  if (!isLegalMove(state, move)) throw new Error(`Illegal move: ${JSON.stringify(move)}`);
  const { config } = state;
  const pos = { row: move.row, col: move.col };
  const animal = state.hand[move.handIndex];

  // 1–3. Place the chosen animal; it becomes the focus.
  const placed = state.board.map((row) => [...row]);
  placed[pos.row][pos.col] = animal;
  const events: GameEvent[] = [{ type: 'place', animal, pos, handIndex: move.handIndex }];

  // 4–5. Resolve hunting and score.
  const result = resolve(placed, pos, config);
  events.push(...result.events);
  const turn = state.turn + 1;
  events.push({ type: 'turnEnd', turn, chain: result.chain, turnPoints: result.points });

  // 6. Refill the used hand slot.
  const draw = drawAnimal(state.rngState, state.nextId, turn, config);
  const hand = state.hand.map((a, i) => (i === move.handIndex ? draw.animal : a));
  events.push({ type: 'handRefill', handIndex: move.handIndex, animal: draw.animal });

  // 7. Game over when the board is full.
  const next: GameState = {
    ...state,
    rngState: draw.rngState,
    nextId: draw.nextId,
    board: result.board,
    hand,
    turn,
    score: state.score + result.points,
    totalCaptures: state.totalCaptures + result.chain,
    longestChain: Math.max(state.longestChain, result.chain),
    gameOver: emptyCells(result.board).length === 0,
    history: [...state.history, move],
  };
  if (next.gameOver) events.push({ type: 'gameOver', stats: gameStats(next) });
  return { state: next, events };
}

/** Rebuilds a game from its seed and move list. */
export function replay(options: CreateGameOptions, moves: readonly Move[]): GameState {
  return moves.reduce((s, m) => applyMove(s, m).state, createGame(options));
}
