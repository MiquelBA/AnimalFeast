// Synthesised sound (Web Audio, no files): card picks, chips, and a stinger for every hand that grows
// with the hand. Optional: the game never depends on it.
//
// iPhone notes: Safari only starts audio inside a touch that ends (touchend/click), so unlockAudio
// listens to those too; it asks for the "playback" audio session (Safari 17+) and also loops a
// silent <audio> (older iOS), so the game sounds even with the silent switch on, like a music app.

export type SoundName =
  | 'chips' | 'blast' | 'golden' | 'combo' | 'timeBonus' | 'invalid' | 'shuffle' | 'warning'
  | 'gameOver' | 'newBest' | 'count' | 'go' | 'land' | 'power' | 'deal' | 'flip';

/** One voice: an oscillator, or filtered noise ('noise') whose filter frequency glides from → to. */
export interface Note {
  readonly wave: OscillatorType | 'noise';
  readonly from: number;
  readonly to?: number;
  readonly ms: number;
  readonly delayMs?: number;
  readonly gain: number;
  readonly filter?: BiquadFilterType;
  readonly q?: number;
  readonly attackMs?: number;
}

const C4 = 261.63, F4 = 349.23, G4 = 392, A4 = 440;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880, B5 = 987.77;
const C6 = 1046.5, E6 = 1318.5, G6 = 1568, C7 = 2093;

let muted = false;
export function setMuted(value: boolean): void {
  muted = value;
}

const boom = (from: number, gain: number, delayMs = 0, ms = 420): Note => ({ wave: 'sine', from, to: 32, ms, delayMs, gain });
const stab = (notes: readonly number[], delayMs: number, ms: number, gain: number, wave: OscillatorType = 'sawtooth'): Note[] =>
  notes.map((from) => ({ wave, from, ms, delayMs, gain, attackMs: 8 }));
const arp = (notes: readonly number[], stepMs: number, gain: number, delayMs = 0): Note[] =>
  notes.map((from, i) => ({ wave: 'triangle', from, ms: stepMs * 2.4, delayMs: delayMs + i * stepMs, gain }));
/** Casino chips clattering: short bright clicks. */
const chips = (count: number, delayMs = 0, gain = 0.09): Note[] =>
  Array.from({ length: count }, (_, i): Note => ({
    wave: 'noise', from: 5200 + ((i * 1777) % 2600), to: 3000, ms: 34, delayMs: delayMs + i * 38 + ((i * 13) % 17), gain, filter: 'bandpass', q: 6,
  }));
const cymbal = (delayMs: number, ms: number, gain: number): Note => ({ wave: 'noise', from: 9000, to: 4000, ms, delayMs, gain, filter: 'highpass', q: 0.6 });

const RECIPES: Readonly<Record<SoundName, readonly Note[]>> = {
  chips: chips(6),
  blast: [
    { wave: 'noise', from: 300, to: 7000, ms: 220, gain: 0.12, filter: 'bandpass', q: 0.8, attackMs: 90 },
    boom(130, 0.6, 180, 700),
    { wave: 'noise', from: 6000, to: 200, ms: 800, delayMs: 180, gain: 0.25, filter: 'lowpass', q: 0.7 },
    { wave: 'square', from: 90, to: 40, ms: 500, delayMs: 180, gain: 0.06 },
  ],
  golden: [
    { wave: 'sine', from: G6, ms: 90, delayMs: 60, gain: 0.07 },
    { wave: 'sine', from: C7, ms: 180, delayMs: 130, gain: 0.07 },
    { wave: 'sine', from: E6 * 2, ms: 240, delayMs: 200, gain: 0.05 },
  ],
  combo: [
    { wave: 'square', from: 880, ms: 60, gain: 0.035 },
    { wave: 'square', from: 1175, ms: 70, delayMs: 60, gain: 0.035 },
    { wave: 'square', from: 1568, ms: 110, delayMs: 120, gain: 0.035 },
  ],
  timeBonus: [{ wave: 'sine', from: E6, ms: 140, gain: 0.07 }, { wave: 'sine', from: G6, ms: 180, delayMs: 80, gain: 0.07 }],
  invalid: [{ wave: 'triangle', from: 200, to: 130, ms: 150, gain: 0.1 }],
  // A riffle: many quick card flicks.
  shuffle: Array.from({ length: 14 }, (_, i): Note => ({ wave: 'noise', from: 2400 + (i % 3) * 600, to: 1200, ms: 26, delayMs: i * 24, gain: 0.08, filter: 'bandpass', q: 3 })),
  warning: [{ wave: 'sine', from: 1000, ms: 50, gain: 0.05 }],
  count: [{ wave: 'square', from: G5, ms: 130, gain: 0.05 }, boom(130, 0.25, 0, 240)],
  go: [boom(160, 0.5, 0, 600), cymbal(0, 500, 0.12), ...stab([C5, E5, G5, C6], 0, 520, 0.035)],
  land: [{ wave: 'noise', from: 1800, to: 700, ms: 40, gain: 0.05, filter: 'bandpass', q: 2 }],
  // A streak power: a rising sweep into a bright chord.
  power: [
    { wave: 'sawtooth', from: 220, to: 1760, ms: 380, gain: 0.04, filter: 'lowpass', q: 4, attackMs: 40 },
    ...stab([C5, E5, G5, C6], 360, 420, 0.03, 'square'),
    ...arp([C6, E6, G6, C7], 50, 0.06, 380),
    cymbal(360, 600, 0.08),
  ],
  // A card landing on the felt, face down.
  deal: [{ wave: 'noise', from: 3200, to: 1400, ms: 30, gain: 0.05, filter: 'bandpass', q: 3 }],
  // A card turning over.
  flip: [{ wave: 'noise', from: 1500, to: 5200, ms: 45, gain: 0.05, filter: 'bandpass', q: 2.5 }],
  gameOver: arp([G5, E5, C5, G4], 120, 0.09),
  newBest: [...arp([C5, E5, G5, C6, E6, G6], 70, 0.09), boom(110, 0.3, 0, 500), ...chips(10, 300)],
};

/** Plays a sound now; `pitch` scales every frequency. */
export function playSound(name: SoundName, pitch = 1): void {
  playNotes(RECIPES[name], pitch);
}

/** Major pentatonic ladder from C5: tracing climbs one rung per card. */
const PENTATONIC = [0, 2, 4, 7, 9];
export function ladderNote(rung: number): number {
  const octave = Math.floor(rung / PENTATONIC.length);
  return C5 * 2 ** (octave + PENTATONIC[rung % PENTATONIC.length] / 12);
}

/** One pluck on the ladder (a card added to the trace); brighter once it is a hand. */
export function playRung(rung: number, valid: boolean): void {
  const f = ladderNote(rung);
  playNotes([
    { wave: 'triangle', from: f, ms: 100, gain: 0.08 },
    { wave: 'sine', from: f * 2, ms: 70, gain: valid ? 0.06 : 0.02 },
    { wave: 'noise', from: 3000, to: 1500, ms: 22, gain: 0.04, filter: 'bandpass', q: 3 },
  ]);
}

/**
 * The stinger of a hand: tier 0 (trips) is a short stab; each tier adds weight, up to the royal
 * flush's fanfare. `combo` lifts the pitch a little.
 */
export function playHand(tier: number, combo = 1): void {
  const pitch = 1 + Math.min(combo - 1, 4) * 0.06;
  const notes: Note[] = [];
  if (tier === 0) {
    notes.push(...stab([C5, E5, G5], 0, 220, 0.03, 'triangle'), ...chips(4, 80), boom(140, 0.18, 0, 220));
  } else if (tier === 1) {
    notes.push(...arp([C5, E5, G5, C6], 55, 0.08), ...stab([C5, G5], 0, 300, 0.025), ...chips(7, 120), boom(130, 0.28, 0, 320));
  } else if (tier === 2) {
    notes.push(
      boom(150, 0.5, 0, 560), cymbal(0, 600, 0.1),
      ...stab([C4, E5, G5, C6], 0, 650, 0.035), ...stab([C4 / 2], 0, 600, 0.05, 'square'),
      ...arp([C6, E6, G6, C7], 50, 0.05, 120), ...chips(12, 180),
    );
  } else if (tier === 3) {
    notes.push(
      { wave: 'sawtooth', from: 110, to: 880, ms: 300, gain: 0.07 },
      { wave: 'noise', from: 400, to: 8000, ms: 300, gain: 0.09, filter: 'bandpass', q: 0.8, attackMs: 150 },
      boom(150, 0.6, 280, 800), cymbal(280, 1000, 0.16),
      ...stab([C4, G4, E5, G5, C6], 280, 900, 0.035), ...stab([F4, A4, F5, A5], 760, 400, 0.03),
      ...stab([G4, B5, D5, G5], 980, 700, 0.035), ...arp([C6, E6, G6, C7, E6 * 2], 45, 0.05, 300), ...chips(18, 400),
    );
  } else {
    // The royal flush: a riser, then a brass fanfare over a big boom, chips raining down.
    notes.push(
      { wave: 'sawtooth', from: 80, to: 1200, ms: 500, gain: 0.07 },
      { wave: 'noise', from: 300, to: 9000, ms: 500, gain: 0.1, filter: 'bandpass', q: 0.8, attackMs: 300 },
      boom(120, 0.7, 480, 1100), cymbal(480, 1600, 0.2),
      ...stab([C4, G4, C5, E5, G5], 480, 360, 0.035), ...stab([C4, G4, C5, E5, G5], 860, 160, 0.035),
      ...stab([F4, A4, C5, F5, A5], 1040, 360, 0.035), ...stab([G4, B5 / 2, D5, G5, B5], 1420, 360, 0.035),
      ...stab([C4, G4, C5, E5, G5, C6], 1800, 1400, 0.04), boom(110, 0.5, 1800, 900), cymbal(1800, 1500, 0.15),
      ...arp([C6, E6, G6, C7, G6, C7, E6 * 2, C7 * 2], 60, 0.045, 1800), ...chips(30, 600, 0.08),
    );
  }
  playNotes(notes, pitch);
}

let context: AudioContext | null = null;
/** Effects go through a compressor so big hits don't clip. */
let sfx: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** A looping silent <audio>: on iPhone it puts the page in the "media" audio session, so Web Audio is heard. */
let keepAlive: HTMLAudioElement | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

function createContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  const ctx = new Ctor();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.ratio.value = 8;
  compressor.connect(ctx.destination);
  sfx = ctx.createGain();
  sfx.gain.value = 1;
  sfx.connect(compressor);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Half a second of silence as a WAV file (8 kHz, 8-bit mono; 128 is silence). */
function silentWav(): Blob {
  const samples = 4000;
  const bytes = new Uint8Array(44 + samples);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + samples, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  text(36, 'data'); view.setUint32(40, samples, true);
  bytes.fill(128, 44);
  return new Blob([bytes], { type: 'audio/wav' });
}

function playKeepAlive(): void {
  if (!keepAlive) {
    keepAlive = document.createElement('audio');
    keepAlive.setAttribute('x-webkit-airplay', 'deny');
    keepAlive.preload = 'auto';
    keepAlive.loop = true;
    keepAlive.src = URL.createObjectURL(silentWav());
    // Silent audio left playing in the background would show up in the phone's media controls.
    document.addEventListener('visibilitychange', () => { if (document.hidden) keepAlive?.pause(); });
  }
  if (keepAlive.paused) keepAlive.play()?.catch(() => { /* not inside a gesture yet: the next one retries */ });
}

/**
 * Call from a user gesture: creates or wakes the audio context. Safe to call often; every touch
 * calls it, so a context that iOS suspended or interrupted (a call, another app) comes back.
 */
export function unlockAudio(): void {
  try {
    // iPhone: play like a media app, so the silent switch doesn't mute the game (Safari 17+).
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session && session.type !== 'playback') session.type = 'playback';
    if (typeof document !== 'undefined' && !document.hidden) playKeepAlive();
    // A closed context never plays again: start over with a new one.
    if (context?.state === 'closed') context = null;
    context ??= createContext();
    if (!context) return;
    if (context.state !== 'running') context.resume().catch(() => { /* retried on the next touch */ });
    // A silent blip inside the gesture is what actually wakes older iOS Safari.
    const blip = context.createBufferSource();
    blip.buffer = context.createBuffer(1, 1, context.sampleRate);
    blip.connect(context.destination);
    blip.start(0);
  } catch {
    // No audio on this device: the game plays the same without it.
  }
}

/** The audio context's state, for the debug panel ('none' before the first touch). */
export function audioState(): string {
  return context?.state ?? 'none';
}

export function playNotes(notes: readonly Note[], pitch = 1, output: AudioNode | null = sfx, at?: number): void {
  if (muted || !context || !output || !noise || context.state !== 'running') return;
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
