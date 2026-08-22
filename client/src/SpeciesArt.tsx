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
        <path d="M68 36 106 24c-3 10-3 22 0 32L68 44c2-3 2-5 0-8z" fill="#2b3f4a" />
        <path d="M46 16c10-6 22-2 26 8z" fill="#2b3f4a" />
        <path d="M44 64c10 6 24 2 28-8z" fill="#2b3f4a" />
        <ellipse cx="54" cy="40" rx="36" ry="24" fill="#33505e" />
        <path d="M60 22c10-2 18 2 22 8" fill="none" stroke="#e8c246" strokeWidth={5} />
        {/* Big round blotches over the lower half. Merged into one patch they
            read as a mouth, which is what the last drawing did. */}
        <g fill="#f6f6f2" strokeWidth={2.2}>
          <circle cx="34" cy="48" r="6" /><circle cx="48" cy="55" r="7" />
          <circle cx="63" cy="52" r="5.5" /><circle cx="75" cy="46" r="4.5" />
        </g>
        <path d="M20 44c4 3 8 4 12 3" fill="none" stroke="#e8873a" strokeWidth={3} />
      </g>
      {ringEye(34, 30)}
    </>
  ),


  'moorish-idol': (
    <>
      <g {...ink}>
        <path d="M68 38 104 26c-2 10-2 18 0 26L68 46c2-3 2-5 0-8z" fill="#e8c246" />
        <path d="M74 22C86 8 96 2 104 2c-4 12-12 24-22 32z" fill="#f6f6f2" />
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
        {/* Every fin's base edge is drawn inside the outline, so the body's own
            fill closes over it. A fin that meets the body at a single point
            reads as a fin floating beside the fish. */}
        <path d="M94 31 118 20c-3 10-3 20 0 30L94 40c3-4 3-6 0-9z" fill="#8fa2b0" />
        <path d="M54 26 62 12 72 27z" fill="#8fa2b0" />
        <path d="M78 27 84 17 90 28z" fill="#8fa2b0" />
        <path d="M52 44 58 58 68 46z" fill="#8fa2b0" />
        {/* A long cylinder that tapers to a jaw, not an oval. */}
        <path d="M2 40 22 28c28-8 62-6 82 8-20 10-54 14-82 6z" fill="#a9bac6" />
        <path d="M22 32c22 8 56 10 78 2" fill="none" strokeWidth={2} opacity=".5" />
      </g>
      <g stroke={O} strokeWidth={1.6} fill="none">
        <path d="M4 40 22 35M5 41l17 3" />
        <path d="M10 38v3.5M14 38.5v3.5M18 39v3.5" />
      </g>
      <g fill={O} opacity=".45">
        <circle cx="58" cy="41" r="2.6" /><circle cx="72" cy="40" r="2.4" />
        <circle cx="86" cy="39" r="2.2" />
      </g>
      {eye(24, 36, 3.2)}
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
      {/* Body drawn as a coloured stroke over a heavier dark one, so the
          mottling laid over it afterwards cannot spill past the edge.
          Chocolate and gold, not olive: at card size the olive read as the
          olive sea snake, and two long green animals in one set is one too many. */}
      <path d="M26 36c16-14 28 12 44 6 14-5 24 12 36 6" fill="none" stroke={O}
            strokeWidth={20} strokeLinecap="round" />
      <path d="M26 36c16-14 28 12 44 6 14-5 24 12 36 6" fill="none" stroke="#6b4632"
            strokeWidth={14} strokeLinecap="round" />
      <g {...ink}>
        {/* The head, and the jaw it holds open to breathe. */}
        <path d="M28 25c-11-1-20 4-22 12 5 4 12 6 19 6 8 0 14-3 17-8z" fill="#7d543c" />
        <path d="M7 39c5 4 12 6 19 6 5 0 10-1 13-3-5 6-13 9-21 8-6-1-10-5-11-11z"
              fill="#f0ede0" strokeWidth={2.2} />
      </g>
      {/* The leopard rosettes it is patterned with. */}
      <g fill="#dfa94a" opacity=".9">
        <circle cx="26" cy="28" r="2.4" /><circle cx="48" cy="36" r="3.2" />
        <circle cx="57" cy="40" r="2.6" /><circle cx="66" cy="42" r="3.4" />
        <circle cx="75" cy="41" r="2.6" /><circle cx="84" cy="43" r="3" />
        <circle cx="92" cy="46" r="2.4" /><circle cx="100" cy="48" r="2.8" />
      </g>
      {eye(18, 31, 2.8)}
    </>
  ),

  'bluestreak-cleaner-wrasse': (
    <>
      <g {...ink}>
        <path d="M92 32 116 24c-2 8-2 16 0 24L92 42c2-4 2-6 0-10z" fill="#3d6f9e" />
        <path d="M8 40c24-14 68-14 92-6-24 14-70 16-92 6z" fill="#5b8fc0" />
      </g>
      {/* The streak itself: a wedge down the flank, thin at the snout and
          broad at the tail, which is how the fish is recognised underwater. */}
      <path d="M14 37c24 2 60 0 84-5v6c-26 5-60 6-84 4z" fill={O} />
      {eye(24, 34, 2.8)}
    </>
  ),

  'bumphead-parrotfish': (
    <>
      <g {...ink}>
        <path d="M62 36 106 22c-4 12-4 28 0 40L62 44c3-3 3-5 0-8z" fill="#3f7f6a" />
        {/* The squared-off forehead, which is the whole animal: same green as
            the body, so head and body read as one mass with a bulge on it. */}
        <path d="M30 36c-4-22 12-32 26-22 8 6 10 16 8 24-14 6-28 6-34-2z" fill="#4a9179" />
        <ellipse cx="52" cy="44" rx="30" ry="24" fill="#4a9179" />
        {/* The fused beak it grinds coral with. */}
        <path d="M22 48c8-4 14-5 19-3-4 4-4 9-2 12-9 1-15-2-17-9z" fill="#f0ede0" strokeWidth={2.4} />
      </g>
      {ringEye(36, 34, 5)}
    </>
  ),

  'blackspotted-puffer': (
    <>
      <g {...ink}>
        <path d="M70 38 104 26c-3 10-3 20 0 30L70 46c2-3 2-5 0-8z" fill="#c9a24a" />
        {/* Spines as a spiny rim rather than eight long rays: the old drawing
            read as a sun with a face on it. */}
        <path d="M52 14 59 10 63 16 71 16 73 23 80 26 79 33 84 39 80 45 83 52 76 56 76 64 68 65 65 72 58 69 52 74 46 69 39 72 36 65 28 64 28 56 21 52 24 45 20 39 25 33 24 26 31 23 33 16 41 16 45 10z"
              fill="#d7b158" strokeLinejoin="miter" />
        <path d="M28 48c5 4 10 5 14 2" fill="none" strokeWidth={2.6} />
      </g>
      {/* The spots it is named for: black, and big enough to count. */}
      <g fill={O}>
        <circle cx="62" cy="50" r="3.6" /><circle cx="48" cy="57" r="3.2" />
        <circle cx="66" cy="34" r="3" /><circle cx="52" cy="28" r="2.6" />
        <circle cx="40" cy="48" r="2.8" /><circle cx="72" cy="44" r="2.6" />
      </g>
      {ringEye(38, 34)}
    </>
  ),

  'red-lionfish': (
    <>
      <g {...ink}>
        {/* Plumes, each rooted inside the body and swept back the way the
            animal holds them. The old drawing was loose red sticks over a
            striped ball, and read as a sun. */}
        <path d="M40 30c-3-11 0-20 5-26 4 9 4 18 1 27z" fill="#e8d8d4" />
        <path d="M50 28c1-12 5-21 12-26 1 10-2 20-7 28z" fill="#e8d8d4" />
        <path d="M60 30c6-10 13-16 21-19-2 10-8 19-15 25z" fill="#e8d8d4" />
        <path d="M40 56c-3 9 0 17 4 22 4-8 4-15 1-23z" fill="#e8d8d4" />
        <path d="M50 58c1 10 5 18 11 22 1-9-2-17-6-24z" fill="#e8d8d4" />
        <path d="M60 56c6 8 13 14 20 16-2-9-7-16-14-21z" fill="#e8d8d4" />
        <path d="M74 38 106 28c-3 9-3 17 0 26L74 46c2-3 2-5 0-8z" fill="#b8452f" />
        <ellipse cx="50" cy="42" rx="26" ry="19" fill="#efe8e0" />
        <path d="M38 26c4 11 4 21 0 32M52 24c4 12 4 24 0 36M66 29c4 10 4 17 0 26"
              fill="none" stroke="#b8452f" strokeWidth={6} strokeLinecap="butt" />
      </g>
      {ringEye(36, 36)}
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Sharks, rays and the turtle                                         */
  /* ------------------------------------------------------------------ */

  'whitetip-reef-shark': (
    <>
      <g {...ink}>
        <path d="M94 34 118 22c-3 10-3 20 0 30L94 45c3-5 3-7 0-11z" fill="#7e8b93" />
        <path d="M48 27 58 8 70 28z" fill="#7e8b93" />
        <path d="M34 53 24 68 46 60z" fill="#7e8b93" />
        {/* Slimmer than the nurse shark it shares a colour with, so the two are
            told apart by silhouette before anyone reads a name. */}
        <path d="M10 42c8-14 26-19 46-19 20 0 36 7 44 17-13 13-30 18-46 18-18 0-35-7-44-16z"
              fill="#8e9ba3" />
        <path d="M16 45c14 9 52 12 80 0-28 5-60 4-80 0z" fill="#eef2f3" strokeWidth={2.4} />
      </g>
      {/* The white tips themselves: on the first dorsal and the upper tail lobe. */}
      <g fill="#fdfdfa" stroke={O} strokeWidth={2}>
        <path d="M54 16 58 8l5 9c-3-1-6-1-9-1z" />
        <path d="M108 28 116 24c-2 4-2 6-1 9z" />
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
        {/* Four paddles, each rooted inside the carapace so the shell's own fill
            closes over its base. They used to be open hooks: the front-left one
            floated clear of the shell entirely and read as a loose tail, and the
            front-right one had fused into the head. */}
        <path d="M46 26c-10-10-22-16-30-15 2 9 10 18 22 24z" fill="#4f7f5c" />
        <path d="M72 26c10-10 20-15 26-14-2 9-8 17-19 23z" fill="#4f7f5c" />
        <path d="M46 62c-10 10-22 16-30 15 2-9 10-18 22-24z" fill="#4f7f5c" />
        <path d="M72 62c10 10 20 15 26 14-2-9-8-17-19-23z" fill="#4f7f5c" />
        {/* The head is drawn back into the shell, not parked beside it. */}
        <path d="M90 34c14-5 22-3 24 4-4 7-12 9-24 6z" fill="#67a074" />
        <ellipse cx="60" cy="44" rx="34" ry="26" fill="#5c9268" />
        <path d="M60 18v52M32 34c18 8 38 8 56 0M32 56c18-8 38-8 56 0" fill="none" strokeWidth={2.4} opacity=".8" />
      </g>
      {eye(106, 36, 2.8)}
    </>
  ),

  /* ------------------------------------------------------------------ */
  /* Crustaceans                                                         */
  /* ------------------------------------------------------------------ */
  'sally-lightfoot-crab': (
    <>
      <g {...ink}>
        {/* Arms out from the shell, so the claws hang off the animal rather
            than floating either side of it. */}
        <path d="M36 38 24 32M84 38 96 32" fill="none" strokeWidth={6} />
        <path d="M28 36C20 34 12 29 9 22c5 0 9 2 12 5-3-4-4-9-2-14 4 4 7 10 9 17z" fill="#c8492c" />
        <path d="M92 36C100 34 108 29 111 22c-5 0-9 2-12 5 3-4 4-9 2-14-4 4-7 10-9 17z" fill="#c8492c" />
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
        {/* The tail fan it flares when it backs into a burrow. */}
        <path d="M92 32 113 23c3 8 3 14 0 20L92 48c3-5 3-11 0-16z" fill="#d05a3c" />
        <path d="M97 34 109 29M97 40h12M97 46 109 41" fill="none" strokeWidth={2} opacity=".5" />
        {/* Armour plates, squared off one behind the next. Nothing about this
            animal is streamlined, and drawing it as a torpedo lost that. */}
        <path d="M86 30h8c3 4 3 12 0 16h-8z" fill="#3f8f6a" />
        <path d="M74 27h13c3 5 3 21 0 26H74z" fill="#4aa87d" />
        <path d="M61 25h14c3 5 3 25 0 30H61z" fill="#3f8f6a" />
        <path d="M48 25h14c3 5 3 26 0 31H48z" fill="#4aa87d" />
        <path d="M28 28c8-5 16-5 22-1 3 5 3 21 0 26-6 4-14 4-22-1-4-7-4-17 0-24z" fill="#3f8f6a" />
        {/* The club it punches with, folded under the head. */}
        <path d="M28 46c-7 2-13 7-16 14l9 5c3-7 8-11 14-13z" fill="#d05a3c" />
        {/* Eye stalks: attached to the head, carrying the eyes out in front. */}
        <path d="M28 32 18 22M28 40 15 33" fill="none" strokeWidth={4.5} />
      </g>
      {ringEye(16, 20, 6)}
      {ringEye(13, 33, 6)}
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
        {/* The mantle, which is the only reason anyone can name this animal.
            It is laid down whole and the two valves close over it, so the band
            of it left showing is as wide as the gape actually is. */}
        <path d="M12 40h96c-2 18-22 28-48 28s-46-10-48-28z" fill="#2f8f96" />
        {/* Both valve edges zigzagged, the way a giant clam's shell is. */}
        <path d="M10 44c10-18 28-28 50-28s40 10 50 28l-8 4-8-4-9 4-8-4-8 4-9-4-8 4-8-4-9 4-8-4-9 4-8-4z"
              fill="#cfd8da" />
        <path d="M10 56l8-4 8 4 9-4 8 4 8-4 9 4 8-4 8 4 9-4 8 4 9-4 8 4c-2 12-24 20-50 20s-48-8-50-20z"
              fill="#b7c3c6" />
        <path d="M60 16v24M38 19l-5 21M82 19l5 21M22 27l-4 13M98 27l4 13" fill="none" strokeWidth={2.4} opacity=".6" />
        <path d="M60 58v16M40 57l-4 13M80 57l4 13" fill="none" strokeWidth={2.4} opacity=".6" />
      </g>
      <g fill="#7fd2c8">
        <circle cx="38" cy="50" r="2.8" /><circle cx="60" cy="51" r="2.8" />
        <circle cx="82" cy="50" r="2.8" />
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
        {/* Shifted up 2 so the tentacles' outer bulge stays inside the shared
            80-tall viewBox instead of dipping 2 past it. */}
        <g transform="translate(0,-2)">
          <path d="M40 54c-10 6-20 10-32 12 12 4 20 10 26 16 4-8 10-16 16-20z" fill="#c9a24a" />
          <path d="M80 54c10 6 20 10 32 12-12 4-20 10-26 16-4-8-10-16-16-20z" fill="#c9a24a" />
          <path d="M52 60c-4 10-6 16-4 22 6-4 10-10 14-16z" fill="#c9a24a" />
          <path d="M68 60c4 10 6 16 4 22-6-4-10-10-14-16z" fill="#c9a24a" />
        </g>
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
      {/* Arms are outlined the same way everything else is — a dark stroke laid
          under a coloured one — so they read as limbs and not as loose sticks. */}
      <g fill="none" strokeLinecap="round">
        <g stroke={O} strokeWidth={8}>
          <path d="M46 32c-9-1-18-5-26-11M46 37c-10 0-20-2-29-6M46 43c-10 0-20 3-28 8M46 48c-9 2-17 7-23 14" />
        </g>
        <g stroke="#c98fb0" strokeWidth={4}>
          <path d="M46 32c-9-1-18-5-26-11M46 37c-10 0-20-2-29-6M46 43c-10 0-20 3-28 8M46 48c-9 2-17 7-23 14" />
        </g>
      </g>
      <g {...ink}>
        {/* The fin runs the whole length of the mantle — the animal's own name. */}
        <path d="M54 24c22-6 44-4 58 6-14 8-36 10-58 6z" fill="#c98fb0" />
        <path d="M54 56c22 6 44 4 58-6-14-8-36-10-58-6z" fill="#c98fb0" />
        <path d="M44 40c0-11 8-18 22-18 26 0 46 8 52 18-6 10-26 18-52 18-14 0-22-7-22-18z" fill="#dcb0c6" />
      </g>
      <g fill="#a8607f" opacity=".45">
        <circle cx="74" cy="32" r="2.8" /><circle cx="90" cy="37" r="2.6" />
        <circle cx="78" cy="48" r="2.6" />
      </g>
      {ringEye(50, 33, 5)}
      {ringEye(50, 48, 5)}
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
        {/* Sized to the field: the old star ran an arm's length off the plate. */}
        <path d="M60 10 69 32 92 34 74 49 80 71 60 59 40 71 46 49 28 34 51 32z" fill="#3f76c4" />
        <circle cx="60" cy="44" r="7" fill="#2a5794" strokeWidth={2.4} />
      </g>
      <g fill="#79a6e0">
        <circle cx="60" cy="23" r="2.6" /><circle cx="80" cy="38" r="2.6" />
        <circle cx="40" cy="38" r="2.6" /><circle cx="48" cy="61" r="2.6" />
        <circle cx="72" cy="61" r="2.6" />
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
        {/* Tail fan, laid down first so the last segment closes over its base. */}
        <path d="M92 48c10-1 18 3 22 11-8 5-18 4-24-2z" fill="#d84a4a" />
        {/* A shrimp is a chain of segments, not a torpedo: overlapping plates
            down an arching abdomen, banded red on cream as the animal is. */}
        <ellipse cx="90" cy="48" rx="8" ry="9" fill="#f5f0e2" />
        <ellipse cx="78" cy="44" rx="9" ry="10" fill="#d84a4a" />
        <ellipse cx="66" cy="41" rx="10" ry="11" fill="#f5f0e2" />
        <ellipse cx="53" cy="39" rx="11" ry="12" fill="#d84a4a" />
        <ellipse cx="38" cy="38" rx="12" ry="11" fill="#f5f0e2" />
        <path d="M44 48l-4 14M56 51l-1 13M68 52l3 12M80 52l6 11" fill="none" strokeWidth={2.4} />
        {/* The two long claws it boxes with. */}
        <path d="M34 32 20 22 24 18 36 28z" fill="#d84a4a" />
        <path d="M34 46 20 58 24 62 36 50z" fill="#d84a4a" />
        <path d="M20 26C12 24 6 20 4 14c4 1 7 3 10 6-2-5-2-9 0-13 3 5 5 10 8 15z" fill="#d84a4a" />
        <path d="M20 54C12 56 6 60 4 66c4-1 7-3 10-6-2 5-2 9 0 13 3-5 5-10 8-15z" fill="#d84a4a" />
      </g>
      {/* Antennae longer than the animal — drawn last, over the claws, and
          outlined, or a pale stroke on a pale plate is not there at all. */}
      <g fill="none" strokeLinecap="round">
        <path d="M36 30 12 6M38 34 6 20" stroke={O} strokeWidth={7} />
        <path d="M36 30 12 6M38 34 6 20" stroke="#f7f2e2" strokeWidth={3.4} />
      </g>
      {eye(35, 34, 3.2)}
    </>
  ),

  'coconut-crab': (
    <>
      <g {...ink}>
        {/* Jointed legs, not straight sticks. */}
        <path d="M40 58 30 68 18 70M54 62 48 73 38 77M66 62 72 73 82 77M80 58 90 68 102 70"
              fill="none" strokeWidth={3.4} />
        {/* Arms drawn out from the shell, so the claws hang off the animal
            rather than floating beside it. */}
        <path d="M34 44 21 46M86 44 99 46" fill="none" strokeWidth={7} />
        {/* The claws: the whole point of the animal, and each needs both prongs. */}
        <path d="M25 50C17 51 9 48 4 41c6-2 10-1 15 2-5-4-8-9-8-15 6 4 11 10 15 16z" fill="#5a3577" />
        <path d="M95 50c8 1 16-2 21-9-6-2-10-1-15 2 5-4 8-9 8-15-6 4-11 10-15 16z" fill="#5a3577" />
        <ellipse cx="60" cy="45" rx="30" ry="20" fill="#7d4aa0" />
      </g>
      {ringEye(50, 39, 4.4)}
      {ringEye(70, 39, 4.4)}
    </>
  ),

  'banded-sea-krait': (
    <>
      {/* The body is one stroke, the outline a heavier stroke beneath it, and
          the bands a dashed stroke of the same width laid over the top — so a
          band cannot spill past the edge of the animal, which is what the
          hand-placed bands used to do. */}
      <path d="M16 33c14-18 30 14 46 2 14-10 24 16 42 8" fill="none" stroke={O}
            strokeWidth={17} strokeLinecap="round" />
      <path d="M16 33c14-18 30 14 46 2 14-10 24 16 42 8" fill="none" stroke="#cdd8dd"
            strokeWidth={11} strokeLinecap="round" />
      <path d="M16 33c14-18 30 14 46 2 14-10 24 16 42 8" fill="none" stroke={O}
            strokeWidth={11} strokeDasharray="7 12" strokeDashoffset="-6" />
      <g {...ink}>
        {/* A paddle tail is what makes it a sea snake rather than a snake. */}
        <ellipse cx="106" cy="45" rx="9" ry="13" fill="#cdd8dd" transform="rotate(-22 106 45)" />
        <ellipse cx="17" cy="32" rx="11" ry="9" fill="#cdd8dd" />
        <path d="M8 34c4 2 8 2 12 0" fill="none" strokeWidth={2.2} />
      </g>
      {eye(13, 29, 2.6)}
    </>
  ),

  'hawksbill-turtle': (
    <>
      <g {...ink}>
        {/* Four paddles, each rooted inside the carapace so the shell's own fill
            closes over its base. They used to be open hooks: the front-left one
            floated clear of the shell entirely and read as a loose tail, and the
            front-right one had fused into the head. */}
        <path d="M46 26c-10-10-22-16-30-15 2 9 10 18 22 24z" fill="#8a6a3a" />
        <path d="M72 26c10-10 20-15 26-14-2 9-8 17-19 23z" fill="#8a6a3a" />
        <path d="M46 62c-10 10-22 16-30 15 2-9 10-18 22-24z" fill="#8a6a3a" />
        <path d="M72 62c10 10 20 15 26 14-2-9-8-17-19-23z" fill="#8a6a3a" />
        {/* The hooked beak it is named for, on a head set into the shell. */}
        <path d="M90 34c14-5 22-3 24 4-3 6-9 8-16 7z" fill="#a5814a" />
        <path d="M112 36c3 1 4 3 3 5-2 1-4 0-5-2z" fill={O} />
        <ellipse cx="60" cy="44" rx="34" ry="26" fill="#9a7541" />
        {/* Scutes that overlap like roof tiles rather than meeting edge to edge:
            the other half of how this animal is told from the green turtle. */}
        <path d="M60 18v52M32 34c18 8 38 8 56 0M32 56c18-8 38-8 56 0M44 20l-6 48M76 20l6 48"
              fill="none" strokeWidth={2.2} opacity=".75" />
      </g>
      {eye(104, 36, 2.6)}
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
        {/* Sharper, more swept wings than the manta, and a pointed snout. The
            fill has to sit clear of the outline colour or the whole animal
            collapses into a silhouette. */}
        <path d="M60 14c-6 0-11 4-14 10-8 12-24 22-42 28 16 2 30 6 40 12 6-4 10-6 16-6s10 2 16 6c10-6 24-10 40-12-18-6-34-16-42-28-3-6-8-10-14-10z"
              fill="#46608a" />
        <path d="M60 14c-4 6-6 14-6 22h12c0-8-2-16-6-22z" fill="#375079" strokeWidth={2.2} />
      </g>
      <g fill="#eef3f8">
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
        {/* One long sweeping lobe and no lower one — a nurse shark's tail, and
            the quickest way to tell it from the two reef sharks. */}
        <path d="M100 38 118 20c2 10-1 19-8 25L98 36z" fill="#a8895c" />
        <path d="M48 25 58 8 70 27z" fill="#a8895c" />
        <path d="M74 26 82 12 90 30z" fill="#a8895c" />
        <path d="M42 57 32 71 54 63z" fill="#a8895c" />
        {/* Blunt, heavy and slow — nothing like the two reef sharks. */}
        <path d="M10 44c4-14 20-22 44-22 22 0 40 7 48 18-13 15-34 20-52 20-22 0-38-8-40-16z"
              fill="#bb9a68" />
        <path d="M14 48c16 10 56 12 84-2-30 6-64 6-84 2z" fill="#efe6d2" strokeWidth={2.4} />
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
      {/* Built the same way as the banded sea krait — body stroke, heavier
          outline beneath, banding dashed over the top — so a band cannot spill
          past the edge of the animal, which is what the old ones did. */}
      <path d="M104 30c-14-4-18 14-32 16-14 2-18-14-32-10-10 3-16 12-20 20" fill="none"
            stroke={O} strokeWidth={18} strokeLinecap="round" />
      <path d="M104 30c-14-4-18 14-32 16-14 2-18-14-32-10-10 3-16 12-20 20" fill="none"
            stroke="#6f7a4a" strokeWidth={12} strokeLinecap="round" />
      <path d="M104 30c-14-4-18 14-32 16-14 2-18-14-32-10-10 3-16 12-20 20" fill="none"
            stroke="#3d4530" strokeWidth={12} strokeDasharray="5 15" strokeDashoffset="-9" />
      <g {...ink}>
        {/* The paddle tail, which is what makes it a sea snake. */}
        <ellipse cx="18" cy="60" rx="9" ry="13" fill="#6f7a4a" transform="rotate(28 18 60)" />
        <ellipse cx="104" cy="29" rx="11" ry="8" fill="#7e8a56" />
      </g>
      {eye(108, 26, 2.6)}
    </>
  ),

  'loggerhead-turtle': (
    <>
      <g {...ink}>
        {/* Four paddles, each rooted inside the carapace so the shell's own fill
            closes over its base. They used to be open hooks: the front-left one
            floated clear of the shell entirely and read as a loose tail, and the
            front-right one had fused into the head. */}
        <path d="M46 26c-10-10-22-16-30-15 2 9 10 18 22 24z" fill="#8a4a34" />
        <path d="M72 26c10-10 20-15 26-14-2 9-8 17-19 23z" fill="#8a4a34" />
        <path d="M46 62c-10 10-22 16-30 15 2-9 10-18 22-24z" fill="#8a4a34" />
        <path d="M72 62c10 10 20 15 26 14-2-9-8-17-19-23z" fill="#8a4a34" />
        {/* An outsized head — the whole point of the animal — set into the
            shell rather than parked beside it. */}
        <path d="M86 29c14-4 24 0 24 9s-10 13-24 9z" fill="#a85c40" />
        <ellipse cx="58" cy="44" rx="33" ry="25" fill="#9c5439" />
        <path d="M58 19v50M40 22v44M76 22v44M27 41c20 5 44 5 64 0" fill="none" strokeWidth={2.2} opacity=".7" />
      </g>
      {eye(101, 34, 2.8)}
      <path d="M108 41c3 1 5 3 4 5-2 1-5 0-6-2z" fill={O} />
    </>
  ),

  'grey-reef-shark': (
    <>
      <g {...ink}>
        <path d="M94 35 118 22c-3 10-3 20 0 30L94 45c3-4 3-7 0-10z" fill="#5e6a72" />
        <path d="M46 30 58 4 72 31z" fill="#5e6a72" />
        <path d="M36 50 26 68 48 57z" fill="#5e6a72" />
        <path d="M12 42c14-16 58-22 88-2-30 20-74 16-88 2z" fill="#6f7c85" />
        <path d="M16 44c14 10 54 14 84 0-30 6-64 4-84 0z" fill="#e2e8ea" strokeWidth={2.4} />
      </g>
      {/* The black rear margin on the tail, which is what names the animal. */}
      <path d="M116 24c-3 9-3 18 0 26" fill="none" stroke={O} strokeWidth={6} strokeLinecap="round" />
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
        <path d="M92 50c9 0 16 4 20 12-8 4-18 3-24-3z" fill="#f4ecf2" />
        {/* Same segmented build as the banded coral shrimp, but squatter and
            cream, so the two crustaceans read as relatives, not as twins. */}
        <ellipse cx="90" cy="49" rx="9" ry="10" fill="#f4ecf2" />
        <ellipse cx="77" cy="45" rx="10" ry="11" fill="#f0e4ef" />
        <ellipse cx="64" cy="42" rx="11" ry="12" fill="#f4ecf2" />
        <ellipse cx="50" cy="40" rx="12" ry="13" fill="#f0e4ef" />
        <path d="M46 52l-4 14M60 54l-1 13M74 55l3 12M86 54l6 11" fill="none" strokeWidth={2.4} />
        {/* The absurd flattened claws it holds out in front, bigger than its
            head, on arms short enough that they hang off the animal. */}
        <path d="M42 34 32 29M42 46 32 51" fill="none" strokeWidth={5} />
        <ellipse cx="24" cy="25" rx="14" ry="9" fill="#f4ecf2" transform="rotate(-20 24 25)" />
        <ellipse cx="24" cy="56" rx="14" ry="9" fill="#f4ecf2" transform="rotate(20 24 56)" />
      </g>
      <g fill="#a8497e" opacity=".9">
        <circle cx="56" cy="36" r="5.5" /><circle cx="68" cy="46" r="5" />
        <circle cx="81" cy="41" r="4.4" /><circle cx="90" cy="53" r="3.6" />
        <circle cx="18" cy="22" r="3.6" /><circle cx="30" cy="28" r="3" />
        <circle cx="18" cy="59" r="3.6" /><circle cx="30" cy="53" r="3" />
      </g>
      {eye(41, 32, 2.8)}
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
        {/* The pale ruffled margin, laid down first and the red mantle closed
            over it, so what shows is a frill along the trailing edge. Drawn as
            an unoutlined white stroke it was white on a near-white plate and
            simply was not there. */}
        <path d="M20 42c6-15 24-23 42-23s34 8 40 23c-8 7-12 16-19 16-6 0-8-6-14-6s-9 8-16 8-9-8-15-8-9 6-14 6c-4 0-4-10-4-16z"
              fill="#f7ddd6" />
        {/* The mantle unrolled into a swimming skirt, wavy along the trailing edge. */}
        <path d="M20 42c6-15 24-23 42-23s34 8 40 23c-8 3-12 10-19 10-6 0-8-6-14-6s-9 8-16 8-9-8-15-8-9 6-14 6c-4 0-4-6-4-10z"
              fill="#c8382e" />
        {/* Rhinophores: the pair of horns it steers with. */}
        <path d="M38 24l-5-12M52 21V9" fill="none" strokeWidth={4.5} />
        {/* Six gills in a rosette at the back end. */}
        <path d="M94 28c8-4 15-2 17 5-6-1-11 1-14 5" fill="#e07d6c" />
      </g>
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
        <path d="M72 36 106 24c-3 10-3 22 0 32L72 44c2-3 2-5 0-8z" fill="#2f6fa8" />
        <path d="M40 20c10-9 24-9 32 0" fill="#e8873a" />
        <ellipse cx="56" cy="40" rx="34" ry="22" fill="#2f6fa8" />
      </g>
      {/* The swirls, which are the entire reason anyone knows this fish. */}
      <g fill="none" stroke="#e8873a" strokeWidth={5} strokeLinecap="round">
        <path d="M34 32c8-5 16-2 20 4M40 50c8 3 16 0 20-6M66 30c6 4 10 10 10 16M64 52c6-2 10-6 12-11" />
      </g>
      <g fill="none" stroke="#1f8f6a" strokeWidth={2.8} strokeLinecap="round">
        <path d="M36 41c7 3 14 2 19-2M62 44c6 2 11 0 14-3" />
      </g>
      <ellipse cx="56" cy="40" rx="34" ry="22" fill="none" {...ink} />
      {/* The fan-shaped pectoral it holds out like a hand. */}
      <path d="M44 47c8 0 14 4 16 9-7 4-15 3-20-2z" fill="#e8873a" {...ink} strokeWidth={2.6} />
      {ringEye(34, 33, 5)}
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
        <path d="M76 34 112 22c-4 10-4 20 0 30L76 50c3-5 3-11 0-16z" fill="#b58f4a" />
        {/* Pectorals spread flat, the way a carpet shark rests — fins with a
            shape, rooted in the body, not hooks hanging off its side. */}
        <path d="M44 28c-3-10 1-17 10-20-3 8-3 14-1 21z" fill="#b58f4a" />
        <path d="M44 56c-3 10 1 17 10 20-3-8-3-14-1-21z" fill="#b58f4a" />
        {/* Seen from above, because it never leaves the sand. */}
        <path d="M18 42c0-13 10-20 26-20 22 0 40 8 44 20-4 12-22 20-44 20-16 0-26-7-26-20z" fill="#c9a45e" />
        {/* The fringe of skin tassels round the whole front of the head. */}
        <path d="M19 34l-9-5M16 40l-10-3M16 45l-10 3M19 51l-9 5M25 29l-6-8M25 56l-6 8M32 26l-3-9M32 59l-3 9"
              fill="none" strokeWidth={3} />
        <path d="M20 42h18" fill="none" strokeWidth={3} />
      </g>
      <g fill="#8a6428" opacity=".45">
        <ellipse cx="54" cy="32" rx="9" ry="5" /><ellipse cx="74" cy="36" rx="7" ry="4" />
        <ellipse cx="58" cy="52" rx="10" ry="5" /><ellipse cx="76" cy="49" rx="6" ry="4" />
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
