// A theme is pure data: it gives names, colours and sprites to the engine's tiers.

export interface ThemeLevel {
  readonly id: string;
  /** Catalan display name. */
  readonly name: string;
  /** The name with its article, lowercase, for sentences ("l'orca"). */
  readonly definite: string;
  readonly color: string;
  /** Key resolved by the UI's spriteRegistry. */
  readonly sprite: string;
}

/** A piece that isn't a level of the chain (the wildcard). */
export interface ThemeSpecial {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly sprite: string;
}

export interface Theme {
  readonly id: string;
  readonly worldName: string;
  readonly background: { readonly from: string; readonly to: string };
  /**
   * The world's full food chain, lowest first. A game with fewer tiers uses the top ones
   * (4 tiers in the ocean: sardine to orca; 5 tiers adds plankton below).
   */
  readonly levels: readonly ThemeLevel[];
  /** The wildcard piece (REGLES.md §9). */
  readonly wild: ThemeSpecial;
}
