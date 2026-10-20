// The board: cards, tracing with the finger, and the frame-by-frame animations (FLIP with the Web
// Animations API). Effects are drawn on a canvas over the board.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { samePos } from '../engine/board';
import { handOf, handPoints, pathCards, traceStatus, type TraceStatus } from '../engine/game';
import type { Board as BoardData, Card, GameConfig, HandType, Pos } from '../engine/types';
import { CardFace } from './CardFace';
import { FxLayer } from './fx/FxLayer';
import type { Frame, Ghost } from './frames';
import { cellCentre, cellsAlong, extendPath, hitCell, type CellSize, type Point } from './trace';
import { UI } from './uiConfig';

interface BoardProps {
  readonly board: BoardData;
  readonly frame: Frame;
  readonly config: GameConfig;
  readonly hint: readonly Pos[] | null;
  readonly enabled: boolean;
  readonly onPlay: (path: readonly Pos[]) => boolean;
  readonly onActivity: () => void;
  /** The trace changed: its length, status and the hand it makes. */
  readonly onTrace: (length: number, status: TraceStatus | null, hand: HandType | null, points: number, grew: boolean) => void;
  readonly onReject: () => void;
}

const px = (p: { row: number; col: number }, c: CellSize) => `translate3d(${p.col * c.w}px, ${p.row * c.h}px, 0)`;

export function Board({ board, frame, config, hint, enabled, onPlay, onActivity, onTrace, onReject }: BoardProps) {
  const rows = config.rows;
  const cols = config.cols;
  const areaRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState<CellSize>({ w: 0, h: 0 });
  const tileEls = useRef(new Map<number, HTMLDivElement>());
  const prevPos = useRef(new Map<number, Pos>());
  const [path, setPath] = useState<readonly Pos[]>([]);
  const pathRef = useRef<readonly Pos[]>([]);
  const pointerId = useRef<number | null>(null);
  const lastPoint = useRef<Point | null>(null);
  const tailRef = useRef<SVGLineElement>(null);

  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setCell({ w: el.clientWidth / cols, h: el.clientHeight / rows });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols, rows]);

  // Move every card from where it was (or from above the board) to where it is now.
  useLayoutEffect(() => {
    if (!cell.w) return;
    for (const t of frame.tiles) {
      const el = tileEls.current.get(t.card.id);
      const from = prevPos.current.get(t.card.id) ?? frame.entering.get(t.card.id);
      if (!el || !from || samePos(from, t.pos) || !frame.duration) continue;
      const to = px(t.pos, cell);
      const keyframes: Keyframe[] = frame.kind === 'fall'
        ? [
            { transform: px(from, cell), offset: 0, easing: 'cubic-bezier(.5,0,1,.6)' },
            { transform: to, offset: 0.7, easing: 'ease-out' },
            { transform: `translate3d(${t.pos.col * cell.w}px, ${(t.pos.row - 0.1) * cell.h}px, 0)`, offset: 0.85, easing: 'ease-in' },
            { transform: to, offset: 1 },
          ]
        : [{ transform: `${px(from, cell)} rotate(0deg)` }, { transform: `${px({ row: (from.row + t.pos.row) / 2 - 0.4, col: (from.col + t.pos.col) / 2 }, cell)} rotate(${(t.card.id % 2 ? 1 : -1) * 25}deg)` }, { transform: `${to} rotate(0deg)` }];
      el.animate(keyframes, { duration: frame.duration, easing: frame.kind === 'fall' ? 'linear' : 'ease-in-out' });
    }
    prevPos.current = new Map(frame.tiles.map((t) => [t.card.id, t.pos]));
    // Big hands shake the screen and punch the board.
    const tier = frame.kind === 'collect' ? frame.hand?.tier ?? 0 : frame.kind === 'blast' ? 3 : -1;
    if (tier >= 0) shake(tier, boardRef.current);
  }, [frame, cell]);

  const report = (next: readonly Pos[], grew: boolean) => {
    if (!next.length) { onTrace(0, null, null, 0, grew); return; }
    const hand = handOf(board, next, config);
    const points = hand ? handPoints(hand, pathCards(board, next)!, config) : 0;
    onTrace(next.length, traceStatus(board, next, config), hand, points, grew);
  };

  const setTrace = (next: readonly Pos[]) => {
    if (next === pathRef.current) return;
    const grew = next.length > pathRef.current.length;
    pathRef.current = next;
    setPath(next);
    report(next, grew);
  };

  const moveTail = (to: Point | null) => {
    const line = tailRef.current;
    const p = pathRef.current;
    if (!line) return;
    if (!to || !p.length) { line.setAttribute('visibility', 'hidden'); return; }
    const from = cellCentre(p[p.length - 1], cell);
    line.setAttribute('x1', String(from.x));
    line.setAttribute('y1', String(from.y));
    line.setAttribute('x2', String(to.x));
    line.setAttribute('y2', String(to.y));
    line.setAttribute('visibility', 'visible');
  };

  const local = (e: { clientX: number; clientY: number }): Point => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const occupied = (p: Pos) => Boolean(board[p.row]?.[p.col]);

  const shakeCards = useCallback((cells: readonly Pos[]) => {
    for (const p of cells) {
      const c = board[p.row]?.[p.col];
      const inner = c ? tileEls.current.get(c.id)?.firstElementChild : null;
      inner?.animate(
        [0, -0.08, 0.08, -0.05, 0.05, 0].map((dx) => ({ transform: `translateX(${dx * cell.w}px)` })),
        { duration: UI.anim.shake, easing: 'ease-in-out' },
      );
    }
  }, [board, cell]);

  const cancel = useCallback(() => {
    pointerId.current = null;
    lastPoint.current = null;
    pathRef.current = [];
    setPath([]);
    tailRef.current?.setAttribute('visibility', 'hidden');
  }, []);

  // A trace cut short (pause, end of game, a move playing) is dropped.
  useEffect(() => {
    if (!enabled && pathRef.current.length) {
      cancel();
      onTrace(0, null, null, 0, false);
    }
  }, [enabled, cancel, onTrace]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || !cell.w || pointerId.current !== null) return;
    e.preventDefault();
    onActivity();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerId.current = e.pointerId;
    const pt = local(e);
    lastPoint.current = pt;
    const hit = hitCell(pt, cell, rows, cols, UI.hitRadius);
    setTrace(hit && occupied(hit) ? [hit] : []);
    moveTail(pt);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return;
    if (!enabled) { cancel(); return; }
    const samples = e.nativeEvent.getCoalescedEvents?.() ?? [];
    let next = pathRef.current;
    let pt = lastPoint.current;
    for (const s of samples.length ? samples : [e.nativeEvent]) {
      const p = local(s);
      for (const hit of cellsAlong(pt ?? p, p, cell, rows, cols, UI.hitRadius)) {
        if (occupied(hit)) next = extendPath(next, hit, config.maxLength);
      }
      pt = p;
    }
    lastPoint.current = pt;
    setTrace(next);
    moveTail(pt);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return;
    const traced = pathRef.current;
    cancel();
    onTrace(0, null, null, 0, false);
    if (!traced.length || !enabled) return;
    const played = handOf(board, traced, config) !== null && onPlay(traced);
    if (!played && traced.length > 1) {
      shakeCards(traced);
      onReject();
    }
  };

  const shownPath = enabled ? path : [];
  const status = shownPath.length ? traceStatus(board, shownPath, config) : null;
  const marked = new Set(shownPath.map((p) => `${p.row},${p.col}`));
  const hinted = new Set((hint ?? []).map((p) => `${p.row},${p.col}`));
  const centres = shownPath.map((p) => cellCentre(p, cell));
  const tier = frame.hand?.tier ?? 0;

  return (
    <div className="board" ref={boardRef}>
      <div
        ref={areaRef}
        className="board-area"
        style={{ aspectRatio: `${cols} / ${rows * UI.cellAspect}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {cell.w > 0 && frame.tiles.map((t) => {
          const key = `${t.pos.row},${t.pos.col}`;
          return (
            <Tile
              key={t.card.id}
              card={t.card}
              pos={t.pos}
              cell={cell}
              mark={marked.has(key) ? status : null}
              order={shownPath.findIndex((p) => samePos(p, t.pos))}
              hinted={!shownPath.length && hinted.has(key)}
              register={tileEls}
            />
          );
        })}
        {cell.w > 0 && frame.ghosts.map((g) => (
          <GhostCard key={`${frame.id}-${g.card.id}`} ghost={g} cell={cell} duration={frame.duration} tier={tier} />
        ))}
        {frame.kind === 'collect' && (
          <div key={`${frame.id}-flash`} className="board-flash" style={{ ['--flash' as string]: UI.flash[tier], animationDuration: `${frame.duration}ms` }} />
        )}
        {frame.kind === 'blast' && (
          <div key={`${frame.id}-flash`} className="board-flash board-flash-blast" style={{ ['--flash' as string]: 0.6, animationDuration: `${frame.duration}ms` }} />
        )}
        <svg className={`trace trace-${status ?? 'none'}`} width="100%" height="100%">
          {centres.length > 1 && <polyline points={centres.map((c) => `${c.x},${c.y}`).join(' ')} strokeWidth={cell.w * 0.14} />}
          <line ref={tailRef} visibility="hidden" strokeWidth={cell.w * 0.09} />
          {centres.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={cell.w * 0.1} />)}
        </svg>
      </div>
      <FxLayer frame={frame} cell={cell} area={areaRef} />
    </div>
  );
}

interface TileProps {
  readonly card: Card;
  readonly pos: Pos;
  readonly cell: CellSize;
  readonly mark: TraceStatus | null;
  readonly order: number;
  readonly hinted: boolean;
  readonly register: RefObject<Map<number, HTMLDivElement>>;
}

function Tile({ card, pos, cell, mark, order, hinted, register }: TileProps) {
  const ref = (el: HTMLDivElement | null) => {
    if (el) register.current.set(card.id, el);
    else register.current.delete(card.id);
  };
  const classes = ['tile', mark && `mark mark-${mark}`, hinted && 'hint'].filter(Boolean).join(' ');
  return (
    <div ref={ref} className={classes} style={{ width: cell.w, height: cell.h, transform: px(pos, cell), ['--order' as string]: order }}>
      <div className="tile-inner">
        <CardFace card={card} />
      </div>
    </div>
  );
}

function GhostCard({ ghost, cell, duration, tier }: { ghost: Ghost; cell: CellSize; duration: number; tier: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = px(ghost.from, cell);
    const to = px(ghost.to, cell);
    if (ghost.kind === 'collect') {
      // The hand's cards lift and glow, then rush together and burst.
      const glow = tier >= 2 ? 'drop-shadow(0 0 14px #FFD54A) brightness(1.25)' : 'drop-shadow(0 0 8px #FFF3B0) brightness(1.15)';
      const lift = 1.12 + tier * 0.05;
      const stagger = ghost.index * Math.min(50, duration / 12);
      el.animate([
        { transform: `${from} scale(1) rotate(0deg)`, filter: 'none', opacity: 1 },
        { transform: `${from} scale(${lift}) rotate(${ghost.index % 2 ? 6 : -6}deg)`, filter: glow, opacity: 1, offset: 0.35 },
        { transform: `${to} scale(${0.9 + tier * 0.1}) rotate(0deg)`, filter: glow, opacity: 1, offset: 0.72 },
        { transform: `${to} scale(${1.5 + tier * 0.2}) rotate(0deg)`, filter: 'brightness(3)', opacity: 0 },
      ], { duration: duration - stagger, delay: stagger, easing: 'cubic-bezier(.3,0,.3,1)', fill: 'both' });
    } else {
      const spin = (ghost.card.id % 2 ? 1 : -1) * (360 + (ghost.index % 3) * 120);
      el.animate([
        { transform: `${from} scale(1) rotate(0deg)`, opacity: 1, filter: 'brightness(1)' },
        { transform: `${from} scale(1.25) rotate(${spin / 12}deg)`, opacity: 1, filter: 'brightness(2)', offset: 0.15 },
        { transform: `${to} scale(0.4) rotate(${spin}deg)`, opacity: 0, filter: 'brightness(1.5)' },
      ], { duration, delay: Math.min(ghost.index * 18, duration / 3), easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'both' });
    }
  }, [ghost, cell, duration, tier]);
  return (
    <div ref={ref} className="tile ghost" style={{ width: cell.w, height: cell.h, transform: px(ghost.from, cell) }}>
      <div className="tile-inner"><CardFace card={ghost.card} /></div>
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

/** Shakes the HUD and the stage, and punches the board's scale. */
function shake(tier: number, board: HTMLElement | null): void {
  if (reducedMotion()) return;
  const a = UI.shakePx[Math.min(tier, UI.shakePx.length - 1)];
  if (a > 0) {
    const t = tier >= 3 ? 1.5 : 0;
    const path: [number, number, number][] = [[0, 0, 0], [-a, a * 0.6, -t], [a * 0.8, -a * 0.5, t], [-a * 0.55, a * 0.35, -t * 0.6], [a * 0.35, -a * 0.2, t * 0.3], [-a * 0.15, a * 0.1, 0], [0, 0, 0]];
    const frames = path.map(([x, y, r]) => ({ transform: `translate(${x}px, ${y}px) rotate(${r}deg)` }));
    for (const el of document.querySelectorAll<HTMLElement>('.hud, .stage')) el.animate(frames, { duration: 420, easing: 'ease-out', delay: tier >= 2 ? 160 : 0 });
  }
  const punch = 1 + UI.punch[Math.min(tier, UI.punch.length - 1)];
  board?.animate([{ scale: '1' }, { scale: String(punch), filter: 'brightness(1.2)' }, { scale: '1' }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)', delay: tier >= 2 ? 160 : 0 });
}
