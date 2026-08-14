# TidaliX

An ocean-themed collectible card game built on real marine species, where the
board runs on a shared tide.

Online-only, web-first, single-player against an AI to start. No netcode yet.

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

```bash
npm install
npm run dev                  # then open the forwarded port (5173)
```

In a Codespace, VS Code forwards port 5173 and offers the URL — the same link
opens on a phone. Add `?seed=7` to replay an exact game; the engine is
deterministic, so a seed always reproduces the same match.

Every affordance in the client is derived from the engine's `legalActions`, so
the interface cannot offer a move the resolver would reject: what looks
clickable is exactly what is legal.

Each card carries its full breakdown — printed line, what the tide is doing to
it, what its neighbours are doing to it — because the numbers are meaningless
without the reason for them. Symbiosis is drawn as actual lines between the
cards involved, green for a partnership and red for a crown-of-thorns eating
your coral.

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
player's tab, so the whole game compiles to static files and deploys to any
static host — nothing to operate, nothing to pay for while the loop is being
validated. Targets are desktop and mobile browsers, one codebase, no app store.

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
npm test        # 70 tests: 64 engine, 6 client
npm run typecheck
npm run build
```

## Combat

A defender does **not** strike back. A body is not a weapon: only animals that
are actually armed punish an attacker, through a printed `spines` value. An
urchin, an anemone, a lionfish and a pufferfish all hurt what bites them; a
barracuda does not. Set `config.defenderStrikesBack` to restore mutual trades.

Exposure amplifies spines too — attacking with a stranded card into a spined one
is doubly punishing, which is the point of the vulnerability window.

## Symbiosis

Cards carry biological **traits** (`coral`, `reef-fish`, `megafauna`, `anemone`,
`cleaner`…), and some carry **auras** that grant stats to friendly cards with a
given trait. Mutualism is simply both partners carrying an aura pointed at the
other:

| | |
|---|---|
| Anemone ↔ anemonefish | The anemone gives its resident `+0/+2`; the fish gives back `+1/+0` by driving off polyp-eaters. |
| Corals → reef fish | Staghorn and table coral each shelter reef fish for `+0/+1`, and they stack. |
| Cleaner wrasse → megafauna | `+0/+2` to every manta, shark and turtle you control. |
| Crown-of-thorns → coral | `+0/-3`. A real relationship, and not a kind one. |

Auras are friendly-only and never apply to the card itself. Because they change
a card's ceiling, a card can now **die when its partner dies** — the same failure
mode as a falling tide, so death sweeps run to a fixpoint and cascade.

## Card set — "Reef Flat"

28 real species across the four phases: low-tide flat dwellers, flood hunters,
high-water residents, drain ambushers, the armed and venomous, and the reef
structures themselves. Every card carries its binomial name, and its tide line
has to match the animal — if they disagree, the card is wrong.

Implemented keywords are `surge` (may attack the turn it is played) and
`reef-guard` (must be dealt with before anything behind it). Both are resolved
by the engine; the keyword list is kept honest so there is no dead card text.

## Roadmap

- [x] Engine scaffold: card schema, tide-phase state machine, action resolver
- [x] Engine test coverage before any UI work
- [x] Terminal harness — the loop is playable end to end
- [x] Tide-driven economy, printed `spines` instead of blanket retaliation, symbiosis
- [x] React client — card detail, stat breakdowns, drawn symbiosis links
- [ ] Play it, and tune the tide until it is fun
- [ ] Grow the starter set to 30–50 cards and tune the curve
- [ ] A real single-player AI on top of `legalActions`
- [ ] Validate that it is fun before any multiplayer or monetization work
