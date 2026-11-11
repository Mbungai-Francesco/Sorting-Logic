import { heapSlot } from '../core/heapLayout';
import type { Player } from '../core/player';
import { computeBarStates, type BarState } from '../core/timeline';
import { useI18n } from '../hooks/useI18n';
import { useTimeline } from './useTimeline';

interface Props {
  player: Player;
  showValues: boolean;
}

/**
 * The array drawn as a binary heap: a[i]'s children are a[2i+1] and a[2i+2].
 * Live values and the same colour states as the bars (compare, swap, sorted…).
 * Cells already marked sorted have left the heap: their edge is dashed.
 */
export function HeapTreeView({ player, showValues }: Props) {
  const { t } = useI18n();
  const tl = useTimeline(player);
  if (!tl) return null;

  const n = tl.main.length;
  const states: BarState[] = [];
  computeBarStates(tl, 'main', states);

  const r = showValues ? 15 : 6;
  const slot = 2 * r + (showValues ? 10 : 4); // horizontal pitch on the bottom level
  const levelH = showValues ? 64 : 34;
  const bottom = n > 0 ? heapSlot(n - 1).level : 0;
  const width = Math.max(1, 2 ** bottom) * slot;
  const pos = (i: number) => {
    const { level, pos: p } = heapSlot(i);
    const span = width / 2 ** level;
    return { x: (p + 0.5) * span, y: r + 4 + level * levelH };
  };

  const edges = [];
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const a = pos(i);
    if (i > 0) {
      const b = pos(Math.floor((i - 1) / 2));
      const out = tl.sortedRefs[i] > 0;
      edges.push(<line key={`e${i}`} className={`heap-edge${out ? ' heap-edge--out' : ''}`} x1={b.x} y1={b.y} x2={a.x} y2={a.y} />);
    }
    nodes.push(
      <g key={i} className="heap-node" data-state={states[i] ?? 'idle'}>
        <circle cx={a.x} cy={a.y} r={r} />
        {showValues ? <text x={a.x} y={a.y}>{tl.main[i]}</text> : null}
      </g>,
    );
  }

  const height = r * 2 + 8 + bottom * levelH;
  return (
    <svg
      className="tree-view heap-tree"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={t('heapTreeLabel')}
    >
      <g>{edges}</g>
      <g>{nodes}</g>
    </svg>
  );
}
