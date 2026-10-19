// Core engine types. Pure data: everything here is JSON-serializable.

export type Species = 'SARDINE' | 'TUNA' | 'SHARK' | 'ORCA';

export type EatRule = 'oneLevelBelow' | 'anyLower';

export type Direction = 'N' | 'E' | 'S' | 'W';

export interface Pos {
  readonly row: number;
  readonly col: number;
}

export interface Animal {
  readonly id: number;
  readonly species: Species;
  readonly energy: number;
}

export type Cell = Animal | null;

/** Row-major grid: board[row][col]. (0,0) is top-left. */
export type Board = readonly (readonly Cell[])[];

export interface SpeciesDef {
  readonly level: number;
  /** Energy the predator gains (before inheritance) when this species is eaten. */
  readonly energyValue: number;
  readonly basePoints: number;
  readonly spawnWeight: number;
}

export type SpawnWeights = Readonly<Record<Species, number>>;

export interface SpawnScheduleEntry {
  /** Weights apply from this turn number (inclusive) until the next entry. */
  readonly fromTurn: number;
  readonly weights: SpawnWeights;
}

export interface GameConfig {
  readonly boardSize: number;
  readonly handSize: number;
  readonly species: Readonly<Record<Species, SpeciesDef>>;
  readonly eatRule: EatRule;
  readonly sameSpeciesCaptures: boolean;
  readonly predatorMovesIntoPrey: boolean;
  readonly placedEnergy: number;
  readonly inheritRatio: number;
  readonly pointsPerPreyEnergy: number;
  readonly sameSpeciesMultiplier: number;
  readonly chainMultipliers: readonly number[];
  /** null = always use each species' spawnWeight. */
  readonly spawnSchedule: readonly SpawnScheduleEntry[] | null;
  /** Visual only: energy thresholds for visual tiers 0..n. */
  readonly energyTiers: readonly number[];
}

export interface Move {
  readonly handIndex: number;
  readonly row: number;
  readonly col: number;
}

export interface GameStats {
  readonly score: number;
  readonly totalCaptures: number;
  readonly longestChain: number;
  readonly turns: number;
  readonly finalBoard: Readonly<Record<Species, number>>;
}

export interface GameState {
  readonly config: GameConfig;
  readonly seed: number;
  readonly rngState: number;
  readonly nextId: number;
  readonly board: Board;
  readonly hand: readonly Animal[];
  /** Number of moves played so far. */
  readonly turn: number;
  readonly score: number;
  readonly totalCaptures: number;
  readonly longestChain: number;
  readonly gameOver: boolean;
  readonly history: readonly Move[];
}

export type CaptureKind = 'hunt' | 'hunted';

export type GameEvent =
  | { readonly type: 'place'; readonly animal: Animal; readonly pos: Pos; readonly handIndex: number }
  | {
      readonly type: 'capture';
      /** 'hunt': the focus ate a neighbour. 'hunted': a neighbour ate the focus. */
      readonly kind: CaptureKind;
      readonly predator: Animal;
      readonly prey: Animal;
      readonly predatorFrom: Pos;
      readonly preyPos: Pos;
      readonly predatorTo: Pos;
      /** The cell left empty by this capture. */
      readonly vacated: Pos;
      readonly sameSpecies: boolean;
      readonly value: number;
      readonly multiplier: number;
      readonly points: number;
      readonly chain: number;
    }
  | {
      readonly type: 'energyGain';
      readonly animalId: number;
      readonly pos: Pos;
      readonly from: number;
      readonly to: number;
      readonly tierFrom: number;
      readonly tierTo: number;
    }
  | { readonly type: 'chainStep'; readonly chain: number; readonly multiplier: number; readonly turnPoints: number }
  | { readonly type: 'handRefill'; readonly handIndex: number; readonly animal: Animal }
  | { readonly type: 'turnEnd'; readonly turn: number; readonly chain: number; readonly turnPoints: number }
  | { readonly type: 'gameOver'; readonly stats: GameStats };

export interface MoveResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}
