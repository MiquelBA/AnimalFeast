// Sound and vibration for what happens on the board. Every cue is optional: the game reads the same without it.
import type { TraceStatus } from '../engine/chains';
import { playSound } from './audio';
import type { Frame } from './frames';
import { vibrate } from './haptics';

/** Rising pitch while a chain grows: a semitone-ish step per cell. */
const STEP_PITCH = 1.12;

export function traceStepCue(length: number, status: TraceStatus, sound: boolean): void {
  if (sound) playSound(status === 'invalid' ? 'invalid' : 'step', STEP_PITCH ** (length - 1));
  vibrate('step');
}

export function rejectCue(sound: boolean): void {
  if (sound) playSound('invalid');
  vibrate('invalid');
}

export function frameCue(frame: Frame, sound: boolean): void {
  const play = (name: Parameters<typeof playSound>[0]) => { if (sound) playSound(name); };
  const texts = frame.effects.flatMap((e) => (e.type === 'text' ? [e] : []));
  if (frame.kind === 'eat') {
    const length = frame.ghosts.filter((g) => g.kind === 'swallow').length + 1;
    play(length >= 5 ? 'chain5' : length === 4 ? 'chain4' : 'chain3');
    play('eat');
    vibrate(length >= 4 ? 'longChain' : 'chain');
  } else if (frame.kind === 'frenzy') {
    play('frenzy');
    vibrate('frenzy');
  } else if (frame.kind === 'shuffle') {
    play('shuffle');
  }
  if (texts.some((t) => t.text === 'golden')) play('golden');
  if (texts.some((t) => t.text === 'combo' && t.value >= 2)) play('combo');
  if (texts.some((t) => t.text === 'timeBonus')) play('timeBonus');
}

export function finishCue(newBest: boolean, sound: boolean): void {
  if (sound) playSound(newBest ? 'newBest' : 'gameOver');
  vibrate('gameOver');
}

export function warningCue(sound: boolean): void {
  if (sound) playSound('warning');
}
