import type { Ctx, Step } from '../core/ctx';

/*
 * TODO — Tri par insertion
 *
 * Steps to emit:
 *  - compare(j - 1, j)      to compare the key with its left neighbour
 *  - swap(j - 1, j)         to move the key one cell left
 *                           (or: write() the shifted cells, then write() the key)
 *  - markSorted([...])      at the end (optionally the growing prefix)
 * Branch on ctx.lastCompare right after yielding a compare.
 *
 * See docs/ADDING_AN_ALGORITHM.md, and bubble.ts for a complete example.
 */
// eslint-disable-next-line require-yield
export function* insertionSort(_ctx: Ctx): Generator<Step> {
  throw new Error('Not implemented');
}
