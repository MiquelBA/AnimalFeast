// How hard a moment hits. One number per animation frame drives everything that should feel
// heavier on bigger moments: the freeze after the hit, the screen shake, vibration and sound.
import type { Frame } from './frames';
import { UI } from './uiConfig';

/** 0 = nothing to feel; 1 = a plain chain of 3; grows with chain length and reaction waves. */
export function impactOf(frame: { readonly kind: Frame['kind'] | 'idle' } & Pick<Frame, 'ghosts' | 'effects'>): number {
  const I = UI.impact;
  if (frame.kind === 'frenzy') return I.frenzy;
  if (frame.kind === 'whirl') return I.whirl;
  if (frame.kind === 'shuffle') return I.shuffle;
  if (frame.kind !== 'eat') return 0;
  const chains = Math.max(1, frame.effects.filter((e) => e.type === 'points').length);
  const swallowed = frame.ghosts.filter((g) => g.kind === 'swallow').length;
  // Prey per chain beyond the minimum of 2 (a chain of 3 = predator + 2 prey).
  const extraLength = Math.max(0, swallowed / chains - 2);
  const waveText = frame.effects.find((e) => e.type === 'text' && e.text === 'wave');
  const wave = waveText?.type === 'text' ? waveText.wave ?? 1 : 0;
  return Math.min(I.max, 1 + extraLength * I.perExtraPrey + wave * I.perWave + (chains - 1) * I.perExtraChain);
}

/** The freeze after a hit, before the board moves on (no time is lost: the clock is stopped). */
export function hitStopMs(impact: number): number {
  const H = UI.impact.hitStop;
  return impact >= H.from ? Math.min(H.maxMs, H.baseMs + (impact - H.from) * H.perImpactMs) : 0;
}
