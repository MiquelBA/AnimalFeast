// Portrait game screen: HUD on top, the board in the middle, discreet controls at thumb height.
import { useEffect, useRef, useState } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import { makeConfig } from '../engine/config';
import { VARIANTS } from '../engine/variants';
import { minEnergyGain } from '../engine/score';
import type { GameConfig, GameStats } from '../engine/types';
import { Leaderboard } from '../leaderboard/Leaderboard';
import { leaderboardEnabled } from '../leaderboard/config';
import { scenarioById } from '../scenarios';
import { themeLevels, type Theme } from '../themes';
import { Board } from './Board';
import { STRINGS } from './strings';
import { UI } from './uiConfig';
import { DebugPanel, type DebugSetup } from './DebugPanel';
import { useGame, type NewGameOptions } from './useGame';
import { unlockAudio } from './audio';
import { Ambient } from './fx/Ambient';
import { countdownCue, finishCue, frameCue, rejectCue, traceStepCue, warningCue } from './feedback';
import { loadFlag, saveFlag } from './storage';

function urlParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}
const debugEnabled = urlParam('debug') === '1';
/** ?scenario=<id> picks the world (only the ocean for now). */
const scenario = scenarioById(urlParam('scenario'));
const theme = scenario.theme;
/** ?variant=<key> plays a rule variant from the start (for testing on a phone); it doesn't count for the record. */
const urlVariant = urlParam('variant');
const startConfig = urlVariant && VARIANTS[urlVariant] ? makeConfig(VARIANTS[urlVariant].overrides) : scenario.config;

function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function App() {
  const [sound, setSound] = useState(() => loadFlag(UI.soundKey, true));
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  const g = useGame(scenario, startConfig, {
    onFrame: (frame) => frameCue(frame, soundRef.current),
    onFinish: (newBest) => finishCue(newBest, soundRef.current),
    onCountdown: (count) => countdownCue(count, soundRef.current),
  });
  const config = g.config;

  // The scenario's colours drive the whole screen (the stylesheet's defaults are the ocean's).
  useEffect(() => {
    for (const [name, color] of Object.entries(theme.palette)) document.documentElement.style.setProperty(`--${name}`, color);
  }, []);

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

  // Last seconds: a soft tick each second.
  const lastTick = useRef<number | null>(null);
  useEffect(() => {
    if (g.phase !== 'playing' || config.mode !== 'time' || g.clockMs > UI.warningTickMs) return;
    const second = Math.ceil(g.clockMs / 1000);
    if (second > 0 && second !== lastTick.current) { lastTick.current = second; warningCue(soundRef.current); }
  }, [g.clockMs, g.phase, config.mode]);
  const [sheet, setSheet] = useState<'help' | 'debug' | 'ranking' | null>(null);
  const [debugSetup, setDebugSetup] = useState<DebugSetup>({ variant: 'base' });
  const pausedForSheet = useRef(false);

  const openSheet = (which: 'help' | 'debug' | 'ranking') => {
    pausedForSheet.current = g.phase === 'playing' || g.phase === 'ready';
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

  const boardEnabled = g.phase === 'playing' && (!g.animating || g.settling) && !sheet;
  const byMoves = config.mode === 'moves';
  const warning = !byMoves && g.phase === 'playing' && g.clockMs <= UI.clockWarningMs;

  return (
    <div className="app">
      <Ambient />
      <header className="hud">
        {debugEnabled && (
          <button className="debug-btn" onClick={() => openSheet('debug')} aria-label={STRINGS.debug.open}>⚙</button>
        )}
        {leaderboardEnabled() && (
          <button className="sound-btn ranking-btn" onClick={() => openSheet('ranking')} aria-label={STRINGS.leaderboard.open}>
            <TrophyIcon />
          </button>
        )}
        <button className={`sound-btn${sound ? '' : ' off'}`} onClick={toggleSound} aria-label={sound ? STRINGS.soundOff : STRINGS.soundOn} aria-pressed={sound}>
          <SpeakerIcon on={sound} />
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
      </main>

      {g.countdown !== null && !sheet && (
        <div className="countdown" aria-live="assertive">
          <span
            key={g.countdown}
            className={g.countdown ? 'count' : 'count go'}
            style={{ animationDuration: `${g.countdown ? UI.countdown.stepMs : UI.countdown.goMs}ms` }}
          >{g.countdown || STRINGS.go}</span>
        </div>
      )}

      <footer className="bottom">
        <button className="round-btn" onClick={() => openSheet('help')} aria-label={STRINGS.help}>?</button>
        <FoodChain theme={theme} tierCount={config.tiers.length} />
        <button className="round-btn" onClick={g.pause} aria-label={STRINGS.pause} disabled={g.phase !== 'playing'}>
          <span className="pause-icon" aria-hidden="true" />
        </button>
      </footer>

      {sheet === 'help' && <HelpModal theme={theme} config={config} onClose={closeSheet} />}
      {sheet === 'debug' && <DebugPanel scenario={scenario} game={g.game} setup={debugSetup} onStart={startDebugGame} onClose={closeSheet} />}
      {sheet === 'ranking' && <RankingModal ranking={scenario.rankingId} onClose={closeSheet} />}
      {g.phase === 'start' && !sheet && (
        <StartScreen theme={theme} tierCount={config.tiers.length} onStart={g.begin} onRanking={leaderboardEnabled() ? () => openSheet('ranking') : undefined} />
      )}
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
          ranking={g.records && leaderboardEnabled() ? scenario.rankingId : null}
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

/** The first tap starts the game (and, on phones, unlocks sound for the countdown). */
function StartScreen({ theme, tierCount, onStart, onRanking }: { theme: Theme; tierCount: number; onStart: () => void; onRanking?: () => void }) {
  const top = themeLevels(theme, tierCount)[tierCount - 1];
  const start = () => { unlockAudio(); onStart(); };
  return (
    <div className="overlay start-screen" onClick={start}>
      <span className="start-mascot" aria-hidden="true">{renderSprite(top.sprite, { color: top.color })}</span>
      <span className="start-title">{STRINGS.title}</span>
      <button className="start-tap" onClick={(e) => { e.stopPropagation(); start(); }} autoFocus>{STRINGS.tapToStart}</button>
      {onRanking && (
        <button className="start-ranking" onClick={(e) => { e.stopPropagation(); onRanking(); }}>
          <TrophyIcon /> {STRINGS.leaderboard.title}
        </button>
      )}
    </div>
  );
}

/** The shared ranking, any time (top bar trophy or start screen). */
function RankingModal({ ranking, onClose }: { ranking: string; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={STRINGS.leaderboard.title}>
        <h2>{STRINGS.leaderboard.title}</h2>
        <Leaderboard ranking={ranking} />
        <button className="primary-btn" onClick={onClose} autoFocus>{STRINGS.close}</button>
      </div>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M7 4 H17 V9 A5 5 0 0 1 7 9 Z" fill="currentColor" />
      <path d="M7 6 H4 A3 3 0 0 0 7 11 M17 6 H20 A3 3 0 0 1 17 11" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 14 H13 V17 H16 V20 H8 V17 H11 Z" fill="currentColor" />
    </svg>
  );
}

function GameOver({ title, stats, best, newBest, ranking, theme, tierCount, onRestart }: {
  title: string; stats: GameStats; best: number; newBest: boolean; ranking: string | null; theme: Theme; tierCount: number; onRestart: () => void;
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
        {ranking && <Leaderboard ranking={ranking} score={stats.score} />}
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
