// The sea behind the game: bubbles that rise all the time and boil up on big moments
// (reaction waves, whirlpools, frenzies), with a glow that lights up the water.
import { useEffect, useRef } from 'react';
import { UI } from '../uiConfig';
import { ambient } from './ambientEnergy';

interface Bubble { x: number; y: number; r: number; speed: number; wobble: number; phase: number }

export function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || reducedMotion()) return;
    const A = UI.ambient;
    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const spawn = (anywhere: boolean): Bubble => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : height + 10,
      r: A.minRadius + Math.random() * (A.maxRadius - A.minRadius),
      speed: A.speed * (0.6 + Math.random() * 0.8),
      wobble: 4 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
    });
    let bubbles: Bubble[] = Array.from({ length: A.bubbles }, () => spawn(true));
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      ambient.energy = Math.max(0, ambient.energy - A.decayPerSecond * dt);
      const energy = ambient.energy;
      const boost = 1 + energy * A.speedBoost;
      ctx.clearRect(0, 0, width, height);
      if (energy > 0.02) {
        const g = ctx.createRadialGradient(width / 2, height * 0.62, 0, width / 2, height * 0.62, height * 0.7);
        g.addColorStop(0, `rgba(255, 211, 78, ${Math.min(0.35, energy * A.glow)})`);
        g.addColorStop(1, 'rgba(255, 211, 78, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, width, height);
      }
      const wanted = Math.round(A.bubbles * (1 + energy * A.countBoost));
      while (bubbles.length < wanted) bubbles.push(spawn(false));
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.2;
      const kept: Bubble[] = [];
      for (const b of bubbles) {
        b.y -= b.speed * boost * dt;
        b.phase += dt * 2;
        // A bubble that reaches the top comes back from the bottom, unless the boil is over.
        if (b.y < -10) {
          if (bubbles.length > wanted && kept.length >= wanted) continue;
          Object.assign(b, spawn(false));
        }
        ctx.beginPath();
        ctx.arc(b.x + Math.sin(b.phase) * b.wobble, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
        kept.push(b);
      }
      bubbles = kept;
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    start();
    return () => {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="ambient" aria-hidden="true" />;
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
