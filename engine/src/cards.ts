/**
 * TidaliX starter set — "Reef Flat".
 *
 * Every card is a real species, and its tide line is drawn from how that animal
 * actually behaves across the tidal cycle. Mudskippers and grapsid crabs own the
 * drained flat; mantas, reef sharks and trevally ride the flood in over the
 * crest; corals and clams sit still and pay rent, but bake when the water leaves.
 *
 * Design rule: if a card's tide line contradicts the animal, fix the card.
 */

import type { Aura, CardDefinition, Taxon, TidePhase, Trait } from './types.js';

export const CARDS: readonly CardDefinition[] = [
  /* ---------------------------------------------------------------- */
  /* Low tide — the exposed flat                                       */
  /* ---------------------------------------------------------------- */
  {
    id: 'atlantic-mudskipper',
    name: 'Atlantic Mudskipper',
    species: 'Periophthalmus barbarus',
    type: 'creature',
    taxon: 'fish',
    cost: 1,
    attack: 1,
    health: 2,
    traits: ['reef-fish'],
    tide: {
      low: { attack: 2 },
      high: { attack: -1, exposed: true },
    },
    text: 'Breathes through its skin and walks the drained flat on its fins.',
  },
  {
    id: 'sally-lightfoot-crab',
    name: 'Sally Lightfoot Crab',
    species: 'Grapsus grapsus',
    type: 'creature',
    taxon: 'crustacean',
    cost: 2,
    attack: 2,
    health: 2,
    keywords: ['surge'],
    traits: ['crustacean'],
    tide: {
      low: { attack: 1, health: 1 },
      high: { exposed: true },
    },
    text: 'Grazes the splash zone faster than the surge can catch it.',
  },
  {
    id: 'horn-eyed-ghost-crab',
    name: 'Horn-eyed Ghost Crab',
    species: 'Ocypode ceratophthalma',
    type: 'creature',
    taxon: 'crustacean',
    cost: 3,
    attack: 3,
    health: 2,
    keywords: ['surge'],
    traits: ['crustacean'],
    tide: {
      low: { attack: 1 },
      high: { attack: -1, exposed: true },
    },
    text: 'Runs down the wrack line the moment the water pulls back.',
  },
  {
    id: 'common-octopus',
    name: 'Common Octopus',
    species: 'Octopus vulgaris',
    type: 'creature',
    taxon: 'cephalopod',
    cost: 4,
    attack: 3,
    health: 4,
    traits: ['cephalopod'],
    tide: {
      low: { attack: 2 },
      falling: { attack: 1 },
    },
    text: 'Crosses open rock between pools to raid the stranded ones.',
  },
  {
    id: 'rock-boring-urchin',
    name: 'Rock-boring Urchin',
    species: 'Echinometra mathaei',
    type: 'creature',
    taxon: 'echinoderm',
    cost: 2,
    attack: 0,
    health: 5,
    keywords: ['reef-guard'],
    traits: ['echinoderm'],
    spines: 2,
    tide: {
      low: { health: 2 },
    },
    text: 'Grinds itself a socket in the limestone and does not leave it.',
  },

  /* ---------------------------------------------------------------- */
  /* Rising tide — the flood                                           */
  /* ---------------------------------------------------------------- */
  {
    id: 'peacock-mantis-shrimp',
    name: 'Peacock Mantis Shrimp',
    species: 'Odontodactylus scyllarus',
    type: 'creature',
    taxon: 'crustacean',
    cost: 3,
    attack: 4,
    health: 2,
    traits: ['crustacean'],
    tide: {
      rising: { attack: 1 },
      low: { exposed: true },
    },
    text: 'Strikes at the speed of a bullet; the cavitation does the rest.',
  },
  {
    id: 'coral-grouper',
    name: 'Coral Grouper',
    species: 'Plectropomus leopardus',
    type: 'creature',
    taxon: 'fish',
    cost: 4,
    attack: 4,
    health: 4,
    keywords: ['toxin-immune'],
    traits: ['reef-fish'],
    tide: {
      rising: { attack: 1 },
      high: { attack: 1 },
    },
    text: 'One of the few animals that will take a lionfish, spines and all.',
  },
  {
    id: 'mangrove-jack',
    name: 'Mangrove Jack',
    species: 'Lutjanus argentimaculatus',
    type: 'creature',
    taxon: 'fish',
    cost: 3,
    attack: 3,
    health: 3,
    traits: ['reef-fish'],
    tide: {
      rising: { attack: 2 },
      low: { attack: -1 },
    },
    text: 'Rides the push into the roots and takes whatever the water brings.',
  },
  {
    id: 'moorish-idol',
    name: 'Moorish Idol',
    species: 'Zanclus cornutus',
    type: 'creature',
    taxon: 'fish',
    cost: 2,
    attack: 2,
    health: 2,
    traits: ['reef-fish'],
    tide: {
      rising: { energy: 1 },
    },
    text: 'Picks sponge from the fresh water climbing the reef crest.',
  },

  /* ---------------------------------------------------------------- */
  /* High tide — water over the crest                                  */
  /* ---------------------------------------------------------------- */
  {
    id: 'reef-manta-ray',
    name: 'Reef Manta Ray',
    species: 'Mobula alfredi',
    type: 'creature',
    taxon: 'shark-ray',
    cost: 5,
    attack: 4,
    health: 6,
    traits: ['megafauna'],
    tide: {
      high: { attack: 2, energy: 1 },
      low: { attack: -3, exposed: true },
    },
    text: 'Barrel-rolls through plankton where the flood stacks it against the reef.',
  },
  {
    id: 'blacktip-reef-shark',
    name: 'Blacktip Reef Shark',
    species: 'Carcharhinus melanopterus',
    type: 'creature',
    taxon: 'shark-ray',
    cost: 4,
    attack: 4,
    health: 3,
    traits: ['megafauna'],
    tide: {
      high: { attack: 2 },
      falling: { attack: 1 },
      low: { attack: -2, exposed: true },
    },
    text: 'Works the flat in water barely deep enough to cover its fin.',
  },
  {
    id: 'whitetip-reef-shark',
    name: 'Whitetip Reef Shark',
    species: 'Triaenodon obesus',
    type: 'creature',
    taxon: 'shark-ray',
    cost: 3,
    attack: 3,
    health: 3,
    traits: ['megafauna'],
    tide: {
      high: { attack: 1 },
      low: { health: 1 },
    },
    text: 'Wedges into a cave by day, then pours through the coral by night.',
  },
  {
    id: 'green-sea-turtle',
    name: 'Green Sea Turtle',
    species: 'Chelonia mydas',
    type: 'creature',
    taxon: 'reptile',
    cost: 5,
    attack: 3,
    health: 7,
    keywords: ['reef-guard', 'toxin-immune'],
    traits: ['megafauna'],
    tide: {
      high: { health: 2 },
    },
    text: 'Crosses the crest at high water to graze the seagrass behind it.',
  },
  {
    id: 'bumphead-parrotfish',
    name: 'Bumphead Parrotfish',
    species: 'Bolbometopon muricatum',
    type: 'creature',
    taxon: 'fish',
    cost: 6,
    attack: 6,
    health: 6,
    traits: ['megafauna'],
    tide: {
      high: { attack: 1, health: 1 },
      low: { attack: -2, exposed: true },
    },
    text: 'Headbutts living coral apart and excretes the reef as sand.',
  },
  {
    id: 'giant-trevally',
    name: 'Giant Trevally',
    species: 'Caranx ignobilis',
    type: 'creature',
    taxon: 'fish',
    cost: 5,
    attack: 5,
    health: 4,
    keywords: ['surge'],
    traits: ['megafauna'],
    tide: {
      high: { attack: 1 },
      falling: { attack: 2 },
    },
    text: 'Ambushes the flat at speed, and waits in the channel for the drain.',
  },

  /* ---------------------------------------------------------------- */
  /* Falling tide — the drain                                          */
  /* ---------------------------------------------------------------- */
  {
    id: 'great-barracuda',
    name: 'Great Barracuda',
    species: 'Sphyraena barracuda',
    type: 'creature',
    taxon: 'fish',
    cost: 4,
    attack: 5,
    health: 2,
    traits: ['reef-fish'],
    tide: {
      falling: { attack: 2 },
      rising: { attack: -1 },
    },
    text: 'Holds station where the flat empties and takes what it funnels out.',
  },
  {
    id: 'giant-moray',
    name: 'Giant Moray',
    species: 'Gymnothorax javanicus',
    type: 'creature',
    taxon: 'fish',
    cost: 4,
    attack: 4,
    health: 4,
    keywords: ['toxin-immune'],
    traits: ['reef-fish'],
    tide: {
      falling: { attack: 1 },
      low: { health: 1 },
    },
    text: 'A second set of jaws in the throat drags the catch down whole, venom and all.',
  },

  /* ---------------------------------------------------------------- */
  /* Mid phases — the residents                                        */
  /* ---------------------------------------------------------------- */
  {
    id: 'clown-anemonefish',
    name: 'Clown Anemonefish',
    species: 'Amphiprion ocellaris',
    type: 'creature',
    taxon: 'fish',
    cost: 1,
    attack: 1,
    health: 3,
    traits: ['reef-fish', 'anemonefish'],
    auras: [
      {
        affects: 'anemone',
        grants: { attack: 1 },
        note: 'drives off polyp-eaters that would strip its host',
      },
    ],
    tide: {
      rising: { health: 1 },
      falling: { health: 1 },
    },
    text: 'Never more than a body length from its host, whatever the water does.',
  },
  {
    id: 'clown-triggerfish',
    name: 'Clown Triggerfish',
    species: 'Balistoides conspicillum',
    type: 'creature',
    taxon: 'fish',
    cost: 3,
    attack: 3,
    health: 3,
    traits: ['reef-fish'],
    tide: {
      rising: { attack: 1 },
      falling: { attack: 1 },
    },
    text: 'Locks its dorsal spine in a crevice and refuses to be pulled out.',
  },
  {
    id: 'regal-blue-tang',
    name: 'Regal Blue Tang',
    species: 'Paracanthurus hepatus',
    type: 'creature',
    taxon: 'fish',
    cost: 2,
    attack: 2,
    health: 3,
    traits: ['reef-fish'],
    tide: {
      rising: { attack: 1 },
    },
    text: 'Scalpels at the base of the tail, carried everywhere it goes.',
  },
  {
    id: 'bluestreak-cleaner-wrasse',
    name: 'Bluestreak Cleaner Wrasse',
    species: 'Labroides dimidiatus',
    type: 'creature',
    taxon: 'fish',
    cost: 2,
    attack: 1,
    health: 2,
    traits: ['reef-fish', 'cleaner'],
    auras: [
      {
        affects: 'megafauna',
        grants: { health: 2 },
        note: 'picks parasites off anything big enough to queue for it',
      },
    ],
    tide: {
      rising: { energy: 1 },
      falling: { energy: 1 },
    },
    text: 'Runs a cleaning station that even the sharks queue for.',
  },

  /* ---------------------------------------------------------------- */
  /* Structures — the reef itself                                      */
  /* ---------------------------------------------------------------- */
  {
    id: 'staghorn-coral',
    name: 'Staghorn Coral',
    species: 'Acropora cervicornis',
    type: 'structure',
    taxon: 'cnidarian',
    cost: 2,
    attack: 0,
    health: 5,
    traits: ['coral'],
    auras: [
      {
        affects: 'reef-fish',
        grants: { health: 2 },
        note: 'a nursery of branches nothing large can reach into',
      },
      {
        affects: 'coral',
        grants: { health: 1 },
        note: 'cements onto the framework beside it',
      },
    ],
    tide: {
      rising: { energy: 1 },
      high: { health: 1, energy: 1 },
      low: { exposed: true },
    },
    text: 'The fastest-growing branching coral on the reef, and the first to bleach.',
  },
  {
    id: 'bubble-tip-anemone',
    name: 'Bubble-tip Anemone',
    species: 'Entacmaea quadricolor',
    type: 'structure',
    taxon: 'cnidarian',
    cost: 2,
    attack: 0,
    health: 4,
    keywords: ['reef-guard'],
    traits: ['anemone'],
    spines: 1,
    auras: [
      {
        affects: 'anemonefish',
        grants: { health: 2 },
        note: 'stinging tentacles its resident is immune to',
      },
    ],
    tide: {
      rising: { health: 1 },
      low: { exposed: true },
    },
    text: 'Withdraws its tentacles when the water leaves, and waits.',
  },
  {
    id: 'giant-clam',
    name: 'Giant Clam',
    species: 'Tridacna gigas',
    type: 'structure',
    taxon: 'mollusc',
    cost: 3,
    attack: 0,
    health: 8,
    keywords: ['reef-guard'],
    traits: ['mollusc'],
    tide: {
      high: { energy: 1 },
      low: { exposed: true },
    },
    text: 'Farms algae in its own mantle. A metre of shell does the rest.',
  },
  /* ---------------------------------------------------------------- */
  /* Armed — animals that punish being attacked                        */
  /* ---------------------------------------------------------------- */
  {
    id: 'blackspotted-puffer',
    name: 'Blackspotted Puffer',
    species: 'Arothron nigropunctatus',
    type: 'creature',
    taxon: 'fish',
    cost: 3,
    attack: 2,
    health: 5,
    keywords: ['toxic'],
    traits: ['reef-fish'],
    spines: 3,
    tide: {
      rising: { health: 1 },
    },
    text: 'Carries enough tetrodotoxin in its liver to kill whatever swallows it.',
  },
  {
    id: 'red-lionfish',
    name: 'Red Lionfish',
    species: 'Pterois volitans',
    type: 'creature',
    taxon: 'fish',
    cost: 4,
    attack: 4,
    health: 3,
    keywords: ['toxic'],
    traits: ['reef-fish'],
    spines: 2,
    tide: {
      falling: { attack: 1 },
      low: { exposed: true },
    },
    text: 'Herds prey into a corner with its fans. The venom is for whatever tries it.',
  },
  {
    id: 'crown-of-thorns-starfish',
    name: 'Crown-of-thorns Starfish',
    species: 'Acanthaster planci',
    type: 'creature',
    taxon: 'echinoderm',
    cost: 4,
    attack: 3,
    health: 6,
    keywords: ['toxic'],
    traits: ['echinoderm'],
    spines: 3,
    auras: [
      {
        affects: 'coral',
        grants: { health: -3 },
        note: 'digests living coral from the outside in',
      },
    ],
    tide: {
      low: { exposed: true },
    },
    text: 'Everts its stomach over the coral and leaves white skeleton behind.',
  },
  {
    id: 'table-coral',
    name: 'Table Coral',
    species: 'Acropora hyacinthus',
    type: 'structure',
    taxon: 'cnidarian',
    cost: 4,
    attack: 0,
    health: 7,
    traits: ['coral'],
    auras: [
      {
        affects: 'reef-fish',
        grants: { attack: 1, health: 1 },
        note: 'a whole storey of shade to hunt out of',
      },
      {
        affects: 'coral',
        grants: { health: 1 },
        note: 'thickens the framework around it',
      },
    ],
    tide: {
      rising: { energy: 1 },
      high: { health: 1, energy: 1 },
      low: { exposed: true },
    },
    text: 'Grows outward into a plate wide enough to shade a hundred fish.',
  },
];

const CARD_INDEX: ReadonlyMap<string, CardDefinition> = new Map(CARDS.map((c) => [c.id, c]));

/** The lineage a card belongs to. What the conservation pile is scored on. */
export function taxonOf(definitionId: string): Taxon {
  return getCard(definitionId).taxon;
}

/** Every lineage the set contains, so a client can show the pile's full board. */
export function allTaxa(): Taxon[] {
  const seen = new Set<Taxon>();
  for (const c of CARDS) seen.add(c.taxon);
  return [...seen];
}

/**
 * Whether eating this card kills the eater.
 *
 * Read off the definition rather than the instance: a toxin is printed on the
 * animal, and nothing in the game grants or removes one.
 */
export function isToxic(definitionId: string): boolean {
  return getCard(definitionId).keywords?.includes('toxic') ?? false;
}

/** Whether this card can eat a toxic one and walk away. */
export function isToxinImmune(definitionId: string): boolean {
  return getCard(definitionId).keywords?.includes('toxin-immune') ?? false;
}

/** All traits a card carries, for clients that group or filter by them. */
export function traitsOf(definitionId: string): readonly Trait[] {
  return getCard(definitionId).traits ?? [];
}

/**
 * Every symbiosis currently live on a board: which card is granting what to
 * which. Clients draw the links from this; nothing in the resolver needs it.
 */
export function activeSymbioses(
  board: readonly { instanceId: string; definitionId: string }[],
): { sourceId: string; targetId: string; aura: Aura }[] {
  const links: { sourceId: string; targetId: string; aura: Aura }[] = [];
  for (const source of board) {
    const auras = getCard(source.definitionId).auras;
    if (!auras) continue;
    for (const aura of auras) {
      for (const target of board) {
        if (target.instanceId === source.instanceId) continue;
        if (!traitsOf(target.definitionId).includes(aura.affects)) continue;
        links.push({ sourceId: source.instanceId, targetId: target.instanceId, aura });
      }
    }
  }
  return links;
}

/** Look up a printed card. Throws on an unknown id — that is always a bug. */
export function getCard(definitionId: string): CardDefinition {
  const card = CARD_INDEX.get(definitionId);
  if (!card) throw new Error(`Unknown card definition: ${definitionId}`);
  return card;
}

export function hasCard(definitionId: string): boolean {
  return CARD_INDEX.has(definitionId);
}

/** All cards whose tide line favours `phase` (a positive attack or health swing). */
export function cardsFavouring(phase: TidePhase): CardDefinition[] {
  return CARDS.filter((c) => {
    const e = c.tide[phase];
    return !!e && ((e.attack ?? 0) > 0 || (e.health ?? 0) > 0 || (e.energy ?? 0) > 0);
  });
}
