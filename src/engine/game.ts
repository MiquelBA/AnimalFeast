// Game lifecycle (REGLES.md v0.2 §3, §6–8): creation, applyMove, tick, replay and stats.
// applyMove and tick are pure and deterministic: same state + same input = same result.
import { applyGravity, cloneBoard, cols, neighbourPositions, rows, spawnAnimal, type Spawner } from './board';
import { checkChain, countChains } from './chains';
import { findLines, hasLines } from './lines';
import { DEFAULT_CONFIG } from './config';
import { nextInt, seedToState } from './rng';
import { chainPoints, comboMultiplier, energyFromPrey, frenzyPoints, goldenMultiplier } from './score';
import type {
  Animal, Board, Cell, Fall, GameConfig, GameEvent, GameState, GameStats, Move, MoveResult, Pos, SpawnSpec, TimeBonusReason,
} from './types';

export interface CreateGameOptions {
  readonly seed: number;
  readonly config?: GameConfig;
  /** Starting board (tests, debug). Defaults to a generated board with ≥ minInitialMoves chains. */
  readonly board?: Board;
  /** Fixed spawn queue used before the RNG (tests). */
  readonly spawnQueue?: readonly SpawnSpec[];
}

/** Fills a rows × cols board from the spawner, retrying until it has at least `minChains` chains. */
function generateBoard(spawner: Spawner, size: { rows: number; cols: number }, minChains: number, config: GameConfig): Cell[][] {
  for (let attempt = 0; attempt < config.maxBoardGenerationAttempts; attempt++) {
    const board: Cell[][] = Array.from({ length: size.rows }, () => Array<Cell>(size.cols).fill(null));
    // Same order as refills: column by column, bottom to top.
    for (let c = 0; c < size.cols; c++) {
      for (let r = size.rows - 1; r >= 0; r--) board[r][c] = spawnAnimal(spawner, config);
    }
    // With spontaneous chains a board starts calm: re-roll the predator of any line until none is left.
    for (let i = 0; i < config.maxBoardGenerationAttempts && hasLines(board, config); i++) {
      for (const line of findLines(board, config)) {
        const top = line[line.length - 1];
        board[top.row][top.col] = spawnAnimal(spawner, config);
      }
    }
    if (countChains(board, config) >= minChains && !hasLines(board, config)) return board;
  }
  throw new Error(`Could not generate a board with ${minChains} chains`);
}

export function createGame({ seed, config = DEFAULT_CONFIG, board, spawnQueue = [] }: CreateGameOptions): GameState {
  const startIds = board ? board.flat().map((a) => a?.id ?? 0) : [];
  const spawner: Spawner = { rngState: seedToState(seed), spawnQueue: [...spawnQueue], nextId: 1 + Math.max(0, ...startIds) };
  const start = board ?? generateBoard(spawner, { rows: config.boardSize, cols: config.boardSize }, config.minInitialMoves, config);
  return {
    config, seed, rngState: spawner.rngState, spawnQueue: spawner.spawnQueue, nextId: spawner.nextId, board: start,
    score: 0, moves: 0, elapsedMs: 0, timeLimitMs: config.durationMs, timeBonusMs: 0, lastMoveAtMs: null, combo: 0,
    chains: 0, chains4: 0, frenzies: 0, maxCombo: 0, bestMove: 0, shuffles: 0, goldenChains: 0, wildChains: 0,
    spontaneousChains: 0, maxWaves: 0,
    gameOver: false, history: [],
  };
}

export function remainingMs(state: GameState): number {
  return Math.max(0, state.timeLimitMs - state.elapsedMs);
}

export function gameStats(state: GameState): GameStats {
  const { score, chains, chains4, frenzies, maxCombo, bestMove, shuffles, goldenChains, wildChains, spontaneousChains, maxWaves, moves } = state;
  return { score, chains, chains4, frenzies, maxCombo, bestMove, shuffles, goldenChains, wildChains, spontaneousChains, maxWaves, moves };
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
  return play(state, move, true);
}

export interface MovePreview {
  readonly points: number;
  readonly frenzies: number;
  readonly energyGained: number;
  readonly predatorTier: number;
}

/**
 * What a move would score right now (chain + frenzies), skipping the shuffle check. For bots.
 * Note: frenzy points can depend on refills, which come from the game's RNG.
 */
export function previewMove(state: GameState, move: Move): MovePreview {
  const { events } = play(state, move, false);
  let points = 0;
  let frenzies = 0;
  let energyGained = 0;
  let predatorTier = 0;
  for (const e of events) {
    if (e.type === 'chain') { points += e.points; predatorTier = e.predator.tier; }
    else if (e.type === 'frenzy') { points += e.points; frenzies++; }
    else if (e.type === 'energyGain') energyGained += e.to - e.from;
  }
  return { points, frenzies, energyGained, predatorTier };
}

function play(state: GameState, move: Move, checkPlayable: boolean): MoveResult {
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
  let timeBonusMs = state.timeBonusMs;
  const addTime = (reason: TimeBonusReason) => {
    const ms = Math.min(config.timeBonusMs[reason], config.maxTimeBonusMs - timeBonusMs);
    if (!timed || ms <= 0) return;
    timeLimitMs += ms;
    timeBonusMs += ms;
    events.push({ type: 'timeBonus', reason, ms, timeLimitMs });
  };

  // Speed combo (time mode only).
  const atMs = move.atMs ?? 0;
  const combo = !timed ? 0
    : state.lastMoveAtMs !== null && atMs - state.lastMoveAtMs < config.comboWindowMs ? state.combo + 1 : 1;
  const comboMult = timed ? comboMultiplier(combo, config) : 1;
  if (combo >= 2) events.push({ type: 'combo', count: combo, multiplier: comboMult });

  // 1–3. Prey disappear and the chain is scored.
  const path = check.ascending;
  const forcedFrenzy = new Set<number>();
  const traced = eatChain(board, path, check.tiers, { combo: comboMult, wave: 0 }, config, events, forcedFrenzy);
  const points = traced.points;

  // 4. Gravity and refill. lastRefill marks where the latest refill's events start (see step 6).
  let lastRefill = events.length;
  events.push(...applyGravity(board, spawner, config));

  // 5. Frenzies, then (when enabled) waves of spontaneous chains, until the board is calm.
  let frenzyTotal = 0;
  let frenzies = 0;
  let wavePoints = 0;
  let spontaneous = 0;
  let wave = 0;
  for (;;) {
    // A predator at the threshold (or a top-tier one after a full chain) eats every lower-tier
    // neighbour and leaves. Several are resolved in row, then column, order.
    for (let pos = findFrenzied(board, forcedFrenzy, config); pos; pos = findFrenzied(board, forcedFrenzy, config)) {
      const hunter = board[pos.row][pos.col]!;
      forcedFrenzy.delete(hunter.id);
      const eaten = neighbourPositions(board, pos, config.frenzyAdjacency)
        // Wildcards are not prey for a frenzy (they have no tier of their own).
        .filter((n) => !board[n.row][n.col]!.wild && board[n.row][n.col]!.tier < hunter.tier)
        .sort((a, b) => a.row - b.row || a.col - b.col)
        .map((n) => ({ animal: board[n.row][n.col]!, pos: n, points: frenzyPoints(board[n.row][n.col]!, config) }));
      const total = eaten.reduce((s, e) => s + e.points, 0);
      events.push({ type: 'frenzy', predator: hunter, pos, prey: eaten, points: total });
      for (const e of eaten) {
        board[e.pos.row][e.pos.col] = null;
        events.push({ type: 'eat', prey: e.animal, from: e.pos, predatorId: hunter.id, to: pos, frenzy: true });
      }
      board[pos.row][pos.col] = null;
      events.push({ type: 'leave', animal: hunter, pos, reason: 'frenzy' });
      frenzyTotal += total;
      frenzies++;
      addTime('frenzy');
      lastRefill = events.length;
      events.push(...applyGravity(board, spawner, config));
    }
    if (!config.spontaneousLines || wave >= config.maxWaves) break;
    const lines = findLines(board, config);
    if (!lines.length) break;
    wave++;
    for (const line of lines) {
      const tiers = line.map((p) => board[p.row][p.col]!.tier);
      wavePoints += eatChain(board, line, tiers, { combo: 1, wave }, config, events, forcedFrenzy).points;
      spontaneous++;
    }
    lastRefill = events.length;
    events.push(...applyGravity(board, spawner, config));
  }

  // 6. Too few possible chains: first re-roll the animals that just entered (nobody has seen them
  // settle yet), then shuffle if that isn't enough.
  if (checkPlayable) rerollRefill(board, events, lastRefill, spawner, config);
  const shuffled = checkPlayable ? ensurePlayable(board, spawner, config) : { board, events: [] };
  events.push(...shuffled.events);

  const movePoints = points + frenzyTotal + wavePoints;
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
    timeBonusMs,
    lastMoveAtMs: timed ? atMs : null,
    combo,
    chains: state.chains + 1,
    chains4: state.chains4 + (path.length === 4 ? 1 : 0),
    spontaneousChains: state.spontaneousChains + spontaneous,
    maxWaves: Math.max(state.maxWaves, wave),
    frenzies: state.frenzies + frenzies,
    maxCombo: Math.max(state.maxCombo, combo),
    bestMove: Math.max(state.bestMove, movePoints),
    shuffles: state.shuffles + (shuffled.events.length ? 1 : 0),
    goldenChains: state.goldenChains + (traced.goldenMultiplier > 1 ? 1 : 0),
    wildChains: state.wildChains + (traced.wild ? 1 : 0),
    gameOver: config.mode === 'moves' && moves >= config.maxMoves,
    history: [...state.history, move],
  };
  if (next.gameOver) events.push({ type: 'gameOver', stats: gameStats(next) });
  return { state: next, events };
}

/**
 * A chain is eaten (REGLES.md §3–4): prey disappear and are scored; a top-tier predator leaves (or,
 * after a full chain with fullChainFrenzy, is marked to frenzy); any other one stays and gains energy.
 */
function eatChain(
  board: Cell[][], path: readonly Pos[], tiers: readonly number[], m: { combo: number; wave: number },
  config: GameConfig, events: GameEvent[], forcedFrenzy: Set<number>,
): { points: number; goldenMultiplier: number; wild: boolean } {
  const predatorPos = path[path.length - 1];
  const predator = board[predatorPos.row][predatorPos.col]!;
  const prey = path.slice(0, -1).map((p, i) => ({ animal: board[p.row][p.col]!, pos: p, tier: tiers[i] }));
  const lengthMult = config.lengthMultiplier[path.length] ?? 1;
  const chainAnimals = [...prey.map((p) => p.animal), predator];
  const goldenMult = goldenMultiplier(chainAnimals, config);
  const waveMult = m.wave ? config.waveMultipliers[Math.min(m.wave, config.waveMultipliers.length) - 1] : 1;
  const points = chainPoints(prey, { length: lengthMult, combo: m.combo * waveMult, golden: goldenMult }, config);
  events.push({
    type: 'chain', path, predator, points, lengthMultiplier: lengthMult, comboMultiplier: m.combo,
    goldenMultiplier: goldenMult, wave: m.wave, waveMultiplier: waveMult,
  });
  for (const p of prey) {
    board[p.pos.row][p.pos.col] = null;
    events.push({ type: 'eat', prey: p.animal, from: p.pos, predatorId: predator.id, to: predatorPos, frenzy: false });
  }
  const topTier = config.maxTierLeaves && predator.tier === config.tiers.length;
  if (topTier && config.fullChainFrenzy && path.length === config.tiers.length) {
    forcedFrenzy.add(predator.id);
  } else if (topTier) {
    board[predatorPos.row][predatorPos.col] = null;
    events.push({ type: 'leave', animal: predator, pos: predatorPos, reason: 'sated' });
  } else {
    const energy = predator.energy + prey.reduce((e, p) => e + energyFromPrey(p.animal, config, p.tier), 0);
    board[predatorPos.row][predatorPos.col] = { ...predator, energy };
    events.push({ type: 'energyGain', animalId: predator.id, pos: predatorPos, from: predator.energy, to: energy });
  }
  return { points, goldenMultiplier: goldenMult, wild: chainAnimals.some((a) => a.wild) };
}

function findFrenzied(board: Board, forced: ReadonlySet<number>, config: GameConfig): Pos | null {
  for (let r = 0; r < rows(board); r++) {
    for (let c = 0; c < cols(board); c++) {
      const a = board[r][c];
      if (a && (a.energy >= config.frenzyThreshold || forced.has(a.id))) return { row: r, col: c };
    }
  }
  return null;
}

/**
 * Shuffles (Fisher–Yates, game RNG, energies kept) until the board has ≥ minValidMoves chains.
 * After maxShuffleAttempts failures the board is replaced by a newly generated one.
 */
export function ensurePlayable(input: Board, spawner: Spawner, config: GameConfig): { board: Board; events: GameEvent[] } {
  if (!needsHelp(input, config)) return { board: input, events: [] };
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
    breakLines(board, spawner, config);
    animals = board.flat();
    if (countChains(board, config) >= config.minValidMoves && !hasLines(board, config)) {
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

function needsHelp(board: Board, config: GameConfig): boolean {
  return countChains(board, config) < config.minValidMoves || hasLines(board, config);
}

/** Up to refillRerolls tries: the animals of the latest refill get new random species (same ids and cells). */
function rerollRefill(board: Cell[][], events: GameEvent[], from: number, spawner: Spawner, config: GameConfig): void {
  for (let attempt = 0; attempt < config.refillRerolls && needsHelp(board, config); attempt++) {
    for (let i = from; i < events.length; i++) {
      const e = events[i];
      if (e.type !== 'spawn') continue;
      const animal = { ...spawnAnimal(spawner, config), id: e.animal.id };
      board[e.pos.row][e.pos.col] = animal;
      events[i] = { ...e, animal };
    }
  }
}

/** With spontaneous chains, a shuffled board must be calm: swap each line's predator with a random cell. */
function breakLines(board: Animal[][], spawner: Spawner, config: GameConfig): void {
  for (let i = 0; i < config.maxShuffleAttempts && hasLines(board, config); i++) {
    for (const line of findLines(board, config)) {
      const top = line[line.length - 1];
      let r: number;
      let c: number;
      [r, spawner.rngState] = nextInt(spawner.rngState, rows(board));
      [c, spawner.rngState] = nextInt(spawner.rngState, cols(board));
      [board[top.row][top.col], board[r][c]] = [board[r][c], board[top.row][top.col]];
    }
  }
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
