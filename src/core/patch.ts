import type { Step, Write } from '../types';

export type Direction = 1 | -1;

const NO_WRITES: readonly Write[] = Object.freeze([]);

/**
 * Applies a step's writes forward (`to`) or backward (`from`) onto the given
 * arrays, in place. Returns the writes that were applied — each carries its
 * `target` and `index`, which is exactly what the renderer needs to repaint.
 * Steps without writes (compare, read, pivot, …) return an empty list.
 *
 * Backward application walks the writes in reverse order so that a step
 * writing the same cell twice still inverts correctly.
 */
export function applyStep(
  step: Step,
  dir: Direction,
  main: number[],
  aux: number[],
): readonly Write[] {
  if (step.type !== 'swap' && step.type !== 'overwrite') return NO_WRITES;
  const writes = step.writes;
  if (dir === 1) {
    for (let k = 0; k < writes.length; k++) {
      const w = writes[k];
      (w.target === 'main' ? main : aux)[w.index] = w.to;
    }
  } else {
    for (let k = writes.length - 1; k >= 0; k--) {
      const w = writes[k];
      (w.target === 'main' ? main : aux)[w.index] = w.from;
    }
  }
  return writes;
}
