// How excited the background sea is right now; big moments on the board raise it.
import { UI } from '../uiConfig';

export const ambient = { energy: 0 };

/** Big moment on the board: more, faster bubbles and a glow for a moment. */
export function boostAmbient(amount: number): void {
  ambient.energy = Math.min(UI.ambient.maxEnergy, ambient.energy + amount);
}
