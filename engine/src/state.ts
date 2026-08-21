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
import { nextInt, shuffle } from './rng.js';
import { effectiveStats, cyclesCompleted, diesAtNextPhase, statsFor } from './tide.js';
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
  // One taxon, one energy. The pile is scored on taxon rather than species
  // now, which already makes each point of this income much harder to earn — a
  // second reef fish adds nothing where a second *species* used to add one — so
  // there is no room to make the rate stingier on top of that. Every point is
  // felt the turn it lands, and every point demands a genuinely different animal.
  conservationIncomePer: 1,
  // Three taxa out of the seven the set contains.
  //
  // This number has moved three times, and the history is the point: it is a
  // property of what the deck can deal, not a design preference, so it has to be
  // re-measured every time the set changes. It has been wrong three times for
  // exactly that reason.
  //
  //   28 species, 7 taxa (fish were half the set)   3 -> 0%
  //   43 species                                    3 -> 46%   4 -> 15%
  //   50 species, evenly spread                     3 -> 29%   4 -> 8%
  //
  // Evening out the taxa is what moved it back. Four different taxa is now a
  // long shot rather than a second path — 8% of games — and three lands at 29%,
  // which is a real alternative without being the main one.
  conservationVictory: 3,

  // Compensation for moving second, because moving first is worth about 63% of
  // games. Both players are dealt the same four cards; the difference is made
  // entirely on the first turn:
  //
  //   whoever opens      does not draw, and starts on the base capacity of 2
  //   whoever is second  draws as normal, and gets two extra energy
  //
  // Two, not one. Measured on this set, with every seed run from both seats:
  //
  //   nothing                          normal 66.3%   hard 65.0%
  //   skip draw, +1 energy             normal 61.3%   hard 59.3%
  //   +1 card, +1 energy               normal 60.3%   hard 54.3%
  //   skip draw, +2 energy   <- this   normal 52.7%   hard 50.3%
  //
  // The second energy is what closes the gap; the card barely moves it. Taking
  // the opener's draw away and handing the other side a card are near
  // equivalent, which is worth knowing before reaching for either again.
  //
  // Taking the draw away from the opener rather than handing the other side a
  // card keeps both opening hands the same size, which matters for how the game
  // reads: two players look across at four cards each.
  firstPlayerSkipsDraw: true,
  secondPlayerBonusCards: 0,
  secondPlayerBonusEnergy: 2,
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
/**
 * The starter deck: one copy of every species.
 *
 * One, not two. At two copies of 43 species the deck was 86 cards and a game
 * drew about twelve of them — 14% — so most of the set never appeared and
 * drawing the same animal twice was a wasted slot rather than a plan. A
 * singleton deck shows a quarter of itself per game and never repeats.
 */
export function starterDeckList(): string[] {
  return CARDS.map((c) => c.id);
}

export interface CreateGameOptions {
  seed?: number;
  config?: Partial<GameConfig>;
  /** Deck lists as arrays of card definition ids, one per player. */
  decks?: [string[], string[]];
  /** Skip shuffling — handy for deterministic tests that stack a deck. */
  shuffleDecks?: boolean;
  /**
   * Who takes the first turn. `'random'` derives the coin flip from the game's
   * seed, so a randomised game is still exactly reproducible from its seed.
   *
   * Defaults to player 0 so tests and tools stay deterministic without saying
   * so; the game itself passes `'random'`, because moving first is worth about
   * 63% of games and handing that to the same side every time is not a game.
   */
  startingPlayer?: PlayerId | 'random';
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

  let rng = { seed: options.seed ?? 1 };

  // Drawn before any shuffling, so the flip and the deal are both reproducible
  // and the flip does not depend on how many cards happen to be in the decks.
  let startingPlayer: PlayerId = 0;
  if (options.startingPlayer === 'random') {
    const flip = nextInt(rng, 2);
    startingPlayer = flip.value as PlayerId;
    rng = flip.rng;
  } else if (options.startingPlayer !== undefined) {
    startingPlayer = options.startingPlayer;
  }
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
    startingPlayer,
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

  // Opening hands, dealt without triggering draw events or fatigue. Whoever
  // moves second may be dealt extra, as compensation for moving second.
  for (const player of state.players) {
    const extra = player.id === startingPlayer ? 0 : config.secondPlayerBonusCards;
    for (let i = 0; i < config.startingHandSize + extra; i++) {
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
  /** The coming tide kills it on its own, with no other interaction. */
  dyingNextPhase: boolean;
  /** Damage it deals back on top of its attack. */
  spines: number;
  /** Eating this card kills the eater. */
  toxic: boolean;
  /** This card can eat a toxic one and survive it. */
  toxinImmune: boolean;
  /** Already marked by a toxin — dead on the next sweep, whatever its health. */
  poisoned: boolean;
  /** The taxon it would add to a conservation pile. */
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
  // The other side, for the one aura in the set that reaches across it.
  const across = state.players[player === 0 ? 1 : 0].board;
  return board.map((inst) => {
    const def = getCard(inst.definitionId);
    const stats = effectiveStats(inst, state.phase, def, board, across);
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
      dyingNextPhase: diesAtNextPhase(state, inst),
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
  if (statsFor(state, inst).attack <= 0) {
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
