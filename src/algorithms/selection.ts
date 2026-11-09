import type { Ctx, Step } from '../core/ctx';

/*
 * TODO — Tri par sélection
 *
 * Steps to emit:
 *  - compare(j, minIdx)     while scanning for the minimum of the unsorted part
 *                           (non-adjacent compares are fine)
 *  - swap(i, minIdx)        to put the minimum in place (skip it if i === minIdx)
 *  - markSorted([i])        after each outer iteration
 *
 * See docs/ADDING_AN_ALGORITHM.md, and bubble.ts for a complete example.
 */
// eslint-disable-next-line require-yield
export function* selectionSort(_ctx: Ctx): Generator<Step> {
  throw new Error('Not implemented');
}
