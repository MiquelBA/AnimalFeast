// The shared leaderboard over Supabase's REST API (plain fetch, no SDK).
import { LEADERBOARD } from './config';

export interface RankedScore {
  readonly playerId: string;
  readonly name: string;
  readonly score: number;
}

type Fetch = typeof fetch;

async function request(path: string, init: RequestInit = {}, fetcher: Fetch = fetch): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LEADERBOARD.timeoutMs);
  try {
    const response = await fetcher(`${LEADERBOARD.url}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: LEADERBOARD.anonKey,
        Authorization: `Bearer ${LEADERBOARD.anonKey}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!response.ok) throw new Error(`Leaderboard: HTTP ${response.status}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function submitScore(ranking: string, playerId: string, name: string, score: number, fetcher?: Fetch): Promise<void> {
  await request('scores', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ ranking, player_id: playerId, name, score }),
  }, fetcher);
}

/** The best players (one row each, their best score), highest first. */
export async function fetchTop(ranking: string, limit: number, fetcher?: Fetch): Promise<RankedScore[]> {
  const query = `leaderboard?select=player_id,name,score&ranking=eq.${encodeURIComponent(ranking)}&order=score.desc,created_at.asc&limit=${limit}`;
  const rows = (await (await request(query, {}, fetcher)).json()) as { player_id: string; name: string; score: number }[];
  return rows.map((r) => ({ playerId: r.player_id, name: r.name, score: r.score }));
}

/** Where `score` would place: 1 + the players whose best is higher. */
export async function fetchRank(ranking: string, score: number, fetcher?: Fetch): Promise<number> {
  const query = `leaderboard?select=player_id&ranking=eq.${encodeURIComponent(ranking)}&score=gt.${score}`;
  const response = await request(query, { method: 'HEAD', headers: { Prefer: 'count=exact' } }, fetcher);
  const total = Number(response.headers.get('Content-Range')?.split('/')[1]);
  return (Number.isFinite(total) ? total : 0) + 1;
}
