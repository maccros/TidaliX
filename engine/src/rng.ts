/**
 * Deterministic RNG. Every shuffle in the engine runs through here so a game is
 * fully reproducible from its seed — which is what makes AI games debuggable
 * and test failures reproducible.
 */

import type { RngState } from './types.js';

/** mulberry32 — small, fast, good enough for shuffling a 30-card deck. */
export function nextRandom(rng: RngState): { value: number; rng: RngState } {
  let t = (rng.seed + 0x6d2b79f5) | 0;
  let x = t;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return { value, rng: { seed: t } };
}

/** Integer in [0, maxExclusive). */
export function nextInt(rng: RngState, maxExclusive: number): { value: number; rng: RngState } {
  const { value, rng: next } = nextRandom(rng);
  return { value: Math.floor(value * maxExclusive), rng: next };
}

/** Fisher–Yates, returning a new array and the advanced RNG state. */
export function shuffle<T>(items: readonly T[], rng: RngState): { items: T[]; rng: RngState } {
  const out = [...items];
  let state = rng;
  for (let i = out.length - 1; i > 0; i--) {
    const { value: j, rng: next } = nextInt(state, i + 1);
    state = next;
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return { items: out, rng: state };
}
