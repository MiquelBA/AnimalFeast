import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STRINGS } from '../strings';
import {
  currentStreak, dailyDate, dailyRanking, dailySeed, finishOfficial, loadDaily, msUntilNext, playedToday, previousDate, shortDate, startOfficial,
} from '../daily';

beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
  });
});

describe('daily challenge', () => {
  it('changes at midnight in Barcelona, not UTC', () => {
    expect(dailyDate(new Date('2026-10-20T21:59:00Z'))).toBe('2026-10-20'); // 23:59 summer time
    expect(dailyDate(new Date('2026-10-20T22:01:00Z'))).toBe('2026-10-21');
    expect(dailyDate(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01'); // winter time, +1
    expect(msUntilNext(new Date('2026-10-20T21:00:00Z'))).toBe(3_600_000);
    expect(previousDate('2026-03-01')).toBe('2026-02-28');
  });

  it('gives everyone the same board each day, and a new one the next', () => {
    expect(dailySeed('ocean', '2026-10-21')).toBe(dailySeed('ocean', '2026-10-21'));
    expect(dailySeed('ocean', '2026-10-21')).not.toBe(dailySeed('ocean', '2026-10-22'));
    expect(dailyRanking('ocean-v0.6', '2026-10-21')).toMatch(/^[a-z0-9.-]{1,32}$/);
    expect(dailyRanking('ocean-v0.6', '2026-10-21')).toBe('ocean-v0.6-d20261021');
    expect(shortDate('2026-10-01')).toBe('1/10');
  });

  it('counts one official attempt a day and keeps the streak', () => {
    let r = loadDaily();
    expect(playedToday(r, '2026-10-20')).toBe(false);
    r = startOfficial(r, '2026-10-20');
    expect(playedToday(r, '2026-10-20')).toBe(true);
    r = finishOfficial(r, '2026-10-20', 1200);
    expect(startOfficial(r, '2026-10-20')).toEqual(r); // a second game the same day changes nothing
    r = startOfficial(r, '2026-10-21');
    expect(r.streak).toBe(2);
    expect(r.score).toBeNull();
    expect(currentStreak(r, '2026-10-22')).toBe(2); // still alive the next day
    expect(currentStreak(r, '2026-10-23')).toBe(0); // a day missed
    expect(startOfficial(r, '2026-10-24').streak).toBe(1);
    expect(loadDaily().date).toBe('2026-10-24');
  });

  it('shares a result without spoilers', () => {
    expect(STRINGS.daily.shareText({ date: '21/10', score: '18.400', rank: 7, total: 23, frenzies: 3, whirlpools: 2 }))
      .toBe('🐋 Orca Lunch · Repte 21/10\n18.400 punts · 7è de 23\n🔥🔥🔥 3 frenesís · 🌀 2 remolins');
    expect(STRINGS.daily.shareText({ date: '21/10', score: '900', rank: null, total: null, frenzies: 0, whirlpools: 0 }))
      .toBe('🐋 Orca Lunch · Repte 21/10\n900 punts');
    expect(STRINGS.daily.rank(1, 5)).toBe('Ets el 1r de 5');
  });
});
