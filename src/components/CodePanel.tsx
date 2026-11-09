import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { MARKER_COMMENT } from '../core/lineMap';
import { useI18n } from '../hooks/useI18n';

interface Props {
  source: string;
  /** 1-based line to highlight, or null. */
  line: number | null;
  fileName: string;
}

type TokKind = 'kw' | 'str' | 'num' | 'com' | 'marker' | 'plain';
interface Tok {
  kind: TokKind;
  text: string;
}

const KEYWORDS = new Set(
  'const let var function return if else for while do break continue yield import export from type interface new of in true false null undefined throw typeof as'.split(' '),
);
const TOKEN = /(\/\/.*$)|(\/\*)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

/** Tiny line-based TypeScript highlighter — enough for short algorithm files. */
function tokenize(source: string): Tok[][] {
  const lines = source.replace(/\s+$/, '').split(/\r?\n/);
  let inBlock = false;
  return lines.map((line) => {
    const toks: Tok[] = [];
    let pos = 0;
    const push = (kind: TokKind, text: string) => text && toks.push({ kind, text });

    while (pos < line.length) {
      if (inBlock) {
        const end = line.indexOf('*/', pos);
        if (end === -1) {
          push('com', line.slice(pos));
          pos = line.length;
        } else {
          push('com', line.slice(pos, end + 2));
          pos = end + 2;
          inBlock = false;
        }
        continue;
      }
      TOKEN.lastIndex = pos;
      const m = TOKEN.exec(line);
      if (!m) {
        push('plain', line.slice(pos));
        break;
      }
      push('plain', line.slice(pos, m.index));
      if (m[1]) {
        const marker = MARKER_COMMENT.exec(m[1]);
        push(marker ? 'marker' : 'com', m[1]);
      } else if (m[2]) {
        inBlock = true;
        push('com', '/*');
      } else if (m[3]) push('str', m[3]);
      else if (m[4]) push('num', m[4]);
      else if (m[5]) push(KEYWORDS.has(m[5]) ? 'kw' : 'plain', m[5]);
      pos = m.index + m[0].length;
    }
    return toks;
  });
}

export const CodePanel = memo(function CodePanel({ source, line, fileName }: Props) {
  const { t } = useI18n();
  const lines = useMemo(() => tokenize(source), [source]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the active line in view by scrolling the panel only (never the page).
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (!box || line === null) return;
    const el = box.querySelector<HTMLElement>(`[data-line="${line}"]`);
    if (!el) return;
    const top = el.offsetTop;
    if (top < box.scrollTop + 16 || top + el.offsetHeight > box.scrollTop + box.clientHeight - 16) {
      box.scrollTop = Math.max(0, top - box.clientHeight / 3);
    }
  }, [line]);

  return (
    <section className="panel code-panel">
      <h2 className="panel-title">
        {t('codeTitle')} <span className="muted mono small">{fileName}</span>
      </h2>
      <div className="code-scroll" ref={scrollRef}>
        <pre className="code">
          {lines.map((toks, i) => (
            <div key={i} className="code-line" data-line={i + 1} data-active={line === i + 1}>
              <span className="ln">{i + 1}</span>
              <code>
                {toks.length === 0
                  ? ' '
                  : toks.map((tk, k) =>
                      tk.kind === 'plain' ? tk.text : (
                        <span key={k} className={`tok-${tk.kind}`}>
                          {tk.text}
                        </span>
                      ),
                    )}
              </code>
            </div>
          ))}
        </pre>
      </div>
    </section>
  );
});
