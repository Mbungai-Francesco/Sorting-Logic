import { memo, type Ref } from 'react';
import { barHeight } from './painter';

interface Props {
  count: number;
  label: string;
  /** Static values for when there is no recording to play (todo / error). */
  staticValues?: readonly number[];
  scaleMax?: number;
  showLabels: boolean;
  variant: 'main' | 'aux';
  ref?: Ref<HTMLDivElement>;
}

/**
 * One reused <div> per element. React renders this only when `count`
 * changes; during playback heights and `data-state` are written directly
 * to the DOM by Stage's painter.
 */
export const BarRow = memo(function BarRow({ count, label, staticValues, scaleMax = 100, showLabels, variant, ref }: Props) {
  const bars = [];
  for (let i = 0; i < count; i++) {
    const v = staticValues?.[i];
    bars.push(
      <div
        key={i}
        className="bar"
        data-state="idle"
        style={v === undefined ? undefined : { height: `${barHeight(v, scaleMax)}%` }}
      >
        {showLabels && v !== undefined ? <span>{v}</span> : null}
      </div>,
    );
  }
  return (
    <div
      ref={ref}
      className={`bar-row bar-row--${variant}`}
      data-labels={showLabels ? 'on' : 'off'}
      role="img"
      aria-label={label}
    >
      {bars}
    </div>
  );
});
