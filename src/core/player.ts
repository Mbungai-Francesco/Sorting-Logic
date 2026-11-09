import type { Recording } from './recorder';
import { Timeline } from './timeline';

/**
 * Frame scheduler, injected so core stays DOM-free and tests can fake it.
 * In the browser: { request: requestAnimationFrame, cancel: cancelAnimationFrame, now: performance.now }.
 */
export interface Scheduler {
  request(cb: (now: number) => void): number;
  cancel(id: number): void;
  now(): number;
}

export const MIN_SPEED = 1;
export const MAX_SPEED = 2000;
/** React state is synced at most this often while playing (~10 Hz). */
export const SYNC_INTERVAL_MS = 100;
/** A frame gap above this (tab hidden, debugger…) is clamped, so we never "catch up" in a burst. */
export const MAX_FRAME_DT_MS = 250;

/**
 * Time-debt accumulator. `debt` is a fractional number of steps owed.
 * Each frame adds dt * speed; the integer part is executed, the fraction is
 * carried over. Steps-per-second is therefore independent of frame rate:
 * at 2000 steps/s, a 60 Hz display runs ~33 steps per frame, a 144 Hz one ~14.
 */
export function consumeDebt(
  debt: number,
  dtMs: number,
  speed: number,
): { steps: number; debt: number } {
  const dt = Math.max(0, Math.min(dtMs, MAX_FRAME_DT_MS));
  const total = debt + (dt * speed) / 1000;
  const steps = Math.floor(total);
  return { steps, debt: total - steps };
}

export interface PlayerSnapshot {
  cursor: number;
  total: number;
  playing: boolean;
  speed: number;
}

type Listener = (tl: Timeline) => void;
type SyncListener = (s: PlayerSnapshot) => void;

/**
 * Imperative playback engine. Owns the Timeline and the rAF loop.
 *  - `onRender` listeners run on every frame that moved the cursor (paint DOM here).
 *  - `onSync` listeners run at ~10 Hz while playing and immediately on any
 *    manual action (feed React state here).
 * Speed and cursor live in plain fields, so changing speed never restarts the loop.
 */
export class Player {
  private sched: Scheduler;
  private tl: Timeline | null = null;
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private lastSync = -Infinity;
  private debt = 0;
  private _playing = false;
  private _speed: number;
  private renderListeners = new Set<Listener>();
  private syncListeners = new Set<SyncListener>();

  constructor(sched: Scheduler, speed = 50) {
    this.sched = sched;
    this._speed = clampSpeed(speed);
  }

  get timeline(): Timeline | null {
    return this.tl;
  }
  get playing(): boolean {
    return this._playing;
  }
  get speed(): number {
    return this._speed;
  }
  get cursor(): number {
    return this.tl?.cursor ?? 0;
  }
  get total(): number {
    return this.tl?.total ?? 0;
  }

  snapshot(): PlayerSnapshot {
    return { cursor: this.cursor, total: this.total, playing: this._playing, speed: this._speed };
  }

  onRender(fn: Listener): () => void {
    this.renderListeners.add(fn);
    if (this.tl) {
      this.tl.markAllDirty();
      fn(this.tl);
    }
    return () => this.renderListeners.delete(fn);
  }

  onSync(fn: SyncListener): () => void {
    this.syncListeners.add(fn);
    fn(this.snapshot());
    return () => this.syncListeners.delete(fn);
  }

  /** Loads a new recording (or none) and rewinds to frame 0. */
  load(rec: Recording | null): void {
    this.stopLoop();
    this._playing = false;
    this.tl = rec ? new Timeline(rec) : null;
    this.emitRender();
    this.emitSync();
  }

  setSpeed(speed: number): void {
    this._speed = clampSpeed(speed);
    this.emitSync();
  }

  play(): void {
    if (!this.tl || this._playing) return;
    if (this.tl.atEnd) this.tl.reset();
    this._playing = true;
    // Owe one step immediately so pressing play feels instant even at 1 step/s.
    this.debt = 1;
    this.lastTime = null;
    this.emitRender();
    this.emitSync();
    this.schedule();
  }

  pause(): void {
    if (!this._playing) return;
    this._playing = false;
    this.stopLoop();
    this.emitSync();
  }

  toggle(): void {
    if (this._playing) this.pause();
    else this.play();
  }

  /** Step k frames (negative = backwards). Pauses playback. */
  step(k: number): void {
    if (!this.tl) return;
    this.pause();
    this.tl.seek(this.tl.cursor + k);
    this.emitRender();
    this.emitSync();
  }

  seek(to: number): void {
    if (!this.tl) return;
    this.tl.seek(to);
    this.emitRender();
    this.emitSync();
  }

  reset(): void {
    if (!this.tl) return;
    this.pause();
    this.tl.reset();
    this.emitRender();
    this.emitSync();
  }

  /** Stops the loop and drops listeners. Safe to call twice (StrictMode). */
  dispose(): void {
    this._playing = false;
    this.stopLoop();
  }

  // ---- loop --------------------------------------------------------------

  private schedule(): void {
    if (this.rafId === null) this.rafId = this.sched.request(this.tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) this.sched.cancel(this.rafId);
    this.rafId = null;
    this.lastTime = null;
    this.debt = 0;
  }

  private tick = (now: number): void => {
    this.rafId = null;
    const tl = this.tl;
    if (!this._playing || !tl) return;

    const dt = this.lastTime === null ? 0 : now - this.lastTime;
    this.lastTime = now;
    const { steps, debt } = consumeDebt(this.debt, dt, this._speed);
    this.debt = debt;

    let moved = false;
    for (let i = 0; i < steps; i++) {
      if (!tl.forward()) break;
      moved = true;
    }
    if (moved) this.emitRender();

    if (tl.atEnd) {
      this._playing = false;
      this.lastTime = null;
      this.debt = 0;
      this.emitSync();
      return;
    }
    if (now - this.lastSync >= SYNC_INTERVAL_MS) {
      this.lastSync = now;
      this.emitSync();
    }
    this.schedule();
  };

  private emitRender(): void {
    const tl = this.tl;
    if (!tl) return;
    for (const fn of this.renderListeners) fn(tl);
  }

  private emitSync(): void {
    const snap = this.snapshot();
    for (const fn of this.syncListeners) fn(snap);
  }
}

export function clampSpeed(s: number): number {
  if (!Number.isFinite(s)) return MIN_SPEED;
  return Math.max(MIN_SPEED, Math.min(MAX_SPEED, s));
}
