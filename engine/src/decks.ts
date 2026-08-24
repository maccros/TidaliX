/**
 * The starter decks a player picks between for a new game — three themed decks
 * built to highlight one niche each, plus Nature: the original 50-species,
 * one-copy-each set the whole game was designed and priced against.
 *
 * A themed deck is not its niche in isolation. Most of its cards are native to
 * it, but each one also carries a deliberate supporting cast pulled from other
 * niches — picked for a real reason (an aura with no target in its own niche,
 * a tide-phase alignment, a documented predator/prey relationship, a keyword
 * or dash the niche has no native source for), not just to pad the count. See
 * the reasoning inline on each deck below.
 *
 * Every one of the 50 species appears in at least one of the three themed
 * decks — `decks.test.ts` guards this, along with the 30-card size, the
 * 2-copy cap, and every deck carrying every keyword and dash kind at least
 * once, so no starter deck is silently missing a piece of the game's toolkit.
 */
import { starterDeckList } from './state.js';

export interface StarterDeck {
  id: string;
  name: string;
  /** What a player picking this deck should expect. */
  blurb: string;
  /** Card definition ids, one entry per copy — a repeated id means 2 copies. */
  list: readonly string[];
}

function expand(x2: readonly string[], x1: readonly string[]): string[] {
  return [...x2, ...x2, ...x1];
}

export const NATURE_DECK: StarterDeck = {
  id: 'nature',
  name: 'Nature',
  blurb: 'All fifty species, one copy of each — the reef in full.',
  list: starterDeckList(),
};

export const CLAWS_OF_THE_FLAT: StarterDeck = {
  id: 'claws-of-the-flat',
  name: 'Claws of the Flat',
  blurb: 'Bottom-crawlers that own the drained flat — cheap, fast, relentless.',
  list: expand(
    [
      'atlantic-mudskipper', 'mandarinfish', 'banded-coral-shrimp', 'blue-ringed-octopus',
      'blue-sea-star', 'feather-star', 'harlequin-shrimp', 'sea-cucumber', 'spanish-dancer',
      'sally-lightfoot-crab', 'tasselled-wobbegong',
    ],
    [
      'warty-frogfish', 'peacock-mantis-shrimp', 'coconut-crab', 'crown-of-thorns-starfish',
      'giant-triton', 'long-spined-urchin', 'spotted-eagle-ray', 'mushroom-coral',
    ],
  ),
};

export const TITANS_OF_THE_CREST: StarterDeck = {
  id: 'titans-of-the-crest',
  name: 'Titans of the Crest',
  blurb: 'The giants that ride the flood in over the reef crest.',
  list: expand(
    [
      'blue-spotted-ribbontail-ray', 'grey-reef-shark', 'whitetip-reef-shark', 'bigfin-reef-squid',
      'giant-trevally', 'great-barracuda', 'green-sea-turtle', 'tawny-nurse-shark',
      'reef-manta-ray', 'moorish-idol', 'bluestreak-cleaner-wrasse',
    ],
    [
      'olive-sea-snake', 'hawksbill-turtle', 'loggerhead-turtle', 'box-jellyfish',
      'bumphead-parrotfish', 'spotted-eagle-ray', 'banded-coral-shrimp', 'giant-clam',
    ],
  ),
};

export const GUARDIANS_OF_THE_REEF: StarterDeck = {
  id: 'guardians-of-the-reef',
  name: 'Guardians of the Reef',
  blurb: 'Corals and reef-dwellers, built to defend the structure they share.',
  list: expand(
    [
      'clown-anemonefish', 'moorish-idol', 'mushroom-coral', 'staghorn-coral',
      'clown-triggerfish', 'sea-fan', 'table-coral', 'fire-coral',
    ],
    [
      'bubble-tip-anemone', 'coral-grouper', 'common-octopus', 'banded-sea-krait',
      'blackspotted-puffer', 'red-lionfish', 'giant-moray', 'brain-coral', 'giant-clam',
      'reef-manta-ray', 'harlequin-shrimp', 'peacock-mantis-shrimp', 'box-jellyfish',
      'bluestreak-cleaner-wrasse',
    ],
  ),
};

/** Nature first — it's the original, unthemed set, the natural default. */
export const STARTER_DECKS: readonly StarterDeck[] = [
  NATURE_DECK,
  CLAWS_OF_THE_FLAT,
  TITANS_OF_THE_CREST,
  GUARDIANS_OF_THE_REEF,
];

const DECK_INDEX: ReadonlyMap<string, StarterDeck> = new Map(STARTER_DECKS.map((d) => [d.id, d]));

/** Look up a starter deck by id. Throws on an unknown id — that is always a bug. */
export function getStarterDeck(id: string): StarterDeck {
  const deck = DECK_INDEX.get(id);
  if (!deck) throw new Error(`Unknown starter deck: ${id}`);
  return deck;
}
