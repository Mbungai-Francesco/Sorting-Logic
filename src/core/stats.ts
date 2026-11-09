import type { Step } from '../types';

export interface Counters {
  comparisons: number;
  swaps: number;
  /** Individual cells written (a swap writes 2 cells, an overwrite 1). */
  writes: number;
  /** Explicit `read` steps. */
  reads: number;
  /** Deepest `range` depth seen so far. */
  maxDepth: number;
}

export interface StatsIndex {
  totals: Counters;
  /** checkpoints[k] = counters after the first k * CHECKPOINT_EVERY frames. */
  checkpoints: Counters[];
}

/**
 * Running values are recomputed from the nearest checkpoint, so a lookup costs
 * at most CHECKPOINT_EVERY steps and memory stays tiny even at 2M frames
 * (instead of 5 prefix arrays of 2M entries each).
 */
export const CHECKPOINT_EVERY = 1024;

export function zeroCounters(): Counters {
  return { comparisons: 0, swaps: 0, writes: 0, reads: 0, maxDepth: 0 };
}

export function accumulate(c: Counters, step: Step): void {
  switch (step.type) {
    case 'compare':
      c.comparisons++;
      break;
    case 'swap':
      c.swaps++;
      c.writes += step.writes.length;
      break;
    case 'overwrite':
      c.writes += step.writes.length;
      break;
    case 'read':
      c.reads++;
      break;
    case 'range':
      if (step.depth > c.maxDepth) c.maxDepth = step.depth;
      break;
    default:
      break;
  }
}

export function deriveStats(frames: readonly Step[]): StatsIndex {
  const running = zeroCounters();
  const checkpoints: Counters[] = [{ ...running }];
  for (let i = 0; i < frames.length; i++) {
    accumulate(running, frames[i]);
    if ((i + 1) % CHECKPOINT_EVERY === 0) checkpoints.push({ ...running });
  }
  return { totals: running, checkpoints };
}

/** Counters after `cursor` frames have been applied. */
export function statsAt(index: StatsIndex, frames: readonly Step[], cursor: number): Counters {
  const c = Math.max(0, Math.min(cursor, frames.length));
  const k = Math.min(Math.floor(c / CHECKPOINT_EVERY), index.checkpoints.length - 1);
  const out = { ...index.checkpoints[k] };
  for (let i = k * CHECKPOINT_EVERY; i < c; i++) accumulate(out, frames[i]);
  return out;
}
