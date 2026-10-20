// Portrait game screen: HUD on top, the board in the middle, discreet controls at thumb height.
import { useEffect, useRef, useState } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import { GAME_CONFIG, makeConfig } from '../engine/config';
import { VARIANTS } from '../engine/variants';
import { minEnergyGain } from '../engine/score';
import type { GameConfig, GameStats } from '../engine/types';
import { DEFAULT_THEME, themeLevels, type Theme } from '../themes';
import { Board } from './Board';
import { STRINGS } from './strings';
import { UI } from './uiConfig';
import { DebugPanel, type DebugSetup } from './DebugPanel';
import { useGame, type NewGameOptions } from './useGame';
import { unlockAudio } from './audio';
import { startMusic, stopMusic } from './music';
import { Ambient } from './fx/Ambient';
import { finishCue, frameCue, rejectCue, traceStepCue, warningCue } from './feedback';
import { loadFlag, saveFlag } from './storage';

const theme = DEFAULT_THEME;
function urlParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}
const debugEnabled = urlParam('debug') === '1';
/** ?variant=<key> plays a rule variant from the start (for testing on a phone); it doesn't count for the record. */
const urlVariant = urlParam('variant');
const startConfig = urlVariant && VARIANTS[urlVariant] ? makeConfig(VARIANTS[urlVariant].overrides) : GAME_CONFIG;

function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function App() {
  const [sound, setSound] = useState(() => loadFlag(UI.soundKey, true));
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  const g = useGame(startConfig, {
    onFrame: (frame) => frameCue(frame, soundRef.current),
    onFinish: (newBest) => finishCue(newBest, soundRef.current),
  });
  const config = g.config;

  // Browsers only allow sound after a touch: start the audio on each one (iPhone needs the touch to
  // end, and wakes it up again after a call or another app).
  useEffect(() => {
    const unlock = () => unlockAudio();
    const events = ['pointerdown', 'touchend', 'click', 'keydown'] as const;
    for (const e of events) window.addEventListener(e, unlock);
    return () => { for (const e of events) window.removeEventListener(e, unlock); };
  }, []);
  const toggleSound = () => {
    unlockAudio();
    setSound((on) => { saveFlag(UI.soundKey, !on); return !on; });
  };

  // Background music while playing (not paused, over, or with the app in the background).
  const [music, setMusic] = useState(() => loadFlag(UI.musicKey, true));
  const toggleMusic = () => {
    unlockAudio();
    setMusic((on) => { saveFlag(UI.musicKey, !on); return !on; });
  };
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (music && !hidden && g.phase === 'playing') startMusic();
    else stopMusic();
  }, [music, hidden, g.phase]);
  useEffect(() => stopMusic, []);

  // Last seconds: a soft tick each second.
  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (g.phase !== 'playing' || config.mode !== 'time' || g.clockMs > UI.warningTickMs) return;
    const second = Math.ceil(g.clockMs / 1000);
    if (second > 0 && second !== lastTick.current) { lastTick.current = second; warningCue(soundRef.current); }
  }, [g.clockMs, g.phase, config.mode]);
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
      <Ambient />
      <header className="hud">
        {debugEnabled && (
          <button className="debug-btn" onClick={() => openSheet('debug')} aria-label={STRINGS.debug.open}>⚙</button>
        )}
        <button className={`sound-btn${sound ? '' : ' off'}`} onClick={toggleSound} aria-label={sound ? STRINGS.soundOff : STRINGS.soundOn} aria-pressed={sound}>
          <SpeakerIcon on={sound} />
        </button>
        <button className={`sound-btn music-btn${music ? '' : ' off'}`} onClick={toggleMusic} aria-label={music ? STRINGS.musicOff : STRINGS.musicOn} aria-pressed={music}>
          <MusicIcon on={music} />
        </button>
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
            <span className="stat-value">{g.records ? Math.max(g.best, g.game.score) : g.best}</span>
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
          onTraceStep={(length, status) => traceStepCue(length, status, sound)}
          onReject={() => rejectCue(sound)}
        />
        <p className={`start-hint${g.phase === 'ready' ? '' : ' hidden'}`}>{STRINGS.tapToStart}</p>
      </main>

      <footer className="bottom">
        <button className="round-btn" onClick={() => openSheet('help')} aria-label={STRINGS.help}>?</button>
        <FoodChain theme={theme} tierCount={config.tiers.length} />
        <button className="round-btn" onClick={g.pause} aria-label={STRINGS.pause} disabled={g.phase !== 'playing'}>
          <span className="pause-icon" aria-hidden="true" />
        </button>
      </footer>

      {sheet === 'help' && <HelpModal theme={theme} config={config} onClose={closeSheet} />}
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
          theme={theme}
          tierCount={config.tiers.length}
          onRestart={() => { setDebugSetup((d) => ({ variant: d.variant })); g.restart(); }}
        />
      )}
    </div>
  );
}

/** Predator first: each animal eats the one to its right. */
function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z" fill="currentColor" />
      {on ? (
        <path d="M16 8.5 Q18.5 12 16 15.5 M18.5 6 Q22.5 12 18.5 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <path d="M16.5 9 L21.5 15 M21.5 9 L16.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function MusicIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M9 17 V6 L19 4 V15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="6.5" cy="17" r="2.5" fill="currentColor" />
      <circle cx="16.5" cy="15" r="2.5" fill="currentColor" />
      {!on && <path d="M4 4 L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

function FoodChain({ theme, tierCount, large = false }: { theme: Theme; tierCount: number; large?: boolean }) {
  return (
    <ol className={`food-chain${large ? ' large' : ''}`} aria-label={STRINGS.helpChain}>
      {[...themeLevels(theme, tierCount)].reverse().map((level, i) => {
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

function HelpModal({ theme, config, onClose }: { theme: Theme; config: GameConfig; onClose: () => void }) {
  const tierCount = config.tiers.length;
  const levels = themeLevels(theme, tierCount);
  const rules = STRINGS.helpRules({
    lengths: config.chainLengths,
    multipliers: Object.entries(config.lengthMultiplier).map(([len, m]) => [Number(len), m] as [number, number]).filter(([, m]) => m > 1),
    chargers: levels.filter((_, i) => minEnergyGain(i + 1, config) > 0).map((l) => l.definite),
    top: levels[tierCount - 1].definite,
    frenzyBonusS: config.timeBonusMs.frenzy / 1000,
    cross: config.adjacency === 4,
    lines: config.spontaneousLines,
    waves: config.waveMultipliers.slice(0, 2),
    whirlLength: config.whirlpoolChainLength,
  });
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={STRINGS.helpTitle}>
        <h2>{STRINGS.helpTitle}</h2>
        <FoodChain theme={theme} tierCount={tierCount} large />
        <ul className="rules">
          {rules.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <button className="primary-btn" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}

/** Counts from 0 up to `target` once, easing out. */
function useCountUp(target: number, ms: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

const CONFETTI_COLORS = ['var(--gold)', 'var(--green)', 'var(--foam)', 'var(--white)', 'var(--lagoon)'];

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: UI.confettiPieces }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${(i % 7) * 40}ms`,
            animationDuration: `${UI.confettiMs - (i % 5) * 80}ms`,
            ['--spin' as string]: `${(i % 2 ? 1 : -1) * (180 + (i * 53) % 360)}deg`,
            ['--drift' as string]: `${((i * 29) % 60) - 30}px`,
          }}
        />
      ))}
    </div>
  );
}

function GameOver({ title, stats, best, newBest, theme, tierCount, onRestart }: {
  title: string; stats: GameStats; best: number; newBest: boolean; theme: Theme; tierCount: number; onRestart: () => void;
}) {
  const score = useCountUp(stats.score, UI.countUpMs);
  const top = themeLevels(theme, tierCount)[tierCount - 1];
  const rows: [string, number][] = [
    [STRINGS.statBest, best],
    [STRINGS.statChains, stats.chains],
    [STRINGS.statChains4, stats.chains4],
    [STRINGS.statFrenzies, stats.frenzies],
    ...(stats.spontaneousChains ? [[STRINGS.statSpontaneous, stats.spontaneousChains] as [string, number]] : []),
    ...(stats.whirlpools ? [[STRINGS.statWhirlpools, stats.whirlpools] as [string, number]] : []),
    [STRINGS.statBestMove, stats.bestMove],
  ];
  return (
    <div className="overlay">
      {newBest && <Confetti />}
      <div className="sheet game-over" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mascot" aria-hidden="true">{renderSprite(top.sprite, { color: top.color })}</div>
        <h2>{title}</h2>
        <div className="final-label">{STRINGS.statScore}</div>
        <div className="final-score" aria-label={String(stats.score)}>{score}</div>
        {newBest && <div className="new-best">{STRINGS.newBest}</div>}
        <dl className="final-stats">
          {rows.map(([label, value], i) => (
            <div key={label} style={{ animationDelay: `${120 + i * 60}ms` }}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <button className="primary-btn" onClick={onRestart} autoFocus>{STRINGS.playAgain}</button>
      </div>
    </div>
  );
}
