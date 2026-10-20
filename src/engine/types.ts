// Core engine types (REGLES.md v0.2). Pure data: everything here is JSON-serializable.
// The engine only knows trophic tiers (1 = lowest); species, names and art come from themes.

export type Tier = number;

export type Adjacency = 4 | 8;

export type GameMode = 'time' | 'moves';

export interface Pos {
  readonly row: number;
  readonly col: number;
}

/** What the next spawn will be (spawn queues in tests and notation). */
export interface SpawnSpec {
  readonly tier: Tier;
  readonly golden?: boolean;
  readonly wild?: boolean;
}

export interface Animal {
  readonly id: number;
  readonly tier: Tier;
  readonly energy: number;
  /** Golden animal: a chain that includes it scores × goldenMultiplier (REGLES.md v0.5 §9). */
  readonly golden?: boolean;
  /** Wildcard (octopus): stands in for any tier in a chain, never as the predator. Its tier is 0. */
  readonly wild?: boolean;
}

export type Cell = Animal | null;

/** Row-major grid: board[row][col]. (0,0) is top-left. May be rectangular (tests). */
export type Board = readonly (readonly Cell[])[];

export interface TierDef {
  /** Energy the predator gains (before inheritance) when an animal of this tier is eaten. */
  readonly energyValue: number;
  readonly basePoints: number;
  readonly spawnWeight: number;
}

export interface GameConfig {
  readonly boardSize: number;
  /** tiers[i] describes tier i + 1. */
  readonly tiers: readonly TierDef[];
  readonly adjacency: Adjacency;
  readonly allowDescendingTrace: boolean;
  readonly chainLengths: readonly number[];
  readonly spawnEnergy: number;
  readonly inheritRatio: number;
  readonly pointsPerPreyEnergy: number;
  /** Keyed by chain length. */
  readonly lengthMultiplier: Readonly<Record<number, number>>;
  readonly comboWindowMs: number;
  readonly comboMultipliers: readonly number[];
  readonly frenzyThreshold: number;
  readonly frenzyMultiplier: number;
  /** Frenzy eats neighbours with this adjacency (REGLES.md §6 says 8 directions). */
  readonly frenzyAdjacency: Adjacency;
  readonly minValidMoves: number;
  readonly minInitialMoves: number;
  readonly maxShuffleAttempts: number;
  /** Safety cap for generating a board with enough chains. */
  readonly maxBoardGenerationAttempts: number;
  readonly mode: GameMode;
  readonly durationMs: number;
  readonly timeBonusMs: { readonly frenzy: number };
  /** Cap on the total time bonus per game. */
  readonly maxTimeBonusMs: number;
  /** The top-tier predator leaves after eating (2-3-4: whole chain gone; 1-2-3-4: frenzy, then leaves). */
  readonly maxTierLeaves: boolean;
  /** With maxTierLeaves: a full chain (1-2-3-4) makes the top-tier predator frenzy before leaving. */
  readonly fullChainFrenzy: boolean;
  /** UI hint: stop the clock while a move's animations play. */
  readonly pauseClockDuringResolution: boolean;
  readonly maxMoves: number;
  /** Chance that a spawned animal is golden (0 = off). */
  readonly goldenChance: number;
  /** Chain points multiplier per golden animal in the chain (they stack). */
  readonly goldenMultiplier: number;
  /** Chance that a spawned animal is a wildcard octopus (0 = off). */
  readonly wildChance: number;
  /**
   * Spontaneous chains: after pieces fall, a straight row or column of animals in food-chain order
   * (as long as a chain) is eaten on its own, in waves, until none is left. Boards start without any.
   */
  readonly spontaneousLines: boolean;
  /** Shortest straight line that is eaten on its own. */
  readonly minLineLength: number;
  /** Points multiplier of each wave of spontaneous chains (wave 1 first; the last one repeats). */
  readonly waveMultipliers: readonly number[];
  /** Safety cap on waves per move. */
  readonly maxWaves: number;
  /**
   * Before shuffling, re-roll the species of the animals that just entered up to this many times,
   * looking for enough possible chains (0 = off).
   */
  readonly refillRerolls: number;
}

/** A traced chain: cells in the order the finger visited them; atMs is game time (time mode). */
export interface Move {
  readonly path: readonly Pos[];
  readonly atMs?: number;
}

export interface GameStats {
  readonly score: number;
  readonly chains: number;
  readonly chains4: number;
  readonly frenzies: number;
  readonly maxCombo: number;
  readonly bestMove: number;
  readonly shuffles: number;
  /** Chains that included a golden animal / a wildcard. */
  readonly goldenChains: number;
  readonly wildChains: number;
  /** Spontaneous chains, and the most waves in one move. */
  readonly spontaneousChains: number;
  readonly maxWaves: number;
  readonly moves: number;
}

export interface GameState {
  readonly config: GameConfig;
  readonly seed: number;
  readonly rngState: number;
  /** Fixed spawn queue (tests); when empty, spawns come from the RNG. */
  readonly spawnQueue: readonly SpawnSpec[];
  readonly nextId: number;
  readonly board: Board;
  readonly score: number;
  readonly moves: number;
  /** Game clock (time mode), advanced by tick() and by each move's atMs. */
  readonly elapsedMs: number;
  /** durationMs plus time bonuses earned so far. */
  readonly timeLimitMs: number;
  /** Total time bonus granted so far (capped by maxTimeBonusMs). */
  readonly timeBonusMs: number;
  readonly lastMoveAtMs: number | null;
  readonly combo: number;
  readonly chains: number;
  readonly chains4: number;
  readonly frenzies: number;
  readonly maxCombo: number;
  readonly bestMove: number;
  readonly shuffles: number;
  readonly goldenChains: number;
  readonly wildChains: number;
  readonly spontaneousChains: number;
  readonly maxWaves: number;
  readonly gameOver: boolean;
  readonly history: readonly Move[];
}

export interface Fall {
  readonly id: number;
  readonly from: Pos;
  readonly to: Pos;
}

export type TimeBonusReason = 'frenzy';

/** 'frenzy': after a frenzy. 'sated': a top-tier predator leaves after eating (maxTierLeaves). */
export type LeaveReason = 'frenzy' | 'sated';

export type GameEvent =
  | {
      readonly type: 'chain';
      /** Ascending order (prey first, predator last), whatever direction was traced. */
      readonly path: readonly Pos[];
      readonly predator: Animal;
      readonly points: number;
      readonly lengthMultiplier: number;
      readonly comboMultiplier: number;
      /** goldenMultiplier ^ golden animals in the chain (1 if none). */
      readonly goldenMultiplier: number;
      /** 0 for the traced chain; n for a spontaneous chain in the n-th wave. */
      readonly wave: number;
      readonly waveMultiplier: number;
    }
  | { readonly type: 'eat'; readonly prey: Animal; readonly from: Pos; readonly predatorId: number; readonly to: Pos; readonly frenzy: boolean }
  | { readonly type: 'energyGain'; readonly animalId: number; readonly pos: Pos; readonly from: number; readonly to: number }
  | { readonly type: 'fall'; readonly falls: readonly Fall[] }
  | { readonly type: 'spawn'; readonly animal: Animal; readonly pos: Pos }
  | { readonly type: 'frenzy'; readonly predator: Animal; readonly pos: Pos; readonly prey: readonly { readonly animal: Animal; readonly pos: Pos; readonly points: number }[]; readonly points: number }
  /** A predator leaves the board (its cell empties). */
  | { readonly type: 'leave'; readonly animal: Animal; readonly pos: Pos; readonly reason: LeaveReason }
  | { readonly type: 'shuffle'; readonly moves: readonly Fall[]; readonly attempts: number }
  /** Shuffling failed maxShuffleAttempts times: the whole board was replaced. */
  | { readonly type: 'regenerate'; readonly removed: readonly Animal[]; readonly board: Board }
  | { readonly type: 'timeBonus'; readonly reason: TimeBonusReason; readonly ms: number; readonly timeLimitMs: number }
  | { readonly type: 'combo'; readonly count: number; readonly multiplier: number }
  | { readonly type: 'moveEnd'; readonly points: number }
  | { readonly type: 'gameOver'; readonly stats: GameStats };

export interface MoveResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}
