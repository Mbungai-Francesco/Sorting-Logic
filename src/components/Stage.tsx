import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AlgorithmEntry } from '../core/ctx';
import { isSortedAsc } from '../core/conformance';
import type { Player } from '../core/player';
import { computeBarStates, type BarState, type Timeline } from '../core/timeline';
import { useI18n } from '../hooks/useI18n';
import type { RecordingResult } from '../hooks/useRecording';
import { BarRow } from './BarRow';
import { DcTreeView } from './DcTreeView';
import { HeapTreeView } from './HeapTreeView';
import { paintPivotMarker, paintSearchOverlay, RowPainter, splitGapPx } from './painter';
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
  const live = rec !== null;

  // Tree view on by default for algorithms that have one; the choice resets
  // when switching algorithm.
  const [treeChoice, setTreeChoice] = useState<{ id: string; on: boolean }>({ id: entry.id, on: true });
  const treeOn = treeChoice.id === entry.id ? treeChoice.on : true;
  const view = live && entry.view && treeOn ? entry.view : null;
  // The dc diagram replaces the bars; the heap tree sits above them.
  const showBars = view !== 'dcTree';

  // Subscribe the imperative painter. Runs before App's player.load() layout
  // effect (children first), so the first frame of a new recording is painted
  // before the browser shows it.
  useLayoutEffect(() => {
    const mainPainter = new RowPainter();
    const auxPainter = new RowPainter();
    const states: BarState[] = [];
    const depths: number[] = [];
    const gaps: number[] = [];
    let lastTl: Timeline | null = null;

    return player.onRender((tl) => {
      const full = tl !== lastTl;
      lastTl = tl;
      const dirty = tl.takeDirty();
      const all = full || dirty.all;

      tl.splitDepths(tl.main.length, depths);
      if (tl.atEnd) depths.fill(-1); // finished: one array again, even without join()
      gaps.length = depths.length;
      for (let i = 0; i < depths.length; i++) gaps[i] = depths[i] < 0 ? 0 : splitGapPx(depths[i], depths.length);

      if (mainRef.current) {
        computeBarStates(tl, 'main', states);
        mainPainter.paint(mainRef.current, tl.main, states, scaleMax, all ? null : dirty.main, showLabels, gaps);
      }
      if (auxRef.current) {
        computeBarStates(tl, 'aux', states);
        // Same gaps on aux so its columns stay aligned with main.
        auxPainter.paint(auxRef.current, tl.aux, states, scaleMax, all ? null : dirty.aux, showLabels, gaps);
      }
      if (overlayRef.current) {
        paintSearchOverlay(overlayRef.current, tl.atEnd ? null : tl.latestProbe(), tl.main.length);
      }
      if (pivotMarkerRef.current && mainRef.current) {
        paintPivotMarker(pivotMarkerRef.current, tl.atEnd ? null : tl.activePivotStep(), mainRef.current.children);
      }
    });
  }, [player, scaleMax, showLabels, showBars]);

  const notSorted = rec !== null && entry.kind === 'sort' && !isSortedAsc(rec.final);
  // Remount the rows when switching between live and static mode, so no
  // painter-written attribute survives into React-managed bars.
  const rowKey = live ? 'live' : 'static';

  return (
    <section className="stage" aria-label={t('stageLabel')}>
      {live && entry.view ? (
        <div className="view-toggle" role="group" aria-label={t('viewToggle')}>
          <button type="button" aria-pressed={treeOn} onClick={() => setTreeChoice({ id: entry.id, on: true })}>
            {t('viewTree')}
          </button>
          <button type="button" aria-pressed={!treeOn} onClick={() => setTreeChoice({ id: entry.id, on: false })}>
            {t('viewBars')}
          </button>
        </div>
      ) : null}
      <div className="stage-rows" data-view={view ?? 'bars'}>
        {view && rec ? (
          <div className="stage-tree">
            {view === 'dcTree' ? (
              <DcTreeView player={player} rec={rec} showValues={showLabels} scaleMax={scaleMax} />
            ) : (
              <HeapTreeView player={player} showValues={n <= 31} />
            )}
          </div>
        ) : null}
        {showBars ? (
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
        ) : null}
        {showBars ? (
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
        ) : null}
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
