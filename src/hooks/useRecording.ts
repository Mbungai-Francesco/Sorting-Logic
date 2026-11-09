import { useMemo } from 'react';
import type { AlgorithmEntry } from '../core/ctx';
import { record, RecordingError, type Recording } from '../core/recorder';

export type RecordingResult =
  | { status: 'ok'; recording: Recording; error: null }
  | { status: 'todo'; recording: null; error: null }
  | { status: 'error'; recording: null; error: RecordingError };

/**
 * Records eagerly whenever the algorithm, input or target changes.
 * Unimplemented entries are never run.
 */
export function useRecording(entry: AlgorithmEntry, input: number[], target?: number): RecordingResult {
  return useMemo<RecordingResult>(() => {
    if (!entry.implemented) return { status: 'todo', recording: null, error: null };
    try {
      return { status: 'ok', recording: record(entry, input, target), error: null };
    } catch (err) {
      const e =
        err instanceof RecordingError
          ? err
          : new RecordingError(entry.id, 0, err instanceof Error ? err.message : String(err), { cause: err });
      return { status: 'error', recording: null, error: e };
    }
  }, [entry, input, target]);
}
