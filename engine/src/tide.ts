/**
 * The tide-phase state machine and the stat maths that hangs off it.
 *
 * The tide is a single shared board value — both players read the same phase —
 * and it is the only clock in the game that neither player controls.
 */

import type {
  CardDefinition,
  CardInstance,
  GameState,
  PlayerId,
  StatBonus,
  TideEffect,
  TidePhase,
} from './types.js';
import { getCard } from './cards.js';

/** Canonical cycle order. Low water fills to high, then drains back. */
export const TIDE_CYCLE: readonly TidePhase[] = ['low', 'rising', 'high', 'falling'] as const;

/** The phase that follows `phase`, wrapping falling → low. */
export function nextPhase(phase: TidePhase): TidePhase {
  const i = TIDE_CYCLE.indexOf(phase);
  return TIDE_CYCLE[(i + 1) % TIDE_CYCLE.length]!;
}

/** The phase `steps` advances from `phase`. Negative steps run the tide backwards. */
export function advancePhase(phase: TidePhase, steps: number): TidePhase {
  const len = TIDE_CYCLE.length;
  const i = TIDE_CYCLE.indexOf(phase);
  return TIDE_CYCLE[(((i + steps) % len) + len) % len]!;
}

/** The tide effect a definition carries in `phase`, or an empty (neutral) one. */
export function tideEffectFor(def: CardDefinition, phase: TidePhase): TideEffect {
  return def.tide[phase] ?? {};
}

/** A card's live stats: printed values plus phase deltas plus symbiosis. */
export interface EffectiveStats {
  attack: number;
  /** Printed health plus modifiers — the card's ceiling right now. */
  maxHealth: number;
  /** Remaining health after marked damage. */
  health: number;
  /** True when the phase leaves this card open to bonus damage. */
  exposed: boolean;
  /** Energy this card generates for its controller each of their turns. */
  energy: number;
  /** Damage this card shrugs off from every source. */
  armour: number;
  /** Damage it deals back on top of its attack when something attacks it. */
  spines: number;
  /** Stat swing owed to the tide alone, for a client that wants to show it. */
  tideBonus: StatBonus;
  /** Stat swing owed to friendly auras alone. */
  symbiosisBonus: StatBonus;
}

/**
 * Total the auras that friendly cards point at `instance`.
 *
 * A card never buffs itself, so an anemone that grants to `anemone` would do
 * nothing for its own body. Auras are read off definitions only, never off
 * computed stats, so this can never recurse.
 */
export function symbiosisFor(
  instance: CardInstance,
  def: CardDefinition,
  allies: readonly CardInstance[],
  /** The other side's board, for the auras that reach across it. */
  enemies: readonly CardInstance[] = [],
): StatBonus {
  let attack = 0;
  let health = 0;

  const apply = (source: readonly CardInstance[], crossingOnly: boolean) => {
    for (const other of source) {
      if (other.instanceId === instance.instanceId) continue;
      const auras = getCard(other.definitionId).auras;
      if (!auras) continue;
      for (const aura of auras) {
        if (crossingOnly && !aura.crossesWaterline) continue;
        // One niche per card, so this is an equality rather than a lookup.
        if (aura.affects !== def.niche) continue;
        attack += aura.grants.attack ?? 0;
        health += aura.grants.health ?? 0;
      }
    }
  };

  apply(allies, false);
  // Only auras marked as crossing reach here, which is one card in the set.
  apply(enemies, true);

  return { attack, health };
}

/**
 * Resolve a card instance's live stats.
 *
 * `allies` is the controller's board, needed because symbiosis makes a card's
 * stats depend on its neighbours. Pass it whenever the card is on a board; a
 * card in hand has no neighbours yet, so the default of none is correct there.
 *
 * Attack and health floor at zero: a penalty can neutralise a card but never
 * flips it into negative stats. Health lost to a falling ceiling — a manta
 * caught by a drained flat, or an anemonefish whose anemone just died — is
 * real: if damage already meets the new maximum, the card is dead and the
 * resolver sweeps it.
 */
export function effectiveStats(
  instance: CardInstance,
  phase: TidePhase,
  def: CardDefinition = getCard(instance.definitionId),
  allies: readonly CardInstance[] = [],
  enemies: readonly CardInstance[] = [],
): EffectiveStats {
  const effect = tideEffectFor(def, phase);
  const symbiosis = symbiosisFor(instance, def, allies, enemies);

  const tideAttack = effect.attack ?? 0;
  const tideHealth = effect.health ?? 0;
  const symAttack = symbiosis.attack ?? 0;
  const symHealth = symbiosis.health ?? 0;

  const attack = Math.max(0, def.attack + tideAttack + symAttack);
  const maxHealth = Math.max(0, def.health + tideHealth + symHealth);

  return {
    attack,
    maxHealth,
    health: maxHealth - instance.damage,
    exposed: effect.exposed ?? false,
    energy: effect.energy ?? 0,
    armour: def.armour ?? 0,
    spines: def.spines ?? 0,
    tideBonus: { attack: tideAttack, health: tideHealth },
    symbiosisBonus: { attack: symAttack, health: symHealth },
  };
}

/** Live stats for a card sitting on a board, with its neighbours accounted for. */
export function statsFor(state: GameState, instance: CardInstance): EffectiveStats {
  return effectiveStats(
    instance,
    state.phase,
    getCard(instance.definitionId),
    state.players[instance.owner].board,
    state.players[instance.owner === 0 ? 1 : 0].board,
  );
}

/**
 * Whether the coming tide would leave this card at zero health on its own.
 *
 * "On its own" is the whole point: no attack, no release, nothing else played —
 * just the phase turning and this card's own tide line taking its ceiling below
 * the damage already marked on it. A manta stranded by a draining flat is at
 * risk for reasons entirely visible a phase in advance, and a player who
 * cannot see it coming experiences it as the game taking a card off them
 * with no warning.
 *
 * It does not fire it going to zero at the *next* phase — that phase has not
 * happened yet, so nothing is marked until it actually turns and the sweep
 * runs. A card already at zero (already `dying`, or about to be swept for a
 * fresh reason this same action) is past the point of a warning, so this
 * returns false for it rather than restating what is already visible.
 *
 * Measured against the board as it stands, because that is the honest question:
 * what happens if nothing else changes.
 */
export function diesAtNextPhase(state: GameState, instance: CardInstance): boolean {
  const def = getCard(instance.definitionId);
  const board = state.players[instance.owner].board;
  const across = state.players[instance.owner === 0 ? 1 : 0].board;
  if (effectiveStats(instance, state.phase, def, board, across).health <= 0) return false;
  return effectiveStats(instance, nextPhase(state.phase), def, board, across).health <= 0;
}

/** Whether a card is currently at or below zero health and should be swept. */
export function isDead(
  instance: CardInstance,
  phase: TidePhase,
  allies: readonly CardInstance[] = [],
): boolean {
  return effectiveStats(instance, phase, getCard(instance.definitionId), allies).health <= 0;
}

/**
 * Whether the tide should step forward now that `state.activePlayer` has ended
 * their turn.
 *
 * Per-turn advancement makes the tide race; per-round keeps both players inside
 * the same phase, which is the default. A round ends when the player who did
 * *not* open the game finishes their turn — which is the bug this replaced: it
 * used to test for player 1 specifically, on the assumption that player 0 always
 * moved first. Once the first turn became a coin flip, an AI opening meant the
 * tide turned after its very first turn and the player started their own first
 * turn on the rising tide, a phase into a game they had not played yet.
 */
export function shouldAdvanceTide(state: GameState): boolean {
  if (state.config.tideAdvancesEvery === 'turn') return true;
  return state.activePlayer !== state.startingPlayer;
}

/** Complete tide cycles elapsed since the game opened. */
export function cyclesCompleted(tideStep: number): number {
  return Math.floor(tideStep / TIDE_CYCLE.length);
}

/**
 * How many times the tide will step forward before `playerId` next takes a turn.
 *
 * This is the piece that makes an income *projection* honest. A player planning
 * their next turn is planning for a different phase than the one they are
 * looking at, and how different depends on the tide pace: on `round` the tide
 * steps only as player 1 hands the turn back, so both players open their next
 * turn one phase along; on `turn` it steps at every hand-off, so your own next
 * turn is two phases away while your opponent's is one.
 *
 * Counted by walking the turn order rather than by a table of special cases, so
 * it stays correct if the pace rule ever grows a third option.
 */
export function tideStepsUntilTurnOf(state: GameState, playerId: PlayerId): number {
  // Whoever is active must end their turn; if that is the player asking, the
  // opponent takes a turn and ends it too before the asker comes back around.
  const enders: PlayerId[] =
    state.activePlayer === playerId
      ? [playerId, playerId === 0 ? 1 : 0]
      : [state.activePlayer];

  if (state.config.tideAdvancesEvery === 'turn') return enders.length;
  // On `round` the tide steps as the player who did not open the game passes
  // the turn back — see `shouldAdvanceTide`, which this must agree with.
  return enders.filter((p) => p !== state.startingPlayer).length;
}

/** The phase `playerId` will open their next turn in. */
export function phaseAtTurnOf(state: GameState, playerId: PlayerId): TidePhase {
  return advancePhase(state.phase, tideStepsUntilTurnOf(state, playerId));
}
