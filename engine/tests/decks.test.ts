/**
 * The starter decks are their own set-level shape, same spirit as set.test.ts:
 * invariants that break quietly (a deck silently missing a keyword, a card
 * id that no longer exists) unless something asserts them directly.
 */

import { describe, expect, it } from 'vitest';

import {
  CARDS,
  CLAWS_OF_THE_FLAT,
  GUARDIANS_OF_THE_REEF,
  NATURE_DECK,
  STARTER_DECKS,
  TITANS_OF_THE_CREST,
  getCard,
  getStarterDeck,
  type StarterDeck,
} from '../src/index.js';

const THEMED = [CLAWS_OF_THE_FLAT, TITANS_OF_THE_CREST, GUARDIANS_OF_THE_REEF];
const KEYWORDS = ['toxic', 'toxin-immune', 'pierce', 'reef-guard', 'surge'] as const;
const DASH_KINDS = ['strike', 'sweep', 'mend', 'forage', 'scout'] as const;

function copyCounts(deck: StarterDeck): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of deck.list) counts.set(id, (counts.get(id) ?? 0) + 1);
  return counts;
}

describe('the starter decks', () => {
  it('every card id exists', () => {
    for (const deck of STARTER_DECKS) {
      for (const id of deck.list) expect(() => getCard(id)).not.toThrow();
    }
  });

  it('every themed deck is exactly 30 cards, capped at 2 copies per species', () => {
    for (const deck of THEMED) {
      expect(deck.list.length).toBe(30);
      for (const [id, n] of copyCounts(deck)) expect(n, `${deck.name}: ${id}`).toBeLessThanOrEqual(2);
    }
  });

  it('Nature is the original 50-species, one-copy set', () => {
    expect(NATURE_DECK.list.length).toBe(50);
    expect(new Set(NATURE_DECK.list).size).toBe(50);
    expect(new Set(NATURE_DECK.list)).toEqual(new Set(CARDS.map((c) => c.id)));
  });

  it('every one of the 50 species appears in at least one themed deck', () => {
    const used = new Set(THEMED.flatMap((d) => d.list));
    const missing = CARDS.filter((c) => !used.has(c.id));
    expect(missing.map((c) => c.name)).toEqual([]);
  });

  it('every themed deck carries every keyword and every dash kind at least once', () => {
    for (const deck of THEMED) {
      const cards = [...new Set(deck.list)].map(getCard);
      const kw = new Set(cards.flatMap((c) => c.keywords ?? []));
      const dash = new Set(cards.filter((c) => c.arrival).map((c) => c.arrival!.kind));
      for (const k of KEYWORDS) expect(kw.has(k), `${deck.name} missing ${k}`).toBe(true);
      for (const k of DASH_KINDS) expect(dash.has(k), `${deck.name} missing ${k} dash`).toBe(true);
      expect(cards.some((c) => c.armour), `${deck.name} missing armour`).toBe(true);
      expect(cards.some((c) => c.spines), `${deck.name} missing spines`).toBe(true);
    }
  });

  it('gives every themed deck a cheap opener', () => {
    // Same spirit as set.test.ts's opener check, applied per themed deck: a
    // deck with nothing at cost <=2 opens on a wasted turn every game.
    for (const deck of THEMED) {
      const cheapest = Math.min(...[...new Set(deck.list)].map((id) => getCard(id).cost));
      expect(cheapest, deck.name).toBeLessThanOrEqual(2);
    }
  });

  it('resolves every deck id, and throws on an unknown one', () => {
    for (const deck of STARTER_DECKS) expect(getStarterDeck(deck.id)).toBe(deck);
    expect(() => getStarterDeck('not-a-deck')).toThrow();
  });
});
