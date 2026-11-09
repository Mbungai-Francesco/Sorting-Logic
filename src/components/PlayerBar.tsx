import type { PlayerApi } from '../hooks/usePlayer';
import { useI18n } from '../hooks/useI18n';
import { MAX_SPEED, MIN_SPEED } from '../core/player';

/** The speed slider is logarithmic: 0..SLIDER_MAX ↦ MIN_SPEED..MAX_SPEED. */
const SLIDER_MAX = 1000;
const LOG_RANGE = Math.log(MAX_SPEED / MIN_SPEED);
const toSlider = (speed: number) => Math.round((Math.log(speed / MIN_SPEED) / LOG_RANGE) * SLIDER_MAX);
const fromSlider = (x: number) => Math.round(MIN_SPEED * Math.exp((x / SLIDER_MAX) * LOG_RANGE));

interface Props {
  api: PlayerApi;
  disabled: boolean;
}

export function PlayerBar({ api, disabled }: Props) {
  const { t } = useI18n();
  const { player, cursor, total, playing, speed } = api;
  const off = disabled || total === 0;

  return (
    <div className="player-bar" role="group" aria-label={t('timeline')}>
      <div className="player-buttons">
        <button type="button" className="icon-btn" onClick={() => player.reset()} disabled={off} title={t('reset')} aria-label={t('reset')}>
          <Icon d="M6 5v14M19 5 9 12l10 7z" />
        </button>
        <button type="button" className="icon-btn" onClick={() => player.step(-1)} disabled={off || cursor === 0} title={t('stepBack')} aria-label={t('stepBack')}>
          <Icon d="M17 5 7 12l10 7zM6 5v14" />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--primary"
          onClick={() => player.toggle()}
          disabled={off}
          title={playing ? t('pause') : t('play')}
          aria-label={playing ? t('pause') : t('play')}
        >
          {playing ? <Icon d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <Icon d="M7 5v14l12-7z" />}
        </button>
        <button type="button" className="icon-btn" onClick={() => player.step(1)} disabled={off || cursor >= total} title={t('stepForward')} aria-label={t('stepForward')}>
          <Icon d="M7 5l10 7-10 7zM18 5v14" />
        </button>
      </div>

      <input
        className="scrub"
        type="range"
        min={0}
        max={Math.max(total, 1)}
        step={1}
        value={cursor}
        disabled={off}
        onChange={(e) => player.seek(Number(e.target.value))}
        aria-label={t('timeline')}
      />
      <output className="readout mono" aria-live="off">
        {cursor.toLocaleString()} / {total.toLocaleString()}
      </output>

      <label className="speed">
        <span>{t('speed')}</span>
        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          value={toSlider(speed)}
          onChange={(e) => player.setSpeed(fromSlider(Number(e.target.value)))}
          aria-valuetext={`${speed} ${t('stepsPerSec')}`}
        />
        <span className="mono speed-value">
          {speed} {t('stepsPerSec')}
        </span>
      </label>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={d} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
