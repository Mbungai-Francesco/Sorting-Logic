import type { Counters } from '../core/stats';
import { useI18n } from '../hooks/useI18n';
import type { StringKey } from '../i18n/strings';

interface Props {
  running: Counters | null;
  totals: Counters | null;
}

const ROWS: { key: keyof Counters; label: StringKey }[] = [
  { key: 'comparisons', label: 'comparisons' },
  { key: 'swaps', label: 'swaps' },
  { key: 'writes', label: 'writes' },
  { key: 'reads', label: 'reads' },
  { key: 'maxDepth', label: 'maxDepth' },
];

export function StatsPanel({ running, totals }: Props) {
  const { t } = useI18n();
  const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toLocaleString());
  return (
    <section className="panel stats">
      <h2 className="panel-title">{t('statsTitle')}</h2>
      <table>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">{t('statsNow')}</th>
            <th scope="col">{t('statsTotal')}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(({ key, label }) => {
            const now = running?.[key];
            const tot = totals?.[key];
            const pct = now !== undefined && tot ? Math.min(100, (now / tot) * 100) : 0;
            return (
              <tr key={key}>
                <th scope="row">{t(label)}</th>
                <td className="mono">
                  {fmt(now)}
                  <span className="meter" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                </td>
                <td className="mono muted">{fmt(tot)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
