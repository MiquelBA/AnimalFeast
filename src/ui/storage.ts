// localStorage access, always guarded (private mode, blocked storage…).
import { UI } from './uiConfig';

export function loadBest(): number {
  try {
    const v = Number(localStorage.getItem(UI.bestScoreKey));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score: number): void {
  try {
    localStorage.setItem(UI.bestScoreKey, String(score));
  } catch {
    // Storage unavailable: the record just isn't kept.
  }
}
