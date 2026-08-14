/**
 * The resolver: the single entry point through which a game changes.
 *
 * `applyAction(state, action)` is pure — it clones, mutates the clone, and hands
 * back the new state plus the ordered list of events that produced it. Illegal
 * actions come back as a typed error and leave the caller's state untouched, so
 * a UI or an AI can probe freely without corrupting anything.
 *
 * Tide effects are *not* applied as one-shot mutations at play time. They are
 * continuous: `effectiveStats` reads the live phase every time a card is looked
 * at, so a phase change re-stats the whole board at once, for free. Damage,
 * by contrast, is marked permanently on the instance — which is why a card
 * damaged at high tide can die the moment a falling tide lowers its ceiling.
 */

import type {
  ActionErrorCode,
  ActionResult,
  AttackAction,
  CardInstance,
  EndTurnAction,
  GameEvent,
  GameState,
  PlayCardAction,
  PlayerId,
  GameAction,
} from './types.js';
import { getCard } from './cards.js';
import { cloneState, canAttack, opponentOf } from './state.js';
import { effectiveStats, nextPhase, shouldAdvanceTide, statsFor } from './tide.js';

function err(error: ActionErrorCode, message: string): ActionResult {
  return { ok: false, error, message };
}

/* -------------------------------------------------------------------------- */
/* Turn lifecycle                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Open the game: runs the first turn's start-of-turn step. Call once on a state
 * from `createGame`.
 */
export function startGame(state: GameState): { state: GameState; events: GameEvent[] } {
  const draft = cloneState(state);
  const events: GameEvent[] = [];
  beginTurn(draft, events);
  return { state: draft, events };
}

/** Start-of-turn: advance counters, refill energy, unlock attackers, draw. */
function beginTurn(draft: GameState, events: GameEvent[]): void {
  draft.turn += 1;
  draft.round = Math.ceil(draft.turn / 2);

  const player = draft.players[draft.activePlayer];

  events.push({
    type: 'TURN_STARTED',
    player: player.id,
    turn: draft.turn,
    round: draft.round,
    phase: draft.phase,
  });

  // Unspent plankton keeps, but only so much of it — enough that banking through
  // a lean phase is worth doing, not enough to hoard into a single blowout turn.
  const carried = Math.min(player.energy, draft.config.carryOverCap);

  // The base ramp is the game's clock; the tide is what makes the economy move.
  player.energyCap = Math.min(draft.round, draft.config.maxEnergyCap);
  player.energy = player.energyCap;
  events.push({
    type: 'ENERGY_GAINED',
    player: player.id,
    amount: player.energyCap,
    source: 'turn',
  });

  if (carried > 0) {
    player.energy += carried;
    events.push({ type: 'ENERGY_GAINED', player: player.id, amount: carried, source: 'carried' });
  }

  const tideBonus = draft.config.tideEnergy[draft.phase];
  if (tideBonus > 0) {
    player.energy += tideBonus;
    events.push({ type: 'ENERGY_GAINED', player: player.id, amount: tideBonus, source: 'tide' });
  }

  const cardBonus = player.board.reduce(
    (sum, inst) => sum + statsFor(draft, inst).energy,
    0,
  );
  if (cardBonus > 0) {
    player.energy += cardBonus;
    events.push({ type: 'ENERGY_GAINED', player: player.id, amount: cardBonus, source: 'card' });
  }

  for (const inst of player.board) inst.hasAttacked = false;

  draw(draft, player.id, events);
  sweepDeaths(draft, events);
}

/** Draw one card, or take mounting fatigue damage on an empty deck. */
function draw(draft: GameState, playerId: PlayerId, events: GameEvent[]): void {
  const player = draft.players[playerId];
  const card = player.deck.shift();

  if (!card) {
    player.fatigue += 1;
    damagePlayer(draft, playerId, player.fatigue, events);
    events.push({ type: 'DECK_EMPTY', player: playerId, fatigueDamage: player.fatigue });
    return;
  }

  if (player.hand.length >= draft.config.maxHandSize) {
    player.discard.push(card);
    events.push({ type: 'HAND_OVERFLOW', player: playerId, instanceId: card.instanceId });
    return;
  }

  player.hand.push(card);
  events.push({ type: 'CARD_DRAWN', player: playerId, instanceId: card.instanceId });
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

export function applyAction(state: GameState, action: GameAction): ActionResult {
  if (state.winner !== undefined) {
    return err('GAME_OVER', 'The game has already ended.');
  }
  if (action.player !== state.activePlayer) {
    return err('NOT_YOUR_TURN', `It is player ${state.activePlayer}'s turn.`);
  }

  switch (action.type) {
    case 'PLAY_CARD':
      return playCard(state, action);
    case 'ATTACK':
      return attack(state, action);
    case 'END_TURN':
      return endTurn(state, action);
  }
}

function playCard(state: GameState, action: PlayCardAction): ActionResult {
  const player = state.players[action.player];
  const index = player.hand.findIndex((c) => c.instanceId === action.instanceId);
  if (index === -1) {
    return err('CARD_NOT_IN_HAND', `Card ${action.instanceId} is not in hand.`);
  }

  const instance = player.hand[index]!;
  const def = getCard(instance.definitionId);

  if (player.energy < def.cost) {
    return err(
      'NOT_ENOUGH_ENERGY',
      `${def.name} costs ${def.cost}; you have ${player.energy} energy.`,
    );
  }
  if (player.board.length >= state.config.maxBoardSize) {
    return err('BOARD_FULL', `The reef is full (${state.config.maxBoardSize} cards).`);
  }

  const draft = cloneState(state);
  const events: GameEvent[] = [];
  const draftPlayer = draft.players[action.player];
  const [played] = draftPlayer.hand.splice(index, 1);
  const card = played!;

  draftPlayer.energy -= def.cost;
  card.playedOnTurn = draft.turn;
  card.hasAttacked = false;
  draftPlayer.board.push(card);

  events.push({
    type: 'CARD_PLAYED',
    player: action.player,
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    cost: def.cost,
  });

  // A card can arrive already dead if the phase zeroes its health.
  sweepDeaths(draft, events);

  return { ok: true, state: draft, events };
}

function attack(state: GameState, action: AttackAction): ActionResult {
  const attacker = state.players[action.player].board.find(
    (c) => c.instanceId === action.attackerId,
  );
  if (!attacker) {
    return err('ATTACKER_NOT_FOUND', `No card ${action.attackerId} on your board.`);
  }
  if (attacker.hasAttacked) {
    return err('ATTACKER_ALREADY_ATTACKED', 'That card has already attacked this turn.');
  }

  const attackerDef = getCard(attacker.definitionId);
  if (statsFor(state, attacker).attack <= 0) {
    return err('ATTACKER_CANNOT_ATTACK', `${attackerDef.name} has no attack in this phase.`);
  }
  if (!canAttack(state, attacker)) {
    return err('ATTACKER_NOT_READY', `${attackerDef.name} cannot attack the turn it is played.`);
  }

  const defenderId = opponentOf(action.player);
  const defenderBoard = state.players[defenderId].board;
  const guards = defenderBoard.filter((c) => getCard(c.definitionId).keywords?.includes('reef-guard'));

  let target: CardInstance | undefined;
  if (action.targetId !== 'face') {
    target = defenderBoard.find((c) => c.instanceId === action.targetId);
    if (!target) {
      return err('TARGET_NOT_FOUND', `No card ${action.targetId} on the opposing board.`);
    }
  }

  if (guards.length > 0) {
    const targetIsGuard = target ? guards.some((g) => g.instanceId === target!.instanceId) : false;
    if (!targetIsGuard) {
      return err(
        'MUST_ATTACK_REEF_GUARD',
        'A reef-guard card must be dealt with before anything behind it.',
      );
    }
  }

  const draft = cloneState(state);
  const events: GameEvent[] = [];
  const draftAttacker = draft.players[action.player].board.find(
    (c) => c.instanceId === action.attackerId,
  )!;

  events.push({
    type: 'ATTACK_DECLARED',
    attackerId: draftAttacker.instanceId,
    targetId: action.targetId,
    phase: draft.phase,
  });
  draftAttacker.hasAttacked = true;

  const attackerStats = statsFor(draft, draftAttacker);

  if (action.targetId === 'face') {
    events.push({
      type: 'DAMAGE_DEALT',
      sourceId: draftAttacker.instanceId,
      targetId: 'face',
      amount: attackerStats.attack,
      exposedBonus: 0,
      cause: 'attack',
    });
    damagePlayer(draft, defenderId, attackerStats.attack, events);
  } else {
    const draftTarget = draft.players[defenderId].board.find(
      (c) => c.instanceId === action.targetId,
    )!;
    const targetStats = statsFor(draft, draftTarget);

    // The attacker strikes first, and an exposed defender takes the extra.
    const bonusToTarget = targetStats.exposed ? draft.config.exposedBonusDamage : 0;
    const dealt = attackerStats.attack + bonusToTarget;
    draftTarget.damage += dealt;
    events.push({
      type: 'DAMAGE_DEALT',
      sourceId: draftAttacker.instanceId,
      targetId: draftTarget.instanceId,
      amount: dealt,
      exposedBonus: bonusToTarget,
      cause: 'attack',
    });

    // Only armed animals hit back. A defender's body is not a weapon: spines,
    // nematocysts and venom are, and they are printed on the card that has them.
    // Both sources land even if the defender is dying — a puffer that dies still
    // dies covered in spines.
    const bonusToAttacker = attackerStats.exposed ? draft.config.exposedBonusDamage : 0;

    if (targetStats.spines > 0) {
      const returned = targetStats.spines + bonusToAttacker;
      draftAttacker.damage += returned;
      events.push({
        type: 'DAMAGE_DEALT',
        sourceId: draftTarget.instanceId,
        targetId: draftAttacker.instanceId,
        amount: returned,
        exposedBonus: bonusToAttacker,
        cause: 'spines',
      });
    }

    if (draft.config.defenderStrikesBack && targetStats.attack > 0) {
      const returned = targetStats.attack + bonusToAttacker;
      draftAttacker.damage += returned;
      events.push({
        type: 'DAMAGE_DEALT',
        sourceId: draftTarget.instanceId,
        targetId: draftAttacker.instanceId,
        amount: returned,
        exposedBonus: bonusToAttacker,
        cause: 'retaliation',
      });
    }
  }

  sweepDeaths(draft, events);
  return { ok: true, state: draft, events };
}

function endTurn(state: GameState, action: EndTurnAction): ActionResult {
  const draft = cloneState(state);
  const events: GameEvent[] = [];

  events.push({ type: 'TURN_ENDED', player: action.player, turn: draft.turn });

  if (shouldAdvanceTide(draft)) {
    const from = draft.phase;
    draft.phase = nextPhase(from);
    events.push({ type: 'TIDE_CHANGED', from, to: draft.phase });
    // The new phase re-stats both boards; anything whose ceiling fell below its
    // marked damage drowns (or dries out) right here.
    sweepDeaths(draft, events);
  }

  if (draft.winner === undefined) {
    draft.activePlayer = opponentOf(draft.activePlayer);
    beginTurn(draft, events);
  }

  return { ok: true, state: draft, events };
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Remove everything at or below zero health, then re-check the win condition.
 *
 * Symbiosis makes this a fixpoint rather than a single pass: an anemonefish
 * standing only because of its anemone drops when the anemone does, and that in
 * turn can pull down whatever was leaning on the anemonefish. Loop until a pass
 * kills nothing. The board is finite and every pass strictly shrinks it, so this
 * always terminates.
 */
function sweepDeaths(draft: GameState, events: GameEvent[]): void {
  let killedSomething = true;

  while (killedSomething) {
    killedSomething = false;

    for (const player of draft.players) {
      const survivors: CardInstance[] = [];
      for (const inst of player.board) {
        // Stats are measured against the board as it stands at the start of this
        // pass, so simultaneous deaths resolve together rather than in order.
        if (effectiveStats(inst, draft.phase, getCard(inst.definitionId), player.board).health <= 0) {
          player.discard.push(inst);
          events.push({
            type: 'CARD_DESTROYED',
            instanceId: inst.instanceId,
            definitionId: inst.definitionId,
            owner: inst.owner,
          });
          killedSomething = true;
        } else {
          survivors.push(inst);
        }
      }
      player.board = survivors;
    }
  }

  checkWinner(draft, events);
}

function damagePlayer(
  draft: GameState,
  playerId: PlayerId,
  amount: number,
  events: GameEvent[],
): void {
  if (amount <= 0) return;
  const player = draft.players[playerId];
  player.life -= amount;
  events.push({ type: 'PLAYER_DAMAGED', player: playerId, amount, life: player.life });
  checkWinner(draft, events);
}

function checkWinner(draft: GameState, events: GameEvent[]): void {
  if (draft.winner !== undefined) return;
  const [a, b] = draft.players;
  const aDead = a.life <= 0;
  const bDead = b.life <= 0;
  if (!aDead && !bDead) return;

  draft.winner = aDead && bDead ? null : aDead ? 1 : 0;
  events.push({ type: 'GAME_OVER', winner: draft.winner });
}

/* -------------------------------------------------------------------------- */
/* Action enumeration (for the AI, and for exhaustive tests)                    */
/* -------------------------------------------------------------------------- */

/**
 * Every legal action for the active player right now. The AI opponent will sit
 * on top of this, and it doubles as a cheap legality oracle in tests.
 */
export function legalActions(state: GameState): GameAction[] {
  if (state.winner !== undefined) return [];

  const player = state.players[state.activePlayer];
  const actions: GameAction[] = [];

  if (player.board.length < state.config.maxBoardSize) {
    for (const card of player.hand) {
      if (getCard(card.definitionId).cost <= player.energy) {
        actions.push({ type: 'PLAY_CARD', player: player.id, instanceId: card.instanceId });
      }
    }
  }

  const defenderId = opponentOf(state.activePlayer);
  const defenderBoard = state.players[defenderId].board;
  const guards = defenderBoard.filter((c) => getCard(c.definitionId).keywords?.includes('reef-guard'));
  const targets: (string | 'face')[] =
    guards.length > 0
      ? guards.map((g) => g.instanceId)
      : [...defenderBoard.map((c) => c.instanceId), 'face'];

  for (const attacker of player.board) {
    if (!canAttack(state, attacker)) continue;
    for (const targetId of targets) {
      actions.push({
        type: 'ATTACK',
        player: player.id,
        attackerId: attacker.instanceId,
        targetId,
      });
    }
  }

  actions.push({ type: 'END_TURN', player: player.id });
  return actions;
}
