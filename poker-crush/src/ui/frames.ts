// Turns a move's events into animation frames. Each frame is a board to show plus the cards that
// are leaving it; the board draws a frame by moving every card from where it was to where it is now.
import { applyGravity, mutableCopy } from '../engine/board';
import type { BlastKind, Board, Card, Cell, GameEvent, HandType, Pos } from '../engine/types';
import { HAND_TIER, UI } from './uiConfig';

export interface Tile {
  readonly card: Card;
  readonly pos: Pos;
}

export interface Ghost {
  readonly card: Card;
  readonly from: Pos;
  /** Where it flies to (cells, may be fractional). */
  readonly to: { readonly row: number; readonly col: number };
  readonly kind: 'collect' | 'blast';
  readonly index: number;
}

export interface HandInfo {
  readonly hand: HandType;
  readonly tier: number;
  readonly path: readonly Pos[];
  readonly points: number;
  readonly combo: number;
  readonly comboMultiplier: number;
  readonly goldenMultiplier: number;
  /** Where the hand's cards gather (cells, fractional). */
  readonly centre: { readonly row: number; readonly col: number };
}

export interface Frame {
  readonly id: number;
  readonly kind: 'idle' | 'collect' | 'blast' | 'fall' | 'shuffle';
  readonly tiles: readonly Tile[];
  readonly ghosts: readonly Ghost[];
  /** New cards and where they come in from (above the board). */
  readonly entering: ReadonlyMap<number, Pos>;
  readonly duration: number;
  readonly hand?: HandInfo;
  readonly blast?: { readonly kind: BlastKind; readonly origin: Pos; readonly count: number; readonly points: number };
}

let nextFrameId = 1;

export function tilesOf(board: Board): Tile[] {
  const tiles: Tile[] = [];
  board.forEach((row, r) => row.forEach((card, c) => card && tiles.push({ card, pos: { row: r, col: c } })));
  return tiles;
}

export function idleFrame(board: Board): Frame {
  return { id: nextFrameId++, kind: 'idle', tiles: tilesOf(board), ghosts: [], entering: new Map(), duration: 0 };
}

function centreOf(path: readonly Pos[]) {
  return {
    row: path.reduce((s, p) => s + p.row, 0) / path.length,
    col: path.reduce((s, p) => s + p.col, 0) / path.length,
  };
}

/** The frames of one move, starting from the board before it. */
export function moveFrames(before: Board, events: readonly GameEvent[], after: Board): Frame[] {
  const frames: Frame[] = [];
  const board: Cell[][] = mutableCopy(before);
  const comboEvent = events.find((e) => e.type === 'combo');
  const combo = comboEvent?.type === 'combo' ? comboEvent.count : 1;
  let tier = 0;
  for (const e of events) {
    if (e.type === 'hand') {
      tier = HAND_TIER[e.hand];
      const centre = centreOf(e.path);
      for (const p of e.path) board[p.row][p.col] = null;
      frames.push({
        id: nextFrameId++,
        kind: 'collect',
        tiles: tilesOf(board),
        ghosts: e.path.map((p, index) => ({ card: e.cards[index], from: p, to: centre, kind: 'collect', index })),
        entering: new Map(),
        duration: UI.anim.collect[tier],
        hand: {
          hand: e.hand, tier, path: e.path, points: e.points, combo,
          comboMultiplier: e.comboMultiplier, goldenMultiplier: e.goldenMultiplier, centre,
        },
      });
    } else if (e.type === 'blast') {
      for (const { pos } of e.cells) board[pos.row][pos.col] = null;
      frames.push({
        id: nextFrameId++,
        kind: 'blast',
        tiles: tilesOf(board),
        ghosts: e.cells.map(({ card, pos }, index) => {
          // Thrown outwards, away from where the blast started.
          const dr = pos.row - e.origin.row, dc = pos.col - e.origin.col;
          const len = Math.hypot(dr, dc) || 1;
          return { card, from: pos, to: { row: pos.row + (dr / len) * 2.5 - 1, col: pos.col + (dc / len) * 2.5 }, kind: 'blast', index };
        }),
        entering: new Map(),
        duration: UI.anim.blast,
        blast: { kind: e.kind, origin: e.origin, count: e.cells.length, points: e.points },
      });
    } else if (e.type === 'fall') {
      applyGravity(board);
    } else if (e.type === 'spawn') {
      board[e.pos.row][e.pos.col] = e.card;
    }
  }
  // The fall: cards drop to their places; new ones come in from above, stacked in their column.
  const spawns = events.filter((e) => e.type === 'spawn');
  const perColumn = new Map<number, number>();
  for (const s of spawns) if (s.type === 'spawn') perColumn.set(s.pos.col, (perColumn.get(s.pos.col) ?? 0) + 1);
  const entering = new Map<number, Pos>();
  for (const s of spawns) if (s.type === 'spawn') entering.set(s.card.id, { row: s.pos.row - (perColumn.get(s.pos.col) ?? 0), col: s.pos.col });
  frames.push({ id: nextFrameId++, kind: 'fall', tiles: tilesOf(board), ghosts: [], entering, duration: UI.anim.fall + (tier >= 3 ? 120 : 0) });

  // A reshuffle (or a new board) after the fall.
  const regen = events.find((e) => e.type === 'regenerate');
  if (events.some((e) => e.type === 'shuffle')) {
    frames.push({ id: nextFrameId++, kind: 'shuffle', tiles: tilesOf(after), ghosts: [], entering: new Map(), duration: UI.anim.shuffle });
  } else if (regen) {
    const rows = after.length;
    const enter = new Map(tilesOf(after).map((t) => [t.card.id, { row: t.pos.row - rows, col: t.pos.col }]));
    frames.push({ id: nextFrameId++, kind: 'fall', tiles: tilesOf(after), ghosts: [], entering: enter, duration: UI.anim.shuffle });
  }
  return frames;
}
