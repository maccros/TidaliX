/**
 * Draws the live symbiosis relationships as actual lines between cards.
 *
 * This is the thing a terminal fundamentally could not do: a relationship is a
 * line between two places, and you have to be able to see it to reason about it.
 * Positions are measured from the real DOM after layout, so the lines stay
 * correct through resizes and reflows without duplicating any layout maths.
 */

import { useLayoutEffect, useState } from 'react';
import { activeSymbioses, type Aura, type CardInstance } from '@tidalix/engine';

interface Link {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  aura: Aura;
  harmful: boolean;
  dimmed: boolean;
}

export interface SymbiosisLinksProps {
  /**
   * One entry per side. Symbiosis is a relationship between a card and its own
   * neighbours, so the sides are kept apart here rather than concatenated —
   * merging them would draw links across the waterline that the engine never
   * grants.
   */
  boards: readonly (readonly CardInstance[])[];
  /** Element the SVG is positioned against. */
  container: HTMLElement | null;
  /** Card element lookup, keyed by instance id. */
  nodes: Map<string, HTMLElement>;
  /** When set, links not touching this card are dimmed. */
  focusId: string | null;
  /** Bumped by the caller whenever layout may have changed. */
  revision: number;
}

export function SymbiosisLinks({
  boards,
  container,
  nodes,
  focusId,
  revision,
}: SymbiosisLinksProps) {
  const [links, setLinks] = useState<Link[]>([]);

  useLayoutEffect(() => {
    if (!container) {
      setLinks([]);
      return;
    }

    const measure = () => {
      const origin = container.getBoundingClientRect();
      const next: Link[] = [];

      for (const board of boards) {
        for (const link of activeSymbioses(board)) {
          const from = nodes.get(link.sourceId);
          const to = nodes.get(link.targetId);
          if (!from || !to) continue;

          const a = from.getBoundingClientRect();
          const b = to.getBoundingClientRect();
          const harmful = (link.aura.grants.attack ?? 0) + (link.aura.grants.health ?? 0) < 0;
          const touchesFocus =
            focusId === null || link.sourceId === focusId || link.targetId === focusId;

          next.push({
            key: `${link.sourceId}->${link.targetId}-${link.aura.affects}`,
            x1: a.left + a.width / 2 - origin.left,
            y1: a.top + a.height / 2 - origin.top,
            x2: b.left + b.width / 2 - origin.left,
            y2: b.top + b.height / 2 - origin.top,
            aura: link.aura,
            harmful,
            dimmed: !touchesFocus,
          });
        }
      }
      setLinks(next);
    };

    measure();

    // Re-measure on anything that can move a card: window resize, font load,
    // or the board container itself changing size.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [boards, container, nodes, focusId, revision]);

  if (links.length === 0) return null;

  return (
    <svg className="symbiosis" aria-hidden="true">
      {links.map((l) => {
        // Bow the line so two cards linked both ways show as two arcs, not one
        // overlapping stroke — mutualism should look like mutualism.
        const dx = l.x2 - l.x1;
        const dy = l.y2 - l.y1;
        const mx = (l.x1 + l.x2) / 2 - dy * 0.12;
        const my = (l.y1 + l.y2) / 2 + dx * 0.12;
        return (
          <path
            key={l.key}
            d={`M ${l.x1} ${l.y1} Q ${mx} ${my} ${l.x2} ${l.y2}`}
            className={[
              'symbiosis__link',
              l.harmful ? 'symbiosis__link--harmful' : '',
              l.dimmed ? 'symbiosis__link--dim' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <title>{l.aura.note}</title>
          </path>
        );
      })}
    </svg>
  );
}
