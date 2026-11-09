import type { Ctx, Step } from '../core/ctx';

/*
 * TODO — Tri par tas
 *
 * Steps to emit:
 *  - compare(child, largest) inside sift-down — these are NON-adjacent
 *                            indices (2i+1, 2i+2), which is expected
 *  - swap(i, largest)        to sift down
 *  - swap(0, end)            to move the max behind the heap
 *  - markSorted([end])       after each extraction
 *  - range(0, end - 1, 0)    optional: to dim the already-sorted tail
 *
 * See docs/ADDING_AN_ALGORITHM.md, and bubble.ts for a complete example.
 */
// eslint-disable-next-line require-yield
export function* heapSort(_ctx: Ctx): Generator<Step> {
  throw new Error('Not implemented');
}
