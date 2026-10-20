// "Add to home screen": Android/Chrome offers its own prompt (kept here until the player asks);
// iPhone has no prompt, so we show how to do it from Safari's share menu.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

try {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => { deferred = null; notify(); });
} catch {
  // Not a browser (tests): nothing to install.
}

export function onInstallChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Already opened from the home screen. */
export function isStandalone(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** 'prompt' = the browser can install it; 'ios' = show the steps; null = nothing to offer. */
export function installMode(): 'prompt' | 'ios' | null {
  if (isStandalone()) return null;
  if (deferred) return 'prompt';
  return isIos() ? 'ios' : null;
}

/** Shows the browser's install prompt; true if the player accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const { outcome } = await event.userChoice;
  deferred = null;
  notify();
  return outcome === 'accepted';
}
