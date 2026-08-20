/**
 * A silhouette for every species in the set.
 *
 * Inline SVG rather than image files, because the deployed page runs under a
 * strict CSP that blocks every external host — and because a silhouette that
 * inherits `currentColor` can be tinted by the tide phase the card is drawn in,
 * which an image cannot.
 *
 * These are shape-recognition drawings, not illustrations: the point is that a
 * player scanning six cards can tell a shark from a crab from a coral without
 * reading, and that the outline agrees with the animal named on the card. Every
 * one is a side profile on the same 120x70 field so a row of them reads as a set.
 */

import type { CSSProperties } from 'react';

/** Paths are drawn as filled silhouettes on a shared 120x70 field. */
const ART: Record<string, string> = {
  /* ---- Fish: body plans differ by depth of body and tail shape ---- */
  'atlantic-mudskipper':
    'M14 44 C24 30 52 26 74 30 L92 22 L88 34 L104 32 L94 42 C86 48 44 52 22 48 Z M78 30 a4 4 0 1 0 0.1 0 M30 46 l-4 10 l8-4 Z M52 48 l-3 10 l8-5 Z',
  'coral-grouper':
    'M12 36 C26 16 74 14 92 30 L112 16 L106 36 L112 54 L92 42 C74 56 26 54 12 36 Z M46 20 C58 24 62 46 50 50 M82 28 a3.5 3.5 0 1 0 0.1 0',
  'mangrove-jack':
    'M14 36 C28 18 72 16 90 30 L110 18 L104 36 L110 54 L90 42 C72 56 28 54 14 36 Z M40 22 L46 50 M80 28 a3 3 0 1 0 0.1 0',
  'moorish-idol':
    'M30 44 C30 24 52 14 70 20 L74 6 C82 14 84 26 80 38 L100 30 L92 44 L100 56 L80 48 C68 58 38 58 30 44 Z M66 24 a3 3 0 1 0 0.1 0 M44 26 L48 54',
  'bumphead-parrotfish':
    'M10 38 C14 20 34 10 58 12 C78 14 90 24 94 36 L112 22 L106 38 L112 56 L94 44 C86 56 30 58 10 38 Z M30 14 C22 18 18 24 18 30 M84 30 a3.5 3.5 0 1 0 0.1 0',
  'giant-trevally':
    'M10 36 C26 18 74 16 92 30 L114 14 L106 36 L114 58 L92 42 C74 56 26 54 10 36 Z M50 18 L54 30 M84 28 a3 3 0 1 0 0.1 0',
  'great-barracuda':
    'M6 38 C30 30 78 28 96 32 L116 24 L110 36 L116 50 L96 40 C78 46 30 46 6 38 Z M14 36 L28 34 M90 31 a2.5 2.5 0 1 0 0.1 0 M20 33 L34 37',
  'giant-moray':
    'M8 22 C30 14 34 44 56 40 C78 36 82 58 108 50 L110 58 C80 68 76 46 56 50 C34 54 28 24 6 30 Z M14 24 a2.5 2.5 0 1 0 0.1 0',
  'clown-anemonefish':
    'M18 38 C28 20 68 18 84 32 L106 20 L100 38 L106 56 L84 44 C68 58 28 56 18 38 Z M40 22 L36 52 M60 20 L58 54 M78 30 a3 3 0 1 0 0.1 0',
  'clown-triggerfish':
    'M22 38 C22 20 44 12 64 16 C82 20 90 28 92 38 L110 26 L104 38 L110 52 L92 40 C86 54 22 58 22 38 Z M42 44 a4 4 0 1 0 0.1 0 M58 46 a3 3 0 1 0 0.1 0 M80 28 a3 3 0 1 0 0.1 0 M64 16 L68 22',
  'regal-blue-tang':
    'M20 38 C20 18 46 12 68 18 C84 22 90 30 92 38 L112 26 L106 38 L112 54 L92 42 C84 54 20 58 20 38 Z M46 24 C58 30 60 46 50 52 M80 30 a3 3 0 1 0 0.1 0',
  'bluestreak-cleaner-wrasse':
    'M10 38 C32 28 76 28 94 34 L114 24 L108 38 L114 52 L94 42 C76 48 32 48 10 38 Z M16 38 L92 36 M88 33 a2.5 2.5 0 1 0 0.1 0',
  'blackspotted-puffer':
    'M28 38 C28 18 52 10 70 16 C86 22 92 30 92 38 C92 52 72 60 56 58 C40 56 28 50 28 38 Z M78 28 a3.5 3.5 0 1 0 0.1 0 M44 26 a2.5 2.5 0 1 0 0.1 0 M56 44 a2.5 2.5 0 1 0 0.1 0 M70 40 a2.5 2.5 0 1 0 0.1 0 M40 44 a2 2 0 1 0 0.1 0 M96 34 L108 28 L104 40 L110 50 L94 44 Z',
  'red-lionfish':
    'M34 38 C34 24 52 16 68 20 C82 24 88 30 88 38 C88 48 72 56 58 54 C44 52 34 48 34 38 Z M46 20 L36 4 M56 18 L54 2 M66 20 L74 4 M40 50 L28 64 M56 56 L54 68 M72 50 L84 64 M78 30 a3 3 0 1 0 0.1 0 M92 34 L106 26 L102 38 L108 50 L90 42 Z',

  /* ---- Sharks and rays ---- */
  'reef-manta-ray':
    'M60 22 C40 22 14 32 6 44 C22 42 38 40 52 42 L48 66 L58 46 L62 46 L72 66 L68 42 C82 40 98 42 114 44 C106 32 80 22 60 22 Z M50 24 L44 14 M70 24 L76 14',
  'blacktip-reef-shark':
    'M8 40 C28 28 76 26 94 32 L104 14 L100 34 L116 24 L110 40 L116 56 L100 46 L104 62 L94 46 C76 52 28 50 8 40 Z M40 44 L34 58 M64 46 L60 58 M88 34 a2.5 2.5 0 1 0 0.1 0',
  'whitetip-reef-shark':
    'M8 40 C28 30 78 28 96 34 L104 18 L102 36 L116 26 L110 40 L116 54 L102 46 L104 60 L96 46 C78 52 28 50 8 40 Z M44 46 L38 58 M90 36 a2.5 2.5 0 1 0 0.1 0',

  /* ---- Reptile ---- */
  'green-sea-turtle':
    'M34 34 C34 18 54 10 72 14 C88 18 96 28 96 38 C96 52 76 60 58 56 C42 52 34 46 34 34 Z M96 28 C106 24 114 28 114 34 C114 40 106 44 98 42 Z M112 32 a2 2 0 1 0 0.1 0 M36 20 L22 12 L30 26 Z M40 52 L26 62 L38 58 Z M84 14 L90 4 L92 16 Z M86 56 L94 64 L92 52 Z M52 22 L60 30 L52 38 L44 30 Z M70 22 L78 30 L70 38 L62 30 Z',

  /* ---- Crustaceans: body plus legs and claws ---- */
  'sally-lightfoot-crab':
    'M40 36 C40 26 52 20 62 20 C74 20 84 26 84 36 C84 46 74 52 62 52 C50 52 40 46 40 36 Z M40 30 L24 20 L14 26 L26 28 M84 30 L100 20 L110 26 L98 28 M42 44 L26 52 M46 50 L34 62 M80 44 L96 52 M76 50 L88 62 M54 24 a2.5 2.5 0 1 0 0.1 0 M70 24 a2.5 2.5 0 1 0 0.1 0',
  'horn-eyed-ghost-crab':
    'M42 38 C42 28 52 22 62 22 C74 22 82 28 82 38 C82 48 74 54 62 54 C50 54 42 48 42 38 Z M52 22 L50 6 M72 22 L74 6 M50 6 a3 3 0 1 0 0.1 0 M74 6 a3 3 0 1 0 0.1 0 M42 32 L24 24 L16 30 M82 32 L100 24 L108 30 M44 46 L28 54 M78 46 L94 54 M48 52 L40 64 M76 52 L84 64',
  'peacock-mantis-shrimp':
    'M22 40 C34 28 76 26 96 32 L112 26 L106 38 L112 50 L96 42 C76 48 34 50 22 40 Z M30 34 L18 22 L28 20 L36 30 M30 44 L18 56 L28 58 L36 48 M46 30 L46 48 M58 29 L58 49 M70 30 L70 48 M88 34 a2.5 2.5 0 1 0 0.1 0 M24 24 a3 3 0 1 0 0.1 0',

  /* ---- Echinoderms ---- */
  'rock-boring-urchin':
    'M60 36 m-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0 Z M60 18 L60 2 M60 54 L60 70 M42 36 L26 36 M78 36 L94 36 M47 23 L36 12 M73 23 L84 12 M47 49 L36 60 M73 49 L84 60 M54 19 L50 4 M66 19 L70 4 M54 53 L50 68 M66 53 L70 68',
  'crown-of-thorns-starfish':
    'M60 8 L70 30 L94 32 L76 48 L82 70 L60 58 L38 70 L44 48 L26 32 L50 30 Z M60 14 L58 2 M92 34 L104 30 M78 52 L86 64 M42 52 L34 64 M28 34 L16 30 M68 26 L74 18 M52 26 L46 18',

  /* ---- Molluscs ---- */
  'giant-clam':
    'M60 52 C36 52 16 42 14 30 C26 22 44 18 60 18 C76 18 94 22 106 30 C104 42 84 52 60 52 Z M60 20 L60 50 M46 21 L40 48 M74 21 L80 48 M32 26 L30 44 M88 26 L90 44 M20 32 C34 40 86 40 100 32',
  'common-octopus':
    'M60 12 C44 12 34 24 34 36 C34 42 36 46 40 50 C30 52 22 60 18 68 C26 62 34 58 42 58 C40 64 40 68 40 70 C46 64 50 58 52 54 C54 62 54 66 56 70 C58 62 58 56 58 52 C62 56 64 62 68 70 C68 64 68 60 66 54 C70 60 76 64 84 70 C80 60 74 54 68 50 C78 46 86 42 86 36 C86 24 76 12 60 12 Z M48 30 a3.5 3.5 0 1 0 0.1 0 M72 30 a3.5 3.5 0 1 0 0.1 0',

  /* ---- Cnidarians ---- */
  'staghorn-coral':
    'M52 68 L52 44 L38 30 L38 14 M52 44 L66 32 L66 16 M52 56 L34 44 L26 30 M68 68 L68 48 L82 34 L82 18 M68 48 L92 38 L98 26 M38 14 L32 6 M38 14 L44 6 M66 16 L60 8 M66 16 L72 8 M82 18 L78 8 M82 18 L88 10 M26 30 L20 24 M98 26 L104 20 M44 68 L76 68',
  'table-coral':
    'M12 34 C30 24 90 24 108 34 C90 42 30 42 12 34 Z M56 40 L54 68 M64 40 L66 68 M50 68 L72 68 M24 32 L20 26 M40 30 L38 24 M60 29 L60 22 M80 30 L82 24 M96 32 L100 26',
  'bubble-tip-anemone':
    'M46 68 L48 46 C48 40 72 40 72 46 L74 68 Z M48 46 C40 40 32 34 24 32 M52 44 C46 34 40 24 34 18 M58 43 C56 32 54 22 52 12 M64 43 C66 32 68 22 70 12 M70 44 C76 34 82 24 88 18 M72 46 C80 40 88 34 96 32 M24 32 a4 4 0 1 0 0.1 0 M34 18 a4 4 0 1 0 0.1 0 M52 12 a4 4 0 1 0 0.1 0 M70 12 a4 4 0 1 0 0.1 0 M88 18 a4 4 0 1 0 0.1 0 M96 32 a4 4 0 1 0 0.1 0',
};

/**
 * Which drawings are outlines rather than solids.
 *
 * A branching coral or an urchin's spines only read as themselves when they are
 * strokes; filling those paths produces a blob. Everything with a body — the
 * fish, the crabs, the octopus — is a filled silhouette.
 */
const STROKED = new Set([
  'staghorn-coral',
  'table-coral',
  'bubble-tip-anemone',
  'rock-boring-urchin',
  'giant-clam',
]);

export interface CardArtProps {
  definitionId: string;
  /** Drawn small on the card face, larger in the detail dialog. */
  size?: 'card' | 'detail';
}

/**
 * The species drawing, or nothing at all.
 *
 * A missing entry renders nothing rather than a placeholder: a card with no art
 * should look like a card with no art, not like a card whose art failed.
 */
export function CardArt({ definitionId, size = 'card' }: CardArtProps) {
  const path = ART[definitionId];
  if (!path) return null;

  const stroked = STROKED.has(definitionId);
  return (
    <svg
      className={`art art--${size}`}
      viewBox="0 0 120 70"
      role="presentation"
      aria-hidden="true"
      style={{ '--art-stroke': stroked ? '4' : '1.5' } as CSSProperties}
    >
      <path
        d={path}
        className={stroked ? 'art__line' : 'art__body'}
        fill={stroked ? 'none' : 'currentColor'}
        stroke="currentColor"
        strokeWidth={stroked ? 4 : 1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Every species this module can draw. Used by the tests to keep the set honest. */
export function drawnSpecies(): string[] {
  return Object.keys(ART);
}
