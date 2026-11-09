import type { Ctx, Step } from '../core/ctx';


export function* insertionSort(ctx: Ctx): Generator<Step> {
	const n = ctx.size;
	const sortedCells = [0];

	yield ctx.markSorted(sortedCells, "markSorted"); // @markSorted
	for (let i = 1; i < n; i++) {
		let j = 0;
		let inserted = false;
		while (j < i && !inserted) {
			yield ctx.compare(j, i, "compare"); // @compare
			if (ctx.lastCompare > 0) {
				yield ctx.insert(i, j, "insert"); // @insert
				inserted = true;
			}
			j++;
		}

		sortedCells.push(i);
		yield ctx.markSorted(sortedCells, "markSorted");
	}
}
