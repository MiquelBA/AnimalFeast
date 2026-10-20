// The daily challenge: one board a day, the same for everyone (a seed made from the date), a new one
// at midnight in Barcelona. The first game of the day is the official one; later ones are practice.
// The streak counts days in a row with an official game. Everything is kept on the phone.
import { UI } from './uiConfig';

const DAY_MS = 86_400_000;

/** Today's date where the challenge changes (YYYY-MM-DD). */
export function dailyDate(now: Date = new Date()): string {
  try {
    // en-CA writes dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone: UI.daily.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/** The day before `date` (YYYY-MM-DD). */
export function previousDate(date: string): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** Time left until the next challenge, in ms (a day is taken as 24 h, so the two clock-change nights are an hour off). */
export function msUntilNext(now: Date = new Date()): number {
  let clock: number;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: UI.daily.timeZone, hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' })
      .formatToParts(now);
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
    clock = ((part('hour') * 60 + part('minute')) * 60 + part('second')) * 1000 + now.getMilliseconds();
  } catch {
    clock = now.getTime() % DAY_MS;
  }
  return Math.max(0, DAY_MS - clock);
}

/** The day's seed: the same on every phone (FNV-1a hash of the world and the date). */
export function dailySeed(scenarioId: string, date: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${scenarioId}:${date}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h & 0x7fffffff;
}

/** The day's ranking id: the world's ranking plus the date (the server recognises the -dYYYYMMDD end). */
export function dailyRanking(rankingId: string, date: string): string {
  return `${rankingId}-d${date.replace(/-/g, '')}`;
}

/** "21/10" */
export function shortDate(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(d)}/${m}`;
}

export interface DailyRecord {
  /** The day of the last official game, and its score (null while it is being played). */
  readonly date: string | null;
  readonly score: number | null;
  /** Days in a row with an official game, ending on `date`. */
  readonly streak: number;
  /** The intro card was shown once. */
  readonly introSeen: boolean;
}

const EMPTY: DailyRecord = { date: null, score: null, streak: 0, introSeen: false };

export function loadDaily(): DailyRecord {
  try {
    const v = JSON.parse(localStorage.getItem(UI.daily.key) ?? 'null') as Partial<DailyRecord> | null;
    if (!v) return EMPTY;
    return {
      date: typeof v.date === 'string' ? v.date : null,
      score: typeof v.score === 'number' ? v.score : null,
      streak: typeof v.streak === 'number' ? v.streak : 0,
      introSeen: v.introSeen === true,
    };
  } catch {
    return EMPTY;
  }
}

function saveDaily(record: DailyRecord): DailyRecord {
  try {
    localStorage.setItem(UI.daily.key, JSON.stringify(record));
  } catch {
    // Storage unavailable: the challenge still plays, it just isn't remembered.
  }
  return record;
}

/** Today's official game was started (an abandoned one counts too). */
export function playedToday(record: DailyRecord, today: string): boolean {
  return record.date === today;
}

/** The streak as it stands today: it survives until the end of the day after the last game. */
export function currentStreak(record: DailyRecord, today: string): number {
  return record.date === today || record.date === previousDate(today) ? record.streak : 0;
}

/** The official game starts: the day's attempt is used and the streak grows. */
export function startOfficial(record: DailyRecord, today: string): DailyRecord {
  if (record.date === today) return record;
  return saveDaily({ ...record, date: today, score: null, streak: currentStreak(record, today) + 1 });
}

export function finishOfficial(record: DailyRecord, today: string, score: number): DailyRecord {
  return saveDaily({ ...record, date: today, score });
}

export function markIntroSeen(record: DailyRecord): DailyRecord {
  return saveDaily({ ...record, introSeen: true });
}
