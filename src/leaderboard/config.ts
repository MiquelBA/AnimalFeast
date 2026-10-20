// The shared leaderboard's Supabase project. The anon key is public by design: the database only
// lets it read scores and add new ones (supabase/leaderboard.sql). Empty = no leaderboard shown.
// Set them here, or with VITE_LEADERBOARD_URL / VITE_LEADERBOARD_KEY at build time.
export const LEADERBOARD = {
  url: (import.meta.env.VITE_LEADERBOARD_URL as string | undefined) ?? 'https://gjfkfmqweimyjvapdoof.supabase.co',
  anonKey: (import.meta.env.VITE_LEADERBOARD_KEY as string | undefined) ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmtmbXF3ZWlteWp2YXBkb29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0ODQ5ODMsImV4cCI6MjEwODA2MDk4M30.x4NCW3kJkXyh1jE3WIHjvEiECMtOTYAv3Z_lemlq4K4',
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
