import { describe, expect, it } from 'vitest';
import { TIDE_CYCLE, advancePhase, effectiveStats, nextPhase } from '../src/tide.js';
import { getCard, CARDS } from '../src/cards.js';
import { createInstance, resetInstanceIds } from '../src/state.js';
import type { TidePhase } from '../src/types.js';

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
