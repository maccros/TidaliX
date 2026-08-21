/**
 * Core type vocabulary for the TidaliX engine.
 *
 * Nothing in here (or anywhere else under engine/src) may import from a
 * rendering library. The engine takes actions in and emits state + events out;
 * the client decides how any of it looks.
 */

/** The four phases of the shared tide, in cycle order. */
export type TidePhase = 'low' | 'rising' | 'high' | 'falling';

export type PlayerId = 0 | 1;

export type CardType = 'creature' | 'structure';

/**
 * Keywords the resolver actually implements. Adding one here without teaching
 * the resolver about it produces dead card text, so keep this list honest.
 */
export type Keyword =
  /** May attack the turn it is played. */
  | 'surge'
  /** Enemies must attack this before anything else on its side. */
  | 'reef-guard'
  /**
   * Eating this animal kills the eater. Any card that destroys it by attacking
   * it is destroyed too, unless that card is `toxin-immune`. Purely defensive:
   * a toxic card that attacks and kills poisons nobody, because nothing ate it.
   */
  | 'toxic'
  /** Can eat a `toxic` card without dying for it. */
  | 'toxin-immune'
  /**
   * This card's damage ignores armour entirely.
   *
   * The answer to a board that has gone unkillable behind armour, and to the
   * crown-of-thorns in particular — armour 3 on six health, toxic, so most
   * attackers either bounce off it or die eating it. Printed on the two animals
   * that really do get through a shell: a mantis shrimp's club, and the triton
   * that drills into a starfish.
   */
  | 'pierce';

/**
 * How a species lives, and where — the axis symbiosis reads.
 *
 * Every card has exactly one. It sits beside `taxon` and answers a different
 * question: a taxon is what an animal *is*, a niche is how it *lives*. A
 * conservation pile is scored on taxa; an aura is aimed at a niche.
 *
 * Four, divided by relationship to the reef itself, because that is what the
 * relationships in this game are actually about — who shelters whom, and who is
 * only passing through. Every species falls cleanly into one, which is the point:
 * the old `traits` list let a card carry three tags, five of which nothing read.
 */
export type Niche =
  /** Lives in and among the coral. What the reef shelters. */
  | 'reef-dweller'
  /** Comes in from outside — sharks, rays, turtles, the big fish. */
  | 'open-water'
  /** Is the structure: the corals, the sea fan, the anemone. */
  | 'reef-builder'
  /** The flat, the sand and the rubble beneath it all. */
  | 'bottom-dweller';

/** What each niche means, in the player's language. */
export const NICHE_NOTE: Record<Niche, string> = {
  'reef-dweller': 'Lives in and among the coral itself. What the reef shelters.',
  'open-water': 'Comes in from outside — sharks, rays, turtles and the big fish.',
  'reef-builder': 'Is the structure the rest of the reef is built on.',
  'bottom-dweller': 'The drained flat, the sand, and the rubble beneath it all.',
};

/**
 * The taxon a species belongs to — one per card, and every card has one.
 *
 * This is what the conservation pile is scored on. A trait says how an animal
 * *behaves* and can be worn several at once; a taxon says what it *is*, and it
 * is singular on purpose: a pile of six reef fish is one taxon protected, no
 * matter how many different fish they are. Real biodiversity is measured across
 * branches of the tree, not across names on a list.
 */
export type Taxon =
  | 'fish'
  | 'shark-ray'
  | 'crustacean'
  | 'echinoderm'
  /** Cephalopods live here too — an octopus is a mollusc, so this is taxonomy, not a merge. */
  | 'mollusc'
  | 'cnidarian'
  | 'reptile';

/**
 * Player-facing names for each taxon.
 *
 * One register for all seven: the plural name of the group, and nothing else.
 * They used to be mixed — five technical plurals beside 'Fish' and
 * 'Sharks & rays' — which read as three different naming schemes on one row of
 * chips, and two of them were wrong on their own terms. 'Corals & anemones'
 * stopped covering its taxon the moment a jellyfish joined it, and 'Fish'
 * beside 'Sharks & rays' implied a shark is not a fish, which it is.
 *
 * So the split is named for what actually separates the two groups — bone
 * against cartilage — and every label now survives the next species added to
 * it, which is the property the old ones lacked.
 */
export const TAXON_LABEL: Record<Taxon, string> = {
  fish: 'Bony fishes',
  'shark-ray': 'Cartilaginous fishes',
  crustacean: 'Crustaceans',
  echinoderm: 'Echinoderms',
  mollusc: 'Molluscs',
  cnidarian: 'Cnidarians',
  reptile: 'Reptiles',
};

export interface StatBonus {
  attack?: number;
  health?: number;
}

/**
 * Where a point of energy came from. The player is owed this breakdown — an
 * income they cannot account for is an income they cannot plan around — so the
 * resolver never merges two sources into one total.
 */
export type EnergySource =
  /** The base cap, which now steps up once per complete tide cycle. */
  | 'turn'
  /** Unspent energy that survived from the previous turn. */
  | 'carried'
  /** Paid by the tide phase itself. */
  | 'tide'
  /** Generated by species standing on your board this phase. */
  | 'card'
  /** Standing income from the conservation pile. */
  | 'conservation'
  /** The one-off payment for having to move second. */
  | 'compensation';

/** One itemised line of a player's turn income. */
export interface EnergyIncomeLine {
  source: EnergySource;
  amount: number;
  /** Player-facing explanation of where this line came from. */
  detail: string;
}

export interface EnergyIncome {
  lines: EnergyIncomeLine[];
  total: number;
  /**
   * The tide phase this income was (or will be) collected in. A projection is
   * worthless without it: the whole point is that next turn's phase is not this
   * turn's phase.
   */
  phase: TidePhase;
}

/**
 * A standing effect this card has on its neighbours — the symbiosis system.
 *
 * An aura reads a trait and grants a bonus to every *other* friendly card
 * carrying it. Mutualism is simply both partners carrying an aura pointed at the
 * other, which is what an anemone and an anemonefish do. Grants may be negative:
 * a crown-of-thorns starfish is a real relationship too.
 */
export interface Aura {
  affects: Niche;
  grants: StatBonus;
  /** Player-facing description of the relationship. */
  note: string;
  /**
   * Reaches the opponent's board as well as your own.
   *
   * Every other aura in the game is friendly-only, and deliberately so: a reef
   * shelters the animals living in it, not the ones across the channel. This is
   * the single exception, and it exists because a crown-of-thorns outbreak is a
   * plague *on a reef* rather than a drawback its owner privately suffers.
   * Keeping it to one card keeps the default rule intact and makes the exception
   * legible: if a relationship crosses the waterline, that is the card doing it.
   */
  crossesWaterline?: boolean;
}

/**
 * What a given tide phase does to a card. Every field is a delta applied on top
 * of the card's printed stats — absent means "no change in this phase".
 */
export interface TideEffect {
  attack?: number;
  health?: number;
  /**
   * The card is out of its element this phase: attackers deal
   * `config.exposedBonusDamage` extra damage to it. Models e.g. a coral head or
   * a manta stranded by a drained reef flat.
   */
  exposed?: boolean;
  /** Extra energy this card generates for its controller each of their turns. */
  energy?: number;
}

/**
 * What a species does at the moment it arrives on the reef.
 *
 * Without one of these, playing a card is not an *action* — the card sits there
 * doing nothing until your next turn, by which time the opponent has answered
 * it. That is what makes a board lead impossible to overturn: the player behind
 * can only add to their board, never respond to yours.
 *
 * Deliberately not on every card. Like traits, an arrival is something a
 * particular animal does, and a card without one pays for it in stats, in its
 * tide line, or in an aura. A set where every card answers the board is as flat
 * as one where none of them do.
 */
export type ArrivalEffect =
  /** Damage one enemy creature. Needs a target chosen when the card is played. */
  | { kind: 'strike'; amount: number; note: string }
  /** Damage every enemy creature. */
  | { kind: 'sweep'; amount: number; note: string }
  /** Remove damage from every friendly creature. */
  | { kind: 'mend'; amount: number; note: string }
  /** Immediate energy, paid the moment it lands. */
  | { kind: 'forage'; amount: number; note: string }
  /** Draw cards. */
  | { kind: 'scout'; amount: number; note: string };

/** Whether an arrival needs the player to pick something before it can resolve. */
export function arrivalNeedsTarget(effect: ArrivalEffect | undefined): boolean {
  return effect?.kind === 'strike';
}

/** A printed card. Immutable reference data — never mutated at runtime. */
export interface CardDefinition {
  id: string;
  name: string;
  /** Real binomial name. The whole set is built on actual marine species. */
  species: string;
  type: CardType;
  /** The taxon this species belongs to. What the conservation pile scores. */
  taxon: Taxon;
  cost: number;
  attack: number;
  health: number;
  /** Phase-by-phase behaviour. Omitted phases are neutral for this card. */
  tide: Partial<Record<TidePhase, TideEffect>>;
  keywords?: Keyword[];
  /** How and where it lives. Exactly one, and every card has it. */
  niche: Niche;
  /**
   * Damage this card deals back on top of whatever it returns by fighting.
   *
   * Reinstated for a reason that only became visible once every defender started
   * striking back: a card with no attack returns *nothing*, so universal
   * retaliation quietly made the reef's walls worse rather than better. Attacking
   * a coral head or an urchin was free again.
   *
   * So spines is the answer for animals that have no attack to answer with. It is
   * printed only on those, and it stacks with retaliation rather than replacing
   * it, so the rule stays one rule: a defender returns its attack plus its spines.
   */
  spines?: number;
  /**
   * Damage this card shrugs off, from every source.
   *
   * This is what became of `spines` once every defender started striking back.
   * "Hurts what bites it" is now simply what a defender does, so the armed
   * animals needed a job of their own, and the honest one is that they are hard
   * to hurt in the first place: a puffer inflated into a ball nothing can get
   * its jaws around, an urchin wedged in its socket, an anemone withdrawn.
   *
   * It applies to retaliation as much as to attacks, so an armoured animal is
   * both awful to attack and awful to be attacked by.
   */
  armour?: number;
  /** Standing effects on friendly neighbours. */
  auras?: Aura[];
  /** What it does the moment it lands. See `ArrivalEffect`. */
  arrival?: ArrivalEffect;
  /** Flavour / rules reminder text. Not parsed by the resolver. */
  text?: string;
}

/** A physical copy of a card inside a running game. */
export interface CardInstance {
  instanceId: string;
  definitionId: string;
  owner: PlayerId;
  /** Damage marked on the card. Cleared only by effects, not by phase changes. */
  damage: number;
  /** Turn number on which this card arrived on the board, or null while off-board. */
  playedOnTurn: number | null;
  /**
   * `state.tideStep` at the moment this card arrived on the board, or null while
   * off-board. Measured in tide steps rather than turns because maturity is a
   * question about the tide, not the clock: a species is ready to be released
   * once it has lived through a whole cycle, whatever pace the config runs at.
   */
  playedOnTideStep: number | null;
  /** Whether it has already attacked during the current turn. */
  hasAttacked: boolean;
  /**
   * Marked when this card ate something toxic. It is dead the moment the board
   * is next swept — no amount of healing or symbiosis saves it, which is the
   * whole point of a toxin: it is not damage, it is a decision you already made.
   */
  poisoned: boolean;
}

export interface PlayerState {
  id: PlayerId;
  life: number;
  energy: number;
  /** Energy this player refills to at the start of their turn, before tide bonuses. */
  energyCap: number;
  deck: CardInstance[];
  hand: CardInstance[];
  board: CardInstance[];
  discard: CardInstance[];
  /**
   * Species released back to the wild. A third destination that is neither the
   * board nor the discard: these cards are out of play for good, but they are an
   * asset rather than a loss — they pay a standing income and they are a way to
   * win. Scored by *distinct taxa*, so protecting a whole reef beats
   * protecting one branch of it six times over.
   */
  conservation: CardInstance[];
  /** Releases already made this turn, against `config.releasesPerTurn`. */
  releasesThisTurn: number;
  /** Damage taken on the next draw from an empty deck. */
  fatigue: number;
  /**
   * What this player actually collected at the start of their current turn.
   *
   * A historical record rather than a derivation — it is the one economic fact
   * the live state cannot reproduce, because by the time you look, the phase has
   * moved and the board has changed. The client shows it beside the projection
   * for next turn so the two are never confused for each other.
   */
  incomeThisTurn: EnergyIncomeLine[];
}

export interface GameConfig {
  startingLife: number;
  startingHandSize: number;
  maxHandSize: number;
  maxBoardSize: number;
  /** The energy cap both players open on, before any cycle has completed. */
  startingEnergyCap: number;
  /** Ceiling on the income ramp. */
  maxEnergyCap: number;
  /**
   * How much unspent energy survives into your next turn. Zero reproduces the
   * old hard refill; anything above it makes banking through a lean phase a
   * real decision.
   */
  carryOverCap: number;
  /** Extra damage dealt to a card that is `exposed` in the current phase. */
  exposedBonusDamage: number;
  /**
   * Whether every defender counter-attacks. Off by default: only cards with
   * printed `spines` punish an attacker.
   */
  defenderStrikesBack: boolean;
  /** Whether the tide steps forward every single turn or once per full round. */
  tideAdvancesEvery: 'turn' | 'round';
  /**
   * Energy the phase itself pays the active player. The flood is the boom and
   * the drained flat pays nothing, so the tide drives the economy directly
   * rather than merely decorating it.
   */
  tideEnergy: Record<TidePhase, number>;
  startingPhase: TidePhase;

  /* ---- Conservation ---- */

  /**
   * Complete tide cycles a species must survive on the board before it may be
   * released. Releasing is meant to be the reward for keeping something alive,
   * not a way to undo a misplay on the spot.
   */
  releaseMaturityCycles: number;
  /** Releases allowed per turn. One keeps the pile a slow, deliberate build. */
  releasesPerTurn: number;
  /**
   * Distinct *taxa* in the conservation pile needed for each +1 of standing
   * energy income. A protected reef feeds you — and it only counts as protected
   * if you have protected more than one branch of it.
   */
  conservationIncomePer: number;
  /**
   * The player who moves first does not draw on their first turn.
   *
   * Moving first is worth roughly 62% of games, so it has to be paid for
   * somehow. This is the cheapest correction available: one rule, no extra
   * state, and it takes from the advantaged side rather than handing the other
   * side something.
   */
  firstPlayerSkipsDraw: boolean;
  /** Extra cards dealt to whoever moves second, as compensation. */
  secondPlayerBonusCards: number;
  /** Extra energy for whoever moves second, paid on their first turn only. */
  secondPlayerBonusEnergy: number;
  /**
   * Distinct taxa conserved to win outright. The second win condition: play
   * for damage, or play for the reef. Zero disables it.
   */
  conservationVictory: number;
}

/** Deterministic RNG state, so any game can be replayed from its seed. */
export interface RngState {
  seed: number;
}

export interface GameState {
  /** Who took the first turn. Needed to price the second player's compensation. */
  startingPlayer: PlayerId;
  /** Increments once per player turn. */
  turn: number;
  /** Increments once both players have taken a turn. */
  round: number;
  phase: TidePhase;
  /**
   * Total phase advances since the game opened. `tideStep / 4` is the number of
   * complete tide cycles, which is what drives the energy ramp and release
   * maturity — both of which are questions about the tide rather than the clock.
   */
  tideStep: number;
  activePlayer: PlayerId;
  players: [PlayerState, PlayerState];
  /** `undefined` while the game is live, a PlayerId on a win, `null` on a draw. */
  winner: PlayerId | null | undefined;
  rng: RngState;
  config: GameConfig;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export interface PlayCardAction {
  type: 'PLAY_CARD';
  player: PlayerId;
  instanceId: string;
  /**
   * The enemy creature this card's arrival effect hits, for the arrivals that
   * need one. Required when the card has a targeted arrival and there is at
   * least one legal target; ignored otherwise.
   */
  targetId?: string;
}

export interface AttackAction {
  type: 'ATTACK';
  player: PlayerId;
  attackerId: string;
  /** A defending card's instanceId, or 'face' to hit the opposing player. */
  targetId: string | 'face';
}

export interface EndTurnAction {
  type: 'END_TURN';
  player: PlayerId;
}

/** Return a matured species from your board to the wild, into the conservation pile. */
export interface ReleaseAction {
  type: 'RELEASE';
  player: PlayerId;
  instanceId: string;
}

export type GameAction = PlayCardAction | AttackAction | EndTurnAction | ReleaseAction;

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Everything the resolver did, in order. The client animates from these; the
 * tests assert against them. They are the engine's only narration channel.
 */
export type GameEvent =
  | { type: 'TURN_STARTED'; player: PlayerId; turn: number; round: number; phase: TidePhase }
  | { type: 'TURN_ENDED'; player: PlayerId; turn: number }
  | { type: 'TIDE_CHANGED'; from: TidePhase; to: TidePhase }
  | {
      type: 'ENERGY_GAINED';
      player: PlayerId;
      amount: number;
      source: EnergySource;
    }
  | { type: 'CARD_DRAWN'; player: PlayerId; instanceId: string }
  | { type: 'DECK_EMPTY'; player: PlayerId; fatigueDamage: number }
  | { type: 'HAND_OVERFLOW'; player: PlayerId; instanceId: string }
  | { type: 'CARD_PLAYED'; player: PlayerId; instanceId: string; definitionId: string; cost: number }
  | {
      type: 'ARRIVAL_RESOLVED';
      instanceId: string;
      definitionId: string;
      kind: ArrivalEffect['kind'];
      amount: number;
      /** The creature it hit, for a targeted arrival. */
      targetId?: string;
    }
  | { type: 'CARD_HEALED'; instanceId: string; amount: number }
  /** The opening player forgoing their first draw, as the cost of going first. */
  | { type: 'TURN_SKIPPED_DRAW'; player: PlayerId }
  | {
      type: 'ATTACK_DECLARED';
      attackerId: string;
      targetId: string | 'face';
      phase: TidePhase;
    }
  | {
      type: 'DAMAGE_DEALT';
      sourceId: string;
      targetId: string | 'face';
      amount: number;
      /** How much of `amount` came from the target being exposed this phase. */
      exposedBonus: number;
      /** Why this damage happened, so a client can narrate and animate it. */
      cause: 'attack' | 'retaliation' | 'arrival';
      /** Damage the target's armour absorbed before this landed. */
      absorbed: number;
    }
  | { type: 'PLAYER_DAMAGED'; player: PlayerId; amount: number; life: number }
  | {
      type: 'SPECIES_POISONED';
      /** The toxic card that was eaten. */
      sourceId: string;
      /** The eater, which is now dead whatever its health says. */
      victimId: string;
    }
  | {
      type: 'CARD_DESTROYED';
      instanceId: string;
      definitionId: string;
      owner: PlayerId;
      /** Whether it ran out of health or ate something it should not have. */
      cause: 'damage' | 'toxin';
    }
  | {
      type: 'SPECIES_RELEASED';
      player: PlayerId;
      instanceId: string;
      definitionId: string;
      /** Distinct taxa in the pile after this release. */
      conserved: number;
    }
  | {
      type: 'GAME_OVER';
      winner: PlayerId | null;
      /** Which win condition ended it: damage, or a completed conservation pile. */
      reason: 'life' | 'conservation';
    };

/* -------------------------------------------------------------------------- */
/* Resolver results                                                            */
/* -------------------------------------------------------------------------- */

export type ActionErrorCode =
  | 'GAME_OVER'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'ARRIVAL_NEEDS_TARGET'
  | 'ARRIVAL_TARGET_INVALID'
  | 'NOT_ENOUGH_ENERGY'
  | 'BOARD_FULL'
  | 'ATTACKER_NOT_FOUND'
  | 'ATTACKER_NOT_READY'
  | 'ATTACKER_ALREADY_ATTACKED'
  | 'ATTACKER_CANNOT_ATTACK'
  | 'TARGET_NOT_FOUND'
  | 'MUST_ATTACK_REEF_GUARD'
  | 'CARD_NOT_ON_BOARD'
  | 'NOT_MATURE'
  | 'RELEASE_LIMIT_REACHED';

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: ActionErrorCode; message: string };
