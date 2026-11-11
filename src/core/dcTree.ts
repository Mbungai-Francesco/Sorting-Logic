/**
 * Divide-and-conquer tree, derived from a recording. Pure: no DOM, no React.
 *
 * The algorithm only has to emit `split(at)` when it divides a sub-array and
 * `join(at)` once the two halves are merged back (see merge.ts):
 *
 *  - split(at) cuts the deepest current node that contains both a[at-1] and
 *    a[at] into [lo, at-1] and [at, hi]. Each child stores the values of its
 *    cells at that moment (the "divide" rows of the diagram).
 *  - While a node's children are all finished (leaves, or already joined),
 *    the first write to each cell of that node is recorded as a cell of its
 *    MERGED version, with an arrow from the child cell holding that value
 *    (the "merge" rows). For merge sort these are the writes into aux.
 *  - join(at) marks the merged version of the node split at `at` complete.
 *
 * Everything is tagged with the frame that produces it, so the view at any
 * cursor is a plain filter (`frame < cursor`) — stepping backward is free.
 */
import type { Recording } from './recorder';
import { applyStep } from './patch';

export interface CellRef {
  node: number;
  /** offset inside the node (index - node.lo) */
  offset: number;
  /** true: the cell of the node's merged version; false: its divide version */
  merged: boolean;
}

export interface MergedCell {
  value: number;
  /** frame that wrote it */
  at: number;
  /** where the value came from, if it could be matched */
  from: CellRef | null;
}

export interface DcNode {
  id: number;
  lo: number;
  hi: number;
  depth: number;
  parent: number | null;
  /** children ids, left to right (empty for a leaf) */
  children: number[];
  /** frame that created the node (-1 for the root: always visible) */
  bornAt: number;
  /** a[lo..hi] when the node was created */
  values: number[];
  /** frame of the split that created its children (null for a leaf) */
  splitAt: number | null;
  merge: {
    /** first frame that filled a merged cell */
    startAt: number;
    /** frame of the join that completes it */
    doneAt: number;
    /** one entry per cell, null while unfilled */
    cells: (MergedCell | null)[];
  } | null;
}

export interface DcTree {
  nodes: DcNode[];
  n: number;
  /** deepest node depth (leaf row) */
  maxDepth: number;
  /** at least one node has a completed merged version */
  hasMerge: boolean;
  /** splitDepth[b] = depth of the node split at boundary b (before cell b), or -1 */
  splitDepth: number[];
}

const contains = (nd: DcNode, i: number) => i >= nd.lo && i <= nd.hi;

export function buildDcTree(rec: Recording): DcTree {
  const n = rec.initial.length;
  const nodes: DcNode[] = [
    {
      id: 0, lo: 0, hi: n - 1, depth: 0, parent: null, children: [],
      bornAt: -1, values: rec.initial.slice(), splitAt: null, merge: null,
    },
  ];
  const splitDepth = new Array<number>(n).fill(-1);
  const joined = new Set<number>();
  const main = rec.initial.slice();
  const aux = rec.initialAux.slice();
  const usesJoin = rec.frames.some((s) => s.type === 'join');
  /** per merging node: source cells already used, as "node:offset:merged" */
  const used = new Map<number, Set<string>>();

  const childAt = (nd: DcNode, i: number): DcNode | undefined =>
    nd.children.map((c) => nodes[c]).find((c) => contains(c, i));
  const isDone = (nd: DcNode) => nd.children.length === 0 || joined.has(nd.id);

  /** The node whose merged version a write at index k belongs to, if any. */
  const mergingNodeFor = (k: number): DcNode | null => {
    let x: DcNode | undefined = nodes[0];
    while (x && contains(x, k)) {
      if (x.children.length === 0 || joined.has(x.id)) return null;
      if (x.children.every((c) => isDone(nodes[c]))) return x;
      x = childAt(x, k);
    }
    return null;
  };

  /** First unused cell holding `value` in the children of `nd`, left to right. */
  const findSource = (nd: DcNode, value: number): CellRef | null => {
    let set = used.get(nd.id);
    if (!set) used.set(nd.id, (set = new Set()));
    for (const cid of nd.children) {
      const c = nodes[cid];
      const merged = c.merge !== null && joined.has(cid);
      const vals = merged ? c.merge!.cells.map((m) => m?.value) : c.values;
      for (let o = 0; o < vals.length; o++) {
        const key = `${cid}:${o}:${merged}`;
        if (vals[o] === value && !set.has(key)) {
          set.add(key);
          return { node: cid, offset: o, merged };
        }
      }
    }
    return null;
  };

  rec.frames.forEach((step, f) => {
    const writes = applyStep(step, 1, main, aux);

    if (step.type === 'split') {
      const at = step.at;
      let x: DcNode | undefined = nodes[0];
      while (x && x.children.length > 0) x = x.children.map((c) => nodes[c]).find((c) => contains(c, at - 1) && contains(c, at));
      if (!x || !contains(x, at - 1) || !contains(x, at)) return; // already a boundary: nothing to cut
      const parent: DcNode = x;
      const mk = (lo: number, hi: number): number => {
        const id = nodes.length;
        nodes.push({
          id, lo, hi, depth: parent.depth + 1, parent: parent.id, children: [],
          bornAt: f, values: main.slice(lo, hi + 1), splitAt: null, merge: null,
        });
        return id;
      };
      parent.children = [mk(parent.lo, at - 1), mk(at, parent.hi)];
      parent.splitAt = f;
      splitDepth[at] = parent.depth;
      return;
    }

    if (step.type === 'join') {
      let x: DcNode | undefined = nodes[0];
      while (x && x.children.length > 0 && !x.children.some((c) => nodes[c].lo === step.at && c !== x!.children[0])) {
        x = childAt(x, step.at);
      }
      if (!x || x.children.length === 0 || joined.has(x.id)) return;
      if (!x.merge) x.merge = { startAt: f, doneAt: f, cells: new Array(x.hi - x.lo + 1).fill(null) };
      x.merge.doneAt = f;
      joined.add(x.id);
      return;
    }

    if (!usesJoin) return;
    for (const w of writes) {
      const nd = mergingNodeFor(w.index);
      if (!nd) continue;
      if (!nd.merge) nd.merge = { startAt: f, doneAt: -1, cells: new Array(nd.hi - nd.lo + 1).fill(null) };
      const o = w.index - nd.lo;
      if (nd.merge.cells[o] !== null) continue; // e.g. the copy back into main
      nd.merge.cells[o] = { value: w.to, at: f, from: findSource(nd, w.to) };
    }
  });

  // A merged version only counts once joined.
  for (const nd of nodes) if (nd.merge && !joined.has(nd.id)) nd.merge = null;

  return {
    nodes,
    n,
    maxDepth: nodes.reduce((m, nd) => Math.max(m, nd.depth), 0),
    hasMerge: nodes.some((nd) => nd.merge !== null),
    splitDepth,
  };
}

/**
 * Where array index i is shown at `cursor` (frames < cursor applied): walk
 * down through split nodes; stop at a node that is not split yet (its divide
 * version) or already merged (its merged version).
 */
export function locateCell(tree: DcTree, i: number, cursor: number): CellRef | null {
  let x: DcNode | undefined = tree.nodes[0];
  if (!x || !contains(x, i)) return null;
  for (;;) {
    if (x.merge && x.merge.doneAt < cursor) return { node: x.id, offset: i - x.lo, merged: true };
    if (x.splitAt === null || x.splitAt >= cursor) return { node: x.id, offset: i - x.lo, merged: false };
    const next: DcNode | undefined = x.children.map((c) => tree.nodes[c]).find((c) => contains(c, i));
    if (!next) return { node: x.id, offset: i - x.lo, merged: false };
    x = next;
  }
}

// ---- layout ----------------------------------------------------------------

export interface DcLayoutOptions {
  /** horizontal pitch of one cell */
  cell: number;
  /** extra space at a split boundary */
  gap: number;
  /** vertical pitch of one row */
  row: number;
}

export interface DcLayout {
  width: number;
  rows: number;
  /** x of the left edge of cell i at gap level L (see cellX) */
  cellX: (i: number, level: number) => number;
  /** row of a node's divide version */
  divideRow: (nd: DcNode) => number;
  /** row of a node's merged version */
  mergeRow: (nd: DcNode) => number;
  /** gap level of each row (which split gaps are open on it) */
  levelOfRow: (row: number) => number;
}

/**
 * Rows 0..D hold the divide versions (leaves all sit on row D); rows
 * D+1..2D the merged versions, mirrored (a node at depth d merges on row
 * 2D - d, so the fully merged array is the last row).
 * On a row at gap level L, the gap before cell b is open iff the split at b
 * happened at a depth < L — so each row is the row above, pulled apart.
 */
export function layoutDcTree(tree: DcTree, opt: DcLayoutOptions): DcLayout {
  const D = tree.maxDepth;
  const n = tree.n;
  // prefix[L][i] = number of open gaps before cell i (inclusive) at level L
  const prefix: number[][] = [];
  for (let L = 0; L <= D; L++) {
    const p = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      const sd = tree.splitDepth[i];
      p[i] = (i > 0 ? p[i - 1] : 0) + (sd >= 0 && sd < L ? 1 : 0);
    }
    prefix.push(p);
  }
  const rowWidth = (L: number) => (n === 0 ? 0 : n * opt.cell + prefix[L][n - 1] * opt.gap);
  const width = rowWidth(D);
  const cellX = (i: number, L: number) => {
    const lv = Math.max(0, Math.min(D, L));
    return (width - rowWidth(lv)) / 2 + i * opt.cell + prefix[lv][i] * opt.gap;
  };
  return {
    width,
    rows: tree.hasMerge ? 2 * D + 1 : D + 1,
    cellX,
    divideRow: (nd) => (nd.children.length === 0 ? D : nd.depth),
    mergeRow: (nd) => 2 * D - nd.depth,
    levelOfRow: (r) => (r <= D ? r : 2 * D - r),
  };
}
