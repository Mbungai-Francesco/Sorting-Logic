/**
 * The Ctx is the ONLY way an algorithm touches the array.
 *
 * Every mutating method writes to the working array AND returns a Step that
 * already carries its own inverse (`{ index, from, to }` per written cell).
 * The algorithm must `yield` every Step it gets back:
 *
 *     yield ctx.compare(i, j, 'cmp');      // @cmp
 *     if (ctx.lastCompare > 0) {           // a[i] > a[j]
 *       yield ctx.swap(i, j, 'swap');      // @swap
 *     }
 *
 * Branching convention: `compare()` returns the Step (so it can be yielded) and
 * stores `a[i] - a[j]` in `ctx.lastCompare`. Read it right after the yield:
 *   lastCompare > 0  ⇔  a[i] > a[j]
 *   lastCompare < 0  ⇔  a[i] < a[j]
 *   lastCompare === 0 ⇔ equal
 * For loop conditions that should NOT show up as a step, use `ctx.value(i)`.
 *
 * Misuse is caught loudly: calling a ctx method before yielding the previous
 * step, yielding something ctx did not produce, or using an out-of-range index
 * all throw a descriptive error during recording.
 */
import type { AlgoKind, AlgorithmEntry, Step, Target, Write } from '../types';

export type { AlgoKind, AlgorithmEntry, Step, Target, Write };

export interface Ctx {
  readonly size: number;

  /** Non-recording read. Use freely in loop conditions; emits no step. */
  value(i: number, target?: Target): number;

  /**
   * Records a comparison highlight between main[i] and main[j].
   * The difference a[i] - a[j] is stored in `lastCompare` for branching.
   */
  compare(i: number, j: number, line?: string): Step;
  /** Result of the last compare() call: a[i] - a[j]. */
  readonly lastCompare: number;

  swap(i: number, j: number, line?: string): Step;
  write(i: number, v: number, line?: string, target?: Target): Step;
  read(i: number, line?: string, target?: Target): Step;
  /**
   * Highlights main[i] as the pivot (or any "special" cell, e.g. the current max).
   * An optional `label` is drawn as a marker under the bar, like lo / mid / hi.
   * The highlight stays until the next pivot() or range() step.
   */
  pivot(i: number, line?: string, label?: string): Step;
  range(lo: number, hi: number, depth: number, line?: string, target?: Target): Step;
  markSorted(indices: number[], line?: string): Step;
  probe(lo: number, mid: number, hi: number, line?: string): Step;
  resolve(index: number | null, line?: string): Step;

  /** Attach a French caption to the next step produced. */
  note(text: string): void;

  /**
   * Allocate/resize the auxiliary row (merge sort).
   * New cells start at 0 (drawn empty). Resizing never clears existing
   * cells — clearing would be a mutation without an inverse.
   */
  initAux(length: number): void;
}

/** Error raised for any misuse of the Ctx API. */
export class CtxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CtxError';
  }
}

/**
 * Concrete Ctx used by the recorder. Not exported to algorithms as a class:
 * algorithms only ever see the `Ctx` interface.
 */
export class WorkingCtx implements Ctx {
  readonly main: number[];
  /** Backing store for aux. Only grows, so every write has a valid `from`. */
  readonly aux: number[] = [];
  private auxLength = 0;
  private pendingNote: string | undefined;
  private outstanding: Step | null = null;
  private outstandingMethod = '';
  private _lastCompare = 0;

  constructor(input: readonly number[]) {
    this.main = input.slice();
  }

  get size(): number {
    return this.main.length;
  }

  get lastCompare(): number {
    return this._lastCompare;
  }

  /** Largest aux length ever requested (the aux row's display size). */
  get auxCapacity(): number {
    return this.aux.length;
  }

  // ---- recorder protocol -------------------------------------------------

  /** Called by the recorder for every yielded value. */
  consume(value: unknown): Step {
    if (this.outstanding === null || value !== this.outstanding) {
      throw new CtxError(
        'An algorithm yielded a value that was not returned by a ctx method. ' +
          'Always write `yield ctx.compare(...)`, `yield ctx.swap(...)`, etc.',
      );
    }
    const step = this.outstanding;
    this.outstanding = null;
    return step;
  }

  /** Called by the recorder when the generator finishes. */
  assertSettled(): void {
    if (this.outstanding !== null) {
      throw new CtxError(
        `ctx.${this.outstandingMethod}() was called but its step was never yielded. ` +
          `Write \`yield ctx.${this.outstandingMethod}(...)\`.`,
      );
    }
  }

  // ---- public API --------------------------------------------------------

  value(i: number, target: Target = 'main'): number {
    this.check('value', i, target);
    return this.arr(target)[i];
  }

  compare(i: number, j: number, line?: string): Step {
    this.check('compare', i);
    this.check('compare', j);
    this._lastCompare = this.main[i] - this.main[j];
    return this.emit('compare', { type: 'compare', indices: [i, j], line });
  }

  swap(i: number, j: number, line?: string): Step {
    this.check('swap', i);
    this.check('swap', j);
    const a = this.main[i];
    const b = this.main[j];
    const writes: Write[] =
      i === j
        ? []
        : [
            { target: 'main', index: i, from: a, to: b },
            { target: 'main', index: j, from: b, to: a },
          ];
    this.main[i] = b;
    this.main[j] = a;
    return this.emit('swap', { type: 'swap', indices: [i, j], writes, line });
  }

  write(i: number, v: number, line?: string, target: Target = 'main'): Step {
    this.check('write', i, target);
    if (!Number.isFinite(v)) {
      throw new CtxError(`ctx.write(${i}, ${v}): value must be a finite number.`);
    }
    const arr = this.arr(target);
    const w: Write = { target, index: i, from: arr[i], to: v };
    arr[i] = v;
    return this.emit('write', { type: 'overwrite', writes: [w], line });
  }

  read(i: number, line?: string, target: Target = 'main'): Step {
    this.check('read', i, target);
    return this.emit('read', { type: 'read', target, index: i, line });
  }

  pivot(i: number, line?: string, label?: string): Step {
    this.check('pivot', i);
    const step: Step = { type: 'pivot', index: i, line };
    if (label !== undefined && label !== '') step.label = label;
    return this.emit('pivot', step);
  }

  range(lo: number, hi: number, depth: number, line?: string, target: Target = 'main'): Step {
    const len = target === 'main' ? this.main.length : this.auxLength;
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || hi >= len || lo > hi + 1) {
      throw new CtxError(
        `ctx.range(${lo}, ${hi}): expected 0 ≤ lo ≤ hi + 1 and hi < ${len} (${target}).`,
      );
    }
    if (!Number.isInteger(depth) || depth < 0) {
      throw new CtxError(`ctx.range: depth must be a non-negative integer, got ${depth}.`);
    }
    return this.emit('range', { type: 'range', lo, hi, depth, target, line });
  }

  markSorted(indices: number[], line?: string): Step {
    for (const i of indices) this.check('markSorted', i);
    return this.emit('markSorted', { type: 'markSorted', indices: indices.slice(), line });
  }

  probe(lo: number, mid: number, hi: number, line?: string): Step {
    this.check('probe', mid);
    if (lo > mid || mid > hi) {
      throw new CtxError(`ctx.probe(${lo}, ${mid}, ${hi}): expected lo ≤ mid ≤ hi.`);
    }
    return this.emit('probe', { type: 'probe', lo, mid, hi, line });
  }

  resolve(index: number | null, line?: string): Step {
    if (index !== null) this.check('resolve', index);
    return this.emit('resolve', { type: 'resolve', index, line });
  }

  note(text: string): void {
    this.pendingNote = text;
  }

  initAux(length: number): void {
    if (!Number.isInteger(length) || length < 0) {
      throw new CtxError(`ctx.initAux(${length}): length must be a non-negative integer.`);
    }
    while (this.aux.length < length) this.aux.push(0);
    this.auxLength = length;
  }

  // ---- internals ---------------------------------------------------------

  private arr(target: Target): number[] {
    return target === 'main' ? this.main : this.aux;
  }

  private check(method: string, i: number, target: Target = 'main'): void {
    const len = target === 'main' ? this.main.length : this.auxLength;
    if (!Number.isInteger(i) || i < 0 || i >= len) {
      const hint = target === 'aux' && this.auxLength === 0 ? ' Did you call ctx.initAux(n)?' : '';
      throw new CtxError(
        `ctx.${method}(): index ${i} is out of bounds for ${target} (length ${len}).${hint}`,
      );
    }
  }

  private emit(method: string, step: Step): Step {
    if (this.outstanding !== null) {
      throw new CtxError(
        `ctx.${method}() was called before the step from ctx.${this.outstandingMethod}() was yielded. ` +
          `Every ctx call that returns a step must be yielded immediately: ` +
          `\`yield ctx.${this.outstandingMethod}(...)\`.`,
      );
    }
    if (step.line === undefined) delete step.line;
    if (this.pendingNote !== undefined) {
      step.note = this.pendingNote;
      this.pendingNote = undefined;
    }
    this.outstanding = step;
    this.outstandingMethod = method;
    return step;
  }
}
