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
  /** Damage this card deals back to anything that attacks it. */
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
): StatBonus {
  const traits = def.traits;
  if (!traits || traits.length === 0) return {};

  let attack = 0;
  let health = 0;
  for (const ally of allies) {
    if (ally.instanceId === instance.instanceId) continue;
    const auras = getCard(ally.definitionId).auras;
    if (!auras) continue;
    for (const aura of auras) {
      if (!traits.includes(aura.affects)) continue;
      attack += aura.grants.attack ?? 0;
      health += aura.grants.health ?? 0;
    }
  }
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
): EffectiveStats {
  const effect = tideEffectFor(def, phase);
  const symbiosis = symbiosisFor(instance, def, allies);

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
  );
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
 * their turn. Per-turn advancement makes the tide race; per-round keeps both
 * players inside the same phase, which is the default.
 */
export function shouldAdvanceTide(state: GameState): boolean {
  if (state.config.tideAdvancesEvery === 'turn') return true;
  // Player 1 ends the round, so the tide steps as the turn passes back to 0.
  return state.activePlayer === 1;
}
