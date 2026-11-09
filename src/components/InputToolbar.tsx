import { useState } from 'react';
import type { AlgorithmEntry } from '../core/ctx';
import { PRESET_IDS, type PresetId } from '../core/generators';
import { useI18n } from '../hooks/useI18n';
import { MAX_CUSTOM, MAX_N, MIN_N, parseNumberList, type UrlState } from '../hooks/useUrlState';
import type { StringKey } from '../i18n/strings';

interface Props {
  state: UrlState;
  update: (patch: Partial<UrlState>) => void;
  entry: AlgorithmEntry;
  autoTarget: number | undefined;
  onRegenerate: () => void;
}

const PRESET_LABEL: Record<PresetId, StringKey> = {
  random: 'presetRandom',
  nearlySorted: 'presetNearlySorted',
  reversed: 'presetReversed',
  fewUnique: 'presetFewUnique',
  allEqual: 'presetAllEqual',
  sorted: 'presetSorted',
};

export function InputToolbar({ state, update, entry, autoTarget, onRegenerate }: Props) {
  const { t } = useI18n();
  const custom = state.data !== null;
  const [draft, setDraft] = useState(() => state.data?.join(', ') ?? '');
  const [invalid, setInvalid] = useState(false);

  const applyCustom = () => {
    const parsed = parseNumberList(draft);
    setInvalid(parsed === null);
    if (parsed) update({ data: parsed, target: null });
  };

  return (
    <div className="toolbar">
      <label className="field field--size" data-disabled={custom}>
        <span>
          {t('size')} <b className="mono">{custom ? state.data!.length : state.n}</b>
        </span>
        <input
          type="range"
          min={MIN_N}
          max={MAX_N}
          value={state.n}
          disabled={custom}
          onChange={(e) => update({ n: Number(e.target.value) })}
        />
      </label>

      <label className="field">
        <span>{t('preset')}</span>
        <select value={state.preset} disabled={custom} onChange={(e) => update({ preset: e.target.value as PresetId })}>
          {PRESET_IDS.map((p) => (
            <option key={p} value={p}>
              {t(PRESET_LABEL[p])}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--seed">
        <span>{t('seed')}</span>
        <CommitInput
          value={String(state.seed)}
          disabled={custom}
          inputMode="numeric"
          onCommit={(v) => {
            const n = Number(v);
            if (v.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= 0xffffffff) update({ seed: n });
            else return false;
          }}
        />
      </label>

      <button type="button" className="btn" onClick={onRegenerate} title={t('regenerateTitle')}>
        {t('regenerate')}
      </button>

      <div className="field field--custom">
        <span>{custom ? t('customActive', { n: state.data!.length }) : t('customArray')}</span>
        <div className="inline">
          <input
            type="text"
            value={draft}
            placeholder={t('customPlaceholder')}
            aria-invalid={invalid}
            onChange={(e) => {
              setDraft(e.target.value);
              setInvalid(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyCustom();
            }}
          />
          <button type="button" className="btn btn--small" onClick={applyCustom}>
            {t('customApply')}
          </button>
          {custom ? (
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => {
                setDraft('');
                setInvalid(false);
                update({ data: null, target: null });
              }}
            >
              {t('customClear')}
            </button>
          ) : null}
        </div>
        {invalid ? <small className="error-text">{t('customInvalid', { max: MAX_CUSTOM })}</small> : null}
      </div>

      {entry.requiresTarget ? (
        <label className="field field--target">
          <span>{t('target')}</span>
          <CommitInput
            value={state.target === null ? '' : String(state.target)}
            placeholder={autoTarget === undefined ? '' : t('targetAuto', { v: autoTarget })}
            inputMode="decimal"
            onCommit={(v) => {
              if (v.trim() === '') return void update({ target: null });
              const n = Number(v);
              if (!Number.isFinite(n)) return false;
              update({ target: n });
            }}
          />
        </label>
      ) : null}
    </div>
  );
}

interface CommitInputProps {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  inputMode?: 'numeric' | 'decimal';
  /** Return false to reject (the field reverts). */
  onCommit: (v: string) => boolean | void;
}

/** Text field that commits on Enter / blur, so typing doesn't thrash the recording. */
function CommitInput({ value, placeholder, disabled, inputMode, onCommit }: CommitInputProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    onCommit(draft);
    setDraft(null);
  };
  return (
    <input
      type="text"
      value={draft ?? value}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}
