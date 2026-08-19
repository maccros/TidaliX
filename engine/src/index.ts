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
  EnergyIncome,
  EnergyIncomeLine,
  Keyword,
  PlayCardAction,
  PlayerId,
  PlayerState,
  ReleaseAction,
  RngState,
  Taxon,
  TideEffect,
  TidePhase,
} from './types.js';

export { TAXON_LABEL } from './types.js';

export {
  CARDS,
  activeSymbioses,
  allTaxa,
  cardsFavouring,
  getCard,
  hasCard,
  isToxic,
  isToxinImmune,
  taxonOf,
  traitsOf,
} from './cards.js';

export {
  TIDE_CYCLE,
  advancePhase,
  cyclesCompleted,
  effectiveStats,
  isDead,
  nextPhase,
  phaseAtTurnOf,
  shouldAdvanceTide,
  statsFor,
  symbiosisFor,
  tideEffectFor,
  tideStepsUntilTurnOf,
} from './tide.js';
export type { EffectiveStats } from './tide.js';

export {
  canReleaseThisTurn,
  conservationIncome,
  conservedCount,
  conservedSpecies,
  conservedTaxa,
  cyclesOnBoard,
  energyCapFor,
  energyIncome,
  isMature,
  nextTurnIncome,
  speciesIncome,
  speciesIncomeSources,
  stepsUntilMature,
  taxaToNextIncome,
} from './economy.js';

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
