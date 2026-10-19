import { describe, expect, it } from 'vitest';
import { hasSprite } from '../../assets/spriteRegistry';
import { DEFAULT_CONFIG, FIVE_TIERS } from '../../engine/config';
import { THEMES, animalLook, themeLevel, themeLevels } from '..';

describe('themes', () => {
  it.each(Object.values(THEMES))('$id names every tier of the 4- and 5-tier games', (theme) => {
    expect(themeLevels(theme, DEFAULT_CONFIG.tiers.length).map((l) => l.id)).toEqual(['sardine', 'tuna', 'shark', 'orca']);
    expect(themeLevels(theme, FIVE_TIERS.tiers!.length)[0].id).toBe('plankton');
    expect(themeLevel(theme, 4, 4).id).toBe('orca');
    expect(themeLevel(theme, 1, 5).id).toBe('plankton');
  });

  it.each(Object.values(THEMES))('$id has a sprite for every level and for the wildcard', (theme) => {
    for (const level of theme.levels) expect(hasSprite(level.sprite)).toBe(true);
    expect(hasSprite(theme.wild.sprite)).toBe(true);
    expect(animalLook(theme, { tier: 0, wild: true }, 4).id).toBe(theme.wild.id);
  });
});
