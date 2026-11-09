import { useLayoutEffect, useMemo, useRef } from 'react';
import type { AlgorithmEntry } from '../core/ctx';
import { isSortedAsc } from '../core/conformance';
import type { Player } from '../core/player';
import { computeBarStates, type BarState, type Timeline } from '../core/timeline';
import { useI18n } from '../hooks/useI18n';
import type { RecordingResult } from '../hooks/useRecording';
import { BarRow } from './BarRow';
import { paintPivotMarker, paintSearchOverlay, RowPainter } from './painter';
import { SearchOverlay } from './SearchOverlay';

interface Props {
  player: Player;
  result: RecordingResult;
  entry: AlgorithmEntry;
  input: readonly number[];
  caption: string;
}

/** Bars show their value as text below this size. */
const LABEL_THRESHOLD = 30;

export function Stage({ player, result, entry, input, caption }: Props) {
  const { t, locale } = useI18n();
  const mainRef = useRef<HTMLDivElement>(null);
  const auxRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pivotMarkerRef = useRef<HTMLDivElement>(null);

  const rec = result.recording;
  const values = rec ? rec.initial : input;
  const n = values.length;
  const auxN = rec ? rec.initialAux.length : entry.needsAux ? n : 0;
  const scaleMax = useMemo(() => values.reduce((m, v) => Math.max(m, v), 1), [values]);
  const showLabels = n <= LABEL_THRESHOLD;
  const isSearch = entry.kind === 'search';

  // Subscribe the imperative painter. Runs before App's player.load() layout
  // effect (children first), so the first frame of a new recording is painted
  // before the browser shows it.
  useLayoutEffect(() => {
    const mainPainter = new RowPainter();
    const auxPainter = new RowPainter();
    const states: BarState[] = [];
    let lastTl: Timeline | null = null;

    return player.onRender((tl) => {
      const full = tl !== lastTl;
      lastTl = tl;
      const dirty = tl.takeDirty();
      const all = full || dirty.all;

      if (mainRef.current) {
        computeBarStates(tl, 'main', states);
        mainPainter.paint(mainRef.current, tl.main, states, scaleMax, all ? null : dirty.main, showLabels);
      }
      if (auxRef.current) {
        computeBarStates(tl, 'aux', states);
        auxPainter.paint(auxRef.current, tl.aux, states, scaleMax, all ? null : dirty.aux, showLabels);
      }
      if (overlayRef.current) {
        paintSearchOverlay(overlayRef.current, tl.atEnd ? null : tl.latestProbe(), tl.main.length);
      }
      if (pivotMarkerRef.current) {
        paintPivotMarker(pivotMarkerRef.current, tl.atEnd ? null : tl.activePivotStep(), tl.main.length);
      }
    });
  }, [player, scaleMax, showLabels]);

  const notSorted = rec !== null && entry.kind === 'sort' && !isSortedAsc(rec.final);
  const live = rec !== null;
  // Remount the rows when switching between live and static mode, so no
  // painter-written attribute survives into React-managed bars.
  const rowKey = live ? 'live' : 'static';

  return (
    <section className="stage" aria-label={t('stageLabel')}>
      <div className="stage-rows">
        <div className="stage-main">
          <BarRow
            key={rowKey}
            ref={mainRef}
            count={n}
            label={t('mainRow')}
            staticValues={live ? undefined : values}
            scaleMax={scaleMax}
            showLabels={showLabels}
            variant="main"
          />
          {isSearch && live ? <SearchOverlay ref={overlayRef} /> : null}
          {live ? <div ref={pivotMarkerRef} className="pivot-marker" data-hidden="true" aria-hidden="true" /> : null}
        </div>
        <div className="aux-wrap" data-open={entry.needsAux ? 'true' : 'false'}>
          {entry.needsAux ? (
            <>
              <div className="aux-label">{t('auxRow')}</div>
              <BarRow
                key={rowKey}
                ref={auxRef}
                count={auxN}
                label={t('auxRow')}
                staticValues={live ? undefined : new Array<number>(auxN).fill(0)}
                scaleMax={scaleMax}
                showLabels={showLabels}
                variant="aux"
              />
            </>
          ) : null}
        </div>
      </div>

      {result.status === 'todo' ? (
        <div className="stage-message stage-message--todo" role="status">
          <span className="badge badge--todo">{t('notImplemented')}</span>
          <h2>{t('todoTitle', { name: entry.name[locale] })}</h2>
          <p>{t('todoBody', { file: `src/algorithms/${entry.id}.ts` })}</p>
        </div>
      ) : null}

      {result.status === 'error' ? (
        <div className="stage-message stage-message--error" role="alert">
          <h2>{t('errorTitle')}</h2>
          <p className="mono">{result.error.message}</p>
          <p className="muted">{t('errorAtStep', { n: result.error.stepIndex })}</p>
        </div>
      ) : null}

      <div className="stage-footer">
        <p className="caption">{live ? caption : ' '}</p>
        {notSorted ? <p className="warning">{t('notSortedWarning')}</p> : null}
        {live && entry.requiresSorted ? <p className="muted small">{t('sortedInput')}</p> : null}
      </div>
    </section>
  );
}
