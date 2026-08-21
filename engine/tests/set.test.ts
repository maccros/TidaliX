/**
 * Set-level shape: the things that are true of the collection rather than of
 * any one card. These are the invariants that break quietly when a card is
 * added or repriced, because nothing about a single card looks wrong.
 */

import { describe, expect, it } from 'vitest';

import { CARDS, createGame, getCard, startGame } from '../src/index.js';

describe('the set', () => {
  it('gives the opener something to do in most games', () => {
    // The player who moves first has two energy and four cards. If the curve
    // drifts upward, that opening quietly becomes a pass — and it does it
    // without any individual card looking overpriced.
    let dead = 0;
    const games = 500;
    for (let seed = 1; seed <= games; seed++) {
      const state = startGame(createGame({ seed })).state;
      const opener = state.players[state.activePlayer];
      if (!opener.hand.some((c) => getCard(c.definitionId).cost <= opener.energy)) dead++;
    }
    expect(dead / games).toBeLessThan(0.3);
  });

  it('keeps enough cheap cards for that to stay true', () => {
    // The measurement above is the real test; this is the reason it passes,
    // stated so a failure points at the cause rather than the symptom.
    const cheap = CARDS.filter((c) => c.cost <= 2).length;
    expect(cheap / CARDS.length).toBeGreaterThan(0.27);
  });

  it('never prints two copies of a species', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    expect(new Set(CARDS.map((c) => c.species)).size).toBe(CARDS.length);
  });
});
