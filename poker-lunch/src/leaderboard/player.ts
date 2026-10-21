// The player on this device: a random id and the name they chose (no accounts).
import { LEADERBOARD } from './config';
import { deviceId } from './device';

export interface Player {
  readonly id: string;
  readonly name: string;
}

/** Trims, collapses spaces, drops control characters and caps the length. Empty means invalid. */
export function cleanName(raw: string): string {
  return [...raw.replace(/\p{C}/gu, '').replace(/\s+/g, ' ').trim()].slice(0, LEADERBOARD.maxNameLength).join('').trim();
}

export function loadPlayer(): Player | null {
  try {
    const value = JSON.parse(localStorage.getItem(LEADERBOARD.playerKey) ?? 'null') as Partial<Player> | null;
    return value && typeof value.id === 'string' && typeof value.name === 'string' && cleanName(value.name)
      ? { id: value.id, name: cleanName(value.name) }
      : null;
  } catch {
    return null;
  }
}

/** Saves the name under this phone's id. */
export function savePlayer(name: string, previous: Player | null): Player {
  const player = { id: previous?.id ?? deviceId(), name: cleanName(name) };
  try {
    localStorage.setItem(LEADERBOARD.playerKey, JSON.stringify(player));
  } catch {
    // Storage unavailable: the name lasts this visit only.
  }
  return player;
}
