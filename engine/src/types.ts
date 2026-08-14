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
  | 'reef-guard';

/**
 * Biological tags used to target symbiosis. A trait only earns its place here if
 * some card's aura actually reads it — otherwise it is decoration.
 */
export type Trait =
  | 'reef-fish'
  | 'megafauna'
  | 'coral'
  | 'anemone'
  | 'anemonefish'
  | 'cleaner'
  | 'crustacean'
  | 'echinoderm'
  | 'cephalopod'
  | 'mollusc';

export interface StatBonus {
  attack?: number;
  health?: number;
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
  affects: Trait;
  grants: StatBonus;
  /** Player-facing description of the relationship. */
  note: string;
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

/** A printed card. Immutable reference data — never mutated at runtime. */
export interface CardDefinition {
  id: string;
  name: string;
  /** Real binomial name. The whole set is built on actual marine species. */
  species: string;
  type: CardType;
  cost: number;
  attack: number;
  health: number;
  /** Phase-by-phase behaviour. Omitted phases are neutral for this card. */
  tide: Partial<Record<TidePhase, TideEffect>>;
  keywords?: Keyword[];
  /** Biological tags other cards' auras can read. */
  traits?: Trait[];
  /**
   * Damage dealt to anything that attacks this card. Replaces the old automatic
   * counter-attack: only animals that are actually armed hit back.
   */
  spines?: number;
  /** Standing effects on friendly neighbours. */
  auras?: Aura[];
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
  /** Whether it has already attacked during the current turn. */
  hasAttacked: boolean;
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
  /** Damage taken on the next draw from an empty deck. */
  fatigue: number;
}

export interface GameConfig {
  startingLife: number;
  startingHandSize: number;
  maxHandSize: number;
  maxBoardSize: number;
  /** Ceiling on the per-round income ramp. */
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
}

/** Deterministic RNG state, so any game can be replayed from its seed. */
export interface RngState {
  seed: number;
}

export interface GameState {
  /** Increments once per player turn. */
  turn: number;
  /** Increments once both players have taken a turn. */
  round: number;
  phase: TidePhase;
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

export type GameAction = PlayCardAction | AttackAction | EndTurnAction;

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
      source: 'turn' | 'tide' | 'card' | 'carried';
    }
  | { type: 'CARD_DRAWN'; player: PlayerId; instanceId: string }
  | { type: 'DECK_EMPTY'; player: PlayerId; fatigueDamage: number }
  | { type: 'HAND_OVERFLOW'; player: PlayerId; instanceId: string }
  | { type: 'CARD_PLAYED'; player: PlayerId; instanceId: string; definitionId: string; cost: number }
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
      cause: 'attack' | 'spines' | 'retaliation';
    }
  | { type: 'PLAYER_DAMAGED'; player: PlayerId; amount: number; life: number }
  | { type: 'CARD_DESTROYED'; instanceId: string; definitionId: string; owner: PlayerId }
  | { type: 'GAME_OVER'; winner: PlayerId | null };

/* -------------------------------------------------------------------------- */
/* Resolver results                                                            */
/* -------------------------------------------------------------------------- */

export type ActionErrorCode =
  | 'GAME_OVER'
  | 'NOT_YOUR_TURN'
  | 'CARD_NOT_IN_HAND'
  | 'NOT_ENOUGH_ENERGY'
  | 'BOARD_FULL'
  | 'ATTACKER_NOT_FOUND'
  | 'ATTACKER_NOT_READY'
  | 'ATTACKER_ALREADY_ATTACKED'
  | 'ATTACKER_CANNOT_ATTACK'
  | 'TARGET_NOT_FOUND'
  | 'MUST_ATTACK_REEF_GUARD';

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: ActionErrorCode; message: string };
