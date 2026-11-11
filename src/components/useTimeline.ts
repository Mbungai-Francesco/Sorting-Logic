import { useEffect, useReducer } from 'react';
import type { Player } from '../core/player';
import type { Timeline } from '../core/timeline';

/**
 * Re-renders the calling component on every painted frame and returns the
 * player's current timeline. For the SVG tree views, which are cheap enough
 * to render through React (the bar rows are painted imperatively instead).
 */
export function useTimeline(player: Player): Timeline | null {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => player.onRender(() => tick()), [player]);
  return player.timeline;
}
