import { describe, expect, it } from 'vitest';
import { algorithms } from '../../algorithms';
import { checkRecording } from '../conformance';
import { generate, PRESET_IDS, type PresetId } from '../generators';
import { MAX_STEPS, record, RecordingError } from '../recorder';
import { Timeline } from '../timeline';
import type { AlgorithmEntry, Ctx, Step } from '../../types';

export const SIZES = [1, 2, 3, 8, 31, 100];
export const SEEDS = [1, 42, 1337];

/**
 * Registers the full conformance suite for one algorithm.
 * Run it for a single algorithm with:  npx vitest run conformance -t insertion
 */
export function runConformance(entry: AlgorithmEntry, sizes = SIZES, seeds = SEEDS): void {
  describe(`${entry.id} (${entry.name.fr})`, () => {
    for (const preset of PRESET_IDS) {
      for (const n of sizes) {
        for (const seed of seeds) {
          for (const target of targetsFor(entry, preset, n, seed)) {
            const label = `${preset} n=${n} seed=${seed}` + (target === undefined ? '' : ` target=${target}`);
            it(label, () => {
              const input = generate(preset, n, seed);
              const copy = input.slice();
              const rec = record(entry, input, target);
              expect(input, 'record() must not mutate its input').toEqual(copy);
              expect(checkRecording(entry, input, rec, target)).toEqual([]);
            });
          }
        }
      }
    }
  });
}

/** Searches get a few present targets and two absent ones. */
function targetsFor(entry: AlgorithmEntry, preset: PresetId, n: number, seed: number): (number | undefined)[] {
  if (!entry.requiresTarget) return [undefined];
  const sorted = generate(preset, n, seed).sort((a, b) => a - b);
  const present = [sorted[0], sorted[Math.floor(n / 2)], sorted[n - 1]];
  return [...new Set(present), 0, 101];
}

for (const entry of algorithms) {
  if (entry.implemented) runConformance(entry);
  else it.todo(`${entry.id} — à implémenter`);
}

describe('recorder guards', () => {
  const base = algorithms[0];
  const make = (run: (ctx: Ctx) => Generator<Step>): AlgorithmEntry => ({ ...base, id: 'test', source: '', run });

  it('stops infinite loops at the step cap with a clear error', () => {
    const entry = make(function* (ctx) {
      for (;;) yield ctx.compare(0, 1);
    });
    expect(() => record(entry, [2, 1])).toThrow(RecordingError);
    expect(() => record(entry, [2, 1])).toThrow(/exceeded 2,000,000 steps/);
    expect(MAX_STEPS).toBe(2_000_000);
  });

  it('rejects a ctx step that was never yielded', () => {
    const entry = make(function* (ctx) {
      ctx.swap(0, 1);
      yield ctx.compare(0, 1);
    });
    expect(() => record(entry, [2, 1])).toThrow(/before the step from ctx\.swap\(\) was yielded/);
  });

  it('rejects yielding something ctx did not produce', () => {
    const entry = make(function* () {
      yield { type: 'compare', indices: [0, 1] } as Step;
    });
    expect(() => record(entry, [2, 1])).toThrow(/not returned by a ctx method/);
  });

  it('rejects out-of-range indices', () => {
    const entry = make(function* (ctx) {
      yield ctx.swap(0, 5);
    });
    expect(() => record(entry, [2, 1])).toThrow(/out of bounds/);
  });

  it('surfaces stubs as "Not implemented"', () => {
    for (const e of algorithms.filter((a) => !a.implemented)) {
      expect(() => record(e, [3, 1, 2], 1)).toThrow(/Not implemented/);
    }
  });

  it('carries a pivot label and clears the pivot on the next range', () => {
    const entry = make(function* (ctx) {
      yield ctx.pivot(1, undefined, 'max');
      yield ctx.pivot(0);
      yield ctx.range(0, 0, 0);
    });
    const rec = record(entry, [2, 1, 3]);
    expect(rec.frames[0]).toMatchObject({ type: 'pivot', index: 1, label: 'max' });
    expect('label' in rec.frames[1]).toBe(false);

    const tl = new Timeline(rec);
    tl.forward();
    expect(tl.activePivotStep()).toMatchObject({ index: 1, label: 'max' });
    tl.forward();
    expect(tl.activePivotStep()?.label).toBeUndefined();
    tl.forward();
    expect(tl.activePivotStep()).toBeNull();
    tl.backward();
    expect(tl.activePivot()).toBe(0);
  });

  it('insert() moves one value and shifts the cells in between, both ways', () => {
    const entry = make(function* (ctx) {
      yield ctx.insert(3, 0); // [1,2,3,4,5] → [4,1,2,3,5]  (shift right)
      yield ctx.insert(0, 4); // [4,1,2,3,5] → [1,2,3,5,4]  (shift left)
      yield ctx.insert(2, 2); // no-op
    });
    const rec = record(entry, [1, 2, 3, 4, 5]);
    expect(rec.final).toEqual([1, 2, 3, 5, 4]);
    expect(rec.frames[0]).toMatchObject({ type: 'insert', from: 3, to: 0 });
    expect((rec.frames[0] as Extract<Step, { type: 'insert' }>).writes).toHaveLength(4);
    expect((rec.frames[2] as Extract<Step, { type: 'insert' }>).writes).toHaveLength(0);

    const tl = new Timeline(rec);
    tl.forward();
    expect(tl.main).toEqual([4, 1, 2, 3, 5]);
    tl.forward();
    expect(tl.main).toEqual([1, 2, 3, 5, 4]);
    tl.backward();
    tl.backward();
    expect(tl.main).toEqual([1, 2, 3, 4, 5]);
    expect(rec.stats.totals.writes).toBe(9);
  });

  it('split() / join() open and close gaps, reversibly', () => {
    const entry = make(function* (ctx) {
      yield ctx.split(2, 0); // [a b | c d]
      yield ctx.split(1, 1); // [a | b | c d]
      yield ctx.join(1); //     [a b | c d]
      yield ctx.join(2); //     [a b c d]
    });
    const rec = record(entry, [4, 3, 2, 1]);
    const tl = new Timeline(rec);
    const d: number[] = [];
    const gapsAt = (c: number) => {
      tl.seek(c);
      tl.splitDepths(4, d);
      return d.slice();
    };
    expect(gapsAt(1)).toEqual([-1, -1, 0, -1]);
    expect(gapsAt(2)).toEqual([-1, 1, 0, -1]);
    expect(gapsAt(3)).toEqual([-1, -1, 0, -1]);
    expect(gapsAt(4)).toEqual([-1, -1, -1, -1]);
    // stepping back reopens the joined gaps
    expect(gapsAt(3)).toEqual([-1, -1, 0, -1]);
    expect(gapsAt(2)).toEqual([-1, 1, 0, -1]);
    expect(gapsAt(0)).toEqual([-1, -1, -1, -1]);
  });

  it('rejects join() without a split and out-of-range splits', () => {
    expect(() => record(make(function* (ctx) { yield ctx.join(1); }), [2, 1])).toThrow(/no open split/);
    expect(() => record(make(function* (ctx) { yield ctx.split(0, 0); }), [2, 1])).toThrow(/1 ≤ at ≤ 1/);
    expect(() => record(make(function* (ctx) { yield ctx.split(2, 0); }), [2, 1])).toThrow(/1 ≤ at ≤ 1/);
  });

  it('merge sort closes every gap it opens', () => {
    const merge = algorithms.find((a) => a.id === 'merge')!;
    const rec = record(merge, [5, 2, 8, 1, 9, 3, 7]);
    const tl = new Timeline(rec);
    tl.seek(rec.frames.length);
    expect(tl.splits.size).toBe(0);
    const splits = rec.frames.filter((s) => s.type === 'split').length;
    expect(splits).toBe(6); // n - 1 splits for n = 7
  });

  it('records aux writes with working inverses', () => {
    const entry = make(function* (ctx) {
      ctx.initAux(ctx.size);
      for (let i = 0; i < ctx.size; i++) yield ctx.write(i, ctx.value(i), undefined, 'aux');
      for (let i = 0; i < ctx.size; i++) yield ctx.write(i, ctx.value(ctx.size - 1 - i, 'aux'));
    });
    const input = [5, 1, 4];
    const rec = record(entry, input);
    expect(rec.final).toEqual([4, 1, 5]);
    expect(rec.finalAux).toEqual([5, 1, 4]);
    expect(rec.initialAux).toEqual([0, 0, 0]);
  });
});
