/**
 * A placeholder opponent, shared by every client.
 *
 * This is deliberately *not* the real AI from the roadmap — it is one ply deep
 * with no plan and no read of the tide beyond what a single move scores right
 * now. It exists so the loop can be played and felt.
 *
 * It does show why the engine is pure, though: because `applyAction` returns a
 * new state and never mutates, the bot evaluates a move by simply playing it and
 * scoring the result. No undo, no simulation mode, no special-casing.
 */

import { applyAction, legalActions } from './resolver.js';
import { boardView, opponentOf } from './state.js';
import type { GameAction, GameEvent, GameState, PlayerId } from './types.js';

/** Rough worth of a card sitting on the board, in its current phase. */
function cardValue(view: { attack: number; health: number; reefGuard: boolean }): number {
  return view.attack + view.health + (view.reefGuard ? 2 : 0);
}

function boardValue(state: GameState, player: PlayerId): number {
  return boardView(state, player).reduce((sum, v) => sum + cardValue(v), 0);
}

/**
 * Score a move by the swing it produces: board value gained, board value denied,
 * and life swung. Life is weighted above board because it is the win condition.
 */
function score(before: GameState, after: GameState, me: PlayerId): number {
  const them = opponentOf(me);
  const boardSwing =
    boardValue(after, me) - boardValue(before, me) - (boardValue(after, them) - boardValue(before, them));
  const lifeSwing =
    (before.players[them].life - after.players[them].life) -
    (before.players[me].life - after.players[me].life);

  let total = boardSwing + lifeSwing * 2;
  if (after.winner === me) total += 1000;
  if (after.winner === them) total -= 1000;
  return total;
}

/**
 * Pick the best-scoring move, or end the turn when nothing is worth doing.
 * Ties break toward the earlier action, which keeps games reproducible.
 */
export function chooseAction(state: GameState, me: PlayerId): GameAction {
  const actions = legalActions(state).filter((a) => a.type !== 'END_TURN');
  const endTurn: GameAction = { type: 'END_TURN', player: me };

  let best: GameAction | null = null;
  let bestScore = 0; // anything scoring zero or less is not worth the tempo

  for (const action of actions) {
    const result = applyAction(state, action);
    if (!result.ok) continue;
    const value = score(state, result.state, me);
    if (value > bestScore) {
      bestScore = value;
      best = action;
    }
  }

  return best ?? endTurn;
}

/**
 * Play out the bot's whole turn, accumulating every event it produced so the
 * harness can narrate it. Guarded against a bot that never passes.
 */
export function takeTurn(state: GameState, me: PlayerId): { state: GameState; events: GameEvent[] } {
  let current = state;
  const events: GameEvent[] = [];

  for (let i = 0; i < 40; i++) {
    const action = chooseAction(current, me);
    const result = applyAction(current, action);
    if (!result.ok) break;
    events.push(...result.events);
    current = result.state;
    if (action.type === 'END_TURN' || current.winner !== undefined) break;
  }

  return { state: current, events };
}
