// localStorage access, always guarded (private mode, blocked storage…).

export function loadBest(key: string): number {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
}

export function saveBest(key: string, score: number): void {
  try {
    localStorage.setItem(key, String(score));
  } catch {
    // Storage unavailable: the record just isn't kept.
  }
}

export function loadFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === '1';
  } catch {
    return fallback;
  }
}

export function saveFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Storage unavailable: the setting lasts this visit only.
  }
}
