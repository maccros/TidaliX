/**
 * The opponent, at three strengths.
 *
 * Still not the deep AI from the roadmap — it is a one-ply search with a
 * hand-written evaluator — but the three profiles genuinely play differently
 * rather than being the same bot with a number scaled, because they disagree
 * about *what a good position is*:
 *
 *   easy    races the face, ignores the tide and the pile, and takes a merely
 *           adequate move about half the time instead of the best one
 *   normal  the original: greedy on board value and life, one move deep
 *   hard    reads the tide (a manta held for high water is worth holding), plays
 *           the conservation pile, and — the change that matters most now that
 *           defenders strike back — looks at what the opponent can answer with
 *           before committing
 *
 * It still shows why the engine is pure: because `applyAction` returns a new
 * state and never mutates, a move is evaluated by simply playing it and scoring
 * the result. No undo, no simulation mode, no special-casing.
 */

import { applyAction, legalActions } from './resolver.js';
import { boardView, opponentOf } from './state.js';
import { conservedCount } from './economy.js';
import { nextPhase, effectiveStats } from './tide.js';
import { getCard } from './cards.js';
import { nextRandom } from './rng.js';
import type { GameAction, GameEvent, GameState, PlayerId, RngState } from './types.js';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface BotProfile {
  /** How much a point of life swing is worth against a point of board value. */
  life: number;
  /** How much progress toward the conservation pile is worth. */
  conservation: number;
  /** How much the board's value *after the tide turns* counts. */
  tide: number;
  /** How much the opponent's best answer counts against a move. */
  reply: number;
  /** Chance of settling for an adequate move rather than the best one. */
  blunder: number;
}

const PROFILES: Record<Difficulty, BotProfile> = {
  // Undervalues the win condition and settles for an adequate move half the
  // time — the two mistakes a new player actually makes. Note that it is *not*
  // "normal with the aggression turned up": racing is strong in this game, so
  // over-weighting the face would have made easy the harder opponent, which is
  // exactly what an earlier version of this table did.
  easy: { life: 1, conservation: 0, tide: 0, reply: 0, blunder: 0.5 },
  normal: { life: 3, conservation: 1, tide: 0, reply: 0, blunder: 0 },
  hard: { life: 3, conservation: 1, tide: 0.5, reply: 1, blunder: 0 },
};

/*
 * These weights are measured, not guessed. In a round robin of 288 games per
 * profile, reading the tide and reading the opponent's answer each added about
 * five points of win rate on their own and seven together:
 *
 *   life3 + tide + reply   57%      life4    48%
 *   life3 + reply          52%      life3    47%
 *   life3 + tide           51%      life1    46%
 *   life2                  48%
 *
 * Worth re-running after any change to combat: the last one inverted the table.
 */

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard'] as const;

/**
 * What each opponent is actually doing, in the player's language.
 *
 * Lives here rather than in the client because it describes the profiles above,
 * and a description that sits next to what it describes is one that gets updated
 * when the numbers move.
 */
export const DIFFICULTY_NOTE: Record<Difficulty, string> = {
  easy: 'Fights for the board and forgets to finish you. Ignores the tide and the pile, and misses the best line about half the time.',
  normal: 'Goes for your life total, one move deep. No read of the tide and no plan beyond this turn.',
  hard: 'Goes for your life total, reads one tide phase ahead, and checks what you can answer with before committing to a trade.',
};

/** Rough worth of a card sitting on the board, in a given phase. */
function cardWorth(attack: number, health: number, reefGuard: boolean): number {
  return attack + health + (reefGuard ? 2 : 0);
}

function boardValue(state: GameState, player: PlayerId): number {
  return boardView(state, player).reduce(
    (sum, v) => sum + cardWorth(v.attack, v.health, v.reefGuard),
    0,
  );
}

/**
 * The board's worth once the tide has turned.
 *
 * This is the whole of the bot's tide literacy: a manta at low water looks
 * worthless to a evaluator that only sees now, and a mudskipper at low water
 * looks like a monster. Scoring both the current phase and the next one stops
 * it from selling the first and over-paying for the second.
 */
function boardValueNextPhase(state: GameState, player: PlayerId): number {
  const phase = nextPhase(state.phase);
  const board = state.players[player].board;
  return board.reduce((sum, inst) => {
    const def = getCard(inst.definitionId);
    const stats = effectiveStats(inst, phase, def, board);
    return sum + cardWorth(stats.attack, stats.health, def.keywords?.includes('reef-guard') ?? false);
  }, 0);
}

/**
 * How much a step toward the conservation win is worth.
 *
 * Releasing always looks like a loss to a board-value-only score — the card
 * leaves — so without this the bot would never touch the second win condition
 * and a player would never see the mechanic used against them. Progress is worth
 * more the closer the pile gets, so a started pile gets finished.
 *
 * Scored on taxa, which the bot gets for free: `conservedCount` simply stops
 * rewarding it for releasing a second animal from a branch it already holds.
 */
function conservationValue(state: GameState, me: PlayerId): number {
  const target = state.config.conservationVictory;
  const saved = conservedCount(state.players[me]);
  if (target <= 0) return saved * 6;
  return saved * 12 + (saved / target) ** 2 * 60;
}

/**
 * The best single answer the opponent has to this position.
 *
 * Computed arithmetically rather than by playing the moves out. An earlier
 * version cloned the state once per candidate reply, which made `hard` roughly
 * fifty times slower than the others — unusable in a browser, and slow enough to
 * time out a measurement run. Nothing here needs the resolver: what one attacker
 * can do to one card is a subtraction.
 *
 * Deliberately shallow — the single best answer, not their whole turn. The point
 * is to stop the bot walking a card into an obvious trade, and now that every
 * defender strikes back that covers most of what a one-ply bot gets wrong.
 */
function bestReply(state: GameState, me: PlayerId): number {
  if (state.winner !== undefined) return 0;
  const them = opponentOf(me);
  const mine = boardView(state, me);
  const theirs = boardView(state, them);

  // A reef-guard has to be dealt with before anything behind it.
  const guards = mine.filter((v) => v.reefGuard);
  const reachable = guards.length > 0 ? guards : mine;

  let worst = 0;
  for (const attacker of theirs) {
    if (attacker.attack <= 0) continue;

    // Going face is always available when nothing is guarding.
    let best = guards.length > 0 ? 0 : attacker.attack * PROFILE_FACE_WORTH;

    for (const victim of reachable) {
      const dealt = Math.max(0, attacker.attack + (victim.exposed ? 1 : 0) - victim.armour);
      if (dealt <= 0) continue;
      // Killing it is worth the whole card; chipping it is worth the damage.
      const gain =
        dealt >= victim.health ? cardWorth(victim.attack, victim.health, victim.reefGuard) : dealt;
      // Their attacker eats my retaliation, which is what makes some attacks
      // bad for them and so not worth me fearing.
      const cost = Math.max(0, victim.attack - attacker.armour) >= attacker.health
        ? cardWorth(attacker.attack, attacker.health, attacker.reefGuard)
        : 0;
      if (gain - cost > best) best = gain - cost;
    }
    if (best > worst) worst = best;
  }
  return worst;
}

/** What a point of face damage is worth when weighing the opponent's answer. */
const PROFILE_FACE_WORTH = 1.5;

/** Score a move by the swing it produces, through one profile's eyes. */
function score(
  before: GameState,
  after: GameState,
  me: PlayerId,
  p: BotProfile,
  replyBefore: number,
): number {
  const them = opponentOf(me);
  const boardSwing =
    boardValue(after, me) -
    boardValue(before, me) -
    (boardValue(after, them) - boardValue(before, them));
  const lifeSwing =
    before.players[them].life -
    after.players[them].life -
    (before.players[me].life - after.players[me].life);

  let total = boardSwing + lifeSwing * p.life;

  if (p.conservation > 0) {
    total +=
      (conservationValue(after, me) - conservationValue(before, me)) * p.conservation;
  }
  if (p.tide > 0) {
    const tideSwing =
      boardValueNextPhase(after, me) -
      boardValueNextPhase(before, me) -
      (boardValueNextPhase(after, them) - boardValueNextPhase(before, them));
    total += tideSwing * p.tide;
  }
  if (p.reply > 0) {
    total -= (bestReply(after, me) - replyBefore) * p.reply;
  }

  if (after.winner === me) total += 1000;
  if (after.winner === them) total -= 1000;
  return total;
}

/**
 * Pick a move, or end the turn when nothing is worth doing.
 *
 * Ties break toward the earlier action, which keeps games reproducible. So does
 * the blundering: easy's mistakes are drawn from the game's own seeded RNG, so
 * an easy game replays exactly like any other.
 */
export function chooseAction(
  state: GameState,
  me: PlayerId,
  difficulty: Difficulty | BotProfile = 'normal',
): GameAction {
  const profile = typeof difficulty === 'string' ? PROFILES[difficulty] : difficulty;
  const actions = legalActions(state).filter((a) => a.type !== 'END_TURN');
  const endTurn: GameAction = { type: 'END_TURN', player: me };

  // Constant across every candidate, so it is measured once rather than per move.
  const replyBefore = profile.reply > 0 ? bestReply(state, me) : 0;

  const scored: { action: GameAction; value: number }[] = [];
  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) continue;
    const value = score(state, result.state, me, profile, replyBefore);
    if (value > 0) scored.push({ action, value }); // zero or less is not worth the tempo
  }
  if (scored.length === 0) return endTurn;

  scored.sort((a, b) => b.value - a.value);
  const best = scored[0]!;

  // An easy opponent settles for something adequate rather than the best thing
  // available. It still only ever picks from moves it can see are worth making —
  // a bot that throws cards away at random is not easy, it is broken, and a
  // player learns nothing from beating it.
  if (profile.blunder > 0 && scored.length > 1) {
    const { value } = rollFor(state, me);
    if (value < profile.blunder) {
      // From the weaker half of what it can see, not from the whole list: at 51%
      // against normal, picking anywhere below the top was barely a handicap at
      // all, because the second-best move is usually nearly the best one.
      const tail = scored.slice(Math.ceil(scored.length / 2));
      const pool = tail.length > 0 ? tail : scored.slice(1);
      const pick = pool[Math.floor(value * pool.length)];
      if (pick) return pick.action;
    }
  }

  return best.action;
}

/**
 * A roll drawn from the game's seed and its current position.
 *
 * Not taken from `state.rng` directly, because scoring a move must not advance
 * the game's RNG — that would make the shuffle depend on how the bot thinks.
 */
function rollFor(state: GameState, me: PlayerId): { value: number; rng: RngState } {
  // Mixed from things that change as the turn progresses, so a bot taking
  // several actions in one turn does not make the same roll every time.
  const p = state.players[me];
  return nextRandom({
    seed:
      state.rng.seed +
      state.turn * 7919 +
      me * 104729 +
      p.board.length * 131 +
      p.hand.length * 37 +
      p.energy * 11,
  });
}

/**
 * Play out the bot's whole turn, accumulating every event it produced so the
 * harness can narrate it. Guarded against a bot that never passes.
 */
export function takeTurn(
  state: GameState,
  me: PlayerId,
  difficulty: Difficulty | BotProfile = 'normal',
): { state: GameState; events: GameEvent[] } {
  let current = state;
  const events: GameEvent[] = [];

  for (let i = 0; i < 40; i++) {
    const action = chooseAction(current, me, difficulty);
    const result = applyAction(current, action);
    if (!result.ok) break;
    events.push(...result.events);
    current = result.state;
    if (action.type === 'END_TURN' || current.winner !== undefined) break;
  }

  return { state: current, events };
}
