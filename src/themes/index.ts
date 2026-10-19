import { OCEAN_THEME } from './ocean';
import type { Theme, ThemeLevel, ThemeSpecial } from './types';

export type { Theme, ThemeLevel, ThemeSpecial } from './types';

export const THEMES: Readonly<Record<string, Theme>> = { ocean: OCEAN_THEME };

export const DEFAULT_THEME = OCEAN_THEME;

/** The levels a game with `tierCount` tiers uses: the top of the world's chain, lowest first. */
export function themeLevels(theme: Theme, tierCount: number): readonly ThemeLevel[] {
  if (tierCount > theme.levels.length) throw new Error(`Theme "${theme.id}" has only ${theme.levels.length} levels`);
  return theme.levels.slice(theme.levels.length - tierCount);
}

export function themeLevel(theme: Theme, tier: number, tierCount: number): ThemeLevel {
  const level = themeLevels(theme, tierCount)[tier - 1];
  if (!level) throw new Error(`Theme "${theme.id}" has no tier ${tier}`);
  return level;
}

/** Name, colour and sprite for an animal on the board (the wildcard has its own look). */
export function animalLook(theme: Theme, animal: { readonly tier: number; readonly wild?: boolean }, tierCount: number): ThemeSpecial {
  return animal.wild ? theme.wild : themeLevel(theme, animal.tier, tierCount);
}
