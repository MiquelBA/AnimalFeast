// What the effects canvas draws for each frame. The bigger the hand, the bigger the show: tier 0
// (trips) is a small burst; tier 4 (royal flush) fills the screen with rays, shock rings and a
// rain of gold.
import type { Frame } from '../frames';
import { SUIT_COLORS, UI } from '../uiConfig';
import type { FxCanvas } from './fxCanvas';

const GOLD = '#FFD54A', WHITE = '#FFFFFF', PINK = '#FF4F9A', CYAN = '#5BE7FF', AMBER = '#FF9A3C';
const TIER_COLORS = [[GOLD, WHITE], [GOLD, CYAN, WHITE], [GOLD, AMBER, WHITE, PINK], [GOLD, PINK, CYAN, WHITE], [GOLD, WHITE, AMBER, PINK, CYAN]];

export interface Place {
  readonly at: (p: { row: number; col: number }) => { x: number; y: number };
  /** Cell width in px. */
  readonly cell: number;
  readonly width: number;
  readonly height: number;
  readonly boardTop: number;
  readonly boardLeft: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function burst(fx: FxCanvas, x: number, y: number, o: { count: number; speed: number; size: number; colors: readonly string[]; lifeMs: number; shape?: 'dot' | 'spark'; gravity?: number; delayMs?: number }): void {
  for (let i = 0; i < o.count; i++) {
    const a = (i / o.count) * Math.PI * 2 + rnd(-0.3, 0.3);
    const v = o.speed * rnd(0.4, 1);
    fx.particle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      size: o.size * rnd(0.6, 1.3), color: o.colors[i % o.colors.length], lifeMs: o.lifeMs * rnd(0.7, 1),
      drag: 0.05, gravity: o.gravity ?? 0, shape: o.shape ?? 'dot', delayMs: o.delayMs,
    });
  }
}

export function playFrame(fx: FxCanvas, frame: Frame, place: Place): void {
  const { cell, at } = place;
  const F = UI.fx;
  if (frame.kind === 'collect' && frame.hand) {
    const { tier, centre, path } = frame.hand;
    const { x, y } = at(centre);
    const colors = TIER_COLORS[tier];
    const hit = frame.duration * 0.7;
    // A spark trail on each card as it lifts.
    for (const p of path) {
      const c = at(p);
      burst(fx, c.x, c.y, { count: 6 + tier * 2, speed: cell * 2, size: cell * 0.05, colors, lifeMs: 380, shape: 'spark' });
    }
    // The hit where the cards meet.
    burst(fx, x, y, { count: F.particles[tier], speed: cell * F.speed * (1 + tier * 0.25), size: cell * F.dotSize, colors, lifeMs: F.lifeMs + tier * 120, delayMs: hit, gravity: cell * 2 });
    fx.ring({ x, y, fromRadius: cell * 0.3, toRadius: cell * (1.6 + tier * 0.8), width: cell * 0.1, color: colors[0], lifeMs: F.ringLifeMs + tier * 80, delayMs: hit });
    if (tier >= 1) {
      burst(fx, x, y, { count: 16 + tier * 14, speed: cell * F.speed * 1.8, size: cell * 0.07, colors: [WHITE, GOLD], lifeMs: F.lifeMs, shape: 'spark', delayMs: hit });
      fx.ring({ x, y, fromRadius: cell * 0.2, toRadius: cell * (2.4 + tier), width: cell * 0.05, color: WHITE, lifeMs: F.ringLifeMs, delayMs: hit + 80 });
    }
    if (tier >= 2) {
      fx.rays({ x, y, count: 12 + tier * 2, length: cell * (3 + tier), color: colors[1], lifeMs: 700 + tier * 200, turnsPerSecond: 0.4 });
      burst(fx, x, y, { count: 40, speed: cell * F.speed * 0.9, size: cell * 0.12, colors, lifeMs: 1000, gravity: cell * 6, delayMs: hit });
    }
    if (tier >= 3) {
      [GOLD, PINK, CYAN].forEach((color, i) => fx.ring({ x, y, fromRadius: cell * 0.4, toRadius: cell * (6 - i), width: cell * (0.18 - i * 0.04), color, lifeMs: 800, delayMs: hit + i * 90 }));
      fx.rays({ x, y, count: 20, length: cell * 9, color: GOLD, lifeMs: 1300, turnsPerSecond: -0.25 });
    }
    if (tier >= 4) goldRain(fx, place, hit);
  } else if (frame.kind === 'blast' && frame.blast) {
    const o = at(frame.blast.origin);
    const kind = frame.blast.kind;
    if (kind === 'cross') {
      // Beams along the row and the column.
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        for (let i = 0; i < 22; i++) {
          fx.particle({ x: o.x, y: o.y, vx: dx * cell * rnd(8, 16), vy: dy * cell * rnd(8, 16) + rnd(-20, 20), size: cell * rnd(0.05, 0.1), color: i % 2 ? GOLD : WHITE, lifeMs: 520, drag: 0.2, shape: 'spark' });
        }
      }
    }
    for (const g of frame.ghosts) {
      const c = at(g.from);
      const color = g.card.joker ? PINK : SUIT_COLORS[g.card.suit] === SUIT_COLORS[0] ? WHITE : SUIT_COLORS[g.card.suit];
      burst(fx, c.x, c.y, { count: 10, speed: cell * 4, size: cell * 0.08, colors: [color, GOLD], lifeMs: 520, delayMs: g.index * 18 });
      fx.ring({ x: c.x, y: c.y, fromRadius: cell * 0.1, toRadius: cell * 0.9, width: cell * 0.06, color: GOLD, lifeMs: 420, delayMs: g.index * 18 });
    }
    fx.ring({ x: o.x, y: o.y, fromRadius: cell * 0.3, toRadius: cell * (kind === 'board' ? 9 : 5), width: cell * 0.2, color: WHITE, lifeMs: 640 });
    if (kind === 'board') goldRain(fx, place, 0);
  } else if (frame.kind === 'shuffle') {
    fx.ring({ x: place.boardLeft + place.boardWidth / 2, y: place.boardTop + place.boardHeight / 2, fromRadius: cell * 4, toRadius: cell * 0.5, width: cell * 0.1, color: CYAN, lifeMs: 500 });
  }
}

/** Gold coins and confetti falling over the whole board. */
function goldRain(fx: FxCanvas, place: Place, delayMs: number): void {
  const colors = [GOLD, GOLD, WHITE, AMBER, PINK, CYAN];
  for (let i = 0; i < 140; i++) {
    fx.particle({
      x: rnd(0, place.width), y: rnd(-place.cell * 2, place.boardTop), vx: rnd(-40, 40), vy: rnd(60, 260),
      size: place.cell * rnd(0.05, 0.13), color: colors[i % colors.length], lifeMs: rnd(1400, 2200), gravity: place.cell * 7, drag: 0.6,
      delayMs: delayMs + rnd(0, 700), shape: i % 3 ? 'dot' : 'spark',
    });
  }
}
