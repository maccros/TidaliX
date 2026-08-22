/**
 * A card that hits zero health from something other than a fresh blow — a
 * neighbour's aura going away, or the tide dropping its ceiling — is marked
 * dying rather than removed. It only actually leaves the board at the next
 * tide change, and only after that change's own sweep has taken everything
 * that was already dying, before the new phase gets a chance to mark
 * anything of its own. A direct combat kill or a toxic bite still settles
 * immediately, same as before this status existed.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, startGame } from '../src/resolver.js';
import { createGame, createInstance, resetInstanceIds } from '../src/state.js';
import type { CardInstance, GameEvent, GameState, PlayerId } from '../src/types.js';

/* -------------------------------------------------------------------------- */

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

/** Ends whoever's turn it currently is. Two calls always complete one round. */
function endTurn(state: GameState): { state: GameState; events: GameEvent[] } {
  return expectOk(applyAction(state, { type: 'END_TURN', player: state.activePlayer }));
}

beforeEach(() => resetInstanceIds());

/* -------------------------------------------------------------------------- */

describe('dying', () => {
  it('recovers if the aura comes back before the tide takes it', () => {
    let s = bareGame();
    s = place(s, 1, ['clown-anemonefish', 'bubble-tip-anemone']);
    s = place(s, 0, ['bumphead-parrotfish']);

    // Fish stands at 5 health with the anemone (3 printed + 2 from the aura).
    // Marked to 4 damage, it is fine with the anemone and at zero without it.
    const marked = structuredClone(s);
    find(marked, 1, 'clown-anemonefish').damage = 4;

    const anemone = find(marked, 1, 'bubble-tip-anemone');
    const bumphead = find(marked, 0, 'bumphead-parrotfish');
    const { state: dying, events: dyingEvents } = expectOk(
      applyAction(marked, {
        type: 'ATTACK',
        player: 0,
        attackerId: bumphead.instanceId,
        targetId: anemone.instanceId,
      }),
    );
    expect(dyingEvents).toContainEqual(
      expect.objectContaining({ type: 'SPECIES_DYING', definitionId: 'clown-anemonefish' }),
    );
    expect(find(dying, 1, 'clown-anemonefish').dying).toBe(true);

    // A second anemone lands, restoring the aura, before any tide change.
    const withSecondAnemone = structuredClone(dying);
    const replacement = createInstance('bubble-tip-anemone', 1);
    withSecondAnemone.players[1].hand.push(replacement);
    withSecondAnemone.players[1].energy = 10;
    withSecondAnemone.activePlayer = 1;

    const { state: steadied, events: steadiedEvents } = expectOk(
      applyAction(withSecondAnemone, {
        type: 'PLAY_CARD',
        player: 1,
        instanceId: replacement.instanceId,
      }),
    );

    expect(steadiedEvents).toContainEqual(
      expect.objectContaining({ type: 'SPECIES_STEADIED', definitionId: 'clown-anemonefish' }),
    );
    expect(find(steadied, 1, 'clown-anemonefish').dying).toBe(false);
    expect(steadied.players[1].board.map((c) => c.definitionId)).toContain('clown-anemonefish');
  });

  it('still kills a toxic bite outright, never as a status', () => {
    // Poison is a decision already made, not a health check — it must not
    // wait for a tide change just because nothing hit the card this action.
    let s = bareGame();
    s = place(s, 0, ['bumphead-parrotfish']);
    const marked = structuredClone(s);
    find(marked, 0, 'bumphead-parrotfish').poisoned = true;

    const { state: after, events } = endTurn(marked);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'CARD_DESTROYED', definitionId: 'bumphead-parrotfish', cause: 'toxin' }),
    );
    expect(events.some((e) => e.type === 'SPECIES_DYING')).toBe(false);
    expect(after.players[0].board).toHaveLength(0);
  });

  it('takes only what was already dying at a tide change, and marks — not kills — whatever that exposes', () => {
    // The anemone is already dying (set directly, as if marked on an earlier
    // turn) — and genuinely at zero health itself, or the next sweep would
    // just find it fine and recover it before the tide ever gets a say. The
    // fish is healthy only because of the anemone's aura.
    let s = bareGame();
    s = place(s, 1, ['clown-anemonefish', 'bubble-tip-anemone']);
    const marked = structuredClone(s);
    const anemoneInst = find(marked, 1, 'bubble-tip-anemone');
    anemoneInst.dying = true;
    anemoneInst.damage = 4; // printed health 4, no low-phase bonus: exactly zero
    // Fine at 5 (3 printed + 2 from the aura) now, at low tide. By the time
    // the tide reaches 'rising' — which is when it advances here — the fish's
    // own +1 rising bonus applies too, so the ceiling without the aura is
    // 3 + 1 = 4: needs 4 damage, not 3, to actually hit zero once it's gone.
    find(marked, 1, 'clown-anemonefish').damage = 4;

    let round = marked;
    ({ state: round } = endTurn(round));
    const { state: after, events } = endTurn(round);

    const destroyed = events
      .filter((e): e is Extract<GameEvent, { type: 'CARD_DESTROYED' }> => e.type === 'CARD_DESTROYED')
      .map((e) => e.definitionId);
    expect(destroyed).toEqual(['bubble-tip-anemone']);
    expect(destroyed).not.toContain('clown-anemonefish');

    expect(events).toContainEqual(
      expect.objectContaining({ type: 'SPECIES_DYING', definitionId: 'clown-anemonefish' }),
    );
    const fish = after.players[1].board.find((c) => c.definitionId === 'clown-anemonefish');
    expect(fish?.dying).toBe(true);
  });
});
