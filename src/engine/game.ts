// Game lifecycle (REGLES.md v0.2 §3, §6–8): creation, applyMove, tick, replay and stats.
// applyMove and tick are pure and deterministic: same state + same input = same result.
import { applyGravity, cloneBoard, cols, neighbourPositions, rows, spawnAnimal, type Spawner } from './board';
import { checkChain, countChains } from './chains';
import { DEFAULT_CONFIG } from './config';
import { nextInt, seedToState } from './rng';
import { chainPoints, comboMultiplier, energyFromPrey, frenzyPoints } from './score';
import type { Animal, Board, Cell, Fall, GameConfig, GameEvent, GameState, GameStats, Move, MoveResult, Pos, Tier } from './types';

export interface CreateGameOptions {
  readonly seed: number;
  readonly config?: GameConfig;
  /** Starting board (tests, debug). Defaults to a generated board with ≥ minInitialMoves chains. */
  readonly board?: Board;
  /** Fixed spawn queue used before the RNG (tests). */
  readonly spawnQueue?: readonly Tier[];
}

/** Fills a rows × cols board from the spawner, retrying until it has at least `minChains` chains. */
function generateBoard(spawner: Spawner, size: { rows: number; cols: number }, minChains: number, config: GameConfig): Cell[][] {
  for (let attempt = 0; attempt < config.maxBoardGenerationAttempts; attempt++) {
    const board: Cell[][] = Array.from({ length: size.rows }, () => Array<Cell>(size.cols).fill(null));
    // Same order as refills: column by column, bottom to top.
    for (let c = 0; c < size.cols; c++) {
      for (let r = size.rows - 1; r >= 0; r--) board[r][c] = spawnAnimal(spawner, config);
    }
    if (countChains(board, config) >= minChains) return board;
  }
  throw new Error(`Could not generate a board with ${minChains} chains`);
}

export function createGame({ seed, config = DEFAULT_CONFIG, board, spawnQueue = [] }: CreateGameOptions): GameState {
  const startIds = board ? board.flat().map((a) => a?.id ?? 0) : [];
  const spawner: Spawner = { rngState: seedToState(seed), spawnQueue: [...spawnQueue], nextId: 1 + Math.max(0, ...startIds) };
  const start = board ?? generateBoard(spawner, { rows: config.boardSize, cols: config.boardSize }, config.minInitialMoves, config);
  return {
    config, seed, rngState: spawner.rngState, spawnQueue: spawner.spawnQueue, nextId: spawner.nextId, board: start,
    score: 0, moves: 0, elapsedMs: 0, timeLimitMs: config.durationMs, lastMoveAtMs: null, combo: 0,
    chains: 0, chains4: 0, frenzies: 0, maxCombo: 0, bestMove: 0, shuffles: 0, gameOver: false, history: [],
  };
}

export function remainingMs(state: GameState): number {
  return Math.max(0, state.timeLimitMs - state.elapsedMs);
}

export function gameStats(state: GameState): GameStats {
  const { score, chains, chains4, frenzies, maxCombo, bestMove, shuffles, moves } = state;
  return { score, chains, chains4, frenzies, maxCombo, bestMove, shuffles, moves };
}

export type MoveError = 'gameOver' | 'missingTime' | 'timeTravel' | 'timeUp' | 'invalidChain';

export function moveError(state: GameState, move: Move): MoveError | null {
  if (state.gameOver) return 'gameOver';
  if (state.config.mode === 'time') {
    if (move.atMs === undefined) return 'missingTime';
    if (state.lastMoveAtMs !== null && move.atMs < state.lastMoveAtMs) return 'timeTravel';
    if (move.atMs >= state.timeLimitMs) return 'timeUp';
  }
  if (!checkChain(state.board, move.path, state.config).valid) return 'invalidChain';
  return null;
}

export function isLegalMove(state: GameState, move: Move): boolean {
  return moveError(state, move) === null;
}

/** Plays one traced chain. Throws on an illegal move (see moveError). */
export function applyMove(state: GameState, move: Move): MoveResult {
  const error = moveError(state, move);
  if (error) throw new Error(`Illegal move (${error}): ${JSON.stringify(move)}`);
  const { config } = state;
  const timed = config.mode === 'time';
  const check = checkChain(state.board, move.path, config);
  if (!check.valid) throw new Error('unreachable');

  const board = cloneBoard(state.board);
  const spawner: Spawner = { rngState: state.rngState, spawnQueue: [...state.spawnQueue], nextId: state.nextId };
  const events: GameEvent[] = [];
  let timeLimitMs = state.timeLimitMs;
  const addTime = (reason: 'chain4' | 'frenzy') => {
    if (!timed) return;
    const ms = config.timeBonusMs[reason];
    timeLimitMs += ms;
    events.push({ type: 'timeBonus', reason, ms, timeLimitMs });
  };

  // Speed combo (time mode only).
  const atMs = move.atMs ?? 0;
  const combo = !timed ? 0
    : state.lastMoveAtMs !== null && atMs - state.lastMoveAtMs < config.comboWindowMs ? state.combo + 1 : 1;
  const comboMult = timed ? comboMultiplier(combo, config) : 1;
  if (combo >= 2) events.push({ type: 'combo', count: combo, multiplier: comboMult });

  // 1–3. Prey disappear, the final predator stays and gains energy; score the chain.
  const path = check.ascending;
  const predatorPos = path[path.length - 1];
  const predator = board[predatorPos.row][predatorPos.col]!;
  const prey = path.slice(0, -1).map((p) => ({ animal: board[p.row][p.col]!, pos: p }));
  const lengthMult = config.lengthMultiplier[path.length] ?? 1;
  const points = chainPoints(prey.map((p) => p.animal), lengthMult, comboMult, config);
  const energy = predator.energy + prey.reduce((e, p) => e + energyFromPrey(p.animal, config), 0);
  const fed: Animal = { ...predator, energy };
  events.push({ type: 'chain', path, predator, points, lengthMultiplier: lengthMult, comboMultiplier: comboMult });
  for (const p of prey) {
    board[p.pos.row][p.pos.col] = null;
    events.push({ type: 'eat', prey: p.animal, from: p.pos, predatorId: predator.id, to: predatorPos, frenzy: false });
  }
  board[predatorPos.row][predatorPos.col] = fed;
  events.push({ type: 'energyGain', animalId: predator.id, pos: predatorPos, from: predator.energy, to: energy });
  if (path.length === 4) addTime('chain4');

  // 4. Gravity and refill.
  events.push(...applyGravity(board, spawner, config));

  // 5. Frenzy: any animal at the threshold eats every lower-tier neighbour and leaves.
  // Only the move's predator can gain energy today, but the loop handles several (row, then column).
  let frenzyTotal = 0;
  let frenzies = 0;
  for (let pos = findFrenzied(board, config); pos; pos = findFrenzied(board, config)) {
    const hunter = board[pos.row][pos.col]!;
    const eaten = neighbourPositions(board, pos, config.frenzyAdjacency)
      .filter((n) => board[n.row][n.col]!.tier < hunter.tier)
      .sort((a, b) => a.row - b.row || a.col - b.col)
      .map((n) => ({ animal: board[n.row][n.col]!, pos: n, points: frenzyPoints(board[n.row][n.col]!, config) }));
    const total = eaten.reduce((s, e) => s + e.points, 0);
    events.push({ type: 'frenzy', predator: hunter, pos, prey: eaten, points: total });
    for (const e of eaten) {
      board[e.pos.row][e.pos.col] = null;
      events.push({ type: 'eat', prey: e.animal, from: e.pos, predatorId: hunter.id, to: pos, frenzy: true });
    }
    board[pos.row][pos.col] = null;
    events.push({ type: 'leave', animal: hunter, pos });
    frenzyTotal += total;
    frenzies++;
    addTime('frenzy');
    events.push(...applyGravity(board, spawner, config));
  }

  // 6. Shuffle if there are too few possible chains.
  const shuffled = ensurePlayable(board, spawner, config);
  events.push(...shuffled.events);

  const movePoints = points + frenzyTotal;
  events.push({ type: 'moveEnd', points: movePoints });
  const moves = state.moves + 1;
  const next: GameState = {
    ...state,
    rngState: spawner.rngState,
    spawnQueue: spawner.spawnQueue,
    nextId: spawner.nextId,
    board: shuffled.board,
    score: state.score + movePoints,
    moves,
    elapsedMs: timed ? Math.max(state.elapsedMs, atMs) : state.elapsedMs,
    timeLimitMs,
    lastMoveAtMs: timed ? atMs : null,
    combo,
    chains: state.chains + 1,
    chains4: state.chains4 + (path.length === 4 ? 1 : 0),
    frenzies: state.frenzies + frenzies,
    maxCombo: Math.max(state.maxCombo, combo),
    bestMove: Math.max(state.bestMove, movePoints),
    shuffles: state.shuffles + (shuffled.events.length ? 1 : 0),
    gameOver: config.mode === 'moves' && moves >= config.maxMoves,
    history: [...state.history, move],
  };
  if (next.gameOver) events.push({ type: 'gameOver', stats: gameStats(next) });
  return { state: next, events };
}

function findFrenzied(board: Board, config: GameConfig): Pos | null {
  for (let r = 0; r < rows(board); r++) {
    for (let c = 0; c < cols(board); c++) if ((board[r][c]?.energy ?? 0) >= config.frenzyThreshold) return { row: r, col: c };
  }
  return null;
}

/**
 * Shuffles (Fisher–Yates, game RNG, energies kept) until the board has ≥ minValidMoves chains.
 * After maxShuffleAttempts failures the board is replaced by a newly generated one.
 */
export function ensurePlayable(input: Board, spawner: Spawner, config: GameConfig): { board: Board; events: GameEvent[] } {
  if (countChains(input, config) >= config.minValidMoves) return { board: input, events: [] };
  const size = { rows: rows(input), cols: cols(input) };
  const origin = new Map<number, Pos>();
  input.forEach((row, r) => row.forEach((a, c) => { if (a) origin.set(a.id, { row: r, col: c }); }));
  let animals = input.flat().filter((a): a is Animal => a !== null);
  for (let attempt = 1; attempt <= config.maxShuffleAttempts; attempt++) {
    animals = [...animals];
    for (let i = animals.length - 1; i > 0; i--) {
      let j: number;
      [j, spawner.rngState] = nextInt(spawner.rngState, i + 1);
      [animals[i], animals[j]] = [animals[j], animals[i]];
    }
    const board = Array.from({ length: size.rows }, (_, r) => animals.slice(r * size.cols, (r + 1) * size.cols));
    if (countChains(board, config) >= config.minValidMoves) {
      const moves: Fall[] = [];
      board.forEach((row, r) => row.forEach((a, c) => {
        const from = origin.get(a.id)!;
        if (from.row !== r || from.col !== c) moves.push({ id: a.id, from, to: { row: r, col: c } });
      }));
      return { board, events: [{ type: 'shuffle', moves, attempts: attempt }] };
    }
  }
  const board = generateBoard(spawner, size, Math.max(config.minValidMoves, config.minInitialMoves), config);
  return { board, events: [{ type: 'regenerate', removed: animals, board }] };
}

/** Advances the game clock (time mode). Ends the game when time runs out. */
export function tick(state: GameState, ms: number): MoveResult {
  if (state.gameOver || state.config.mode !== 'time') return { state, events: [] };
  const elapsedMs = state.elapsedMs + ms;
  if (elapsedMs < state.timeLimitMs) return { state: { ...state, elapsedMs }, events: [] };
  const next = { ...state, elapsedMs: state.timeLimitMs, gameOver: true };
  return { state: next, events: [{ type: 'gameOver', stats: gameStats(next) }] };
}

/** Rebuilds a game from its seed and move list (each move carries its atMs in time mode). */
export function replay(options: CreateGameOptions, moves: readonly Move[]): GameState {
  return moves.reduce((s, m) => applyMove(s, m).state, createGame(options));
}
