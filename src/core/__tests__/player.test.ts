import { describe, expect, it } from 'vitest';
import { algorithms } from '../../algorithms';
import { generate } from '../generators';
import { consumeDebt, MAX_FRAME_DT_MS, Player, SYNC_INTERVAL_MS, type PlayerSnapshot, type Scheduler } from '../player';
import { record } from '../recorder';
import { Timeline } from '../timeline';

const bubble = algorithms.find((a) => a.id === 'bubble')!;
const rec = record(bubble, generate('random', 40, 7));

/** Fake rAF: frames only run when the test calls `frame(dt)`. */
function fakeScheduler() {
  let now = 0;
  let nextId = 1;
  const pending = new Map<number, (t: number) => void>();
  const sched: Scheduler = {
    request: (cb) => {
      const id = nextId++;
      pending.set(id, cb);
      return id;
    },
    cancel: (id) => void pending.delete(id),
    now: () => now,
  };
  return {
    sched,
    pendingCount: () => pending.size,
    frame(dtMs: number) {
      now += dtMs;
      const cbs = [...pending.values()];
      pending.clear();
      for (const cb of cbs) cb(now);
    },
  };
}

describe('consumeDebt', () => {
  it('carries the fractional part between frames', () => {
    // 30 steps/s at 60 Hz = 0.5 steps per frame → one step every other frame
    let debt = 0;
    const taken: number[] = [];
    for (let f = 0; f < 6; f++) {
      const r = consumeDebt(debt, 1000 / 60, 30);
      debt = r.debt;
      taken.push(r.steps);
    }
    expect(taken.reduce((a, b) => a + b, 0)).toBe(3);
    expect(taken.every((s) => s <= 1)).toBe(true);
  });

  it('is independent of frame rate', () => {
    const run = (hz: number) => {
      let debt = 0;
      let steps = 0;
      for (let f = 0; f < hz * 2; f++) {
        const r = consumeDebt(debt, 1000 / hz, 500);
        debt = r.debt;
        steps += r.steps;
      }
      return steps;
    };
    // 2 seconds at 500 steps/s ≈ 1000 steps, whatever the display rate
    for (const hz of [30, 60, 144]) expect(Math.abs(run(hz) - 1000)).toBeLessThanOrEqual(1);
  });

  it('batches many steps per frame at high speed', () => {
    expect(consumeDebt(0, 1000 / 60, 2000).steps).toBe(33);
  });

  it('clamps huge gaps (hidden tab) instead of bursting', () => {
    const r = consumeDebt(0, 10_000, 100);
    expect(r.steps).toBe(Math.floor((MAX_FRAME_DT_MS * 100) / 1000));
  });

  it('never goes negative', () => {
    expect(consumeDebt(0.3, -50, 100)).toEqual({ steps: 0, debt: 0.3 });
  });
});

describe('Timeline.seek', () => {
  const expectAt = (tl: Timeline, c: number) => {
    const fresh = new Timeline(rec);
    while (fresh.cursor < c) fresh.forward();
    expect(tl.cursor).toBe(c);
    expect(tl.main).toEqual(fresh.main);
    expect(Array.from(tl.sortedRefs)).toEqual(Array.from(fresh.sortedRefs));
  };

  it('seeks forward', () => {
    const tl = new Timeline(rec);
    expect(tl.seek(100)).toBe('forward');
    expectAt(tl, 100);
  });

  it('un-patches for short backward seeks', () => {
    const tl = new Timeline(rec);
    tl.seek(300);
    expect(tl.seek(290)).toBe('unpatch');
    expectAt(tl, 290);
  });

  it('resets and replays for long backward seeks', () => {
    const tl = new Timeline(rec);
    tl.seek(rec.frames.length);
    expect(tl.seek(10)).toBe('replay');
    expectAt(tl, 10);
  });

  it('round-trips end → 0 → end', () => {
    const tl = new Timeline(rec);
    tl.seek(tl.total);
    expect(tl.main).toEqual(rec.final);
    tl.seek(0);
    expect(tl.main).toEqual(rec.initial);
    expect(tl.sortedRefs.every((r) => r === 0)).toBe(true);
    tl.seek(tl.total);
    expect(tl.main).toEqual(rec.final);
  });

  it('clamps out-of-range targets', () => {
    const tl = new Timeline(rec);
    tl.seek(-5);
    expect(tl.cursor).toBe(0);
    tl.seek(1e9);
    expect(tl.cursor).toBe(tl.total);
  });

  it('reports value changes as dirty indices', () => {
    const tl = new Timeline(rec);
    tl.takeDirty();
    const firstSwap = rec.frames.findIndex((s) => s.type === 'swap');
    tl.seek(firstSwap + 1);
    const d = tl.takeDirty();
    expect(d.all).toBe(false);
    expect(d.main.size).toBeGreaterThan(0);
  });
});

describe('Player rAF loop', () => {
  it('plays at the requested speed regardless of frame rate', () => {
    for (const hz of [60, 144]) {
      const f = fakeScheduler();
      const p = new Player(f.sched, 100);
      p.load(rec);
      p.play();
      for (let i = 0; i < hz; i++) f.frame(1000 / hz); // one second
      // 1 step owed at start + 100 steps/s over the hz-1 measured intervals
      // (the first frame only sets the time origin)
      const expected = 1 + (100 * (hz - 1)) / hz;
      expect(Math.abs(p.cursor - expected)).toBeLessThanOrEqual(1);
      p.dispose();
    }
  });

  it('changing speed does not restart the loop or move the cursor', () => {
    const f = fakeScheduler();
    const p = new Player(f.sched, 10);
    p.load(rec);
    p.play();
    f.frame(16);
    const before = p.cursor;
    p.setSpeed(1000);
    expect(p.cursor).toBe(before);
    expect(f.pendingCount()).toBe(1);
    f.frame(100);
    expect(p.cursor).toBe(before + 100);
  });

  it('stops at the end and releases the frame callback', () => {
    const f = fakeScheduler();
    const p = new Player(f.sched, 2000);
    p.load(rec);
    p.play();
    for (let i = 0; i < 10_000 && p.playing; i++) f.frame(16);
    expect(p.cursor).toBe(p.total);
    expect(p.playing).toBe(false);
    expect(f.pendingCount()).toBe(0);
  });

  it('syncs React state at ~10 Hz, not every frame', () => {
    const f = fakeScheduler();
    const p = new Player(f.sched, 60);
    p.load(rec);
    const syncs: PlayerSnapshot[] = [];
    p.onSync((s) => syncs.push(s));
    let renders = 0;
    p.onRender(() => renders++);
    p.play();
    syncs.length = 0;
    renders = 0;
    for (let i = 0; i < 60; i++) f.frame(1000 / 60);
    expect(renders).toBeGreaterThanOrEqual(55);
    expect(syncs.length).toBeLessThanOrEqual(1000 / SYNC_INTERVAL_MS + 1);
    expect(syncs.length).toBeGreaterThanOrEqual(8);
  });

  it('is safe under StrictMode-style dispose + reuse', () => {
    const f = fakeScheduler();
    const p = new Player(f.sched, 100);
    p.load(rec);
    p.play();
    p.dispose();
    p.dispose();
    expect(f.pendingCount()).toBe(0);
    p.play();
    expect(f.pendingCount()).toBe(1);
    f.frame(16);
    expect(p.cursor).toBeGreaterThan(0);
  });

  it('manual stepping pauses and moves both ways', () => {
    const f = fakeScheduler();
    const p = new Player(f.sched, 100);
    p.load(rec);
    p.play();
    f.frame(16);
    p.step(10);
    expect(p.playing).toBe(false);
    const c = p.cursor;
    p.step(-3);
    expect(p.cursor).toBe(c - 3);
    p.reset();
    expect(p.cursor).toBe(0);
    expect(p.timeline!.main).toEqual(rec.initial);
  });

  it('play at the end restarts from zero', () => {
    const f = fakeScheduler();
    const p = new Player(f.sched, 100);
    p.load(rec);
    p.seek(p.total);
    p.play();
    expect(p.cursor).toBe(0);
  });
});
