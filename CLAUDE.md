# TidaliX

An ocean-themed collectible card game built on real marine species and one shared
tidal phase cycle. Online-only, single-player against a bot for now.

Live: <https://maccros.github.io/TidaliX/> · Field guide: `docs/field-guide.html`

## Layout

| Package | What it is |
| --- | --- |
| `engine/` | Pure rules. Card data, the tide state machine, the resolver, the bot. Never imports a rendering library. |
| `client/` | React + Vite. The real game surface — this is where game feel is judged. |
| `harness/` | Terminal runner. A debug surface only; do not build player-facing work here. |
| `tools/build-guide.mjs` | Generates `docs/field-guide.html` from the engine's own data, so the guide cannot drift from the rules. |

```
npm run dev        # build engine, then vite dev server for the client
npm test           # vitest across all workspaces
npm run typecheck
npm run guide      # regenerate docs/field-guide.html — run after tuning any card
npm run play       # terminal harness
```

`engine/dist` is gitignored and both clients resolve the package to it, so the
engine's `prepare` script must keep building on install. After changing anything
in `engine/src`, rebuild before running a client or a measurement script.

## Rules that are not negotiable

**The engine is pure.** `applyAction(state, action)` clones rather than mutates,
returns a typed `ActionErrorCode` on an illegal action, and emits an ordered
`GameEvent[]`. All randomness goes through the seeded RNG in `rng.ts`, so a seed
replays a game exactly. Measurement scripts and the client both depend on this.

**Tide and symbiosis are continuous, never one-shot.** `effectiveStats` re-reads
the live phase *and* the live board on every lookup. Add new phase- or
board-dependent behaviour there, not as a mutation in the resolver — otherwise a
phase change or a partner's death will not re-stat the board. Damage is the one
thing marked permanently on the instance. Death sweeps run to a fixpoint so
cascades resolve.

**A card's tide line must match the real animal.** If the card and the species
disagree, the card is wrong. This is a design rule, not flavour.

**Fifty playable species, one copy of each.** The deck *is* the set. Adding a
species means cutting one; aim additions at whichever taxon, niche or trait is
thinnest, and cut whatever is a duplicate of something better. `set.test.ts`
guards the shape that falls out of this — notably that the opener, on two energy
and four cards, has something to play in most games.

**No depth mechanic.** Considered and deliberately dropped; nearly the whole
roster is reef-dwelling. Do not propose reintroducing it.

**Defenders do not strike back** unless they have a printed `spines` value.

## Vocabulary

Two orthogonal classifications, and they must not collapse into each other:

- **Taxon** — what an animal *is*. Scored by the conservation pile. Seven of them,
  all named in one register (the plural of the group): Bony fishes, Cartilaginous
  fishes, Crustaceans, Molluscs, Echinoderms, Reptiles, Cnidarians.
- **Niche** — how it *lives*. What symbiosis auras read. Four, each two words,
  and no word appears in two of them: `frame-builder`, `reef-dweller`,
  `open-water`, `bottom-crawler`.

Player-facing text says "taxon"/"taxa" and "niche", matching the engine. The word
"lineage" was used for a while and is gone — it implies common descent, and fish
are not a clade.

Keep the `Keyword` union limited to what the resolver or some card's aura
actually reads, so no card carries dead text. A test enforces that every niche is
read by at least two positive auras.

## Interface grammar

The card face and the full card say the same things the same way. Breaking this
is the single most common regression.

**One shape for a statement.** An arrival and a symbiosis gift are the same kind
of line: *what it does*, then *who it lands on*, then *why*, with the explanation
on its own line beneath.

```
▸  ON ARRIVAL      ♥-1     [EVERY ENEMY]
→  [FRAME-BUILDER]  +0/-3   [BOTH REEFS]
```

**One pill.** Every small labelled thing — niche badge, keyword, armour, spines,
reach marker, arrival target, taxon chip — shares one geometry. Colour and border
are the only things that distinguish them. See the shared rule at the top of the
`.tag` block in `client/src/styles.css`.

**Numbers.** `client/src/format.ts` owns them, and nothing else formats a stat.
A delta signs *both* halves including zero (`+1 / +0`, never `+1/0`); the spaced
form goes in aligned columns and the compact form goes inline. Figures are set in
the mono face, sentences in the body face. "Nothing" is an em dash, not a
sentence.

**Symbols.** `♥` health, `⬡` energy, `✳` conservation. A number never appears
without its symbol — "1 to every enemy" is a riddle.

**The full card is complete; the face is a summary.** The face prints the
mechanical line; the sentence explaining a relationship lives on the full card,
where there is room. Section order: Through the tide, Niche and traits, On
arrival, Symbiosis gift, Live stats, Conservation.

**Say it once.** Conservation reports release readiness and nothing else — what
a card protects is already under its name, and what the pile would pay is the
conservation panel's job.

**Both reefs.** Anything a player would act on has to be legible on the
opponent's side too. A species maturing over there is the clearest reason to
attack it now, so the matured badge and the release row are drawn for either
owner — the row just changes from an opportunity to a threat.

**Symbiosis links** are all drawn, always. Only those touching the *clicked* card
are drawn loudly; the rest are faint. The pointer focuses nothing — hovering read
as the whole reef being permanently highlighted.

## Verification

**Measure every balance claim.** Write a self-play script against `engine/dist`
and report the number; never assert a balance effect from reasoning alone. The
config comments in `engine/src/state.ts` carry the measured history for each
tuned value, including the wrong answers and why they were wrong — re-measure
rather than trusting a number after the set changes.

**Verify UI in a real browser.** jsdom has no layout, so it cannot catch a
z-index bug, a cascade collision, or an unreadable colour — all three have
shipped. Drive the dev server with Playwright and read *computed styles and
geometry*, which is stricter than looking at a screenshot:

```js
await el.evaluate((e) => getComputedStyle(e).color)
document.documentElement.scrollWidth > document.documentElement.clientWidth
```

**Drawings must be looked at.** `client/src/SpeciesArt.tsx` holds 50 inline SVGs.
Art written blind comes out as unreadable blobs — this has happened. Render and
view before committing. Build shapes from primitives (overlapping ellipses,
short paths) rather than one long freehand bezier, which is much easier to get
subtly wrong.

## Deploying

Push to `main`. `.github/workflows/deploy-pages.yml` builds and publishes to
GitHub Pages; it sets `VITE_BASE=/TidaliX/`, which is why local builds keep
working at `/`. Wait for the run to finish and confirm it succeeded before
telling anyone it is live.
