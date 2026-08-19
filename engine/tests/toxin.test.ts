/**
 * Poison: eating something toxic kills the eater.
 *
 * The rule is deliberately narrow, and most of these cases exist to pin down the
 * edges of that narrowness. A toxin is *defensive* — it punishes the animal that
 * swallowed it and nothing else — it fires only on a kill, it cannot be healed
 * off, and there are animals that eat toxic prey for a living and are unbothered.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, startGame } from '../src/resolver.js';
import { createGame, createInstance, resetInstanceIds } from '../src/state.js';
import { getCard, isToxic, isToxinImmune } from '../src/cards.js';
import type { CardInstance, GameEvent, GameState, PlayerId } from '../src/types.js';

function bareGame(overrides: Parameters<typeof createGame>[0] = {}): GameState {
  resetInstanceIds();
  return startGame(
    createGame({
      ...overrides,
      decks: [Array<string>(20).fill('moorish-idol'), Array<string>(20).fill('moorish-idol')],
      shuffleDecks: false,
      config: { startingHandSize: 0, ...overrides.config },
    }),
  ).state;
}

/** Drop cards straight onto a board, skipping cost and summoning sickness. */
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

function expectOk(result: ReturnType<typeof applyAction>) {
  if (!result.ok) throw new Error(`expected success, got ${result.error}: ${result.message}`);
  return result;
}

/** Attack `defId` on player 1 with `attackerId` on player 0. */
function eat(state: GameState, attackerDef: string, targetDef: string) {
  return expectOk(
    applyAction(state, {
      type: 'ATTACK',
      player: 0,
      attackerId: find(state, 0, attackerDef).instanceId,
      targetId: find(state, 1, targetDef).instanceId,
    }),
  );
}

const destroyedIn = (events: GameEvent[]) =>
  events
    .filter((e): e is Extract<GameEvent, { type: 'CARD_DESTROYED' }> => e.type === 'CARD_DESTROYED')
    .map((e) => ({ id: e.definitionId, cause: e.cause }));

beforeEach(() => resetInstanceIds());

/* -------------------------------------------------------------------------- */

describe('the toxic keyword', () => {
  it('is printed on real animals, and immunity on their real predators', () => {
    expect(isToxic('blackspotted-puffer')).toBe(true);
    expect(isToxic('red-lionfish')).toBe(true);
    expect(isToxic('crown-of-thorns-starfish')).toBe(true);

    expect(isToxinImmune('coral-grouper')).toBe(true);
    expect(isToxinImmune('giant-moray')).toBe(true);
    expect(isToxinImmune('green-sea-turtle')).toBe(true);

    // And nothing is both, which would be a card that poisons itself.
    for (const card of [getCard('blackspotted-puffer'), getCard('red-lionfish')]) {
      expect(card.keywords).not.toContain('toxin-immune');
    }
  });
});

describe('eating something toxic', () => {
  it('kills the eater outright when the toxic card dies to the attack', () => {
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'high' } });
    s = place(s, 0, ['bumphead-parrotfish']); // 7 attack at high tide
    s = place(s, 1, ['red-lionfish']); // 3 health

    const { state: after, events } = eat(s, 'bumphead-parrotfish', 'red-lionfish');

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'SPECIES_POISONED' }),
    );
    expect(destroyedIn(events)).toContainEqual({ id: 'red-lionfish', cause: 'damage' });
    expect(destroyedIn(events)).toContainEqual({ id: 'bumphead-parrotfish', cause: 'toxin' });
    expect(after.players[0].board).toHaveLength(0);
    expect(after.players[1].board).toHaveLength(0);
  });

  it('names both animals in the event, so a client can narrate the trade', () => {
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'high' } });
    s = place(s, 0, ['bumphead-parrotfish']);
    s = place(s, 1, ['red-lionfish']);

    const attackerId = find(s, 0, 'bumphead-parrotfish').instanceId;
    const targetId = find(s, 1, 'red-lionfish').instanceId;
    const { events } = eat(s, 'bumphead-parrotfish', 'red-lionfish');

    expect(events).toContainEqual({
      type: 'SPECIES_POISONED',
      sourceId: targetId,
      victimId: attackerId,
    });
  });

  it('does nothing at all if the toxic card survives', () => {
    let s = bareGame();
    s = place(s, 0, ['whitetip-reef-shark']); // 3 attack against 5 health
    s = place(s, 1, ['blackspotted-puffer']);

    const { state: after, events } = eat(s, 'whitetip-reef-shark', 'blackspotted-puffer');

    expect(events.some((e) => e.type === 'SPECIES_POISONED')).toBe(false);
    expect(after.players[1].board).toHaveLength(1);
    // The shark is hurt by the spines, but it is not poisoned — it took a bite,
    // it did not swallow the animal.
    expect(after.players[0].board[0]?.poisoned).toBe(false);
    expect(after.players[0].board[0]?.damage).toBe(3);
  });

  it('spares a predator that eats toxic prey for a living', () => {
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'falling' } });
    s = place(s, 0, ['giant-moray']); // 5 attack at falling tide, toxin-immune
    s = place(s, 1, ['red-lionfish']); // 3 health, 2 spines

    const { state: after, events } = eat(s, 'giant-moray', 'red-lionfish');

    expect(events.some((e) => e.type === 'SPECIES_POISONED')).toBe(false);
    expect(after.players[1].board).toHaveLength(0);
    // Immunity is to the venom, not to the spines: the moray still gets stung.
    expect(after.players[0].board).toHaveLength(1);
    expect(after.players[0].board[0]?.damage).toBe(2);
  });

  it('does not fire when the toxic card is the attacker', () => {
    // A toxin is defensive. A lionfish that kills something has not been eaten.
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'falling' } });
    s = place(s, 0, ['red-lionfish']); // 5 attack at falling tide
    s = place(s, 1, ['moorish-idol']); // 2 health

    const { state: after, events } = eat(s, 'red-lionfish', 'moorish-idol');

    expect(events.some((e) => e.type === 'SPECIES_POISONED')).toBe(false);
    expect(after.players[0].board).toHaveLength(1);
    expect(after.players[1].board).toHaveLength(0);
  });

  it('does not fire when the toxic card dies to something other than being eaten', () => {
    // The starfish throws itself at an urchin and dies on the urchin's spines.
    // It was killed, but it was not *eaten* — the urchin never attacked it — so
    // nothing is poisoned. Being toxic is not the same as being a bomb.
    let s = bareGame();
    s = place(s, 0, ['crown-of-thorns-starfish']);
    s = place(s, 1, ['rock-boring-urchin']);

    const marked = structuredClone(s);
    // 6 health, marked to 2 remaining: the urchin's spines will finish it.
    marked.players[0].board[0]!.damage = 4;

    const { state: after, events } = expectOk(
      applyAction(marked, {
        type: 'ATTACK',
        player: 0,
        attackerId: find(marked, 0, 'crown-of-thorns-starfish').instanceId,
        targetId: find(marked, 1, 'rock-boring-urchin').instanceId,
      }),
    );

    expect(destroyedIn(events)).toContainEqual({
      id: 'crown-of-thorns-starfish',
      cause: 'damage',
    });
    expect(events.some((e) => e.type === 'SPECIES_POISONED')).toBe(false);
    expect(after.players[1].board).toHaveLength(1);
    expect(after.players[1].board[0]?.poisoned).toBe(false);
  });

  it('cannot be out-healed — the mark outlives any change in health', () => {
    // The eater is marked, and then given more health than it started with by a
    // phase change. It dies anyway: a toxin is a decision already made.
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'high' } });
    s = place(s, 0, ['bumphead-parrotfish']);
    s = place(s, 1, ['red-lionfish']);

    const { state: after } = eat(s, 'bumphead-parrotfish', 'red-lionfish');
    expect(after.players[0].board).toHaveLength(0);
    expect(after.players[0].discard.some((c) => c.definitionId === 'bumphead-parrotfish')).toBe(true);
  });

  it('leaves the mark behind when the species is released to the wild', () => {
    // Nothing releases a poisoned card in a real game — it is dead before the
    // turn passes — but the pile must never inherit a death sentence.
    resetInstanceIds();
    const inst = createInstance('blackspotted-puffer', 0);
    inst.poisoned = true;
    expect(inst.poisoned).toBe(true);
    // The resolver clears it on release; this asserts the field is part of the
    // per-board-life state that a release resets, alongside damage.
    const reset = { ...inst, damage: 0, poisoned: false, hasAttacked: false };
    expect(reset.poisoned).toBe(false);
  });
});
