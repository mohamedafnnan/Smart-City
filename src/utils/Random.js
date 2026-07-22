/**
 * Random.js — Seeded PRNG (mulberry32).
 *
 * WHY A SEEDED RNG:
 *  - The city must look identical on every reload so users can bookmark
 *    a building.  `Math.random()` is non-deterministic.
 *  - mulberry32 is 32-bit, fast, and has excellent distribution for our
 *    non-cryptographic uses.
 */

export class Random {
  constructor(seed = 1337) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    // Convert to positive 32-bit int
    this._state = (seed >>> 0) || 1;
  }

  /** Returns float in [0, 1). */
  next() {
    let t = (this._state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [min, max). */
  range(min, max) { return min + (max - min) * this.next(); }

  /** Integer in [min, max]. */
  int(min, max) { return Math.floor(this.range(min, max + 1)); }

  /** Random element from array. */
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }

  /** Coin flip. */
  chance(p) { return this.next() < p; }
}

/** Convenience singleton for the whole app. */
export const rng = new Random(20260722);
