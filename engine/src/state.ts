/**
 * Game construction: config defaults, deck building, and the opening setup.
 */

import type {
  CardInstance,
  GameConfig,
  GameEvent,
  GameState,
  PlayerId,
  PlayerState,
  TidePhase,
} from './types.js';
import { CARDS, getCard } from './cards.js';
import { shuffle } from './rng.js';
import { effectiveStats, cyclesCompleted } from './tide.js';
import { isMature, stepsUntilMature } from './economy.js';
import type { Taxon } from './types.js';

export const DEFAULT_CONFIG: GameConfig = {
  startingLife: 25,
  startingHandSize: 4,
  maxHandSize: 8,
  maxBoardSize: 6,
  // Capacity is the scarce resource now: you open on 2 and it steps up only when
  // a whole tide cycle has turned. Everything else — the tide, your species, your
  // conservation pile — is income you have to actually build.
  startingEnergyCap: 2,
  maxEnergyCap: 10,
  // Unspent plankton keeps, up to a point. This is what makes holding back
  // through a lean phase a real decision instead of a wasted turn.
  carryOverCap: 3,
  exposedBonusDamage: 1,
  // Every defender hits back.
  //
  // This was off, and that single flag was most of why a board lead could never
  // be overturned: killing a card cost the attacker nothing, so whoever was
  // ahead cleared whatever the opponent played and still had attackers spare
  // for the face. With it on, attacking is a trade and a wide board has to
  // choose what it spends itself on. The armed animals kept their identity by
  // becoming hard to kill instead — see `armour`.
  defenderStrikesBack: true,
  tideAdvancesEvery: 'round',
  // The economy runs on the tide, not on a flat ramp: the drained flat carries
  // no plankton at all, the flood is the boom, and high water stays rich.
  tideEnergy: { low: 0, rising: 2, high: 1, falling: 0 },
  startingPhase: 'low',
  // A species must live through one whole cycle before it can be released, and
  // only one goes back per turn: the pile is a slow, deliberate build, which is
  // what makes the second win condition a real commitment rather than a pivot.
  releaseMaturityCycles: 1,
  releasesPerTurn: 1,
  // One lineage, one energy. The pile is scored on lineage rather than species
  // now, which already makes each point of this income much harder to earn — a
  // second reef fish adds nothing where a second *species* used to add one — so
  // there is no room to make the rate stingier on top of that. Every point is
  // felt the turn it lands, and every point demands a genuinely different animal.
  conservationIncomePer: 1,
  // Five lineages out of the eight the set contains.
  //
  // Re-measured after the move from species to lineages, and the honest finding
  // is that the metric is not what makes this hard. A player committed to the
  // pile never releases two animals of the same lineage anyway, so across 100
  // games their pile scores identically either way — 1.51 cards, 1.51 species,
  // 1.51 lineages. What limits the pile is *time*: a species needs a full cycle
  // (4 tide steps) to mature and only one goes back per turn, against a game
  // that ends around round 7.7. There is physically room for about three
  // releases, and the peak observed is three.
  //
  // So five is currently out of reach, and was before this change too. It scales
  // with game length and nothing else — at 40 starting life the peak is four, at
  // 60 it is five and the pile wins 2% of games; raising how much the bot wants
  // the pile from weight 40 to 200 moves the number not at all, because it is
  // already taking every release the clock allows. Closing that gap is a
  // game-length decision (starting life, maturity cycles, or releases per turn),
  // not a tweak to this number, so it is left as it stands and flagged here.
  conservationVictory: 5,
};

let instanceCounter = 0;

/** Reset instance-id numbering. Tests call this to keep ids stable per case. */
export function resetInstanceIds(): void {
  instanceCounter = 0;
}

export function createInstance(definitionId: string, owner: PlayerId): CardInstance {
  getCard(definitionId); // fail fast on a typo'd deck list
  instanceCounter += 1;
  return {
    instanceId: `c${instanceCounter}`,
    definitionId,
    owner,
    damage: 0,
    playedOnTurn: null,
    playedOnTideStep: null,
    hasAttacked: false,
    poisoned: false,
  };
}

/**
 * A legal-ish default deck: two copies of every card in the set. Real decks come
 * from the client later; this exists so the engine is playable on its own.
 */
export function starterDeckList(): string[] {
  return CARDS.flatMap((c) => [c.id, c.id]);
}

export interface CreateGameOptions {
  seed?: number;
  config?: Partial<GameConfig>;
  /** Deck lists as arrays of card definition ids, one per player. */
  decks?: [string[], string[]];
  /** Skip shuffling — handy for deterministic tests that stack a deck. */
  shuffleDecks?: boolean;
  startingPlayer?: PlayerId;
}

function createPlayer(id: PlayerId, deck: CardInstance[], config: GameConfig): PlayerState {
  return {
    id,
    life: config.startingLife,
    energy: 0,
    energyCap: 0,
    deck,
    hand: [],
    board: [],
    discard: [],
    conservation: [],
    releasesThisTurn: 0,
    fatigue: 0,
    incomeThisTurn: [],
  };
}

/**
 * Build a game that is set up but has not started: opening hands are dealt, no
 * turn has begun. Call `startGame` (or `beginTurn` via the resolver) to open.
 */
export function createGame(options: CreateGameOptions = {}): GameState {
  const config: GameConfig = { ...DEFAULT_CONFIG, ...options.config };
  const decks = options.decks ?? [starterDeckList(), starterDeckList()];
  const startingPlayer = options.startingPlayer ?? 0;

  let rng = { seed: options.seed ?? 1 };
  const players: PlayerState[] = [];

  for (const id of [0, 1] as const) {
    let instances = decks[id].map((defId) => createInstance(defId, id));
    if (options.shuffleDecks !== false) {
      const result = shuffle(instances, rng);
      instances = result.items;
      rng = result.rng;
    }
    players.push(createPlayer(id, instances, config));
  }

  const state: GameState = {
    turn: 0,
    round: 0,
    phase: config.startingPhase,
    tideStep: 0,
    activePlayer: startingPlayer,
    players: [players[0]!, players[1]!],
    winner: undefined,
    rng,
    config,
  };

  // Opening hands, dealt without triggering draw events or fatigue.
  for (const player of state.players) {
    for (let i = 0; i < config.startingHandSize; i++) {
      const card = player.deck.shift();
      if (card) player.hand.push(card);
    }
  }

  return state;
}

/** Deep copy of a state. The resolver never mutates the state it is handed. */
export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function opponentOf(player: PlayerId): PlayerId {
  return player === 0 ? 1 : 0;
}

/* -------------------------------------------------------------------------- */
/* Read-only views for the client and the AI                                   */
/* -------------------------------------------------------------------------- */

export interface BoardCardView {
  instanceId: string;
  definitionId: string;
  name: string;
  owner: PlayerId;
  attack: number;
  health: number;
  maxHealth: number;
  printedAttack: number;
  printedHealth: number;
  exposed: boolean;
  reefGuard: boolean;
  /** Damage it shrugs off from every source. */
  armour: number;
  /** Damage it deals back on top of its attack. */
  spines: number;
  /** Eating this card kills the eater. */
  toxic: boolean;
  /** This card can eat a toxic one and survive it. */
  toxinImmune: boolean;
  /** Already marked by a toxin — dead on the next sweep, whatever its health. */
  poisoned: boolean;
  /** The lineage it would add to a conservation pile. */
  taxon: Taxon;
  canAttack: boolean;
  /** Whether this species has lived long enough to be released. */
  mature: boolean;
  /** Tide steps still to go before it is, or 0 when it already is. */
  stepsUntilMature: number;
}

/**
 * The board as the UI should draw it: printed stats alongside the values the
 * current phase actually produces, so a card can show its own tide swing.
 */
export function boardView(state: GameState, player: PlayerId): BoardCardView[] {
  const board = state.players[player].board;
  return board.map((inst) => {
    const def = getCard(inst.definitionId);
    const stats = effectiveStats(inst, state.phase, def, board);
    return {
      instanceId: inst.instanceId,
      definitionId: inst.definitionId,
      name: def.name,
      owner: inst.owner,
      attack: stats.attack,
      health: stats.health,
      maxHealth: stats.maxHealth,
      printedAttack: def.attack,
      printedHealth: def.health,
      exposed: stats.exposed,
      reefGuard: def.keywords?.includes('reef-guard') ?? false,
      armour: stats.armour,
      spines: stats.spines,
      toxic: def.keywords?.includes('toxic') ?? false,
      toxinImmune: def.keywords?.includes('toxin-immune') ?? false,
      poisoned: inst.poisoned,
      taxon: def.taxon,
      canAttack: canAttack(state, inst),
      mature: isMature(state, inst),
      stepsUntilMature: stepsUntilMature(state, inst),
    };
  });
}

/** Whether `inst` may legally declare an attack right now. */
export function canAttack(state: GameState, inst: CardInstance): boolean {
  if (state.winner !== undefined) return false;
  if (inst.owner !== state.activePlayer) return false;
  if (inst.hasAttacked) return false;
  const def = getCard(inst.definitionId);
  if (effectiveStats(inst, state.phase, def, state.players[inst.owner].board).attack <= 0) {
    return false;
  }
  const summoningSick = inst.playedOnTurn === state.turn && !def.keywords?.includes('surge');
  return !summoningSick;
}

/** Phase context the UI needs for the tide track. */
export function tideView(state: GameState): {
  phase: TidePhase;
  energyBonus: number;
  round: number;
  turn: number;
  /** Phase advances so far. */
  step: number;
  /** Complete cycles so far — the thing the energy ramp actually counts. */
  cycles: number;
  /** Phase advances remaining until the next cycle closes. */
  stepsToNextCycle: number;
} {
  const cycles = cyclesCompleted(state.tideStep);
  return {
    phase: state.phase,
    energyBonus: state.config.tideEnergy[state.phase],
    round: state.round,
    turn: state.turn,
    step: state.tideStep,
    cycles,
    stepsToNextCycle: 4 - (state.tideStep % 4),
  };
}

/** Convenience for tests and logs. */
export function describeEvent(event: GameEvent): string {
  return `${event.type} ${JSON.stringify(event)}`;
}
