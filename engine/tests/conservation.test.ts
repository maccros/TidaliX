/**
 * The conservation pile: releasing a matured species back to the wild.
 *
 * The pile is the game's second economy and its second win condition, so these
 * tests care about three things — that a species has to *earn* its release by
 * surviving, that the pile is scored on biodiversity rather than volume, and
 * that filling it actually ends the game.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, legalActions, startGame } from '../src/resolver.js';
import { createGame, resetInstanceIds } from '../src/state.js';
import {
  canReleaseThisTurn,
  conservationIncome,
  conservedCount,
  conservedSpecies,
  conservedTaxa,
  cyclesOnBoard,
  isMature,
  stepsUntilMature,
  taxaToNextIncome,
} from '../src/economy.js';
import type { ActionResult, GameAction, GameEvent, GameState, PlayerId } from '../src/types.js';
import type { CreateGameOptions } from '../src/state.js';

function deck(cards: string[], size = 40): string[] {
  const pad = Math.max(0, size - cards.length);
  return [...cards, ...Array<string>(pad).fill('atlantic-mudskipper')];
}

function stackedGame(deck0: string[], deck1: string[], overrides: CreateGameOptions = {}) {
  resetInstanceIds();
  const state = createGame({
    ...overrides,
    decks: [deck(deck0), deck(deck1)],
    shuffleDecks: false,
    config: { startingHandSize: 0, ...overrides.config },
  });
  return startGame(state);
}

function must(state: GameState, action: GameAction): { state: GameState; events: GameEvent[] } {
  const result = applyAction(state, action);
  if (!result.ok) {
    throw new Error(`expected ${action.type} to succeed, got ${result.error}: ${result.message}`);
  }
  return { state: result.state, events: result.events };
}

function expectError(result: ActionResult, code: string) {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error).toBe(code);
}

function until(state: GameState, pred: (s: GameState) => boolean, limit = 60): GameState {
  let s = state;
  for (let i = 0; i < limit && !pred(s); i++) {
    s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
  }
  if (!pred(s)) throw new Error('condition never met within turn limit');
  return s;
}

/** End turns until `player` is active with at least `energy` and a card in hand. */
const ready = (player: PlayerId, energy: number) => (s: GameState) =>
  s.activePlayer === player && s.players[player].energy >= energy && s.players[player].hand.length > 0;

/** Play the first affordable card in hand and return its instance id. */
function playFirst(state: GameState, player: PlayerId): { state: GameState; instanceId: string } {
  const card = state.players[player].hand[0]!;
  return { state: must(state, { type: 'PLAY_CARD', player, instanceId: card.instanceId }).state, instanceId: card.instanceId };
}

/** Advance until `instanceId` on `player`'s board has matured and they may act. */
function untilMature(state: GameState, player: PlayerId, instanceId: string): GameState {
  return until(state, (s) => {
    if (s.activePlayer !== player) return false;
    const inst = s.players[player].board.find((c) => c.instanceId === instanceId);
    return !!inst && isMature(s, inst);
  });
}

beforeEach(() => resetInstanceIds());

/* -------------------------------------------------------------------------- */

describe('release maturity', () => {
  it('refuses to release a species the turn it is played', () => {
    let s = until(stackedGame([], []).state, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = after;

    expect(isMature(s, s.players[0].board[0]!)).toBe(false);
    expectError(applyAction(s, { type: 'RELEASE', player: 0, instanceId }), 'NOT_MATURE');
  });

  it('counts maturity in tide steps, so a whole cycle must turn', () => {
    let s = until(stackedGame([], []).state, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = after;

    const inst = () => s.players[0].board.find((c) => c.instanceId === instanceId)!;
    expect(stepsUntilMature(s, inst())).toBe(4);
    expect(cyclesOnBoard(s, inst())).toBe(0);

    s = untilMature(s, 0, instanceId);
    expect(cyclesOnBoard(s, inst())).toBe(1);
    expect(stepsUntilMature(s, inst())).toBe(0);
  });

  it('releases a matured species into the conservation pile, off the board', () => {
    let s = until(stackedGame([], []).state, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = untilMature(after, 0, instanceId);

    const { state: next, events } = must(s, { type: 'RELEASE', player: 0, instanceId });

    expect(next.players[0].board.find((c) => c.instanceId === instanceId)).toBeUndefined();
    expect(next.players[0].conservation.map((c) => c.instanceId)).toContain(instanceId);
    // Neither destroyed nor discarded — the pile is its own zone.
    expect(next.players[0].discard.map((c) => c.instanceId)).not.toContain(instanceId);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'SPECIES_RELEASED', player: 0, instanceId }),
    );
  });

  it('frees the board slot it was occupying', () => {
    let s = until(stackedGame([], [], { config: { maxBoardSize: 1 } }).state, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = untilMature(after, 0, instanceId);

    expectError(
      applyAction(s, { type: 'PLAY_CARD', player: 0, instanceId: s.players[0].hand[0]!.instanceId }),
      'BOARD_FULL',
    );

    s = must(s, { type: 'RELEASE', player: 0, instanceId }).state;
    expect(s.players[0].board).toHaveLength(0);
    must(s, { type: 'PLAY_CARD', player: 0, instanceId: s.players[0].hand[0]!.instanceId });
  });

  it('allows only so many releases per turn', () => {
    let s = until(
      stackedGame([], []).state,
      (g) => ready(0, 2)(g) && g.players[0].hand.length >= 2,
    );
    const first = playFirst(s, 0);
    s = first.state;
    const second = playFirst(s, 0);
    s = untilMature(second.state, 0, first.instanceId);

    expect(canReleaseThisTurn(s, 0)).toBe(true);
    s = must(s, { type: 'RELEASE', player: 0, instanceId: first.instanceId }).state;

    expect(canReleaseThisTurn(s, 0)).toBe(false);
    expectError(
      applyAction(s, { type: 'RELEASE', player: 0, instanceId: second.instanceId }),
      'RELEASE_LIMIT_REACHED',
    );
  });

  it('resets the per-turn release allowance at the start of a turn', () => {
    let s = until(
      stackedGame([], []).state,
      (g) => ready(0, 2)(g) && g.players[0].hand.length >= 2,
    );
    const first = playFirst(s, 0);
    s = first.state;
    const second = playFirst(s, 0);
    s = untilMature(second.state, 0, first.instanceId);
    s = must(s, { type: 'RELEASE', player: 0, instanceId: first.instanceId }).state;

    s = until(s, (g) => g.activePlayer === 0 && g.players[0].releasesThisTurn === 0);
    expect(canReleaseThisTurn(s, 0)).toBe(true);
    must(s, { type: 'RELEASE', player: 0, instanceId: second.instanceId });
  });

  it('rejects releasing something that is not on your board', () => {
    const s = stackedGame([], []).state;
    expectError(
      applyAction(s, { type: 'RELEASE', player: 0, instanceId: 'no-such-card' }),
      'CARD_NOT_ON_BOARD',
    );
  });

  it('offers matured species through legalActions, and nothing before that', () => {
    let s = until(stackedGame([], []).state, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = after;
    expect(legalActions(s).some((a) => a.type === 'RELEASE')).toBe(false);

    s = untilMature(s, 0, instanceId);
    expect(legalActions(s)).toContainEqual({ type: 'RELEASE', player: 0, instanceId });
  });
});

describe('conservation scoring', () => {
  /** A pile built by hand, so scoring can be tested without playing a game out. */
  function pileOf(state: GameState, definitionIds: string[]) {
    return {
      ...state.players[0],
      conservation: definitionIds.map((definitionId, i) => ({
        instanceId: `p${i}`,
        definitionId,
        owner: 0 as PlayerId,
        damage: 0,
        playedOnTurn: null,
        playedOnTideStep: null,
        hasAttacked: false,
        poisoned: false,
      })),
    };
  }

  it('scores biodiversity, not volume — duplicates of one animal count once', () => {
    const state = stackedGame([], []).state;
    const player = pileOf(state, ['clown-anemonefish', 'clown-anemonefish', 'clown-anemonefish']);

    expect(conservedSpecies(player)).toBe(1);
    expect(conservedCount(player)).toBe(1);

    player.conservation.push(...pileOf(state, ['giant-clam']).conservation);
    expect(conservedSpecies(player)).toBe(2);
    expect(conservedCount(player)).toBe(2);
  });

  it('scores lineages, not names — three different fish are still one branch', () => {
    const state = stackedGame([], []).state;
    // Three genuinely different animals, three different binomials, one lineage.
    const fishOnly = pileOf(state, ['clown-anemonefish', 'regal-blue-tang', 'great-barracuda']);

    expect(conservedSpecies(fishOnly)).toBe(3);
    expect(conservedCount(fishOnly)).toBe(1);
    expect(conservedTaxa(fishOnly)).toEqual(['fish']);

    // One crab is worth more to the pile than any number of further fish.
    const spread = pileOf(state, [
      'clown-anemonefish',
      'regal-blue-tang',
      'great-barracuda',
      'sally-lightfoot-crab',
    ]);
    expect(conservedCount(spread)).toBe(2);
    expect(conservedTaxa(spread)).toEqual(['fish', 'crustacean']);
  });

  it('records lineages in the order they were first protected', () => {
    const state = stackedGame([], []).state;
    const player = pileOf(state, ['giant-clam', 'staghorn-coral', 'giant-clam', 'common-octopus']);
    expect(conservedTaxa(player)).toEqual(['mollusc', 'cnidarian', 'cephalopod']);
  });

  it('pays nothing until the pile is deep enough for one step of income', () => {
    // Pinned to its own config so the assertion tests the rule — income is
    // floor(distinct / conservationIncomePer) — rather than the shipped number,
    // which is a balance knob and expected to move.
    const base = stackedGame([], [], { config: { conservationIncomePer: 2 } }).state;
    let s = until(base, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = untilMature(after, 0, instanceId);
    expect(conservationIncome(s, 0)).toBe(0);

    s = must(s, { type: 'RELEASE', player: 0, instanceId }).state;
    // One lineage conserved against a threshold of two — still nothing yet.
    expect(conservedCount(s.players[0])).toBe(1);
    expect(conservationIncome(s, 0)).toBe(0);
    expect(taxaToNextIncome(s, 0)).toBe(1);
  });

  it('pays on every lineage when the threshold is one', () => {
    const base = stackedGame([], [], { config: { conservationIncomePer: 1 } }).state;
    let s = until(base, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = untilMature(after, 0, instanceId);
    expect(conservationIncome(s, 0)).toBe(0);

    s = must(s, { type: 'RELEASE', player: 0, instanceId }).state;
    // The first release is felt immediately — that is the point of per-lineage.
    expect(conservedCount(s.players[0])).toBe(1);
    expect(conservationIncome(s, 0)).toBe(1);
  });

  it('pays nothing extra for a second animal from a lineage already protected', () => {
    // Two mudskippers: two releases, two species in the pile, one lineage — and
    // so exactly one point of income. This is the whole change in one case.
    const base = stackedGame([], [], { config: { conservationIncomePer: 1 } }).state;
    let s = until(base, ready(0, 1));
    const first = playFirst(s, 0);
    s = untilMature(first.state, 0, first.instanceId);
    s = must(s, { type: 'RELEASE', player: 0, instanceId: first.instanceId }).state;
    expect(conservationIncome(s, 0)).toBe(1);

    s = until(s, ready(0, 1));
    const second = playFirst(s, 0);
    s = untilMature(second.state, 0, second.instanceId);
    s = must(s, { type: 'RELEASE', player: 0, instanceId: second.instanceId }).state;

    expect(s.players[0].conservation).toHaveLength(2);
    expect(conservedCount(s.players[0])).toBe(1);
    expect(conservationIncome(s, 0)).toBe(1);
  });

  it('adds a conservation line to the income once it is paying', () => {
    const base = stackedGame([], [], { config: { conservationIncomePer: 1 } }).state;
    let s = until(base, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = untilMature(after, 0, instanceId);
    s = must(s, { type: 'RELEASE', player: 0, instanceId }).state;

    expect(conservationIncome(s, 0)).toBe(1);

    // The income actually lands on the next turn, tagged with its own source.
    const next = until(s, (g) => g.activePlayer === 0 && g.turn > s.turn);
    const events = must(until(s, (g) => g.activePlayer === 1), {
      type: 'END_TURN',
      player: 1,
    }).events;
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'ENERGY_GAINED', player: 0, source: 'conservation' }),
    );
    expect(next.players[0].energy).toBeGreaterThan(next.players[0].energyCap);
  });
});

describe('conservation victory', () => {
  it('wins outright when the pile reaches the target', () => {
    // A one-lineage target makes the condition testable without a long game.
    const base = stackedGame([], [], { config: { conservationVictory: 1 } }).state;
    let s = until(base, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = untilMature(after, 0, instanceId);

    expect(s.winner).toBeUndefined();
    const { state: next, events } = must(s, { type: 'RELEASE', player: 0, instanceId });

    expect(next.winner).toBe(0);
    expect(events).toContainEqual({ type: 'GAME_OVER', winner: 0, reason: 'conservation' });
    expectError(applyAction(next, { type: 'END_TURN', player: 0 }), 'GAME_OVER');
  });

  it('is disabled when the target is zero', () => {
    const base = stackedGame([], [], { config: { conservationVictory: 0 } }).state;
    let s = until(base, ready(0, 1));
    const { state: after, instanceId } = playFirst(s, 0);
    s = untilMature(after, 0, instanceId);
    s = must(s, { type: 'RELEASE', player: 0, instanceId }).state;

    expect(s.winner).toBeUndefined();
  });
});
