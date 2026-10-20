import { FEAST, makeConfig } from '../engine/config';
import { OCEAN_THEME } from '../themes/ocean';
import type { Scenario } from './types';

/** The ocean (REGLES.md v0.6): the feast rules with the ocean's food chain. */
export const OCEAN: Scenario = {
  id: 'ocean',
  rules: FEAST,
  config: makeConfig(FEAST),
  theme: OCEAN_THEME,
  // v0.6 changed scoring a lot, so its record started fresh under this key.
  recordKey: 'animal-feast:best:v0.6',
  rankingId: 'ocean-v0.6',
};
