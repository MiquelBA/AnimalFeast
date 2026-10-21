// Core engine types (REGLES.md). Pure data: everything here is JSON-serializable.

/** 0 spades, 1 hearts, 2 diamonds, 3 clubs. */
export type Suit = 0 | 1 | 2 | 3;

/** 2..14 (11 J, 12 Q, 13 K, 14 A). */
export type Rank = number;

export interface Pos {
  readonly row: number;
  readonly col: number;
}

/** What a card is, before it gets an id on the board (shoe entries, test queues). */
export interface CardSpec {
  readonly rank: Rank;
  readonly suit: Suit;
  /** Joker: stands in for whatever card the hand needs. Its rank and suit are ignored. */
  readonly joker?: boolean;
  /** Golden card: the hand it is in scores × goldenMultiplier. */
  readonly golden?: boolean;
}

export interface Card extends CardSpec {
  readonly id: number;
}

export type Cell = Card | null;

/** Row-major grid: board[row][col]. (0,0) is top-left. */
export type Board = readonly (readonly Cell[])[];

/** Poker hands, weakest first. Every card of a traced path must be part of the hand. */
export const HAND_TYPES = [
  'trips',
  'twoPair',
  'straight',
  'flush',
  'fullHouse',
  'quads',
  'straightFlush',
  'fiveKind',
  'royalFlush',
] as const;

export type HandType = (typeof HAND_TYPES)[number];

/** What a hand does to the board besides clearing its own cards. */
export type BlastKind = 'cross' | 'suit' | 'rank' | 'board' | 'row' | 'storm';

/**
 * What the third hand of the same type in a row of that type does (the "streak"): a joker drops in,
 * extra time, a row blast, a suit storm, a rank turned golden, or double points.
 */
export type PowerKind = 'joker' | 'time' | 'row' | 'storm' | 'gild' | 'double';

export interface HandDef {
  readonly points: number;
  /** Extra game time (time mode). */
  readonly timeBonusMs: number;
  readonly blast?: BlastKind;
  /** What the hand does every `powerStreak`-th time it is played. */
  readonly power: PowerKind;
}

export type GameMode = 'time' | 'moves';

export interface GameConfig {
  readonly rows: number;
  readonly cols: number;
  readonly minLength: number;
  readonly maxLength: number;
  /** Standard 52-card decks in each shoe. */
  readonly decks: number;
  /** Jokers added to each shoe. */
  readonly jokersPerShoe: number;
  readonly goldenChance: number;
  readonly goldenMultiplier: number;
  readonly hands: Readonly<Record<HandType, HandDef>>;
  /** Points per pip of the real cards in a hand (an ace is 14). */
  readonly pointsPerPip: number;
  /** Points per card swept away by a hand's blast. */
  readonly blastPointsPerCard: number;
  /** Hands of one type needed to fire its power; the count then starts again. */
  readonly powerStreak: number;
  /** Extra time from the 'time' power. Not counted against maxTimeBonusMs. */
  readonly powerTimeMs: number;
  readonly comboWindowMs: number;
  readonly comboMultipliers: readonly number[];
  readonly minValidMoves: number;
  readonly maxShuffleAttempts: number;
  readonly mode: GameMode;
  readonly durationMs: number;
  readonly maxTimeBonusMs: number;
  readonly maxMoves: number;
}

export interface Move {
  readonly path: readonly Pos[];
  readonly atMs?: number;
}

export type HandCounts = Readonly<Record<HandType, number>>;

export interface GameState {
  readonly config: GameConfig;
  readonly seed: number;
  readonly rngState: number;
  /** Cards still to deal, top first. When it runs out a fresh shoe is shuffled. */
  readonly shoe: readonly CardSpec[];
  /** Fixed deal order for tests; used before the shoe when not empty. */
  readonly queue: readonly CardSpec[];
  readonly nextId: number;
  readonly board: Board;
  readonly score: number;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly timeLimitMs: number;
  readonly timeBonusMs: number;
  readonly lastMoveAtMs: number | null;
  readonly combo: number;
  readonly maxCombo: number;
  readonly bestMove: number;
  readonly bestHand: HandType | null;
  readonly handCounts: HandCounts;
  /** Progress towards each hand's power: 0..powerStreak − 1. */
  readonly powerCounts: HandCounts;
  readonly shuffles: number;
  readonly gameOver: boolean;
  readonly history: readonly Move[];
}

export interface Fall {
  readonly id: number;
  readonly from: Pos;
  readonly to: Pos;
}

export interface GameStats {
  readonly score: number;
  readonly moves: number;
  readonly maxCombo: number;
  readonly bestMove: number;
  readonly bestHand: HandType | null;
  readonly handCounts: HandCounts;
}

export type GameEvent =
  | {
      readonly type: 'hand';
      readonly hand: HandType;
      /** In traced order. */
      readonly path: readonly Pos[];
      readonly cards: readonly Card[];
      readonly points: number;
      readonly comboMultiplier: number;
      readonly goldenMultiplier: number;
    }
  | {
      readonly type: 'blast';
      readonly kind: BlastKind;
      /** Where the blast starts (the last card of the path). */
      readonly origin: Pos;
      readonly cells: readonly { readonly card: Card; readonly pos: Pos }[];
      readonly points: number;
    }
  | {
      readonly type: 'power';
      readonly hand: HandType;
      readonly power: PowerKind;
      /** Cells it touched: the joker, the golden cards (after the deal). Blasts use a blast event. */
      readonly cells: readonly Pos[];
    }
  | { readonly type: 'fall'; readonly falls: readonly Fall[] }
  | { readonly type: 'spawn'; readonly card: Card; readonly pos: Pos }
  | { readonly type: 'shuffle'; readonly moves: readonly Fall[] }
  | { readonly type: 'regenerate'; readonly board: Board }
  | { readonly type: 'timeBonus'; readonly ms: number; readonly timeLimitMs: number }
  | { readonly type: 'combo'; readonly count: number; readonly multiplier: number }
  | { readonly type: 'moveEnd'; readonly points: number }
  | { readonly type: 'gameOver'; readonly stats: GameStats };

export interface MoveResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}
