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
import { effectiveStats } from './tide.js';

export const DEFAULT_CONFIG: GameConfig = {
  startingLife: 25,
  startingHandSize: 4,
  maxHandSize: 8,
  maxBoardSize: 6,
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
} {
  return {
    phase: state.phase,
    energyBonus: state.config.tideEnergy[state.phase],
    round: state.round,
    turn: state.turn,
  };
}

/** Convenience for tests and logs. */
export function describeEvent(event: GameEvent): string {
  return `${event.type} ${JSON.stringify(event)}`;
}
