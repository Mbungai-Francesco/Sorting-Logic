import { useMemo, type ReactNode } from 'react';
import { buildDcTree, layoutDcTree, locateCell, type CellRef, type DcNode } from '../core/dcTree';
import type { Player } from '../core/player';
import type { Recording } from '../core/recorder';
import type { BarState } from '../core/timeline';
import { useI18n } from '../hooks/useI18n';
import { useTimeline } from './useTimeline';

interface Props {
  player: Player;
  rec: Recording;
  showValues: boolean;
  scaleMax: number;
}

const ARROW_ID = 'dc-arrow';
/** Geometry in SVG units (the SVG scales to fit the stage). */
const GEO_VALUES = { cell: 30, gap: 14, row: 62, h: 24 };
const GEO_MINI = { cell: 10, gap: 5, row: 50, h: 28 };

/**
 * Recursion diagram for divide-and-conquer algorithms: the array splitting
 * row by row (grey), then merging back (green), with an arrow from every
 * source cell to where its value lands. Built once per recording by
 * core/dcTree.ts; each render only filters by the cursor.
 */
export function DcTreeView({ player, rec, showValues, scaleMax }: Props) {
  const { t } = useI18n();
  const tl = useTimeline(player);

  const geo = showValues ? GEO_VALUES : GEO_MINI;
  const tree = useMemo(() => buildDcTree(rec), [rec]);
  const layout = useMemo(() => layoutDcTree(tree, geo), [tree, geo]);

  // The timeline can briefly belong to the previous recording while a new one loads.
  const cursor = tl && tl.rec === rec ? tl.cursor : 0;
  const atEnd = cursor >= rec.frames.length;

  // ---- highlights for the current step ----
  const hl = new Map<string, BarState>();
  const key = (r: CellRef) => `${r.node}:${r.offset}:${r.merged}`;
  const mark = (i: number, s: BarState) => {
    const r = locateCell(tree, i, cursor);
    if (r) hl.set(key(r), s);
  };
  if (tl && tl.rec === rec && !atEnd) {
    const pivot = tl.activePivot();
    if (pivot !== null) mark(pivot, 'pivot');
    const step = tl.current;
    if (step) {
      // merged cells filled by this very step
      let filled = false;
      for (const nd of tree.nodes) {
        nd.merge?.cells.forEach((c, o) => {
          if (c && c.at === cursor - 1) {
            hl.set(`${nd.id}:${o}:true`, 'swapping');
            if (c.from) hl.set(key(c.from), 'reading');
            filled = true;
          }
        });
      }
      if (!filled) {
        if (step.type === 'compare') step.indices.forEach((i) => mark(i, 'comparing'));
        else if (step.type === 'swap') step.indices.forEach((i) => mark(i, 'swapping'));
        else if (step.type === 'read' && step.target === 'main') mark(step.index, 'reading');
      }
    }
  }

  // ---- geometry helpers ----
  const y = (row: number) => 8 + row * geo.row;
  const cellBox = (nd: DcNode, offset: number, merged: boolean) => {
    const row = merged ? layout.mergeRow(nd) : layout.divideRow(nd);
    const x = layout.cellX(nd.lo + offset, layout.levelOfRow(row));
    return { x, y: y(row), w: geo.cell - 2, h: geo.h };
  };
  const curve = (x1: number, y1: number, x2: number, y2: number) => {
    const my = (y1 + y2) / 2;
    return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
  };

  const edges: ReactNode[] = [];
  const cells: ReactNode[] = [];

  const drawCell = (k: string, box: ReturnType<typeof cellBox>, value: number | null, cls: string, state?: BarState) => {
    const barH = value === null ? 0 : Math.max(2, (value / scaleMax) * (box.h - 4));
    cells.push(
      <g key={k} className={`dc-cell ${cls}`} data-state={state ?? 'idle'}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={showValues ? 4 : 2} />
        {value === null ? null : showValues ? (
          <text x={box.x + box.w / 2} y={box.y + box.h / 2}>{value}</text>
        ) : (
          <rect className="dc-minibar" x={box.x + 1} y={box.y + box.h - 2 - barH} width={Math.max(1, box.w - 2)} height={barH} />
        )}
      </g>,
    );
  };

  for (const nd of tree.nodes) {
    // divide version
    if (nd.bornAt < cursor) {
      nd.values.forEach((v, o) =>
        drawCell(`d${nd.id}:${o}`, cellBox(nd, o, false), v, 'dc-cell--divide', hl.get(`${nd.id}:${o}:false`)),
      );
      if (nd.parent !== null) {
        const p = tree.nodes[nd.parent];
        const pRow = layout.divideRow(p);
        const L = layout.levelOfRow(pRow);
        const x1 = (layout.cellX(nd.lo, L) + layout.cellX(nd.hi, L) + geo.cell - 2) / 2;
        const cRow = layout.divideRow(nd);
        const cL = layout.levelOfRow(cRow);
        const x2 = (layout.cellX(nd.lo, cL) + layout.cellX(nd.hi, cL) + geo.cell - 2) / 2;
        edges.push(
          <path key={`e${nd.id}`} className="dc-edge" d={curve(x1, y(pRow) + geo.h, x2, y(cRow) - 3)} markerEnd={`url(#${ARROW_ID})`} />,
        );
      }
    }
    // merged version
    const m = nd.merge;
    if (m && m.startAt < cursor) {
      const done = m.doneAt < cursor;
      m.cells.forEach((c, o) => {
        const box = cellBox(nd, o, true);
        const filled = c !== null && c.at < cursor;
        drawCell(
          `m${nd.id}:${o}`,
          box,
          filled ? c.value : null,
          filled ? (done ? 'dc-cell--merged' : 'dc-cell--merging') : 'dc-cell--empty',
          hl.get(`${nd.id}:${o}:true`),
        );
        if (filled && c.from) {
          const s = cellBox(tree.nodes[c.from.node], c.from.offset, c.from.merged);
          edges.push(
            <path
              key={`a${nd.id}:${o}`}
              className={`dc-edge dc-edge--merge${c.at === cursor - 1 ? ' dc-edge--active' : ''}`}
              d={curve(s.x + s.w / 2, s.y + s.h, box.x + box.w / 2, box.y - 3)}
              markerEnd={`url(#${ARROW_ID})`}
            />,
          );
        }
      });
    }
  }

  const height = y(layout.rows - 1) + geo.h + 8;
  return (
    <svg
      className="tree-view dc-tree"
      data-values={showValues ? 'on' : 'off'}
      viewBox={`-6 0 ${layout.width + 12} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('dcTreeLabel')}
    >
      <defs>
        <marker id={ARROW_ID} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path className="dc-arrowhead" d="M0,0 L10,5 L0,10 z" />
        </marker>
      </defs>
      <g>{edges}</g>
      <g>{cells}</g>
    </svg>
  );
}
