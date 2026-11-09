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
