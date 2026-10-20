// How to play, in four short animated screens: who eats whom, tracing (diagonals and turns), the
// octopus wildcard, and energy and frenzy. Each screen loops a little scripted board until the
// player moves on. It opens before the first game of each visit until they tick "don't show again".
import { useEffect, useState } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import { minEnergyGain } from '../engine/score';
import type { GameConfig, Pos } from '../engine/types';
import { themeLevels, type Theme, type ThemeLevel } from '../themes';
import { EnergyFill } from './Board';
import { STRINGS } from './strings';
import { UI } from './uiConfig';

/** A piece on a demo board: a tier (1 = lowest) or the octopus. */
type Piece = number | 'wild';

interface Tag {
  readonly at: Pos;
  readonly text: string;
  readonly tone?: 'good' | 'bad' | 'gold';
}

/** One moment of a demo: what is traced, eaten, glowing or labelled, and for how long. */
interface Frame {
  readonly ms: number;
  readonly trace?: readonly Pos[];
  /** The trace is a wrong one (drawn red). */
  readonly bad?: boolean;
  readonly finger?: Pos;
  readonly gone?: readonly Pos[];
  readonly chomp?: Pos;
  readonly glow?: Pos;
  /** Energy of one animal, as thirds of the frenzy threshold. */
  readonly energy?: { readonly at: Pos; readonly thirds: number };
  readonly tags?: readonly Tag[];
}

interface Scene {
  readonly size: number;
  readonly pieces: ReadonlyMap<string, Piece>;
  readonly frames: readonly Frame[];
}

const key = (p: Pos) => `${p.row},${p.col}`;
const at = (row: number, col: number): Pos => ({ row, col });

function board(entries: readonly (readonly [Pos, Piece])[]): ReadonlyMap<string, Piece> {
  return new Map(entries.map(([p, piece]) => [key(p), piece]));
}

/** The finger moves along `path` (predator first), one cell per step. */
function traceFrames(path: readonly Pos[], extra: (i: number) => Partial<Frame> = () => ({})): Frame[] {
  const D = UI.tutorial;
  return path.map((p, i) => ({ ms: i === 0 ? D.startMs : D.stepMs, trace: path.slice(0, i + 1), finger: p, ...extra(i) }));
}

/** The predator (first cell) eats the rest of the path. */
function eatFrame(path: readonly Pos[], text: string): Frame {
  return { ms: UI.tutorial.eatMs, gone: path.slice(1), chomp: path[0], tags: [{ at: path[0], text, tone: 'gold' }] };
}

const rest = (): Frame => ({ ms: UI.tutorial.restMs });

/** A board with a full chain that bends: a diagonal, then turns. */
function traceScene(top: number): Scene {
  const path = [at(0, 0), at(1, 1), at(1, 2), at(2, 2), at(2, 1)].slice(0, top);
  const low = (t: number) => Math.max(1, t);
  return {
    size: 3,
    pieces: board([
      ...path.map((p, i): [Pos, Piece] => [p, top - i]),
      [at(0, 1), low(top - 3)], [at(0, 2), 1], [at(1, 0), low(top - 2)], [at(2, 0), 1],
      ...(path.length < 5 ? [[at(2, 1), low(top - 1)] as [Pos, Piece]] : []),
    ]),
    frames: [...traceFrames(path), eatFrame(path, STRINGS.tutorial.yum), rest()],
  };
}

/** The octopus stands in for an animal in the middle; then a chain it would have to eat is refused. */
function wildScene(top: number, middle: ThemeLevel): Scene {
  const T = STRINGS.tutorial;
  const good = [at(0, 0), at(1, 1), at(1, 2), at(2, 2)];
  const bad = [at(0, 2), at(1, 2), at(2, 2)];
  const low = (t: number) => Math.max(1, t);
  return {
    size: 3,
    pieces: board([
      [at(0, 0), top], [at(1, 1), 'wild'], [at(1, 2), low(top - 2)], [at(2, 2), low(top - 3)], [at(0, 2), 'wild'],
      [at(0, 1), 1], [at(1, 0), top - 1], [at(2, 0), low(top - 2)], [at(2, 1), 1],
    ]),
    frames: [
      ...traceFrames(good, (i) => (i >= 1 ? { tags: [{ at: good[1], text: T.wildActs(middle.definite), tone: 'good' }] } : {})),
      eatFrame(good, T.yum),
      rest(),
      ...traceFrames(bad, () => ({ bad: true })),
      { ms: UI.tutorial.eatMs * 1.4, trace: bad, bad: true, tags: [{ at: bad[0], text: T.wildCantEat, tone: 'bad' }] },
      rest(),
    ],
  };
}

/** An animal's square fills with energy as it eats; full, it frenzies and eats every smaller neighbour. */
function frenzyScene(top: number, charger: number, bonusS: number): Scene {
  const T = STRINGS.tutorial;
  const centre = at(1, 1);
  const low = (t: number) => Math.max(1, t);
  const around: [Pos, Piece][] = [
    [at(0, 0), top], [at(0, 1), low(charger - 1)], [at(0, 2), 1], [at(1, 0), low(charger - 2)],
    [at(1, 2), low(charger - 1)], [at(2, 0), 1], [at(2, 1), low(charger - 2)], [at(2, 2), low(charger - 1)],
  ];
  const smaller = around.filter(([, t]) => typeof t === 'number' && t < charger).map(([p]) => p);
  const D = UI.tutorial;
  return {
    size: 3,
    pieces: board([[centre, charger], ...around]),
    frames: [
      { ms: D.startMs, energy: { at: centre, thirds: 0 } },
      ...[1, 2, 3].map((thirds): Frame => ({ ms: D.eatMs, chomp: centre, energy: { at: centre, thirds }, tags: [{ at: centre, text: T.yum, tone: 'gold' }] })),
      { ms: D.eatMs, glow: centre, energy: { at: centre, thirds: 3 }, tags: [{ at: centre, text: STRINGS.frenzy, tone: 'gold' }] },
      { ms: D.eatMs * 1.4, chomp: centre, gone: smaller, energy: { at: centre, thirds: 0 }, tags: [{ at: centre, text: STRINGS.timeBonus(bonusS), tone: 'good' }] },
      rest(),
    ],
  };
}

/** Plays a scene's frames in a loop. */
function useFrames(frames: readonly Frame[]): Frame {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setI((n) => (n + 1) % frames.length), frames[i].ms);
    return () => window.clearTimeout(id);
  }, [i, frames]);
  return frames[i];
}

function DemoBoard({ scene, levels, wild }: { scene: Scene; levels: readonly ThemeLevel[]; wild: Theme['wild'] }) {
  const frame = useFrames(scene.frames);
  const cell = UI.tutorial.cellPx;
  const px = scene.size * cell;
  const traced = new Set((frame.trace ?? []).map(key));
  const gone = new Set((frame.gone ?? []).map(key));
  const centre = (p: Pos) => `${(p.col + 0.5) * cell},${(p.row + 0.5) * cell}`;
  return (
    <div className="tutorial-board" style={{ width: px, height: px }} aria-hidden="true">
      {Array.from({ length: scene.size * scene.size }, (_, k) => {
        const p = at(Math.floor(k / scene.size), k % scene.size);
        const piece = scene.pieces.get(key(p));
        const look = piece === 'wild' ? wild : piece ? levels[piece - 1] : null;
        const classes = [
          'tutorial-cell',
          traced.has(key(p)) && (frame.bad ? 'bad' : 'on'),
          gone.has(key(p)) && 'gone',
          frame.chomp && key(frame.chomp) === key(p) && 'chomp',
          frame.glow && key(frame.glow) === key(p) && 'glow',
          piece === 'wild' && 'wild',
        ].filter(Boolean).join(' ');
        const energy = frame.energy && key(frame.energy.at) === key(p) ? frame.energy.thirds / 3 : null;
        return (
          // The key changes with each chomp, so the animation replays.
          <div key={`${k}-${frame.chomp && key(frame.chomp) === key(p) ? scene.frames.indexOf(frame) : 0}`} className={classes} style={{ left: p.col * cell, top: p.row * cell, width: cell, height: cell }} data-animal={look?.id}>
            {energy !== null && look && <EnergyFill ratio={energy} color={look.color} />}
            {look && <div className="tile-art">{renderSprite(look.sprite, { color: look.color })}</div>}
          </div>
        );
      })}
      {frame.trace && frame.trace.length > 0 && (
        <svg className={`tutorial-line${frame.bad ? ' bad' : ''}`} width={px} height={px}><polyline points={frame.trace.map(centre).join(' ')} /></svg>
      )}
      {frame.finger && (
        <div className="tutorial-finger" style={{ transform: `translate(${(frame.finger.col + 0.45) * cell}px, ${(frame.finger.row + 0.5) * cell}px)` }}>👆</div>
      )}
      {frame.tags?.map((tag) => (
        <div
          key={`${key(tag.at)}-${tag.text}-${scene.frames.indexOf(frame)}`}
          className={`tutorial-tag ${tag.tone ?? ''}`}
          style={{ left: (tag.at.col + 0.5) * cell, top: tag.at.row * cell + cell * 0.1 }}
        >{tag.text}</div>
      ))}
    </div>
  );
}

/** The food chain as a row, biggest first; one pair lights up at a time, with its sentence. */
function ChainDemo({ levels }: { levels: readonly ThemeLevel[] }) {
  const shown = [...levels].reverse();
  const pairs = shown.length - 1;
  const [pair, setPair] = useState(0);
  useEffect(() => {
    const id = window.setTimeout(() => setPair((p) => (p + 1) % pairs), UI.tutorial.pairMs);
    return () => window.clearTimeout(id);
  }, [pair, pairs]);
  return (
    <div className="tutorial-chain-demo" aria-hidden="true">
      <ol>
        {shown.map((l, i) => (
          <li key={l.id} className={i === pair ? 'eater' : i === pair + 1 ? 'eaten' : ''} data-animal={l.id}>
            <span className="art">{renderSprite(l.sprite, { color: l.color })}</span>
            <span className="name">{l.name}</span>
          </li>
        ))}
      </ol>
      <p key={pair} className="tutorial-pair">{STRINGS.tutorial.eatsPair(shown[pair].definite, shown[pair + 1].definite)}</p>
    </div>
  );
}

export function TutorialModal({ theme, config, hidden, onDone }: {
  theme: Theme; config: GameConfig;
  /** Whether "don't show again" starts ticked. */
  hidden: boolean;
  onDone: (hide: boolean) => void;
}) {
  const T = STRINGS.tutorial;
  const levels = themeLevels(theme, config.tiers.length);
  const top = levels.length;
  const chargerTiers = levels.map((_, i) => i + 1).filter((t) => minEnergyGain(t, config) > 0);
  const charger = chargerTiers.length ? chargerTiers[chargerTiers.length - 1] : top - 1;
  const [step, setStep] = useState(0);
  const [hide, setHide] = useState(hidden);
  const [scenes] = useState(() => ({
    trace: traceScene(top),
    wild: wildScene(top, levels[top - 2]),
    frenzy: frenzyScene(top, charger, config.timeBonusMs.frenzy / 1000),
  }));
  const steps = [
    { title: T.steps.chain.title, demo: <ChainDemo levels={levels} />, lines: T.steps.chain.lines },
    {
      title: T.steps.trace.title,
      demo: <DemoBoard key="trace" scene={scenes.trace} levels={levels} wild={theme.wild} />,
      lines: T.steps.trace.lines(config.chainLengths, config.adjacency === 8, config.allowDescendingTrace),
    },
    {
      title: T.steps.wild.title,
      demo: <DemoBoard key="wild" scene={scenes.wild} levels={levels} wild={theme.wild} />,
      lines: T.steps.wild.lines(levels[top - 1].definite),
    },
    {
      title: T.steps.frenzy.title,
      demo: <DemoBoard key="frenzy" scene={scenes.frenzy} levels={levels} wild={theme.wild} />,
      lines: T.steps.frenzy.lines(chargerTiers.map((t) => levels[t - 1].definite), config.timeBonusMs.frenzy / 1000),
    },
  ];
  const last = step === steps.length - 1;
  const current = steps[step];
  return (
    <div className="overlay tutorial-overlay">
      <div className="sheet tutorial" role="dialog" aria-modal="true" aria-label={T.title}>
        <p className="tutorial-step">{T.stepOf(step + 1, steps.length)}</p>
        <h2>{current.title}</h2>
        <div className="tutorial-demo">{current.demo}</div>
        <ul className="rules">{current.lines.map((line) => <li key={line}>{line}</li>)}</ul>
        <div className="tutorial-dots" aria-hidden="true">
          {steps.map((s, i) => <span key={s.title} className={i === step ? 'on' : ''} />)}
        </div>
        <button className="primary-btn" onClick={() => (last ? onDone(hide) : setStep(step + 1))} autoFocus>{last ? T.go : T.next}</button>
        <div className="tutorial-foot">
          <label className="tutorial-hide">
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> {T.dontShow}
          </label>
          {!last && <button type="button" className="link-btn" onClick={() => onDone(hide)}>{T.skip}</button>}
        </div>
      </div>
    </div>
  );
}
