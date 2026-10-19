// A theme is pure data: it gives names, colours and sprites to the engine's tiers.

export interface ThemeLevel {
  readonly tier: number;
  readonly id: string;
  /** Catalan display name. */
  readonly name: string;
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
  /** Ordered by tier, starting at 1. */
  readonly levels: readonly ThemeLevel[];
  /** The wildcard piece (REGLES.md §9). */
  readonly wild: ThemeSpecial;
}
