// Screen shake and board punch: the whole game jolts on a hit, harder the bigger it is.
import { UI } from '../uiConfig';

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Shakes the HUD and the stage together (not the overlays), and punches the board's scale. */
export function shakeScreen(impact: number, board: HTMLElement | null): void {
  if (impact <= 0 || reducedMotion()) return;
  const S = UI.impact.shake;
  const P = UI.impact.punch;
  const a = Math.min(S.maxPx, S.basePx + (impact - 1) * S.perImpactPx);
  const t = impact >= S.twistFrom ? S.twistDeg * Math.min(2, impact / S.twistFrom) : 0;
  // A decaying jolt: hard first kick, then smaller and smaller wobbles.
  const path: [number, number, number][] = [[0, 0, 0], [-a, a * 0.6, -t], [a * 0.8, -a * 0.5, t], [-a * 0.55, a * 0.35, -t * 0.6], [a * 0.35, -a * 0.2, t * 0.3], [-a * 0.15, a * 0.1, 0], [0, 0, 0]];
  const frames = path.map(([x, y, r]) => ({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` }));
  for (const el of document.querySelectorAll<HTMLElement>('.hud, .stage, .bottom')) el.animate(frames, { duration: S.ms, easing: 'ease-out' });
  const punch = 1 + Math.min(P.max, impact * P.perImpact);
  board?.animate([{ scale: '1' }, { scale: String(punch), filter: 'brightness(1.25)' }, { scale: '1' }], { duration: P.ms, easing: 'cubic-bezier(.2,1.6,.4,1)', composite: 'add' });
}
