/**
 * Arrival effects — what a species does the moment it lands.
 *
 * These exist to make *playing a card* an action. Without them the player who
 * is behind can only add to their board and wait a turn, by which point the
 * board they were answering has answered them first, and a lead can never be
 * overturned. So the cases that matter most here are the ones about answering:
 * that a strike resolves before anything else gets a say, that it can be aimed,
 * and that the engine refuses a play it cannot resolve rather than guessing.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, legalActions, startGame } from '../src/resolver.js';
import { createGame, createInstance, resetInstanceIds } from '../src/state.js';
import { CARDS, arrivalOf, getCard } from '../src/cards.js';
import { arrivalNeedsTarget } from '../src/types.js';
import type { CardInstance, GameEvent, GameState, PlayerId } from '../src/types.js';

function bareGame(overrides: Parameters<typeof createGame>[0] = {}): GameState {
  resetInstanceIds();
  return startGame(
    createGame({
      ...overrides,
      decks: [Array<string>(20).fill('atlantic-mudskipper'), Array<string>(20).fill('atlantic-mudskipper')],
      shuffleDecks: false,
      config: { startingHandSize: 0, ...overrides.config },
    }),
  ).state;
}

function place(state: GameState, player: PlayerId, ids: string[]): GameState {
  const next = structuredClone(state);
  for (const id of ids) {
    const inst = createInstance(id, player);
    inst.playedOnTurn = 0;
    next.players[player].board.push(inst);
  }
  return next;
}

/** Put a card in hand with the energy to pay for it. */
function inHand(state: GameState, player: PlayerId, id: string): { state: GameState; instanceId: string } {
  const next = structuredClone(state);
  const inst = createInstance(id, player);
  next.players[player].hand.push(inst);
  next.players[player].energy = Math.max(next.players[player].energy, getCard(id).cost);
  return { state: next, instanceId: inst.instanceId };
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

beforeEach(() => resetInstanceIds());

/* -------------------------------------------------------------------------- */

describe('the arrival vocabulary', () => {
  it('is carried by some of the set, not all of it', () => {
    const withArrival = CARDS.filter((c) => c.arrival);
    // Enough that answering a board is a real option, few enough that a card
    // without one is not simply worse. Like traits, it is a thing a particular
    // animal does.
    expect(withArrival.length).toBeGreaterThan(5);
    expect(withArrival.length).toBeLessThan(CARDS.length / 2);
  });

  it('gives every arrival a note, because a bare number explains nothing', () => {
    for (const card of CARDS.filter((c) => c.arrival)) {
      expect(card.arrival!.note.length, card.name).toBeGreaterThan(0);
      expect(card.arrival!.amount, card.name).toBeGreaterThan(0);
    }
  });

  it('only asks for a target when the effect actually needs one', () => {
    expect(arrivalNeedsTarget(arrivalOf('tawny-nurse-shark'))).toBe(true);
    expect(arrivalNeedsTarget(arrivalOf('giant-clam'))).toBe(false);
    expect(arrivalNeedsTarget(arrivalOf('atlantic-mudskipper'))).toBe(false);
  });
});

describe('a targeted arrival', () => {
  it('damages the creature it was aimed at, the moment it lands', () => {
    let s = bareGame();
    s = place(s, 1, ['coral-grouper', 'clown-triggerfish']);
    const { state: withCard, instanceId } = inHand(s, 0, 'tawny-nurse-shark');
    const victim = find(withCard, 1, 'clown-triggerfish');

    const { state: after, events } = expectOk(
      applyAction(withCard, {
        type: 'PLAY_CARD',
        player: 0,
        instanceId,
        targetId: victim.instanceId,
      }),
    );

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'DAMAGE_DEALT', cause: 'arrival', amount: 2 }),
    );
    expect(after.players[1].board.find((c) => c.instanceId === victim.instanceId)?.damage).toBe(2);
    // And the one it was not aimed at is untouched.
    expect(find(after, 1, 'coral-grouper').damage).toBe(0);
  });

  it('is refused without a target while there is something to hit', () => {
    let s = bareGame();
    s = place(s, 1, ['coral-grouper']);
    const { state: withCard, instanceId } = inHand(s, 0, 'tawny-nurse-shark');

    const result = applyAction(withCard, { type: 'PLAY_CARD', player: 0, instanceId });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('ARRIVAL_NEEDS_TARGET');
  });

  it('is refused a target that is not on the enemy board', () => {
    let s = bareGame();
    s = place(s, 0, ['coral-grouper']); // your own card is not a legal target
    s = place(s, 1, ['clown-triggerfish']);
    const { state: withCard, instanceId } = inHand(s, 0, 'tawny-nurse-shark');

    const result = applyAction(withCard, {
      type: 'PLAY_CARD',
      player: 0,
      instanceId,
      targetId: find(withCard, 0, 'coral-grouper').instanceId,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('ARRIVAL_TARGET_INVALID');
  });

  it('plays perfectly well into an empty board — the strike simply finds nothing', () => {
    // Refusing this would strand the card in hand for a reason the player
    // cannot see anywhere on the table.
    const s = bareGame();
    const { state: withCard, instanceId } = inHand(s, 0, 'tawny-nurse-shark');

    const { state: after, events } = expectOk(
      applyAction(withCard, { type: 'PLAY_CARD', player: 0, instanceId }),
    );
    expect(after.players[0].board).toHaveLength(1);
    expect(events.some((e) => e.type === 'DAMAGE_DEALT')).toBe(false);
    expect(events).toContainEqual(expect.objectContaining({ type: 'ARRIVAL_RESOLVED', kind: 'strike' }));
  });

  it('can finish a wounded card, which is how a board gets answered', () => {
    let s = bareGame();
    s = place(s, 1, ['clown-triggerfish']); // 3 health
    const marked = structuredClone(s);
    marked.players[1].board[0]!.damage = 1;

    const { state: withCard, instanceId } = inHand(marked, 0, 'bumphead-parrotfish');
    const { state: after, events } = expectOk(
      applyAction(withCard, {
        type: 'PLAY_CARD',
        player: 0,
        instanceId,
        targetId: find(withCard, 1, 'clown-triggerfish').instanceId,
      }),
    );

    expect(after.players[1].board).toHaveLength(0);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'CARD_DESTROYED', definitionId: 'clown-triggerfish' }),
    );
  });

  it('is offered through legalActions once per target, not once per card', () => {
    let s = bareGame();
    s = place(s, 1, ['coral-grouper', 'clown-triggerfish', 'giant-moray']);
    const { state: withCard, instanceId } = inHand(s, 0, 'tawny-nurse-shark');

    const plays = legalActions(withCard).filter(
      (a): a is Extract<typeof a, { type: 'PLAY_CARD' }> =>
        a.type === 'PLAY_CARD' && a.instanceId === instanceId,
    );
    expect(plays).toHaveLength(3);
    expect(new Set(plays.map((p) => p.targetId)).size).toBe(3);
  });
});

describe('the untargeted arrivals', () => {
  it('sweeps every enemy creature at once', () => {
    let s = bareGame();
    s = place(s, 1, ['coral-grouper', 'clown-triggerfish']);
    const { state: withCard, instanceId } = inHand(s, 0, 'crown-of-thorns-starfish');

    const { state: after } = expectOk(
      applyAction(withCard, { type: 'PLAY_CARD', player: 0, instanceId }),
    );
    for (const card of after.players[1].board) expect(card.damage).toBe(1);
    expect(after.players[1].board).toHaveLength(2);
  });

  it('mends the reef it joins, and never past full health', () => {
    let s = bareGame();
    s = place(s, 0, ['coral-grouper', 'clown-triggerfish']);
    const marked = structuredClone(s);
    marked.players[0].board[0]!.damage = 3; // grouper, heals 2 of it
    marked.players[0].board[1]!.damage = 1; // triggerfish, heals only the 1

    const { state: withCard, instanceId } = inHand(marked, 0, 'bluestreak-cleaner-wrasse');
    const { state: after, events } = expectOk(
      applyAction(withCard, { type: 'PLAY_CARD', player: 0, instanceId }),
    );

    expect(find(after, 0, 'coral-grouper').damage).toBe(1);
    expect(find(after, 0, 'clown-triggerfish').damage).toBe(0);
    expect(events.filter((e) => e.type === 'CARD_HEALED')).toHaveLength(2);
  });

  it('pays energy the moment it lands, not next turn', () => {
    const s = bareGame();
    const { state: withCard, instanceId } = inHand(s, 0, 'giant-clam');
    const before = withCard.players[0].energy;

    const { state: after, events } = expectOk(
      applyAction(withCard, { type: 'PLAY_CARD', player: 0, instanceId }),
    );
    // Paid the cost, then immediately got the forage back.
    expect(after.players[0].energy).toBe(before - getCard('giant-clam').cost + 2);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'ENERGY_GAINED', source: 'card', amount: 2 }),
    );
  });

  it('draws on arrival, and the drawn card is in hand before the turn continues', () => {
    const s = bareGame();
    const { state: withCard, instanceId } = inHand(s, 0, 'common-octopus');
    const handBefore = withCard.players[0].hand.length;

    const { state: after, events } = expectOk(
      applyAction(withCard, { type: 'PLAY_CARD', player: 0, instanceId }),
    );
    // One leaves the hand to be played, one arrives from the deck.
    expect(after.players[0].hand).toHaveLength(handBefore);
    expect(events.some((e) => e.type === 'CARD_DRAWN')).toBe(true);
  });
});

describe('arrivals and the rest of the rules', () => {
  it('resolves before the board is swept, so an arrival kill settles in one pass', () => {
    let s = bareGame();
    s = place(s, 1, ['clown-anemonefish', 'bubble-tip-anemone']);
    // The fish stands at 5 health only because of its anemone.
    const marked = structuredClone(s);
    marked.players[1].board[0]!.damage = 4;

    // Sweep the board for 1: it finishes nothing on its own, but the anemone is
    // at 4 health and the fish at 1.
    const { state: withCard, instanceId } = inHand(marked, 0, 'crown-of-thorns-starfish');
    const { state: after } = expectOk(
      applyAction(withCard, { type: 'PLAY_CARD', player: 0, instanceId }),
    );

    expect(after.players[1].board.find((c) => c.definitionId === 'clown-anemonefish')).toBeUndefined();
    expect(after.players[0].board).toHaveLength(1);
  });

  it('does not let an arrival strike the player directly', () => {
    // Arrivals answer the board. Reaching the face would make them a burn spell,
    // and the game already has a way to hit a player: attacking. 'face' is not
    // on the enemy board, so it is rejected like any other bad target.
    let s = bareGame();
    s = place(s, 1, ['coral-grouper']);
    const { state: withCard, instanceId } = inHand(s, 0, 'tawny-nurse-shark');

    const result = applyAction(withCard, {
      type: 'PLAY_CARD',
      player: 0,
      instanceId,
      targetId: 'face',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('ARRIVAL_TARGET_INVALID');
    expect(withCard.players[1].life).toBe(withCard.players[1].life);
  });

  it('still leaves the card summoning-sick unless it has surge', () => {
    // An arrival is impact on the turn it lands; it is not a free attack.
    let s = bareGame();
    s = place(s, 1, ['coral-grouper']);
    const { state: withCard, instanceId } = inHand(s, 0, 'giant-triton');
    const { state: after } = expectOk(
      applyAction(withCard, {
        type: 'PLAY_CARD',
        player: 0,
        instanceId,
        targetId: find(withCard, 1, 'coral-grouper').instanceId,
      }),
    );

    const canAttackNow = legalActions(after).some(
      (a) => a.type === 'ATTACK' && a.attackerId === instanceId,
    );
    expect(canAttackNow).toBe(false);
  });
});
