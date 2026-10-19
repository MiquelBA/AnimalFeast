import { OCEAN_THEME } from './ocean';
import type { Theme, ThemeSpecial } from './types';

export type { Theme, ThemeLevel, ThemeSpecial } from './types';

export const THEMES: Readonly<Record<string, Theme>> = { ocean: OCEAN_THEME };

export const DEFAULT_THEME = OCEAN_THEME;

export function themeLevel(theme: Theme, tier: number) {
  const level = theme.levels.find((l) => l.tier === tier);
  if (!level) throw new Error(`Theme "${theme.id}" has no tier ${tier}`);
  return level;
}

/** Name, colour and sprite for an animal on the board (the wildcard has its own look). */
export function animalLook(theme: Theme, animal: { readonly tier: number; readonly wild?: boolean }): ThemeSpecial {
  return animal.wild ? theme.wild : themeLevel(theme, animal.tier);
}
