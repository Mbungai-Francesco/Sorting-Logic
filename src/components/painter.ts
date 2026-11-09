/**
 * Imperative DOM painting for the stage. Nothing here goes through React:
 * we diff against a small cache and only touch attributes that changed.
 */
import type { BarState } from '../core/timeline';

export function barHeight(v: number, max: number): number {
  if (max <= 0 || v <= 0) return 0;
  return Math.max(1.5, Math.min(100, (v / max) * 100));
}

export class RowPainter {
  private heights: number[] = [];
  private states: string[] = [];
  private labels: string[] = [];

  /**
   * @param dirty indices whose value changed, or null to repaint everything
   */
  paint(
    container: HTMLElement,
    values: readonly number[],
    states: readonly BarState[],
    scaleMax: number,
    dirty: Iterable<number> | null,
    showLabels: boolean,
  ): void {
    const bars = container.children;
    const len = Math.min(bars.length, values.length);
    if (dirty === null || this.heights.length !== len) {
      this.heights = new Array<number>(len).fill(-1);
      this.states = new Array<string>(len).fill('');
      this.labels = new Array<string>(len).fill('');
      dirty = null;
    }

    const paintValue = (i: number) => {
      if (i < 0 || i >= len) return;
      const el = bars[i] as HTMLElement;
      const h = barHeight(values[i], scaleMax);
      if (h !== this.heights[i]) {
        el.style.height = `${h}%`;
        this.heights[i] = h;
      }
      if (showLabels) {
        const text = values[i] > 0 ? String(values[i]) : '';
        if (text !== this.labels[i]) {
          el.textContent = text;
          this.labels[i] = text;
        }
      }
    };

    if (dirty === null) for (let i = 0; i < len; i++) paintValue(i);
    else for (const i of dirty) paintValue(i);

    // States: n ≤ a few hundred, so a full diff pass is cheaper than tracking.
    for (let i = 0; i < len; i++) {
      const s = states[i] ?? 'idle';
      if (s !== this.states[i]) {
        (bars[i] as HTMLElement).dataset.state = s;
        this.states[i] = s;
      }
    }
  }
}

/** Places the pivot's label marker under its bar, or hides it. */
export function paintPivotMarker(
  el: HTMLElement,
  pivot: { index: number; label?: string } | null,
  n: number,
): void {
  if (!pivot || pivot.label === undefined || n === 0) {
    el.dataset.hidden = 'true';
    return;
  }
  el.dataset.hidden = 'false';
  el.style.left = `${((pivot.index + 0.5) / n) * 100}%`;
  if (el.textContent !== pivot.label) el.textContent = pivot.label;
}

export function paintSearchOverlay(
  el: HTMLElement,
  probe: { lo: number; mid: number; hi: number } | null,
  n: number,
): void {
  const [shadeL, shadeR, lo, mid, hi] = Array.from(el.children) as HTMLElement[];
  if (!probe || n === 0) {
    el.dataset.active = 'off';
    return;
  }
  el.dataset.active = 'on';
  const pct = (i: number) => `${((i + 0.5) / n) * 100}%`;
  shadeL.style.width = `${(probe.lo / n) * 100}%`;
  shadeR.style.width = `${(Math.max(0, n - 1 - probe.hi) / n) * 100}%`;
  lo.style.left = pct(probe.lo);
  mid.style.left = pct(probe.mid);
  hi.style.left = pct(probe.hi);
  lo.dataset.hidden = String(probe.lo === probe.mid);
  hi.dataset.hidden = String(probe.hi === probe.mid);
}
