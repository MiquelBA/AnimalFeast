// First-game walkthrough: a small board where a finger traces a whole food chain from the orca
// down (each animal eats the next), and the orca eats them all. It loops until the player is ready.
import { useEffect, useState } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import type { GameConfig, Pos } from '../engine/types';
import { themeLevels, type Theme } from '../themes';
import { STRINGS } from './strings';
import { UI } from './uiConfig';

const SIZE = 3;
/** The chain the finger traces, lowest tier first (one cell per tier, ending with the predator). */
const PATH: readonly Pos[] = [
  { row: 2, col: 0 }, { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 0, col: 1 }, { row: 0, col: 2 },
];
/** Tiers (1 = lowest) of the cells around the chain, so it looks like a real board. */
const FILLER: Readonly<Record<string, number>> = { '0,0': 2, '1,2': 1, '2,1': 3, '2,2': 2 };

type Stage = { kind: 'trace'; reached: number } | { kind: 'eat' } | { kind: 'rest' };

export function TutorialModal({ theme, config, onDone }: { theme: Theme; config: GameConfig; onDone: () => void }) {
  const T = STRINGS.tutorial;
  const levels = themeLevels(theme, config.tiers.length);
  // The demo chain uses the top tiers (all of them on a 5-tier board).
  const chain = PATH.slice(PATH.length - Math.min(PATH.length, levels.length));
  const firstTier = levels.length - chain.length + 1;
  /** The finger goes from the predator down to the smallest prey. */
  const trace = [...chain].reverse();
  const [stage, setStage] = useState<Stage>({ kind: 'trace', reached: 0 });

  useEffect(() => {
    const D = UI.tutorial;
    const next = (s: Stage): [Stage, number] => {
      if (s.kind === 'trace') return s.reached + 1 < chain.length ? [{ kind: 'trace', reached: s.reached + 1 }, D.stepMs] : [{ kind: 'eat' }, D.stepMs];
      if (s.kind === 'eat') return [{ kind: 'rest' }, D.eatMs];
      return [{ kind: 'trace', reached: 0 }, D.restMs];
    };
    const [after, wait] = next(stage);
    const id = window.setTimeout(() => setStage(after), stage.kind === 'trace' && stage.reached === 0 ? D.startMs : wait);
    return () => window.clearTimeout(id);
  }, [stage, chain.length]);

  const cell = UI.tutorial.cellPx;
  const reached = stage.kind === 'trace' ? stage.reached : chain.length - 1;
  const finger = trace[Math.min(reached, trace.length - 1)];
  const eaten = stage.kind !== 'trace';
  const tierAt = (r: number, c: number): number | null => {
    const i = chain.findIndex((p) => p.row === r && p.col === c);
    if (i >= 0) return firstTier + i;
    return FILLER[`${r},${c}`] ?? null;
  };
  const line = trace.slice(0, reached + 1).map((p) => `${(p.col + 0.5) * cell},${(p.row + 0.5) * cell}`).join(' ');
  const shown = levels.slice(firstTier - 1).reverse();
  const names = shown.map((l) => l.name.toLowerCase()).join(' → ');

  return (
    <div className="overlay tutorial-overlay">
      <div className="sheet tutorial" role="dialog" aria-modal="true" aria-label={T.title}>
        <h2>{T.title}</h2>
        <p className="tutorial-goal">{T.goal}</p>
        <p className="tutorial-eats">{T.eats(shown.map((l) => l.definite))}</p>
        <div className="tutorial-board" style={{ width: cell * SIZE, height: cell * SIZE }} aria-hidden="true">
          {Array.from({ length: SIZE * SIZE }, (_, k) => {
            const r = Math.floor(k / SIZE), c = k % SIZE;
            const tier = tierAt(r, c);
            const i = chain.findIndex((p) => p.row === r && p.col === c);
            const t = trace.findIndex((p) => p.row === r && p.col === c);
            const inChain = t >= 0 && t <= reached && stage.kind !== 'rest';
            const gone = eaten && i >= 0 && i < chain.length - 1;
            const predator = eaten && i === chain.length - 1;
            const level = tier ? levels[tier - 1] : null;
            return (
              <div
                key={k}
                className={`tutorial-cell${inChain ? ' on' : ''}${gone ? ' gone' : ''}${predator && stage.kind === 'eat' ? ' chomp' : ''}`}
                style={{ left: c * cell, top: r * cell, width: cell, height: cell }}
              >
                {level && <div className="tile-art">{renderSprite(level.sprite, { color: level.color })}</div>}
              </div>
            );
          })}
          {stage.kind === 'trace' && <svg className="tutorial-line" width={cell * SIZE} height={cell * SIZE}><polyline points={line} /></svg>}
          {stage.kind === 'eat' && (
            <div className="tutorial-points" style={{ left: (chain[chain.length - 1].col + 0.5) * cell, top: (chain[chain.length - 1].row + 0.2) * cell }}>{T.yum}</div>
          )}
          {stage.kind === 'trace' && (
            <div className="tutorial-finger" style={{ transform: `translate(${(finger.col + 0.45) * cell}px, ${(finger.row + 0.5) * cell}px)` }}>👆</div>
          )}
        </div>
        <p className="tutorial-chain">{names}</p>
        <ul className="rules">
          {T.points(config.chainLengths, config.adjacency === 8, config.allowDescendingTrace).map((line) => <li key={line}>{line}</li>)}
        </ul>
        <button className="primary-btn" onClick={onDone} autoFocus>{T.go}</button>
      </div>
    </div>
  );
}
