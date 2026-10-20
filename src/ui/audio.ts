// Synthesised sound (Web Audio, no files): effects, the musical ladder, and the bus the background
// music plays through. Optional: the game never depends on it.
//
// iPhone notes: Safari only starts audio inside a touch that ends (touchend/click), so unlockAudio
// listens to those too; and it asks for the "playback" audio session (Safari 17+), so the game
// sounds even with the silent switch on, like a music app.

export type SoundName =
  | 'eat' | 'golden' | 'combo' | 'frenzy'
  | 'timeBonus' | 'invalid' | 'shuffle' | 'warning' | 'gameOver' | 'newBest' | 'whirl';

/** One voice: an oscillator, or filtered noise ('noise') whose filter frequency glides from → to. */
export interface Note {
  readonly wave: OscillatorType | 'noise';
  /** Start and end frequency (Hz); a glide when they differ. For noise, the filter's frequency. */
  readonly from: number;
  readonly to?: number;
  readonly ms: number;
  readonly delayMs?: number;
  readonly gain: number;
  /** Noise only: filter shape and resonance. */
  readonly filter?: BiquadFilterType;
  readonly q?: number;
  /** Attack time; short by default (a pluck). */
  readonly attackMs?: number;
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;
const C4 = C5 / 2, G4 = G5 / 2;

const arpeggio = (notes: readonly number[], stepMs: number, gain: number): Note[] =>
  notes.map((from, i) => ({ wave: 'triangle', from, ms: stepMs * 2, delayMs: i * stepMs, gain }));

/** A deep hit: a sine that drops fast (the "boom" under big moments). */
const boom = (from: number, gain: number, delayMs = 0, ms = 420): Note => ({ wave: 'sine', from, to: 32, ms, delayMs, gain });

const RECIPES: Readonly<Record<SoundName, readonly Note[]>> = {
  eat: [
    { wave: 'sine', from: 320, to: 110, ms: 120, delayMs: 60, gain: 0.14 },
    { wave: 'noise', from: 1800, to: 400, ms: 90, delayMs: 50, gain: 0.08, filter: 'bandpass', q: 1.2 },
  ],
  golden: [
    { wave: 'sine', from: G6, ms: 80, delayMs: 120, gain: 0.07 },
    { wave: 'sine', from: C7, ms: 160, delayMs: 180, gain: 0.07 },
    { wave: 'sine', from: E6 * 2, ms: 200, delayMs: 240, gain: 0.04 },
  ],
  combo: [
    { wave: 'square', from: 880, ms: 60, gain: 0.03 },
    { wave: 'square', from: 1175, ms: 90, delayMs: 60, gain: 0.03 },
  ],
  // The frenzy: a riser, a big boom with a noise blast, and a bright major chord on top.
  frenzy: [
    { wave: 'sawtooth', from: 120, to: 900, ms: 260, gain: 0.07 },
    { wave: 'noise', from: 400, to: 6000, ms: 240, gain: 0.08, filter: 'bandpass', q: 0.8, attackMs: 120 },
    boom(150, 0.55, 230, 600),
    { wave: 'noise', from: 5000, to: 300, ms: 700, delayMs: 230, gain: 0.22, filter: 'lowpass', q: 0.7 },
    ...[C5, E5, G5, C6].map((from, i): Note => ({ wave: 'sawtooth', from, ms: 650, delayMs: 240 + i * 25, gain: 0.035, attackMs: 10 })),
    ...[C4, G4].map((from): Note => ({ wave: 'square', from, ms: 600, delayMs: 240, gain: 0.03 })),
  ],
  timeBonus: [{ wave: 'sine', from: E6, ms: 140, gain: 0.07 }, { wave: 'sine', from: G6, ms: 160, delayMs: 70, gain: 0.06 }],
  invalid: [{ wave: 'triangle', from: 190, to: 140, ms: 130, gain: 0.09 }],
  shuffle: [
    { wave: 'sine', from: 700, to: 260, ms: 260, gain: 0.06 },
    { wave: 'noise', from: 3000, to: 600, ms: 300, gain: 0.06, filter: 'bandpass', q: 2 },
  ],
  warning: [{ wave: 'sine', from: 1000, ms: 50, gain: 0.05 }],
  gameOver: arpeggio([G5, E5, C5, G4], 110, 0.09),
  newBest: [...arpeggio([C5, E5, G5, C6, E6, G6], 70, 0.09), boom(110, 0.3, 0, 500)],
  // The whirlpool: a long sucking swoosh that falls, a rumble and a deep boom when it closes.
  whirl: [
    { wave: 'noise', from: 6000, to: 200, ms: 520, gain: 0.25, filter: 'bandpass', q: 3, attackMs: 60 },
    { wave: 'sawtooth', from: 900, to: 90, ms: 480, gain: 0.05 },
    { wave: 'sine', from: 1400, to: 200, ms: 420, delayMs: 40, gain: 0.08 },
    { wave: 'noise', from: 180, to: 60, ms: 500, gain: 0.25, filter: 'lowpass', q: 1, attackMs: 80 },
    boom(120, 0.45, 380, 500),
  ],
};

/**
 * The game's musical ladder: a major pentatonic scale rising from C5. Tracing climbs it one rung per
 * cell; an eaten chain plays its notes as a quick run; each wave of reactions starts higher.
 */
const PENTATONIC = [0, 2, 4, 7, 9];
export function ladderNote(rung: number): number {
  const octave = Math.floor(rung / PENTATONIC.length);
  return C5 * 2 ** (octave + PENTATONIC[rung % PENTATONIC.length] / 12);
}

/** A run of `count` rising notes from `rung`, `stepMs` apart. A reaction (`wave` > 0) hits harder. */
export function playRun(rung: number, count: number, stepMs: number, wave = 0): void {
  const notes: Note[] = [];
  for (let i = 0; i < count; i++) {
    const from = ladderNote(rung + i);
    notes.push({ wave: 'triangle', from, ms: stepMs * 2.5, delayMs: i * stepMs, gain: 0.1 });
    if (wave) notes.push({ wave: 'sine', from: from * 2, ms: stepMs * 2, delayMs: i * stepMs, gain: 0.04 });
  }
  if (wave) {
    // Each wave lands on a chord stab with a boom and a splash, louder the deeper the cascade.
    const top = count * stepMs;
    const level = Math.min(wave, 4);
    const root = ladderNote(rung);
    notes.push(
      boom(140 + level * 10, 0.25 + level * 0.06, top, 380),
      { wave: 'noise', from: 7000, to: 900, ms: 300, delayMs: top, gain: 0.06 + level * 0.025, filter: 'highpass', q: 0.7 },
      ...[1, 1.25, 1.5].map((m): Note => ({ wave: 'sawtooth', from: root * m, ms: 260, delayMs: top, gain: 0.025 + level * 0.006 })),
    );
  }
  playNotes(notes);
}

/** One short pluck on the ladder (tracing). */
export function playRung(rung: number): void {
  playNotes([{ wave: 'triangle', from: ladderNote(rung), ms: 90, gain: 0.08 }, { wave: 'sine', from: ladderNote(rung) * 2, ms: 60, gain: 0.025 }]);
}

let context: AudioContext | null = null;
/** Effects and music each have a level, then share a compressor so big hits don't clip. */
let sfx: GainNode | null = null;
let musicBus: GainNode | null = null;
let noise: AudioBuffer | null = null;

/** The context and the music bus, once audio is running (for music.ts). */
export function musicOutput(): { context: AudioContext; bus: GainNode; noise: AudioBuffer } | null {
  return context && musicBus && noise && context.state === 'running' ? { context, bus: musicBus, noise } : null;
}

/** Call from a user gesture: creates or resumes the audio context. Safe to call often. */
export function unlockAudio(): void {
  try {
    // iPhone: play like a media app, so the silent switch doesn't mute the game (Safari 17+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.ratio.value = 6;
      compressor.connect(context.destination);
      sfx = context.createGain();
      sfx.gain.value = 0.9;
      sfx.connect(compressor);
      musicBus = context.createGain();
      musicBus.gain.value = 1;
      musicBus.connect(compressor);
      noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    // iOS also leaves the context 'interrupted' after a call or switching apps.
    if (context.state !== 'running') void context.resume();
    // A silent blip inside the gesture is what actually wakes older iOS Safari.
    const blip = context.createBufferSource();
    blip.buffer = context.createBuffer(1, 1, context.sampleRate);
    blip.connect(context.destination);
    blip.start(0);
  } catch {
    // No audio on this device: the game plays the same without it.
  }
}

/** Plays a sound now; `pitch` scales every frequency. */
export function playSound(name: SoundName, pitch = 1): void {
  playNotes(RECIPES[name], pitch);
}

export function playNotes(notes: readonly Note[], pitch = 1, output: AudioNode | null = sfx, at?: number): void {
  if (!context || !output || !noise || context.state !== 'running') return;
  const now = at ?? context.currentTime;
  for (const note of notes) {
    const start = now + (note.delayMs ?? 0) / 1000;
    const end = start + note.ms / 1000;
    const env = context.createGain();
    env.gain.setValueAtTime(0.0001, start);
    env.gain.exponentialRampToValueAtTime(note.gain, start + (note.attackMs ?? 8) / 1000);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    env.connect(output);
    let source: AudioScheduledSourceNode;
    if (note.wave === 'noise') {
      const src = context.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = note.filter ?? 'lowpass';
      filter.Q.value = note.q ?? 1;
      filter.frequency.setValueAtTime(note.from * pitch, start);
      if (note.to) filter.frequency.exponentialRampToValueAtTime(note.to * pitch, end);
      src.connect(filter).connect(env);
      source = src;
    } else {
      const osc = context.createOscillator();
      osc.type = note.wave;
      osc.frequency.setValueAtTime(note.from * pitch, start);
      if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to * pitch, end);
      osc.connect(env);
      source = osc;
    }
    source.start(start);
    source.stop(end + 0.02);
  }
}
