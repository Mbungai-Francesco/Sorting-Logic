import type { Ctx, Step } from '../core/ctx';

/*
 * TODO — Recherche dichotomique
 *
 * Input is already sorted by the recorder (requiresSorted: true).
 * The target value arrives as the second argument.
 * Steps to emit:
 *  - probe(lo, mid, hi)     each iteration, before inspecting a[mid]
 *  - read(mid)              optional, to show the access
 *  - resolve(mid)           when found
 *  - resolve(null)          when lo > hi (not found)
 * Use ctx.value(mid) to compare with the target (no compare() step:
 * compare() is between two cells, not a cell and a value).
 *
 * See docs/ADDING_AN_ALGORITHM.md, and bubble.ts for a complete example.
 */
export function* binarySearch(ctx: Ctx, target?: number): Generator<Step> {
	if (target == undefined) throw new Error("Target is required");

	const n = ctx.size;
	let lo = 0;
	let hi = n - 1;
	let midIndex = Math.ceil((lo + hi) / 2);
	let found = false;

	while (!found && lo <= midIndex && midIndex <= hi) {
		yield ctx.probe(lo, midIndex, hi, "probe"); //@probe

		const midVal = ctx.value(midIndex);
		if (target == midVal) found = true;
		else if (target < midVal) hi = midIndex - 1;
		else lo = midIndex + 1;

		if (found) yield ctx.resolve(midIndex);

		midIndex = Math.ceil((lo + hi) / 2);
	}
  if (!found) yield ctx.resolve(null);
}