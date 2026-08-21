/**
 * A drawing per species.
 *
 * Every card in TidaliX is a real animal, and a shape is read before any text
 * is, so this is mostly about making a hand scannable: you should be able to see
 * you are holding two crabs and a shark without reading a word.
 *
 * Flat cartoon rather than silhouette, which is the lesson of the first attempt.
 * A single-colour shape at card size is a blob — two different fish came out as
 * the same torpedo — so every animal here gets the same three things: one dark
 * outline at one weight, two or three flat fills, and a real eye. Consistency in
 * those is what makes twenty-eight separate drawings read as one set.
 *
 * All of them share a 120x80 field and sit on a light plate (see `.card__art`),
 * because the outline is a fixed dark navy and would vanish on the dark theme.
 */

import type { ReactNode } from 'react';

/** One outline colour and one weight, for the whole set. */
const O = '#12323d';

/** An eye with a highlight — the single detail that stops a shape being a blob. */
const eye = (cx: number, cy: number, r = 3.4) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill={O} />
    <circle cx={cx + r * 0.42} cy={cy - r * 0.42} r={r * 0.36} fill="#fff" />
  </>
);

/** An eye set in a pale ring, for animals whose eye reads against a dark body. */
const ringEye = (cx: number, cy: number, r = 5.4) => (
  <>
    <circle cx={cx} cy={cy} r={r} fill="#fdfdfa" stroke={O} strokeWidth={2.4} />
    <circle cx={cx} cy={cy} r={r * 0.46} fill={O} />
  </>
);

/** Shared group props: every outlined shape in the set is drawn with these. */
const ink = {
  stroke: O,
  strokeWidth: 3,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
};

const ART: Record<string, ReactNode> = {
  /* ------------------------------------------------------------------ */
  /* Reef fish — deep bodies, bold markings                              */
  /* ------------------------------------------------------------------ */
  'clown-anemonefish': (
    <>
      <g {...ink}>
        <path d="M92 40 108 24v32z" fill="#f08a3c" />
        <path d="M60 14c-6 0-11 5-13 11 4-2 9-3 13-3z" fill="#f08a3c" />
        <ellipse cx="55" cy="40" rx="38" ry="24" fill="#f4903f" />
        <path d="M40 18c6 10 6 34 0 44" fill="#fdfdfa" strokeWidth={2.6} />
        <path d="M72 20c5 10 5 30 0 40" fill="#fdfdfa" strokeWidth={2.6} />
        <path d="M22 30c-7 4-9 12-4 18" fill="#f08a3c" />
        <circle cx="30" cy="36" r="6.5" fill="#fdfdfa" />
      </g>
      {eye(30, 36, 3.6)}
    </>
  ),

  'coral-grouper': (
    <>
      <g {...ink}>
        <path d="M90 40 112 24v32z" fill="#b8452f" />
        <path d="M52 18c8-8 20-8 26 0z" fill="#b8452f" />
        <path d="M46 62c8 8 20 8 26 0z" fill="#b8452f" />
        <ellipse cx="52" cy="40" rx="38" ry="23" fill="#c9503a" />
      </g>
      <g fill="#4a8fb5" opacity=".85">
        <circle cx="46" cy="30" r="3" /><circle cx="60" cy="26" r="2.6" />
        <circle cx="70" cy="34" r="3" /><circle cx="54" cy="44" r="2.8" />
        <circle cx="68" cy="50" r="2.6" /><circle cx="40" cy="46" r="2.6" />
        <circle cx="78" cy="42" r="2.4" />
      </g>
      {ringEye(28, 34)}
    </>
  ),

  'clown-triggerfish': (
    <>
      <g {...ink}>
        <path d="M92 40 112 28v24z" fill="#2b3f4a" />
        <path d="M46 16c10-6 22-2 26 8z" fill="#2b3f4a" />
        <path d="M44 64c10 6 24 2 28-8z" fill="#2b3f4a" />
        <ellipse cx="54" cy="40" rx="36" ry="24" fill="#33505e" />
        <path d="M28 44c10-8 24-8 34 2-10 8-26 8-34-2z" fill="#f6f6f2" strokeWidth={2.4} />
        <path d="M60 22c10-2 18 2 22 8" fill="none" stroke="#e8c246" strokeWidth={5} />
      </g>
      <g fill="#f6f6f2">
        <circle cx="36" cy="48" r="3.4" /><circle cx="48" cy="54" r="3" />
        <circle cx="58" cy="50" r="2.6" />
      </g>
      {ringEye(34, 30)}
    </>
  ),


  'moorish-idol': (
    <>
      <g {...ink}>
        <path d="M74 22C86 8 96 2 104 2c-4 12-12 24-22 32z" fill="#f6f6f2" />
        <path d="M88 44 108 34c-2 8-2 14 0 20z" fill="#e8c246" />
        <ellipse cx="52" cy="42" rx="32" ry="24" fill="#f6f6f2" />
        <path d="M38 20c6 12 6 32 0 44-6-2-10-6-12-10 4-8 4-16 0-24 2-4 6-8 12-10z" fill="#2b3f4a" />
        <path d="M66 22c6 12 6 30 0 42-5-2-8-4-10-8 4-8 4-18 0-26 2-4 5-6 10-8z" fill="#2b3f4a" />
        <path d="M24 34c-6 4-8 10-4 16" fill="#e8c246" />
      </g>
      {eye(30, 34, 3.2)}
    </>
  ),

  'atlantic-mudskipper': (
    <>
      <g {...ink}>
        <path d="M96 40 114 30c-3 7-3 13 0 20z" fill="#8a7a52" />
        <path d="M20 44c18-14 56-16 78-6-20 14-58 16-78 6z" fill="#9c8b5e" />
        <path d="M44 26c8-6 18-6 24 2-8 2-16 2-24-2z" fill="#8a7a52" />
        <path d="M34 50c-4 8-2 14 4 16 2-6 2-11 0-16z" fill="#8a7a52" />
        <path d="M60 52c-4 8-2 14 4 16 2-6 2-11 0-16z" fill="#8a7a52" />
        <circle cx="26" cy="28" r="7" fill="#9c8b5e" />
        <circle cx="38" cy="26" r="7" fill="#9c8b5e" />
      </g>
      {eye(26, 28, 3)}
      {eye(38, 26, 3)}
    </>
  ),


  'great-barracuda': (
    <>
      <g {...ink}>
        <path d="M100 40 118 28c-3 8-3 16 0 24z" fill="#9fb0bb" />
        <path d="M58 28c10-2 18 0 22 4z" fill="#9fb0bb" />
        <path d="M52 50c-2 8 0 12 6 13 1-5 0-9-2-13z" fill="#9fb0bb" />
        {/* A long cylinder that tapers to a jaw, not an oval. */}
        <path d="M2 40 24 32c26-6 60-4 78 4-18 8-52 12-78 6z" fill="#c2ced6" />
        <path d="M22 34c22 8 56 10 78 2" fill="none" strokeWidth={2} opacity=".5" />
      </g>
      <g stroke={O} strokeWidth={1.6} fill="none">
        <path d="M4 40 22 36M6 41l16 2" />
        <path d="M10 39v3M14 39.5v3M18 40v3" />
      </g>
      <g fill={O} opacity=".55">
        <circle cx="56" cy="46" r="2.4" /><circle cx="70" cy="44" r="2.2" />
        <circle cx="44" cy="48" r="2" />
      </g>
      {eye(24, 38, 3.2)}
    </>
  ),

  'giant-trevally': (
    <>
      <g {...ink}>
        <path d="M94 40 116 22c-5 12-5 24 0 36z" fill="#6f7f8d" />
        <path d="M44 16c12-4 22 2 26 10z" fill="#6f7f8d" />
        <path d="M42 64c12 4 22-2 26-10z" fill="#6f7f8d" />
        {/* Steep blunt forehead and a deep flank — the silhouette of a big jack. */}
        <path d="M14 44c2-16 16-28 36-28 22 0 38 10 46 24-16 16-38 24-58 24-14 0-24-8-24-20z"
              fill="#8a99a6" />
        <path d="M22 46c18 10 52 10 70-4" fill="none" strokeWidth={2.2} opacity=".45" />
      </g>
      {ringEye(28, 33, 5)}
    </>
  ),

  'giant-moray': (
    <>
      <g {...ink}>
        <path d="M108 58c-16 6-24-2-34-10-8-6-16-10-26-6-10 4-14 14-24 14-8 0-14-4-18-10 6 2 12 2 18-2 10-6 14-16 26-18 14-2 22 8 32 16 8 6 16 10 26 6z"
              fill="#6f7f4a" />
        <path d="M22 40c6-2 10-6 12-10" fill="none" strokeWidth={2.2} />
        <path d="M14 44c6 4 12 4 18 0" fill="#f0ede0" strokeWidth={2.4} />
      </g>
      <g fill="#4c5a30" opacity=".7">
        <circle cx="52" cy="34" r="3" /><circle cx="68" cy="40" r="2.6" />
        <circle cx="84" cy="48" r="2.6" /><circle cx="40" cy="42" r="2.4" />
      </g>
      {eye(20, 34, 2.8)}
    </>
  ),

  'bluestreak-cleaner-wrasse': (
    <>
      <g {...ink}>
        <path d="M100 40 116 30c-2 7-2 13 0 20z" fill="#3d6f9e" />
        <path d="M10 40c22-12 66-12 90-4-24 12-68 14-90 4z" fill="#5b8fc0" />
        <path d="M16 40c22 6 62 6 82-2" fill="none" stroke={O} strokeWidth={4} />
      </g>
      {eye(24, 37, 2.8)}
    </>
  ),

  'bumphead-parrotfish': (
    <>
      <g {...ink}>
        <path d="M92 40 114 26c-5 9-5 19 0 28z" fill="#3f7f6a" />
        <path d="M50 16c10-6 22-4 28 6z" fill="#3f7f6a" />
        <path d="M14 44c0-12 8-20 20-25 2-11 14-15 22-9 6 4 6 10 3 15 13 5 21 14 21 25-4 14-24 22-40 22S16 56 14 44z"
              fill="#4a9179" />
        <path d="M34 19c8-4 16-2 21 3" fill="none" strokeWidth={2.2} opacity=".5" />
        <path d="M22 46c8-8 14-10 20-8-4 6-4 10-2 14-8 2-14 0-18-6z" fill="#f0ede0" strokeWidth={2.4} />
      </g>
      {ringEye(34, 32, 5)}
    </>
  ),

  'blackspotted-puffer': (
    <>
      <g {...ink}>
        <path d="M96 40 112 28v24z" fill="#c9a24a" />
        <circle cx="56" cy="42" r="28" fill="#d7b158" />
        <path d="M34 24l-8-8M84 26l8-10M30 60l-10 8M82 60l10 8M56 12V2M56 74v8" fill="none" />
        <path d="M40 56c10 6 22 6 32 0" fill="none" strokeWidth={2.4} />
      </g>
      <g fill={O} opacity=".5">
        <circle cx="64" cy="48" r="3" /><circle cx="52" cy="56" r="2.4" />
        <circle cx="70" cy="34" r="2.4" />
      </g>
      {ringEye(42, 34)}
    </>
  ),

  'red-lionfish': (
    <>
      <g {...ink}>
        <path d="M50 18 44 2M60 16 60 0M70 18 78 2M40 62 30 78M54 66 52 80M68 64 78 78"
              fill="none" stroke="#b8452f" strokeWidth={4} />
        <path d="M92 42 110 32c-2 7-2 13 0 20z" fill="#b8452f" />
        <ellipse cx="54" cy="42" rx="32" ry="22" fill="#e0e0d8" />
        <path d="M40 22c4 12 4 28 0 40M56 20c4 12 4 32 0 44M72 24c4 10 4 26 0 36"
              fill="none" stroke="#b8452f" strokeWidth={6} strokeLinecap="butt" />
        <ellipse cx="54" cy="42" rx="32" ry="22" fill="none" />
      </g>
      {ringEye(30, 36)}
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Sharks, rays and the turtle                                         */
  /* ------------------------------------------------------------------ */

  'whitetip-reef-shark': (
    <>
      <g {...ink}>
        <path d="M102 40 116 30c-2 6-2 14 0 20z" fill="#7e8b93" />
        <path d="M50 22 58 6l12 18z" fill="#7e8b93" />
        <path d="M44 58l-6 12 14-6z" fill="#7e8b93" />
        {/* Blunter head and a deeper body than the blacktip — a cave shark, not a
            flats racer — so the two are told apart by shape as well as by tips. */}
        <path d="M12 42c6-16 22-24 44-24 22 0 38 8 46 22-14 16-34 22-50 22-18 0-34-8-40-20z"
              fill="#8e9ba3" />
        <path d="M16 46c14 10 54 14 84 0-30 6-64 4-84 0z" fill="#eef2f3" strokeWidth={2.4} />
      </g>
      <g fill="#fdfdfa" stroke={O} strokeWidth={2}>
        <path d="M54 14 58 6l5 8c-3-1-6-1-9 0z" />
        <path d="M110 32c2-1 4-2 6-2-1 3-1 7 0 10-2-1-4-2-6-3z" />
      </g>
      {eye(28, 38, 3.2)}
    </>
  ),

  'reef-manta-ray': (
    <>
      <g {...ink}>
        <path d="M60 62 58 78M60 62l4 16" fill="none" strokeWidth={2.6} />
        <path d="M60 20c-10 0-19 3-25 8-10 8-22 12-31 12 10 5 19 12 25 20 8-6 20-10 31-10s23 4 31 10c6-8 15-15 25-20-9 0-21-4-31-12-6-5-15-8-25-8z"
              fill="#4a6f96" />
        <path d="M46 26c-3-6-9-9-13-6-3 2-2 7 2 9M74 26c3-6 9-9 13-6 3 2 2 7-2 9" fill="#4a6f96" />
        <path d="M60 24c-6 10-6 26 0 36 6-10 6-26 0-36z" fill="#3a5c80" strokeWidth={2.2} />
      </g>
      {eye(48, 31, 3.2)}
      {eye(72, 31, 3.2)}
    </>
  ),

  'green-sea-turtle': (
    <>
      <g {...ink}>
        <path d="M26 30c-8-6-16-6-20 0 6 2 10 6 12 12M96 30c8-6 16-6 20 0-6 2-10 6-12 12" fill="#4f7f5c" />
        <path d="M30 58c-6 6-8 12-4 16 6-2 10-6 12-12M92 58c6 6 8 12 4 16-6-2-10-6-12-12" fill="#4f7f5c" />
        <path d="M100 34c8-4 14-2 16 4-4 6-10 8-16 6z" fill="#67a074" />
        <ellipse cx="60" cy="44" rx="34" ry="26" fill="#5c9268" />
        <path d="M60 18v52M32 34c18 8 38 8 56 0M32 56c18-8 38-8 56 0" fill="none" strokeWidth={2.4} opacity=".8" />
      </g>
      {eye(108, 36, 2.8)}
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Crustaceans                                                         */
  /* ------------------------------------------------------------------ */
  'sally-lightfoot-crab': (
    <>
      <g {...ink}>
        <path d="M30 34C22 26 16 24 8 26c6 2 10 6 12 12" fill="#e2603f" />
        <path d="M90 34c8-8 14-10 22-8-6 2-10 6-12 12" fill="#e2603f" />
        <path d="M34 54l-12 14M46 60l-6 16M74 60l6 16M86 54l12 14" fill="none" />
        <ellipse cx="60" cy="44" rx="28" ry="18" fill="#ea6d48" />
        <path d="M40 36c12-6 28-6 40 0" fill="none" strokeWidth={2.4} />
      </g>
      {ringEye(50, 34, 4.4)}
      {ringEye(70, 34, 4.4)}
    </>
  ),


  'peacock-mantis-shrimp': (
    <>
      <g {...ink}>
        <path d="M104 40 118 32c-2 5-2 11 0 16z" fill="#3f8f6a" />
        <path d="M28 34c-8-8-14-10-20-8 4 4 6 8 6 12" fill="#e0a23c" />
        <path d="M28 48c-8 8-14 10-20 8 4-4 6-8 6-12" fill="#e0a23c" />
        <path d="M26 40c14-10 62-12 78-4-16 12-64 14-78 4z" fill="#4aa87d" />
        <path d="M46 32v18M58 30v20M70 31v19M82 33v15" fill="none" stroke="#2f7357" strokeWidth={3} />
        <path d="M92 30c6 2 10 6 12 10" fill="none" strokeWidth={2.4} />
      </g>
      {ringEye(30, 30, 5)}
      {ringEye(30, 50, 5)}
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Echinoderms                                                         */
  /* ------------------------------------------------------------------ */

  'crown-of-thorns-starfish': (
    <>
      <g {...ink}>
        <path d="M60 6 72 30l26 2-18 18 6 26-26-14-26 14 6-26-18-18 26-2z" fill="#8f4a5c" />
        <path d="M60 6v-4M96 30l6-4M80 72l6 6M40 72l-6 6M24 30l-6-4M74 20l4-8M46 20l-4-8M88 46l8 2M32 46l-8 2"
              fill="none" stroke="#6e3546" strokeWidth={3.4} />
        <circle cx="60" cy="42" r="7" fill="#c98a97" strokeWidth={2.4} />
      </g>
      <g fill="#6e3546">
        <circle cx="60" cy="24" r="2.4" /><circle cx="74" cy="40" r="2.4" />
        <circle cx="46" cy="40" r="2.4" /><circle cx="52" cy="58" r="2.4" />
        <circle cx="68" cy="58" r="2.4" />
      </g>
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Molluscs                                                            */
  /* ------------------------------------------------------------------ */
  'common-octopus': (
    <>
      <g {...ink}>
        <path d="M40 52c-8 6-18 10-30 12 12 4 20 10 26 16 4-8 10-14 16-18z" fill="#a44b6e" />
        <path d="M80 52c8 6 18 10 30 12-12 4-20 10-26 16-4-8-10-14-16-18z" fill="#a44b6e" />
        <path d="M50 58c-4 10-6 16-4 22 6-4 10-10 14-16z" fill="#a44b6e" />
        <path d="M70 58c4 10 6 16 4 22-6-4-10-10-14-16z" fill="#a44b6e" />
        <path d="M60 8c-18 0-30 14-30 28 0 10 6 18 14 22h32c8-4 14-12 14-22 0-14-12-28-30-28z" fill="#bb5a80" />
      </g>
      {ringEye(46, 32, 6)}
      {ringEye(74, 32, 6)}
    </>
  ),

  'giant-clam': (
    <>
      <g {...ink}>
        <path d="M12 46c8-16 28-24 48-24s40 8 48 24c-14 8-32 12-48 12s-34-4-48-12z" fill="#cfd8da" />
        <path d="M12 46c14 12 32 18 48 18s34-6 48-18c-14 10-32 14-48 14s-34-4-48-14z" fill="#b7c3c6" />
        <path d="M60 22v24M40 25l-4 20M80 25l4 20M24 33l-4 12M96 33l4 12" fill="none" strokeWidth={2.4} opacity=".7" />
        <path d="M22 44c14 8 62 8 76 0-12 10-64 10-76 0z" fill="#3f8f8a" strokeWidth={2.4} />
      </g>
      <g fill="#7fd2c8">
        <circle cx="42" cy="46" r="2.6" /><circle cx="60" cy="48" r="2.6" />
        <circle cx="78" cy="46" r="2.6" />
      </g>
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Cnidarians                                                          */
  /* ------------------------------------------------------------------ */
  'staghorn-coral': (
    <>
      <g strokeLinejoin="round" strokeLinecap="round" fill="none">
        <path d="M42 76V50M42 56 26 38M42 60l14-14M26 38V22M56 46V28M26 30 16 20M56 36l10-10"
              stroke="#e0846f" strokeWidth={11} />
        <path d="M78 76V44M78 50 94 34M78 56 64 44M94 34V20M64 44V32M94 26l8-8"
              stroke="#e0846f" strokeWidth={11} />
        <path d="M42 76V50M42 56 26 38M42 60l14-14M26 38V22M56 46V28M26 30 16 20M56 36l10-10M78 76V44M78 50 94 34M78 56 64 44M94 34V20M64 44V32M94 26l8-8"
              stroke={O} strokeWidth={3} strokeOpacity=".22" />
        <path d="M24 74h72" stroke={O} strokeWidth={4} />
      </g>
      <g fill="#f6b8a6" stroke={O} strokeWidth={2}>
        <circle cx="16" cy="20" r="4" /><circle cx="26" cy="22" r="4" />
        <circle cx="66" cy="26" r="4" /><circle cx="56" cy="28" r="4" />
        <circle cx="94" cy="20" r="4" /><circle cx="102" cy="18" r="4" />
        <circle cx="64" cy="32" r="4" />
      </g>
    </>
  ),

  'table-coral': (
    <>
      <g {...ink}>
        <path d="M52 76V44h16v32z" fill="#c98f6a" />
        <path d="M8 42c14-12 34-18 52-18s38 6 52 18c-14 8-34 12-52 12S22 50 8 42z" fill="#e0a377" />
        <path d="M8 42c14 8 34 12 52 12s38-4 52-12" fill="none" strokeWidth={2.4} />
        <path d="M28 74h64" strokeWidth={4} />
      </g>
      <g fill="#f3c9a8">
        <circle cx="30" cy="34" r="3" /><circle cx="46" cy="30" r="3" />
        <circle cx="62" cy="29" r="3" /><circle cx="78" cy="31" r="3" />
        <circle cx="92" cy="35" r="3" />
      </g>
    </>
  ),

  'bubble-tip-anemone': (
    <>
      <g {...ink}>
        <path d="M44 76 46 52c0-6 28-6 28 0l2 24z" fill="#a86a9e" />
        <path d="M46 52c-8-8-16-14-24-16M52 48c-6-10-12-20-18-26M58 46c-2-12-4-22-6-32M64 46c2-12 4-22 6-32M70 48c6-10 12-20 18-26M74 52c8-8 16-14 24-16"
              fill="none" stroke="#c47fb6" strokeWidth={5} />
      </g>
      <g fill="#f0b6de" stroke={O} strokeWidth={2}>
        <circle cx="22" cy="36" r="5" /><circle cx="34" cy="26" r="5" />
        <circle cx="52" cy="14" r="5" /><circle cx="70" cy="14" r="5" />
        <circle cx="88" cy="26" r="5" /><circle cx="98" cy="36" r="5" />
      </g>
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Filling out the taxa                                            */
  /* ------------------------------------------------------------------ */
  'giant-triton': (
    <>
      <g {...ink}>
        {/* The foot and the siphon, out of the aperture at the wide end. */}
        <path d="M30 60c-11 5-19 6-25 3 7-3 12-8 15-14" fill="#e8dcc0" />
        {/*
          A spired shell, built whorl by whorl instead of freehand: five turns
          on one diagonal, each smaller than the last, each drawn over the one
          before so the overlaps read as the steps of a spiral. The old outline
          was a single curve and came out as a croissant — and the spiral is
          the only thing this animal is recognised by.
        */}
        <g transform="rotate(-32 60 40)">
          <ellipse cx="38" cy="40" rx="24" ry="20" fill="#e0c98f" />
          <ellipse cx="59" cy="40" rx="18" ry="15" fill="#eddcae" />
          <ellipse cx="75" cy="40" rx="13" ry="11" fill="#e0c98f" />
          <ellipse cx="87" cy="40" rx="9" ry="7.5" fill="#eddcae" />
          <ellipse cx="96" cy="40" rx="5.5" ry="4.5" fill="#e0c98f" />
        </g>
        {/* The aperture: the opening the animal comes out of. */}
        <ellipse cx="33" cy="57" rx="11" ry="8" transform="rotate(-32 33 57)" fill="#f7efd8" />
      </g>
      {/* Charonia is banded in chestnut across every whorl. */}
      <g fill="none" stroke="#a8763f" strokeWidth={2.6} strokeLinecap="round" opacity=".85">
        <path d="M46 36c6 4 9 10 9 16M64 26c5 3 8 8 8 13M79 18c4 2 6 6 6 10" />
      </g>
      {eye(20, 56, 2.6)}
    </>
  ),

  'blue-ringed-octopus': (
    <>
      <g {...ink}>
        <path d="M40 54c-10 6-20 10-32 12 12 4 20 10 26 16 4-8 10-16 16-20z" fill="#c9a24a" />
        <path d="M80 54c10 6 20 10 32 12-12 4-20 10-26 16-4-8-10-16-16-20z" fill="#c9a24a" />
        <path d="M52 60c-4 10-6 16-4 22 6-4 10-10 14-16z" fill="#c9a24a" />
        <path d="M68 60c4 10 6 16 4 22-6-4-10-10-14-16z" fill="#c9a24a" />
        <path d="M60 10c-17 0-28 13-28 26 0 10 6 17 13 21h30c7-4 13-11 13-21 0-13-11-26-28-26z" fill="#d9b45c" />
      </g>
      {/* The rings, which is the entire warning the animal gives. */}
      <g fill="none" stroke="#2f6fb5" strokeWidth={2.6}>
        <circle cx="44" cy="46" r="4" /><circle cx="60" cy="52" r="4" />
        <circle cx="76" cy="46" r="4" /><circle cx="50" cy="24" r="3.6" />
        <circle cx="72" cy="24" r="3.6" /><circle cx="61" cy="16" r="3.4" />
      </g>
      {ringEye(46, 34, 5)}
      {ringEye(74, 34, 5)}
    </>
  ),

  'bigfin-reef-squid': (
    <>
      <g {...ink}>
        {/* Arms and two longer tentacles, streaming ahead of the head. */}
        <path d="M40 34 10 24M40 38 8 34M40 42 8 44M40 46 10 54M40 50 14 62" fill="none" stroke="#c98fb0" strokeWidth={4} />
        <path d="M40 30 6 14M40 54 8 66" fill="none" stroke="#b87fa0" strokeWidth={3} />
        {/* The fin runs the length of the mantle — the animal's whole name. */}
        <path d="M56 22c22-6 44-4 56 4-12 8-34 10-56 4z" fill="#c98fb0" />
        <path d="M56 58c22 6 44 4 56-4-12-8-34-10-56-4z" fill="#c98fb0" />
        <path d="M42 40c0-10 8-16 22-16 24 0 44 7 52 16-8 9-28 16-52 16-14 0-22-6-22-16z" fill="#dcb0c6" />
      </g>
      <g fill="#a8607f" opacity=".5">
        <circle cx="72" cy="32" r="2.6" /><circle cx="88" cy="36" r="2.4" />
        <circle cx="78" cy="47" r="2.4" />
      </g>
      {ringEye(48, 33, 5)}
      {ringEye(48, 48, 5)}
    </>
  ),

  'long-spined-urchin': (
    <>
      <g {...ink}>
        {/* Longer and thinner than the rock-borer, and far more of them. */}
        <path d="M60 40 60 0M60 40 60 80M60 40 18 40M60 40 102 40M60 40 30 10M60 40 90 70M60 40 30 70M60 40 90 10M60 40 42 2M60 40 78 78M60 40 20 58M60 40 100 22M60 40 22 24M60 40 98 56"
              fill="none" stroke="#2f3140" strokeWidth={3} />
        <circle cx="60" cy="40" r="15" fill="#3d4054" />
        <circle cx="60" cy="40" r="5" fill="#e8a13c" strokeWidth={2.2} />
      </g>
    </>
  ),

  'blue-sea-star': (
    <>
      <g {...ink}>
        <path d="M60 4 74 32l30 4-22 21 5 31-27-15-27 15 5-31-22-21 30-4z" fill="#3f76c4" />
        <circle cx="60" cy="42" r="6" fill="#2a5794" strokeWidth={2.4} />
      </g>
      <g fill="#79a6e0">
        <circle cx="60" cy="22" r="2.6" /><circle cx="76" cy="40" r="2.6" />
        <circle cx="44" cy="40" r="2.6" /><circle cx="51" cy="60" r="2.6" />
        <circle cx="69" cy="60" r="2.6" />
      </g>
    </>
  ),

  'sea-cucumber': (
    <>
      <g {...ink}>
        <path d="M14 46c0-12 12-20 46-20s46 8 46 20-12 18-46 18-46-6-46-18z" fill="#4a4238" />
        {/* Papillae along the back, which is how you tell it from a rock. */}
        <path d="M28 30l-3-10M42 26l-2-11M58 25l0-12M74 26l2-11M90 30l4-10"
              fill="none" stroke="#5d5346" strokeWidth={4} />
        <path d="M22 48c18 8 62 8 78-2" fill="none" strokeWidth={2.2} opacity=".5" />
      </g>
      <g fill="#8a7a62">
        <circle cx="34" cy="42" r="2.6" /><circle cx="52" cy="46" r="2.6" />
        <circle cx="70" cy="44" r="2.6" /><circle cx="88" cy="42" r="2.6" />
      </g>
    </>
  ),

  'banded-coral-shrimp': (
    <>
      <g {...ink}>
        {/* The white antennae it advertises with. */}
        <path d="M36 30 8 8M36 36 6 22" fill="none" stroke="#f2f2ec" strokeWidth={3} />
        <path d="M40 30c-8-8-14-10-20-8 6 2 10 6 12 12" fill="#d84a4a" />
        <path d="M40 52c-8 8-14 10-20 8 6-2 10-6 12-12" fill="#d84a4a" />
        <path d="M40 42c14-10 48-12 66-4-16 12-52 14-66 4z" fill="#f2f2ec" />
        <path d="M56 34v18M70 33v20M84 35v16" fill="none" stroke="#d84a4a" strokeWidth={6} strokeLinecap="butt" />
        <path d="M100 38 116 32c-2 5-2 11 0 16z" fill="#d84a4a" />
      </g>
      {eye(42, 38, 2.8)}
    </>
  ),

  'coconut-crab': (
    <>
      <g {...ink}>
        <path d="M32 40C22 38 12 40 6 48c8-1 14 1 18 5" fill="#6b3f8c" />
        <path d="M24 53c-8-2-14-6-18-5 6 8 16 10 24 8z" fill="#5a3577" />
        <path d="M88 40c10-2 20 0 26 8-8-1-14 1-18 5" fill="#6b3f8c" />
        <path d="M96 53c8-2 14-6 18-5-6 8-16 10-24 8z" fill="#5a3577" />
        <path d="M32 56 18 72M46 62l-8 16M74 62l8 16M88 56l14 16" fill="none" strokeWidth={3.4} />
        <ellipse cx="60" cy="46" rx="30" ry="19" fill="#7d4aa0" />
        <path d="M38 38c14-7 30-7 44 0" fill="none" strokeWidth={2.4} />
      </g>
      {ringEye(50, 36, 4.6)}
      {ringEye(70, 36, 4.6)}
    </>
  ),

  'banded-sea-krait': (
    <>
      <g {...ink}>
        <path d="M108 62c-14 6-22-2-30-10-8-8-14-14-24-12-12 2-16 14-28 14-10 0-18-6-22-14 8 4 14 4 20 0 10-8 14-20 28-22 16-2 24 10 34 20 8 8 14 12 22 10z"
              fill="#e8e4d6" />
      </g>
      {/* The bands, which are the whole animal. */}
      <g stroke={O} strokeWidth={5} fill="none" strokeLinecap="round">
        <path d="M22 34c2 6 2 10 0 14M40 26c3 7 3 13 0 19M58 30c3 7 3 13 0 19M76 42c3 6 3 11 0 16M94 54c3 5 3 9 0 13" />
      </g>
      {eye(14, 38, 2.6)}
    </>
  ),

  'hawksbill-turtle': (
    <>
      <g {...ink}>
        <path d="M26 30c-8-6-16-6-20 0 6 2 10 6 12 12M96 30c8-6 16-6 20 0-6 2-10 6-12 12" fill="#8a6a3a" />
        <path d="M30 58c-6 6-8 12-4 16 6-2 10-6 12-12M92 58c6 6 8 12 4 16-6-2-10-6-12-12" fill="#8a6a3a" />
        {/* The hooked beak it is named for. */}
        <path d="M100 34c8-4 14-2 16 4-3 5-8 7-14 6z" fill="#a5814a" />
        <path d="M114 36c3 1 4 3 3 5-2 1-4 0-5-2z" fill={O} />
        <ellipse cx="60" cy="44" rx="34" ry="26" fill="#9a7541" />
        {/* Overlapping plates, the tortoiseshell pattern. */}
        <path d="M60 18v52M32 34c18 8 38 8 56 0M32 56c18-8 38-8 56 0M44 20l-6 48M76 20l6 48"
              fill="none" strokeWidth={2.2} opacity=".75" />
      </g>
      {eye(107, 36, 2.6)}
    </>
  ),

  'fire-coral': (
    <>
      <g {...ink}>
        {/* Flat plates and blades, not branches — Millepora is not a true coral. */}
        <path d="M24 72V48c0-12 8-22 16-26-2 10-2 18 0 26 6-8 14-14 22-16-4 10-6 18-4 26 6-6 14-10 22-10-6 8-10 16-10 24z"
              fill="#e07a34" />
        <path d="M70 72V56c0-10 8-18 18-22-4 8-6 14-6 22 6-4 12-6 18-6-6 6-10 12-10 22z"
              fill="#e88f4e" />
        <path d="M18 72h84" strokeWidth={4} />
      </g>
      <g fill="#f6c26a">
        <circle cx="40" cy="24" r="3.4" /><circle cx="62" cy="30" r="3.4" />
        <circle cx="86" cy="36" r="3.4" /><circle cx="102" cy="52" r="3.2" />
      </g>
    </>
  ),

  'brain-coral': (
    <>
      <g {...ink}>
        <path d="M10 56c0-24 22-40 50-40s50 16 50 40c-16 10-34 14-50 14s-34-4-50-14z" fill="#c9a86a" />
        <path d="M26 74h68" strokeWidth={4} />
      </g>
      {/* The meandering ridges, which are the only thing that says "brain". */}
      <g fill="none" stroke={O} strokeWidth={2.6} opacity=".7">
        <path d="M22 50c8-8 14 4 22-4s14 4 22-4 14 4 22-4 12 3 18-2" />
        <path d="M20 60c8-8 14 4 22-4s14 4 22-4 14 4 22-4 14 4 20-2" />
        <path d="M30 38c8-8 14 4 22-4s14 4 22-4 12 3 18-1" />
      </g>
    </>
  ),

  'sea-fan': (
    <>
      <g strokeLinejoin="round" strokeLinecap="round" fill="none">
        {/* A flat lattice standing across the current. */}
        <path d="M60 74V52" stroke="#a8478c" strokeWidth={8} />
        <path d="M60 54 30 26M60 54 44 18M60 54 60 12M60 54 76 18M60 54 90 26"
              stroke="#b8579c" strokeWidth={6} />
        <path d="M38 34c14-6 30-6 44 0M32 44c18-6 38-6 56 0M46 24c10-4 18-4 28 0"
              stroke="#b8579c" strokeWidth={4} />
        <path d="M42 74h36" stroke={O} strokeWidth={4} />
      </g>
      <g fill="#e0a0cc" opacity=".9">
        <circle cx="30" cy="26" r="3.4" /><circle cx="44" cy="18" r="3.4" />
        <circle cx="60" cy="12" r="3.4" /><circle cx="76" cy="18" r="3.4" />
        <circle cx="90" cy="26" r="3.4" />
      </g>
    </>
  ),

  'spotted-eagle-ray': (
    <>
      <g {...ink}>
        <path d="M60 58 58 80M60 58l5 22" fill="none" strokeWidth={2.4} />
        {/* Sharper, more swept wings than the manta, and a pointed snout. */}
        <path d="M60 14c-6 0-11 4-14 10-8 12-24 22-42 28 16 2 30 6 40 12 6-4 10-6 16-6s10 2 16 6c10-6 24-10 40-12-18-6-34-16-42-28-3-6-8-10-14-10z"
              fill="#2f3f57" />
        <path d="M60 14c-4 6-6 14-6 22h12c0-8-2-16-6-22z" fill="#25334a" strokeWidth={2.2} />
      </g>
      <g fill="#e8eef4">
        <circle cx="34" cy="42" r="2.8" /><circle cx="48" cy="46" r="2.6" />
        <circle cx="72" cy="46" r="2.6" /><circle cx="86" cy="42" r="2.8" />
        <circle cx="42" cy="34" r="2.4" /><circle cx="78" cy="34" r="2.4" />
      </g>
      {eye(50, 26, 2.8)}
      {eye(70, 26, 2.8)}
    </>
  ),

  'tawny-nurse-shark': (
    <>
      <g {...ink}>
        <path d="M104 40 118 30c-2 6-2 14 0 20z" fill="#a8895c" />
        <path d="M52 24 58 10l10 16z" fill="#a8895c" />
        <path d="M74 26 80 14l8 14z" fill="#a8895c" />
        <path d="M46 58l-6 12 14-6z" fill="#a8895c" />
        {/* Blunt, heavy and slow — nothing like the two reef sharks. */}
        <path d="M10 44c4-14 20-22 44-22 24 0 44 8 54 20-14 16-36 22-56 22-22 0-40-8-42-20z"
              fill="#bb9a68" />
        <path d="M14 48c16 10 58 12 88-2-32 6-68 6-88 2z" fill="#efe6d2" strokeWidth={2.4} />
        {/* The barbels it feels for prey with. */}
        <path d="M14 48c-4 4-6 8-4 12M20 50c-3 5-4 9-2 12" fill="none" strokeWidth={2.2} />
      </g>
      {eye(28, 38, 3)}
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Levelling the thin taxa                                         */
  /* ------------------------------------------------------------------ */
  'olive-sea-snake': (
    <>
      <g {...ink}>
        <path d="M110 30c-12-8-20-2-28 6-8 8-14 16-24 16-12 0-18-10-30-10-8 0-16 4-22 12 10-2 16 2 24 6 10 5 18 6 28-2 10-8 16-18 26-20 8-2 16 2 26-8z"
              fill="#6f7a4a" />
        <path d="M14 54c-4 4-6 8-4 12 6-2 10-6 12-10" fill="#6f7a4a" />
      </g>
      <g stroke="#3d4530" strokeWidth={4} fill="none" strokeLinecap="round">
        <path d="M34 46c2 5 2 8 0 12M52 46c2 5 2 8 0 11M70 36c2 5 2 8 0 11M88 28c2 4 2 7 0 10" />
      </g>
      {eye(106, 30, 2.6)}
    </>
  ),

  'loggerhead-turtle': (
    <>
      <g {...ink}>
        <path d="M24 28c-8-6-16-6-20 0 6 2 10 6 12 12M94 28c8-6 16-6 20 0-6 2-10 6-12 12" fill="#8a4a34" />
        <path d="M28 58c-6 6-8 12-4 16 6-2 10-6 12-12M90 58c6 6 8 12 4 16-6-2-10-6-12-12" fill="#8a4a34" />
        {/* An outsized head — the whole point of the animal. */}
        <path d="M96 30c12-4 20 0 20 8s-8 12-20 8z" fill="#a85c40" />
        <ellipse cx="58" cy="44" rx="33" ry="25" fill="#9c5439" />
        <path d="M58 19v50M30 34c18 8 38 8 56 0M30 54c18-8 38-8 56 0" fill="none" strokeWidth={2.2} opacity=".7" />
      </g>
      {eye(106, 34, 2.8)}
      <path d="M112 42c3 1 5 3 4 5-2 1-5 0-6-2z" fill={O} />
    </>
  ),

  'grey-reef-shark': (
    <>
      <g {...ink}>
        <path d="M102 40 118 26c-2 9-2 19 0 28z" fill="#5e6a72" />
        <path d="M50 20 58 2l12 20z" fill="#5e6a72" />
        <path d="M40 56l-6 14 16-8z" fill="#5e6a72" />
        <path d="M12 42c14-16 58-22 88-2-30 20-74 16-88 2z" fill="#6f7c85" />
        <path d="M16 44c14 10 54 14 84 0-30 6-64 4-84 0z" fill="#e2e8ea" strokeWidth={2.4} />
      </g>
      {/* The dark trailing edge along the tail, and a heavier build. */}
      <path d="M104 54c4 2 8 4 12 4-2-4-3-8-3-11z" fill={O} />
      {eye(28, 38, 3.4)}
    </>
  ),

  'blue-spotted-ribbontail-ray': (
    <>
      <g {...ink}>
        {/* A long ribbon tail with the two barbs, behind a rounded disc. */}
        <path d="M60 60c2 10 4 16 6 20" fill="none" strokeWidth={4} stroke="#c8a33e" />
        <path d="M64 72l4 8" fill="none" strokeWidth={3} stroke="#c8a33e" />
        <path d="M63 66l4 4M62 60l4 4" fill="none" strokeWidth={2} />
        {/* Wings that sweep back, not a flat oval. */}
        <path d="M58 14c-12 0-22 6-30 16-6 8-16 14-24 16 10 4 20 10 26 16 8-4 18-6 28-6s20 2 28 6c6-6 16-12 26-16-8-2-18-8-24-16-8-10-18-16-30-16z"
              fill="#d0aa42" />
        <path d="M20 42c10 4 18 8 24 12M96 42c-10 4-18 8-24 12" fill="none" strokeWidth={2} opacity=".4" />
      </g>
      <g fill="#2f6fb5" stroke={O} strokeWidth={1.4}>
        <circle cx="40" cy="34" r="3.4" /><circle cx="56" cy="26" r="3.4" />
        <circle cx="72" cy="30" r="3.4" /><circle cx="84" cy="40" r="3.2" />
        <circle cx="46" cy="48" r="3.2" /><circle cx="62" cy="46" r="3.4" />
        <circle cx="76" cy="50" r="3" /><circle cx="30" cy="42" r="3" />
      </g>
      {eye(50, 20, 2.6)}
      {eye(66, 20, 2.6)}
    </>
  ),

  'harlequin-shrimp': (
    <>
      <g {...ink}>
        {/* Side on: arched segmented body, tail fan behind, legs beneath. */}
        <path d="M96 56 116 48c-4 6-4 12 0 18-8-2-14-4-20-10z" fill="#f0e4ef" />
        <path d="M40 40c14-16 46-14 58 6-10 12-30 16-46 10-8-3-14-9-12-16z" fill="#f4ecf2" />
        <path d="M52 60l-4 14M64 62l-2 14M76 62l2 14M88 60l6 12" fill="none" strokeWidth={2.6} />
        {/* The absurd flattened claws it holds out in front. */}
        <path d="M36 32c-10-8-20-8-26 0 6 6 18 8 26 4z" fill="#f0e4ef" />
        <path d="M34 46c-10 2-20 8-24 16 8 2 20-2 26-8z" fill="#f0e4ef" />
        <path d="M30 26 14 10M28 30 10 20" fill="none" stroke="#e8d8e8" strokeWidth={2.6} />
      </g>
      <g fill="#a8497e" opacity=".92">
        <circle cx="58" cy="38" r="5" /><circle cx="76" cy="40" r="5" />
        <circle cx="66" cy="52" r="4.4" /><circle cx="88" cy="50" r="4" />
        <circle cx="20" cy="30" r="4" /><circle cx="20" cy="56" r="4" />
      </g>
      {eye(42, 36, 2.8)}
    </>
  ),


  'feather-star': (
    <>
      <g strokeLinejoin="round" strokeLinecap="round" fill="none">
        {/* Arms curling up and out of a central disc, feathered along each side. */}
        <path d="M60 56 34 26M60 56 48 16M60 56 60 12M60 56 72 16M60 56 86 26"
              stroke="#c2482f" strokeWidth={6} />
        <path d="M42 40l-8-4M38 34l-7-6M52 30l-8-3M49 22l-7-4M56 26h-8M56 18h-8M68 30l8-3M71 22l7-4M78 40l8-4M82 34l7-6"
              stroke="#d4643f" strokeWidth={3} />
        <path d="M60 56v16M52 72h16" stroke={O} strokeWidth={4} />
      </g>
      <circle cx="60" cy="54" r="6" fill="#e8b06a" stroke={O} strokeWidth={2.4} />
    </>
  ),

  'spanish-dancer': (
    <>
      <g {...ink}>
        {/* The mantle unrolled into a swimming skirt, wavy along the trailing edge. */}
        <path d="M20 42c6-15 24-23 42-23s34 8 40 23c-8 3-12 10-19 10-6 0-8-6-14-6s-9 8-16 8-9-8-15-8-9 6-14 6c-4 0-4-6-4-10z"
              fill="#c8382e" />
        {/* Rhinophores: the pair of horns it steers with. */}
        <path d="M38 24l-5-12M52 21V9" fill="none" strokeWidth={4.5} />
        {/* Six gills in a rosette at the back end. */}
        <path d="M94 28c8-4 15-2 17 5-6-1-11 1-14 5" fill="#e07d6c" />
      </g>
      <path d="M26 41c8 8 21 12 36 12s26-4 34-12" fill="none" stroke="#fdfdfa"
            strokeWidth={3.4} strokeLinecap="round" />
      <g fill="#8f231d" opacity=".5">
        <ellipse cx="58" cy="29" rx="9" ry="5" /><ellipse cx="78" cy="34" rx="7" ry="4" />
      </g>
      {eye(42, 29, 3.2)}
    </>
  ),

  'warty-frogfish': (
    <>
      <g {...ink}>
        <path d="M98 42 114 32v22z" fill="#d98a3c" />
        {/* A lumpy round body that walks rather than swims. */}
        <path d="M22 44c0-17 15-28 35-28s41 10 41 27c0 16-17 26-39 26S22 60 22 44z" fill="#e8a04e" />
        {/* Illicium and esca: the rod on its head, and the lure on the end of it. */}
        <path d="M34 20 29 9" fill="none" strokeWidth={3.4} />
        <circle cx="28" cy="7" r="4.6" fill="#fdfdfa" />
        {/* The mouth, enormous and turned up. */}
        <path d="M23 47c8 8 20 10 30 6" fill="none" strokeWidth={3.4} />
        {/* The pectoral fin it walks on. */}
        <path d="M54 68c-2 8 3 11 9 10" fill="none" strokeWidth={4} />
      </g>
      <g fill="#b4652a" opacity=".55">
        <circle cx="64" cy="32" r="4" /><circle cx="82" cy="44" r="3.4" />
        <circle cx="54" cy="54" r="3" /><circle cx="74" cy="60" r="3" />
      </g>
      {ringEye(38, 32, 5)}
    </>
  ),

  'mandarinfish': (
    <>
      <g {...ink}>
        <path d="M92 40 110 29v22z" fill="#2f6fa8" />
        <path d="M40 20c10-9 24-9 32 0" fill="#e8873a" />
        <ellipse cx="56" cy="40" rx="34" ry="22" fill="#2f6fa8" />
      </g>
      {/* The swirls, which are the entire reason anyone knows this fish. */}
      <g fill="none" stroke="#e8873a" strokeWidth={4.6} strokeLinecap="round">
        <path d="M34 33c7-6 16-4 20 2M38 49c6 4 14 3 19-3M64 29c6 3 11 9 12 15M68 51c5-2 9-6 11-11" />
      </g>
      <g fill="none" stroke="#1f8f6a" strokeWidth={2.6} strokeLinecap="round">
        <path d="M36 41c7 2 14 1 19-2M60 43c6 2 11 1 15-2" />
      </g>
      <ellipse cx="56" cy="40" rx="34" ry="22" fill="none" {...ink} />
      {/* The fan-shaped pectoral it holds out like a hand. */}
      <ellipse cx="56" cy="53" rx="13" ry="9" fill="#e8873a" {...ink} strokeWidth={2.6} />
      {ringEye(36, 33, 5)}
    </>
  ),

  'box-jellyfish': (
    <>
      <g {...ink}>
        {/* A bunch of tentacles from each of the four corners of the bell. */}
        <path d="M26 44c-4 14 2 22-3 32M34 46c-2 16 3 22-1 30M46 48c-1 14 2 20-1 28M58 48v28M70 48c1 14-2 20 1 28M82 46c2 16-3 22 1 30M90 44c4 14-2 22 3 32"
              fill="none" stroke="#6fa9bd" strokeWidth={3} />
        {/* A bell with corners, which is where the name comes from. */}
        <path d="M32 12h52l8 32c-16 6-52 6-68 0z" fill="#c9e9ef" />
        <path d="M44 15v27M72 15v27" fill="none" strokeWidth={2.2} />
      </g>
      {/* Two of its twenty-four eyes, set into the rim of the bell. */}
      <g fill={O}><circle cx="50" cy="30" r="3" /><circle cx="66" cy="30" r="3" /></g>
    </>
  ),

  'mushroom-coral': (
    <>
      <ellipse cx="58" cy="44" rx="38" ry="24" fill="#d98f5e" />
      {/* Septa: the radial plates, which is most of what this animal is. */}
      <g fill="none" stroke="#a8602f" strokeWidth={2.4} strokeLinecap="round">
        <path d="M58 44 88 44M58 44 88 54M58 44 73 63M58 44 58 63M58 44 43 63M58 44 31 55M58 44 28 44M58 44 31 33M58 44 43 25M58 44 58 25M58 44 73 25M58 44 85 33" />
      </g>
      <ellipse cx="58" cy="44" rx="11" ry="5" fill="#8f4a24" stroke={O} strokeWidth={2.4} />
      <ellipse cx="58" cy="44" rx="38" ry="24" fill="none" {...ink} />
    </>
  ),

  'tasselled-wobbegong': (
    <>
      <g {...ink}>
        <path d="M84 42c10-2 18-8 26-14-4 10-4 18 0 28-8-6-16-12-26-14z" fill="#b58f4a" />
        {/* Seen from above, because it never leaves the sand. */}
        <path d="M18 42c0-13 10-20 26-20 22 0 40 8 44 20-4 12-22 20-44 20-16 0-26-7-26-20z" fill="#c9a45e" />
        {/* Pectorals spread flat, the way a carpet shark rests. */}
        <path d="M48 61c-4 8-2 13 6 15M48 23c-4-8-2-13 6-15" fill="#b58f4a" />
        {/* The fringe of skin tassels round the whole front of the head. */}
        <path d="M19 34l-9-5M16 40l-10-3M16 45l-10 3M19 51l-9 5M25 29l-6-8M25 56l-6 8M32 26l-3-9M32 59l-3 9"
              fill="none" strokeWidth={3} />
        <path d="M20 42h18" fill="none" strokeWidth={3} />
      </g>
      <g fill="#8a6428" opacity=".45">
        <ellipse cx="54" cy="32" rx="9" ry="5" /><ellipse cx="76" cy="36" rx="7" ry="4" />
        <ellipse cx="60" cy="52" rx="10" ry="5" /><ellipse cx="80" cy="50" rx="6" ry="4" />
      </g>
      {eye(38, 34, 3)}
    </>
  ),
};

export interface SpeciesArtProps {
  definitionId: string;
  className?: string;
}

/**
 * The drawing for a species, or nothing.
 *
 * A missing entry renders nothing rather than a placeholder: a card with no art
 * should look like a card with no art, not like a card whose art failed.
 */
export function SpeciesArt({ definitionId, className = 'art' }: SpeciesArtProps) {
  const art = ART[definitionId];
  if (!art) return null;
  return (
    <svg className={className} viewBox="0 0 120 80" role="presentation" aria-hidden="true">
      {art}
    </svg>
  );
}

/** Whether a species has a drawing. Used by the tests to keep the set honest. */
export function hasArt(definitionId: string): boolean {
  return definitionId in ART;
}
