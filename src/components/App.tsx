import { useCallback, useEffect, useMemo, useRef } from 'react';
import { algorithms, DEFAULT_ALGORITHM_ID, getAlgorithm } from '../algorithms';
import { generate } from '../core/generators';
import { mulberry32 } from '../core/prng';
import { statsAt } from '../core/stats';
import { I18nContext, useI18n, useLocaleState } from '../hooks/useI18n';
import { usePlayer } from '../hooks/usePlayer';
import { useRecording } from '../hooks/useRecording';
import { useUrlState } from '../hooks/useUrlState';
import { AlgorithmPicker } from './AlgorithmPicker';
import { CodePanel } from './CodePanel';
import { ComplexityCard } from './ComplexityCard';
import { captionAt, lineAt } from './describe';
import { InputToolbar } from './InputToolbar';
import { PlayerBar } from './PlayerBar';
import { Stage } from './Stage';
import { StatsPanel } from './StatsPanel';

export function App() {
  const i18n = useLocaleState();
  return (
    <I18nContext.Provider value={i18n}>
      <Shell />
    </I18nContext.Provider>
  );
}

function Shell() {
  const { t, locale, setLocale } = useI18n();
  const [url, update] = useUrlState();

  const entry = getAlgorithm(url.algo) ?? getAlgorithm(DEFAULT_ALGORITHM_ID)!;

  const input = useMemo(
    () => url.data ?? generate(url.preset, url.n, url.seed),
    [url.data, url.preset, url.n, url.seed],
  );

  // Search target when none is typed: a seeded pick from the array, so
  // shared links reproduce it without encoding it.
  const autoTarget = useMemo(() => {
    if (!entry.requiresTarget || input.length === 0) return undefined;
    const sorted = input.slice().sort((a, b) => a - b);
    return sorted[Math.floor(mulberry32(url.seed ^ 0x5bd1e995)() * sorted.length)];
  }, [entry.requiresTarget, input, url.seed]);
  const target = entry.requiresTarget ? (url.target ?? autoTarget) : undefined;

  const result = useRecording(entry, input, target);
  const rec = result.recording;
  const api = usePlayer(rec, url.speed);
  const { player, cursor } = api;

  // Player owns speed; mirror it into the URL.
  useEffect(() => {
    update({ speed: api.speed });
  }, [api.speed, update]);

  const running = useMemo(() => (rec ? statsAt(rec.stats, rec.frames, cursor) : null), [rec, cursor]);
  const line = useMemo(() => (rec ? lineAt(rec, cursor) : null), [rec, cursor]);
  const caption = rec ? captionAt(rec, cursor, player.timeline?.main ?? rec.initial, t) : '';

  const regenerate = useCallback(() => {
    update({ seed: Math.floor(Math.random() * 1_000_000), data: null, target: null });
  }, [update]);

  // Keyboard shortcuts. Read the latest callbacks through a ref so the
  // listener is attached once.
  const keys = useRef({ player, regenerate });
  useEffect(() => {
    keys.current = { player, regenerate };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName;
        const isRange = tag === 'INPUT' && (el as HTMLInputElement).type === 'range';
        if ((tag === 'INPUT' && !isRange) || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return;
        if (isRange && e.key !== ' ') return; // let sliders keep their arrow keys
      }
      const { player: p, regenerate: regen } = keys.current;
      const big = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case ' ':
          p.toggle();
          break;
        case 'ArrowLeft':
          p.step(-big);
          break;
        case 'ArrowRight':
          p.step(big);
          break;
        case 'r':
        case 'R':
          regen();
          break;
        case '0':
          p.reset();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>{t('appTitle')}</h1>
        <p className="shortcuts muted small">{t('shortcuts')}</p>
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
          title={t('langToggleTitle')}
          lang={locale === 'fr' ? 'en' : 'fr'}
        >
          {t('langToggle')}
        </button>
      </header>

      <aside className="app-left">
        <AlgorithmPicker
          algorithms={algorithms}
          selected={entry.id}
          onSelect={(id) => update({ algo: id, target: null })}
        />
      </aside>

      <main className="app-center">
        <InputToolbar
          key={url.data ? 'custom' : 'generated'}
          state={url}
          update={update}
          entry={entry}
          autoTarget={autoTarget}
          onRegenerate={regenerate}
        />
        <Stage player={player} result={result} entry={entry} input={input} caption={caption} />
        <PlayerBar api={api} disabled={result.status !== 'ok'} />
      </main>

      <aside className="app-right">
        <CodePanel source={entry.source} line={line} fileName={`${entry.id}.ts`} />
        <StatsPanel running={running} totals={rec?.stats.totals ?? null} />
        <ComplexityCard entry={entry} />
      </aside>
    </div>
  );
}
