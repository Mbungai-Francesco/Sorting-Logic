import { useEffect, useLayoutEffect, useState } from 'react';
import { Player, type PlayerSnapshot, type Scheduler } from '../core/player';
import type { Recording } from '../core/recorder';

const browserScheduler: Scheduler = {
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
  now: () => performance.now(),
};

export interface PlayerApi extends PlayerSnapshot {
  player: Player;
}

/**
 * One Player per component instance. The rAF loop lives in core/player.ts;
 * this hook only (1) feeds it the current recording and (2) mirrors its
 * ~10 Hz snapshot into React state for the low-frequency UI.
 *
 * StrictMode: the Player constructor has no side effects, the subscribe
 * effect's cleanup disposes the loop, and re-running it simply re-subscribes.
 */
export function usePlayer(recording: Recording | null, initialSpeed: number): PlayerApi {
  const [player] = useState(() => new Player(browserScheduler, initialSpeed));
  const [snap, setSnap] = useState<PlayerSnapshot>(() => player.snapshot());

  useEffect(() => {
    const off = player.onSync(setSnap);
    return () => {
      off();
      player.dispose();
    };
  }, [player]);

  // Layout effect so the new bars are painted before the browser shows them.
  useLayoutEffect(() => {
    player.load(recording);
  }, [player, recording]);

  return { player, ...snap };
}
