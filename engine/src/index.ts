/**
 * @tidalix/engine — pure, UI-agnostic game logic for TidaliX.
 *
 * Typical use:
 *
 *   const setup = createGame({ seed: 42 });
 *   let { state } = startGame(setup);
 *   const result = applyAction(state, { type: 'END_TURN', player: 0 });
 *   if (result.ok) state = result.state;
 */

export type {
  ActionErrorCode,
  Aura,
  StatBonus,
  Trait,
  ActionResult,
  AttackAction,
  CardDefinition,
  CardInstance,
  CardType,
  EndTurnAction,
  EnergySource,
  GameAction,
  GameConfig,
  GameEvent,
  GameState,
  Keyword,
  PlayCardAction,
  PlayerId,
  PlayerState,
  ReleaseAction,
  RngState,
  TideEffect,
  TidePhase,
} from './types.js';

export { CARDS, getCard, hasCard, cardsFavouring, traitsOf, activeSymbioses } from './cards.js';

export {
  TIDE_CYCLE,
  advancePhase,
  cyclesCompleted,
  effectiveStats,
  isDead,
  nextPhase,
  shouldAdvanceTide,
  statsFor,
  symbiosisFor,
  tideEffectFor,
} from './tide.js';
export type { EffectiveStats } from './tide.js';

export {
  canReleaseThisTurn,
  conservationIncome,
  conservedSpecies,
  cyclesOnBoard,
  energyCapFor,
  energyIncome,
  isMature,
  speciesIncome,
  speciesIncomeSources,
  stepsUntilMature,
} from './economy.js';
export type { EnergyIncome, EnergyIncomeLine } from './economy.js';

export { nextRandom, nextInt, shuffle } from './rng.js';

export {
  DEFAULT_CONFIG,
  boardView,
  canAttack,
  cloneState,
  createGame,
  createInstance,
  describeEvent,
  opponentOf,
  resetInstanceIds,
  starterDeckList,
  tideView,
} from './state.js';
export type { BoardCardView, CreateGameOptions } from './state.js';

export { applyAction, legalActions, startGame } from './resolver.js';

export { chooseAction, takeTurn } from './bot.js';
