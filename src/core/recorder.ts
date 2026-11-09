import type { AlgorithmEntry, Step } from '../types';
import { WorkingCtx } from './ctx';
import { buildLineMap } from './lineMap';
import { deriveStats, type StatsIndex } from './stats';

/** Hard cap: anything above this is almost certainly an infinite loop. */
export const MAX_STEPS = 2_000_000;

export interface Recording {
  algorithmId: string;
  frames: Step[];
  /** Main array before frame 0 (sorted first if the entry `requiresSorted`). */
  initial: number[];
  /** Main array after the last frame. */
  final: number[];
  /** Aux row before frame 0: all zeros, length = largest initAux(). */
  initialAux: number[];
  finalAux: number[];
  lineMap: Record<string, number>;
  stats: StatsIndex;
  /** Target value passed to search algorithms, if any. */
  target?: number;
}

export class RecordingError extends Error {
  readonly algorithmId: string;
  readonly stepIndex: number;

  constructor(algorithmId: string, stepIndex: number, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RecordingError';
    this.algorithmId = algorithmId;
    this.stepIndex = stepIndex;
  }
}

/**
 * Runs the algorithm's generator to completion and collects every step.
 * Never mutates `input`.
 */
export function record(entry: AlgorithmEntry, input: readonly number[], target?: number): Recording {
  const start = entry.requiresSorted ? input.slice().sort((a, b) => a - b) : input.slice();
  const ctx = new WorkingCtx(start);
  const frames: Step[] = [];

  let it: Generator<Step>;
  try {
    it = entry.run(ctx, target);
    for (let res = it.next(); !res.done; res = it.next()) {
      frames.push(ctx.consume(res.value));
      if (frames.length > MAX_STEPS) {
        throw new RecordingError(
          entry.id,
          frames.length,
          `"${entry.id}" exceeded ${MAX_STEPS.toLocaleString('en-US')} steps — ` +
            `probably an infinite loop (check your loop bounds and that indices move).`,
        );
      }
    }
    ctx.assertSettled();
  } catch (err) {
    if (err instanceof RecordingError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new RecordingError(entry.id, frames.length, msg, { cause: err });
  }

  const auxLen = ctx.auxCapacity;
  return {
    algorithmId: entry.id,
    frames,
    initial: start,
    final: ctx.main.slice(),
    initialAux: new Array<number>(auxLen).fill(0),
    finalAux: ctx.aux.slice(),
    lineMap: buildLineMap(entry.source),
    stats: deriveStats(frames),
    target,
  };
}
