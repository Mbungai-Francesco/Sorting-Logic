import { describe, expect, it } from 'vitest';
import { algorithms } from '../../algorithms';
import type { AlgorithmEntry, Ctx, Step } from '../../types';
import { buildDcTree, layoutDcTree, locateCell } from '../dcTree';
import { generate } from '../generators';
import { heapSlot } from '../heapLayout';
import { record } from '../recorder';

const merge = algorithms.find((a) => a.id === 'merge')!;
const make = (run: (ctx: Ctx) => Generator<Step>): AlgorithmEntry => ({ ...merge, id: 'test', source: '', run });

describe('buildDcTree on merge sort', () => {
  const input = [12, 8, 9, 3, 11, 5, 4];
  const rec = record(merge, input);
  const tree = buildDcTree(rec);

  it('has one node per sub-array: 2n - 1', () => {
    expect(tree.nodes).toHaveLength(2 * input.length - 1);
    expect(tree.nodes.filter((nd) => nd.children.length === 0).every((nd) => nd.lo === nd.hi)).toBe(true);
  });

  it('snapshots each half when it is split off', () => {
    const [root] = tree.nodes;
    expect(root.values).toEqual(input);
    const [l, r] = root.children.map((c) => tree.nodes[c]);
    // merge.ts splits at ceil((lo + hi) / 2) = 3
    expect(l.values).toEqual([12, 8, 9]);
    expect(r.values).toEqual([3, 11, 5, 4]);
  });

  it('every split node gets a complete, sorted merged version with a source per cell', () => {
    for (const nd of tree.nodes) {
      if (nd.children.length === 0) {
        expect(nd.merge).toBeNull();
        continue;
      }
      expect(nd.merge).not.toBeNull();
      const vals = nd.merge!.cells.map((c) => c!.value);
      expect(vals).toEqual(nd.values.slice().sort((a, b) => a - b));
      for (const c of nd.merge!.cells) {
        expect(c!.from).not.toBeNull();
        const src = tree.nodes[c!.from!.node];
        expect(src.parent).toBe(nd.id);
        const srcVal = c!.from!.merged ? src.merge!.cells[c!.from!.offset]!.value : src.values[c!.from!.offset];
        expect(srcVal).toBe(c!.value);
        expect(c!.at).toBeLessThan(nd.merge!.doneAt);
      }
    }
    expect(tree.nodes[0].merge!.cells.map((c) => c!.value)).toEqual([3, 4, 5, 8, 9, 11, 12]);
  });

  it('uses each source cell once, also with duplicates', () => {
    const dupRec = record(merge, [3, 1, 3, 1, 3, 1, 2, 2]);
    const t = buildDcTree(dupRec);
    for (const nd of t.nodes) {
      if (!nd.merge) continue;
      const keys = nd.merge.cells.map((c) => `${c!.from!.node}:${c!.from!.offset}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('lays out 2D + 1 rows, compact at the top and bottom', () => {
    const lay = layoutDcTree(tree, { cell: 10, gap: 4, row: 20 });
    expect(tree.maxDepth).toBe(3);
    expect(lay.rows).toBe(7);
    // row 0 and the last row have no gaps: cells are 10 apart
    expect(lay.cellX(1, lay.levelOfRow(0)) - lay.cellX(0, lay.levelOfRow(0))).toBe(10);
    expect(lay.cellX(4, lay.levelOfRow(6)) - lay.cellX(3, lay.levelOfRow(6))).toBe(10);
    // the leaf row has a gap at every boundary
    expect(lay.cellX(4, 3) - lay.cellX(3, 3)).toBe(14);
  });

  it('locateCell follows the cursor down the splits and back up the merges', () => {
    expect(locateCell(tree, 0, 0)).toEqual({ node: 0, offset: 0, merged: false });
    const end = locateCell(tree, 5, rec.frames.length);
    expect(end).toEqual({ node: 0, offset: 5, merged: true });
    // just after the first split, cell 4 is in the right half
    const firstSplit = rec.frames.findIndex((s) => s.type === 'split');
    const r = locateCell(tree, 4, firstSplit + 1)!;
    expect(tree.nodes[r.node].lo).toBe(3);
    expect(r.merged).toBe(false);
  });

  it('works on every preset without losing a merge', () => {
    for (const preset of ['random', 'sorted', 'reversed', 'fewUnique'] as const) {
      const data = generate(preset, 40, 7);
      const t = buildDcTree(record(merge, data));
      expect(t.nodes[0].merge!.cells.map((c) => c!.value)).toEqual(data.slice().sort((a, b) => a - b));
    }
  });
});

describe('buildDcTree without joins (quicksort-style)', () => {
  it('builds the divide rows only, children snapshot after the parent is partitioned', () => {
    const rec = record(
      make(function* (ctx) {
        yield ctx.swap(0, 4); // "partition": [5,2,4,3,1] -> [1,2,4,3,5]
        yield ctx.split(2, 0); // pivot at 2: [1,2] [4,3,5]
        yield ctx.split(3, 1); //              [4] [3,5]
      }),
      [5, 2, 4, 3, 1],
    );
    const tree = buildDcTree(rec);
    expect(tree.hasMerge).toBe(false);
    expect(tree.nodes.map((nd) => nd.values)).toEqual([[5, 2, 4, 3, 1], [1, 2], [4, 3, 5], [4], [3, 5]]);
    expect(layoutDcTree(tree, { cell: 10, gap: 4, row: 20 }).rows).toBe(tree.maxDepth + 1);
  });
});

describe('heapSlot', () => {
  it('maps heap indices to levels', () => {
    expect([0, 1, 2, 3, 6, 7].map(heapSlot)).toEqual([
      { level: 0, pos: 0 },
      { level: 1, pos: 0 },
      { level: 1, pos: 1 },
      { level: 2, pos: 0 },
      { level: 2, pos: 3 },
      { level: 3, pos: 0 },
    ]);
  });
});
