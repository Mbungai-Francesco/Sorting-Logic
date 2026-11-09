import type { Step, Target } from '../types';
import { applyStep } from './patch';
import type { Recording } from './recorder';

/**
 * A cursor over a Recording. `cursor` = number of frames applied, in
 * [0, total]. The arrays are patched in place step by step using each step's
 * stored inverse; no snapshots are ever taken.
 *
 * Besides the values, the timeline tracks the "sticky" visual state that
 * outlives a single step (sorted cells, current range, pivot, probe, resolve)
 * with stacks/ref-counts so it can be undone in O(1) as well.
 */
export class Timeline {
  readonly rec: Recording;
  readonly main: number[];
  readonly aux: number[];
  cursor = 0;

  /** sortedRefs[i] > 0 ⇔ main[i] has been marked sorted. */
  readonly sortedRefs: Uint32Array;
  /** Frame indices of applied steps of each sticky kind (top = latest). */
  readonly rangeMain: number[] = [];
  readonly rangeAux: number[] = [];
  readonly pivots: number[] = [];
  readonly probes: number[] = [];
  readonly resolves: number[] = [];

  /** Indices whose value changed since the last takeDirty(). */
  private dirtyMain = new Set<number>();
  private dirtyAux = new Set<number>();
  private allDirty = true;

  constructor(rec: Recording) {
    this.rec = rec;
    this.main = rec.initial.slice();
    this.aux = rec.initialAux.slice();
    this.sortedRefs = new Uint32Array(rec.initial.length);
  }

  get total(): number {
    return this.rec.frames.length;
  }

  /** The step most recently applied (what the user is "looking at"). */
  get current(): Step | null {
    return this.cursor > 0 ? this.rec.frames[this.cursor - 1] : null;
  }

  get atEnd(): boolean {
    return this.cursor >= this.total;
  }

  forward(): boolean {
    if (this.cursor >= this.total) return false;
    const idx = this.cursor;
    const step = this.rec.frames[idx];
    const writes = applyStep(step, 1, this.main, this.aux);
    for (const w of writes) (w.target === 'main' ? this.dirtyMain : this.dirtyAux).add(w.index);
    switch (step.type) {
      case 'markSorted':
        for (const i of step.indices) this.sortedRefs[i]++;
        break;
      case 'range':
        (step.target === 'main' ? this.rangeMain : this.rangeAux).push(idx);
        break;
      case 'pivot':
        this.pivots.push(idx);
        break;
      case 'probe':
        this.probes.push(idx);
        break;
      case 'resolve':
        this.resolves.push(idx);
        break;
      default:
        break;
    }
    this.cursor = idx + 1;
    return true;
  }

  backward(): boolean {
    if (this.cursor <= 0) return false;
    const idx = this.cursor - 1;
    const step = this.rec.frames[idx];
    const writes = applyStep(step, -1, this.main, this.aux);
    for (const w of writes) (w.target === 'main' ? this.dirtyMain : this.dirtyAux).add(w.index);
    switch (step.type) {
      case 'markSorted':
        for (const i of step.indices) this.sortedRefs[i]--;
        break;
      case 'range':
        (step.target === 'main' ? this.rangeMain : this.rangeAux).pop();
        break;
      case 'pivot':
        this.pivots.pop();
        break;
      case 'probe':
        this.probes.pop();
        break;
      case 'resolve':
        this.resolves.pop();
        break;
      default:
        break;
    }
    this.cursor = idx;
    return true;
  }

  /** Back to frame 0 by restoring the initial arrays (O(n), not O(cursor)). */
  reset(): void {
    const { initial, initialAux } = this.rec;
    for (let i = 0; i < initial.length; i++) this.main[i] = initial[i];
    for (let i = 0; i < initialAux.length; i++) this.aux[i] = initialAux[i];
    this.sortedRefs.fill(0);
    this.rangeMain.length = 0;
    this.rangeAux.length = 0;
    this.pivots.length = 0;
    this.probes.length = 0;
    this.resolves.length = 0;
    this.cursor = 0;
    this.allDirty = true;
  }

  /**
   * Moves the cursor to `to`.
   *
   * Forward: apply steps one by one.
   * Backward, threshold rule: un-patching costs `distance` steps; resetting
   * and replaying from zero costs `to` steps (+ an O(n) array copy). So we
   * un-patch while `distance <= to` — i.e. when the target is in the second
   * half of the way back — and otherwise reset and replay. Both are linear
   * in steps, so this simply picks the cheaper path; a single step back is
   * always an un-patch.
   *
   * Returns the strategy used (handy for tests and debugging).
   */
  seek(to: number): 'none' | 'forward' | 'unpatch' | 'replay' {
    const target = Math.max(0, Math.min(Math.floor(to), this.total));
    if (target === this.cursor) return 'none';
    if (target > this.cursor) {
      while (this.cursor < target) this.forward();
      return 'forward';
    }
    const distance = this.cursor - target;
    if (distance <= target) {
      while (this.cursor > target) this.backward();
      return 'unpatch';
    }
    this.reset();
    while (this.cursor < target) this.forward();
    return 'replay';
  }

  /** Returns and clears the set of repaint-worthy indices (null = repaint all). */
  takeDirty(): { all: boolean; main: Set<number>; aux: Set<number> } {
    const out = { all: this.allDirty, main: this.dirtyMain, aux: this.dirtyAux };
    this.allDirty = false;
    this.dirtyMain = new Set();
    this.dirtyAux = new Set();
    return out;
  }

  markAllDirty(): void {
    this.allDirty = true;
  }

  latestRange(target: Target): Extract<Step, { type: 'range' }> | null {
    const stack = target === 'main' ? this.rangeMain : this.rangeAux;
    if (stack.length === 0) return null;
    return this.rec.frames[stack[stack.length - 1]] as Extract<Step, { type: 'range' }>;
  }

  latestProbe(): Extract<Step, { type: 'probe' }> | null {
    if (this.probes.length === 0) return null;
    return this.rec.frames[this.probes[this.probes.length - 1]] as Extract<Step, { type: 'probe' }>;
  }

  latestResolve(): Extract<Step, { type: 'resolve' }> | null {
    if (this.resolves.length === 0) return null;
    return this.rec.frames[this.resolves[this.resolves.length - 1]] as Extract<Step, { type: 'resolve' }>;
  }

  /** The current pivot, if it belongs to the current (latest) main range. */
  activePivot(): number | null {
    if (this.pivots.length === 0) return null;
    const p = this.pivots[this.pivots.length - 1];
    const r = this.rangeMain.length ? this.rangeMain[this.rangeMain.length - 1] : -1;
    if (p < r) return null;
    return (this.rec.frames[p] as Extract<Step, { type: 'pivot' }>).index;
  }
}

/** Visual state of one bar. Mirrors the `data-state` attribute values. */
export type BarState =
  | 'idle'
  | 'comparing'
  | 'swapping'
  | 'reading'
  | 'pivot'
  | 'sorted'
  | 'out-of-range'
  | 'probe-lo'
  | 'probe-mid'
  | 'probe-hi';

/**
 * Fills `out` with the state of every bar of `target`, by priority:
 * current step > pivot > probe markers > found/sorted > out-of-range > idle.
 * At the end of the recording only persistent states (sorted, found) remain.
 */
export function computeBarStates(tl: Timeline, target: Target, out: BarState[]): void {
  const len = target === 'main' ? tl.main.length : tl.aux.length;
  out.length = len;
  const done = tl.atEnd;

  // 1. background: out-of-range dimming
  let lo = 0;
  let hi = len - 1;
  if (!done) {
    const r = tl.latestRange(target);
    if (r) {
      lo = r.lo;
      hi = r.hi;
    }
    if (target === 'main') {
      const p = tl.latestProbe();
      if (p) {
        lo = Math.max(lo, p.lo);
        hi = Math.min(hi, p.hi);
      }
    }
  }
  for (let i = 0; i < len; i++) out[i] = i < lo || i > hi ? 'out-of-range' : 'idle';

  if (target === 'main') {
    // 2. sorted cells
    for (let i = 0; i < len; i++) if (tl.sortedRefs[i] > 0) out[i] = 'sorted';

    const res = tl.latestResolve();
    if (res && res.index !== null) out[res.index] = 'sorted';

    // 3. probe markers + pivot (hidden once finished)
    if (!done) {
      const p = tl.latestProbe();
      if (p && !res) {
        if (p.lo >= 0 && p.lo < len) out[p.lo] = 'probe-lo';
        if (p.hi >= 0 && p.hi < len) out[p.hi] = 'probe-hi';
        out[p.mid] = 'probe-mid';
      }
      const pivot = tl.activePivot();
      if (pivot !== null) out[pivot] = 'pivot';
    }
  }

  // 4. the current step
  const step = tl.current;
  if (!step) return;
  switch (step.type) {
    case 'compare':
      if (target === 'main') {
        out[step.indices[0]] = 'comparing';
        out[step.indices[1]] = 'comparing';
      }
      break;
    case 'swap':
      if (target === 'main') {
        out[step.indices[0]] = 'swapping';
        out[step.indices[1]] = 'swapping';
      }
      break;
    case 'overwrite':
      for (const w of step.writes) if (w.target === target) out[w.index] = 'swapping';
      break;
    case 'read':
      if (step.target === target) out[step.index] = 'reading';
      break;
    default:
      break;
  }
}
