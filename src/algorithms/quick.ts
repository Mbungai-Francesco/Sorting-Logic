import type { Ctx, Step } from '../core/ctx';

/*
 * TODO — Tri rapide (quicksort)
 *
 * Steps to emit:
 *  - range(lo, hi, depth)   when entering each recursive call (depth = recursion depth)
 *  - pivot(p)               once the pivot index is chosen (Lomuto: hi)
 *  - compare(j, p)          each element vs the pivot
 *  - swap(i, j)             partition swaps, then the final pivot placement
 *  - markSorted([p])        when the pivot reaches its final position
 *
 * See docs/ADDING_AN_ALGORITHM.md, and bubble.ts for a complete example.
 */
// eslint-disable-next-line require-yield
export function* quickSort(_ctx: Ctx): Generator<Step> {
  throw new Error('Not implemented');
}
