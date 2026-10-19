// Portrait game screen: HUD on top, the board in the middle, discreet controls at thumb height.
import { useRef, useState } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import { DEFAULT_CONFIG } from '../engine/config';
import type { GameStats } from '../engine/types';
import { DEFAULT_THEME, type Theme } from '../themes';
import { Board } from './Board';
import { STRINGS } from './strings';
import { UI } from './uiConfig';
import { DebugPanel, type DebugSetup } from './DebugPanel';
import { useGame, type NewGameOptions } from './useGame';

const theme = DEFAULT_THEME;
const debugEnabled = (() => {
  try {
    return new URLSearchParams(window.location.search).get('debug') === '1';
  } catch {
    return false;
  }
})();

function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function App() {
  const g = useGame(DEFAULT_CONFIG);
  const config = g.config;
  const [sheet, setSheet] = useState<'help' | 'debug' | null>(null);
  const [debugSetup, setDebugSetup] = useState<DebugSetup>({ variant: 'base' });
  const pausedForSheet = useRef(false);

  const openSheet = (which: 'help' | 'debug') => {
    pausedForSheet.current = g.phase === 'playing';
    g.pause();
    setSheet(which);
  };
  const closeSheet = () => {
    setSheet(null);
    if (pausedForSheet.current) g.resume();
    pausedForSheet.current = false;
  };
  const startDebugGame = (options: NewGameOptions, setup: DebugSetup) => {
    setDebugSetup(setup);
    setSheet(null);
    pausedForSheet.current = false;
    g.restart(options);
  };

  const boardEnabled = (g.phase === 'ready' || g.phase === 'playing') && (!g.animating || g.settling) && !sheet;
  const byMoves = config.mode === 'moves';
  const warning = !byMoves && g.phase === 'playing' && g.clockMs <= UI.clockWarningMs;

  return (
    <div className="app">
      <header className="hud">
        {debugEnabled && (
          <button className="debug-btn" onClick={() => openSheet('debug')} aria-label={STRINGS.debug.open}>⚙</button>
        )}
        <h1 className="title">{STRINGS.title}</h1>
        <div className="hud-row">
          <div className="stat">
            <span className="stat-label">{STRINGS.score}</span>
            <span className="stat-value">{g.game.score}</span>
          </div>
          {byMoves ? (
            <div className="clock" aria-label={STRINGS.movesLeft}>
              <span className="clock-label">{STRINGS.movesLeft}</span>
              {config.maxMoves - g.game.moves}
            </div>
          ) : (
            <div className={`clock${warning ? ' warning' : ''}`} role="timer" aria-label={STRINGS.clockLabel}>
              {formatClock(g.clockMs)}
            </div>
          )}
          <div className="stat">
            <span className="stat-label">{STRINGS.best}</span>
            <span className="stat-value">{Math.max(g.best, g.game.score)}</span>
          </div>
        </div>
      </header>

      <main className="stage">
        <Board
          board={g.game.board}
          display={g.display}
          config={config}
          theme={theme}
          hint={g.hint}
          floaters={g.floaters}
          enabled={boardEnabled}
          onPlay={g.play}
          onActivity={g.noteActivity}
        />
        <p className={`start-hint${g.phase === 'ready' ? '' : ' hidden'}`}>{STRINGS.tapToStart}</p>
      </main>

      <footer className="bottom">
        <button className="round-btn" onClick={() => openSheet('help')} aria-label={STRINGS.help}>?</button>
        <FoodChain theme={theme} />
        <button className="round-btn" onClick={g.pause} aria-label={STRINGS.pause} disabled={g.phase !== 'playing'}>
          <span className="pause-icon" aria-hidden="true" />
        </button>
      </footer>

      {sheet === 'help' && <HelpModal theme={theme} onClose={closeSheet} />}
      {sheet === 'debug' && <DebugPanel game={g.game} setup={debugSetup} onStart={startDebugGame} onClose={closeSheet} />}
      {g.phase === 'paused' && !sheet && (
        <div className="overlay" onClick={g.resume}>
          <div className="sheet">
            <h2>{STRINGS.paused}</h2>
            <p>{STRINGS.pausedHint}</p>
            <button className="primary-btn" onClick={g.resume}>{STRINGS.resume}</button>
          </div>
        </div>
      )}
      {g.phase === 'over' && (
        <GameOver
          title={byMoves ? STRINGS.gameOverMoves : STRINGS.gameOver}
          stats={g.game}
          best={g.best}
          newBest={g.newBest}
          onRestart={() => { setDebugSetup((d) => ({ variant: d.variant })); g.restart(); }}
        />
      )}
    </div>
  );
}

function FoodChain({ theme, large = false }: { theme: Theme; large?: boolean }) {
  return (
    <ol className={`food-chain${large ? ' large' : ''}`} aria-label={STRINGS.helpChain}>
      {theme.levels.map((level, i) => {
        return (
          <li key={level.id}>
            {i > 0 && <span className="arrow" aria-hidden="true"><svg viewBox="0 0 10 10" width="10" height="10"><path d="M3 1 L7 5 L3 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
            <span className="chain-animal" title={level.name}>
              {renderSprite(level.sprite, { color: level.color })}
              {large && <span className="chain-name">{level.name}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function HelpModal({ theme, onClose }: { theme: Theme; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={STRINGS.helpTitle}>
        <h2>{STRINGS.helpTitle}</h2>
        <FoodChain theme={theme} large />
        <ul className="rules">
          {STRINGS.helpRules.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <button className="primary-btn" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}

function GameOver({ title, stats, best, newBest, onRestart }: { title: string; stats: GameStats; best: number; newBest: boolean; onRestart: () => void }) {
  const rows: [string, number][] = [
    [STRINGS.statBest, best],
    [STRINGS.statChains, stats.chains],
    [STRINGS.statChains4, stats.chains4],
    [STRINGS.statFrenzies, stats.frenzies],
    [STRINGS.statBestMove, stats.bestMove],
  ];
  return (
    <div className="overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <div className="final-label">{STRINGS.statScore}</div>
        <div className="final-score">{stats.score}</div>
        {newBest && <div className="new-best">{STRINGS.newBest}</div>}
        <dl className="final-stats">
          {rows.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <button className="primary-btn" onClick={onRestart} autoFocus>{STRINGS.playAgain}</button>
      </div>
    </div>
  );
}
