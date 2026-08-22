/**
 * TidaliX starter set — "Reef Flat".
 *
 * Every card is a real species, and its tide line is drawn from how that animal
 * actually behaves across the tidal cycle. Mudskippers and grapsid crabs own the
 * drained flat; mantas, reef sharks and trevally ride the flood in over the
 * crest; corals and clams sit still and pay rent, but bake when the water leaves.
 *
 * Design rule: if a card's tide line contradicts the animal, fix the card.
 *
 * Every printed `armour` value was lowered by 1 (loggerhead turtle 1 -> 0, with
 * its health raised 5 -> 6 to compensate for losing the trait outright), and
 * toxin was made symmetric (see resolver.ts) in the same pass — the two were
 * measured together since three armoured cards are also toxic. Self-play, 400
 * games per difficulty, bot vs bot:
 *
 *                                                       before this pass          after
 *   hits into an armoured creature dealt zero damage    normal 26.5% hard 28.9%  normal 13.4% hard 14.0%
 *   armoured creatures that died to combat or toxin      normal 19.0% hard 22.4%  normal 36.9% hard 43.7%
 *   toxin-caused kills, per game                        normal 0.003 hard 0.013  normal 0.485 hard 0.850
 *
 * The aggregate share of all combat damage armour cancelled was only 7-9%
 * before the pass (now 4-5%), so this was never about total damage output —
 * it was that whichever creature wore armour became close to unkillable by
 * ordinary attacks, most sharply on the three cards that stack armour with
 * `toxic` (blackspotted puffer, red lionfish, crown-of-thorns starfish), which
 * paid for two independent defensive answers on one body. Both numbers moved
 * together as intended: armour is no longer close to a full block, and toxin
 * — previously almost inert, ~1 kill per 100-300 games — now settles roughly
 * one game in two. Re-measure rather than trusting these numbers if the set
 * changes again.
 *
 * A full-set repricing pass (after a long run of individual trait/dash/
 * symbiosis additions and removals, each calibrated only against its
 * immediate neighbours) checked every card's cost against every other
 * card's at once, rather than one peer comparison at a time. The tool: a
 * power score per card (attack + health, plus a fixed point value per
 * keyword, per point of armour/spines, per dash amount by kind, and per
 * aura point granted — see tools/price-model.mjs, or `npm run
 * price-check`, for the exact weights), with the points-per-cost
 * conversion rate calibrated against the set's own total cost rather than
 * assumed, so the result reflects relative mispricing rather than a
 * guessed ratio. 25 of 50 costs moved, up to 6->3 and 5->7. Six cards were
 * deliberately held below what the model implied: Atlantic Mudskipper and
 * Clown Anemonefish, the set's two cost-1 openers, and four cards whose
 * implied move was the smallest of the pass (Bluestreak Cleaner Wrasse,
 * Staghorn Coral, Black Sea Cucumber, Feather Star, each implied 2->3) —
 * moving all four would have dropped the set's cost-<=2 share under the
 * quota set.test.ts guards, so the softest deltas gave way first rather
 * than the sharpest ones.
 *
 * Unlike every earlier pass this session, this one did NOT stay inside
 * self-play noise. 1000-seed opener win rate moved 48.1% -> 42.8%, a 5.3pp
 * shift against a ~1.6% standard error at n=1000 — real, not noise, and in
 * the wrong direction (the opener now loses more than it wins, on top of
 * whatever a coin flip already costs the other side). The likely
 * mechanism: the pass systematically cheapened tempo/aggression (Giant
 * Trevally, Great Barracuda, Giant Moray, Common Octopus, Whitetip Reef
 * Shark, Tasselled Wobbegong, Grey Reef Shark) while making defensive
 * walls more expensive (Bubble-tip Anemone, Giant Clam, Long-spined
 * Urchin, Fire Coral, Brain Coral, Giant Triton), which plausibly delays
 * the opener's ability to lock in an early defensive lead more than it
 * helps either side's offense. Not root-caused further, and deliberately
 * accepted rather than dampened: the trait/dash/symbiosis cost fairness
 * this pass targeted was the actual goal, and first-move advantage is a
 * separate axis (the game's starting-player coin flip is the tool for
 * that, not card cost) left for a dedicated pass of its own. Re-measure
 * opener win rate specifically before or alongside any future cost changes
 * — this is now the number to watch, not just the trait/dash fairness this
 * pass was built to check. Re-run the model rather than hand-adjusting a
 * single card's cost if the set changes again; a one-off peer comparison
 * is exactly the drift this
 * pass corrected.
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
    niche: 'bottom-crawler',
    // Gained scout: genuinely mobile, periscope-like eyes give it near-360°
    // vision, documented as used specifically to watch for predators while
    // it hunts and defends its burrow on the open flat — a real early-warning
    // sense, not speed or feeding. Cost held at 1 rather than the usual +1:
    // this is the set's cheapest, most reliable opener, and set.test.ts
    // guards that a 2-energy, 4-card opening hand has something to play in
    // most games. A cost bump here would be the set's own quota, not this
    // card's biology, dictating the number.
    cost: 1,
    attack: 1,
    health: 2,
    arrival: {
      kind: 'scout',
      amount: 1,
      note: 'the eyes swivel independently, watching the whole flat at once',
    },
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
    niche: 'bottom-crawler',
    cost: 3,
    attack: 2,
    health: 2,
    keywords: ['surge'],
    // A crab's own hard shell, same tier as a turtle's.
    armour: 1,
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
    // Pierce: a documented shell-driller — a salivary papilla works as an
    // accessory radula, mechanically and chemically drilling through
    // bivalve and gastropod shells before a paralytic toxin goes in through
    // the hole. As clean a fit for "drilling radula" as the giant triton's.
    cost: 4,
    attack: 3,
    health: 4,
    keywords: ['pierce'],
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
    niche: 'bottom-crawler',
    // Was armour too: a stomatopod does have a shell, but toughness isn't
    // what this animal is actually known for — everything about it is the
    // club. Swapped for surge: the same extreme speed that used to justify a
    // strike dash. But on a closer look the dash's own justification was
    // purely that speed ("fast enough to cavitate the water") — the same
    // fact surge already covers, not a distinct mechanism the way a moray's
    // second jaws or a triton's drilling radula are. Dropped the dash
    // outright rather than keep two traits saying the same thing; cost
    // dropped with it. Gained scout on a distinct real sense instead: 12-16
    // channel colour vision plus linear and circular polarization vision,
    // UV-sensitive, and it actively rotates its eyes to scan and align on
    // objects of interest — a genuine investigative sense, not speed.
    cost: 4,
    attack: 4,
    health: 2,
    keywords: ['pierce', 'surge'],
    arrival: {
      kind: 'scout',
      amount: 1,
      note: 'each eye swivels and locks onto anything worth a second look',
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
    // Lost toxin-immune: its own text claimed lionfish predation, but that's
    // Nassau and tiger grouper (different genera). Diet studies specific to
    // this species (P. leopardus) list damselfish, parrotfish, fusiliers and
    // small crustaceans — no toxic prey. Cost dropped with the keyword.
    cost: 4,
    attack: 4,
    health: 4,
    // Printed as the Giant Moray's twin — same cost, same body — until this
    // went on it. It is also the only attack the reef itself grants.
    auras: [
      {
        affects: 'reef-dweller',
        grants: { attack: 1 },
        note: 'headstands at a crevice until a moray goes in, and takes what bolts out',
      },
    ],
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'the mouth snaps open into a sudden vacuum, and prey many times its speed gets pulled straight in',
    },
    tide: {
      rising: { attack: 1 },
      high: { attack: 1 },
    },
    text: 'Ambushes fusiliers and damselfish from a crevice, and swallows them whole before they react.',
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
    // Gained an aura on the symbiosis review: mantas are well documented
    // returning to the same reef cleaning stations again and again, where
    // cleaner fish pick parasites and dead skin off them — a reliable food
    // source for the cleaner, the mirror image of the cleaner wrasse's own
    // aura from the other side of the same real relationship.
    cost: 5,
    attack: 4,
    health: 6,
    auras: [
      {
        affects: 'reef-dweller',
        grants: { health: 1 },
        note: 'circles the same cleaning station every visit, and the cleaners never go hungry',
      },
    ],
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
    // Gained an aura on the symbiosis review: a peer-reviewed study of
    // nocturnal shark foraging documented whitetips flushing hidden prey
    // out of reef crevices that grey reef sharks then capture — the real
    // mechanism behind what used to be credited to the grey reef shark's
    // own "pack" story (see its note). Its own text already says it.
    cost: 3,
    attack: 3,
    health: 3,
    auras: [
      {
        affects: 'open-water',
        grants: { attack: 1 },
        note: "pours through the reef by night, and whatever bolts loose is already someone else's",
      },
    ],
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
    // Lost reef-guard and toxin-immune, both mismatches on research: it's a
    // mobile grazer with no documented blocking/territorial behaviour (a
    // hard shell protects only itself), and its adult diet is seagrass and
    // algae — jellyfish-eating is a juvenile, opportunistic habit, not the
    // adult specialism its own card text is themed on. (The real toxin-eater
    // is the leatherback, not in this set.) A shell is still armour.
    cost: 4,
    attack: 3,
    health: 7,
    armour: 1,
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
    // Its own text already says it: headbutts coral apart and grinds it to
    // sand. A real, documented durophagous predator — the strongest case in
    // the set for pierce, and it had none. The one card at this price.
    keywords: ['pierce'],
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
    cost: 4,
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
    // Genuinely one of the fastest-striking predatory fish, which covers
    // surge — but the strike dash used to lean on that same speed, and
    // research backs the same problem the mantis shrimp and frogfish had:
    // barracuda predation is ram-feeding, driven primarily by velocity, not
    // a separate weapon. Rewritten around what actually is distinct — dual
    // rows of teeth, some backward-curving, built to shear on impact rather
    // than just deliver a fast hit.
    keywords: ['surge'],
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'the backward-curving teeth shear on the way through, not just the speed of the hit',
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
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'the pharyngeal jaws shoot forward and clamp before the prey ever clears the crevice',
    },
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
        affects: 'frame-builder',
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
    // Reef-guard: solitary and genuinely territorial, more so with age —
    // documented to establish and aggressively defend a patrol territory
    // against intruders with body-posture displays and nipping. A better-
    // cited case than any turtle in this set ever was.
    cost: 3,
    attack: 3,
    health: 3,
    keywords: ['reef-guard'],
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
    // The full-set repricing pass implied 3, the smallest of its movements —
    // held at 2 instead, alongside three other +1 cost-2 cards, to keep the
    // cheap-card quota set.test.ts guards from dropping under its threshold.
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
    niche: 'frame-builder',
    // The full-set repricing pass implied 3, the smallest of its movements —
    // held at 2 instead, alongside three other +1 cost-2 cards, to keep the
    // cheap-card quota set.test.ts guards from dropping under its threshold.
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
        affects: 'frame-builder',
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
    niche: 'frame-builder',
    cost: 4,
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
    // A frame-builder, and the only one that is not a cnidarian. It is sessile,
    // it farms algae in its mantle exactly as a coral does, and its shell ends
    // up as reef substrate. It was printed as a structure from the start; only
    // the niche disagreed, because it happens to sit on sand.
    niche: 'frame-builder',
    cost: 5,
    attack: 0,
    health: 8,
    keywords: ['reef-guard'],
    // Two shells that weigh as much as a person, and they close.
    armour: 1,
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
    cost: 4,
    attack: 2,
    health: 5,
    keywords: ['toxic'],
    // Lacks the true erectile spines of a porcupinefish (Diodontidae) — just
    // tough, leathery skin. Downgraded from 2 so it no longer outranks a
    // giant clam's shell or a turtle's carapace, both armour 1.
    armour: 1,
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
    // Lost toxic: the venom lives entirely in the spines (spines already says
    // that), and the flesh itself is not toxic — it's commercially fished and
    // eaten once the spines are removed, and documented predators (grouper,
    // sharks, moray) eat lionfish whole and survive. Kills the attacker that
    // triggers the spines; doesn't poison whatever eats the rest of it.
    cost: 4,
    attack: 4,
    health: 3,
    // Was armour: the fish has no body armour at all — its whole defence is
    // the venomous fin spines themselves, which is spines, not toughness.
    spines: 2,
    arrival: {
      kind: 'strike',
      amount: 1,
      note: 'fans its prey into a corner the moment it settles',
    },
    tide: {
      falling: { attack: 1 },
      low: { exposed: true },
    },
    text: 'Herds prey into a corner with its fans. The spines are for whatever tries it.',
  },
  {
    id: 'crown-of-thorns-starfish',
    name: 'Crown-of-thorns Starfish',
    species: 'Acanthaster planci',
    type: 'creature',
    taxon: 'echinoderm',
    niche: 'bottom-crawler',
    cost: 5,
    attack: 3,
    health: 6,
    keywords: ['toxic'],
    // Was armour: a starfish has no shell. What it actually has, and what its
    // own name says, is a body covered in venomous spines. Kept at 1 rather
    // than fire coral's 2: at 2, its retaliation (attack 3 + spines) would
    // exactly kill the giant triton — the one card built specifically to
    // answer it — turning a clean counter into an even trade.
    spines: 1,
    auras: [
      {
        affects: 'frame-builder',
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
    niche: 'frame-builder',
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
        affects: 'frame-builder',
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
    niche: 'bottom-crawler',
    cost: 6,
    attack: 3,
    health: 5,
    // The crown-of-thorns' actual predator, and the reason `pierce` exists: a
    // starfish behind armour and a toxin was otherwise close to unanswerable.
    // (The starfish now carries spines instead of armour, which pierce does
    // nothing against — see the spines value on crown-of-thorns-starfish.)
    keywords: ['pierce', 'toxin-immune'],
    // A genuine large snail shell.
    armour: 1,
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
    niche: 'bottom-crawler',
    cost: 2,
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
    cost: 4,
    attack: 3,
    health: 3,
    // Surge's real justification, on research: giant axons — the same
    // unusually large, ultra-fast nerve fibers that made squid a classic
    // neuroscience model organism — drive a jet-propulsion escape reflex
    // fast enough to cover 100 feet in 3 seconds. Not the schooling/colour
    // story below, which is real but belongs to the scout dash instead.
    keywords: ['surge'],
    // The old note leaned on speed for the scout too, the same weak fact
    // already carrying its surge — and the card's own text isn't about
    // speed at all. Reef squid keep station in a school and flash colour
    // changes down the line to warn each other off a threat before it's
    // close enough to matter; that's the real reason one of them draws a
    // card, not a reflex.
    arrival: {
      kind: 'scout',
      amount: 1,
      note: 'catches the colour-change running down the line before the threat itself arrives',
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
    niche: 'bottom-crawler',
    // A wall, spines, a scout, and the flat's largest aura on one card —
    // the single most-loaded body in the set, and a full-set repricing pass
    // moved cost to match (5->7). Diadema has no eyes, but photoreceptors
    // spread across its whole skin resolve a looming shape well enough to
    // point spines at it before contact is made — a real sense distinct
    // from the spines themselves, which only answer an attack that has
    // already landed.
    cost: 7,
    attack: 0,
    health: 6,
    keywords: ['reef-guard'],
    spines: 4,
    auras: [
      {
        affects: 'bottom-crawler',
        grants: { health: 2 },
        note: 'a forest of spines, and half the flat spends the day inside it',
      },
    ],
    arrival: {
      kind: 'scout',
      amount: 1,
      note: 'the skin itself reads the shadow before the spines even move',
    },
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
    niche: 'bottom-crawler',
    // Used to carry mend, healing the whole reef the moment it landed. But
    // what this animal is actually known for — shedding an arm that grows
    // into a second, separate star — is personal regeneration, not a gift
    // to anything else nearby. Dropped the dash; cost held rather than
    // dropped a flat notch, since a vanilla 1/4 for 2 still lands in line
    // with this cost tier's other unadorned bodies (Spanish Dancer's 1/3).
    cost: 2,
    attack: 1,
    health: 4,
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
    niche: 'bottom-crawler',
    // Reef-guard came off (a sea cucumber is soft and harmless, nothing a
    // predator has to fight through), leaving it the aura and the arrival.
    // The full-set repricing pass implied 3 for that pair, the smallest of
    // its movements — held at 2 instead, alongside three other +1 cost-2
    // cards, to keep the cheap-card quota set.test.ts guards from dropping
    // under its threshold.
    cost: 2,
    attack: 0,
    health: 6,
    arrival: {
      kind: 'forage',
      amount: 1,
      note: 'starts turning sediment over the moment it settles',
    },
    // The flat needed a relationship of its own. Seventeen species live down
    // there and nothing was reaching any of them.
    auras: [
      {
        affects: 'bottom-crawler',
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
    niche: 'bottom-crawler',
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
    // A real cleaner shrimp, the same reasoning as the wrasse's mend — but a
    // single shrimp working one crevice, not a station the whole reef lines
    // up for, so it heals less than the wrasse's.
    arrival: {
      kind: 'mend',
      amount: 1,
      note: 'picks parasites out of the mouth of whatever stops for it',
    },
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
    niche: 'bottom-crawler',
    // Was surge, dropped: a real coconut crab is slow and methodical, not a
    // fast striker — its whole identity, here and in reality, is grip
    // strength and smell. Two additions this round both real and distinct:
    // pierce for the crushing pinch itself (its own text already says "a
    // grip that opens a coconut," and it's a documented crusher of other
    // hard-shelled animals, not just coconuts) and scout for a
    // disproportionately large olfactory brain region — more interneurons
    // devoted to smell than a honeybee — used to detect food odour over long
    // range. Two real, unrelated mechanisms, so cost rose with both.
    cost: 6,
    attack: 5,
    health: 5,
    // The largest arthropod alive, and it has the exoskeleton to match.
    armour: 1,
    keywords: ['pierce'],
    arrival: {
      kind: 'scout',
      amount: 1,
      note: 'follows a food scent across open ground long before anything is in sight',
    },
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
    // Lost reef-guard: smaller-bodied than the other turtles, and it feeds by
    // threading its narrow beak into crevices — the opposite of physically
    // blocking access to anything. Toxin-immune stands on its own: a real
    // spongivore specialist, 70-95% of its diet sponges loaded with silica
    // spicules and toxic compounds it's documented to tolerate.
    cost: 4,
    attack: 2,
    health: 6,
    keywords: ['toxin-immune'],
    armour: 1,
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
    niche: 'frame-builder',
    // Lost toxic: the sting is genuinely painful, but several reef fish do
    // eat fire coral without dying — a deterrent, not a guaranteed kill the
    // way a pufferfish's tetrodotoxin is. Spines alone still says the sting
    // is real. Gained reef-guard on the same evidence that already justifies
    // the bubble-tip anemone's: a real, documented, intensely painful
    // nematocyst sting that deters contact — a stinging barrier something
    // else has to get past, same as the anemone. Same reef-guard-plus-
    // spines-2 package as the anemone, 1 more health — a full-set repricing
    // pass moved both to the same price together (2->4).
    cost: 4,
    attack: 0,
    health: 5,
    keywords: ['reef-guard'],
    spines: 2,
    auras: [
      {
        affects: 'frame-builder',
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
    niche: 'frame-builder',
    cost: 6,
    attack: 0,
    health: 9,
    keywords: ['reef-guard'],
    // A massive, dense boulder coral — unlike the fast-growing, brittle
    // branching corals (staghorn, table), this is the genuinely hard one.
    armour: 1,
    auras: [
      {
        affects: 'frame-builder',
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
    niche: 'frame-builder',
    cost: 3,
    attack: 0,
    health: 4,
    auras: [
      {
        affects: 'reef-dweller',
        grants: { health: 1 },
        note: 'a thicket to hang in out of the current',
      },
    ],
    // Its own text is a suspension feeder's whole method: broadside to the
    // current, taking whatever gets carried past. Giant Clam and Reef Manta
    // Ray get the same forage for the same reason; this was the one
    // already-written case that had gone unmarked.
    arrival: {
      kind: 'forage',
      amount: 2,
      note: 'every polyp opens into the current at once',
    },
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
    // Lost toxic: the barb's venom is a real, painful vasodilator, but
    // stingray-envenomation deaths are documented as caused by the barb's
    // physical trauma, not toxin — and hammerhead sharks are well documented
    // eating eagle rays unharmed, barbs found embedded harmlessly in their
    // jaws. Kept spines, which still says the barb is real and used.
    // Pierce: its own text was already saying it — a snout built to shovel
    // shellfish out of the sand and crush them in flattened plates, the same
    // durophagous case as the loggerhead's jaws. Gained an aura on the
    // symbiosis review: a real, documented "nuclear-follower" foraging
    // pattern — a ray disturbing sediment while it feeds exposes prey that
    // other bottom-dwelling fish are observed following the plume to take.
    cost: 6,
    attack: 3,
    health: 5,
    keywords: ['pierce'],
    spines: 2,
    auras: [
      {
        affects: 'bottom-crawler',
        grants: { attack: 1 },
        note: 'the sand plume from every dig gives up more than the ray ever finishes eating',
      },
    ],
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
    // Lost reef-guard: the "guardian of the ledge" framing is dive-tourism
    // folklore, not biology. Real sources describe it as docile and
    // non-territorial — it aggregates communally with other nurse sharks
    // rather than guarding one, and only bites defensively if cornered or
    // handled, true of nearly any animal. Its real identity (sedentary,
    // cave-dwelling, powerful suction) is already fully carried by strike.
    cost: 4,
    attack: 2,
    health: 7,
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'flares its gill slits and the suction alone rips prey loose from the crevice it was hiding in',
    },
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
    // Has a shell like the other two turtles, same as they do. A prior pass
    // had traded its armour for a point of health instead, on the reasoning
    // that armour 1 "rounded down to nothing" — reversed here: the shell is
    // real, so the armour comes back and the health point it was standing in
    // for comes back out.
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
    // Gained surge: the threat display its own card text already describes —
    // arched back, dropped fins — is a real, documented escalation that ends
    // in a genuinely fast, lightning slashing attack if the warning isn't
    // heeded. The mechanic now matches the flavour text already printed.
    cost: 3,
    attack: 3,
    health: 4,
    keywords: ['surge'],
    // The only aura in the set that grants attack to the big animals. Note
    // rewritten on the symbiosis review: the old "the pack comes in behind
    // it" implied coordinated teamwork, but research into actual predation
    // events found competition between sharks, not cooperation — the real
    // mechanism behind that story turned out to belong to the whitetip reef
    // shark instead (see its own aura). What holds up for this species on
    // its own is real too, just smaller: a genuine daytime social
    // aggregation, and social foraging is measured to succeed more often
    // than hunting alone.
    auras: [
      {
        affects: 'open-water',
        grants: { attack: 1 },
        note: 'keeps to a daytime shoal, and a shoal comes home fed more often than any one shark alone',
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
    // Lost toxic, same reasoning as the eagle ray: the barb venom is real and
    // painful, but no case report backs "genuinely dangerous to eat" the way
    // a pufferfish's tetrodotoxin is, and the broader stingray-venom
    // literature attributes deaths to the barb's physical trauma, not toxin.
    // Spines still says the barb is real and used.
    cost: 3,
    attack: 2,
    health: 4,
    // Two venomous barbs held over its back, and it strikes back with them.
    spines: 2,
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
    niche: 'bottom-crawler',
    // Eats sea stars for a living, which is why it goes through their armour.
    // Gained toxin-immune this round: a documented sustained predator
    // specifically of crown-of-thorns starfish — field studies link its
    // abundance to the absence of COTS outbreaks, the same evidence class
    // as the giant triton's. (It also has petal-like sensory antennules
    // that chemically detect starfish prey — real, but scout stayed off
    // this card to keep the dash-holding half of the set a minority; the
    // real trait is still true, just not spent here.) Cost held at 2: the
    // body is still the smallest in the set, and toxin-immune is dead
    // weight most games with no toxic card in play.
    cost: 2,
    attack: 2,
    health: 2,
    keywords: ['pierce', 'toxin-immune'],
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
    niche: 'bottom-crawler',
    // It paid for the aura by giving up its second energy tick: it is the
    // perch things hunt from now, not the flat's battery. The full-set
    // repricing pass implied 3 for the aura-plus-forage pair, the smallest
    // of its movements — held at 2 instead, alongside three other +1
    // cost-2 cards, to keep the cheap-card quota set.test.ts guards from
    // dropping under its threshold.
    cost: 2,
    attack: 0,
    health: 5,
    auras: [
      {
        affects: 'bottom-crawler',
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
    niche: 'bottom-crawler',
    // Lost toxic: it does sequester real sponge toxins, but how toxic varies
    // a lot by individual diet — "distasteful" fits better than "kills
    // whatever eats it." Cost held: 1/3 plus the aura already sits right
    // alongside Bluestreak Cleaner Wrasse's 1/2-plus-aura at the same price.
    cost: 2,
    attack: 1,
    health: 3,
    auras: [
      {
        affects: 'bottom-crawler',
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
    niche: 'bottom-crawler',
    // A prior pass dropped its strike dash as "the same speed as surge" and
    // gave it surge instead. Research reverses that call: the frogfish's
    // real fast trait is an ultra-fast suction-feeding strike (2-6ms, mouth
    // expanding 12x, one of the fastest vertebrate feeding movements) — the
    // same category of mechanism as the coral grouper's and nurse shark's
    // confirmed strikes, not raw speed. Meanwhile a frogfish is otherwise
    // characteristically slow — it walks on modified fins and ambushes from
    // a standstill — a poor fit for surge's full-attack reflex. Swapped
    // back: strike restored, surge dropped.
    cost: 3,
    attack: 3,
    health: 4,
    arrival: {
      kind: 'strike',
      amount: 2,
      note: 'waves the lure once, and the mouth expands twelvefold and shuts in six milliseconds',
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
    niche: 'bottom-crawler',
    // Lost toxic: the mucus coat is real, but it reads in the sources as a
    // bad-taste deterrent, not something that reliably kills a predator.
    // Cost held at 1 — 1/2 with no keyword is exactly Atlantic Mudskipper's
    // line at the same price.
    cost: 1,
    attack: 1,
    health: 2,
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
    // Cost 5, not 4, with the sweep: unlike a true jellyfish it does not
    // drift and wait, it actively hunts, chasing down small fish and shrimp
    // at up to 4 knots. Millions of nematocysts along three metres of
    // trailing tentacle mean one hunting pass through a school can sting
    // several animals at once, not just the one it was aimed at.
    // Gained spines: a contact-triggered nematocyst sting, the same
    // mechanism already justifying the anemone's and fire coral's spines —
    // if anything a stronger case, among the most potent venom of any
    // animal. Models what happens to whatever actually lands a hit on it.
    cost: 6,
    attack: 3,
    health: 4,
    keywords: ['toxic'],
    spines: 2,
    auras: [
      {
        affects: 'open-water',
        grants: { health: 1 },
        note: 'juvenile fish ride the open water inside the stinging curtain',
      },
    ],
    arrival: {
      kind: 'sweep',
      amount: 1,
      note: 'the whole trailing curtain of tentacle passes through at once',
    },
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
    niche: 'frame-builder',
    // The only frame-builder with an attack, and it earns it: Fungia catches and
    // digests jellyfish. Every other coral in the set is a wall.
    //
    // Was reef-guard too, until it lost it: its own defining trait is being
    // unattached and free-living ("cemented to nothing... rights itself if
    // you turn it over") — the opposite of something a predator has to get
    // past. Cost held at 2 rather than dropping with the keyword: 1/5 here
    // is still a modest edge over Blue Sea Star's 1/4 at the same cost, not
    // one big enough to need its own price cut.
    cost: 2,
    attack: 1,
    health: 5,
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
    niche: 'bottom-crawler',
    // Lost its armour: tough skin is real, but softer a case than a puffer's,
    // and next to camouflage this isn't the wobbegong's defining trait — a
    // fringe of skin flaps that reads as sand, not a shell. A full-set
    // repricing pass later settled a plain 4/5 body with no keyword at 3.
    // Also a genuinely well-documented ambush strike (jaw fires in under
    // 50ms via real suction feeding, same category as the coral grouper's
    // and nurse shark's) — but left off this card to keep the dash-holding
    // half of the set a minority. Real trait, just not spent here.
    cost: 3,
    attack: 4,
    health: 5,
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
 *
 * `enemyBoard` is the opposing side, needed only for an aura marked
 * `crossesWaterline` (a crown-of-thorns' outbreak) — every other aura is
 * friendly-only, so passing it changes nothing for the rest of the set.
 */
export function activeSymbioses(
  board: readonly { instanceId: string; definitionId: string }[],
  enemyBoard: readonly { instanceId: string; definitionId: string }[] = [],
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
      if (!aura.crossesWaterline) continue;
      for (const target of enemyBoard) {
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
