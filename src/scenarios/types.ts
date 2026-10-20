// A scenario is one world of the game: its rules, its animals and its colours. The ocean is the
// first; new ones (a river, the Arctic…) are a new file here, with no changes elsewhere.
import type { ConfigOverrides } from '../engine/config';
import type { GameConfig } from '../engine/types';
import type { Theme } from '../themes';

export interface Scenario {
  /** Stable id: used in links (?scenario=…), records and the leaderboard. */
  readonly id: string;
  /** Rules as overrides on the engine's defaults (REGLES.md). */
  readonly rules: ConfigOverrides;
  /** The full rules, built once from `rules`; games with exactly these count for the record. */
  readonly config: GameConfig;
  /** Animals, specials, names and colours. */
  readonly theme: Theme;
  /** Where this scenario's best score is kept on the device. */
  readonly recordKey: string;
  /** This scenario's table in the shared leaderboard; a new id when its rules change the scoring. */
  readonly rankingId: string;
}
