// Playtesting panel (?debug=1): seed, mode, rule variant, typed board and move-log export.
import { useState } from 'react';
import { boardToString, parseBoard } from '../engine/notation';
import type { Board, GameConfig, GameMode, GameState } from '../engine/types';
import { VARIANTS, variantConfig } from '../engine/variants';
import type { Scenario } from '../scenarios';
import { audioState } from './audio';
import { makeLog } from './debugLog';
import { STRINGS } from './strings';
import type { NewGameOptions } from './useGame';

const T = STRINGS.debug;

export interface DebugSetup {
  readonly variant: string;
  readonly startBoard?: string;
}

interface DebugPanelProps {
  readonly scenario: Scenario;
  readonly game: GameState;
  readonly setup: DebugSetup;
  readonly onStart: (options: NewGameOptions, setup: DebugSetup) => void;
  readonly onClose: () => void;
}

export function DebugPanel({ scenario, game, setup, onStart, onClose }: DebugPanelProps) {
  const [seed, setSeed] = useState(String(game.seed));
  const [mode, setMode] = useState<GameMode>(game.config.mode);
  const [variant, setVariant] = useState(setup.variant);
  const [boardText, setBoardText] = useState(setup.startBoard ?? '');
  const [message, setMessage] = useState<string | null>(null);

  const start = () => {
    const seedValue = Number(seed);
    if (!Number.isInteger(seedValue)) { setMessage(T.badSeed); return; }
    const tierCount = variantConfig(variant).tiers.length;
    let board: Board | undefined;
    try {
      board = boardText.trim() ? parseBoard(boardText, 1, tierCount) : undefined;
    } catch {
      setMessage(T.badBoard);
      return;
    }
    const config: GameConfig = variant === 'base' && mode === scenario.config.mode && !board
      ? scenario.config
      : variantConfig(variant, { mode });
    onStart({ seed: seedValue, config, board }, { variant, startBoard: board ? boardText.trim() : undefined });
  };

  const exportLog = () => {
    const json = JSON.stringify(makeLog(game, setup.variant, setup.startBoard), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `animal-feast-${game.seed}-${game.history.length}.json`;
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard?.writeText(json).catch(() => {});
    setMessage(T.exported);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet debug" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={T.title}>
        <h2>{T.title}</h2>
        <p className="debug-note">{T.current(game.seed, game.history.length)}</p>
        <p className="debug-note">{T.audio(audioState())}</p>
        <label>
          <span>{T.seed}</span>
          <span className="debug-row">
            <input inputMode="numeric" value={seed} onChange={(e) => setSeed(e.target.value)} />
            <button type="button" onClick={() => setSeed(String(Math.floor(Math.random() * 2 ** 31)))}>{T.randomSeed}</button>
          </span>
        </label>
        <label>
          <span>{T.mode}</span>
          <select value={mode} onChange={(e) => setMode(e.target.value as GameMode)}>
            <option value="time">{T.modeTime}</option>
            <option value="moves">{T.modeMoves}</option>
          </select>
        </label>
        <label>
          <span>{T.variant}</span>
          <select value={variant} onChange={(e) => setVariant(e.target.value)}>
            {Object.entries(VARIANTS).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
          </select>
        </label>
        <label>
          <span>{T.board}</span>
          <textarea rows={4} value={boardText} onChange={(e) => setBoardText(e.target.value)} spellCheck={false} />
          <small>{T.boardHelp}</small>
        </label>
        <button type="button" className="link-btn" onClick={() => setBoardText(boardToString(game.board, game.config.tiers.length).split(' / ').join('\n'))}>{T.copyBoard}</button>
        {message && <p className="debug-message">{message}</p>}
        <p className="debug-note">{T.note}</p>
        <div className="debug-actions">
          <button type="button" className="secondary-btn" onClick={exportLog}>{T.export}</button>
          <button type="button" className="primary-btn" onClick={start}>{T.start}</button>
          <button type="button" className="link-btn" onClick={onClose}>{T.close}</button>
        </div>
      </div>
    </div>
  );
}
