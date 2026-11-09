/**
 * Marker comments: put `// @name` at the END of a source line and refer to it
 * with `line: 'name'` in ctx calls. Several markers may share a line:
 * `// @cmp @loop`. Line numbers are 1-based, matching the code panel.
 */
export const MARKER_COMMENT = /\/\/\s*(@[\w-]+(?:\s+@[\w-]+)*)\s*$/;

export interface MarkerLocation {
  name: string;
  line: number;
}

/** Every marker occurrence in source order (duplicates included). */
export function parseMarkers(source: string): MarkerLocation[] {
  const out: MarkerLocation[] = [];
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = MARKER_COMMENT.exec(lines[i]);
    if (!m) continue;
    for (const tok of m[1].split(/\s+/)) {
      out.push({ name: tok.slice(1), line: i + 1 });
    }
  }
  return out;
}

/** Marker name → 1-based line number. First occurrence wins. */
export function buildLineMap(source: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const { name, line } of parseMarkers(source)) {
    if (!(name in map)) map[name] = line;
  }
  return map;
}

/** Marker names defined more than once (a likely copy-paste mistake). */
export function duplicateMarkers(source: string): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const { name } of parseMarkers(source)) {
    if (seen.has(name)) dup.add(name);
    seen.add(name);
  }
  return [...dup];
}
