import type { Ctx, Step } from '../core/ctx';

/*
 * Merge sort, top-down.
 *
 * divide(lo, hi) splits a[lo..hi] into a[lo..mid-1] and a[mid..hi] (a gap
 * opens between them on screen), sorts each half recursively, merges them,
 * then closes the gap: the two sub-arrays are one sorted array again.
 *
 * merge(lo, mid, hi) compares the two halves in the MAIN row (they stay
 * untouched while merging), writes the merged run into the AUX row, then
 * copies it back into main.
 */
function* divide(ctx: Ctx, lo: number, hi: number, depth: number): Generator<Step> {
  yield ctx.range(lo, hi, depth, 'divide'); // @divide
  if (hi - lo < 1) return; // 0 or 1 element: already sorted

  const mid = Math.ceil((lo + hi) / 2);
  yield ctx.split(mid, depth, 'split'); // @split
  yield* divide(ctx, lo, mid - 1, depth + 1);
  yield* divide(ctx, mid, hi, depth + 1);

  yield ctx.range(lo, hi, depth, 'focus'); // @focus
  yield* merge(ctx, lo, mid, hi);
  yield ctx.join(mid, 'join'); // @join
}

function* merge(ctx: Ctx, lo: number, mid: number, hi: number): Generator<Step> {
  let i = lo; // next cell of the left half  a[lo..mid-1]
  let j = mid; // next cell of the right half a[mid..hi]
  let k = lo; // next cell to fill in aux

  while (i < mid && j <= hi) {
    yield ctx.compare(i, j, 'cmp'); // @cmp
    if (ctx.lastCompare <= 0) {
      yield ctx.write(k, ctx.value(i), 'takeLeft', 'aux'); // @takeLeft
      i++;
    } else {
      yield ctx.write(k, ctx.value(j), 'takeRight', 'aux'); // @takeRight
      j++;
    }
    k++;
  }

  while (i < mid) yield ctx.write(k++, ctx.value(i++), 'restLeft', 'aux'); // @restLeft
  while (j <= hi) yield ctx.write(k++, ctx.value(j++), 'restRight', 'aux'); // @restRight

  for (let t = lo; t <= hi; t++) {
    yield ctx.write(t, ctx.value(t, 'aux'), 'copyBack'); // @copyBack
  }
}

export function* mergeSort(ctx: Ctx): Generator<Step> {
  const n = ctx.size;
  ctx.initAux(n);
  yield* divide(ctx, 0, n - 1, 0);
  yield ctx.markSorted(Array.from({ length: n }, (_, k) => k), 'done'); // @done
}
