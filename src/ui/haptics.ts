// Short vibrations on phones that support them (Android); silently nothing elsewhere.
import { UI } from './uiConfig';

export type Haptic = keyof typeof UI.haptics;

export function vibrate(kind: Haptic): void {
  try {
    // Before the first touch the browser refuses (and complains), e.g. during the first countdown.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(UI.haptics[kind]);
  } catch {
    // Not available: no feedback, nothing else changes.
  }
}
