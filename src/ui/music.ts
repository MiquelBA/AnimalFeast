// Background music, generated as it plays: a calm underwater groove in C major pentatonic (the same
// scale as the effects, so they always fit). It livens up with the sea's energy: big moments add
// percussion and a brighter melody for a while.
import { ladderNote, musicOutput, playNotes, type Note } from './audio';
import { ambient } from './fx/ambientEnergy';
import { UI } from './uiConfig';

const C3 = 130.81, F3 = 174.61, G3 = 196, A3 = 220;
/** Four bars: C, Am, F, G (bass root and chord tones, as frequency ratios of the root). */
const BARS: readonly { root: number; chord: readonly number[] }[] = [
  { root: C3, chord: [1, 1.26, 1.5] },
  { root: A3 / 2, chord: [1, 1.19, 1.5] },
  { root: F3 / 2, chord: [1, 1.26, 1.5] },
  { root: G3 / 2, chord: [1, 1.26, 1.5] },
];
/** Melody rungs on the ladder per 16th step (−1 = rest); one pattern per bar. */
const MELODY: readonly (readonly number[])[] = [
  [0, -1, 2, -1, 4, -1, 2, -1, 3, -1, 2, -1, 0, -1, -1, -1],
  [0, -1, 2, -1, 0, -1, -1, 4, -1, 3, -1, 2, -1, -1, 0, -1],
  [3, -1, 2, -1, 0, -1, 2, -1, 3, -1, 4, -1, 3, -1, -1, -1],
  [1, -1, 3, -1, 1, -1, 4, -1, 3, -1, 1, -1, 2, -1, -1, -1],
];
const STEPS = 16;

let timer = 0;
let step = 0;
let nextTime = 0;

export function startMusic(): void {
  if (timer) return;
  // Audio may still be waking up (first touch): the scheduler waits until it runs.
  step = 0;
  nextTime = 0;
  timer = window.setInterval(schedule, UI.music.tickMs);
}

export function stopMusic(): void {
  window.clearInterval(timer);
  timer = 0;
}

export function musicPlaying(): boolean {
  return timer !== 0;
}

/** Schedules every step that starts within the look-ahead window (steady timing despite timers). */
function schedule(): void {
  const out = musicOutput();
  if (!out) return;
  const M = UI.music;
  const stepSec = 60 / M.bpm / 4;
  if (nextTime < out.context.currentTime) nextTime = out.context.currentTime + 0.02;
  while (nextTime < out.context.currentTime + M.lookAheadMs / 1000) {
    playStep(step, nextTime, stepSec, out.bus);
    nextTime += stepSec;
    step = (step + 1) % (STEPS * BARS.length);
  }
}

function playStep(index: number, at: number, stepSec: number, bus: AudioNode): void {
  const M = UI.music;
  const bar = BARS[Math.floor(index / STEPS)];
  const s = index % STEPS;
  const hot = Math.min(1, ambient.energy / M.hotEnergy);
  const notes: Note[] = [];
  const stepMs = stepSec * 1000;
  // Pad: a soft chord at the start of each bar, held for the whole bar.
  if (s === 0) {
    for (const ratio of bar.chord) notes.push({ wave: 'triangle', from: bar.root * 2 * ratio, ms: stepMs * STEPS * 0.95, gain: M.pad, attackMs: 300 });
  }
  // Bass on the beat, with a pickup.
  if (s % 4 === 0 || s === 14) notes.push({ wave: 'sine', from: bar.root, ms: stepMs * 3, gain: M.bass, attackMs: 10 });
  // Melody: plucks on the ladder, an octave higher and louder when the board is hot.
  const rung = MELODY[Math.floor(index / STEPS)][s];
  if (rung >= 0) notes.push({ wave: 'triangle', from: ladderNote(rung) * (hot > 0.5 ? 2 : 1), ms: stepMs * 1.8, gain: M.melody * (1 + hot) });
  // Soft kick on the beat; shaker and off-beat hats join when the board is hot.
  if (s % 4 === 0) notes.push({ wave: 'sine', from: 110, to: 40, ms: 160, gain: M.kick });
  if (hot > 0.15) {
    notes.push({ wave: 'noise', from: 8000, ms: 50, gain: M.shaker * hot, filter: 'highpass', q: 0.7 });
    if (s % 4 === 2) notes.push({ wave: 'noise', from: 6000, ms: 90, gain: M.hat * hot, filter: 'highpass', q: 0.7 });
  }
  playNotes(notes, 1, bus, at);
}
