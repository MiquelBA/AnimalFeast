// Screens: menu, game (HUD, board, hand ladder), pause, end of game, how to play, daily challenge.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { TraceStatus } from '../engine/game';
import { parseCards } from '../engine/notation';
import { HAND_TYPES, type GameState, type HandType } from '../engine/types';
import { playRung, playSound, setMuted, unlockAudio } from './audio';
import { Board } from './Board';
import { CardFace } from './CardFace';
import { currentStreak, dailyDate, dailySeed, finishOfficial, loadDaily, msUntilNext, playedToday, shortDate, startOfficial } from './daily';
import { vibrate } from './haptics';
import { loadBest, loadFlag, saveBest, saveFlag } from './storage';
import { BLAST_RULES, HAND_EXAMPLES, HAND_NAMES, HAND_RULES, STRINGS } from './strings';
import { HAND_TIER, UI } from './uiConfig';
import { useGame, type Floater } from './useGame';
import { DEFAULT_CONFIG } from '../engine/config';

type Mode = 'free' | 'daily' | 'practice';

interface Trace {
  readonly length: number;
  readonly status: TraceStatus | null;
  readonly hand: HandType | null;
  /** Base points of the hand (before combo and golden cards). */
  readonly points: number;
}

const fmt = (v: number) => v.toLocaleString('ca');

export function App() {
  const [best, setBest] = useState(() => loadBest(UI.bestKey));
  const [newBest, setNewBest] = useState(false);
  const [sound, setSound] = useState(() => loadFlag(UI.soundKey, true));
  const [mode, setMode] = useState<Mode>('free');
  const [daily, setDaily] = useState(loadDaily);
  const [day, setDay] = useState(dailyDate);
  const [sheet, setSheet] = useState<'help' | null>(null);
  const [trace, setTrace] = useState<Trace>({ length: 0, status: null, hand: null, points: 0 });
  const [copied, setCopied] = useState(false);
  const modeRef = useRef<Mode>('free');
  const pendingStart = useRef<Mode | null>(null);

  const onOver = useCallback((s: GameState) => {
    setBest((b) => {
      if (s.score > b) {
        saveBest(UI.bestKey, s.score);
        setNewBest(true);
        window.setTimeout(() => playSound('newBest'), 500);
        return s.score;
      }
      setNewBest(false);
      return b;
    });
    if (modeRef.current === 'daily') setDaily((d) => finishOfficial(d, dailyDate(), s.score));
  }, []);

  const game = useGame(onOver);
  const { state, frame, phase, paused } = game;

  useEffect(() => setMuted(!sound), [sound]);

  // Audio can only start inside a touch.
  useEffect(() => {
    const unlock = () => unlockAudio();
    for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock, { passive: true });
    return () => { for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) window.removeEventListener(ev, unlock); };
  }, []);

  // A new day brings a new challenge, even with the page left open.
  useEffect(() => {
    const t = window.setInterval(() => setDay(dailyDate()), 30_000);
    return () => clearInterval(t);
  }, []);

  const begin = (m: Mode) => {
    // The first game starts with how to play.
    if (!loadFlag(UI.helpSeenKey, false)) {
      saveFlag(UI.helpSeenKey, true);
      pendingStart.current = m;
      setSheet('help');
      return;
    }
    setNewBest(false);
    setCopied(false);
    modeRef.current = m;
    setMode(m);
    if (m === 'daily') {
      setDaily((d) => startOfficial(d, day));
      game.start(dailySeed(day));
    } else if (m === 'practice') game.start(dailySeed(day));
    else game.start(Math.floor(Math.random() * 2 ** 31));
  };

  const startDaily = () => begin(playedToday(daily, day) ? 'practice' : 'daily');

  const closeHelp = () => {
    setSheet(null);
    const m = pendingStart.current;
    pendingStart.current = null;
    if (m) begin(m);
  };

  const onTrace = useCallback((length: number, status: TraceStatus | null, hand: HandType | null, points: number, grew: boolean) => {
    setTrace({ length, status, hand, points });
    if (grew && length > 0) {
      playRung(length - 1, status === 'valid');
      vibrate('step');
    }
  }, []);

  const onReject = useCallback(() => {
    playSound('invalid');
    vibrate('invalid');
  }, []);

  const toggleSound = () => {
    setSound((s) => {
      saveFlag(UI.soundKey, !s);
      return !s;
    });
  };

  const left = Math.max(0, state.timeLimitMs - state.elapsedMs);
  const playing = phase === 'playing' || phase === 'countdown';
  const enabled = phase === 'playing' && !paused && !game.busy;
  const streak = currentStreak(daily, day);

  const copyResult = async () => {
    const bestHand = game.stats?.bestHand ? HAND_NAMES[game.stats.bestHand] : '';
    const text = STRINGS.shareText(state.score, bestHand, mode === 'free' ? null : shortDate(day));
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`app ${playing || phase === 'over' ? 'in-game' : 'in-menu'}`}>
      <header className="hud">
        <div className="hud-cell hud-score">
          <span className="hud-label">{STRINGS.score}</span>
          <span className="hud-value">{fmt(state.score)}</span>
        </div>
        <div className={`hud-cell hud-clock ${left <= UI.clockWarningMs && phase === 'playing' ? 'warn' : ''}`}>
          <span className="hud-value clock">{clockText(left)}</span>
        </div>
        <div className="hud-cell hud-right">
          <button className="icon-btn" type="button" onClick={() => game.setPaused(true)} aria-label={STRINGS.pause} disabled={phase !== 'playing'}>
            <PauseIcon />
          </button>
          <span className="hud-best">{STRINGS.best} {fmt(best)}</span>
        </div>
      </header>

      <main className="stage">
        <TraceLabel trace={trace} />
        <div className="board-wrap">
          <Board
            board={state.board}
            frame={frame}
            config={state.config}
            hint={game.hint}
            enabled={enabled}
            onPlay={game.play}
            onActivity={game.activity}
            onTrace={onTrace}
            onReject={onReject}
          />
          <Floaters floaters={game.floaters} rows={state.config.rows} cols={state.config.cols} />
          {game.banner && game.banner.tier < 4 && <HandBanner key={game.banner.id} hand={game.banner.hand} points={game.banner.points} />}
        </div>
      </main>

      <footer className="ladder" aria-label={STRINGS.hands}>
        {HAND_TYPES.map((h) => (
          <div key={h} className={`rung tier-${HAND_TIER[h]} ${trace.hand === h ? 'on' : ''} ${state.handCounts[h] ? 'made' : ''}`}>
            <span className="rung-name">{HAND_NAMES[h]}</span>
            <span className="rung-count">{state.handCounts[h] || '·'}</span>
          </div>
        ))}
      </footer>

      {game.banner?.tier === 4 && <RoyalTakeover key={game.banner.id} />}

      {phase === 'countdown' && game.countdown !== null && (
        <div className="overlay countdown" key={game.countdown}>
          <span className="count">{game.countdown > 0 ? game.countdown : STRINGS.go}</span>
        </div>
      )}

      {phase === 'playing' && paused && (
        <div className="overlay dim">
          <div className="sheet">
            <h2>{STRINGS.paused}</h2>
            <button className="btn primary" type="button" onClick={() => game.setPaused(false)}>{STRINGS.resume}</button>
            <button className="btn" type="button" onClick={toggleSound}>{sound ? STRINGS.soundOn : STRINGS.soundOff}</button>
            <button className="btn" type="button" onClick={() => setSheet('help')}>{STRINGS.howTo}</button>
            <button className="btn ghost" type="button" onClick={game.quit}>{STRINGS.quit}</button>
          </div>
        </div>
      )}

      {phase === 'menu' && (
        <Menu
          best={best}
          sound={sound}
          dailyDone={playedToday(daily, day)}
          dailyScore={daily.date === day ? daily.score : null}
          streak={streak}
          day={day}
          onPlay={() => begin('free')}
          onDaily={startDaily}
          onHelp={() => setSheet('help')}
          onSound={toggleSound}
        />
      )}

      {phase === 'over' && game.stats && (
        <GameOver
          score={state.score}
          best={best}
          newBest={newBest}
          stats={game.stats}
          mode={mode}
          day={day}
          copied={copied}
          onAgain={() => begin(mode === 'free' ? 'free' : 'practice')}
          onMenu={game.quit}
          onCopy={copyResult}
        />
      )}

      {sheet === 'help' && <Help onClose={closeHelp} />}
    </div>
  );
}

function clockText(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function TraceLabel({ trace }: { trace: Trace }) {
  let text = '';
  let cls = '';
  if (trace.length && trace.hand) {
    text = `${HAND_NAMES[trace.hand]} · ${fmt(trace.points)}`;
    cls = `valid tier-${HAND_TIER[trace.hand]}`;
  } else if (trace.length >= 2 && trace.status === 'invalid') {
    text = STRINGS.notAHand;
    cls = 'invalid';
  } else if (trace.length) {
    text = '• '.repeat(trace.length).trim();
    cls = 'partial';
  }
  return <div className={`trace-label ${cls}`} aria-live="polite">{text}</div>;
}

function HandBanner({ hand, points }: { hand: HandType; points: number }) {
  const tier = HAND_TIER[hand];
  return (
    <div className={`hand-banner tier-${tier}`} style={{ animationDuration: `${UI.anim.banner[tier]}ms` }}>
      <span className="hand-name">{HAND_NAMES[hand]}</span>
      {tier >= 1 && <span className="hand-points">{STRINGS.points(points)}</span>}
    </div>
  );
}

function RoyalTakeover() {
  const cards = useMemo(() => parseCards(HAND_EXAMPLES.royalFlush), []);
  return (
    <div className="royal" style={{ animationDuration: `${UI.anim.banner[4]}ms` }} aria-hidden="true">
      <div className="royal-rays" />
      <div className="royal-title">{HAND_NAMES.royalFlush}</div>
      <div className="royal-cards">
        {cards.map((c, i) => <div key={i} className="royal-card" style={{ ['--i' as string]: i }}><CardFace card={c} /></div>)}
      </div>
    </div>
  );
}

function Floaters({ floaters, rows, cols }: { floaters: readonly Floater[]; rows: number; cols: number }) {
  return (
    <div className="floaters" aria-hidden="true">
      {floaters.map((f) => {
        const style: CSSProperties = f.at
          ? { left: `${((f.at.col + 0.5) / cols) * 100}%`, top: `${((f.at.row + 0.5) / rows) * 100}%`, animationDuration: `${UI.anim.floatText}ms` }
          : { animationDuration: `${UI.anim.floatText + 300}ms` };
        return <div key={f.id} className={`floater float-${f.kind}`} style={style}>{floaterText(f)}</div>;
      })}
    </div>
  );
}

function floaterText(f: Floater): string {
  switch (f.kind) {
    case 'points': return STRINGS.points(f.value);
    case 'blast': return STRINGS.points(f.value);
    case 'time': return STRINGS.timeBonus(f.value / 1000);
    case 'golden': return STRINGS.golden(f.value);
    case 'shuffle': return STRINGS.shuffle;
    case 'combo': {
      const key = UI.comboTextKeys[Math.min(f.value - 2, UI.comboTextKeys.length - 1)];
      return `${STRINGS[key]} ${STRINGS.times(Number(f.text))}`;
    }
  }
}

interface MenuProps {
  best: number;
  sound: boolean;
  dailyDone: boolean;
  dailyScore: number | null;
  streak: number;
  day: string;
  onPlay: () => void;
  onDaily: () => void;
  onHelp: () => void;
  onSound: () => void;
}

function Menu({ best, sound, dailyDone, dailyScore, streak, day, onPlay, onDaily, onHelp, onSound }: MenuProps) {
  const cards = useMemo(() => parseCards('TH JH QH KH AH'), []);
  const ms = msUntilNext();
  return (
    <div className="overlay menu">
      <div className="menu-inner">
        <div className="logo-fan" aria-hidden="true">
          {cards.map((c, i) => <div key={i} className="fan-card" style={{ ['--i' as string]: i }}><CardFace card={c} /></div>)}
        </div>
        <h1 className="logo">POKER<br /><span>CRUSH</span></h1>
        <p className="tagline">{STRINGS.tagline}</p>
        <button className="btn primary big" type="button" onClick={onPlay}>{STRINGS.play}</button>
        <button className="btn daily" type="button" onClick={onDaily}>
          <span>{dailyDone ? STRINGS.dailyPractice : STRINGS.daily} · {shortDate(day)}</span>
          <small>
            {dailyDone && dailyScore !== null ? `${fmt(dailyScore)} punts · ` : ''}
            {dailyDone ? STRINGS.nextDaily(Math.floor(ms / 3_600_000), Math.floor((ms % 3_600_000) / 60_000)) : STRINGS.dailyInfo}
          </small>
          {streak > 0 && <small className="streak">🔥 {STRINGS.streak(streak)}</small>}
        </button>
        <div className="menu-row">
          <button className="btn small" type="button" onClick={onHelp}>{STRINGS.howTo}</button>
          <button className="btn small" type="button" onClick={onSound}>{sound ? STRINGS.soundOn : STRINGS.soundOff}</button>
        </div>
        {best > 0 && <p className="menu-best">{STRINGS.best}: {fmt(best)}</p>}
      </div>
    </div>
  );
}

interface GameOverProps {
  score: number;
  best: number;
  newBest: boolean;
  stats: NonNullable<ReturnType<typeof useGame>['stats']>;
  mode: Mode;
  day: string;
  copied: boolean;
  onAgain: () => void;
  onMenu: () => void;
  onCopy: () => void;
}

function GameOver({ score, best, newBest, stats, mode, day, copied, onAgain, onMenu, onCopy }: GameOverProps) {
  const shown = useCountUp(score, UI.countUpMs);
  const made = HAND_TYPES.filter((h) => stats.handCounts[h] > 0).reverse();
  return (
    <div className="overlay dim">
      <div className="sheet over">
        <h2>{STRINGS.gameOver}</h2>
        {mode !== 'free' && <p className="over-mode">{mode === 'daily' ? STRINGS.daily : STRINGS.dailyPractice} · {shortDate(day)}</p>}
        <p className="over-score">{fmt(shown)}</p>
        {newBest ? <p className="over-best new">{STRINGS.newBest}</p> : <p className="over-best">{STRINGS.best}: {fmt(best)}</p>}
        <div className="over-hands">
          {made.length === 0 && <p>{STRINGS.noHands}</p>}
          {made.map((h) => (
            <div key={h} className={`over-hand tier-${HAND_TIER[h]}`}>
              <span>{HAND_NAMES[h]}</span>
              <span>×{stats.handCounts[h]}</span>
            </div>
          ))}
        </div>
        <p className="over-line">{STRINGS.bestMove}: {fmt(stats.bestMove)}</p>
        <button className="btn primary big" type="button" onClick={onAgain}>{STRINGS.playAgain}</button>
        <div className="menu-row">
          <button className="btn small" type="button" onClick={onCopy}>{copied ? STRINGS.copied : STRINGS.copyResult}</button>
          <button className="btn small" type="button" onClick={onMenu}>{STRINGS.quit}</button>
        </div>
      </div>
    </div>
  );
}

function useCountUp(target: number, ms: number): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setV(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Help({ onClose }: { onClose: () => void }) {
  const H = STRINGS.help;
  return (
    <div className="overlay dim" onClick={onClose}>
      <div className="sheet help" onClick={(e) => e.stopPropagation()}>
        <h2>{H.title}</h2>
        <p>{H.trace}</p>
        <p><strong>{H.all}</strong></p>
        <p>{H.time}</p>
        <div className="help-specials">
          <div className="help-special"><div className="mini"><CardFace card={{ rank: 0, suit: 0, joker: true }} /></div><span>{H.joker}</span></div>
          <div className="help-special"><div className="mini"><CardFace card={{ rank: 12, suit: 1, golden: true }} /></div><span>{H.golden}</span></div>
        </div>
        <h3>{H.handsTitle}</h3>
        <div className="help-hands">
          {HAND_TYPES.map((h) => {
            const def = DEFAULT_CONFIG.hands[h];
            return (
              <div key={h} className={`help-hand tier-${HAND_TIER[h]}`}>
                <div className="help-hand-head">
                  <span className="help-hand-name">{HAND_NAMES[h]}</span>
                  <span className="help-hand-points">{fmt(def.points)}</span>
                </div>
                <div className="help-cards">
                  {parseCards(HAND_EXAMPLES[h]).map((c, i) => <div key={i} className="mini"><CardFace card={c} /></div>)}
                </div>
                <span className="help-hand-rule">
                  {HAND_RULES[h]}
                  {def.blast ? ` · ${BLAST_RULES[def.blast]}` : ''}
                  {def.timeBonusMs ? ` · ${STRINGS.timeBonus(def.timeBonusMs / 1000)}` : ''}
                </span>
              </div>
            );
          })}
        </div>
        <button className="btn primary" type="button" onClick={onClose}>{STRINGS.close}</button>
      </div>
    </div>
  );
}
