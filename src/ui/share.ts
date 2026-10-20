// "Challenge a friend": the phone's share menu when there is one, WhatsApp otherwise.
import { STRINGS } from './strings';

/** The game's public address: the folder this page is served from, without ?options. */
export function gameUrl(): string {
  return new URL('./', window.location.href).href;
}

/** Shares a score; resolves true if something was shared (or opened). */
export function shareScore(score: number): Promise<boolean> {
  return shareText(STRINGS.share.text(score.toLocaleString('ca')));
}

/** Shares a text with the game's address after it. */
export async function shareText(text: string): Promise<boolean> {
  const url = gameUrl();
  if (navigator.share) {
    try {
      await navigator.share({ title: STRINGS.title, text, url });
      return true;
    } catch (error) {
      // The player closed the menu: nothing to do. Any other failure falls back to WhatsApp.
      if (error instanceof DOMException && error.name === 'AbortError') return false;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  return true;
}
