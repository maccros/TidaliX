import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, legalActions, startGame } from '../src/resolver.js';
import { DEFAULT_CONFIG, boardView, createGame, opponentOf, resetInstanceIds } from '../src/state.js';
import { conservedSpecies, energyIncome } from '../src/economy.js';
import type {
  ActionResult,
  GameAction,
  GameEvent,
  GameState,
  PlayerId,
  TidePhase,
} from '../src/types.js';
import type { CreateGameOptions } from '../src/state.js';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** Pads a stacked deck with a cheap filler card so nobody decks out mid-test. */
function deck(cards: string[], size = 30): string[] {
  const pad = Math.max(0, size - cards.length);
  return [...cards, ...Array<string>(pad).fill('clown-anemonefish')];
}

/**
 * A started game with hand-stacked, unshuffled decks and no opening hand, so
 * draw order is exactly deck order and every test knows where each card is.
 */
function stackedGame(deck0: string[], deck1: string[], overrides: CreateGameOptions = {}) {
  resetInstanceIds();
  const state = createGame({
    ...overrides,
    decks: [deck(deck0), deck(deck1)],
    shuffleDecks: false,
    // These cases stack a deck and draw from it, so the opener's skipped first
    // draw is switched off here and tested on its own below.
    config: { startingHandSize: 0, firstPlayerSkipsDraw: false, ...overrides.config },
  });
  return startGame(state);
}

/** Apply an action, asserting it was legal, and return the resulting state. */
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

/** End turns until `pred` holds. Throws rather than looping forever. */
function until(state: GameState, pred: (s: GameState) => boolean, limit = 40): GameState {
  let s = state;
  for (let i = 0; i < limit && !pred(s); i++) {
    s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
  }
  if (!pred(s)) throw new Error('condition never met within turn limit');
  return s;
}

/** Find a card in hand by its definition id. */
function inHand(state: GameState, player: PlayerId, definitionId: string) {
  const card = state.players[player].hand.find((c) => c.definitionId === definitionId);
  if (!card) throw new Error(`${definitionId} not in player ${player}'s hand`);
  return card;
}

const canAct = (player: PlayerId, energy: number, phase?: TidePhase) => (s: GameState) =>
  s.activePlayer === player &&
  s.players[player].energy >= energy &&
  (phase === undefined || s.phase === phase);

beforeEach(() => resetInstanceIds());

/* -------------------------------------------------------------------------- */

describe('game setup', () => {
  it('deals opening hands and leaves the rest in the deck', () => {
    const state = createGame({ seed: 7 });
    // Whoever moves second is dealt extra, as compensation for moving second.
    expect(state.players[state.startingPlayer].hand).toHaveLength(state.config.startingHandSize);
    expect(state.players[opponentOf(state.startingPlayer)].hand).toHaveLength(
      state.config.startingHandSize + state.config.secondPlayerBonusCards,
    );
    expect(state.turn).toBe(0);
    expect(state.phase).toBe('low');
    expect(state.winner).toBeUndefined();
  });

  it('pays whoever moves second, and only on their first turn', () => {
    // Moving first is worth about 63% of games; this is what it costs.
    const cfg = { secondPlayerBonusCards: 1, secondPlayerBonusEnergy: 1 };
    // Checked before `startGame`, which runs the opener's first draw and would
    // otherwise hide the extra card behind it.
    const dealt = createGame({
      seed: 7,
      startingPlayer: 0,
      config: { ...cfg, carryOverCap: 0 },
    });
    // Explicitly off — the shipped default now *has* the bonus, so a game
    // created without a config is not a control.
    const control = createGame({
      seed: 7,
      startingPlayer: 0,
      config: { secondPlayerBonusCards: 0, secondPlayerBonusEnergy: 0, carryOverCap: 0 },
    });
    expect(dealt.players[1].hand.length - control.players[1].hand.length).toBe(1);
    expect(dealt.players[0].hand.length).toBe(control.players[0].hand.length);

    // Energy is compared against an identical game without the bonus, because
    // income grows on its own and an absolute number proves nothing. Carry-over
    // is switched off in both, or the unspent bonus would follow player 1 into
    // every later turn and the "only once" half could not be seen.
    const energyAt = (game: ReturnType<typeof createGame>, turns: number) => {
      let s = startGame(game).state;
      for (let i = 0; i < turns; i++) s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
      return s.players[1].energy;
    };

    // One end-turn in, it is player 1's first turn.
    expect(energyAt(dealt, 1) - energyAt(control, 1)).toBe(1);
    // Three end-turns in, it is player 1's second, and the payment is over.
    expect(energyAt(dealt, 3) - energyAt(control, 3)).toBe(0);
  });

  it('opens the game the way the rules say: 4 cards each, no draw for the opener', () => {
    // Both sides look across at four cards. The difference is made entirely on
    // the first turn: the opener forgoes their draw and starts on base capacity;
    // whoever is second draws as normal and gets one extra energy.
    const opened = startGame(createGame({ seed: 7, startingPlayer: 0 }));
    const s = opened.state;

    expect(s.players[0].hand).toHaveLength(DEFAULT_CONFIG.startingHandSize);
    expect(s.players[1].hand).toHaveLength(DEFAULT_CONFIG.startingHandSize);
    expect(s.players[0].energy).toBe(DEFAULT_CONFIG.startingEnergyCap);
    expect(opened.events.map((e) => e.type)).not.toContain('CARD_DRAWN');
    expect(opened.events.map((e) => e.type)).toContain('TURN_SKIPPED_DRAW');

    const next = must(s, { type: 'END_TURN', player: 0 }).state;
    expect(next.players[1].hand).toHaveLength(DEFAULT_CONFIG.startingHandSize + 1);
    expect(next.players[1].energy).toBe(
      DEFAULT_CONFIG.startingEnergyCap + DEFAULT_CONFIG.secondPlayerBonusEnergy,
    );
  });

  it('puts the second-turn energy in the receipt, not beside it', () => {
    // The panel builds "earned this turn" from these lines, so an amount that
    // reached the bank without being one of them was silently missing.
    let s = startGame(createGame({ seed: 7, startingPlayer: 0 })).state;
    s = must(s, { type: 'END_TURN', player: 0 }).state;

    const lines = s.players[1].incomeThisTurn;
    expect(lines.map((l) => l.source)).toContain('compensation');
    expect(lines.reduce((sum, l) => sum + l.amount, 0)).toBe(s.players[1].energy);
  });

  it('opens both players at low tide, whoever moves first', () => {
    // The tide used to advance whenever *player 1* ended a turn, which assumed
    // player 0 always opened. With an AI opening, the human's first turn landed
    // on the rising tide — a phase into a game they had not played yet.
    for (const startingPlayer of [0, 1] as const) {
      let s = startGame(createGame({ seed: 5, startingPlayer })).state;
      expect(s.phase).toBe('low');
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
      expect(s.phase, 'still low for the second player of round one').toBe('low');
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
      expect(s.phase, 'turns once the round is complete').toBe('rising');
    }
  });

  it('is deterministic for a given seed', () => {
    resetInstanceIds();
    const a = createGame({ seed: 99 });
    resetInstanceIds();
    const b = createGame({ seed: 99 });
    expect(a.players[0].hand.map((c) => c.definitionId)).toEqual(
      b.players[0].hand.map((c) => c.definitionId),
    );
    expect(a.players[0].deck.map((c) => c.definitionId)).toEqual(
      b.players[0].deck.map((c) => c.definitionId),
    );
  });

  it('produces different openings for different seeds', () => {
    resetInstanceIds();
    const a = createGame({ seed: 1 });
    resetInstanceIds();
    const b = createGame({ seed: 2 });
    expect(a.players[0].hand.map((c) => c.definitionId)).not.toEqual(
      b.players[0].hand.map((c) => c.definitionId),
    );
  });
});

describe('turn lifecycle', () => {
  it('opens on turn one for player 0 with the starting cap and a fresh card', () => {
    const { state, events } = stackedGame([], []);
    expect(state.turn).toBe(1);
    expect(state.round).toBe(1);
    expect(state.activePlayer).toBe(0);
    expect(state.players[0].energy).toBe(DEFAULT_CONFIG.startingEnergyCap);
    expect(state.players[0].hand).toHaveLength(1);
    expect(events.map((e) => e.type)).toContain('CARD_DRAWN');
  });

  it('raises the cap once per complete tide cycle, not once per round', () => {
    // The tide steps once per round, so a cycle is four rounds — eight turns.
    let s = stackedGame([], []).state;
    const caps: number[] = [];
    for (let i = 0; i < 12; i++) {
      caps.push(s.players[s.activePlayer].energyCap);
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
    }
    // Rounds 1-4 sit at the starting cap; only when the cycle closes does it move.
    expect(caps).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3]);
  });

  it('counts cycles off the tide, so a faster tide ramps the economy faster', () => {
    let s = stackedGame([], [], { config: { tideAdvancesEvery: 'turn' } }).state;
    const caps: number[] = [];
    for (let i = 0; i < 10; i++) {
      caps.push(s.players[s.activePlayer].energyCap);
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
    }
    // One phase per turn means a cycle closes every four turns, not every eight.
    expect(caps).toEqual([2, 2, 2, 2, 3, 3, 3, 3, 4, 4]);
  });

  it('never raises the cap past its ceiling', () => {
    let s = stackedGame([], [], { config: { tideAdvancesEvery: 'turn', maxEnergyCap: 3 } }).state;
    for (let i = 0; i < 30; i++) {
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
    }
    expect(s.players[s.activePlayer].energyCap).toBe(3);
  });

  it('advances the tide once per round by default, not once per turn', () => {
    let s = stackedGame([], []).state;
    const seen: TidePhase[] = [s.phase];
    for (let i = 0; i < 4; i++) {
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
      seen.push(s.phase);
    }
    expect(seen).toEqual(['low', 'low', 'rising', 'rising', 'high']);
  });

  it('advances every turn when configured to', () => {
    let s = stackedGame([], [], { config: { tideAdvancesEvery: 'turn' } }).state;
    const seen: TidePhase[] = [s.phase];
    for (let i = 0; i < 3; i++) {
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
      seen.push(s.phase);
    }
    expect(seen).toEqual(['low', 'rising', 'high', 'falling']);
  });

  it('pays the flood bonus on top of the cap, and carries unspent plankton', () => {
    const s = until(stackedGame([], []).state, (g) => g.phase === 'rising');
    const active = s.players[s.activePlayer];
    expect(s.round).toBe(2);
    expect(active.energyCap).toBe(2); // still the starting cap — no cycle has closed
    // 2 cap + 2 carried from an unspent turn 1 + 2 from the flood.
    expect(active.energy).toBe(6);
    expect(s.config.tideEnergy.rising).toBe(2);
  });

  it('pays nothing at all on a drained flat', () => {
    const s = until(stackedGame([], []).state, (g) => g.phase === 'low' && g.round > 1);
    expect(s.config.tideEnergy.low).toBe(0);
  });

  it('carries unspent energy, but never more than the cap', () => {
    // Nothing is ever played, so every turn banks the maximum carry.
    let s = stackedGame([], []).state;
    const carried: number[] = [];
    for (let i = 0; i < 8; i++) {
      s = must(s, { type: 'END_TURN', player: s.activePlayer }).state;
      const p = s.players[s.activePlayer];
      carried.push(p.energy - p.energyCap - s.config.tideEnergy[s.phase]);
    }
    expect(Math.max(...carried)).toBe(s.config.carryOverCap);
    expect(carried.every((c) => c <= s.config.carryOverCap)).toBe(true);
  });

  it('destroys the surplus above the carry cap rather than banking it', () => {
    const s = until(
      stackedGame([], [], { config: { startingHandSize: 0, carryOverCap: 0 } }).state,
      (g) => g.round === 3,
    );
    const p = s.players[s.activePlayer];
    // With no carry allowed, energy is exactly ramp + phase income.
    expect(p.energy).toBe(p.energyCap + s.config.tideEnergy[s.phase]);
  });

  it('emits a tide-change event naming both phases', () => {
    let s = stackedGame([], []).state;
    s = must(s, { type: 'END_TURN', player: 0 }).state;
    const { events } = must(s, { type: 'END_TURN', player: 1 });
    expect(events).toContainEqual({ type: 'TIDE_CHANGED', from: 'low', to: 'rising' });
  });

  it('deals mounting fatigue damage once the deck runs dry', () => {
    // Genuinely tiny decks — `deck()` pads, so build these by hand.
    resetInstanceIds();
    let s = startGame(
      createGame({
        decks: [['clown-anemonefish'], ['clown-anemonefish']],
        shuffleDecks: false,
        // The opener's skipped draw would delay the first empty draw by a turn
        // and this case is about fatigue, not about who moved first.
        config: { startingHandSize: 0, firstPlayerSkipsDraw: false },
      }),
    ).state;

    const startLife = s.players[0].life;
    s = must(s, { type: 'END_TURN', player: 0 }).state;
    s = must(s, { type: 'END_TURN', player: 1 }).state; // player 0 draws on empty
    expect(s.players[0].life).toBe(startLife - 1);

    s = must(s, { type: 'END_TURN', player: 0 }).state;
    s = must(s, { type: 'END_TURN', player: 1 }).state;
    expect(s.players[0].life).toBe(startLife - 1 - 2);
  });
});

describe('playing cards', () => {
  it('moves a card from hand to board and spends its energy', () => {
    const { state } = stackedGame(['clown-anemonefish'], []);
    const card = inHand(state, 0, 'clown-anemonefish');

    const { state: next, events } = must(state, {
      type: 'PLAY_CARD',
      player: 0,
      instanceId: card.instanceId,
    });

    expect(next.players[0].hand).toHaveLength(0);
    expect(next.players[0].board.map((c) => c.instanceId)).toEqual([card.instanceId]);
    expect(next.players[0].energy).toBe(state.players[0].energy - 1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'CARD_PLAYED', definitionId: 'clown-anemonefish' }),
    );
  });

  it('rejects a card the player cannot pay for', () => {
    const { state } = stackedGame(['bumphead-parrotfish'], []);
    const card = inHand(state, 0, 'bumphead-parrotfish');
    expectError(
      applyAction(state, { type: 'PLAY_CARD', player: 0, instanceId: card.instanceId }),
      'NOT_ENOUGH_ENERGY',
    );
  });

  it('rejects a card that is not in hand', () => {
    const { state } = stackedGame([], []);
    expectError(
      applyAction(state, { type: 'PLAY_CARD', player: 0, instanceId: 'no-such-card' }),
      'CARD_NOT_IN_HAND',
    );
  });

  it('rejects actions from the player whose turn it is not', () => {
    const { state } = stackedGame([], []);
    expectError(applyAction(state, { type: 'END_TURN', player: 1 }), 'NOT_YOUR_TURN');
  });

  it('leaves the caller state untouched when an action is rejected', () => {
    const { state } = stackedGame(['bumphead-parrotfish'], []);
    const before = structuredClone(state);
    applyAction(state, {
      type: 'PLAY_CARD',
      player: 0,
      instanceId: inHand(state, 0, 'bumphead-parrotfish').instanceId,
    });
    expect(state).toEqual(before);
  });

  it('refuses to overfill the reef', () => {
    let s = stackedGame([], [], { config: { startingHandSize: 0, maxBoardSize: 1 } }).state;
    // Two cheap cards in hand and the energy for both, so only the board can refuse.
    s = until(s, (g) => canAct(0, 2)(g) && g.players[0].hand.length >= 2);
    const first = s.players[0].hand[0]!;
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: first.instanceId }).state;
    const second = s.players[0].hand[0]!;
    expectError(
      applyAction(s, { type: 'PLAY_CARD', player: 0, instanceId: second.instanceId }),
      'BOARD_FULL',
    );
  });

  it('applies the tide bonus the moment the card hits the board', () => {
    // A mudskipper at low tide is a 3/2 on the board, not the printed 1/2.
    const { state } = stackedGame(['atlantic-mudskipper'], []);
    const { state: next } = must(state, {
      type: 'PLAY_CARD',
      player: 0,
      instanceId: inHand(state, 0, 'atlantic-mudskipper').instanceId,
    });
    expect(next.phase).toBe('low');
    const view = boardView(next, 0)[0]!;
    expect(view.attack).toBe(3);
    expect(view.printedAttack).toBe(1);
  });

  it('re-stats the whole board when the tide turns, with no extra bookkeeping', () => {
    let s = stackedGame(['atlantic-mudskipper'], []).state;
    s = must(s, {
      type: 'PLAY_CARD',
      player: 0,
      instanceId: inHand(s, 0, 'atlantic-mudskipper').instanceId,
    }).state;
    expect(boardView(s, 0)[0]!.attack).toBe(3); // low

    s = until(s, (g) => g.phase === 'high');
    const view = boardView(s, 0)[0]!;
    expect(view.attack).toBe(0); // printed 1, -1 at high tide
    expect(view.exposed).toBe(true);
  });
});

describe('combat', () => {
  it('will not let a card attack the turn it arrives', () => {
    let s = stackedGame(['clown-triggerfish'], []).state;
    s = until(s, canAct(0, 3));
    const fish = inHand(s, 0, 'clown-triggerfish');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: fish.instanceId }).state;
    expectError(
      applyAction(s, { type: 'ATTACK', player: 0, attackerId: fish.instanceId, targetId: 'face' }),
      'ATTACKER_NOT_READY',
    );
  });

  it('lets a surge card attack the turn it arrives', () => {
    let s = stackedGame(['sally-lightfoot-crab'], []).state;
    s = until(s, canAct(0, 3, 'low')); // crab now costs 3
    const crab = inHand(s, 0, 'sally-lightfoot-crab');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: crab.instanceId }).state;

    const lifeBefore = s.players[1].life;
    const { state: after } = must(s, {
      type: 'ATTACK',
      player: 0,
      attackerId: crab.instanceId,
      targetId: 'face',
    });
    expect(after.players[1].life).toBe(lifeBefore - 3); // 2 printed, +1 at low tide
  });

  it('makes killing a defender a trade — the defender always hits back', () => {
    let s = stackedGame(['great-barracuda'], ['clown-anemonefish']).state;
    s = until(s, canAct(0, 4));
    const barracuda = inHand(s, 0, 'great-barracuda');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: barracuda.instanceId }).state;
    s = must(s, { type: 'END_TURN', player: 0 }).state;

    const fish = inHand(s, 1, 'clown-anemonefish');
    s = must(s, { type: 'PLAY_CARD', player: 1, instanceId: fish.instanceId }).state;
    s = must(s, { type: 'END_TURN', player: 1 }).state;

    const { state: after, events } = must(s, {
      type: 'ATTACK',
      player: 0,
      attackerId: barracuda.instanceId,
      targetId: fish.instanceId,
    });

    expect(after.players[1].board).toHaveLength(0);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'CARD_DESTROYED', definitionId: 'clown-anemonefish' }),
    );
    // Even a 1-attack anemonefish marks the barracuda on its way down. Clearing
    // a board is no longer free, which is the whole point of the rule.
    const survivor = after.players[0].board.find((c) => c.instanceId === barracuda.instanceId);
    expect(survivor?.damage).toBe(1);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'DAMAGE_DEALT', cause: 'retaliation', amount: 1 }),
    );
  });

  it('restores mutual trades when defenderStrikesBack is switched back on', () => {
    let s = stackedGame(['great-barracuda'], ['clown-anemonefish'], {
      config: { startingHandSize: 0, defenderStrikesBack: true },
    }).state;
    s = until(s, canAct(0, 4));
    const barracuda = inHand(s, 0, 'great-barracuda');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: barracuda.instanceId }).state;
    s = must(s, { type: 'END_TURN', player: 0 }).state;
    const fish = inHand(s, 1, 'clown-anemonefish');
    s = must(s, { type: 'PLAY_CARD', player: 1, instanceId: fish.instanceId }).state;
    s = must(s, { type: 'END_TURN', player: 1 }).state;

    const { state: after } = must(s, {
      type: 'ATTACK',
      player: 0,
      attackerId: barracuda.instanceId,
      targetId: fish.instanceId,
    });
    expect(after.players[0].board[0]?.damage).toBeGreaterThan(0);
  });

  it('adds bonus damage when the phase leaves the defender exposed', () => {
    let s = stackedGame(['whitetip-reef-shark'], ['staghorn-coral']).state;

    s = until(s, canAct(1, 2));
    const coral = inHand(s, 1, 'staghorn-coral');
    s = must(s, { type: 'PLAY_CARD', player: 1, instanceId: coral.instanceId }).state;

    s = until(s, canAct(0, 3));
    const shark = inHand(s, 0, 'whitetip-reef-shark');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: shark.instanceId }).state;

    s = until(s, (g) => g.activePlayer === 0 && g.phase === 'low');
    expect(boardView(s, 1)[0]!.exposed).toBe(true);

    const { events } = must(s, {
      type: 'ATTACK',
      player: 0,
      attackerId: shark.instanceId,
      targetId: coral.instanceId,
    });

    const hit = events.find(
      (e): e is Extract<GameEvent, { type: 'DAMAGE_DEALT' }> =>
        e.type === 'DAMAGE_DEALT' && e.targetId === coral.instanceId,
    );
    expect(hit?.exposedBonus).toBe(1);
    expect(hit?.amount).toBe(4); // whitetip's 3 attack, +1 for exposure
  });

  it('forces attacks through a reef-guard', () => {
    let s = stackedGame(['sally-lightfoot-crab'], ['long-spined-urchin']).state;

    s = until(s, canAct(1, 5));
    const urchin = inHand(s, 1, 'long-spined-urchin');
    s = must(s, { type: 'PLAY_CARD', player: 1, instanceId: urchin.instanceId }).state;

    s = until(s, canAct(0, 2));
    const crab = inHand(s, 0, 'sally-lightfoot-crab');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: crab.instanceId }).state;

    expectError(
      applyAction(s, { type: 'ATTACK', player: 0, attackerId: crab.instanceId, targetId: 'face' }),
      'MUST_ATTACK_REEF_GUARD',
    );
    expect(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: crab.instanceId,
        targetId: urchin.instanceId,
      }).ok,
    ).toBe(true);
  });

  it('will not let a zero-attack structure attack at all', () => {
    let s = stackedGame(['staghorn-coral'], []).state;
    s = until(s, canAct(0, 2));
    const coral = inHand(s, 0, 'staghorn-coral');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: coral.instanceId }).state;
    expectError(
      applyAction(s, { type: 'ATTACK', player: 0, attackerId: coral.instanceId, targetId: 'face' }),
      'ATTACKER_CANNOT_ATTACK',
    );
  });

  it('allows only one attack per card per turn', () => {
    let s = stackedGame(['sally-lightfoot-crab'], []).state;
    s = until(s, canAct(0, 3)); // crab now costs 3
    const crab = inHand(s, 0, 'sally-lightfoot-crab');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: crab.instanceId }).state;
    s = must(s, { type: 'ATTACK', player: 0, attackerId: crab.instanceId, targetId: 'face' }).state;
    expectError(
      applyAction(s, { type: 'ATTACK', player: 0, attackerId: crab.instanceId, targetId: 'face' }),
      'ATTACKER_ALREADY_ATTACKED',
    );
  });

  it('rejects an attack on a card that is not there', () => {
    let s = stackedGame(['sally-lightfoot-crab'], []).state;
    s = until(s, canAct(0, 3)); // crab now costs 3
    const crab = inHand(s, 0, 'sally-lightfoot-crab');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: crab.instanceId }).state;
    expectError(
      applyAction(s, {
        type: 'ATTACK',
        player: 0,
        attackerId: crab.instanceId,
        targetId: 'ghost-card',
      }),
      'TARGET_NOT_FOUND',
    );
  });
});

describe('the tide as a threat in its own right', () => {
  it('marks a damaged card dying when the falling tide drops its health ceiling, and takes it the tide after', () => {
    // Green sea turtle: 3/7, +2 health at high tide. Marked with 8 damage it
    // survives at high water (ceiling 9) but is at zero the moment the tide
    // falls (ceiling 7) — with no fresh blow behind that drop, it is marked
    // dying rather than removed outright.
    let s = stackedGame([], ['green-sea-turtle']).state;
    s = until(s, canAct(1, 5, 'high'));

    const turtle = inHand(s, 1, 'green-sea-turtle');
    s = must(s, { type: 'PLAY_CARD', player: 1, instanceId: turtle.instanceId }).state;

    const marked = structuredClone(s);
    const onBoard = marked.players[1].board.find((c) => c.instanceId === turtle.instanceId)!;
    onBoard.damage = 8;
    expect(boardView(marked, 1).find((v) => v.instanceId === turtle.instanceId)?.health).toBe(1);

    const { state: dying, events: dyingEvents } = must(marked, { type: 'END_TURN', player: 1 });
    expect(dying.phase).toBe('falling');
    const stillThere = dying.players[1].board.find((c) => c.instanceId === turtle.instanceId);
    expect(stillThere?.dying).toBe(true);
    expect(dyingEvents).toContainEqual(
      expect.objectContaining({ type: 'SPECIES_DYING', definitionId: 'green-sea-turtle' }),
    );
    expect(dyingEvents.some((e) => e.type === 'CARD_DESTROYED')).toBe(false);

    // One full round on, the tide turns again and takes it — before player 1's
    // own next turn, which is the whole point: it is never a surprise.
    const roundLater = must(dying, { type: 'END_TURN', player: dying.activePlayer }).state;
    const { state: after, events } = must(roundLater, { type: 'END_TURN', player: roundLater.activePlayer });
    expect(after.phase).toBe('low');
    expect(after.players[1].board.find((c) => c.instanceId === turtle.instanceId)).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'CARD_DESTROYED', definitionId: 'green-sea-turtle', cause: 'dying' }),
    );
  });
});

describe('win conditions', () => {
  it('ends the game when a player is reduced to zero life', () => {
    let s = stackedGame(['sally-lightfoot-crab'], [], {
      config: { startingHandSize: 0, startingLife: 3 },
    }).state;
    s = until(s, canAct(0, 3, 'low')); // crab now costs 3
    const crab = inHand(s, 0, 'sally-lightfoot-crab');
    s = must(s, { type: 'PLAY_CARD', player: 0, instanceId: crab.instanceId }).state;

    const { state: after, events } = must(s, {
      type: 'ATTACK',
      player: 0,
      attackerId: crab.instanceId,
      targetId: 'face',
    });

    expect(after.players[1].life).toBeLessThanOrEqual(0);
    expect(after.winner).toBe(0);
    expect(events).toContainEqual({ type: 'GAME_OVER', winner: 0, reason: 'life' });
    expectError(applyAction(after, { type: 'END_TURN', player: 0 }), 'GAME_OVER');
  });
});

describe('legalActions', () => {
  it('always offers END_TURN while the game is live', () => {
    const { state } = stackedGame([], []);
    expect(legalActions(state)).toContainEqual({ type: 'END_TURN', player: 0 });
  });

  it('offers nothing once the game is over', () => {
    const { state } = stackedGame([], []);
    expect(legalActions({ ...state, winner: 0 })).toEqual([]);
  });

  it('only ever offers actions the resolver accepts', () => {
    resetInstanceIds();
    let s = startGame(createGame({ seed: 2024 })).state;
    for (let i = 0; i < 120 && s.winner === undefined; i++) {
      const actions = legalActions(s);
      expect(actions.length).toBeGreaterThan(0);
      for (const action of actions) {
        expect(applyAction(s, action).ok, `${action.type} should be legal`).toBe(true);
      }
      s = must(s, actions[i % actions.length]!).state;
    }
  });

  it('drives a seeded game all the way to a winner without a rules violation', () => {
    resetInstanceIds();
    let s = startGame(createGame({ seed: 11 })).state;
    let guard = 0;
    while (s.winner === undefined && guard++ < 3000) {
      const actions = legalActions(s);
      // Prefer acting over passing so the game actually resolves.
      const pick = actions.find((a) => a.type === 'ATTACK') ?? actions[0]!;
      s = must(s, pick).state;
    }
    expect(s.winner).not.toBeUndefined();
    expect(guard).toBeLessThan(3000);
  });
});
