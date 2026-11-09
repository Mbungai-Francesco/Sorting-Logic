import type { AlgoKind, AlgorithmEntry } from '../core/ctx';
import { useI18n } from '../hooks/useI18n';

interface Props {
  algorithms: AlgorithmEntry[];
  selected: string;
  onSelect: (id: string) => void;
}

const GROUPS: { kind: AlgoKind; key: 'groupSort' | 'groupSearch' }[] = [
  { kind: 'sort', key: 'groupSort' },
  { kind: 'search', key: 'groupSearch' },
];

export function AlgorithmPicker({ algorithms, selected, onSelect }: Props) {
  const { t, locale } = useI18n();
  return (
    <nav className="picker" aria-label={t('pickerTitle')}>
      <h2 className="panel-title">{t('pickerTitle')}</h2>
      {GROUPS.map(({ kind, key }) => {
        const items = algorithms.filter((a) => a.kind === kind);
        if (items.length === 0) return null;
        return (
          <div key={kind} className="picker-group">
            <h3>{t(key)}</h3>
            <ul>
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="picker-item"
                    data-selected={a.id === selected}
                    data-implemented={a.implemented}
                    aria-current={a.id === selected ? 'true' : undefined}
                    onClick={() => onSelect(a.id)}
                  >
                    <span>{a.name[locale]}</span>
                    {a.implemented ? null : <span className="badge badge--todo">{t('notImplemented')}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
