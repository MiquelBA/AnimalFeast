// Portrait game screen: HUD on top, the board in the middle, discreet controls at thumb height.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { renderSprite } from '../assets/spriteRegistry';
import { makeConfig } from '../engine/config';
import { VARIANTS } from '../engine/variants';
import { minEnergyGain } from '../engine/score';
import type { GameConfig, GameStats } from '../engine/types';
import { Leaderboard } from '../leaderboard/Leaderboard';
import { leaderboardEnabled } from '../leaderboard/config';
import { sendFeedback, track } from '../leaderboard/track';
import { installMode, onInstallChange, promptInstall } from './install';
import { shareScore, shareText } from './share';
import { currentStreak, dailyDate, dailyRanking, dailySeed, finishOfficial, loadDaily, markIntroSeen, msUntilNext, playedToday, shortDate, startOfficial } from './daily';
import { TutorialModal } from './Tutorial';
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
import { applyLook } from './look';

function urlParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}
const debugEnabled = urlParam('debug') === '1';
/** ?look=<name> tries one of the visual mock-ups (see look.ts); the phone remembers it. */
applyLook(urlParam('look'));
/** ?scenario=<id> picks the world (only the ocean for now). */
const scenario = scenarioById(urlParam('scenario'));
const theme = scenario.theme;
/** ?variant=<key> plays a rule variant from the start (for testing on a phone); it doesn't count for the record. */
const urlVariant = urlParam('variant');
const startConfig = urlVariant && VARIANTS[urlVariant] ? makeConfig(VARIANTS[urlVariant].overrides) : scenario.config;

type Sheet = 'help' | 'debug' | 'ranking' | 'feedback' | 'install' | 'tutorial' | 'dailyIntro' | 'dailyDone';
/** A free game, today's official challenge, or the challenge replayed as practice. */
type Mode = 'free' | 'daily' | 'practice';

function formatClock(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function App() {
  const [sound, setSound] = useState(() => loadFlag(UI.soundKey, true));
  const soundRef = useRef(sound);
  useEffect(() => { soundRef.current = sound; }, [sound]);
  const [mode, setMode] = useState<Mode>('free');
  /** The challenge's day, fixed when its game starts (a game that ends after midnight keeps it). */
  const [day, setDay] = useState(dailyDate);
  const [daily, setDaily] = useState(loadDaily);
  const g = useGame(scenario, startConfig, {
    onFrame: (frame) => frameCue(frame, soundRef.current),
    onFinish: (newBest, state) => {
      finishCue(newBest, soundRef.current);
      if (mode === 'daily') setDaily((d) => finishOfficial(d, day, state.score));
      track('game_end', state.score, {
        scenario: scenario.id, mode, ranked: g.records, chains: state.chains, frenzies: state.frenzies,
        whirlpools: state.whirlpools, bestMove: state.bestMove, moves: state.moves,
      });
    },
    onCountdown: (count) => {
      countdownCue(count, soundRef.current);
      if (count === 0) track('game_start', undefined, { scenario: scenario.id, mode, ranked: g.records });
    },
  });
  const config = g.config;

  // Anonymous stats: one visit per page load.
  useEffect(() => track('visit', undefined, { scenario: scenario.id, standalone: installMode() === null }), []);
  // The install offer can arrive (or go) at any time.
  const [install, setInstall] = useState(installMode);
  useEffect(() => onInstallChange(() => setInstall(installMode())), []);
  const offerInstall = async () => {
    if (install === 'ios') { openSheet('install'); return; }
    if (await promptInstall()) track('install');
  };

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
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [debugSetup, setDebugSetup] = useState<DebugSetup>({ variant: 'base' });
  const pausedForSheet = useRef(false);

  const openSheet = (which: Sheet) => {
    pausedForSheet.current = g.phase === 'playing' || g.phase === 'ready';
    g.pause();
    setSheet(which);
  };
  /** What the player chose on the start screen, kept while the walkthrough or the challenge's intro shows. */
  const pending = useRef<'free' | 'daily'>('free');
  const playFree = () => {
    setSheet(null);
    setMode('free');
    if (g.phase === 'start') g.begin();
    else g.restart({ config: startConfig });
  };
  /** Today's challenge: the official attempt if it's still there, practice otherwise. */
  const playDaily = (asPractice: boolean) => {
    const today = dailyDate();
    const official = !asPractice && !playedToday(daily, today);
    setSheet(null);
    setDay(today);
    setMode(official ? 'daily' : 'practice');
    if (official) setDaily((d) => startOfficial(d, today));
    g.restart({ seed: dailySeed(scenario.id, today), config: scenario.config, records: false });
  };
  /** The daily button: the first time it explains the challenge; once played, it says when the next one comes. */
  const openDaily = () => {
    const today = dailyDate();
    setDay(today);
    if (playedToday(daily, today)) setSheet('dailyDone');
    else if (!daily.introSeen) setSheet('dailyIntro');
    else playDaily(false);
  };
  // The first game of each visit starts with the walkthrough, until the player ticks "don't show
  // again"; it can be seen again from the help.
  const [tutorialHidden, setTutorialHidden] = useState(() => loadFlag(UI.tutorialHiddenKey, false));
  const startGame = (which: 'free' | 'daily') => {
    pending.current = which;
    if (!tutorialHidden) setSheet('tutorial');
    else if (which === 'daily') openDaily();
    else playFree();
  };
  const finishTutorial = (hide: boolean) => {
    saveFlag(UI.tutorialHiddenKey, hide);
    setTutorialHidden(hide);
    if (g.phase !== 'start') closeSheet();
    else if (pending.current === 'daily') openDaily();
    else playFree();
  };
  const closeSheet = () => {
    setSheet(null);
    if (pausedForSheet.current) g.resume();
    pausedForSheet.current = false;
  };
  const startDebugGame = (options: NewGameOptions, setup: DebugSetup) => {
    setDebugSetup(setup);
    setMode('free');
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
        <h1 className="title">{mode === 'daily' ? STRINGS.daily.hud(shortDate(day)) : mode === 'practice' ? STRINGS.daily.practiceHud : STRINGS.title}</h1>
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

      {/* Under the sheets, so the ranking or the challenge's cards can open over it. */}
      {g.phase === 'over' && (
        <GameOver
          title={byMoves ? STRINGS.gameOverMoves : STRINGS.gameOver}
          stats={g.game}
          best={g.best}
          newBest={g.newBest}
          ranking={!leaderboardEnabled() ? null : mode === 'daily' ? dailyRanking(scenario.rankingId, day) : g.records ? scenario.rankingId : null}
          mode={mode}
          day={day}
          streak={currentStreak(daily, dailyDate())}
          theme={theme}
          tierCount={config.tiers.length}
          onRestart={() => { setDebugSetup((d) => ({ variant: d.variant })); if (mode === 'free') g.restart(); else playFree(); }}
          onDaily={() => (mode === 'free' ? openDaily() : playDaily(true))}
        />
      )}
      {sheet === 'help' && (
        <HelpModal
          theme={theme}
          config={config}
          onClose={closeSheet}
          onTutorial={() => setSheet('tutorial')}
          showDaily
          onFeedback={leaderboardEnabled() ? () => setSheet('feedback') : undefined}
        />
      )}
      {sheet === 'debug' && <DebugPanel scenario={scenario} game={g.game} setup={debugSetup} onStart={startDebugGame} onClose={closeSheet} />}
      {sheet === 'ranking' && <RankingModal ranking={scenario.rankingId} today={dailyRanking(scenario.rankingId, dailyDate())} startToday={mode !== 'free'} onClose={closeSheet} />}
      {sheet === 'dailyIntro' && (
        <DailyIntro
          onBegin={() => { setDaily((d) => markIntroSeen(d)); playDaily(false); }}
          onClose={() => { setDaily((d) => markIntroSeen(d)); closeSheet(); }}
        />
      )}
      {sheet === 'dailyDone' && (
        <DailyDone
          score={daily.score}
          streak={currentStreak(daily, dailyDate())}
          onPractice={() => playDaily(true)}
          onRanking={leaderboardEnabled() ? () => setSheet('ranking') : undefined}
          onClose={closeSheet}
        />
      )}
      {sheet === 'feedback' && <FeedbackModal context={{ scenario: scenario.id, phase: g.phase, score: g.game.score }} onClose={closeSheet} />}
      {sheet === 'install' && <InstallModal onClose={closeSheet} />}
      {sheet === 'tutorial' && <TutorialModal theme={theme} config={config} hidden={tutorialHidden} onDone={finishTutorial} />}
      {g.phase === 'start' && !sheet && (
        <StartScreen
          theme={theme}
          tierCount={config.tiers.length}
          onStart={() => startGame('free')}
          onDaily={() => startGame('daily')}
          dailyPlayed={playedToday(daily, dailyDate())}
          streak={currentStreak(daily, dailyDate())}
          onRanking={leaderboardEnabled() ? () => openSheet('ranking') : undefined}
          onFeedback={leaderboardEnabled() ? () => openSheet('feedback') : undefined}
          onInstall={install ? () => void offerInstall() : undefined}
        />
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
            <span className="chain-animal" title={level.name} data-animal={level.id}>
              {renderSprite(level.sprite, { color: level.color })}
              {large && <span className="chain-name">{level.name}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function HelpModal({ theme, config, onClose, onTutorial, onFeedback, showDaily = false }: { theme: Theme; config: GameConfig; onClose: () => void; onTutorial: () => void; onFeedback?: () => void; showDaily?: boolean }) {
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
        {showDaily && (
          <>
            <h3 className="help-subtitle">{STRINGS.daily.button}</h3>
            <ul className="rules">{STRINGS.daily.rules.map((r) => <li key={r}>{r}</li>)}</ul>
          </>
        )}
        <p className="help-links">
          <button type="button" className="link-btn" onClick={onTutorial}>👆 {STRINGS.tutorial.again}</button>
          {onFeedback && <button type="button" className="link-btn" onClick={onFeedback}>💬 {STRINGS.feedback.button}</button>}
        </p>
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
function StartScreen({ theme, tierCount, onStart, onDaily, dailyPlayed, streak, onRanking, onFeedback, onInstall }: {
  theme: Theme; tierCount: number; onStart: () => void; onDaily: () => void; dailyPlayed: boolean; streak: number;
  onRanking?: () => void; onFeedback?: () => void; onInstall?: () => void;
}) {
  const top = themeLevels(theme, tierCount)[tierCount - 1];
  const untilNext = useUntilNext();
  const start = () => { unlockAudio(); onStart(); };
  const daily = () => { unlockAudio(); onDaily(); };
  return (
    <div className="overlay start-screen">
      <span className="start-mascot" aria-hidden="true">{renderSprite(top.sprite, { color: top.color })}</span>
      <span className="start-title">{STRINGS.title}</span>
      <button className="start-tap" onClick={start} autoFocus>
        {STRINGS.daily.free}
        <small>{STRINGS.daily.freeSub}</small>
      </button>
      <button className={`start-daily${dailyPlayed ? ' done' : ''}`} onClick={daily}>
        {STRINGS.daily.button}{dailyPlayed && ' ✓'}
        <small>{dailyPlayed ? STRINGS.daily.doneSub(STRINGS.daily.time(untilNext)) : STRINGS.daily.sub}</small>
      </button>
      {streak > 0 && <span className="start-streak">{STRINGS.daily.streak(streak)}</span>}
      {onRanking && (
        <button className="start-ranking" onClick={onRanking}>
          <TrophyIcon /> {STRINGS.leaderboard.title}
        </button>
      )}
      {(onInstall || onFeedback) && (
        <span className="start-links">
          {onInstall && <button className="link-btn" onClick={onInstall}>📲 {STRINGS.install.button}</button>}
          {onFeedback && <button className="link-btn" onClick={onFeedback}>💬 {STRINGS.feedback.button}</button>}
        </span>
      )}
    </div>
  );
}

/** Time left until the next challenge, ticking every few seconds. */
function useUntilNext(): number {
  const [ms, setMs] = useState(() => msUntilNext());
  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilNext()), UI.daily.tickMs);
    return () => window.clearInterval(id);
  }, []);
  return ms;
}

/** The first time the daily button is tapped: what the challenge is, before its only attempt. */
function DailyIntro({ onBegin, onClose }: { onBegin: () => void; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={STRINGS.daily.title}>
        <h2>{STRINGS.daily.button}</h2>
        <ul className="rules">{STRINGS.daily.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        <button className="primary-btn" onClick={onBegin} autoFocus>{STRINGS.daily.begin}</button>
        <button type="button" className="link-btn sheet-close" onClick={onClose}>{STRINGS.daily.later}</button>
      </div>
    </div>
  );
}

/** Today's challenge is already played: the result, the streak and when the next one comes. */
function DailyDone({ score, streak, onPractice, onRanking, onClose }: {
  score: number | null; streak: number; onPractice: () => void; onRanking?: () => void; onClose: () => void;
}) {
  const T = STRINGS.daily;
  const untilNext = useUntilNext();
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={T.doneTitle}>
        <h2>{T.doneTitle}</h2>
        {score !== null && <p className="daily-score">{T.doneScore(score.toLocaleString('ca'))}</p>}
        {streak > 0 && <p className="daily-streak">{T.streak(streak)}</p>}
        <p>{T.comeBack(T.time(untilNext))}</p>
        {onRanking && <button className="share-btn" onClick={onRanking}><TrophyIcon /> {T.seeRanking}</button>}
        <button className="primary-btn" onClick={onPractice}>{T.practice}</button>
        <button type="button" className="link-btn sheet-close" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}

/** The shared ranking, any time (top bar trophy or start screen): the general one or today's challenge. */
function RankingModal({ ranking, today, startToday, onClose }: { ranking: string; today: string; startToday: boolean; onClose: () => void }) {
  const [showToday, setShowToday] = useState(startToday);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={STRINGS.leaderboard.title}>
        <h2>{STRINGS.leaderboard.title}</h2>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={!showToday} className={showToday ? '' : 'on'} onClick={() => setShowToday(false)}>{STRINGS.daily.tabGeneral}</button>
          <button role="tab" aria-selected={showToday} className={showToday ? 'on' : ''} onClick={() => setShowToday(true)}>🗓 {STRINGS.daily.tabToday}</button>
        </div>
        <Leaderboard key={showToday ? today : ranking} ranking={showToday ? today : ranking} />
        <button className="primary-btn" onClick={onClose} autoFocus>{STRINGS.close}</button>
      </div>
    </div>
  );
}

/** A short message to us (stored with the phone's random id, the phase and the score). */
function FeedbackModal({ context, onClose }: { context: Record<string, string | number>; onClose: () => void }) {
  const T = STRINGS.feedback;
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || state === 'sending') return;
    setState('sending');
    try {
      await sendFeedback(text.trim(), { ...context, ua: navigator.userAgent.slice(0, 200) });
      setState('sent');
    } catch {
      setState('failed');
    }
  };
  return (
    <div className="overlay" onClick={onClose}>
      <form className="sheet feedback" onClick={(e) => e.stopPropagation()} onSubmit={send} role="dialog" aria-modal="true" aria-label={T.title}>
        <h2>{T.title}</h2>
        {state === 'sent' ? <p>{T.thanks}</p> : (
          <>
            <p>{T.hint}</p>
            <textarea value={text} maxLength={UI.feedbackMaxChars} rows={5} placeholder={T.placeholder} onChange={(e) => setText(e.target.value)} autoFocus />
            {state === 'failed' && <p className="lb-error">{T.failed}</p>}
            <button type="submit" className="primary-btn" disabled={!text.trim() || state === 'sending'}>{state === 'sending' ? T.sending : T.send}</button>
          </>
        )}
        <button type="button" className="link-btn sheet-close" onClick={onClose}>{STRINGS.leaderboard.close}</button>
      </form>
    </div>
  );
}

/** iPhone: how to add the game to the home screen (Safari has no install prompt). */
function InstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={STRINGS.install.title}>
        <h2>{STRINGS.install.title}</h2>
        <ol className="rules">{STRINGS.install.iosSteps.map((s) => <li key={s}>{s}</li>)}</ol>
        <button className="primary-btn" onClick={onClose} autoFocus>{STRINGS.close}</button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 3 V15 M7 8 L12 3 L17 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12 V19 H19 V12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function GameOver({ title, stats, best, newBest, ranking, mode, day, streak, theme, tierCount, onRestart, onDaily }: {
  title: string; stats: GameStats; best: number; newBest: boolean; ranking: string | null; mode: Mode; day: string; streak: number;
  theme: Theme; tierCount: number; onRestart: () => void; onDaily: () => void;
}) {
  const score = useCountUp(stats.score, UI.countUpMs);
  const T = STRINGS.daily;
  const [place, setPlace] = useState<{ rank: number; total: number } | null>(null);
  const share = () => {
    const text = mode === 'daily'
      ? T.shareText({ date: shortDate(day), score: stats.score.toLocaleString('ca'), rank: place?.rank ?? null, total: place?.total ?? null, frenzies: stats.frenzies, whirlpools: stats.whirlpools })
      : null;
    void (text ? shareText(text) : shareScore(stats.score)).then((shared) => shared && track('share', stats.score, { mode }));
  };
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
        {mode === 'daily' && <p className="daily-note">{T.officialNote(shortDate(day))}</p>}
        {mode === 'practice' && <p className="daily-note">{T.practiceNote}</p>}
        <div className="final-label">{STRINGS.statScore}</div>
        <div className="final-score" aria-label={String(stats.score)}>{score}</div>
        {newBest && <div className="new-best">{STRINGS.newBest}</div>}
        {mode === 'daily' && streak > 0 && <div className="daily-streak">{T.streak(streak)}</div>}
        {ranking && (
          <Leaderboard ranking={ranking} score={stats.score} daily={mode === 'daily'} onPlaced={(rank, total) => setPlace({ rank, total })} />
        )}
        <dl className="final-stats">
          {rows.map(([label, value], i) => (
            <div key={label} style={{ animationDelay: `${120 + i * 60}ms` }}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
        <Rating score={stats.score} mode={mode} />
        {stats.score > 0 && mode !== 'practice' && (
          <button className="share-btn" onClick={share}>
            <ShareIcon /> {STRINGS.share.button}
          </button>
        )}
        <button className="primary-btn" onClick={onRestart} autoFocus>{mode === 'free' ? STRINGS.playAgain : T.playFree}</button>
        <button type="button" className="link-btn sheet-close" onClick={onDaily}>{mode === 'free' ? T.playDaily : T.practiceAgain}</button>
      </div>
    </div>
  );
}

/** One tap at the end of a game: did you like it? Stored with the anonymous stats. */
function Rating({ score, mode }: { score: number; mode: Mode }) {
  const T = STRINGS.rating;
  const [answer, setAnswer] = useState<'up' | 'down' | null>(null);
  if (!leaderboardEnabled()) return null;
  const rate = (value: 'up' | 'down') => {
    if (answer) return;
    setAnswer(value);
    track('rating', score, { value, mode });
  };
  return (
    <div className="rating">
      {answer ? <span>{T.thanks}</span> : (
        <>
          <span>{T.ask}</span>
          <button type="button" onClick={() => rate('up')} aria-label={T.up}>👍</button>
          <button type="button" onClick={() => rate('down')} aria-label={T.down}>👎</button>
        </>
      )}
    </div>
  );
}
