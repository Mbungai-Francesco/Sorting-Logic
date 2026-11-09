import type { Ctx, Step } from '../core/ctx';

/*
 * TODO — Tri fusion
 *
 * Needs the auxiliary row: call ctx.initAux(ctx.size) first
 * (and set needsAux: true in the registry — already done).
 * Steps to emit:
 *  - range(lo, hi, depth)               when entering each recursive call
 *  - compare(i, j)                      left-half vs right-half element (main)
 *  - read(i) / read(k, line, 'aux')     when loading a value (optional but visible)
 *  - write(k, v, line, 'aux')           merge into aux (an 'overwrite' on aux)
 *  - write(k, ctx.value(k, 'aux'))      copy the merged run back into main
 *  - markSorted([...])                  at the end
 * Pattern: compare in main, write the merged run into aux, copy aux back.
 *
 * See docs/ADDING_AN_ALGORITHM.md, and bubble.ts for a complete example.
 */
// eslint-disable-next-line require-yield
export function* mergeSort(_ctx: Ctx): Generator<Step> {
  throw new Error('Not implemented');
}
