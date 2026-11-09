import type { Step } from '../core/ctx';
import type { Recording } from '../core/recorder';
import type { I18n } from '../hooks/useI18n';

/** Caption for the step at `cursor` (the step just applied). */
export function captionAt(rec: Recording, cursor: number, values: readonly number[], t: I18n['t']): string {
  if (cursor <= 0) return t('capStart');
  const step = rec.frames[cursor - 1];
  if (step.note) return step.note;
  const text = describeStep(step, values, t);
  return cursor >= rec.frames.length ? `${text} — ${t('capDone', { n: rec.frames.length })}` : text;
}

/** Fallback caption built from the step itself (used when no ctx.note() was given). */
export function describeStep(step: Step, values: readonly number[], t: I18n['t']): string {
  const arr = (target: 'main' | 'aux') => t(target === 'main' ? 'arrMain' : 'arrAux');
  switch (step.type) {
    case 'compare': {
      const [i, j] = step.indices;
      return t('capCompare', { i, j, a: values[i] ?? '?', b: values[j] ?? '?' });
    }
    case 'swap':
      return t('capSwap', { i: step.indices[0], j: step.indices[1] });
    case 'overwrite':
      if (step.writes.length === 1) {
        const w = step.writes[0];
        return t('capWrite', { v: w.to, arr: arr(w.target), i: w.index });
      }
      return t('capWriteMany', { n: step.writes.length });
    case 'read':
      return t('capRead', { arr: arr(step.target), i: step.index });
    case 'pivot':
      return step.label !== undefined
        ? t('capPivotLabel', { i: step.index, label: step.label })
        : t('capPivot', { i: step.index });
    case 'range':
      return t('capRange', { lo: step.lo, hi: step.hi, d: step.depth });
    case 'markSorted':
      return t('capSorted', { n: step.indices.length });
    case 'probe':
      return t('capProbe', { lo: step.lo, mid: step.mid, hi: step.hi });
    case 'resolve':
      return step.index === null ? t('capNotFound') : t('capFound', { i: step.index });
  }
}

/**
 * Source line of the step at `cursor`. Steps without a marker inherit the most
 * recent marker (looking back a bounded number of frames).
 */
export function lineAt(rec: Recording, cursor: number): number | null {
  for (let i = cursor - 1, k = 0; i >= 0 && k < 256; i--, k++) {
    const name = rec.frames[i].line;
    if (name !== undefined) return rec.lineMap[name] ?? null;
  }
  return null;
}
