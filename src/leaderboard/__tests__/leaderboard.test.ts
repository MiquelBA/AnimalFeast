import { describe, expect, it, vi } from 'vitest';
import { fetchRank, fetchTop, submitScore } from '../api';
import { LEADERBOARD } from '../config';
import { cleanName } from '../player';

function fakeFetch(body: unknown = [], headers: Record<string, string> = {}) {
  return vi.fn(async (_url: string, _init?: RequestInit) => new Response(body === null ? null : JSON.stringify(body), { status: 200, headers }));
}

describe('leaderboard api', () => {
  it('adds a score with the public key and nothing else', async () => {
    const f = fakeFetch(null);
    await submitScore('ocean-v0.6', 'p1', 'Miquel', 1234, f as unknown as typeof fetch);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(`${LEADERBOARD.url}/rest/v1/scores`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ ranking: 'ocean-v0.6', player_id: 'p1', name: 'Miquel', score: 1234 });
    expect((init!.headers as Record<string, string>).apikey).toBe(LEADERBOARD.anonKey);
  });

  it('reads the top players of one ranking, best first', async () => {
    const f = fakeFetch([{ player_id: 'a', name: 'Anna', score: 900 }, { player_id: 'b', name: 'Biel', score: 500 }]);
    const top = await fetchTop('ocean-v0.6', 10, f as unknown as typeof fetch);
    expect(top).toEqual([{ playerId: 'a', name: 'Anna', score: 900 }, { playerId: 'b', name: 'Biel', score: 500 }]);
    expect(f.mock.calls[0][0]).toContain('leaderboard?select=player_id,name,score&ranking=eq.ocean-v0.6&order=score.desc');
    expect(f.mock.calls[0][0]).toContain('limit=10');
  });

  it('places a score after every player with a higher best', async () => {
    const f = fakeFetch(null, { 'Content-Range': '*/7' });
    expect(await fetchRank('ocean-v0.6', 300, f as unknown as typeof fetch)).toBe(8);
    expect(f.mock.calls[0][0]).toContain('score=gt.300');
  });

  it('fails on an HTTP error, so the screen can offer a retry', async () => {
    const f = vi.fn(async () => new Response('no', { status: 401 }));
    await expect(fetchTop('ocean-v0.6', 10, f as unknown as typeof fetch)).rejects.toThrow('401');
  });
});

describe('player names', () => {
  it('trims, collapses spaces, drops control characters and caps the length', () => {
    expect(cleanName('  Mi   quel \n')).toBe('Mi quel');
    expect(cleanName('a\u0000b')).toBe('ab');
    expect(cleanName('x'.repeat(40))).toHaveLength(LEADERBOARD.maxNameLength);
    expect(cleanName('   ')).toBe('');
  });
});
