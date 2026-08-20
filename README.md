# TidaliX

An ocean-themed collectible card game built on real marine species, where the
board runs on a shared tide.

Online-only, web-first, single-player against an AI to start. No netcode yet.

**Play now: https://maccros.github.io/TidaliX/**

## The tidal system

One shared phase cycles for both players:

```
low → rising → high → falling → low …
```

The tide advances **once per round** by default (both players play inside the
same phase), configurable to once per turn via `config.tideAdvancesEvery`.

Unspent energy **carries over**, up to `config.carryOverCap` (3). Banking through
a lean low tide to spend on the flood is a real decision, and the cap is what
stops it becoming a hoard.

Your **base energy capacity rises once per complete tide cycle**, not once per
round — four phase advances buy you one more point of ceiling. That single change
is what makes the reef the engine: capacity is scarce, so the energy that
matters comes from the tide, from the species you have standing, and from your
conservation pile, all of which you have to build. Measured over identical
games, the old per-round ramp minted about 5.2 new energy per turn peaking near
9; the cycle ramp mints about 3.5, peaking near 5.4.

Each phase does three things:

| | |
|---|---|
| **Stat swings** | A card's tide line adds or removes attack and health, drawn from how the animal actually behaves. Mudskippers and grapsid crabs own the drained flat; mantas, reef sharks and trevally ride the flood in over the crest. |
| **Resource generation** | The economy runs on the tide. A drained flat carries no plankton and pays nothing; the flood pays `+2` and high water `+1`. Some cards generate on their own phases too. |
| **Vulnerability windows** | A card can be `exposed` in a phase: attackers deal bonus damage to it. Coral bakes at low tide; a manta stranded on the flat is in trouble. |

Tide effects are **continuous, not one-shot**. `effectiveStats` reads the live
phase every time a card is inspected, so a phase change re-stats the entire
board for free — no per-card bookkeeping, no buff stack to unwind. Damage, in
contrast, is marked permanently on the instance. That interaction is where the
mechanic gets interesting: a card damaged at high tide can drown the moment a
falling tide lowers its health ceiling below the damage already on it.

There is deliberately **no depth mechanic**. Nearly everything in the set is
reef-dwelling, so depth-as-resource never fit the theme.

## Layout

```
engine/    Pure game logic. Card data, tide state machine, resolver, bot.
           No rendering imports, ever.
client/    React browser client. This is the game.
harness/   Terminal client. A debug surface, not the way to play.
```

## Play it

**https://maccros.github.io/TidaliX/** — deployed straight from `client/dist`,
redeployed automatically on every push to `main` via
[`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Add
`?seed=7` to the URL to replay an exact game; the engine is deterministic, so a
seed always reproduces the same match.

To run it locally instead — for development, or to play from a Codespace:

```bash
npm install
npm run dev                  # then open the forwarded port (5173)
```

In a Codespace, VS Code forwards port 5173 and offers the URL — the same link
opens on a phone.

Every affordance in the client is derived from the engine's `legalActions`, so
the interface cannot offer a move the resolver would reject: what looks
clickable is exactly what is legal.

Each card carries its full breakdown — its **base** line (the stats printed on
the card, before anything modifies them), what the tide is doing to it, and what
its neighbours are doing to it — because the numbers are meaningless without the
reason for them. **Right-click** (or long-press) any card, including the
opponent's, to open the full card: the whole tide line laid out at once, so you
can see that a manta is worthless at low water and a monster at high before you
commit to it.

Symbiosis is drawn as actual lines between the cards involved, green for a
partnership and red for a crown-of-thorns eating your coral. Links are only ever
drawn **within one side** — an aura never reaches across the waterline.

Energy is never shown as a bare total. The dashboard itemises every source
feeding it — base capacity, carryover, tide, species, conservation — and says
when your capacity next steps up, because an income you cannot account for is an
income you cannot plan around.

### Terminal client

```bash
npm run play                 # you vs the bot
npm run play -- --seed 7     # a specific, reproducible game
npm run play -- --watch      # bot vs bot, hands off
```

Kept as a debug surface rather than the way to play: a second, independent
renderer is what proves the engine has no UI assumptions baked into it.

Just run it in the Codespace terminal — it is a terminal app, so there is no
port to forward and nothing to expose. Runs on Node's native TypeScript support,
so there is no build step, no `ts-node`, and no dependencies beyond the engine.

That last part is why `.devcontainer/devcontainer.json` pins Node 24: running
`.ts` directly needs Node ≥ 22.18, and without the pin a Codespace rebuild can
land on Node 20 and break `npm run play` with a confusing syntax error.

```
══════════════════════════════════════════════════════════
  low ▸ RISING ▸ high ▸ falling  +1 energy
  the flood carries plankton in         round 4 · turn 7
══════════════════════════════════════════════════════════

  YOU        ♥ 25   ⬡ 4 (3 +1 tide)
    a Mangrove Jack             5/3    ▲+2/0  ready
    b Staghorn Coral            0/5      ·    waiting
```

Every card shows its live stats next to what the tide is doing to it: `▲` the
phase favours it, `▼` it does not, `‼` it is exposed to bonus damage. Your hand
prices itself against the *current* phase, because that is the decision you are
actually making.

The bot in `engine/src/bot.ts` is a placeholder — one ply, greedy, no plan. It is
shared by both clients, and it is not the AI from the roadmap. It does demonstrate
the payoff of a pure engine: it evaluates a move by simply playing it and scoring
the resulting state, with no undo and no simulation mode.

## Platform

Single-player means **there is no server**. The engine runs entirely in the
player's tab, so the whole game compiles to static files — currently deployed
to GitHub Pages, but it would move to any other static host unchanged. Nothing
to operate, nothing to pay for while the loop is being validated. Targets are
desktop and mobile browsers, one codebase, no app store.

The engine has no I/O and no rendering imports, so it runs unchanged in Node,
in a browser, and in a React Native runtime. If multiplayer ever happens, the
same `applyAction` runs authoritatively on a server with clients sending
`GameAction`s and receiving `GameEvent[]` — the rules would not be rewritten.

## Engine

```ts
import { createGame, startGame, applyAction, legalActions, boardView } from '@tidalix/engine';

let { state } = startGame(createGame({ seed: 42 }));

const result = applyAction(state, { type: 'PLAY_CARD', player: 0, instanceId: 'c7' });
if (result.ok) {
  state = result.state;
  result.events; // ordered GameEvent[] — the client animates from these
} else {
  result.error; // typed ActionErrorCode; your state is untouched
}
```

Design contracts the rest of the project can lean on:

- **Pure.** `applyAction` clones, never mutates the state it is handed. An
  illegal action returns a typed error and changes nothing, so a UI or an AI can
  probe freely.
- **Event-sourced narration.** Every change emits an ordered `GameEvent[]`. The
  client animates from them; the tests assert against them.
- **Deterministic.** All randomness runs through a seeded RNG, so any game
  replays exactly from its seed.
- **Enumerable.** `legalActions(state)` returns every legal move — the AI
  opponent will sit on top of it, and it doubles as a legality oracle in tests.

### Commands

```bash
npm test        # 92 tests: 80 engine, 12 client
npm run typecheck
npm run build
```

## Combat

**Every defender strikes back**, for its full attack. This is the rule that stops
a board lead from being unanswerable: killing something is a trade, so a wide
reef has to choose what it spends itself on instead of clearing whatever you play
and still swinging at your face. Measured against the old free-attack rule, it
cuts the bot's board attacks from 43% to 28% of everything it does.

**Armour and spines** split the old `spines` in two. Once every defender hits back, "punishes what
bites it" is simply what a defender does, so the armed animals needed jobs of
their own — and there turned out to be two different jobs.

**Armour** is for animals that are hard to hurt. It comes off the top of every
hit they take, from attacks and retaliation alike, and damage never goes below
zero. A pufferfish inflated into a ball nothing can get its jaws around.

**Spines** is for animals with *no attack at all*. Retaliation returns the
defender's attack, which is zero for an urchin, an anemone or a coral head — so
universal retaliation quietly made the reef's walls worse rather than better, and
attacking them was free again. Spines is dealt back on top of whatever a defender
returns by fighting, so the rule stays one rule: **a defender returns its attack
plus its spines**. Printed only on the unarmed, which is where it earns its keep.

The two never appear on the same card. Armour goes on the three toxic animals,
which have an attack and so already answer a blow; spines goes on the urchin and
the anemone, which do not.

Exposure amplifies retaliation too — attacking with a stranded card into anything
that can answer is doubly punishing, which is the point of the vulnerability
window.

### Toxins

Three animals are printed **`toxic`**: the blackspotted puffer, the red lionfish
and the crown-of-thorns starfish. Destroy one by attacking it and your attacker
dies too — *eating* it is what kills you. The rule is deliberately narrow, and
the edges are the design:

- It fires only on a **kill**. Wounding a toxic animal costs you nothing extra.
- It is **defensive**. A toxic animal that attacks and kills poisons nothing,
  because nothing swallowed it.
- It cannot be **out-healed**. The toxin is marked on the instance, not dealt as
  damage, so no aura or rising tide saves the eater.
- Three predators are printed **`toxin-immune`** — the coral grouper, the giant
  moray and the green sea turtle, all of which really do eat toxic prey. Immunity
  is to the venom, not to the wound: they still take the counter-blow.

## Arrivals

A card used to do nothing on the turn it was played. It sat there until your next
turn, by which point the opponent had answered it — which meant the player behind
could only ever *add* to their board, never respond to yours, and a board lead
could not be overturned.

So some species now do something the moment they land:

| | |
|---|---|
| Peacock Mantis Shrimp | 2 damage to an enemy creature |
| Bumphead Parrotfish | 3 damage to an enemy creature |
| Great Barracuda | 2 damage to an enemy creature |
| Red Lionfish | 1 damage to an enemy creature |
| Crown-of-thorns Starfish | 1 damage to *every* enemy creature |
| Bluestreak Cleaner Wrasse | heal 2 from every friendly creature |
| Giant Clam, Reef Manta Ray | ⬡+2 immediately |
| Moorish Idol | ⬡+1 immediately |
| Common Octopus | draw a card |

Deliberately **not on every card**, in the same way traits are not: a card
without an arrival pays for it in stats, in its tide line, or in an aura, and a
set where every card answers the board is as flat as one where none of them do.

An arrival resolves the instant the card is played, before anything else — but it
is not a free attack. The card still cannot attack the turn it lands unless it
has `surge`.

A targeted arrival is played in two clicks, because it is two decisions: what to
commit, and what to answer with it. Pick the card, then pick what it hits.

## Symbiosis

Cards carry biological **traits** — `reef-fish`, `megafauna`, `coral`, `anemone`,
`anemonefish` — and some carry **auras** that grant stats to friendly cards with
a given trait.

There were ten. Five were doing nothing: `crustacean`, `echinoderm`, `cephalopod`
and `mollusc` restated the card's lineage in a second vocabulary, and `cleaner`
described the wrasse without anything looking for it. A trait a player learns and
then discovers means nothing is worse than no trait, so they are gone, and a test
fails if one reappears. The rule it enforces: **what a card *is* goes in `taxon`;
what it *does for its neighbours* goes in `traits`.** Each surviving trait has its
own badge colour. Mutualism is simply both partners carrying an aura pointed at the
other:

| | |
|---|---|
| Anemone ↔ anemonefish | The anemone gives its resident `+0/+2`; the fish gives back `+1/+0` by driving off polyp-eaters. |
| Staghorn coral → reef fish | `+0/+2`. A nursery of branches nothing large can reach into. |
| Table coral → reef fish | `+1/+1`. Shade is somewhere to hunt from as well as hide in. |
| Coral ↔ coral | `+0/+1` each way. The reef is a structure two corals build together, so stacking them is a plan rather than a duplicate. |
| Cleaner wrasse → megafauna | `+0/+2` to every manta, shark and turtle you control. |
| Crown-of-thorns → coral | `+0/-3`. A real relationship, and not a kind one. |

The corals carry the archetype: they also pay energy on the flood as well as at
high water, and gain health at high tide. They are still the first thing to bake
when the flat drains, and a crown-of-thorns still eats them alive.

Auras are friendly-only and never apply to the card itself. Because they change
a card's ceiling, a card can now **die when its partner dies** — the same failure
mode as a falling tide, so death sweeps run to a fixpoint and cascade.

## Conservation

A species that has survived a **complete tide cycle** on your reef can be
**released** back to the wild. It leaves the board for good and goes to your
**conservation pile** — a zone that is neither the board nor the discard, and
the only place a card leaves play as an asset rather than a loss.

| | |
|---|---|
| **It frees the slot** | The reef holds six. Releasing is the only way to take a species back off it, so a board full of matured animals is a resource, not a lock-up. |
| **It pays** | The pile is scored on **distinct lineages**, and every `config.conservationIncomePer` (1) of them is `+1` standing energy every turn, for the rest of the game. |
| **It wins** | Protect `config.conservationVictory` (3) of the 7 distinct lineages and you win outright, whatever the board looks like. |

The guards are what keep it from being an undo button: a species must live
through a whole cycle before it can go, and only one goes back per turn.

### Lineages, not names

Every card carries exactly one of **seven `taxon` values** — fish, sharks & rays, crustaceans,
echinoderms, molluscs, corals & anemones, reptiles — and the pile is
scored on how many *different* ones are in it. A trait says how an animal
behaves and can be worn several at once; a taxon says what it is, and it is
singular on purpose. Six different reef fish are one branch of the tree
protected, and a reef with only fish in it is not a reef anyone saved. Getting
paid means going out and protecting a crab, a coral, an urchin, an octopus —
animals that want completely different things from the tide.

### What the numbers actually do

Measured over 100 games against a player committed to the pile, the move from
species to lineages costs that player **nothing**: their pile scores 1.51 cards,
1.51 species and 1.51 lineages, because a committed player never releases two
animals of the same branch anyway. The metric changes what a *careless* pile is
worth, which is the point, and leaves a deliberate one untouched.

**The target is three, and it was five.** At five the second win condition was
dead — 0% of games at every difficulty over 200 games each, with the best pile
anyone reached being three. At four it fires in 1%. At three:

| Opponent | Games won by the pile | Mean best pile | Rounds |
|---|---|---|---|
| easy | 0% | 0.00 | 8.8 |
| normal | **10%** | 1.40 | 6.6 |
| hard | **7%** | 1.31 | 6.9 |

Present without being the only thing worth doing. Easy never conserves at all,
by design — it does not value the pile.

The binding constraint is **time**: a species needs a full tide cycle to mature
and only one goes back per turn, against a game ending around round 6.6. There
is physically room for about three releases.

### The set is half fish

| Lineage | Cards | Share | Dealt in the first 12 cards |
|---|---|---|---|
| Fish | 14 | 50% | 100% |
| Crustaceans | 3 | 11% | 78% |
| Sharks & rays | 3 | 11% | 77% |
| Corals & anemones | 3 | 11% | 79% |
| Molluscs | 2 | 7% | 63% |
| Echinoderms | 2 | 7% | 63% |
| Reptiles | **1** | 4% | **39%** |

A player is dealt 5.00 distinct lineages on average in their first twelve cards,
so three is comfortably reachable and five is not reliably so. The skew is real
and it is a set-composition problem, not a tuning one: the honest repair is more
non-fish species — the giant triton (which eats crown-of-thorns), the banded sea
krait, Diadema, the banded coral shrimp, fire coral — not a smaller victory
number. Lowering the target to three is the deliberate stopgap.

Splitting Fish into its real orders does not rescue this. It yields five clean
pairs (puffer + triggerfish, tang + idol, wrasse + parrotfish, grouper + snapper,
trevally + barracuda) and four unavoidable singletons: the moray is the only eel,
the mudskipper the only goby, the lionfish the only scorpionfish, the anemonefish
the only damsel. That trades one skew for nine lineages, four of them one card.

Reachability depends heavily on **how aggressive the opponent is**, which is
worth knowing before retuning any of these numbers. Any balance figure measured
against a bot is a fact about that bot first.

## The opponent

Three difficulties, all the same one-ply engine with different reasons to play
differently — the useful axis is not raw strength but whether you can name why
you lost.

| | What it does |
|---|---|
| **Easy** | Undervalues your life total and settles for a move from the weaker half of what it can see, half the time. |
| **Normal** | Plays the board and your life total one move deep. No plan beyond this turn. |
| **Hard** | Also reads the tide a phase ahead, and checks your best answer before committing to a trade. |

The weights are measured, not guessed. In a round robin of 288 games per
profile, reading the tide and reading the reply each added about five points of
win rate alone and seven together:

| Profile | Win rate |
|---|---|
| life3 + tide + reply | **57%** |
| life3 + reply | 52% |
| life3 + tide | 51% |
| life2 / life4 | 48% |
| life3 | 47% |
| life1 | 46% |

Head to head, re-measured over 160 games per pairing with both seats and both
starting players: **hard beats normal 56%**, normal beats easy 61%, hard beats
easy 69%. Seats have to be swapped on every seed, because the player who moves
first wins about 63% of games — large enough that an unswapped run reads seat
advantage as skill.

One warning for anyone retuning this. Easy was originally "normal, but racing
harder" — and that made it the *strongest* profile, because racing for the face
is dominant in a game that ends around round 7. A difficulty setting has to be
weaker at something that matters, not simply louder.

The bot's reply check is arithmetic, not simulated. An earlier version played out
every candidate reply through the resolver, which made hard roughly fifty times
slower than the other two — unusable in a browser and slow enough to time out a
measurement run. What one attacker can do to one card is a subtraction.

## Reading the board

A card the coming tide will kill **on its own** — no attack, no other play, just
the phase turning and its own tide line taking its ceiling below the damage
already marked on it — is flagged as **dying**. It is the one loss a player can
still prevent, by attacking with it now or releasing it, and without the warning
it reads as the game quietly taking a card away.

Colour on a card means **what you can do with it right now** — playable, ready,
selected, targetable, spent, or exposed by this phase. It is never used for what
a card permanently *is*.

Toxic animals and structures used to carry their own tint, and the result was
that a player scanning for their options had six washes to decode at once, only
some of which were about the decision in front of them. Identity is printed as a
tag instead: a label read on purpose, rather than a colour to be decoded. A test
holds the rule — two cards in the same state must produce the same classes,
whatever they happen to be.

## Card art

Every species carries an inline SVG silhouette, tinted by the tide phase the card
is drawn in. Inline rather than image files for two reasons: the deployed page
runs under a strict CSP that blocks every external host, and a drawing that
inherits `currentColor` can take the phase colour, which an image cannot. A test
keeps the drawings and the card set in sync in both directions — no species
without a drawing, no drawing without a species.

## Card set — "Reef Flat"

28 real species across the four phases: low-tide flat dwellers, flood hunters,
high-water residents, drain ambushers, the armed and venomous, and the reef
structures themselves. Every card carries its binomial name, and its tide line
has to match the animal — if they disagree, the card is wrong.

Every species carries a drawn silhouette, tinted to the phase it is standing in,
so a hand can be read by shape before a word of it is read. They ship as inline
SVG because the deploy's CSP blocks every external image host.

Implemented keywords are `surge` (may attack the turn it is played),
`reef-guard` (must be dealt with before anything behind it), `toxic` (eating it
kills the eater) and `toxin-immune`. All four are resolved by the engine; the
keyword list is kept honest so there is no dead card text.

## Roadmap

- [x] Engine scaffold: card schema, tide-phase state machine, action resolver
- [x] Engine test coverage before any UI work
- [x] Terminal harness — the loop is playable end to end
- [x] Tide-driven economy, retaliation with printed `armour`, symbiosis
- [x] React client — card detail, stat breakdowns, drawn symbiosis links
- [x] Cycle-paced energy, itemised income, the conservation pile and its win condition
- [x] Arrival effects, so playing a card is an action and a board lead can be overturned
- [x] Three measured difficulties, and a silhouette for every species
- [ ] Play it, and tune the tide until it is fun
- [ ] Grow the starter set to 30–50 cards and tune the curve
- [ ] A real multi-ply AI on top of `legalActions`, beyond the three one-ply profiles
- [ ] Validate that it is fun before any multiplayer or monetization work
