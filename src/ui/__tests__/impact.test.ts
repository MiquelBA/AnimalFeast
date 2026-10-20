import { describe, expect, it } from 'vitest';
import type { Frame, Ghost } from '../frames';
import { hitStopMs, impactOf } from '../impact';
import { UI } from '../uiConfig';

const prey = (n: number) => Array.from({ length: n }, () => ({ kind: 'swallow' }) as Ghost);
const eat = (swallowed: number, extra: Frame['effects'] = []) =>
  ({ kind: 'eat', ghosts: prey(swallowed), effects: [{ type: 'points', pos: { row: 0, col: 0 }, points: 10 }, ...extra] }) as const;

describe('impact', () => {
  it('a chain of 3 is 1, and longer chains and reaction waves hit harder', () => {
    expect(impactOf(eat(2))).toBe(1);
    expect(impactOf(eat(3))).toBeGreaterThan(1);
    expect(impactOf(eat(2, [{ type: 'text', text: 'wave', value: 2, wave: 2 }]))).toBeGreaterThan(impactOf(eat(3)));
  });

  it('frenzy and whirlpool are the biggest hits; falls are nothing', () => {
    expect(impactOf({ kind: 'frenzy', ghosts: [], effects: [] })).toBe(UI.impact.frenzy);
    expect(impactOf({ kind: 'whirl', ghosts: [], effects: [] })).toBe(UI.impact.whirl);
    expect(impactOf({ kind: 'fall', ghosts: [], effects: [] })).toBe(0);
  });

  it('freezes only on big hits, and never for long', () => {
    expect(hitStopMs(1)).toBe(0);
    expect(hitStopMs(UI.impact.hitStop.from)).toBe(UI.impact.hitStop.baseMs);
    expect(hitStopMs(100)).toBe(UI.impact.hitStop.maxMs);
  });
});
