/**
 * Pure, framework-free checks for a single recording. The vitest file
 * (__tests__/conformance.test.ts) loops these over presets, sizes and seeds.
 */
import type { AlgorithmEntry } from '../types';
import { duplicateMarkers } from './lineMap';
import { applyStep } from './patch';
import { MAX_STEPS, type Recording } from './recorder';

export function isSortedAsc(a: readonly number[]): boolean {
  for (let i = 1; i < a.length; i++) if (a[i - 1] > a[i]) return false;
  return true;
}

function sameArray(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Returns a list of human-readable failures; empty means conformant. */
export function checkRecording(
  entry: AlgorithmEntry,
  input: readonly number[],
  rec: Recording,
  target?: number,
): string[] {
  const fails: string[] = [];

  // 1. result
  if (entry.kind === 'sort') {
    const expected = input.slice().sort((x, y) => x - y);
    if (!sameArray(rec.final, expected)) {
      fails.push(`final array is not the sorted input:\n  got      [${rec.final.join(', ')}]\n  expected [${expected.join(', ')}]`);
    }
  } else {
    const resolves = rec.frames.filter((s) => s.type === 'resolve');
    const last = resolves[resolves.length - 1];
    if (!last || last.type !== 'resolve') {
      fails.push('search emitted no resolve() step');
    } else {
      const present = rec.initial.includes(target as number);
      if (last.index === null) {
        if (present) fails.push(`resolve(null) but ${target} is in the array`);
      } else if (rec.initial[last.index] !== target) {
        fails.push(`resolve(${last.index}) but a[${last.index}] = ${rec.initial[last.index]}, target = ${target}`);
      }
    }
  }

  // 2. forward replay from initial reproduces final
  const main = rec.initial.slice();
  const aux = rec.initialAux.slice();
  for (const s of rec.frames) applyStep(s, 1, main, aux);
  if (!sameArray(main, rec.final)) fails.push('replaying all frames forward from `initial` does not give `final`');
  if (!sameArray(aux, rec.finalAux)) fails.push('replaying forward does not reproduce the final aux row');

  // 3. backward replay from final reproduces initial
  for (let i = rec.frames.length - 1; i >= 0; i--) applyStep(rec.frames[i], -1, main, aux);
  if (!sameArray(main, rec.initial)) fails.push('replaying all frames backward from `final` does not give `initial` (wrong inverse)');
  if (!aux.every((v) => v === 0)) fails.push('replaying backward does not restore an empty aux row');

  // 4. markers
  const missing = new Set<string>();
  for (const s of rec.frames) if (s.line !== undefined && !(s.line in rec.lineMap)) missing.add(s.line);
  if (missing.size) fails.push(`line markers used but not defined with // @name: ${[...missing].join(', ')}`);
  const dups = duplicateMarkers(entry.source);
  if (dups.length) fails.push(`markers defined more than once: ${dups.join(', ')}`);

  // 5. cap
  if (rec.frames.length > MAX_STEPS) fails.push(`step count ${rec.frames.length} exceeds cap ${MAX_STEPS}`);

  return fails;
}
