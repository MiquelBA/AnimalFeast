import { OCEAN } from './ocean';
import type { Scenario } from './types';

export type { Scenario } from './types';

export const SCENARIOS: Readonly<Record<string, Scenario>> = { ocean: OCEAN };

export const DEFAULT_SCENARIO = OCEAN;

/** The scenario for an id (from a link), or the default one when it's missing or unknown. */
export function scenarioById(id: string | null): Scenario {
  return (id && SCENARIOS[id]) || DEFAULT_SCENARIO;
}
