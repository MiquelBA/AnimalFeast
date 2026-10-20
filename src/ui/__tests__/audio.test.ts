import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** A fake Web Audio context: records resume calls and lets the test pick its state. */
class FakeContext {
  static made: FakeContext[] = [];
  state: AudioContextState | 'interrupted' = 'suspended';
  sampleRate = 8000;
  currentTime = 0;
  destination = {};
  resume = vi.fn(() => { this.state = 'running'; return Promise.resolve(); });
  constructor() { FakeContext.made.push(this); }
  private node = () => ({ connect: vi.fn((n: unknown) => n), start: vi.fn(), stop: vi.fn(), gain: param(), frequency: param(), Q: param(), threshold: param(), ratio: param() });
  createDynamicsCompressor = this.node;
  createGain = this.node;
  createOscillator = this.node;
  createBiquadFilter = this.node;
  createBufferSource = this.node;
  createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
}
const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

const audioEl = { paused: true, play: vi.fn(() => { audioEl.paused = false; return Promise.resolve(); }), pause: vi.fn(), setAttribute: vi.fn() };

beforeEach(() => {
  FakeContext.made = [];
  audioEl.paused = true;
  audioEl.play.mockClear();
  vi.resetModules();
  vi.stubGlobal('window', { AudioContext: FakeContext });
  vi.stubGlobal('navigator', { audioSession: { type: 'auto' } });
  vi.stubGlobal('document', { hidden: false, createElement: () => audioEl, addEventListener: vi.fn() });
  URL.createObjectURL = () => 'blob:silence';
});
afterEach(() => vi.unstubAllGlobals());

describe('unlockAudio', () => {
  it('on the first touch: playback session, silent media loop, and the context resumed', async () => {
    const { unlockAudio, audioState } = await import('../audio');
    expect(audioState()).toBe('none');
    unlockAudio();
    expect((navigator as unknown as { audioSession: { type: string } }).audioSession.type).toBe('playback');
    expect(audioEl.play).toHaveBeenCalledTimes(1);
    expect(FakeContext.made).toHaveLength(1);
    expect(FakeContext.made[0].resume).toHaveBeenCalled();
    expect(audioState()).toBe('running');
  });

  it('wakes a context that iOS interrupted, and replaces a closed one', async () => {
    const { unlockAudio } = await import('../audio');
    unlockAudio();
    const first = FakeContext.made[0];
    first.state = 'interrupted';
    unlockAudio();
    expect(first.resume).toHaveBeenCalledTimes(2);
    first.state = 'closed';
    unlockAudio();
    expect(FakeContext.made).toHaveLength(2);
  });

  it('plays sounds only once the context runs', async () => {
    const { unlockAudio, playSound } = await import('../audio');
    playSound('eat'); // before any touch: nothing, no error
    unlockAudio();
    const ctx = FakeContext.made[0];
    const spy = vi.spyOn(ctx, 'createOscillator');
    playSound('eat');
    expect(spy).toHaveBeenCalled();
  });
});
