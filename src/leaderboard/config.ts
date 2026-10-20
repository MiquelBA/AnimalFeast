// The shared leaderboard's Supabase project. The anon key is public by design: the database only
// lets it read scores and add new ones (supabase/leaderboard.sql). Empty = no leaderboard shown.
// Set them here, or with VITE_LEADERBOARD_URL / VITE_LEADERBOARD_KEY at build time.
export const LEADERBOARD = {
  url: (import.meta.env.VITE_LEADERBOARD_URL as string | undefined) ?? '',
  anonKey: (import.meta.env.VITE_LEADERBOARD_KEY as string | undefined) ?? '',
  /** How many players the ranking shows. */
  topCount: 10,
  /** Give up on the network after this long; the game never waits on it. */
  timeoutMs: 6000,
  /** Longest player name. */
  maxNameLength: 16,
  /** Where the player's id and name are kept on the device. */
  playerKey: 'animal-feast:player',
};

export function leaderboardEnabled(): boolean {
  return Boolean(LEADERBOARD.url && LEADERBOARD.anonKey);
}
