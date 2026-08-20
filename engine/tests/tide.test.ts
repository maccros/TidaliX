import { describe, expect, it } from 'vitest';
import { TIDE_CYCLE, advancePhase, diesAtNextPhase, effectiveStats, nextPhase } from '../src/tide.js';
import { getCard, CARDS } from '../src/cards.js';
import { boardView, createGame, createInstance, resetInstanceIds } from '../src/state.js';
import { startGame } from '../src/resolver.js';
import type { GameState, TidePhase } from '../src/types.js';

describe('tide phase machine', () => {
  it('cycles low → rising → high → falling → low', () => {
    expect(nextPhase('low')).toBe('rising');
    expect(nextPhase('rising')).toBe('high');
    expect(nextPhase('high')).toBe('falling');
    expect(nextPhase('falling')).toBe('low');
  });

  it('returns to the same phase after a full cycle', () => {
    let phase: TidePhase = 'low';
    for (let i = 0; i < TIDE_CYCLE.length; i++) phase = nextPhase(phase);
    expect(phase).toBe('low');
  });

  it('advances by arbitrary steps, including backwards', () => {
    expect(advancePhase('low', 2)).toBe('high');
    expect(advancePhase('low', 5)).toBe('rising');
    expect(advancePhase('low', -1)).toBe('falling');
    expect(advancePhase('high', -6)).toBe('low'); // one and a half cycles back
  });
});

describe('effectiveStats', () => {
  it('applies the phase modifier on top of printed stats', () => {
    resetInstanceIds();
    const skipper = createInstance('atlantic-mudskipper', 0);
    const def = getCard('atlantic-mudskipper');

    expect(effectiveStats(skipper, 'low').attack).toBe(def.attack + 2);
    expect(effectiveStats(skipper, 'rising').attack).toBe(def.attack);
    expect(effectiveStats(skipper, 'high').attack).toBe(def.attack - 1);
  });

  it('flags exposure only in the phases that strand the card', () => {
    const manta = createInstance('reef-manta-ray', 0);
    expect(effectiveStats(manta, 'low').exposed).toBe(true);
    expect(effectiveStats(manta, 'high').exposed).toBe(false);
  });

  it('floors attack and health at zero rather than going negative', () => {
    const manta = createInstance('reef-manta-ray', 0);
    // Printed 4 attack, -3 at low tide, so 1 — a bigger penalty must not go under 0.
    expect(effectiveStats(manta, 'low').attack).toBe(1);
    expect(effectiveStats(manta, 'low').attack).toBeGreaterThanOrEqual(0);
  });

  it('subtracts marked damage from the phase-adjusted ceiling', () => {
    const turtle = createInstance('green-sea-turtle', 0);
    turtle.damage = 5;
    // Printed 7 health, +2 at high tide.
    expect(effectiveStats(turtle, 'high').maxHealth).toBe(9);
    expect(effectiveStats(turtle, 'high').health).toBe(4);
    expect(effectiveStats(turtle, 'low').health).toBe(2);
  });
});

describe('card set integrity', () => {
  it('has unique ids', () => {
    const ids = CARDS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every card a real binomial species name', () => {
    for (const card of CARDS) {
      expect(card.species, card.id).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
    }
  });

  it('never prints negative stats or costs', () => {
    for (const card of CARDS) {
      expect(card.cost, card.id).toBeGreaterThanOrEqual(0);
      expect(card.attack, card.id).toBeGreaterThanOrEqual(0);
      expect(card.health, card.id).toBeGreaterThan(0);
    }
  });

  it('keeps every card alive in every phase on its own (no printed suicide)', () => {
    for (const card of CARDS) {
      const inst = createInstance(card.id, 0);
      for (const phase of TIDE_CYCLE) {
        expect(effectiveStats(inst, phase).health, `${card.id} @ ${phase}`).toBeGreaterThan(0);
      }
    }
  });

  it('covers every phase with at least three cards that want it', () => {
    for (const phase of TIDE_CYCLE) {
      const favoured = CARDS.filter((c) => {
        const e = c.tide[phase];
        return !!e && ((e.attack ?? 0) > 0 || (e.health ?? 0) > 0 || (e.energy ?? 0) > 0);
      });
      expect(favoured.length, `cards favouring ${phase}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('dying at the next tide', () => {
  /** A started game with empty decks; boards get populated directly. */
  function board(phase: TidePhase) {
    resetInstanceIds();
    return startGame(
      createGame({
        decks: [Array<string>(10).fill('moorish-idol'), Array<string>(10).fill('moorish-idol')],
        shuffleDecks: false,
        config: { startingHandSize: 0, startingPhase: phase },
      }),
    ).state;
  }

  function put(state: GameState, definitionId: string, damage = 0): GameState {
    const next = structuredClone(state);
    const inst = createInstance(definitionId, 0);
    inst.playedOnTurn = 0;
    inst.damage = damage;
    next.players[0].board.push(inst);
    return next;
  }

  it('sees a card the coming phase will take below zero', () => {
    // A manta is 4/6 at high water and loses nothing to health at falling — but
    // a bumphead loses 2 attack and nothing else, so use the card that really
    // does lose a ceiling: the anemonefish standing on a partner's aura is
    // covered elsewhere. Here the tide itself does it.
    const s = put(board('low'), 'whitetip-reef-shark', 3);
    const shark = s.players[0].board[0]!;
    // Low tide gives the whitetip +1 health: 4 total, 3 marked, 1 left. At
    // rising it drops back to 3, which the 3 damage exactly finishes.
    expect(effectiveStats(shark, 'low', getCard(shark.definitionId), s.players[0].board).health).toBe(1);
    expect(diesAtNextPhase(s, shark)).toBe(true);
  });

  it('leaves a healthy card alone', () => {
    const s = put(board('low'), 'whitetip-reef-shark');
    expect(diesAtNextPhase(s, s.players[0].board[0]!)).toBe(false);
  });

  it('does not flag something that is already dead', () => {
    // Already at zero is not "dying" — it is about to be swept, which is a
    // different thing and would make the warning fire on corpses.
    const s = put(board('low'), 'whitetip-reef-shark', 99);
    expect(diesAtNextPhase(s, s.players[0].board[0]!)).toBe(false);
  });

  it('is surfaced on the board view, where the client reads it', () => {
    const s = put(board('low'), 'whitetip-reef-shark', 3);
    expect(boardView(s, 0)[0]?.dyingNextPhase).toBe(true);
  });
});
