// Short synthesised sound effects (Web Audio, no files). Optional: the game never depends on them.
// The audio context starts on the first touch, as mobile browsers require.

export type SoundName =
  | 'step' | 'chain3' | 'chain4' | 'chain5' | 'eat' | 'golden' | 'combo' | 'frenzy'
  | 'timeBonus' | 'invalid' | 'shuffle' | 'warning' | 'gameOver' | 'newBest';

interface Note {
  readonly wave: OscillatorType;
  /** Start and end frequency (Hz); a glide when they differ. */
  readonly from: number;
  readonly to?: number;
  readonly ms: number;
  readonly delayMs?: number;
  readonly gain: number;
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;

const arpeggio = (notes: readonly number[], stepMs: number, gain: number): Note[] =>
  notes.map((from, i) => ({ wave: 'triangle', from, ms: stepMs * 2, delayMs: i * stepMs, gain }));

const RECIPES: Readonly<Record<SoundName, readonly Note[]>> = {
  step: [{ wave: 'sine', from: 600, ms: 60, gain: 0.07 }],
  chain3: arpeggio([C5, E5, G5], 45, 0.09),
  chain4: arpeggio([C5, E5, G5, C6], 45, 0.1),
  chain5: arpeggio([C5, E5, G5, C6, E6], 40, 0.1),
  eat: [{ wave: 'sine', from: 320, to: 110, ms: 120, delayMs: 60, gain: 0.12 }],
  golden: [
    { wave: 'sine', from: G6, ms: 80, delayMs: 120, gain: 0.06 },
    { wave: 'sine', from: C7, ms: 120, delayMs: 180, gain: 0.06 },
  ],
  combo: [
    { wave: 'square', from: 880, ms: 60, gain: 0.03 },
    { wave: 'square', from: 1175, ms: 90, delayMs: 60, gain: 0.03 },
  ],
  frenzy: [
    { wave: 'sawtooth', from: 160, to: 640, ms: 300, gain: 0.05 },
    { wave: 'triangle', from: 320, to: 1280, ms: 300, gain: 0.08 },
    { wave: 'sine', from: 90, to: 50, ms: 260, delayMs: 60, gain: 0.18 },
  ],
  timeBonus: [{ wave: 'sine', from: E6, ms: 140, gain: 0.07 }],
  invalid: [{ wave: 'triangle', from: 190, to: 140, ms: 130, gain: 0.09 }],
  shuffle: [{ wave: 'sine', from: 700, to: 260, ms: 260, gain: 0.06 }],
  warning: [{ wave: 'sine', from: 1000, ms: 50, gain: 0.05 }],
  gameOver: arpeggio([G5, E5, C5, G5 * 2], 110, 0.09),
  newBest: arpeggio([C5, E5, G5, C6, E6, G6], 70, 0.09),
};

let context: AudioContext | null = null;
let master: GainNode | null = null;

/** Call from a user gesture: creates or resumes the audio context. */
export function unlockAudio(): void {
  try {
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.8;
      master.connect(context.destination);
    }
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

/** Plays a sound now; `pitch` scales every frequency (e.g. rising steps while tracing). */
export function playSound(name: SoundName, pitch = 1): void {
  if (!context || !master || context.state !== 'running') return;
  const now = context.currentTime;
  for (const note of RECIPES[name]) {
    const start = now + (note.delayMs ?? 0) / 1000;
    const end = start + note.ms / 1000;
    const osc = context.createOscillator();
    const env = context.createGain();
    osc.type = note.wave;
    osc.frequency.setValueAtTime(note.from * pitch, start);
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to * pitch, end);
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(note.gain, start + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(end + 0.02);
  }
}
