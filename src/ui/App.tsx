// Portrait game screen: HUD on top, the board in the middle, discreet controls at thumb height.
import { useRef, useState } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import { DEFAULT_CONFIG } from '../engine/config';
import type { GameStats } from '../engine/types';
import { DEFAULT_THEME, type Theme } from '../themes';
import { Board } from './Board';
import { STRINGS } from './strings';
import { UI } from './uiConfig';
import { useGame } from './useGame';

const theme = DEFAULT_THEME;
const config = DEFAULT_CONFIG;

function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function App() {
  const g = useGame(config);
  const [helpOpen, setHelpOpen] = useState(false);
  const pausedForHelp = useRef(false);

  const openHelp = () => {
    pausedForHelp.current = g.phase === 'playing';
    g.pause();
    setHelpOpen(true);
  };
  const closeHelp = () => {
    setHelpOpen(false);
    if (pausedForHelp.current) g.resume();
    pausedForHelp.current = false;
  };

  const boardEnabled = (g.phase === 'ready' || g.phase === 'playing') && !g.animating && !helpOpen;
  const warning = g.phase === 'playing' && g.clockMs <= UI.clockWarningMs;

  return (
    <div className="app">
      <header className="hud">
        <h1 className="title">{STRINGS.title}</h1>
        <div className="hud-row">
          <div className="stat">
            <span className="stat-label">{STRINGS.score}</span>
            <span className="stat-value">{g.game.score}</span>
          </div>
          <div className={`clock${warning ? ' warning' : ''}`} role="timer" aria-label={STRINGS.clockLabel}>
            {formatClock(g.clockMs)}
          </div>
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
        <button className="round-btn" onClick={openHelp} aria-label={STRINGS.help}>?</button>
        <FoodChain theme={theme} />
        <button className="round-btn" onClick={g.pause} aria-label={STRINGS.pause} disabled={g.phase !== 'playing'}>
          <span className="pause-icon" aria-hidden="true" />
        </button>
      </footer>

      {helpOpen && <HelpModal theme={theme} onClose={closeHelp} />}
      {g.phase === 'paused' && !helpOpen && (
        <div className="overlay" onClick={g.resume}>
          <div className="sheet">
            <h2>{STRINGS.paused}</h2>
            <p>{STRINGS.pausedHint}</p>
            <button className="primary-btn" onClick={g.resume}>{STRINGS.resume}</button>
          </div>
        </div>
      )}
      {g.phase === 'over' && (
        <GameOver stats={g.game} best={g.best} newBest={g.newBest} onRestart={g.restart} />
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

function GameOver({ stats, best, newBest, onRestart }: { stats: GameStats; best: number; newBest: boolean; onRestart: () => void }) {
  const rows: [string, number][] = [
    [STRINGS.statBest, best],
    [STRINGS.statChains, stats.chains],
    [STRINGS.statChains4, stats.chains4],
    [STRINGS.statFrenzies, stats.frenzies],
    [STRINGS.statBestMove, stats.bestMove],
  ];
  return (
    <div className="overlay">
      <div className="sheet" role="dialog" aria-modal="true" aria-label={STRINGS.gameOver}>
        <h2>{STRINGS.gameOver}</h2>
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
