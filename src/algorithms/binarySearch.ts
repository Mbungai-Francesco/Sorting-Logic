import type { Ctx, Step } from '../core/ctx';

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