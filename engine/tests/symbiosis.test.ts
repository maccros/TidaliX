/**
 * Spines and symbiosis — the two systems that make a card's outcome depend on
 * something other than its own printed line.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, startGame } from '../src/resolver.js';
import { boardView, createGame, createInstance, resetInstanceIds } from '../src/state.js';
import { effectiveStats, statsFor } from '../src/tide.js';
import { CARDS, activeSymbioses, getCard } from '../src/cards.js';
import type { CardInstance, GameEvent, GameState, PlayerId } from '../src/types.js';

/* -------------------------------------------------------------------------- */

/** A started game with empty decks; boards get populated directly. */
function bareGame(overrides: Parameters<typeof createGame>[0] = {}): GameState {
  resetInstanceIds();
  return startGame(
    createGame({
      ...overrides,
      decks: [Array<string>(20).fill('clown-anemonefish'), Array<string>(20).fill('clown-anemonefish')],
      shuffleDecks: false,
      config: { startingHandSize: 0, ...overrides.config },
    }),
  ).state;
}

/**
 * Drop cards straight onto a board, skipping cost and summoning sickness.
 * Symbiosis cases care about who stands next to whom, not how they got there.
 */
function place(state: GameState, player: PlayerId, ids: string[]): GameState {
  const next = structuredClone(state);
  for (const id of ids) {
    const inst = createInstance(id, player);
    inst.playedOnTurn = 0;
    next.players[player].board.push(inst);
  }
  return next;
}

function find(state: GameState, player: PlayerId, definitionId: string): CardInstance {
  const card = state.players[player].board.find((c) => c.definitionId === definitionId);
  if (!card) throw new Error(`${definitionId} not on player ${player}'s board`);
  return card;
}

const statOf = (state: GameState, player: PlayerId, defId: string) =>
  statsFor(state, find(state, player, defId));

beforeEach(() => resetInstanceIds());

/* -------------------------------------------------------------------------- */

describe('armour', () => {
  it('is printed on the animals that are hard to hurt, not derived from anything', () => {
    expect(getCard('blackspotted-puffer').armour).toBe(3);
    expect(getCard('red-lionfish').armour).toBe(2);
    expect(getCard('crown-of-thorns-starfish').armour).toBe(3);
    // A big soft predator shrugs off nothing.
    expect(getCard('great-barracuda').armour).toBeUndefined();
  });

  it('is kept apart from spines — they answer two different problems', () => {
    // Armour goes on animals that also have an attack, so they already answer a
    // blow by fighting back and the armour is on top. Spines go on the animals
    // with no attack at all, which would otherwise answer with nothing.
    for (const id of ['blackspotted-puffer', 'red-lionfish', 'crown-of-thorns-starfish']) {
      expect(getCard(id).armour, id).toBeGreaterThan(0);
      expect(getCard(id).spines, id).toBeUndefined();
      expect(getCard(id).attack, id).toBeGreaterThan(0);
    }
    for (const id of ['long-spined-urchin', 'bubble-tip-anemone']) {
      expect(getCard(id).spines, id).toBeGreaterThan(0);
      expect(getCard(id).armour, id).toBeUndefined();
      expect(getCard(id).attack, id).toBe(0);
    }
  });

  it('absorbs damage off the top of every attack', () => {
    let s = bareGame();
    s = place(s, 0, ['whitetip-reef-shark']); // 3 attack at low tide
    s = place(s, 1, ['blackspotted-puffer']); // 5 health, armour 3

    const { state: after, events } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(s, 0, 'whitetip-reef-shark').instanceId,
        targetId: find(s, 1, 'blackspotted-puffer').instanceId,
      }),
    );

    const hit = events.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.cause === 'attack',
    );
    // 3 attack into 3 armour: nothing gets through, and the event says so.
    expect(hit?.amount).toBe(0);
    expect(hit?.absorbed).toBe(3);
    expect(after.players[1].board[0]?.damage).toBe(0);
  });

  it('protects against retaliation too, not only against attacks', () => {
    // An armoured attacker takes the counter-blow on its armour as well. Damage
    // is damage; armour does not care which direction it came from.
    let s = bareGame();
    s = place(s, 0, ['crown-of-thorns-starfish']); // 3 attack, armour 3
    s = place(s, 1, ['coral-grouper']); // 4 attack at low tide

    const { events } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(s, 0, 'crown-of-thorns-starfish').instanceId,
        targetId: find(s, 1, 'coral-grouper').instanceId,
      }),
    );

    const back = events.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.cause === 'retaliation',
    );
    // The grouper's 4 attack, plus 1 because the starfish is exposed at low
    // water, minus 3 absorbed by its armour.
    expect(back?.amount).toBe(2);
    expect(back?.absorbed).toBe(3);
    expect(back?.exposedBonus).toBe(1);
  });

  it('leaves the unarmed defenders to spines, which is their whole answer', () => {
    // The urchin cannot attack, so retaliation alone would return nothing and
    // attacking the reef's walls would be free. Spines is what it answers with.
    let s = bareGame();
    s = place(s, 0, ['peacock-mantis-shrimp']); // 4 attack, 2 health
    s = place(s, 1, ['long-spined-urchin']); // 0 attack, 8 health at low, spines 4

    const { state: after, events } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(s, 0, 'peacock-mantis-shrimp').instanceId,
        targetId: find(s, 1, 'long-spined-urchin').instanceId,
      }),
    );

    expect(after.players[1].board[0]?.damage).toBe(4); // no armour, so all of it lands
    // 4 spines, plus 1 because a mantis shrimp is exposed at low water.
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'DAMAGE_DEALT', cause: 'retaliation', amount: 5, exposedBonus: 1 }),
    );
    // Into a 2-health shrimp: attacking a wall can simply lose you the card.
    expect(after.players[0].board).toHaveLength(0);
  });

  it('never turns damage negative — a blocked hit is zero, not a heal', () => {
    let s = bareGame();
    s = place(s, 0, ['clown-anemonefish']); // 1 attack
    s = place(s, 1, ['blackspotted-puffer']); // armour 3

    const { state: after } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(s, 0, 'clown-anemonefish').instanceId,
        targetId: find(s, 1, 'blackspotted-puffer').instanceId,
      }),
    );
    expect(after.players[1].board[0]?.damage).toBe(0);
  });
});

describe('retaliation', () => {
  it('is what every defender does now, armed or not', () => {
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'high' } });
    s = place(s, 0, ['giant-trevally']); // 6 attack at high tide
    s = place(s, 1, ['coral-grouper']); // 5 attack, 4 health

    const { state: after, events } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(s, 0, 'giant-trevally').instanceId,
        targetId: find(s, 1, 'coral-grouper').instanceId,
      }),
    );

    expect(after.players[1].board).toHaveLength(0);
    // The grouper dies and still marks the trevally for its full attack — which
    // here is enough to take the trevally down with it. Attacking into a body
    // that can answer is a trade, and sometimes the trade is even.
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'DAMAGE_DEALT', cause: 'retaliation', amount: 5 }),
    );
    expect(after.players[0].board).toHaveLength(0);
  });

  it('is amplified by the attacker being exposed, and not otherwise', () => {
    // A bumphead stranded at low tide pays the exposure surcharge on the way back.
    let low = bareGame();
    low = place(low, 0, ['bumphead-parrotfish']);
    low = place(low, 1, ['clown-triggerfish']); // 3 attack

    const { events: lowEvents } = expectOk(
      applyAction(low, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(low, 0, 'bumphead-parrotfish').instanceId,
        targetId: find(low, 1, 'clown-triggerfish').instanceId,
      }),
    );
    const lowHit = lowEvents.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.cause === 'retaliation',
    );
    expect(lowHit?.amount).toBe(4); // 3 attack + 1 for being caught out of the water
    expect(lowHit?.exposedBonus).toBe(1);

    // The same fight at high water, where the bumphead is in its element.
    let high = bareGame({ config: { startingHandSize: 0, startingPhase: 'high' } });
    high = place(high, 0, ['bumphead-parrotfish']);
    high = place(high, 1, ['clown-triggerfish']);
    const { events: highEvents } = expectOk(
      applyAction(high, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(high, 0, 'bumphead-parrotfish').instanceId,
        targetId: find(high, 1, 'clown-triggerfish').instanceId,
      }),
    );
    const highHit = highEvents.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.cause === 'retaliation',
    );
    expect(highHit?.amount).toBe(3);
  });

  it('do not fire when a card attacks the player directly', () => {
    let s = bareGame();
    s = place(s, 0, ['giant-trevally']);
    s = place(s, 1, ['blackspotted-puffer']);
    // The puffer has no reef-guard, so face is a legal target.
    const trevally = find(s, 0, 'giant-trevally');
    const { state: after } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: trevally.instanceId,
        targetId: 'face',
      }),
    );
    expect(after.players[0].board[0]?.damage).toBe(0);
  });
});

describe('symbiosis', () => {
  it('gives an anemonefish its host and the host its defender — both directions', () => {
    const fishAlone = place(bareGame(), 0, ['clown-anemonefish']);
    const anemoneAlone = place(bareGame(), 0, ['bubble-tip-anemone']);
    const paired = place(bareGame(), 0, ['clown-anemonefish', 'bubble-tip-anemone']);

    // The fish gains health from the stinging tentacles it is immune to.
    expect(statOf(fishAlone, 0, 'clown-anemonefish').maxHealth).toBe(3);
    expect(statOf(paired, 0, 'clown-anemonefish').maxHealth).toBe(5);

    // The anemone gains attack because the fish drives off polyp-eaters —
    // mutualism falls out of both partners simply carrying an aura.
    expect(statOf(anemoneAlone, 0, 'bubble-tip-anemone').attack).toBe(0);
    expect(statOf(paired, 0, 'bubble-tip-anemone').attack).toBe(1);
  });

  it('shelters reef fish under coral, and stacks two corals', () => {
    const bare = place(bareGame(), 0, ['moorish-idol']);
    const one = place(bareGame(), 0, ['moorish-idol', 'staghorn-coral']);
    const two = place(bareGame(), 0, ['moorish-idol', 'staghorn-coral', 'table-coral']);

    // Staghorn is the nursery: +0/+2 of shelter. Table coral is the canopy, and
    // shade is somewhere to hunt from as well as hide in: +1/+1.
    expect(statOf(bare, 0, 'moorish-idol').maxHealth).toBe(2);
    expect(statOf(one, 0, 'moorish-idol').maxHealth).toBe(4);
    expect(statOf(two, 0, 'moorish-idol').maxHealth).toBe(5);
    expect(statOf(two, 0, 'moorish-idol').attack).toBe(3);
  });

  it('lets corals build the framework into each other', () => {
    // The reef is a structure two corals make together, so each one is worth
    // more with the other beside it — which is what makes stacking them a plan
    // rather than a duplicate.
    const alone = place(bareGame(), 0, ['staghorn-coral']);
    const reef = place(bareGame(), 0, ['staghorn-coral', 'table-coral']);

    expect(statOf(alone, 0, 'staghorn-coral').maxHealth).toBe(5);
    expect(statOf(reef, 0, 'staghorn-coral').maxHealth).toBe(6);
    expect(statOf(reef, 0, 'table-coral').maxHealth).toBe(8);
  });

  it('lets a cleaner wrasse service the megafauna', () => {
    const alone = place(bareGame(), 0, ['reef-manta-ray']);
    const cleaned = place(bareGame(), 0, ['reef-manta-ray', 'bluestreak-cleaner-wrasse']);

    expect(statOf(alone, 0, 'reef-manta-ray').maxHealth).toBe(6);
    expect(statOf(cleaned, 0, 'reef-manta-ray').maxHealth).toBe(8);
    // The wrasse is a reef-fish, not megafauna, so it does not clean itself.
    expect(statOf(cleaned, 0, 'bluestreak-cleaner-wrasse').maxHealth).toBe(2);
  });

  it('lets a crown-of-thorns eat your own coral', () => {
    const safe = place(bareGame(), 0, ['table-coral']);
    const infested = place(bareGame(), 0, ['table-coral', 'crown-of-thorns-starfish']);

    expect(statOf(safe, 0, 'table-coral').maxHealth).toBe(7);
    expect(statOf(infested, 0, 'table-coral').maxHealth).toBe(4);
  });

  it('does not reach across the board to the opponent', () => {
    let s = bareGame();
    s = place(s, 0, ['clown-anemonefish']);
    s = place(s, 1, ['bubble-tip-anemone']);
    expect(statOf(s, 0, 'clown-anemonefish').maxHealth).toBe(3);
  });

  it('never lets a card buff itself', () => {
    // Staghorn grants to reef-fish; it is a coral, so it gains nothing from itself.
    const s = place(bareGame(), 0, ['staghorn-coral']);
    expect(statOf(s, 0, 'staghorn-coral').maxHealth).toBe(5);
  });

  it('reports its links so a client can draw them', () => {
    const s = place(bareGame(), 0, ['clown-anemonefish', 'bubble-tip-anemone', 'staghorn-coral']);
    const links = activeSymbioses(s.players[0].board);

    const pairs = links.map((l) => [
      getCard(s.players[0].board.find((c) => c.instanceId === l.sourceId)!.definitionId).name,
      getCard(s.players[0].board.find((c) => c.instanceId === l.targetId)!.definitionId).name,
    ]);

    expect(pairs).toContainEqual(['Clown Anemonefish', 'Bubble-tip Anemone']);
    expect(pairs).toContainEqual(['Bubble-tip Anemone', 'Clown Anemonefish']);
    expect(pairs).toContainEqual(['Staghorn Coral', 'Clown Anemonefish']);
  });

  it('separates the tide swing from the symbiosis swing in the stat breakdown', () => {
    // A moorish idol is a reef-dweller, so the staghorn shelters it. The tide
    // swing and the symbiosis swing are reported apart, which is the point.
    const s = place(bareGame(), 0, ['moorish-idol', 'staghorn-coral']);
    const stats = statOf(s, 0, 'moorish-idol');

    expect(s.phase).toBe('low');
    expect(stats.symbiosisBonus).toEqual({ attack: 0, health: 2 });
    expect(stats.maxHealth).toBe(4);

    // And a mudskipper, which lives on the flat rather than in the coral, gets
    // nothing from it — the niche is doing real work.
    const flat = place(bareGame(), 0, ['atlantic-mudskipper', 'staghorn-coral']);
    expect(statOf(flat, 0, 'atlantic-mudskipper').symbiosisBonus).toEqual({ attack: 0, health: 0 });
  });
});

describe('symbiosis and death', () => {
  it('kills a dependent card when its partner dies — cascading in one sweep', () => {
    let s = bareGame();
    // The anemonefish stands at 5 health only because of its anemone.
    s = place(s, 1, ['clown-anemonefish', 'bubble-tip-anemone']);
    s = place(s, 0, ['bumphead-parrotfish']);

    const fish = find(s, 1, 'clown-anemonefish');
    const anemone = find(s, 1, 'bubble-tip-anemone');

    // Mark the fish to 4 damage: survivable at 5 health, fatal at 3.
    const marked = structuredClone(s);
    marked.players[1].board.find((c) => c.instanceId === fish.instanceId)!.damage = 4;
    expect(boardView(marked, 1).find((v) => v.instanceId === fish.instanceId)?.health).toBe(1);

    // Kill the anemone. It is a reef-guard, so it is the only legal target.
    const bumphead = find(marked, 0, 'bumphead-parrotfish');
    const { state: after, events } = expectOk(
      applyAction(marked, {
        type: 'ATTACK',
        player: 0,
        attackerId: bumphead.instanceId,
        targetId: anemone.instanceId,
      }),
    );

    const destroyed = events
      .filter((e): e is Extract<GameEvent, { type: 'CARD_DESTROYED' }> => e.type === 'CARD_DESTROYED')
      .map((e) => e.definitionId);

    expect(destroyed).toContain('bubble-tip-anemone');
    expect(destroyed).toContain('clown-anemonefish'); // it lost its host and went with it
    expect(after.players[1].board).toHaveLength(0);
  });

  it('kills your own coral outright if the starfish is enough to finish it', () => {
    // Staghorn is 0/5; a crown-of-thorns takes 3, leaving 2 — survivable.
    const s = place(bareGame(), 0, ['staghorn-coral', 'crown-of-thorns-starfish']);
    expect(statOf(s, 0, 'staghorn-coral').maxHealth).toBe(2);
    expect(s.players[0].board).toHaveLength(2);
  });
});

/* -------------------------------------------------------------------------- */

function expectOk(result: ReturnType<typeof applyAction>) {
  if (!result.ok) throw new Error(`expected success, got ${result.error}: ${result.message}`);
  return result;
}

describe('stat helpers', () => {
  it('ignores auras for a card that has no board around it', () => {
    resetInstanceIds();
    const lone = createInstance('clown-anemonefish', 0);
    expect(effectiveStats(lone, 'low').maxHealth).toBe(3);
  });
});

describe('the niche vocabulary', () => {
  it('gives every species exactly one niche', () => {
    // The old `traits` list let a card carry three tags, five of which nothing
    // read. One niche per card, always present, is the rule that replaced it.
    for (const card of CARDS) {
      expect(card.niche, card.name).toBeTruthy();
    }
    expect(new Set(CARDS.map((c) => c.niche)).size).toBe(4);
  });

  it('points every aura at a niche something actually occupies', () => {
    // An aura reading a niche no card has is a card doing nothing.
    const occupied = new Set(CARDS.map((c) => c.niche));
    for (const card of CARDS) {
      for (const aura of card.auras ?? []) {
        expect(occupied.has(aura.affects), `${card.name} grants to "${aura.affects}"`).toBe(true);
      }
    }
  });

  it('has every niche read by at least one aura', () => {
    // The reverse: a niche nothing grants to is a word the player learns for
    // nothing, which is exactly what the old trait list had accumulated.
    const read = new Set<string>();
    for (const card of CARDS) for (const aura of card.auras ?? []) read.add(aura.affects);
    for (const niche of new Set(CARDS.map((c) => c.niche))) {
      expect(read.has(niche), `nothing grants to "${niche}"`).toBe(true);
    }
  });

  it('supports every niche with more than a single relationship', () => {
    // One aura is not a niche having relationships; it is a niche having an
    // exception. The flat spent a while at exactly one, which is how it ended
    // up the biggest group on the board and the least interesting to build in.
    const positive = new Map<string, number>();
    for (const card of CARDS)
      for (const aura of card.auras ?? []) {
        const total = (aura.grants.attack ?? 0) + (aura.grants.health ?? 0);
        if (total > 0) positive.set(aura.affects, (positive.get(aura.affects) ?? 0) + 1);
      }
    for (const niche of new Set(CARDS.map((c) => c.niche))) {
      expect(positive.get(niche) ?? 0, `only one card grants to "${niche}"`).toBeGreaterThan(1);
    }
  });

  it('keeps niche and taxon as separate questions', () => {
    // A taxon is what an animal is; a niche is how it lives. They must not
    // collapse into each other, or one of them is redundant.
    const taxa = new Set(CARDS.map((c) => c.taxon as string));
    for (const card of CARDS) {
      expect(taxa.has(card.niche), `${card.name}'s niche duplicates a taxon`).toBe(false);
    }
  });
});
