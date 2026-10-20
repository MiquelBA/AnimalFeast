// The game: deal, play a hand, blasts, gravity, reshuffle, clock (REGLES.md). Pure and deterministic:
// the same seed and moves always give the same states and events.
import { allPositions, applyGravity, areNeighbours, cellAt, emptyCells, isConnectedPath, mutableCopy, neighbours, samePos } from './board';
import { DEFAULT_CONFIG } from './config';
import { canComplete, evaluateHand, handRank, handStrength, handSuit } from './hands';
import { nextInt, nextRandom, seedToState } from './rng';
import {
  HAND_TYPES,
  type Board,
  type Card,
  type CardSpec,
  type Cell,
  type Fall,
  type GameConfig,
  type GameEvent,
  type GameState,
  type GameStats,
  type HandCounts,
  type HandType,
  type Move,
  type MoveResult,
  type Pos,
  type Suit,
} from './types';

export interface NewGameOptions {
  readonly seed?: number;
  readonly config?: GameConfig;
  /** Fixed deal order (tests). The starting board is dealt from it too. */
  readonly queue?: readonly CardSpec[];
  /** A ready board (tests); ids are kept. */
  readonly board?: Board;
}

const EMPTY_COUNTS: HandCounts = Object.fromEntries(HAND_TYPES.map((h) => [h, 0])) as Record<HandType, number>;

// ---------------------------------------------------------------- dealing

interface Dealer {
  rng: number;
  shoe: CardSpec[];
  queue: CardSpec[];
  nextId: number;
}

/** A fresh shoe: `decks` × 52 cards plus the jokers, shuffled (Fisher–Yates). */
function freshShoe(config: GameConfig, rng: number): [CardSpec[], number] {
  const shoe: CardSpec[] = [];
  for (let d = 0; d < config.decks; d++) {
    for (let suit = 0; suit < 4; suit++) for (let rank = 2; rank <= 14; rank++) shoe.push({ rank, suit: suit as Suit });
  }
  for (let j = 0; j < config.jokersPerShoe; j++) shoe.push({ rank: 0, suit: 0, joker: true });
  let state = rng;
  for (let i = shoe.length - 1; i > 0; i--) {
    let k: number;
    [k, state] = nextInt(state, i + 1);
    [shoe[i], shoe[k]] = [shoe[k], shoe[i]];
  }
  return [shoe, state];
}

function deal(d: Dealer, config: GameConfig): Card {
  let spec: CardSpec;
  if (d.queue.length) spec = d.queue.shift()!;
  else {
    if (!d.shoe.length) [d.shoe, d.rng] = freshShoe(config, d.rng);
    spec = d.shoe.shift()!;
    if (!spec.joker && config.goldenChance > 0) {
      let r: number;
      [r, d.rng] = nextRandom(d.rng);
      if (r < config.goldenChance) spec = { ...spec, golden: true };
    }
  }
  return { ...spec, id: d.nextId++ };
}

function dealerOf(state: GameState): Dealer {
  return { rng: state.rngState, shoe: [...state.shoe], queue: [...state.queue], nextId: state.nextId };
}

// ---------------------------------------------------------------- new game

export function newGame(options: NewGameOptions = {}): GameState {
  const config = options.config ?? DEFAULT_CONFIG;
  const seed = options.seed ?? 1;
  const d: Dealer = { rng: seedToState(seed), shoe: [], queue: [...(options.queue ?? [])], nextId: 1 };
  let board: Cell[][];
  if (options.board) {
    board = mutableCopy(options.board);
    d.nextId = Math.max(0, ...board.flat().map((c) => c?.id ?? 0)) + 1;
  } else {
    board = Array.from({ length: config.rows }, () => Array<Cell>(config.cols).fill(null));
    for (const p of emptyCells(board)) board[p.row][p.col] = deal(d, config);
  }
  let state: GameState = {
    config,
    seed,
    rngState: d.rng,
    shoe: d.shoe,
    queue: d.queue,
    nextId: d.nextId,
    board,
    score: 0,
    moves: 0,
    elapsedMs: 0,
    timeLimitMs: config.durationMs,
    timeBonusMs: 0,
    lastMoveAtMs: null,
    combo: 0,
    maxCombo: 0,
    bestMove: 0,
    bestHand: null,
    handCounts: EMPTY_COUNTS,
    shuffles: 0,
    gameOver: false,
    history: [],
  };
  if (!options.board) state = ensurePlayable(state, []).state;
  return state;
}

// ---------------------------------------------------------------- paths and hands

/** The cards of a path, or null if it isn't a connected path of cards. */
export function pathCards(board: Board, path: readonly Pos[]): Card[] | null {
  if (!isConnectedPath(board, path)) return null;
  return path.map((p) => cellAt(board, p)!);
}

/** The hand a traced path makes, or null. */
export function handOf(board: Board, path: readonly Pos[], config: GameConfig): HandType | null {
  if (path.length < config.minLength || path.length > config.maxLength) return null;
  const cards = pathCards(board, path);
  return cards ? evaluateHand(cards) : null;
}

export type TraceStatus = 'valid' | 'partial' | 'invalid';

/** While tracing: a hand already, on its way to one, or a dead end. */
export function traceStatus(board: Board, path: readonly Pos[], config: GameConfig): TraceStatus {
  const cards = pathCards(board, path);
  if (!cards || !cards.length) return 'invalid';
  if (path.length >= config.minLength && evaluateHand(cards)) return 'valid';
  return canComplete(cards, config.maxLength) ? 'partial' : 'invalid';
}

export interface FoundHand {
  readonly path: readonly Pos[];
  readonly hand: HandType;
}

/**
 * Hands that can be traced now, one per set of cells, found by a depth-first walk that drops any
 * path that can no longer become a hand. Stops at `limit`.
 */
export function findHands(board: Board, config: GameConfig, limit = Infinity): FoundHand[] {
  const found: FoundHand[] = [];
  const seen = new Set<string>();
  const cols = board[0]?.length ?? 0;
  const key = (path: readonly Pos[]) => path.map((p) => p.row * cols + p.col).sort((a, b) => a - b).join(',');
  const walk = (path: Pos[], cards: Card[]): boolean => {
    if (path.length >= config.minLength) {
      const hand = evaluateHand(cards);
      if (hand) {
        const k = key(path);
        if (!seen.has(k)) {
          seen.add(k);
          found.push({ path: [...path], hand });
          if (found.length >= limit) return true;
        }
      }
    }
    if (path.length >= config.maxLength) return false;
    for (const q of neighbours(board, path[path.length - 1])) {
      const card = cellAt(board, q);
      if (!card || path.some((p) => samePos(p, q))) continue;
      cards.push(card);
      path.push(q);
      const stop = canComplete(cards, config.maxLength) && walk(path, cards);
      path.pop();
      cards.pop();
      if (stop) return true;
    }
    return false;
  };
  for (const p of allPositions(board)) {
    const card = cellAt(board, p);
    if (card && walk([p], [card])) break;
  }
  return found;
}

export function countHands(board: Board, config: GameConfig, limit = Infinity): number {
  return findHands(board, config, limit).length;
}

// ---------------------------------------------------------------- scoring

export function handPoints(hand: HandType, cards: readonly CardSpec[], config: GameConfig): number {
  const pips = cards.reduce((sum, c) => sum + (c.joker ? 0 : c.rank), 0);
  return config.hands[hand].points + pips * config.pointsPerPip;
}

function comboMultiplier(config: GameConfig, combo: number): number {
  const m = config.comboMultipliers;
  return m[Math.min(combo, m.length) - 1] ?? 1;
}

/** Cells a hand's blast sweeps away (besides the hand's own cards). */
export function blastCells(board: Board, kind: string | undefined, path: readonly Pos[], cards: readonly Card[]): Pos[] {
  if (!kind) return [];
  const inPath = (p: Pos) => path.some((q) => samePos(p, q));
  const origin = path[path.length - 1];
  const all = allPositions(board).filter((p) => cellAt(board, p) && !inPath(p));
  switch (kind) {
    case 'cross':
      return all.filter((p) => p.row === origin.row || p.col === origin.col);
    case 'suit': {
      const suit = handSuit(cards);
      return all.filter((p) => {
        const c = cellAt(board, p)!;
        return !c.joker && c.suit === suit && path.some((q) => areNeighbours(p, q));
      });
    }
    case 'rank': {
      const rank = handRank(cards);
      return all.filter((p) => {
        const c = cellAt(board, p)!;
        return !c.joker && c.rank === rank;
      });
    }
    case 'board':
      return all;
    default:
      return [];
  }
}

// ---------------------------------------------------------------- playing

export function isValidMove(state: GameState, move: Move): boolean {
  if (state.gameOver) return false;
  if (state.config.mode === 'time' && (move.atMs ?? state.elapsedMs) >= state.timeLimitMs) return false;
  return handOf(state.board, move.path, state.config) !== null;
}

/** Plays a traced hand. An invalid move returns the same state and no events. */
export function applyMove(state: GameState, move: Move): MoveResult {
  if (!isValidMove(state, move)) return { state, events: [] };
  const config = state.config;
  const events: GameEvent[] = [];
  const at = Math.max(state.elapsedMs, move.atMs ?? state.elapsedMs);
  const cards = pathCards(state.board, move.path)!;
  const hand = evaluateHand(cards)!;
  const def = config.hands[hand];

  // Speed combo (time mode): a hand soon after the last one.
  let combo = 1;
  if (config.mode === 'time' && state.lastMoveAtMs !== null && at - state.lastMoveAtMs <= config.comboWindowMs) combo = state.combo + 1;
  const comboMult = config.mode === 'time' ? comboMultiplier(config, combo) : 1;
  if (combo > 1) events.push({ type: 'combo', count: combo, multiplier: comboMult });

  const goldenMult = config.goldenMultiplier ** cards.filter((c) => c.golden).length;
  const points = Math.round(handPoints(hand, cards, config) * comboMult * goldenMult);
  events.push({ type: 'hand', hand, path: move.path, cards, points, comboMultiplier: comboMult, goldenMultiplier: goldenMult });

  const board = mutableCopy(state.board);
  const swept = blastCells(state.board, def.blast, move.path, cards);
  let blastPoints = 0;
  if (def.blast) {
    blastPoints = Math.round(swept.length * config.blastPointsPerCard * comboMult);
    events.push({
      type: 'blast',
      kind: def.blast,
      origin: move.path[move.path.length - 1],
      cells: swept.map((p) => ({ card: cellAt(state.board, p)!, pos: p })),
      points: blastPoints,
    });
  }
  for (const p of [...move.path, ...swept]) board[p.row][p.col] = null;

  const d = dealerOf(state);
  events.push({ type: 'fall', falls: applyGravity(board) });
  for (const p of emptyCells(board)) {
    const card = deal(d, config);
    board[p.row][p.col] = card;
    events.push({ type: 'spawn', card, pos: p });
  }

  // Time bonus, capped per game.
  let { timeLimitMs, timeBonusMs } = state;
  if (config.mode === 'time' && def.timeBonusMs > 0 && timeBonusMs < config.maxTimeBonusMs) {
    const ms = Math.min(def.timeBonusMs, config.maxTimeBonusMs - timeBonusMs);
    timeBonusMs += ms;
    timeLimitMs += ms;
    events.push({ type: 'timeBonus', ms, timeLimitMs });
  }

  const total = points + blastPoints;
  const handCounts = { ...state.handCounts, [hand]: state.handCounts[hand] + 1 };
  const bestHand = state.bestHand && handStrength(state.bestHand) >= handStrength(hand) ? state.bestHand : hand;
  let next: GameState = {
    ...state,
    rngState: d.rng,
    shoe: d.shoe,
    queue: d.queue,
    nextId: d.nextId,
    board,
    score: state.score + total,
    moves: state.moves + 1,
    elapsedMs: at,
    timeLimitMs,
    timeBonusMs,
    lastMoveAtMs: at,
    combo,
    maxCombo: Math.max(state.maxCombo, combo),
    bestMove: Math.max(state.bestMove, total),
    bestHand,
    handCounts,
    history: [...state.history, move],
  };
  const played = ensurePlayable(next, events);
  next = played.state;
  events.push({ type: 'moveEnd', points: total });
  if (config.mode === 'moves' && next.moves >= config.maxMoves) {
    next = { ...next, gameOver: true };
    events.push({ type: 'gameOver', stats: statsOf(next) });
  }
  return { state: next, events };
}

/** Shuffles the board while it has fewer than minValidMoves hands; deals a new one if that fails. */
function ensurePlayable(state: GameState, events: GameEvent[]): { state: GameState } {
  const config = state.config;
  if (config.minValidMoves <= 0 || countHands(state.board, config, config.minValidMoves) >= config.minValidMoves) return { state };
  let rng = state.rngState;
  const start = state.board;
  const positions = allPositions(start).filter((p) => cellAt(start, p));
  for (let attempt = 0; attempt < config.maxShuffleAttempts; attempt++) {
    const cards = positions.map((p) => cellAt(start, p)!);
    for (let i = cards.length - 1; i > 0; i--) {
      let k: number;
      [k, rng] = nextInt(rng, i + 1);
      [cards[i], cards[k]] = [cards[k], cards[i]];
    }
    const board = mutableCopy(start);
    positions.forEach((p, i) => (board[p.row][p.col] = cards[i]));
    if (countHands(board, config, config.minValidMoves) >= config.minValidMoves) {
      const moves: Fall[] = positions.map((p, i) => {
        const from = positions.find((q) => cellAt(start, q)!.id === cards[i].id)!;
        return { id: cards[i].id, from, to: p };
      });
      events.push({ type: 'shuffle', moves });
      return { state: { ...state, board, rngState: rng, shuffles: state.shuffles + 1 } };
    }
  }
  // Deal a whole new board from the shoe.
  const d: Dealer = { ...dealerOf(state), rng };
  for (;;) {
    const board = mutableCopy(start).map((row) => row.map(() => null as Cell));
    for (const p of emptyCells(board)) board[p.row][p.col] = deal(d, config);
    if (countHands(board, config, config.minValidMoves) >= config.minValidMoves) {
      events.push({ type: 'regenerate', board });
      return { state: { ...state, board, rngState: d.rng, shoe: d.shoe, queue: d.queue, nextId: d.nextId, shuffles: state.shuffles + 1 } };
    }
  }
}

/** Advances the game clock (time mode). The game ends when time runs out. */
export function tick(state: GameState, ms: number): MoveResult {
  if (state.gameOver || state.config.mode !== 'time') return { state, events: [] };
  const elapsedMs = Math.min(state.timeLimitMs, state.elapsedMs + ms);
  if (elapsedMs < state.timeLimitMs) return { state: { ...state, elapsedMs }, events: [] };
  const next = { ...state, elapsedMs, gameOver: true };
  return { state: next, events: [{ type: 'gameOver', stats: statsOf(next) }] };
}

export function statsOf(state: GameState): GameStats {
  return {
    score: state.score,
    moves: state.moves,
    maxCombo: state.maxCombo,
    bestMove: state.bestMove,
    bestHand: state.bestHand,
    handCounts: state.handCounts,
  };
}

/** Replays a game from its seed and moves. */
export function replay(options: NewGameOptions, moves: readonly Move[]): GameState {
  let state = newGame(options);
  for (const m of moves) {
    if (m.atMs !== undefined && m.atMs > state.elapsedMs) state = tick(state, m.atMs - state.elapsedMs).state;
    state = applyMove(state, m).state;
  }
  return state;
}
