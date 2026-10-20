// Anonymous, cookie-free stats: what happens (a visit, a game, a share), when, and the phone's
// random id, so we can count players and returns. Nothing personal. Never blocks the game.
import { insertRow } from './api';
import { leaderboardEnabled } from './config';
import { deviceId } from './device';

export type TrackKind = 'visit' | 'game_start' | 'game_end' | 'share' | 'install' | 'ranking_view' | 'feedback';

export function track(kind: TrackKind, score?: number, meta: Record<string, string | number | boolean> = {}): void {
  if (!leaderboardEnabled()) return;
  insertRow('events', { device_id: deviceId(), kind, score: score ?? null, meta }).catch(() => {
    // Stats are best effort: offline or refused, the game carries on.
  });
}

export async function sendFeedback(message: string, meta: Record<string, string | number | boolean>): Promise<void> {
  await insertRow('feedback', { device_id: deviceId(), message, meta });
  track('feedback');
}
