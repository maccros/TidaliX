/**
 * How numbers are written on the interface. One module, because these were
 * duplicated in two files and had already drifted apart.
 *
 * Two shapes, and only two:
 *
 *   a stat pair    `4 / 4`      what something is
 *   a delta pair   `+1 / +0`    what something adds to it
 *
 * A delta signs *both* halves, zero included. "+1/0" reads as a pair of stats;
 * "+1/+0" reads as the change it actually is. Spacing is the other axis: the
 * spaced form goes in aligned columns, the compact form goes inline in prose
 * and on the card face, where a spaced pair reads as two separate numbers.
 */

/** A single figure inside a delta: always carries its sign. */
export const sign = (n: number) => (n < 0 ? String(n) : `+${n}`);

/** `4 / 4` — a stat pair, spaced, for aligned columns. */
export const pair = (attack: number, health: number) => `${attack} / ${health}`;

/** `+1 / +0` — a delta pair, spaced, for aligned columns. */
export const deltaPair = (attack: number, health: number) =>
  `${sign(attack)} / ${sign(health)}`;

/**
 * `+1/+0` — a delta pair, compact, for inline use. Null when there is no
 * change at all, so a caller can leave the whole thing out rather than print
 * a zero that means nothing.
 */
export function deltaLabel(bonus: { attack?: number; health?: number }): string | null {
  const a = bonus.attack ?? 0;
  const h = bonus.health ?? 0;
  if (a === 0 && h === 0) return null;
  return `${sign(a)}/${sign(h)}`;
}

/** Nothing to report. The same glyph the tide table prints for no energy. */
export const NIL = '—';
