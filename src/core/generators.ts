import { mulberry32, randInt } from './prng';

export type PresetId = 'random' | 'nearlySorted' | 'reversed' | 'fewUnique' | 'allEqual' | 'sorted';

export type PresetGenerator = (n: number, seed: number) => number[];

export const MIN_VALUE = 1;
export const MAX_VALUE = 100;

function randomValues(n: number, rng: () => number): number[] {
  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) out[i] = randInt(rng, MIN_VALUE, MAX_VALUE);
  return out;
}

const asc = (a: number, b: number) => a - b;

export const generators: Record<PresetId, PresetGenerator> = {
  random: (n, seed) => randomValues(n, mulberry32(seed)),

  sorted: (n, seed) => randomValues(n, mulberry32(seed)).sort(asc),

  reversed: (n, seed) => randomValues(n, mulberry32(seed)).sort((a, b) => b - a),

  /** Sorted, then ~5% of cells swapped with a neighbour up to 3 positions away. */
  nearlySorted: (n, seed) => {
    const rng = mulberry32(seed);
    const a = randomValues(n, rng).sort(asc);
    const swaps = Math.max(1, Math.round(n * 0.05));
    for (let s = 0; s < swaps && n > 1; s++) {
      const i = randInt(rng, 0, n - 1);
      const j = Math.min(n - 1, Math.max(0, i + randInt(rng, -3, 3)));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /** 3–5 distinct values, shuffled. */
  fewUnique: (n, seed) => {
    const rng = mulberry32(seed);
    const k = randInt(rng, 3, 5);
    const pool: number[] = [];
    for (let i = 0; i < k; i++) {
      // spread the pool across the range so the values are visually distinct
      const lo = MIN_VALUE + Math.floor((i * (MAX_VALUE - MIN_VALUE)) / k);
      const hi = MIN_VALUE + Math.floor(((i + 1) * (MAX_VALUE - MIN_VALUE)) / k);
      pool.push(randInt(rng, lo, hi));
    }
    const out = new Array<number>(n);
    for (let i = 0; i < n; i++) out[i] = pool[randInt(rng, 0, k - 1)];
    return out;
  },

  allEqual: (n, seed) => {
    const v = randInt(mulberry32(seed), 20, 80);
    return new Array<number>(n).fill(v);
  },
};

export const PRESET_IDS = Object.keys(generators) as PresetId[];

export function isPresetId(s: string): s is PresetId {
  return Object.prototype.hasOwnProperty.call(generators, s);
}

export function generate(preset: PresetId, n: number, seed: number): number[] {
  return generators[preset](Math.max(0, Math.floor(n)), seed);
}
