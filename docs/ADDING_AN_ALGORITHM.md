# Adding an algorithm

Each algorithm is one generator function in `src/algorithms/<id>.ts`. You only
write the algorithm. Recording, playback, step-back, counters, the code panel
and the tests already work for any generator that follows the rules below.

`src/algorithms/bubble.ts` is the reference implementation. Keep it open while
you work.

## Checklist

1. Open the stub, e.g. `src/algorithms/insertion.ts`. Its TODO block lists the
   step types the algorithm should emit.
2. Rename `_ctx` to `ctx` and replace `throw new Error('Not implemented')`
   with your generator body. Remove the `eslint-disable` line.
3. Every call to a `ctx` method that returns a step must be **yielded**:
   `yield ctx.swap(i, j, 'swap');`
4. Add `// @marker` comments at the end of the lines you want highlighted, and
   pass the same name as the `line` argument.
5. Optional: add French captions with `ctx.note('…')` just before a step.
6. In `src/algorithms/index.ts`, set `implemented: true` for your entry.
7. Run the conformance suite for your algorithm only:
   `npx vitest run conformance -t insertion`
8. Run `npm run dev`, pick the algorithm and watch it.

## The Ctx API

The `ctx` object is the only way to touch the array. Each mutating method
changes the working array and returns a `Step` that already contains its
inverse. You never build steps by hand.

| Method | Emits | Use it when |
|---|---|---|
| `ctx.size` | — | array length |
| `ctx.value(i, target?)` | nothing | reading a value for a **condition** (loop test, `if`). No step, so it's free. |
| `ctx.compare(i, j, line?)` | `compare` | you compare two cells of the main array. Read the result in `ctx.lastCompare`. |
| `ctx.lastCompare` | — | `a[i] - a[j]` from the last `compare()`: `> 0` means `a[i] > a[j]` |
| `ctx.swap(i, j, line?)` | `swap` | exchanging two cells |
| `ctx.write(i, v, line?, target?)` | `overwrite` | writing a value into a cell (`'main'` or `'aux'`) |
| `ctx.insert(from, to, line?)` | `insert` | moving one value to another cell and shifting the cells in between by one. `to < from` shifts them **right** (insertion sort: `insert(i, j)` drops `a[i]` at `j`), `to > from` shifts them **left**. One step, fully reversible. Counts as `|from − to| + 1` writes. |
| `ctx.read(i, line?, target?)` | `read` | showing that a cell is being read (merge sort, binary search) |
| `ctx.pivot(i, line?, label?)` | `pivot` | the pivot of the current partition is chosen, or any cell you want to single out (e.g. the current max). With a `label` (`'max'`, `'p'`…), the label is drawn under the bar like lo / mid / hi. The highlight stays until the next `pivot()` or `range()`. |
| `ctx.range(lo, hi, depth, line?, target?)` | `range` | entering a sub-array (recursive call). Cells outside `[lo, hi]` are dimmed. `depth` feeds the "max depth" counter. |
| `ctx.markSorted(indices, line?)` | `markSorted` | cells reached their final position (shown in green until you step back) |
| `ctx.probe(lo, mid, hi, line?)` | `probe` | each iteration of a search: draws the lo/mid/hi markers and shades the eliminated halves |
| `ctx.resolve(index \| null, line?)` | `resolve` | the search ends: found at `index`, or `null` if not found |
| `ctx.note(text)` | nothing | attaches a French caption to the **next** step |
| `ctx.initAux(length)` | nothing | creates the auxiliary row (merge sort). New cells start at 0 and are drawn empty. |

### Branching on a comparison

`compare()` has to return the step so you can yield it, so the comparison
result goes in `ctx.lastCompare`. Read it after the yield:

```ts
yield ctx.compare(i, i + 1, 'cmp');   // @cmp
if (ctx.lastCompare > 0) {            // a[i] > a[i+1]
  yield ctx.swap(i, i + 1, 'swap');   // @swap
}
```

| You mean | Write |
|---|---|
| `a[i] > a[j]` | `ctx.lastCompare > 0` |
| `a[i] >= a[j]` | `ctx.lastCompare >= 0` |
| `a[i] < a[j]` | `ctx.lastCompare < 0` |
| `a[i] <= a[j]` | `ctx.lastCompare <= 0` (use this in merge sort to keep it stable) |

To compare without showing a step, for example in a `while` condition, use
`ctx.value()`:

```ts
while (j > 0 && ctx.value(j - 1) > key) { … }
```

A good rule: if the comparison is part of what the algorithm is "doing" (and
counted in its complexity), emit a `compare`. If it's loop bookkeeping, use
`value()`.

### Captions

```ts
ctx.note(`${ctx.value(i)} > ${ctx.value(i + 1)}, on échange`);
yield ctx.swap(i, i + 1, 'swap'); // @swap
```

The note goes on the next step produced. Steps without a note get an automatic
caption (e.g. "Compare a[3] = 7 et a[4] = 2").

### Recursion

Write the recursive part as a helper generator and delegate with `yield*`:

```ts
export function* quickSort(ctx: Ctx): Generator<Step> {
  yield* sort(ctx, 0, ctx.size - 1, 0);
}

function* sort(ctx: Ctx, lo: number, hi: number, depth: number): Generator<Step> {
  if (lo >= hi) return;
  yield ctx.range(lo, hi, depth, 'range'); // @range
  // …partition…
  yield* sort(ctx, lo, p - 1, depth + 1);
  yield* sort(ctx, p + 1, hi, depth + 1);
}
```

If you forget the `*` (`yield sort(...)` instead of `yield* sort(...)`), you
yield the generator object itself, and recording stops with "yielded a value
that was not returned by a ctx method".

## Which steps for which algorithm

| Algorithm | Steps |
|---|---|
| Insertion | `compare(j-1, j)` + `swap(j-1, j)` (or `write` the shifted cells, then the key); `markSorted` at the end |
| Selection | `compare(j, minIdx)` while scanning (non-adjacent is fine); `swap(i, minIdx)`; `markSorted([i])` per pass |
| Merge | `initAux(n)` once; `range(lo, hi, depth)` per call; `compare(i, j)` in main; `write(k, v, line, 'aux')` to merge into aux; `write(k, ctx.value(k, 'aux'))` to copy back; optional `read` |
| Quick | `range(lo, hi, depth)` per call; `pivot(p)`; `compare(j, p)`; `swap` while partitioning; `markSorted([p])` once placed |
| Heap | `compare(child, largest)` (non-adjacent indices: 2i+1, 2i+2); `swap` in sift-down; `swap(0, end)` + `markSorted([end])` per extraction |
| Binary search | `probe(lo, mid, hi)` per iteration; optional `read(mid)`; `resolve(mid)` or `resolve(null)`. Compare with the target with `ctx.value(mid)`. The input is already sorted (`requiresSorted: true`), and the target is the generator's second argument. |

Merge sort pattern: `compare` only works on the main array. That is enough,
because while you merge `[lo..mid]` and `[mid+1..hi]` into **aux**, both halves
of main are still unchanged. Compare in main, write into aux, then copy aux
back into main.

## Line markers

Put a marker comment at the **end** of a line:

```ts
yield ctx.compare(i, i + 1, 'cmp'); // @cmp
```

- The name in the comment (`@cmp`) must match the `line` argument (`'cmp'`).
- Several markers can share a line: `// @cmp @loop`.
- Define each marker once. The test reports duplicates.
- You may reuse a name in several calls (e.g. two `write` calls both pointing
  at `'w'`). They highlight the line where the marker is defined.
- A step without `line` keeps the previous highlight.

The line numbers come from parsing the source, so refactoring never
misaligns the highlight.

## Register it

In `src/algorithms/index.ts` the entry already exists. Flip one field:

```ts
{
  id: 'insertion',
  …
  implemented: true,   // ← was false
  …
}
```

Adding a brand new algorithm (not one of the stubs): create
`src/algorithms/foo.ts`, then add an entry with `import { foo } from './foo'`
and `import fooSource from './foo.ts?raw'`. Fill in `kind`, `needsAux`,
`complexity`, and, for searches, `requiresSorted` and `requiresTarget`.

## Test it

```bash
npx vitest run conformance -t insertion     # just your algorithm
npx vitest conformance -t insertion         # same, re-runs on save
npm run test                                # everything
```

For every preset (random, nearly sorted, reversed, few unique, all equal,
sorted), sizes 1, 2, 3, 8, 31, 100 and three seeds, the suite checks that:

1. the final array is sorted (for a search: `resolve` gives a correct index,
   or `null` exactly when the target is absent);
2. replaying every step forward from `initial` gives `final`;
3. replaying every step backward from `final` gives `initial`;
4. every `line` name you used exists as a `// @name` marker;
5. the step count stays under the 2,000,000 cap.

`runConformance(entry, sizes?, seeds?)` is exported from
`src/core/__tests__/conformance.test.ts` if you want a custom run.

## Error messages

| Message | Meaning |
|---|---|
| `ctx.X() was called before the step from ctx.Y() was yielded` | You called `ctx.Y(...)` without `yield`. |
| `ctx.X() was called but its step was never yielded` | Same, on the last call. |
| `yielded a value that was not returned by a ctx method` | You yielded something you built yourself. |
| `index N is out of bounds for main (length L)` | Off-by-one. For aux: did you call `initAux`? |
| `exceeded 2,000,000 steps — probably an infinite loop` | A loop index doesn't move, or a recursion has no base case. |
| `final array is not the sorted input` | The algorithm is wrong (also shown as a ⚠ warning in the app). |

All of these also appear in the app, in place of the bars.
