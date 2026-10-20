// What the effects layer draws for each animation frame. Positions are in cells; `at` turns a cell
// into canvas pixels. Sizes and timings come from UI.fx.
import type { Pos } from '../../engine/types';
import type { Display } from '../useGame';
import { UI } from '../uiConfig';
import type { FxCanvas } from './fxCanvas';

const GOLD = '#FFD34E', FOAM = '#B8ECF5', WHITE = '#FFFFFF', RED = '#FF6B6B', PINK = '#FF8FC7', GREEN = '#45C76F';
/** Each wave of reactions gets a brighter colour. */
const WAVE_COLORS = [FOAM, GOLD, PINK, GREEN, WHITE];

export interface Place {
  /** Canvas pixels of a cell's centre. */
  readonly at: (p: Pos) => { x: number; y: number };
  readonly cell: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function burst(fx: FxCanvas, x: number, y: number, o: { count: number; speed: number; size: number; colors: readonly string[]; lifeMs: number; shape?: 'dot' | 'spark'; gravity?: number }): void {
  for (let i = 0; i < o.count; i++) {
    const a = (i / o.count) * Math.PI * 2 + rnd(-0.25, 0.25);
    const v = o.speed * rnd(0.45, 1);
    fx.particle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      size: o.size * rnd(0.6, 1.2), color: o.colors[i % o.colors.length], lifeMs: o.lifeMs * rnd(0.75, 1),
      drag: 0.04, gravity: o.gravity ?? 0, shape: o.shape ?? 'dot',
    });
  }
}

/** Where the frame's chains end: the points floaters sit on each predator. */
function predatorCells(display: Display): Pos[] {
  return display.effects.flatMap((e) => (e.type === 'points' ? [e.pos] : []));
}

export function playFrame(fx: FxCanvas, display: Display, place: Place): void {
  const { cell, at } = place;
  const F = UI.fx;
  if (display.kind === 'eat') {
    const wave = display.effects.find((e) => e.type === 'text' && e.text === 'wave');
    const n = wave?.type === 'text' ? wave.wave ?? 1 : 0;
    const swallowed = display.ghosts.filter((g) => g.kind === 'swallow').length;
    const long = swallowed >= 3;
    for (const p of predatorCells(display)) {
      const { x, y } = at(p);
      const color = n ? WAVE_COLORS[Math.min(n, WAVE_COLORS.length) - 1] : FOAM;
      const count = F.chainParticles + (long ? F.longChainExtra : 0) + n * F.perWaveExtra;
      burst(fx, x, y, { count, speed: cell * F.chainSpeed * (1 + n * 0.2), size: cell * F.dotSize, colors: [GOLD, color, WHITE], lifeMs: F.chainLifeMs });
      fx.ring({ x, y, fromRadius: cell * 0.3, toRadius: cell * (1.2 + n * 0.35), width: cell * 0.09, color, lifeMs: F.ringLifeMs });
      if (long || n >= 2) {
        burst(fx, x, y, { count: F.sparks / 2, speed: cell * F.chainSpeed * 1.6, size: cell * F.dotSize, colors: [WHITE, GOLD], lifeMs: F.chainLifeMs, shape: 'spark' });
        fx.ring({ x, y, fromRadius: cell * 0.2, toRadius: cell * (1.8 + n * 0.4), width: cell * 0.05, color: WHITE, lifeMs: F.ringLifeMs, delayMs: 70 });
      }
      if (n >= 2) fx.rays({ x, y, count: 10, length: cell * (1.4 + n * 0.3), color, lifeMs: F.ringLifeMs, turnsPerSecond: 0.5 });
    }
  } else if (display.kind === 'frenzy') {
    const flash = display.effects.find((e) => e.type === 'flash');
    if (flash?.type !== 'flash') return;
    const { x, y } = at(flash.pos);
    // The frenzy: spinning light rays, three shock rings, a shower of sparks and embers.
    fx.rays({ x, y, count: 16, length: cell * F.frenzyReach, color: GOLD, lifeMs: F.frenzyLifeMs, turnsPerSecond: 0.45 });
    [WHITE, GOLD, RED].forEach((color, i) => fx.ring({
      x, y, fromRadius: cell * 0.4, toRadius: cell * (F.frenzyReach - i * 0.6), width: cell * (0.16 - i * 0.04), color,
      lifeMs: F.frenzyLifeMs - i * 60, delayMs: i * 70,
    }));
    burst(fx, x, y, { count: F.sparks, speed: cell * F.chainSpeed * 2.4, size: cell * F.dotSize * 1.1, colors: [GOLD, WHITE, RED], lifeMs: F.frenzyLifeMs, shape: 'spark', gravity: cell * 5 });
    burst(fx, x, y, { count: F.sparks / 2, speed: cell * F.chainSpeed, size: cell * F.dotSize * 1.5, colors: [GOLD, RED], lifeMs: F.frenzyLifeMs, gravity: cell * 3 });
  } else if (display.kind === 'whirl') {
    const flash = display.effects.find((e) => e.type === 'flash');
    if (flash?.type !== 'flash') return;
    const { x, y } = at(flash.pos);
    // The whirlpool: a spinning spiral, an imploding ring and bubbles sucked in along the spiral.
    fx.vortex({ x, y, radius: cell * 1.7, arms: 3, color: FOAM, lifeMs: F.whirlLifeMs, turnsPerSecond: 1.6 });
    fx.ring({ x, y, fromRadius: cell * 3, toRadius: cell * 0.2, width: cell * 0.08, color: WHITE, lifeMs: F.whirlLifeMs });
    for (let i = 0; i < F.whirlBubbles; i++) {
      const a = (i / F.whirlBubbles) * Math.PI * 2;
      const r = cell * rnd(1.4, 3);
      fx.particle({
        x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, vx: 0, vy: 0,
        size: cell * rnd(0.05, 0.12), color: i % 3 ? FOAM : WHITE, lifeMs: F.whirlLifeMs, shape: i % 2 ? 'bubble' : 'dot',
        orbit: { cx: x, cy: y, turnsPerSecond: 1.4, inwardPerSecond: r / (F.whirlLifeMs / 1000) },
      });
    }
  }
}
