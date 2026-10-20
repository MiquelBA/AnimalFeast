import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../engine/config';
import { createGame } from '../../engine/game';
import { themeLevels } from '../../themes';
import { DEFAULT_SCENARIO, SCENARIOS, scenarioById } from '..';

describe('scenarios', () => {
  it('the ocean is the default and plays the v0.6 rules', () => {
    expect(DEFAULT_SCENARIO.id).toBe('ocean');
    expect(DEFAULT_SCENARIO.config).toEqual(GAME_CONFIG);
  });

  it('falls back to the default for a missing or unknown id', () => {
    expect(scenarioById(null)).toBe(DEFAULT_SCENARIO);
    expect(scenarioById('nowhere')).toBe(DEFAULT_SCENARIO);
    expect(scenarioById('ocean')).toBe(SCENARIOS.ocean);
  });

  for (const scenario of Object.values(SCENARIOS)) {
    it(`${scenario.id}: its id matches its key, its world has every tier, and a game starts`, () => {
      expect(SCENARIOS[scenario.id]).toBe(scenario);
      expect(() => themeLevels(scenario.theme, scenario.config.tiers.length)).not.toThrow();
      expect(createGame({ seed: 1, config: scenario.config }).board.length).toBe(scenario.config.boardSize);
    });
  }
});
