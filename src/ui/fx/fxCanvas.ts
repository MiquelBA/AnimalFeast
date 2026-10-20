// A small canvas effects engine: particles, shock rings, light rays and vortices. Purely decorative:
// it runs its own animation frame loop only while something is alive, and never affects the game.

export type ParticleShape = 'dot' | 'spark' | 'bubble';

export interface ParticleSpec {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  lifeMs: number;
  delayMs?: number;
  /** Pixels per second², downwards. */
  gravity?: number;
  /** Fraction of speed kept per second (1 = no drag). */
  drag?: number;
  shape?: ParticleShape;
  /** Circles a centre while moving inwards (whirlpool). */
  orbit?: { cx: number; cy: number; turnsPerSecond: number; inwardPerSecond: number };
}

export interface RingSpec {
  x: number;
  y: number;
  fromRadius: number;
  toRadius: number;
  width: number;
  color: string;
  lifeMs: number;
  delayMs?: number;
}

export interface RaysSpec {
  x: number;
  y: number;
  count: number;
  length: number;
  color: string;
  lifeMs: number;
  turnsPerSecond: number;
}

export interface VortexSpec {
  x: number;
  y: number;
  radius: number;
  arms: number;
  color: string;
  lifeMs: number;
  turnsPerSecond: number;
}

type Live =
  | { kind: 'particle'; spec: ParticleSpec; age: number; x: number; y: number; vx: number; vy: number; angle: number; dist: number }
  | { kind: 'ring'; spec: RingSpec; age: number }
  | { kind: 'rays'; spec: RaysSpec; age: number }
  | { kind: 'vortex'; spec: VortexSpec; age: number };

/** Hard cap so a huge cascade can't bog down a phone. */
const MAX_LIVE = 600;

export class FxCanvas {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private live: Live[] = [];
  private raf = 0;
  private last = 0;
  private width = 0;
  private height = 0;

  attach(canvas: HTMLCanvasElement | null): void {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d') ?? null;
    if (!canvas) this.stop();
  }

  /** Matches the backing store to the canvas's CSS size (which its stylesheet sets). */
  resize(width: number, height: number): void {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = width;
    this.height = height;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  particle(spec: ParticleSpec): void {
    const o = spec.orbit;
    const angle = o ? Math.atan2(spec.y - o.cy, spec.x - o.cx) : 0;
    const dist = o ? Math.hypot(spec.x - o.cx, spec.y - o.cy) : 0;
    this.add({ kind: 'particle', spec, age: -(spec.delayMs ?? 0), x: spec.x, y: spec.y, vx: spec.vx, vy: spec.vy, angle, dist });
  }

  ring(spec: RingSpec): void {
    this.add({ kind: 'ring', spec, age: -(spec.delayMs ?? 0) });
  }

  rays(spec: RaysSpec): void {
    this.add({ kind: 'rays', spec, age: 0 });
  }

  vortex(spec: VortexSpec): void {
    this.add({ kind: 'vortex', spec, age: 0 });
  }

  clear(): void {
    this.live = [];
    this.ctx?.clearRect(0, 0, this.width, this.height);
    this.stop();
  }

  private add(item: Live): void {
    if (!this.ctx || this.live.length >= MAX_LIVE) return;
    this.live.push(item);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  private stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private frame = (now: number): void => {
    const ctx = this.ctx;
    if (!ctx) { this.raf = 0; return; }
    const dt = Math.min(50, now - this.last);
    this.last = now;
    ctx.clearRect(0, 0, this.width, this.height);
    const next: Live[] = [];
    for (const item of this.live) {
      item.age += dt;
      const life = item.spec.lifeMs;
      if (item.age >= life) continue;
      next.push(item);
      if (item.age < 0) continue;
      const t = item.age / life;
      if (item.kind === 'particle') this.drawParticle(ctx, item, dt, t);
      else if (item.kind === 'ring') drawRing(ctx, item.spec, t);
      else if (item.kind === 'rays') drawRays(ctx, item.spec, item.age, t);
      else drawVortex(ctx, item.spec, item.age, t);
    }
    this.live = next;
    this.raf = next.length ? requestAnimationFrame(this.frame) : 0;
    if (!next.length) ctx.clearRect(0, 0, this.width, this.height);
  };

  private drawParticle(ctx: CanvasRenderingContext2D, p: Extract<Live, { kind: 'particle' }>, dt: number, t: number): void {
    const s = p.spec;
    const sec = dt / 1000;
    if (s.orbit) {
      p.angle += s.orbit.turnsPerSecond * Math.PI * 2 * sec;
      p.dist = Math.max(0, p.dist - s.orbit.inwardPerSecond * sec);
      p.x = s.orbit.cx + Math.cos(p.angle) * p.dist;
      p.y = s.orbit.cy + Math.sin(p.angle) * p.dist;
    } else {
      const keep = (s.drag ?? 1) ** sec;
      p.vx *= keep;
      p.vy = p.vy * keep + (s.gravity ?? 0) * sec;
      p.x += p.vx * sec;
      p.y += p.vy * sec;
    }
    const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    ctx.globalAlpha = Math.max(0, alpha);
    if (s.shape === 'spark') {
      const speed = Math.hypot(p.vx, p.vy) || 1;
      const len = Math.min(s.size * 4, speed * 0.04 + s.size);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size * 0.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx / speed) * len, p.y - (p.vy / speed) * len);
      ctx.stroke();
    } else if (s.shape === 'bubble') {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(1, s.size * 0.18);
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s.size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

function drawRing(ctx: CanvasRenderingContext2D, s: RingSpec, t: number): void {
  const r = s.fromRadius + (s.toRadius - s.fromRadius) * easeOut(t);
  ctx.globalAlpha = 1 - t;
  ctx.strokeStyle = s.color;
  ctx.lineWidth = s.width * (1 - t * 0.7);
  ctx.beginPath();
  ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawRays(ctx: CanvasRenderingContext2D, s: RaysSpec, ageMs: number, t: number): void {
  const spin = (ageMs / 1000) * s.turnsPerSecond * Math.PI * 2;
  const grow = easeOut(Math.min(1, t * 2.5));
  ctx.globalAlpha = (1 - t) * 0.55;
  ctx.fillStyle = s.color;
  for (let i = 0; i < s.count; i++) {
    const a = spin + (i / s.count) * Math.PI * 2;
    const half = Math.PI / s.count / 2.6;
    const len = s.length * grow * (i % 2 ? 0.75 : 1);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(a - half) * len, s.y + Math.sin(a - half) * len);
    ctx.lineTo(s.x + Math.cos(a + half) * len, s.y + Math.sin(a + half) * len);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVortex(ctx: CanvasRenderingContext2D, s: VortexSpec, ageMs: number, t: number): void {
  const spin = (ageMs / 1000) * s.turnsPerSecond * Math.PI * 2;
  const radius = s.radius * (t < 0.2 ? easeOut(t / 0.2) : 1 - 0.6 * ((t - 0.2) / 0.8));
  ctx.strokeStyle = s.color;
  ctx.lineCap = 'round';
  for (let arm = 0; arm < s.arms; arm++) {
    const base = spin + (arm / s.arms) * Math.PI * 2;
    // Each arm is a spiral drawn as short segments, fading towards the centre.
    let px = s.x + Math.cos(base) * radius;
    let py = s.y + Math.sin(base) * radius;
    const steps = 18;
    for (let i = 1; i <= steps; i++) {
      const f = i / steps;
      const a = base + f * Math.PI * 1.6;
      const r = radius * (1 - f);
      const x = s.x + Math.cos(a) * r;
      const y = s.y + Math.sin(a) * r;
      ctx.globalAlpha = (1 - t) * (1 - f * 0.7) * 0.9;
      ctx.lineWidth = Math.max(1, (radius / 9) * (1 - f * 0.6));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
      px = x;
      py = y;
    }
  }
  ctx.globalAlpha = 1;
}
