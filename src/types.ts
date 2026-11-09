import type { Ctx } from './core/ctx';

export type { Ctx };

export type Target = 'main' | 'aux';

export interface Write {
  target: Target;
  index: number;
  from: number;
  to: number;
}

interface StepBase {
  /** marker name resolved to a source line for the code panel, e.g. 'cmp' */
  line?: string;
  /** short human caption in French, e.g. "7 > 3, on échange" */
  note?: string;
}

export type Step =
  | (StepBase & { type: 'compare';    indices: [number, number] })
  | (StepBase & { type: 'swap';       indices: [number, number]; writes: Write[] })
  | (StepBase & { type: 'overwrite';  writes: Write[] })
  | (StepBase & { type: 'insert';     from: number; to: number; writes: Write[] })
  | (StepBase & { type: 'read';       target: Target; index: number })
  | (StepBase & { type: 'pivot';      index: number; label?: string })
  | (StepBase & { type: 'range';      lo: number; hi: number; depth: number; target: Target })
  | (StepBase & { type: 'markSorted'; indices: number[] })
  | (StepBase & { type: 'probe';      lo: number; mid: number; hi: number })
  | (StepBase & { type: 'resolve';    index: number | null });

export type StepType = Step['type'];

export type AlgoKind = 'sort' | 'search';

export interface Complexity {
  best: string; average: string; worst: string; space: string; stable: boolean;
}

export interface AlgorithmEntry {
  id: string;
  name: { fr: string; en: string };
  kind: AlgoKind;
  implemented: boolean;
  needsAux: boolean;
  requiresSorted?: boolean;
  requiresTarget?: boolean;
  complexity: Complexity;
  source: string;                       // imported with ?raw
  run: (ctx: Ctx, target?: number) => Generator<Step>;
}
