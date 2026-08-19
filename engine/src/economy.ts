/**
 * The energy economy and the conservation pile.
 *
 * Everything here is a *derivation* over state, never a mutation of it. The
 * resolver pays income by asking these functions what is owed, and the client
 * shows the player their income by asking the same functions — so the number on
 * screen and the number in the bank cannot drift apart. This is the same
 * discipline the tide follows: compute from the live state, do not bank a
 * snapshot and hope it stays true.
 *
 * The shape of the economy:
 *
 *   base cap    steps up once per *complete tide cycle*, not once per round, so
 *               capacity is genuinely scarce and a reef has to be built rather
 *               than bought outright
 *   carried     what survived last turn, capped
 *   tide        paid by the phase — the flood is the boom, the flat pays nothing
 *   species     what is standing on your board right now
 *   conservation what you have given back, scored by biodiversity
 */

import type {
  CardInstance,
  EnergyIncome,
  EnergyIncomeLine,
  GameState,
  PlayerId,
  PlayerState,
  Taxon,
  TidePhase,
} from './types.js';
import { getCard } from './cards.js';
import { cyclesCompleted, effectiveStats, phaseAtTurnOf, tideStepsUntilTurnOf } from './tide.js';

export type { EnergyIncome, EnergyIncomeLine } from './types.js';

/**
 * Distinct species in a player's conservation pile.
 *
 * Counted on the binomial name rather than the card id, so two printings of the
 * same animal could never be double-counted. This is a *display* figure — how
 * many different animals are in the pile. What the pile is actually scored on is
 * `conservedTaxa`.
 */
export function conservedSpecies(player: PlayerState): number {
  const seen = new Set<string>();
  for (const inst of player.conservation) seen.add(getCard(inst.definitionId).species);
  return seen.size;
}

/**
 * The distinct lineages in a player's conservation pile, in the order they were
 * first protected.
 *
 * This is the number that pays and the number that wins. Scoring on lineage
 * rather than on species is what makes the pile a genuine biodiversity problem:
 * six different reef fish are still just fish, and a reef with only fish in it
 * is not a reef anyone saved. Getting paid means going out and protecting a
 * crab, a coral, an urchin, an octopus — animals that want entirely different
 * things from the tide, which is exactly the tension the pile is there to create.
 */
export function conservedTaxa(player: PlayerState): Taxon[] {
  const seen: Taxon[] = [];
  for (const inst of player.conservation) {
    const taxon = getCard(inst.definitionId).taxon;
    if (!seen.includes(taxon)) seen.push(taxon);
  }
  return seen;
}

/** How many distinct lineages are protected — the score that pays and wins. */
export function conservedCount(player: PlayerState): number {
  return conservedTaxa(player).length;
}

/** Standing energy income owed to the conservation pile each turn. */
export function conservationIncome(state: GameState, playerId: PlayerId): number {
  const per = state.config.conservationIncomePer;
  if (per <= 0) return 0;
  return Math.floor(conservedCount(state.players[playerId]) / per);
}

/**
 * Lineages still missing from the pile before the next point of income lands.
 *
 * The pile is only motivating if the player can see what it is asking them for,
 * so this is surfaced rather than left as arithmetic they have to do themselves.
 */
export function taxaToNextIncome(state: GameState, playerId: PlayerId): number {
  const per = state.config.conservationIncomePer;
  if (per <= 0) return 0;
  return per - (conservedCount(state.players[playerId]) % per);
}

/**
 * The base energy cap right now. Steps up once per complete tide cycle rather
 * than once per round — this is the change that makes energy something you build
 * toward instead of something that simply arrives.
 */
export function energyCapFor(state: GameState, tideStep: number = state.tideStep): number {
  const { startingEnergyCap, maxEnergyCap } = state.config;
  return Math.min(startingEnergyCap + cyclesCompleted(tideStep), maxEnergyCap);
}

/**
 * Income for `playerId` as it would be paid in `phase`, at `tideStep`.
 *
 * The one function that knows what a turn's income *is*. The resolver pays out
 * of it, the panel shows it, and the projection for next turn is the same call
 * with a different phase — so a number on screen and a number in the bank cannot
 * drift apart, and neither can this turn's income and next turn's estimate.
 */
function incomeAt(
  state: GameState,
  playerId: PlayerId,
  phase: TidePhase,
  tideStep: number,
): EnergyIncome {
  const player = state.players[playerId];
  const lines: EnergyIncomeLine[] = [];

  const base = energyCapFor(state, tideStep);
  lines.push({
    source: 'turn',
    amount: base,
    detail:
      base >= state.config.maxEnergyCap ? 'base capacity, at maximum' : 'base capacity',
  });

  const carried = Math.min(player.energy, state.config.carryOverCap);
  if (carried > 0) {
    lines.push({
      source: 'carried',
      amount: carried,
      detail: `unspent energy kept (max ${state.config.carryOverCap})`,
    });
  }

  const tide = state.config.tideEnergy[phase];
  if (tide > 0) {
    lines.push({ source: 'tide', amount: tide, detail: `the ${phase} tide` });
  }

  const contributors = speciesIncomeSources(state, playerId, phase);
  const fromCards = contributors.reduce((sum, c) => sum + c.amount, 0);
  if (fromCards > 0) {
    lines.push({
      source: 'card',
      amount: fromCards,
      detail: contributors.map((c) => `${c.name} +${c.amount}`).join(', '),
    });
  }

  const conserved = conservationIncome(state, playerId);
  if (conserved > 0) {
    const taxa = conservedCount(player);
    lines.push({
      source: 'conservation',
      amount: conserved,
      detail: `${taxa} ${taxa === 1 ? 'lineage' : 'lineages'} protected`,
    });
  }

  return { lines, total: lines.reduce((sum, l) => sum + l.amount, 0), phase };
}

/**
 * What `playerId` collects if their turn begins right now, in the live phase.
 *
 * This is what the resolver pays at the top of a turn. It is *not* what to show
 * a player who is planning ahead — for that, see `nextTurnIncome`.
 */
export function energyIncome(state: GameState, playerId: PlayerId): EnergyIncome {
  return incomeAt(state, playerId, state.phase, state.tideStep);
}

/**
 * What `playerId` will collect at the start of their **next** turn, itemised.
 *
 * The phase is the one that will actually be live when that turn opens, not the
 * one on the board now — the tide will have moved by then, and it moves the two
 * largest lines with it: what the phase itself pays, and what the species
 * standing on the reef generate. Showing the current phase's figures here was a
 * plan for a turn that never happens.
 *
 * Two things it cannot know, and does not pretend to: the board may not survive
 * the opponent's turn, and `carried` moves every time the player spends. The
 * second is a feature — it is how a player watches banking work.
 */
export function nextTurnIncome(state: GameState, playerId: PlayerId): EnergyIncome {
  const steps = tideStepsUntilTurnOf(state, playerId);
  return incomeAt(state, playerId, phaseAtTurnOf(state, playerId), state.tideStep + steps);
}

/** Energy generated by species standing on `playerId`'s board in `phase`. */
export function speciesIncome(
  state: GameState,
  playerId: PlayerId,
  phase: TidePhase = state.phase,
): number {
  return speciesIncomeSources(state, playerId, phase).reduce((sum, c) => sum + c.amount, 0);
}

/** Which species are paying, so the UI can name them rather than show a bare total. */
export function speciesIncomeSources(
  state: GameState,
  playerId: PlayerId,
  phase: TidePhase = state.phase,
): { instanceId: string; name: string; amount: number }[] {
  const board = state.players[playerId].board;
  const out: { instanceId: string; name: string; amount: number }[] = [];
  for (const inst of board) {
    const def = getCard(inst.definitionId);
    const amount = effectiveStats(inst, phase, def, board).energy;
    if (amount > 0) out.push({ instanceId: inst.instanceId, name: def.name, amount });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Release maturity                                                            */
/* -------------------------------------------------------------------------- */

/** Complete tide cycles `inst` has survived on the board. */
export function cyclesOnBoard(state: GameState, inst: CardInstance): number {
  if (inst.playedOnTideStep === null) return 0;
  return cyclesCompleted(state.tideStep - inst.playedOnTideStep);
}

/**
 * Whether `inst` has lived long enough to be released. A species earns its place
 * in the pile by surviving; releasing is not an undo button for a bad play.
 */
export function isMature(state: GameState, inst: CardInstance): boolean {
  return cyclesOnBoard(state, inst) >= state.config.releaseMaturityCycles;
}

/** Tide steps remaining before `inst` may be released, or 0 if it is ready. */
export function stepsUntilMature(state: GameState, inst: CardInstance): number {
  if (inst.playedOnTideStep === null) return 0;
  const needed = state.config.releaseMaturityCycles * 4;
  return Math.max(0, needed - (state.tideStep - inst.playedOnTideStep));
}

/** Whether `playerId` may release anything at all right now. */
export function canReleaseThisTurn(state: GameState, playerId: PlayerId): boolean {
  return state.players[playerId].releasesThisTurn < state.config.releasesPerTurn;
}
