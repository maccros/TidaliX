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

import type { ArrivalEffect, Aura, CardDefinition, Niche, Taxon, TidePhase } from './types.js';

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
    niche: 'bottom-dweller',
    cost: 1,
    attack: 1,
    health: 2,
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
    niche: 'bottom-dweller',
    cost: 2,
    attack: 2,
    health: 2,
    keywords: ['surge'],
    tide: {
      low: { attack: 1, health: 1 },
      high: { exposed: true },
    },
    text: 'Grazes the splash zone faster than the surge can catch it.',
  },
  {
    id: 'common-octopus',
    name: 'Common Octopus',
    species: 'Octopus vulgaris',
    type: 'creature',
    taxon: 'mollusc',
    niche: 'reef-dweller',
    cost: 4,
    attack: 3,
    health: 4,
    arrival: {
      kind: 'scout',
      amount: 1,
      note: 'prises open everything it finds to see what is inside',
    },
    tide: {
      low: { attack: 2 },
      falling: { attack: 1 },
    },
    text: 'Crosses open rock between pools to raid the stranded ones.',
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
    niche: 'bottom-dweller',
    cost: 3,
    attack: 4,
    health: 2,
    keywords: ['pierce'],
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'opens with a strike fast enough to cavitate the water',
    },
    tide: {
      rising: { attack: 1 },
      low: { exposed: true },
    },
    text: 'A club that accelerates like a bullet. A shell is not an obstacle.',
  },
  {
    id: 'coral-grouper',
    name: 'Coral Grouper',
    species: 'Plectropomus leopardus',
    type: 'creature',
    taxon: 'fish',
    niche: 'reef-dweller',
    cost: 4,
    attack: 4,
    health: 4,
    keywords: ['toxin-immune'],
    // Printed as the Giant Moray's twin — same cost, same body, same keyword —
    // until this went on it. It is also the only attack the reef itself grants.
    auras: [
      {
        affects: 'reef-dweller',
        grants: { attack: 1 },
        note: 'headstands at a crevice until a moray goes in, and takes what bolts out',
      },
    ],
    tide: {
      rising: { attack: 1 },
      high: { attack: 1 },
    },
    text: 'One of the few animals that will take a lionfish, spines and all.',
  },
  {
    id: 'moorish-idol',
    name: 'Moorish Idol',
    species: 'Zanclus cornutus',
    type: 'creature',
    taxon: 'fish',
    niche: 'reef-dweller',
    cost: 2,
    attack: 2,
    health: 2,
    arrival: {
      kind: 'forage',
      amount: 1,
      note: 'picks the reef crest over as soon as it arrives',
    },
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
    niche: 'open-water',
    cost: 5,
    attack: 4,
    health: 6,
    arrival: {
      kind: 'forage',
      amount: 2,
      note: 'barrel-rolls straight into the plankton stacked on the reef',
    },
    tide: {
      high: { attack: 2, energy: 1 },
      low: { attack: -3, exposed: true },
    },
    text: 'Barrel-rolls through plankton where the flood stacks it against the reef.',
  },
  {
    id: 'whitetip-reef-shark',
    name: 'Whitetip Reef Shark',
    species: 'Triaenodon obesus',
    type: 'creature',
    taxon: 'shark-ray',
    niche: 'open-water',
    cost: 3,
    attack: 3,
    health: 3,
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
    niche: 'open-water',
    cost: 5,
    attack: 3,
    health: 7,
    keywords: ['reef-guard', 'toxin-immune'],
    // A shell is armour. It was carrying reef-guard and nothing to back it up.
    armour: 2,
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
    niche: 'open-water',
    cost: 6,
    attack: 6,
    health: 6,
    arrival: {
      kind: 'strike',
      amount: 3,
      note: 'headbutts the first thing in its way apart',
    },
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
    niche: 'open-water',
    cost: 5,
    attack: 5,
    health: 4,
    keywords: ['surge'],
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
    niche: 'open-water',
    cost: 4,
    attack: 5,
    health: 2,
    // Open water, not the reef itself — a coral head does not shelter this.
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'takes whatever the current funnels past it first',
    },
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
    niche: 'reef-dweller',
    cost: 4,
    attack: 4,
    health: 4,
    keywords: ['toxin-immune'],
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
    niche: 'reef-dweller',
    cost: 1,
    attack: 1,
    health: 3,
    auras: [
      {
        affects: 'reef-builder',
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
    niche: 'reef-dweller',
    cost: 3,
    attack: 3,
    health: 3,
    tide: {
      rising: { attack: 1 },
      falling: { attack: 1 },
    },
    text: 'Locks its dorsal spine in a crevice and refuses to be pulled out.',
  },
  {
    id: 'bluestreak-cleaner-wrasse',
    name: 'Bluestreak Cleaner Wrasse',
    species: 'Labroides dimidiatus',
    type: 'creature',
    taxon: 'fish',
    niche: 'reef-dweller',
    cost: 2,
    attack: 1,
    health: 2,
    auras: [
      {
        affects: 'open-water',
        grants: { health: 2 },
        note: 'picks parasites off anything big enough to queue for it',
      },
    ],
    arrival: {
      kind: 'mend',
      amount: 2,
      note: 'opens a cleaning station and the queue forms immediately',
    },
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
    niche: 'reef-builder',
    cost: 2,
    attack: 0,
    health: 5,
    auras: [
      {
        affects: 'reef-dweller',
        grants: { health: 2 },
        note: 'a nursery of branches nothing large can reach into',
      },
      {
        affects: 'reef-builder',
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
    niche: 'reef-builder',
    cost: 2,
    attack: 0,
    health: 4,
    keywords: ['reef-guard'],
    spines: 2,
    auras: [
      {
        affects: 'reef-dweller',
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
    // A reef-builder, and the only one that is not a cnidarian. It is sessile,
    // it farms algae in its mantle exactly as a coral does, and its shell ends
    // up as reef substrate. It was printed as a structure from the start; only
    // the niche disagreed, because it happens to sit on sand.
    niche: 'reef-builder',
    cost: 3,
    attack: 0,
    health: 8,
    keywords: ['reef-guard'],
    // Two shells that weigh as much as a person, and they close.
    armour: 2,
    arrival: {
      kind: 'forage',
      amount: 2,
      note: 'a metre of mantle filtering from the moment it settles',
    },
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
    niche: 'reef-dweller',
    cost: 3,
    attack: 2,
    health: 5,
    keywords: ['toxic'],
    armour: 3,
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
    niche: 'reef-dweller',
    cost: 4,
    attack: 4,
    health: 3,
    keywords: ['toxic'],
    armour: 2,
    arrival: {
      kind: 'strike',
      amount: 1,
      note: 'fans its prey into a corner the moment it settles',
    },
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
    niche: 'bottom-dweller',
    cost: 4,
    attack: 3,
    health: 6,
    keywords: ['toxic'],
    armour: 3,
    auras: [
      {
        affects: 'reef-builder',
        grants: { health: -3 },
        note: 'digests living coral from the outside in, on either side of the channel',
        // The one aura in the game that crosses the waterline. An outbreak is a
        // plague on a reef, not a private drawback for whoever played it.
        crossesWaterline: true,
      },
    ],
    arrival: {
      kind: 'sweep',
      amount: 1,
      note: 'arrives as an outbreak, not as an animal',
    },
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
    niche: 'reef-builder',
    cost: 4,
    attack: 0,
    health: 7,
    auras: [
      {
        affects: 'reef-dweller',
        grants: { attack: 1, health: 1 },
        note: 'a whole storey of shade to hunt out of',
      },
      {
        affects: 'reef-builder',
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

  /* ---------------------------------------------------------------- */
  /* Filling out the taxa                                          */
  /*                                                                   */
  /* The set was half fish, which made the conservation pile a question */
  /* about the shuffle rather than about play — reptiles were a single  */
  /* card and reached a player in 39% of games. These fifteen bring     */
  /* every other taxon to five or six. Each is here because it does   */
  /* something the set was missing, not to pad a count.                 */
  /* ---------------------------------------------------------------- */
  {
    id: 'giant-triton',
    name: 'Giant Triton',
    species: 'Charonia tritonis',
    type: 'creature',
    taxon: 'mollusc',
    niche: 'bottom-dweller',
    cost: 4,
    attack: 3,
    health: 5,
    // The crown-of-thorns' actual predator, and the reason `pierce` exists: a
    // starfish behind armour 3 and a toxin was otherwise close to unanswerable.
    keywords: ['pierce', 'toxin-immune'],
    arrival: {
      kind: 'strike',
      amount: 3,
      note: 'tracks its prey by scent and drills straight through the shell',
    },
    tide: {
      low: { attack: 1 },
      falling: { attack: 1 },
    },
    text: 'Hunts crown-of-thorns by smell. Neither the spines nor the saponin slow it down.',
  },
  {
    id: 'blue-ringed-octopus',
    name: 'Blue-ringed Octopus',
    species: 'Hapalochlaena lunulata',
    type: 'creature',
    taxon: 'mollusc',
    niche: 'bottom-dweller',
    cost: 3,
    attack: 2,
    health: 3,
    keywords: ['toxic'],
    tide: {
      low: { attack: 2 },
      high: { attack: -1 },
    },
    text: 'The rings only show once it has already decided. There is no antivenom.',
  },
  {
    id: 'bigfin-reef-squid',
    name: 'Bigfin Reef Squid',
    species: 'Sepioteuthis lessoniana',
    type: 'creature',
    taxon: 'mollusc',
    niche: 'open-water',
    cost: 3,
    attack: 3,
    health: 3,
    keywords: ['surge'],
    arrival: {
      kind: 'scout',
      amount: 1,
      note: 'reads the water and moves before anything else has noticed',
    },
    tide: {
      rising: { attack: 1 },
      high: { energy: 1 },
    },
    text: 'Hangs in midwater in a line of its own kind, all of them changing colour at once.',
  },
  {
    id: 'long-spined-urchin',
    name: 'Long-spined Urchin',
    species: 'Diadema setosum',
    type: 'creature',
    taxon: 'echinoderm',
    niche: 'bottom-dweller',
    // Cost 4, not 3: a wall, spines, and the flat's largest aura on one card.
    cost: 4,
    attack: 0,
    health: 6,
    keywords: ['reef-guard'],
    spines: 4,
    auras: [
      {
        affects: 'bottom-dweller',
        grants: { health: 2 },
        note: 'a forest of spines, and half the flat spends the day inside it',
      },
    ],
    tide: {
      low: { health: 2 },
    },
    text: 'Spines longer than your hand, and they swing toward a shadow before it arrives.',
  },
  {
    id: 'blue-sea-star',
    name: 'Blue Sea Star',
    species: 'Linckia laevigata',
    type: 'creature',
    taxon: 'echinoderm',
    niche: 'bottom-dweller',
    cost: 2,
    attack: 1,
    health: 4,
    arrival: {
      kind: 'mend',
      amount: 1,
      note: 'regrows what it loses, and steadies the reef around it',
    },
    tide: {
      low: { health: 1 },
    },
    text: 'Sheds an arm to escape, then grows the arm into a second animal.',
  },
  {
    id: 'sea-cucumber',
    name: 'Black Sea Cucumber',
    species: 'Holothuria atra',
    type: 'creature',
    taxon: 'echinoderm',
    niche: 'bottom-dweller',
    // Cost 3, not 2: it carries the only aura the flat has, on top of a wall and
    // an arrival.
    cost: 3,
    attack: 0,
    health: 6,
    keywords: ['reef-guard'],
    arrival: {
      kind: 'forage',
      amount: 1,
      note: 'starts turning sediment over the moment it settles',
    },
    // The flat needed a relationship of its own. Seventeen species live down
    // there and nothing was reaching any of them.
    auras: [
      {
        affects: 'bottom-dweller',
        grants: { health: 1 },
        note: 'turns the sediment over, and everything on the flat lives off it',
      },
    ],
    tide: {
      low: { health: 1 },
    },
    text: 'Eats the sand and gives it back cleaner. Everything on the flat depends on it.',
  },
  {
    id: 'banded-coral-shrimp',
    name: 'Banded Coral Shrimp',
    species: 'Stenopus hispidus',
    type: 'creature',
    taxon: 'crustacean',
    niche: 'bottom-dweller',
    cost: 2,
    attack: 1,
    health: 2,
    // A second cleaner, so the cleaning-station aura is not one card deep.
    auras: [
      {
        affects: 'open-water',
        grants: { health: 1 },
        note: 'picks parasites off anything patient enough to queue',
      },
    ],
    tide: {
      rising: { health: 1 },
    },
    text: 'Waves white antennae from a crevice until something big enough to eat it stops instead.',
  },
  {
    id: 'coconut-crab',
    name: 'Coconut Crab',
    species: 'Birgus latro',
    type: 'creature',
    taxon: 'crustacean',
    niche: 'bottom-dweller',
    cost: 5,
    attack: 5,
    health: 5,
    keywords: ['surge'],
    tide: {
      low: { attack: 2 },
      high: { attack: -2, exposed: true },
    },
    text: 'The largest arthropod on land, with a grip that opens a coconut.',
  },
  {
    id: 'banded-sea-krait',
    name: 'Banded Sea Krait',
    species: 'Laticauda colubrina',
    type: 'creature',
    taxon: 'reptile',
    niche: 'reef-dweller',
    cost: 4,
    attack: 3,
    health: 4,
    keywords: ['toxic'],
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'goes into the crevice after whatever is hiding in it',
    },
    tide: {
      low: { attack: 1 },
      high: { attack: 1 },
    },
    text: 'Hunts eels inside the reef, then comes ashore to digest them.',
  },
  {
    id: 'hawksbill-turtle',
    name: 'Hawksbill Turtle',
    species: 'Eretmochelys imbricata',
    type: 'creature',
    taxon: 'reptile',
    niche: 'open-water',
    cost: 4,
    attack: 2,
    health: 6,
    keywords: ['reef-guard', 'toxin-immune'],
    armour: 2,
    tide: {
      high: { health: 1 },
    },
    text: 'Eats sponges nothing else will touch — toxins, glass spicules and all.',
  },
  {
    id: 'fire-coral',
    name: 'Fire Coral',
    species: 'Millepora dichotoma',
    type: 'structure',
    taxon: 'cnidarian',
    niche: 'reef-builder',
    cost: 3,
    attack: 0,
    health: 5,
    keywords: ['toxic'],
    spines: 2,
    auras: [
      {
        affects: 'reef-builder',
        grants: { health: 1 },
        note: 'grows into the framework beside it',
      },
    ],
    tide: {
      rising: { energy: 1 },
      low: { exposed: true },
    },
    text: 'Not a true coral at all, and the sting stays with you for weeks.',
  },
  {
    id: 'brain-coral',
    name: 'Brain Coral',
    species: 'Diploria labyrinthiformis',
    type: 'structure',
    taxon: 'cnidarian',
    niche: 'reef-builder',
    cost: 4,
    attack: 0,
    health: 9,
    keywords: ['reef-guard'],
    auras: [
      {
        affects: 'reef-builder',
        grants: { health: 2 },
        note: 'the boulder the rest of the reef builds against',
      },
    ],
    tide: {
      high: { energy: 1 },
      low: { exposed: true },
    },
    text: 'Grows a centimetre a year into a boulder that outlives everyone who sees it.',
  },
  {
    id: 'sea-fan',
    name: 'Sea Fan',
    species: 'Gorgonia ventalina',
    type: 'structure',
    taxon: 'cnidarian',
    niche: 'reef-builder',
    cost: 2,
    attack: 0,
    health: 4,
    auras: [
      {
        affects: 'reef-dweller',
        grants: { health: 1 },
        note: 'a thicket to hang in out of the current',
      },
    ],
    tide: {
      rising: { energy: 1 },
      falling: { energy: 1 },
      low: { exposed: true },
    },
    text: 'Stands broadside to the current and takes whatever the flood carries past.',
  },
  {
    id: 'spotted-eagle-ray',
    name: 'Spotted Eagle Ray',
    species: 'Aetobatus narinari',
    type: 'creature',
    taxon: 'shark-ray',
    niche: 'open-water',
    cost: 4,
    attack: 3,
    health: 5,
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'digs its prey straight out of the sand',
    },
    tide: {
      high: { attack: 2 },
      low: { attack: -2, exposed: true },
    },
    text: 'Shovels shellfish out of the sand with its snout and crushes them in plates.',
  },
  {
    id: 'tawny-nurse-shark',
    name: 'Tawny Nurse Shark',
    species: 'Nebrius ferrugineus',
    type: 'creature',
    taxon: 'shark-ray',
    niche: 'open-water',
    cost: 4,
    attack: 2,
    health: 7,
    keywords: ['reef-guard'],
    tide: {
      low: { health: 1 },
      falling: { attack: 1 },
    },
    text: 'Sucks prey out of a crevice hard enough that you hear it from the surface.',
  },
  /* ---------------------------------------------------------------- */
  /* Levelling the thin taxa                                       */
  /*                                                                   */
  /* Seven more, all outside the fish, taking every taxon to five or */
  /* more and fish down to 28% of the set.                             */
  /* ---------------------------------------------------------------- */
  {
    id: 'olive-sea-snake',
    name: 'Olive Sea Snake',
    species: 'Aipysurus laevis',
    type: 'creature',
    taxon: 'reptile',
    niche: 'open-water',
    cost: 3,
    attack: 3,
    health: 3,
    keywords: ['toxic'],
    tide: {
      high: { attack: 1 },
      low: { attack: -1 },
    },
    text: 'Curious to the point of nuisance. Divers report being followed home.',
  },
  {
    id: 'loggerhead-turtle',
    name: 'Loggerhead Turtle',
    species: 'Caretta caretta',
    type: 'creature',
    taxon: 'reptile',
    niche: 'open-water',
    cost: 5,
    attack: 5,
    health: 5,
    // The turtle that goes through a shell rather than around it.
    keywords: ['pierce'],
    armour: 1,
    tide: {
      high: { attack: 1 },
      falling: { attack: 1 },
    },
    text: 'Jaws that crush a conch whole. Nobody has found the shell it cannot open.',
  },
  {
    id: 'grey-reef-shark',
    name: 'Grey Reef Shark',
    species: 'Carcharhinus amblyrhynchos',
    type: 'creature',
    taxon: 'shark-ray',
    niche: 'open-water',
    cost: 4,
    attack: 3,
    health: 4,
    // The only aura in the set that grants attack to the big animals: this is
    // the shark that hunts in numbers and makes the others braver.
    auras: [
      {
        affects: 'open-water',
        grants: { attack: 1 },
        note: 'hunts in numbers, and the rest of the pack comes in behind it',
      },
    ],
    tide: {
      high: { attack: 1 },
      low: { attack: -1, exposed: true },
    },
    text: 'Arches its back and drops its fins as a warning. It only warns once.',
  },
  {
    id: 'blue-spotted-ribbontail-ray',
    name: 'Blue-spotted Ribbontail Ray',
    species: 'Taeniura lymma',
    type: 'creature',
    taxon: 'shark-ray',
    niche: 'open-water',
    cost: 3,
    attack: 2,
    health: 4,
    keywords: ['toxic'],
    tide: {
      rising: { attack: 1 },
      low: { exposed: true },
    },
    text: 'Two venomous barbs held over its back, and it does not hesitate to use them.',
  },
  {
    id: 'harlequin-shrimp',
    name: 'Harlequin Shrimp',
    species: 'Hymenocera picta',
    type: 'creature',
    taxon: 'crustacean',
    niche: 'bottom-dweller',
    cost: 2,
    attack: 2,
    health: 2,
    // Eats sea stars for a living, which is why it goes through their armour.
    keywords: ['pierce'],
    tide: {
      low: { attack: 1 },
    },
    text: 'Eats sea stars alive, arm by arm, and keeps the rest of the animal fresh.',
  },
  {
    id: 'feather-star',
    name: 'Feather Star',
    species: 'Comanthina schlegelii',
    type: 'creature',
    taxon: 'echinoderm',
    niche: 'bottom-dweller',
    // Still cost 2. It paid for the aura by giving up its second energy tick:
    // it is the perch things hunt from now, not the flat's battery.
    cost: 2,
    attack: 0,
    health: 5,
    auras: [
      {
        affects: 'bottom-dweller',
        grants: { attack: 1 },
        note: 'shrimp, squat lobsters and clingfish live in its arms and hunt from them',
      },
    ],
    arrival: {
      kind: 'forage',
      amount: 1,
      note: 'opens into the current the moment it has something to climb',
    },
    tide: {
      rising: { energy: 1 },
    },
    text: 'Climbs to the top of a sea fan at dusk and opens its arms into the current.',
  },
  {
    id: 'spanish-dancer',
    name: 'Spanish Dancer',
    species: 'Hexabranchus sanguineus',
    type: 'creature',
    taxon: 'mollusc',
    niche: 'bottom-dweller',
    cost: 2,
    attack: 1,
    health: 3,
    keywords: ['toxic'],
    auras: [
      {
        affects: 'bottom-dweller',
        grants: { health: 1 },
        note: 'emperor shrimp ride in its mantle folds, and spread from there across the flat',
      },
    ],
    tide: {
      high: { attack: 1 },
      low: { health: 1 },
    },
    text: 'Eats sponges and keeps their poison. Unrolls its mantle and swims, red as a skirt.',
  },
  {
    id: 'warty-frogfish',
    name: 'Warty Frogfish',
    species: 'Antennarius maculatus',
    type: 'creature',
    taxon: 'fish',
    niche: 'bottom-dweller',
    cost: 4,
    attack: 3,
    health: 4,
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'waves the lure once, and the mouth is open and shut in six milliseconds',
    },
    tide: {
      low: { attack: 1 },
      high: { attack: -1 },
    },
    text: 'Walks on its fins, wears a fishing rod on its head, and looks nothing like a fish.',
  },
  {
    id: 'mandarinfish',
    name: 'Mandarinfish',
    species: 'Synchiropus splendidus',
    type: 'creature',
    taxon: 'fish',
    niche: 'bottom-dweller',
    cost: 1,
    attack: 1,
    health: 2,
    keywords: ['toxic'],
    tide: {
      rising: { health: 1 },
      falling: { attack: 1 },
    },
    text: 'No scales anywhere on it. Just a coat of foul, stinging slime under all that colour.',
  },
  {
    id: 'box-jellyfish',
    name: 'Box Jellyfish',
    species: 'Chironex fleckeri',
    type: 'creature',
    // The set had cnidarians, and every one of them was a coral bolted to the
    // reef. This is the other half of the cnidarians: the one that drifts.
    taxon: 'cnidarian',
    niche: 'open-water',
    cost: 4,
    attack: 3,
    health: 4,
    keywords: ['toxic'],
    auras: [
      {
        affects: 'open-water',
        grants: { health: 1 },
        note: 'juvenile fish ride the open water inside the stinging curtain',
      },
    ],
    tide: {
      rising: { attack: 1 },
      // Blooms come in on the tide and strand when it goes out.
      low: { health: -2 },
    },
    text: 'Three metres of tentacle behind a bell the size of a fist, and eyes on all four sides.',
  },
  {
    id: 'mushroom-coral',
    name: 'Mushroom Coral',
    species: 'Fungia fungites',
    type: 'structure',
    taxon: 'cnidarian',
    niche: 'reef-builder',
    // The only reef-builder with an attack, and it earns it: Fungia catches and
    // digests jellyfish. Every other coral in the set is a wall.
    cost: 2,
    attack: 1,
    health: 5,
    keywords: ['reef-guard'],
    tide: {
      low: { health: 1 },
      falling: { attack: 1 },
    },
    text: 'A single polyp the size of a hand, cemented to nothing. It rights itself if you turn it over.',
  },
  {
    id: 'tasselled-wobbegong',
    name: 'Tasselled Wobbegong',
    species: 'Eucrossorhinus dasypogon',
    type: 'creature',
    // Sharks all lived in open water. This one is a carpet, and it belongs to
    // the flat.
    taxon: 'shark-ray',
    niche: 'bottom-dweller',
    cost: 4,
    attack: 4,
    health: 5,
    armour: 2,
    tide: {
      low: { attack: 2 },
      high: { attack: -1 },
    },
    text: 'A fringe of skin flaps and a mouth. You do not see it until the sand moves.',
  },
];

const CARD_INDEX: ReadonlyMap<string, CardDefinition> = new Map(CARDS.map((c) => [c.id, c]));

/**
 * Every card whose aura reads `trait`, and what it grants.
 *
 * This is what a trait *does*, and it is derived rather than written down so it
 * cannot drift from the set. A trait nothing reads comes back empty, which is
 * the honest answer: it is decoration on this card until something reads it.
 */
export function auraSourcesFor(niche: Niche): { card: CardDefinition; aura: Aura }[] {
  const out: { card: CardDefinition; aura: Aura }[] = [];
  for (const card of CARDS) {
    for (const aura of card.auras ?? []) {
      if (aura.affects === niche) out.push({ card, aura });
    }
  }
  return out;
}

/** What a card does the moment it lands, if anything. */
export function arrivalOf(definitionId: string): ArrivalEffect | undefined {
  return getCard(definitionId).arrival;
}

/** The taxon a card belongs to. What the conservation pile is scored on. */
export function taxonOf(definitionId: string): Taxon {
  return getCard(definitionId).taxon;
}

/** Every taxon the set contains, so a client can show the pile's full board. */
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

/** Whether this card's damage goes straight through armour. */
export function piercesArmour(definitionId: string): boolean {
  return getCard(definitionId).keywords?.includes('pierce') ?? false;
}

/** The niche a card occupies — how and where it lives. */
export function nicheOf(definitionId: string): Niche {
  return getCard(definitionId).niche;
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
        if (nicheOf(target.definitionId) !== aura.affects) continue;
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
