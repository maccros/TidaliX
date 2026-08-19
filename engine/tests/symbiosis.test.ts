/**
 * Spines and symbiosis — the two systems that make a card's outcome depend on
 * something other than its own printed line.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, startGame } from '../src/resolver.js';
import { boardView, createGame, createInstance, resetInstanceIds } from '../src/state.js';
import { effectiveStats, statsFor } from '../src/tide.js';
import { activeSymbioses, getCard } from '../src/cards.js';
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

describe('spines', () => {
  it('are printed on the card, not derived from its attack', () => {
    expect(getCard('blackspotted-puffer').spines).toBe(3);
    expect(getCard('rock-boring-urchin').spines).toBe(2);
    expect(getCard('bubble-tip-anemone').spines).toBe(1);
    // A big predator with no armament punishes nobody for attacking it.
    expect(getCard('great-barracuda').spines).toBeUndefined();
  });

  it('damage an attacker even though the defender never strikes back', () => {
    let s = bareGame();
    // A whitetip, not a trevally: 3 attack against 5 health leaves the puffer
    // alive, which keeps this case about spines alone. Kill a puffer and its
    // toxin kills you back, and that is a different rule — see toxin.test.ts.
    s = place(s, 0, ['whitetip-reef-shark']);
    s = place(s, 1, ['blackspotted-puffer']);

    const shark = find(s, 0, 'whitetip-reef-shark');
    const puffer = find(s, 1, 'blackspotted-puffer');

    const { state: after, events } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: shark.instanceId,
        targetId: puffer.instanceId,
      }),
    );

    const spineHit = events.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.cause === 'spines',
    );
    expect(spineHit?.amount).toBe(3);
    expect(after.players[0].board[0]?.damage).toBe(3);
    expect(after.players[1].board).toHaveLength(1); // the puffer lived, so nothing was eaten
    // And no retaliation event alongside it.
    expect(events.some((e) => e.type === 'DAMAGE_DEALT' && e.cause === 'retaliation')).toBe(false);
  });

  it('still land when the defender dies to the same attack', () => {
    let s = bareGame();
    s = place(s, 0, ['bumphead-parrotfish']); // 6 attack, but 4 and exposed at low tide
    s = place(s, 1, ['red-lionfish']); // 3 health, 2 spines

    const bumphead = find(s, 0, 'bumphead-parrotfish');
    const lionfish = find(s, 1, 'red-lionfish');

    const { state: after, events } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: bumphead.instanceId,
        targetId: lionfish.instanceId,
      }),
    );

    expect(after.players[1].board).toHaveLength(0);
    // The venom lands anyway — and the bumphead is stranded at low tide, so
    // exposure adds its +1 to the spines too. Attacking while exposed is
    // doubly punishing, which is the point of the window.
    //
    // Asserted on the event rather than on marked damage, because a lionfish is
    // toxic: the bumphead ate it and is off the board by the time the dust
    // settles. The spines still resolved on the way.
    const spineHit = events.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.cause === 'spines',
    );
    expect(spineHit?.amount).toBe(3);
  });

  it('are amplified by the attacker being exposed, and not otherwise', () => {
    // Same fight at high tide: the bumphead is in its element and takes spines flat.
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'high' } });
    s = place(s, 0, ['bumphead-parrotfish']);
    s = place(s, 1, ['red-lionfish']);

    const { events } = expectOk(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(s, 0, 'bumphead-parrotfish').instanceId,
        targetId: find(s, 1, 'red-lionfish').instanceId,
      }),
    );
    const spineHit = events.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.cause === 'spines',
    );
    expect(spineHit?.amount).toBe(2);
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
    // A mudskipper is a reef-fish: +2 attack from low tide, +2 health from coral.
    const s = place(bareGame(), 0, ['atlantic-mudskipper', 'staghorn-coral']);
    const stats = statOf(s, 0, 'atlantic-mudskipper');

    expect(s.phase).toBe('low');
    expect(stats.tideBonus).toEqual({ attack: 2, health: 0 });
    expect(stats.symbiosisBonus).toEqual({ attack: 0, health: 2 });
    expect(stats.attack).toBe(3);
    expect(stats.maxHealth).toBe(4);
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
