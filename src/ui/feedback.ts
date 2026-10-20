// Sound and vibration for what happens on the board. Every cue is optional: the game reads the same without it.
import type { TraceStatus } from '../engine/chains';
import { playRun, playRung, playSound } from './audio';
import type { Frame } from './frames';
import { UI } from './uiConfig';
import { vibrate } from './haptics';

/** Tracing climbs the musical ladder one rung per cell. */
export function traceStepCue(length: number, status: TraceStatus, sound: boolean): void {
  if (sound) {
    if (status === 'invalid') playSound('invalid');
    else playRung(length - 1);
  }
  vibrate('step');
}

export function rejectCue(sound: boolean): void {
  if (sound) playSound('invalid');
  vibrate('invalid');
}

export function frameCue(frame: Frame, sound: boolean): void {
  const play = (name: Parameters<typeof playSound>[0]) => { if (sound) playSound(name); };
  const texts = frame.effects.flatMap((e) => (e.type === 'text' ? [e] : []));
  const wave = texts.find((t) => t.text === 'wave')?.wave ?? 0;
  if (frame.kind === 'eat') {
    // The chain's notes as a quick run; each wave of reactions starts higher up the ladder.
    const length = frame.ghosts.filter((g) => g.kind === 'swallow').length + 1;
    const run = Math.min(length, UI.sound.maxRunNotes);
    if (sound) playRun(Math.min(wave, UI.sound.maxWaveStep) * UI.sound.rungsPerWave, run, UI.sound.runStepMs, wave > 0);
    play('eat');
    vibrate(wave > 0 || length >= 4 ? 'longChain' : 'chain');
  } else if (frame.kind === 'whirl') {
    play('whirl');
    vibrate('frenzy');
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
