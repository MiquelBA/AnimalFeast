import { OCEAN_THEME } from './ocean';
import type { Theme } from './types';

export type { Theme, ThemeLevel } from './types';

export const THEMES: Readonly<Record<string, Theme>> = { ocean: OCEAN_THEME };

export const DEFAULT_THEME = OCEAN_THEME;

export function themeLevel(theme: Theme, tier: number) {
  const level = theme.levels.find((l) => l.tier === tier);
  if (!level) throw new Error(`Theme "${theme.id}" has no tier ${tier}`);
  return level;
}
