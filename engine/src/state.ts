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
  // Only armed animals hit back — see `spines` on the card definitions.
  defenderStrikesBack: false,
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
  // One, not two. At two the bonus was very nearly decorative: it paid a
  // committed player 3.6 energy across a whole game — 9% of their income — and
  // did not arrive until round 7.7, in games ending around round 9. At one it
  // pays 8.5 (20% of income), lands a round earlier, and every single release
  // is felt immediately. It does not distort who wins: measured over 80 games
  // the conservation win rate actually moves slightly *down*, from 42 to 37.
  conservationIncomePer: 1,
  // Five, measured against a player who is actually building for it: they get
  // there in roughly half their games, and it never fires by accident — a bot
  // that merely values the pile alongside everything else finishes it 0% of the
  // time. The curve is steep, so this number is worth re-measuring after any
  // change to game length: at six a committed player wins 30% of the time, at
  // four 75%, at three over 90% — which stops being a second path and starts
  // being the only one.
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
