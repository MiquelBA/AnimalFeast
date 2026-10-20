// The board: tiles, tracing with the finger, and event-driven animations (FLIP with the Web Animations API).
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import { samePos } from '../engine/board';
import { traceStatus, type TraceStatus } from '../engine/chains';
import { isNearFrenzy, minEnergyGain } from '../engine/score';
import type { Animal, Board as BoardData, GameConfig, Pos } from '../engine/types';
import { animalLook, type Theme } from '../themes';
import type { Ghost } from './frames';
import { STRINGS } from './strings';
import { cellCentre, cellsAlong, extendPath, hitCell, type Point } from './trace';
import { UI } from './uiConfig';
import type { Display, Floater } from './useGame';

interface BoardProps {
  readonly board: BoardData;
  readonly display: Display;
  readonly config: GameConfig;
  readonly theme: Theme;
  readonly hint: readonly Pos[] | null;
  readonly floaters: readonly Floater[];
  readonly enabled: boolean;
  readonly onPlay: (path: readonly Pos[]) => boolean;
  readonly onActivity: () => void;
  /** A cell was added to the trace (for sound and vibration). */
  readonly onTraceStep?: (length: number, status: TraceStatus) => void;
  /** A traced chain was released but can't be played. */
  readonly onReject?: () => void;
}

const px = (p: Pos, cell: number) => `translate3d(${p.col * cell}px, ${p.row * cell}px, 0)`;

export function Board({ board, display, config, theme, hint, floaters, enabled, onPlay, onActivity, onTraceStep, onReject }: BoardProps) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const areaRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState(0);
  const tileEls = useRef(new Map<number, HTMLDivElement>());
  const prevPos = useRef(new Map<number, Pos>());
  const [path, setPath] = useState<readonly Pos[]>([]);
  const pathRef = useRef<readonly Pos[]>([]);
  const pointerId = useRef<number | null>(null);
  const lastPoint = useRef<Point | null>(null);
  const tailRef = useRef<SVGLineElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const maxLength = Math.max(...config.chainLengths);

  // Cell size follows the board's rendered width.
  useLayoutEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const measure = () => setCell(el.clientWidth / cols);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cols]);

  // Move tiles from where they were (or from above the board) to where they are now.
  useLayoutEffect(() => {
    if (!cell) return;
    for (const t of display.tiles) {
      const el = tileEls.current.get(t.animal.id);
      const from = prevPos.current.get(t.animal.id) ?? display.entering.get(t.animal.id);
      if (!el || !from || samePos(from, t.pos) || !display.duration) continue;
      const to = px(t.pos, cell);
      const keyframes: Keyframe[] = display.kind === 'fall'
        ? [
            { transform: px(from, cell), offset: 0, easing: 'cubic-bezier(.5,0,1,.6)' },
            { transform: to, offset: 0.72, easing: 'ease-out' },
            { transform: `translate3d(${t.pos.col * cell}px, ${(t.pos.row - 0.08) * cell}px, 0)`, offset: 0.86, easing: 'ease-in' },
            { transform: to, offset: 1 },
          ]
        : [{ transform: px(from, cell) }, { transform: to }];
      el.animate(keyframes, { duration: display.duration, easing: display.kind === 'fall' ? 'linear' : 'ease-in-out' });
    }
    for (const e of display.effects) {
      if (e.type !== 'pop') continue;
      tileEls.current.get(e.id)?.firstElementChild?.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
        { duration: UI.anim.pop, easing: 'ease-out', composite: 'add' },
      );
    }
    prevPos.current = new Map(display.tiles.map((t) => [t.animal.id, t.pos]));
    // Big moments shake the board a little.
    const amplitude = display.kind === 'frenzy' || display.kind === 'whirl' ? UI.shake.frenzy : longChain(display) ? UI.shake.longChain : 0;
    if (amplitude && boardRef.current) {
      const a = amplitude * cell;
      boardRef.current.animate(
        [[0, 0], [-a, a / 2], [a, -a / 2], [-a / 2, a / 3], [a / 3, 0], [0, 0]].map(([x, y]) => ({ transform: `translate(${x}px, ${y}px)` })),
        { duration: UI.anim.shake, easing: 'ease-out' },
      );
    }
  }, [display, cell]);

  const setTrace = (next: readonly Pos[]) => {
    if (next === pathRef.current) return;
    const grew = next.length > pathRef.current.length;
    pathRef.current = next;
    setPath(next);
    if (grew) onTraceStep?.(next.length, traceStatus(board, next, config));
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

  const shake = useCallback((cells: readonly Pos[]) => {
    for (const p of cells) {
      const a = board[p.row]?.[p.col];
      const inner = a ? tileEls.current.get(a.id)?.firstElementChild : null;
      inner?.animate(
        [0, -0.06, 0.06, -0.04, 0.04, 0].map((dx) => ({ transform: `translateX(${dx * cell}px)` })),
        { duration: UI.anim.shake, easing: 'ease-in-out', composite: 'add' },
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

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!enabled || !cell || pointerId.current !== null) return;
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
        if (occupied(hit)) next = extendPath(next, hit, config.adjacency, maxLength);
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
    if (!traced.length || !enabled) return;
    const played = traceStatus(board, traced, config) === 'valid' && onPlay(traced);
    if (!played && traced.length > 1) {
      shake(traced);
      onReject?.();
    }
  };

  // A trace interrupted by a pause or the end of the game is simply not shown.
  const shownPath = enabled ? path : [];
  const status: TraceStatus = traceStatus(board, shownPath, config);
  const marked = new Set(shownPath.map((p) => `${p.row},${p.col}`));
  const hinted = new Set((hint ?? []).map((p) => `${p.row},${p.col}`));
  const flashes = display.effects.filter((e) => e.type === 'flash');
  const centres = shownPath.map((p) => cellCentre(p, cell));

  return (
    <div className="board" ref={boardRef}>
      <div
        ref={areaRef}
        className="board-area"
        style={{ aspectRatio: `${cols} / ${rows}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={cancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: rows * cols }, (_, i) => (
          <div key={i} className="cell-bg" style={{ width: cell, height: cell, transform: px({ row: Math.floor(i / cols), col: i % cols }, cell) }} />
        ))}
        {cell > 0 && display.tiles.map((t) => {
          const key = `${t.pos.row},${t.pos.col}`;
          const idle = display.kind === 'idle' || enabled;
          return (
            <Tile
              key={t.animal.id}
              animal={t.animal}
              pos={t.pos}
              cell={cell}
              theme={theme}
              config={config}
              mark={idle && marked.has(key) ? status : null}
              hinted={idle && !shownPath.length && hinted.has(key)}
              register={tileEls}
            />
          );
        })}
        {cell > 0 && display.ghosts.map((g, i) => (
          <GhostTile key={`${display.frameId}-${g.animal.id}`} ghost={g} index={i} cell={cell} theme={theme} tierCount={config.tiers.length} duration={display.duration} />
        ))}
        {cell > 0 && flashes.map((f, i) => f.type === 'flash' && (
          <div key={`${display.frameId}-f${i}`} className="flash" style={{ left: (f.pos.col + 0.5) * cell, top: (f.pos.row + 0.5) * cell, width: cell, height: cell, animationDuration: `${UI.anim.frenzy}ms` }} />
        ))}
        <svg className={`trace trace-${status}`} width="100%" height="100%">
          {centres.length > 1 && (
            <polyline points={centres.map((c) => `${c.x},${c.y}`).join(' ')} strokeWidth={cell * 0.16} />
          )}
          <line ref={tailRef} visibility="hidden" strokeWidth={cell * 0.1} />
          {centres.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={cell * 0.11} />)}
        </svg>
      </div>
      <FloaterLayer floaters={floaters} cell={cell} />
      {cell > 0 && <Particles display={display} cell={cell} />}
    </div>
  );
}

interface TileProps {
  readonly animal: Animal;
  readonly pos: Pos;
  readonly cell: number;
  readonly theme: Theme;
  readonly config: GameConfig;
  readonly mark: TraceStatus | null;
  readonly hinted: boolean;
  readonly register: RefObject<Map<number, HTMLDivElement>>;
}

const Tile = memo(function Tile({ animal, pos, cell, theme, config, mark, hinted, register }: TileProps) {
  const level = animalLook(theme, animal, config.tiers.length);
  const canCharge = minEnergyGain(animal.tier, config) > 0;
  const ratio = canCharge ? Math.min(1, animal.energy / config.frenzyThreshold) : 0;
  const pips = Math.min(UI.energyPips, Math.floor(ratio * UI.energyPips));
  const near = isNearFrenzy(animal, config);
  const ref = (el: HTMLDivElement | null) => {
    if (el) register.current.set(animal.id, el);
    else register.current.delete(animal.id);
  };
  const classes = ['tile', mark && `mark-${mark}`, hinted && 'hint', near && 'near', animal.golden && 'golden', animal.wild && !animal.whirl && 'wild', animal.whirl && 'whirl']
    .filter(Boolean).join(' ');
  return (
    <div ref={ref} className={classes} style={{ width: cell, height: cell, transform: px(pos, cell) }} data-tier={animal.tier}>
      <div className="tile-inner">
        <div className="tile-art" style={{ transform: `scale(${1 + UI.energyScale * ratio})`, filter: ratio ? `brightness(${1 + 0.3 * ratio}) saturate(${1 + 0.4 * ratio})` : undefined }}>
          {renderSprite(level.sprite, { color: level.color })}
        </div>
        {animal.golden && <span className="golden-badge" aria-hidden="true">★</span>}
        {canCharge && (
          <div className="pips" aria-hidden="true">
            {Array.from({ length: UI.energyPips }, (_, i) => <span key={i} className={i < pips ? 'on' : ''} />)}
          </div>
        )}
      </div>
    </div>
  );
});

function GhostTile({ ghost, index, cell, theme, tierCount, duration }: { ghost: Ghost; index: number; cell: number; theme: Theme; tierCount: number; duration: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const level = animalLook(theme, ghost.animal, tierCount);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = px(ghost.from, cell);
    const to = px(ghost.to, cell);
    const stagger = Math.min(index * 30, duration / 3);
    const opts: KeyframeAnimationOptions = { duration: duration - stagger, delay: stagger, easing: 'ease-in', fill: 'both' };
    if (ghost.kind === 'swallow') el.animate([{ transform: `${from} scale(1)`, opacity: 1 }, { transform: `${to} scale(0.3)`, opacity: 0.2 }], opts);
    else if (ghost.kind === 'leave') el.animate([{ transform: `${from} scale(1)`, opacity: 1 }, { transform: `translate3d(${ghost.from.col * cell}px, ${(ghost.from.row - 0.7) * cell}px, 0) scale(0.8)`, opacity: 0 }], opts);
    else el.animate([{ transform: `${from} scale(1)`, opacity: 1 }, { transform: `${from} scale(1.6)`, opacity: 0 }], { ...opts, easing: 'ease-out' });
  }, [ghost, index, cell, duration]);
  return (
    <div ref={ref} className="tile ghost" style={{ width: cell, height: cell, transform: px(ghost.from, cell) }}>
      <div className="tile-inner"><div className="tile-art">{renderSprite(level.sprite, { color: level.color })}</div></div>
    </div>
  );
}

/** A chain of 4 or more (the eat frame swallows 3+ prey). */
function longChain(display: Display): boolean {
  return display.kind === 'eat' && display.ghosts.filter((g) => g.kind === 'swallow').length >= 3;
}

const PARTICLE_COLORS = ['var(--gold)', 'var(--foam)', 'var(--white)', 'var(--green)'];

/** A burst of small dots where a chain ends or a frenzy explodes. */
interface Burst {
  readonly id: number;
  readonly pos: Pos;
  readonly count: number;
  readonly reach: number;
  readonly duration: number;
}

/** The particle burst a frame starts, if any. */
function burstOf(display: Display): Burst | null {
  let pos: Pos | undefined;
  if (display.kind === 'eat') {
    const pts = display.effects.find((e) => e.type === 'points');
    pos = pts?.type === 'points' ? pts.pos : undefined;
    const count = longChain(display) ? UI.particles.longChain : UI.particles.chain;
    return pos ? { id: display.frameId, pos, count, reach: UI.particles.reach, duration: UI.anim.eat + 180 } : null;
  }
  if (display.kind === 'frenzy' || display.kind === 'whirl') {
    const flash = display.effects.find((e) => e.type === 'flash');
    pos = flash?.type === 'flash' ? flash.pos : undefined;
    return pos ? { id: display.frameId, pos, count: UI.particles.frenzy, reach: UI.particles.frenzyReach, duration: UI.anim.frenzy } : null;
  }
  return null;
}

/** Particle bursts outlive their frame: the fall that follows an eat doesn't cut them short. */
function Particles({ display, cell }: { display: Display; cell: number }) {
  const [bursts, setBursts] = useState<readonly Burst[]>([]);
  const [seen, setSeen] = useState(display.frameId);
  if (seen !== display.frameId) {
    setSeen(display.frameId);
    const burst = burstOf(display);
    if (burst) setBursts((b) => [...b, burst]);
  }
  useEffect(() => {
    if (!bursts.length) return;
    const last = bursts[bursts.length - 1];
    const id = window.setTimeout(() => setBursts((b) => b.filter((x) => x.id > last.id)), last.duration);
    return () => window.clearTimeout(id);
  }, [bursts]);
  if (!bursts.length) return null;
  return (
    <div className="particles" aria-hidden="true">
      {bursts.flatMap((burst) => Array.from({ length: burst.count }, (_, i) => {
        const angle = (i / burst.count) * Math.PI * 2 + (i % 3) * 0.35;
        const dist = cell * burst.reach * (0.6 + ((i * 37) % 10) / 25);
        const size = cell * (i % 4 === 0 ? UI.particles.big : UI.particles.small);
        return (
          <span
            key={`${burst.id}-${i}`}
            style={{
              left: (burst.pos.col + 0.5) * cell,
              top: (burst.pos.row + 0.5) * cell,
              background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
              width: size,
              height: size,
              animationDuration: `${burst.duration}ms`,
              ['--dx' as string]: `${Math.cos(angle) * dist}px`,
              ['--dy' as string]: `${Math.sin(angle) * dist}px`,
            }}
          />
        );
      }))}
    </div>
  );
}

function floaterText(f: Floater): { text: string; className: string } | null {
  const e = f.effect;
  if (e.type === 'points') return { text: `+${e.points}`, className: 'float-points' };
  if (e.type !== 'text') return null;
  switch (e.text) {
    case 'frenzy': return { text: STRINGS.frenzy, className: 'float-banner float-frenzy' };
    case 'combo': {
      if (e.value < 2) return null;
      const key = UI.comboTextKeys[Math.min(e.value - 2, UI.comboTextKeys.length - 1)];
      return { text: STRINGS[key], className: 'float-banner float-combo' };
    }
    case 'timeBonus': return { text: STRINGS.timeBonus(e.value / 1000), className: 'float-banner float-time' };
    case 'multiplier': return { text: STRINGS.times(e.value), className: 'float-points float-mult' };
    case 'golden': return { text: STRINGS.golden(e.value), className: 'float-banner float-golden' };
    case 'shuffle': return { text: STRINGS.shuffle, className: 'float-banner float-shuffle' };
    case 'whirl': return { text: STRINGS.whirl, className: 'float-banner float-whirl' };
    case 'wave': return { text: STRINGS.wave(e.value), className: 'float-banner float-wave' };
  }
}

function FloaterLayer({ floaters, cell }: { floaters: readonly Floater[]; cell: number }) {
  return (
    <div className="floaters" aria-live="polite">
      {floaters.map((f) => {
        const shown = floaterText(f);
        if (!shown) return null;
        const pos = f.effect.type === 'points' || (f.effect.type === 'text' && f.effect.text === 'multiplier') ? f.effect.pos : undefined;
        const style = pos
          ? { left: (pos.col + 0.5) * cell, top: (pos.row + (f.effect.type === 'text' ? 0.85 : 0.4)) * cell, animationDuration: `${UI.anim.floatText}ms` }
          : { animationDuration: `${UI.anim.floatText}ms` };
        return <div key={f.id} className={`floater ${shown.className}`} style={style}>{shown.text}</div>;
      })}
    </div>
  );
}
