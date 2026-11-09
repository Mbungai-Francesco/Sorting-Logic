import type { Ctx, Step } from '../core/ctx';


export function* selectionSort(ctx: Ctx): Generator<Step> {
	const n = ctx.size;
	const sortedCells = [];

	for (let i = n; i > 1; i--) {
		yield ctx.range(0, i - 1, 0, "range"); // @range
		let max = Number.NEGATIVE_INFINITY;
		let pos = 0;
		let swap = false;

		for (let j = 0; j < i; j++) {
			const val = ctx.value(j);
			yield ctx.read(j, "read"); // @read
			if (val > max) {
				max = val;
				pos = j;
				yield ctx.pivot(pos, "pivot", "max"); // @pivot
				swap = pos != i - 1 ? true : false;
			}
		}
		sortedCells.push(i - 1);
		if (swap) yield ctx.swap(pos, i - 1, "swap"); // @swap

		yield ctx.markSorted(sortedCells, "markSorted"); // @markSorted
	}
  
	sortedCells.push(0);
  yield ctx.markSorted(sortedCells);
}
