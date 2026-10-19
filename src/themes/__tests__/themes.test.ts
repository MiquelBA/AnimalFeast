import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../engine/config';
import { hasSprite } from '../../assets/spriteRegistry';
import { THEMES, animalLook, themeLevel } from '..';

describe('themes', () => {
  it.each(Object.values(THEMES))('$id names every engine tier exactly once', (theme) => {
    expect(theme.levels.map((l) => l.tier)).toEqual(DEFAULT_CONFIG.tiers.map((_, i) => i + 1));
    expect(themeLevel(theme, 4).id).toBeTruthy();
  });

  it.each(Object.values(THEMES))('$id has a sprite for every level and for the wildcard', (theme) => {
    for (const level of theme.levels) expect(hasSprite(level.sprite)).toBe(true);
    expect(hasSprite(theme.wild.sprite)).toBe(true);
    expect(animalLook(theme, { tier: 0, wild: true }).id).toBe(theme.wild.id);
  });
});
