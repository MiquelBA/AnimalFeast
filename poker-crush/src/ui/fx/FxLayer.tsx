// Canvas over the board (with room to spill past its edges) where frames draw their effects.
import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import type { Frame } from '../frames';
import type { CellSize } from '../trace';
import { UI } from '../uiConfig';
import { FxCanvas } from './fxCanvas';
import { playFrame } from './recipes';

export function FxLayer({ frame, cell, area }: { frame: Frame; cell: CellSize; area: RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fx = useRef(new FxCanvas());

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const engine = fx.current;
    engine.attach(canvas);
    if (!canvas) return;
    const measure = () => engine.resize(canvas.clientWidth, canvas.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(canvas);
    return () => { ro.disconnect(); engine.clear(); engine.attach(null); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const board = area.current;
    if (!canvas || !board || !cell.w || reducedMotion()) return;
    const c = canvas.getBoundingClientRect();
    const b = board.getBoundingClientRect();
    const at = (p: { row: number; col: number }) => ({ x: b.left - c.left + (p.col + 0.5) * cell.w, y: b.top - c.top + (p.row + 0.5) * cell.h });
    playFrame(fx.current, frame, { at, cell: cell.w, width: c.width, height: c.height, boardTop: b.top - c.top, boardLeft: b.left - c.left, boardWidth: b.width, boardHeight: b.height });
  }, [frame, cell, area]);

  return (
    <div className="fx-layer" style={{ inset: -UI.fx.spillPx }} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
