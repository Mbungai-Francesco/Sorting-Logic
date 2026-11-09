import type { AlgorithmEntry } from '../core/ctx';
import { useI18n } from '../hooks/useI18n';

export function ComplexityCard({ entry }: { entry: AlgorithmEntry }) {
  const { t } = useI18n();
  const c = entry.complexity;
  const rows: [string, string][] = [
    [t('best'), c.best],
    [t('average'), c.average],
    [t('worst'), c.worst],
    [t('space'), c.space],
    [t('stable'), entry.kind === 'search' ? t('notApplicable') : c.stable ? t('yes') : t('no')],
  ];
  return (
    <section className="panel complexity">
      <h2 className="panel-title">{t('complexityTitle')}</h2>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k} className="kv">
            <dt>{k}</dt>
            <dd className="mono">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
