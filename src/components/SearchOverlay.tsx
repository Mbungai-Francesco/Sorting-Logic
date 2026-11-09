import type { Ref } from 'react';

/**
 * Layer over the main row for search algorithms: shades the eliminated
 * halves and places lo / mid / hi markers. Positioned imperatively by
 * Stage's painter via `paintSearchOverlay` (painter.ts).
 */
export function SearchOverlay({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="search-overlay" data-active="off" aria-hidden="true">
      <div className="search-shade search-shade--left" />
      <div className="search-shade search-shade--right" />
      <div className="search-marker search-marker--lo">lo</div>
      <div className="search-marker search-marker--mid">mid</div>
      <div className="search-marker search-marker--hi">hi</div>
    </div>
  );
}
