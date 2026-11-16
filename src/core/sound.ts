/**
 * Tiny synthesized sound effects with Web Audio, so the game ships no audio files.
 * iPad Safari only allows audio after a touch, so the context is unlocked on the first pointerdown.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function initSound(on: boolean) {
  enabled = on;
  const unlock = () => {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AC) ctx = new AC();
    }
    void ctx?.resume();
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
}

export function setSound(on: boolean) {
  enabled = on;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, when = 0, slideTo?: number) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.25, highpass = 1000, when = 0) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime + when;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = highpass;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(t);
}

/** Named sounds used around the game. */
export const sfx = {
  tap: () => tone(660, 0.06, 'triangle', 0.08),
  right: () => (tone(660, 0.12, 'triangle', 0.18), tone(990, 0.18, 'triangle', 0.18, 0.1)),
  wrong: () => tone(220, 0.25, 'sawtooth', 0.08, 0, 160),
  cash: () => (tone(1320, 0.08, 'square', 0.06), tone(1760, 0.14, 'square', 0.06, 0.08)),
  kick: () => (noise(0.06, 0.3, 400), tone(120, 0.1, 'sine', 0.3, 0, 60)),
  whistle: () => tone(2100, 0.35, 'sine', 0.12, 0, 2300),
  bell: () => [0, 0.25].forEach((w) => tone(1046, 0.6, 'sine', 0.15, w)),
  cheer: () => noise(0.9, 0.12, 2500),
  jump: () => tone(300, 0.15, 'square', 0.05, 0, 600),
  // music class instruments
  drum: () => (tone(110, 0.25, 'sine', 0.5, 0, 50), noise(0.05, 0.2, 200)),
  clap: () => noise(0.12, 0.35, 1500),
  bellHit: () => tone(1568, 0.5, 'sine', 0.2),
  bass: () => tone(82, 0.35, 'triangle', 0.4),
  note: (semi: number) => tone(440 * Math.pow(2, semi / 12), 0.35, 'triangle', 0.2),
};
