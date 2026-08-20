/**
 * A silhouette per species.
 *
 * Every card in TidaliX is a real animal, and until now the only thing carrying
 * that was the binomial name in small italics. A shape is read before any text
 * is, so this is mostly about making a hand scannable: you should be able to see
 * that you are holding two crabs and a shark without reading a word.
 *
 * Drawn rather than photographed for two reasons. The deploy's CSP blocks every
 * external image host, so art has to ship inside the page; and a flat silhouette
 * tints, so each animal can take the colour of the phase it is standing in
 * without a second asset.
 *
 * All of them share one 100x56 viewBox and paint in `currentColor`, so size and
 * colour are decided entirely by CSS at the point of use.
 */

import type { ReactNode } from 'react';

/* Shared bits, for the body plans that genuinely repeat. */
const eye = (cx: number, cy: number, r = 1.7) => <circle cx={cx} cy={cy} r={r} className="art__eye" />;

const ART: Record<string, ReactNode> = {
  /* ---- Fish: deep-bodied ---- */
  'coral-grouper': (
    <>
      <path d="M14 28c8-13 30-18 46-14 9 2 16 7 20 14-4 7-11 12-20 14-16 4-38-1-46-14z" />
      <path d="M80 28 96 16v24z" />
      <path d="M44 15c4-6 12-8 16-4z" />
      <circle cx="70" cy="34" r="2.2" opacity=".45" />
      <circle cx="56" cy="22" r="2.6" opacity=".45" />
      <circle cx="38" cy="32" r="2" opacity=".45" />
      {eye(24, 25)}
    </>
  ),
  'mangrove-jack': (
    <>
      <path d="M12 28c9-11 28-16 44-13 10 2 18 6 24 13-6 7-14 11-24 13-16 3-35-2-44-13z" />
      <path d="M80 28 98 18l-6 10 6 10z" />
      <path d="M46 16c4-5 11-7 15-3z" />
      {eye(23, 25)}
    </>
  ),
  'giant-trevally': (
    <>
      <path d="M14 28c6-14 24-19 40-16 12 2 21 8 26 16-5 8-14 14-26 16-16 3-34-2-40-16z" />
      <path d="M80 28 99 15l-7 13 7 13z" />
      <path d="M40 13c5-7 14-9 18-4z" />
      <path d="M38 44c5 6 14 8 18 3z" />
      {eye(24, 24, 2)}
    </>
  ),
  'bumphead-parrotfish': (
    <>
      <path d="M18 30c0-14 12-22 30-22 16 0 28 8 33 22-5 14-17 22-33 22-18 0-30-8-30-22z" />
      <path d="M18 18c-5-6-4-12 3-13 6-1 10 3 11 9z" />
      <path d="M14 32c-4 0-6-2-6-4s3-4 7-4z" />
      <path d="M81 30 97 18v24z" />
      {eye(30, 22)}
    </>
  ),
  'great-barracuda': (
    <>
      <path d="M6 30c14-6 40-9 66-7 8 1 14 2 18 4-4 2-10 4-18 5-26 2-52-1-66-2z" />
      <path d="M6 30c3-3 9-5 14-5l2 5-2 4c-5 0-11-2-14-4z" />
      <path d="M22 27h14M22 33h14" strokeWidth="1" stroke="currentColor" opacity=".5" />
      <path d="M90 27 99 20l-3 10 3 10z" />
      <path d="M52 22c4-4 9-5 12-2z" />
      {eye(18, 27, 1.5)}
    </>
  ),
  'clown-triggerfish': (
    <>
      <path d="M16 28c8-14 26-20 42-16 12 3 20 9 24 16-4 7-12 13-24 16-16 4-34-2-42-16z" />
      <path d="M52 10v-5M60 11l2-5" stroke="currentColor" strokeWidth="2" />
      <path d="M82 28 97 20v16z" />
      <circle cx="34" cy="36" r="3.4" opacity=".5" />
      <circle cx="46" cy="40" r="2.8" opacity=".5" />
      <circle cx="58" cy="36" r="3" opacity=".5" />
      {eye(26, 22)}
    </>
  ),
  'regal-blue-tang': (
    <>
      <path d="M14 28c8-13 26-19 44-15 11 2 19 8 23 15-4 7-12 13-23 15-18 4-36-2-44-15z" />
      <path d="M81 28 97 19v18z" />
      <path d="M74 26h6v4h-6z" opacity=".55" />
      {eye(24, 24)}
    </>
  ),
  'moorish-idol': (
    <>
      <path d="M20 30c6-12 20-18 34-16 9 1 15 6 19 12-4 8-11 14-20 17-14 4-27-1-33-13z" />
      <path d="M44 15c3-9 34-14 52-12-14 5-30 10-40 20z" />
      <path d="M20 30c-6 0-10 3-13 6 5 1 9 0 13-2z" />
      <path d="M73 38 92 30l-6 10z" />
      {eye(28, 27)}
    </>
  ),
  'clown-anemonefish': (
    <>
      <path d="M16 28c8-11 24-16 38-13 9 2 16 6 20 13-4 7-11 11-20 13-14 3-30-2-38-13z" />
      <path d="M28 18c3 7 3 13 0 20-3-1-5-2-7-4 2-4 2-8 0-12 2-2 4-3 7-4z" opacity=".55" />
      <path d="M48 15c3 9 3 17 0 26h-6c3-9 3-17 0-26z" opacity=".55" />
      <path d="M74 28 94 19l-5 9 5 9z" />
      {eye(22, 25)}
    </>
  ),
  'bluestreak-cleaner-wrasse': (
    <>
      <path d="M8 29c16-8 44-11 70-8 7 1 12 2 15 4-3 2-8 4-15 5-26 3-54 0-70-1z" />
      <path d="M22 29h62" stroke="currentColor" strokeWidth="3" opacity=".5" />
      <path d="M93 25 99 20v18l-6-5z" />
      {eye(16, 27, 1.5)}
    </>
  ),
  'blackspotted-puffer': (
    <>
      <circle cx="46" cy="29" r="24" />
      <path d="M70 29 92 20l-6 9 6 9z" />
      <path d="M28 12l-4-6M46 6l0-6M64 12l4-6M22 29H14M28 46l-4 6M46 52v6M64 46l4 6" stroke="currentColor" strokeWidth="2" />
      <circle cx="38" cy="22" r="2.4" opacity=".45" />
      <circle cx="52" cy="34" r="2.4" opacity=".45" />
      <circle cx="42" cy="38" r="2" opacity=".45" />
      {eye(30, 24)}
    </>
  ),
  'red-lionfish': (
    <>
      <path d="M26 30c6-9 18-13 30-11 8 1 14 5 17 11-3 6-9 10-17 11-12 2-24-2-30-11z" />
      <path d="M42 19 34 2M52 17l2-16M62 19l10-16" stroke="currentColor" strokeWidth="2.2" />
      <path d="M40 41 30 56M52 43l0 13M62 41l10 15" stroke="currentColor" strokeWidth="2.2" />
      <path d="M26 30 6 20c2 10 2 12 0 20z" opacity=".8" />
      <path d="M73 30 94 22l-5 8 5 8z" />
      {eye(34, 27)}
    </>
  ),
  'atlantic-mudskipper': (
    <>
      <path d="M8 34c12-8 34-11 58-9 8 1 14 2 18 4-4 3-10 5-18 6-24 2-46 1-58-1z" />
      <path d="M22 40c-2 6-1 9 3 10 3 1 6-2 6-6z" />
      <path d="M44 41c-2 6-1 9 3 10 3 1 6-2 6-6z" />
      <path d="M84 29 98 22v18z" />
      <circle cx="14" cy="26" r="4" />
      <circle cx="22" cy="24" r="4" />
      {eye(14, 26, 1.8)}
      {eye(22, 24, 1.8)}
    </>
  ),

  /* ---- Sharks and rays ---- */
  'blacktip-reef-shark': (
    <>
      <path d="M6 32c14-9 38-14 62-12 10 1 18 3 24 6-6 4-14 7-24 8-24 2-48-1-62-2z" />
      <path d="M40 20 46 4l14 14z" />
      <path d="M40 20 46 4l14 14z" opacity=".9" />
      <path d="M46 4 44 9l10 8z" fill="currentColor" opacity=".35" />
      <path d="M34 40l-4 12 14-9z" />
      <path d="M92 26 99 16l-4 15 4 15z" />
      {eye(16, 28, 1.6)}
    </>
  ),
  'whitetip-reef-shark': (
    <>
      <path d="M6 31c15-8 40-12 64-10 9 1 16 3 22 5-6 4-13 6-22 7-24 2-49-1-64-2z" />
      <path d="M44 21 50 8l12 12z" />
      <path d="M50 8l-2 4 8 6z" opacity=".3" />
      <path d="M36 38l-4 10 12-7z" />
      <path d="M92 25 99 16l-4 14 4 14z" />
      {eye(15, 27, 1.6)}
    </>
  ),
  'reef-manta-ray': (
    <>
      <path d="M50 8c14 0 30 8 46 24-16-4-30-4-46-4s-30 0-46 4C20 16 36 8 50 8z" />
      <path d="M40 10c-3-6-6-8-9-6-2 2 0 6 4 9z" />
      <path d="M60 10c3-6 6-8 9-6 2 2 0 6-4 9z" />
      <path d="M46 28h8l-2 26-2-6-2 6z" />
      {eye(38, 14, 1.6)}
      {eye(62, 14, 1.6)}
    </>
  ),

  /* ---- Reptile ---- */
  'green-sea-turtle': (
    <>
      <ellipse cx="50" cy="30" rx="28" ry="20" />
      <path d="M50 10v40M28 24h44M30 38h40" stroke="var(--surface)" strokeWidth="1.6" opacity=".55" />
      <path d="M78 24c8-4 14-4 16 0-2 4-8 5-16 4z" />
      <circle cx="86" cy="25" r="6" />
      <path d="M26 12c-8-2-14 2-14 7 4 3 10 3 16 0z" />
      <path d="M26 48c-8 2-14-2-14-7 4-3 10-3 16 0z" />
      {eye(90, 24, 1.5)}
    </>
  ),

  /* ---- Crustaceans ---- */
  'sally-lightfoot-crab': (
    <>
      <ellipse cx="50" cy="30" rx="22" ry="14" />
      <path d="M30 24 12 14M30 30 8 28M32 38 14 44M38 42 30 54" stroke="currentColor" strokeWidth="2.4" />
      <path d="M70 24 88 14M70 30 92 28M68 38 86 44M62 42 70 54" stroke="currentColor" strokeWidth="2.4" />
      <path d="M34 18c-6-6-12-6-14-2-2 4 2 8 8 9z" />
      <path d="M66 18c6-6 12-6 14-2 2 4-2 8-8 9z" />
      {eye(44, 24, 2)}
      {eye(56, 24, 2)}
    </>
  ),
  'horn-eyed-ghost-crab': (
    <>
      <rect x="30" y="20" width="40" height="22" rx="5" />
      <path d="M42 20V8M58 20V8" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="42" cy="6" r="3.4" />
      <circle cx="58" cy="6" r="3.4" />
      <path d="M30 26 10 18M30 34 8 34M32 40 14 50" stroke="currentColor" strokeWidth="2.4" />
      <path d="M70 26 90 18M70 34 92 34M68 40 86 50" stroke="currentColor" strokeWidth="2.4" />
      <path d="M34 44c-6 6-6 12-1 13 4 1 7-3 8-9z" />
    </>
  ),
  'peacock-mantis-shrimp': (
    <>
      <path d="M22 26h50v12H22z" />
      <path d="M34 26v12M44 26v12M54 26v12M64 26v12" stroke="var(--surface)" strokeWidth="1.4" opacity=".5" />
      <path d="M72 26c8-2 14 0 16 6-2 6-8 8-16 6z" />
      <path d="M88 24 99 16l-4 16 4 16z" />
      <path d="M22 26c-6-1-10 1-12 6 2 5 6 7 12 6z" />
      <path d="M14 30 4 22c0 6 0 10-2 14z" />
      <path d="M20 22c-2-6 0-10 4-11 3-1 5 2 4 6z" stroke="currentColor" strokeWidth="1.6" />
      {eye(12, 22, 2.2)}
      {eye(20, 20, 2.2)}
    </>
  ),

  /* ---- Echinoderms ---- */
  'rock-boring-urchin': (
    <>
      <circle cx="50" cy="30" r="15" />
      <g stroke="currentColor" strokeWidth="2.4">
        <path d="M50 15V2M50 45v13M35 30H22M65 30h13M39 19 30 10M61 19l9-9M39 41l-9 9M61 41l9 9" />
        <path d="M44 16 40 4M56 16l4-12M44 44l-4 12M56 44l4 12M36 24 24 20M36 36 24 40M64 24l12-4M64 36l12 4" />
      </g>
    </>
  ),
  'crown-of-thorns-starfish': (
    <>
      <path d="M50 30 62 8l-2 20 20-12-14 16 22 2-22 6 14 14-20-10 2 20-12-18-12 18 2-20-20 10 14-14-22-6 22-2-14-16 20 12-2-20z" />
      <g stroke="currentColor" strokeWidth="1.4" opacity=".85">
        <path d="M56 14l3-7M72 20l6-5M78 34l8 2M66 46l5 7M46 48l-3 8M30 42l-7 6M22 28l-8-2M34 16l-5-7" />
      </g>
      <circle cx="50" cy="30" r="4" fill="var(--surface)" opacity=".5" />
    </>
  ),

  /* ---- Molluscs ---- */
  'common-octopus': (
    <>
      <path d="M50 4c14 0 22 10 22 22 0 6-2 10-4 14H32c-2-4-4-8-4-14C28 14 36 4 50 4z" />
      <path d="M34 40c-6 8-16 10-24 6 8-1 12-4 14-10zM42 42c-4 10-12 14-22 14 8-4 12-8 14-16zM50 42c0 10-4 16-10 18 4-6 5-12 4-18zM58 42c4 10 12 14 22 14-8-4-12-8-14-16zM66 40c6 8 16 10 24 6-8-1-12-4-14-10z" />
      {eye(40, 22, 2.6)}
      {eye(60, 22, 2.6)}
    </>
  ),
  'giant-clam': (
    <>
      <path d="M50 30c-14-14-32-16-40-8 6 14 22 24 40 26z" />
      <path d="M50 30c14-14 32-16 40-8-6 14-22 24-40 26z" />
      <path d="M50 48c-14-2-26-8-34-16 10 12 22 18 34 20 12-2 24-8 34-20-8 8-20 14-34 16z" opacity=".55" />
      <path d="M20 26c8 8 18 14 30 16 12-2 22-8 30-16" stroke="currentColor" strokeWidth="1.4" fill="none" opacity=".5" />
    </>
  ),

  /* ---- Cnidarians ---- */
  'staghorn-coral': (
    <>
      <path d="M46 56V34l-10-10-6-14 10 10 6 12V22l-6-14 10 12v-6l6 8 8-14-4 16 12-12-10 18 12-6-14 12 4 10-12-8v18z" />
      <path d="M30 56V44l-8-10 10 8v14z" />
      <path d="M70 56V42l8-8-4 10v12z" />
    </>
  ),
  'table-coral': (
    <>
      <path d="M8 26c10-8 26-12 42-12s32 4 42 12c-10 4-26 6-42 6s-32-2-42-6z" />
      <path d="M44 30h12v26H44z" />
      <path d="M34 56c2-10 6-16 10-20M66 56c-2-10-6-16-10-20" stroke="currentColor" strokeWidth="2.4" fill="none" />
      <path d="M16 24c8 2 18 4 34 4s26-2 34-4" stroke="var(--surface)" strokeWidth="1.4" fill="none" opacity=".45" />
    </>
  ),
  'bubble-tip-anemone': (
    <>
      <path d="M38 56c-2-10-2-18 0-24h24c2 6 2 14 0 24z" />
      <g>
        <circle cx="26" cy="26" r="5" /><circle cx="38" cy="18" r="5.5" />
        <circle cx="50" cy="14" r="6" /><circle cx="62" cy="18" r="5.5" />
        <circle cx="74" cy="26" r="5" /><circle cx="32" cy="34" r="4.5" />
        <circle cx="68" cy="34" r="4.5" /><circle cx="50" cy="28" r="5" />
      </g>
      <path d="M30 30c4-6 10-10 20-10s16 4 20 10z" opacity=".7" />
    </>
  ),

  /* ---- Eel ---- */
  'giant-moray': (
    <>
      <path d="M6 20c8-8 18-6 22 2 4 10-2 16 2 22 4 7 14 8 22 4 10-5 18-4 26 2-8 2-14 2-20 6-10 6-24 6-32-2-8-9-6-18-8-24-2-5-8-8-12-4z" />
      <path d="M10 14c6-6 14-6 18 0-6-2-12-1-18 4z" />
      <path d="M6 20c-4-2-6-6-4-9 4 2 8 4 10 8z" />
      {eye(16, 16, 1.8)}
    </>
  ),
};

export interface SpeciesArtProps {
  definitionId: string;
  className?: string;
}

/**
 * The silhouette for a species, or nothing at all.
 *
 * Returning null for an unknown id is deliberate: a missing drawing should leave
 * a card slightly plainer, never break it or leave a broken-image box behind.
 */
export function SpeciesArt({ definitionId, className = 'art' }: SpeciesArtProps) {
  const art = ART[definitionId];
  if (!art) return null;
  return (
    <svg className={className} viewBox="0 0 100 56" aria-hidden="true" focusable="false">
      {art}
    </svg>
  );
}

/** Which species have a drawing. Exported so a test can hold the set complete. */
export function hasArt(definitionId: string): boolean {
  return definitionId in ART;
}
