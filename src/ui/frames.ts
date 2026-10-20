// Turns a move's engine events into animation frames. Pure: the UI only replays events.
import type { Animal, Board, GameEvent, Pos } from '../engine/types';
import { UI } from './uiConfig';

export interface TileState {
  readonly animal: Animal;
  readonly pos: Pos;
}

export type GhostKind = 'swallow' | 'leave' | 'burst';

/** An animal removed during a frame: drawn from `from` animating to `to`, then gone. */
export interface Ghost {
  readonly animal: Animal;
  readonly from: Pos;
  readonly to: Pos;
  readonly kind: GhostKind;
}

export type Effect =
  | { readonly type: 'points'; readonly pos: Pos; readonly points: number }
  | { readonly type: 'text'; readonly text: 'frenzy' | 'combo' | 'timeBonus' | 'multiplier' | 'golden' | 'shuffle' | 'wave'; readonly value: number; readonly pos?: Pos }
  | { readonly type: 'pop'; readonly id: number }
  | { readonly type: 'flash'; readonly pos: Pos };

export type FrameKind = 'eat' | 'fall' | 'frenzy' | 'shuffle';

export interface Frame {
  readonly kind: FrameKind;
  /** Board state at the end of the frame. */
  readonly tiles: readonly TileState[];
  readonly ghosts: readonly Ghost[];
  /** Where entering (spawned) animals start, above the board. */
  readonly entering: ReadonlyMap<number, Pos>;
  readonly effects: readonly Effect[];
  readonly duration: number;
}

export function tilesOf(board: Board): TileState[] {
  const tiles: TileState[] = [];
  board.forEach((row, r) => row.forEach((a, c) => { if (a) tiles.push({ animal: a, pos: { row: r, col: c } }); }));
  return tiles;
}

const DURATION: Record<FrameKind, number> = { eat: UI.anim.eat, fall: UI.anim.fall, frenzy: UI.anim.frenzy, shuffle: UI.anim.shuffle };

export function buildFrames(before: Board, events: readonly GameEvent[]): Frame[] {
  const working = new Map<number, TileState>(tilesOf(before).map((t) => [t.animal.id, t]));
  const frames: Frame[] = [];
  type Open = { kind: FrameKind; ghosts: Ghost[]; entering: Map<number, Pos>; effects: Effect[] };
  let current = null as Open | null;
  let pendingEffects: Effect[] = [];
  /** Spontaneous chains of one wave share a frame: they're eaten at the same time. */
  let openWave = 0;

  const open = (kind: FrameKind) => {
    flush();
    openWave = 0;
    current = { kind, ghosts: [], entering: new Map(), effects: pendingEffects };
    pendingEffects = [];
  };
  const effect = (e: Effect) => (current ? current.effects.push(e) : pendingEffects.push(e));
  function flush() {
    if (!current) return;
    const c = current as NonNullable<typeof current>;
    frames.push({ kind: c.kind, tiles: [...working.values()], ghosts: c.ghosts, entering: c.entering, effects: c.effects, duration: DURATION[c.kind] });
    current = null;
  }
  const remove = (id: number) => working.delete(id);

  for (const e of events) {
    switch (e.type) {
      case 'combo':
        effect({ type: 'text', text: 'combo', value: e.count });
        break;
      case 'chain': {
        const sameWave = e.wave > 0 && e.wave === openWave && current !== null;
        if (!sameWave) {
          open('eat');
          openWave = e.wave;
          if (e.wave > 0) effect({ type: 'text', text: 'wave', value: e.waveMultiplier });
        }
        const predatorPos = e.path[e.path.length - 1];
        effect({ type: 'points', pos: predatorPos, points: e.points });
        if (e.lengthMultiplier > 1) effect({ type: 'text', text: 'multiplier', value: e.lengthMultiplier, pos: predatorPos });
        if (e.goldenMultiplier > 1) effect({ type: 'text', text: 'golden', value: e.goldenMultiplier });
        break;
      }
      case 'eat':
        remove(e.prey.id);
        current?.ghosts.push({ animal: e.prey, from: e.from, to: e.to, kind: 'swallow' });
        break;
      case 'energyGain': {
        const t = working.get(e.animalId);
        if (t) working.set(e.animalId, { ...t, animal: { ...t.animal, energy: e.to } });
        effect({ type: 'pop', id: e.animalId });
        break;
      }
      case 'leave':
        remove(e.animal.id);
        current?.ghosts.push({ animal: e.animal, from: e.pos, to: e.pos, kind: e.reason === 'frenzy' ? 'burst' : 'leave' });
        break;
      case 'fall':
        open('fall');
        for (const f of e.falls) {
          const t = working.get(f.id);
          if (t) working.set(f.id, { ...t, pos: f.to });
        }
        break;
      case 'spawn': {
        if (!current || (current as { kind: FrameKind }).kind !== 'fall') open('fall');
        working.set(e.animal.id, { animal: e.animal, pos: e.pos });
        // Spawns in a column go from the lowest empty cell upwards; they enter from above the board.
        const inColumn = events.filter((x) => x.type === 'spawn' && x.pos.col === e.pos.col && spawnGroupOf(events, x) === spawnGroupOf(events, e)).length;
        current!.entering.set(e.animal.id, { row: e.pos.row - inColumn, col: e.pos.col });
        break;
      }
      case 'frenzy':
        open('frenzy');
        effect({ type: 'flash', pos: e.pos });
        effect({ type: 'text', text: 'frenzy', value: 0, pos: e.pos });
        effect({ type: 'points', pos: e.pos, points: e.points });
        break;
      case 'timeBonus':
        effect({ type: 'text', text: 'timeBonus', value: e.ms });
        break;
      case 'shuffle': {
        open('shuffle');
        for (const m of e.moves) {
          const t = working.get(m.id);
          if (t) working.set(m.id, { ...t, pos: m.to });
        }
        effect({ type: 'text', text: 'shuffle', value: 0 });
        break;
      }
      case 'regenerate': {
        open('shuffle');
        for (const a of e.removed) {
          const t = working.get(a.id);
          if (t) current!.ghosts.push({ animal: a, from: t.pos, to: t.pos, kind: 'leave' });
        }
        working.clear();
        for (const t of tilesOf(e.board)) {
          working.set(t.animal.id, t);
          current!.entering.set(t.animal.id, { row: t.pos.row - e.board.length, col: t.pos.col });
        }
        effect({ type: 'text', text: 'shuffle', value: 0 });
        break;
      }
      case 'moveEnd':
      case 'gameOver':
        break;
    }
  }
  flush();
  if (pendingEffects.length && frames.length) {
    const last = frames[frames.length - 1];
    frames[frames.length - 1] = { ...last, effects: [...last.effects, ...pendingEffects] };
  }
  return frames;
}

/** Index of the gravity pass a spawn event belongs to (spawns after the same 'fall'/'chain'/'frenzy'). */
function spawnGroupOf(events: readonly GameEvent[], e: GameEvent): number {
  let group = 0;
  for (const x of events) {
    if (x === e) return group;
    if (x.type === 'chain' || x.type === 'frenzy' || x.type === 'fall') group++;
  }
  return group;
}
