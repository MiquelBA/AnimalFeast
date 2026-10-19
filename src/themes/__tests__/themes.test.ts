import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../engine/config';
import { THEMES, themeLevel } from '..';

describe('themes', () => {
  it.each(Object.values(THEMES))('$id names every engine tier exactly once', (theme) => {
    expect(theme.levels.map((l) => l.tier)).toEqual(DEFAULT_CONFIG.tiers.map((_, i) => i + 1));
    expect(themeLevel(theme, 4).id).toBeTruthy();
  });
});
