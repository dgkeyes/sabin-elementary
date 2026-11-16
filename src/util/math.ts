export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** Shortest signed angle from a to b. */
export function angleDiff(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
export const dampAngle = (a: number, b: number, lambda: number, dt: number) => a + angleDiff(a, b) * (1 - Math.exp(-lambda * dt));

/** Deterministic random numbers so AI kids look the same every day. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
export const pick = <T>(arr: readonly T[], r: () => number) => arr[Math.floor(r() * arr.length) % arr.length];

export function shuffle<T>(arr: T[], r: () => number = Math.random): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Formats minutes after midnight as "8:05 AM". */
export function formatTime(min: number) {
  const m = Math.floor(min) % (24 * 60);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${hh < 12 ? 'AM' : 'PM'}`;
}
