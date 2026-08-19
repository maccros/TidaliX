/**
 * The energy economy: what a turn pays, and what the *next* turn will pay.
 *
 * Two properties matter more than any individual number here. First, the bank
 * and the breakdown can never disagree — the resolver pays out of the same call
 * the client displays, so a test that the total matches the sum of the lines is
 * a test that the whole display is honest. Second, a projection is about a
 * future turn, and a future turn happens in a future phase: showing the player
 * the current phase's tide and the current phase's species income is a plan for
 * a turn that never happens.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { applyAction, startGame } from '../src/resolver.js';
import { createGame, createInstance, resetInstanceIds } from '../src/state.js';
import {
  energyCapFor,
  energyIncome,
  nextTurnIncome,
  speciesIncome,
} from '../src/economy.js';
import { nextPhase, phaseAtTurnOf, tideStepsUntilTurnOf } from '../src/tide.js';
import type { EnergySource, GameState, PlayerId } from '../src/types.js';

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

function place(state: GameState, player: PlayerId, ids: string[]): GameState {
  const next = structuredClone(state);
  for (const id of ids) {
    const inst = createInstance(id, player);
    inst.playedOnTurn = 0;
    next.players[player].board.push(inst);
  }
  return next;
}

function endTurn(state: GameState): GameState {
  const result = applyAction(state, { type: 'END_TURN', player: state.activePlayer });
  if (!result.ok) throw new Error(result.message);
  return result.state;
}

const amountOf = (state: GameState, player: PlayerId, source: EnergySource) =>
  nextTurnIncome(state, player).lines.find((l) => l.source === source)?.amount ?? 0;

beforeEach(() => resetInstanceIds());

/* -------------------------------------------------------------------------- */

describe('income bookkeeping', () => {
  it('always totals exactly the sum of its own lines', () => {
    let s = place(bareGame(), 0, ['reef-manta-ray', 'bluestreak-cleaner-wrasse']);
    for (let i = 0; i < 8; i++) {
      for (const p of [0, 1] as const) {
        for (const income of [energyIncome(s, p), nextTurnIncome(s, p)]) {
          expect(income.total).toBe(income.lines.reduce((sum, l) => sum + l.amount, 0));
        }
      }
      s = endTurn(s);
    }
  });

  it('pays the active player exactly what the breakdown promised', () => {
    // The resolver and the panel call the same function, so this is a structural
    // guarantee rather than a coincidence — and worth pinning down as one.
    let s = place(bareGame(), 0, ['staghorn-coral', 'moorish-idol']);
    s = endTurn(s); // player 1
    // Asked from inside the opponent's turn, so it has to be the *projection*:
    // `energyIncome` prices the live phase, and the tide turns as player 1
    // hands the turn back. That gap is the whole reason both functions exist.
    const owed = nextTurnIncome(s, 0);
    s = endTurn(s); // back to player 0, income paid

    expect(s.activePlayer).toBe(0);
    expect(s.players[0].energy).toBe(owed.total);
    expect(s.players[0].incomeThisTurn).toEqual(owed.lines);
  });

  it('keeps the receipt for what was collected this turn', () => {
    let s = bareGame();
    expect(s.players[0].incomeThisTurn.length).toBeGreaterThan(0);
    expect(s.players[0].incomeThisTurn.reduce((sum, l) => sum + l.amount, 0)).toBe(
      s.players[0].energy,
    );

    // Spending does not rewrite history: the receipt still says what arrived.
    const collected = s.players[0].incomeThisTurn;
    s = place(s, 0, ['moorish-idol']);
    expect(s.players[0].incomeThisTurn).toEqual(collected);
  });
});

describe('the next-turn projection', () => {
  it('knows how far the tide moves before each player acts again', () => {
    const s = bareGame(); // player 0 active, tide advances per round
    expect(s.config.tideAdvancesEvery).toBe('round');
    // Player 0 must end, then player 1 ends and the tide turns: one step for both.
    expect(tideStepsUntilTurnOf(s, 0)).toBe(1);
    // Player 1 is next up, and player 0 ending their turn does not move the tide.
    expect(tideStepsUntilTurnOf(s, 1)).toBe(0);

    const perTurn = bareGame({ config: { startingHandSize: 0, tideAdvancesEvery: 'turn' } });
    expect(tideStepsUntilTurnOf(perTurn, 0)).toBe(2);
    expect(tideStepsUntilTurnOf(perTurn, 1)).toBe(1);
  });

  it('agrees with the phase the turn actually opens in', () => {
    let s = bareGame();
    for (let i = 0; i < 10; i++) {
      const predicted = phaseAtTurnOf(s, 0);
      let next = endTurn(s);
      while (next.activePlayer !== 0) next = endTurn(next);
      expect(next.phase).toBe(predicted);
      s = endTurn(s);
    }
  });

  it('prices the tide line at next turn’s phase, not this one', () => {
    // Opens at low water, which pays nothing. The projection has to reach past
    // that to the rising flood, which pays 2 — this is the bug the panel had.
    const s = bareGame();
    expect(s.phase).toBe('low');
    expect(s.config.tideEnergy.low).toBe(0);
    expect(nextTurnIncome(s, 0).phase).toBe('rising');
    expect(amountOf(s, 0, 'tide')).toBe(s.config.tideEnergy.rising);
    expect(amountOf(s, 0, 'tide')).toBe(2);
  });

  it('prices species income at next turn’s phase too', () => {
    // A moorish idol pays only on the rising tide. Standing on a low-water board
    // it is worth nothing right now and 1 next turn, and the player planning
    // their next turn needs the second number.
    const s = place(bareGame(), 0, ['moorish-idol']);
    expect(s.phase).toBe('low');
    expect(speciesIncome(s, 0)).toBe(0);
    expect(amountOf(s, 0, 'card')).toBe(1);
    expect(nextTurnIncome(s, 0).lines.find((l) => l.source === 'card')?.detail).toContain(
      'Moorish Idol',
    );
  });

  it('drops a species line that the coming phase switches off', () => {
    // The reverse case, so this cannot pass by always looking one phase ahead
    // and finding more: a manta pays at high water and nothing at all after it.
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'high' } });
    s = place(s, 0, ['reef-manta-ray']);
    expect(speciesIncome(s, 0)).toBe(1);
    expect(nextTurnIncome(s, 0).phase).toBe('falling');
    expect(amountOf(s, 0, 'card')).toBe(0);
  });

  it('prices base capacity at the cycle the next turn belongs to', () => {
    // Standing on the last step of a cycle, the next turn is on the far side of
    // it — and worth one more energy for that.
    let s = bareGame({ config: { startingHandSize: 0, startingPhase: 'falling' } });
    while (s.tideStep % 4 !== 3) s = endTurn(s);
    while (s.activePlayer !== 0) s = endTurn(s);

    const here = energyCapFor(s);
    expect(amountOf(s, 0, 'turn')).toBe(here + 1);
    expect(nextTurnIncome(s, 0).phase).toBe(nextPhase(s.phase));
  });

  it('matches what the next turn really pays, board and spending held still', () => {
    // The end-to-end claim: play out the turns without touching anything and the
    // projection is what lands in the bank.
    let s = place(bareGame(), 0, ['moorish-idol', 'staghorn-coral', 'giant-clam']);
    for (let i = 0; i < 6; i++) {
      const projected = nextTurnIncome(s, 0);
      let next = endTurn(s);
      while (next.activePlayer !== 0) next = endTurn(next);

      expect(next.phase).toBe(projected.phase);
      expect(next.players[0].energy).toBe(projected.total);
      s = next;
    }
  });
});
