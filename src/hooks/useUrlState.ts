import { useCallback, useEffect, useRef, useState } from 'react';
import { isPresetId, type PresetId } from '../core/generators';
import { clampSpeed } from '../core/player';

export interface UrlState {
  algo: string;
  n: number;
  preset: PresetId;
  seed: number;
  /** null = pick automatically from the array. */
  target: number | null;
  speed: number;
  /** Custom typed array, or null when using the preset generator. */
  data: number[] | null;
}

export const MIN_N = 10;
export const MAX_N = 200;
export const MAX_CUSTOM = 300;

export const DEFAULT_URL_STATE: UrlState = {
  algo: 'bubble',
  n: 30,
  preset: 'random',
  seed: 42,
  target: null,
  speed: 40,
  data: null,
};

/** base64url of "5,3,8" — short, copy-paste safe, no padding. */
export function encodeData(data: number[]): string {
  return btoa(data.join(',')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeData(s: string): number[] | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const parsed = parseNumberList(atob(b64));
    return parsed;
  } catch {
    return null;
  }
}

/** Parses "5, 3 8;1" → [5,3,8,1]. Returns null if invalid. */
export function parseNumberList(text: string): number[] | null {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > MAX_CUSTOM) return null;
  const out = parts.map(Number);
  if (out.some((v) => !Number.isFinite(v) || v < 0 || v > 1000)) return null;
  return out;
}

function int(v: string | null, fallback: number, min: number, max: number): number {
  if (v === null || v.trim() === '') return fallback;
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function parseUrlState(search: string): UrlState {
  const q = new URLSearchParams(search);
  const d = DEFAULT_URL_STATE;
  const preset = q.get('preset');
  const target = q.get('target');
  const data = q.get('data');
  const t = target === null || target.trim() === '' ? null : Number(target);
  return {
    algo: q.get('algo') || d.algo,
    n: int(q.get('n'), d.n, MIN_N, MAX_N),
    preset: preset && isPresetId(preset) ? preset : d.preset,
    seed: int(q.get('seed'), d.seed, 0, 0xffffffff),
    target: t !== null && Number.isFinite(t) ? t : null,
    speed: clampSpeed(int(q.get('speed'), d.speed, 1, 2000)),
    data: data ? decodeData(data) : null,
  };
}

export function serializeUrlState(s: UrlState): string {
  const q = new URLSearchParams();
  q.set('algo', s.algo);
  if (s.data) {
    q.set('data', encodeData(s.data));
  } else {
    q.set('n', String(s.n));
    q.set('preset', s.preset);
    q.set('seed', String(s.seed));
  }
  if (s.target !== null) q.set('target', String(s.target));
  q.set('speed', String(Math.round(s.speed)));
  return q.toString();
}

/**
 * App settings mirrored in the query string with history.replaceState (no
 * router, no history spam). Writes are debounced: dragging the speed slider
 * would otherwise hit the browser's replaceState rate limit.
 */
export function useUrlState(): [UrlState, (patch: Partial<UrlState>) => void] {
  const [state, setState] = useState<UrlState>(() => parseUrlState(window.location.search));
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      const qs = serializeUrlState(state);
      if (window.location.search.slice(1) !== qs) {
        window.history.replaceState(null, '', `${window.location.pathname}?${qs}${window.location.hash}`);
      }
    }, 200);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state]);

  const update = useCallback((patch: Partial<UrlState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      return (Object.keys(patch) as (keyof UrlState)[]).some((k) => prev[k] !== next[k]) ? next : prev;
    });
  }, []);

  return [state, update];
}
