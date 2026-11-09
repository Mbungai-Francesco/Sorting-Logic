import type { Ctx, Step } from '../core/ctx';

export function* bubbleSort(ctx: Ctx): Generator<Step> {
  const n = ctx.size;
  for (let end = n - 1; end > 0; end--) {
    let swapped = false;
    for (let i = 0; i < end; i++) {
      yield ctx.compare(i, i + 1, 'cmp'); // @cmp
      if (ctx.lastCompare > 0) {
        ctx.note(`${ctx.value(i)} > ${ctx.value(i + 1)}, on échange`);
        yield ctx.swap(i, i + 1, 'swap'); // @swap
        swapped = true;
      }
    }
    ctx.note(`${ctx.value(end)} est à sa place définitive`);
    yield ctx.markSorted([end], 'placed'); // @placed
    if (!swapped) {
      ctx.note('Aucun échange pendant ce passage : le reste est déjà trié');
      yield ctx.markSorted(Array.from({ length: end }, (_, k) => k), 'early'); // @early
      return;
    }
  }
  if (n > 0) yield ctx.markSorted([0], 'last'); // @last
}
