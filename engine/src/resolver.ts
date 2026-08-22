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
 * damaged at high tide can end up at zero health the moment a falling tide
 * lowers its ceiling. That does not kill it outright: a drop in health from
 * something other than a fresh blow — the tide, or a neighbour's aura going
 * away — marks it `dying` instead. See `sweepDeaths` and `sweepDyingCards`.
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
  ReleaseAction,
  GameAction,
} from './types.js';
import { getCard, isToxic, isToxinImmune, piercesArmour } from './cards.js';
import { arrivalNeedsTarget } from './types.js';
import { cloneState, canAttack, opponentOf } from './state.js';
import { effectiveStats, nextPhase, shouldAdvanceTide, statsFor } from './tide.js';
import {
  canReleaseThisTurn,
  conservedCount,
  energyCapFor,
  energyIncome,
  isMature,
} from './economy.js';

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

  // Income is not re-derived here. `energyIncome` is asked what is owed and the
  // resolver pays exactly that, line by line — the same call the client shows
  // the player. Two implementations of "what do I earn" is one implementation
  // too many, and the one on screen is the one that gets trusted.
  //
  // It has to be asked *before* the bank is touched, because the carried line
  // reads whatever is still unspent from last turn.
  const income = energyIncome(draft, player.id);


  // Base capacity steps up once per *complete tide cycle*, not once per round.
  // That is deliberate: a slow ceiling is what forces the reef to be the engine.
  player.energyCap = energyCapFor(draft);
  player.energy = 0;
  for (const line of income.lines) {
    player.energy += line.amount;
    events.push({
      type: 'ENERGY_GAINED',
      player: player.id,
      amount: line.amount,
      source: line.source,
    });
  }
  // The receipt, kept so the player can be shown what they actually collected
  // this turn beside what they are projected to collect next turn.
  player.incomeThisTurn = income.lines;

  player.releasesThisTurn = 0;
  for (const inst of player.board) inst.hasAttacked = false;

  // Whoever moves first pays for it by skipping their opening draw — the
  // cheapest correction available for an advantage worth about 62% of games,
  // and it takes from the advantaged side rather than handing the other side
  // something extra to keep track of.
  const skipsDraw =
    draft.turn === 1 && draft.config.firstPlayerSkipsDraw && player.id === draft.startingPlayer;
  if (skipsDraw) events.push({ type: 'TURN_SKIPPED_DRAW', player: player.id });
  else draw(draft, player.id, events);
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
    case 'RELEASE':
      return release(state, action);
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

  // A targeted arrival must be given something to hit — but only when there is
  // something to hit. A strike with no enemy on the board is not an illegal
  // play, it is a strike that finds nothing, and refusing the play would strand
  // the card in hand for reasons the player cannot see.
  const enemyBoard = state.players[opponentOf(action.player)].board;
  if (arrivalNeedsTarget(def.arrival) && enemyBoard.length > 0) {
    if (action.targetId === undefined) {
      return err('ARRIVAL_NEEDS_TARGET', `${def.name} must be given a target as it arrives.`);
    }
    if (!enemyBoard.some((c) => c.instanceId === action.targetId)) {
      return err('ARRIVAL_TARGET_INVALID', `No enemy card ${action.targetId} to strike.`);
    }
  }

  const draft = cloneState(state);
  const events: GameEvent[] = [];
  const draftPlayer = draft.players[action.player];
  const [played] = draftPlayer.hand.splice(index, 1);
  const card = played!;

  draftPlayer.energy -= def.cost;
  card.playedOnTurn = draft.turn;
  // Stamped in tide steps so maturity survives a config change of tide pace.
  card.playedOnTideStep = draft.tideStep;
  card.hasAttacked = false;
  draftPlayer.board.push(card);

  events.push({
    type: 'CARD_PLAYED',
    player: action.player,
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    cost: def.cost,
  });

  resolveArrival(draft, card, action.targetId, events);

  // A card can arrive already dead if the phase zeroes its health.
  sweepDeaths(draft, events);

  return { ok: true, state: draft, events };
}

/**
 * Run a card's arrival effect, if it has one.
 *
 * This is the beat that makes playing a card an *action* rather than a deposit.
 * Without it the player who is behind can only add to their board and wait a
 * turn, by which point the board they were answering has already answered them
 * — which is why a lead used to be impossible to overturn.
 *
 * Resolved before the death sweep so an arrival that kills something and a card
 * that arrives already dead settle in the same pass.
 */
function resolveArrival(
  draft: GameState,
  card: CardInstance,
  targetId: string | undefined,
  events: GameEvent[],
): void {
  const arrival = getCard(card.definitionId).arrival;
  if (!arrival) return;

  const me = draft.players[card.owner];
  const them = draft.players[opponentOf(card.owner)];

  switch (arrival.kind) {
    case 'strike': {
      const target = them.board.find((c) => c.instanceId === targetId);
      // Legality already allowed an untargeted strike into an empty board.
      if (!target) break;
      strike(draft, target, arrival.amount, card.instanceId, 'arrival', 0, events, card);
      break;
    }
    case 'sweep': {
      for (const target of [...them.board]) {
        strike(draft, target, arrival.amount, card.instanceId, 'arrival', 0, events, card);
      }
      break;
    }
    case 'mend': {
      for (const ally of me.board) {
        if (ally.damage === 0) continue;
        const healed = Math.min(ally.damage, arrival.amount);
        ally.damage -= healed;
        events.push({ type: 'CARD_HEALED', instanceId: ally.instanceId, amount: healed });
      }
      break;
    }
    case 'forage': {
      me.energy += arrival.amount;
      events.push({
        type: 'ENERGY_GAINED',
        player: me.id,
        amount: arrival.amount,
        source: 'card',
      });
      break;
    }
    case 'scout': {
      for (let i = 0; i < arrival.amount; i++) draw(draft, me.id, events);
      break;
    }
  }

  events.push({
    type: 'ARRIVAL_RESOLVED',
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    kind: arrival.kind,
    amount: arrival.amount,
    ...(targetId !== undefined ? { targetId } : {}),
  });
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
      absorbed: 0,
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
    const dealt = strike(
      draft,
      draftTarget,
      attackerStats.attack + bonusToTarget,
      draftAttacker.instanceId,
      'attack',
      bonusToTarget,
      events,
      draftAttacker,
    );

    // Eating something toxic kills you. This is settled here, at the moment of
    // the kill, rather than left to the sweep: whether the defender died is a
    // fact about *this* attack, and by the time the board is swept a falling
    // tide or a lost aura could have killed it instead — which is not eating it.
    //
    // Whichever side dies to a bite gets poisoned by it — this is the defender's
    // half, the attacker's half is symmetric below, after retaliation. No amount
    // of healing saves the eater either way: the toxin is marked on the
    // instance, not dealt as damage.
    if (
      isToxic(draftTarget.definitionId) &&
      !isToxinImmune(draftAttacker.definitionId) &&
      targetStats.health - dealt <= 0
    ) {
      draftAttacker.poisoned = true;
      events.push({
        type: 'SPECIES_POISONED',
        sourceId: draftTarget.instanceId,
        victimId: draftAttacker.instanceId,
      });
    }

    // The defender hits back. This is what stops a wide board from clearing
    // everything the opponent plays for free — attacking is now a trade, and a
    // trade is a decision. It lands even if the defender is dying: an animal
    // does not stop biting because the bite was fatal.
    const bonusToAttacker = attackerStats.exposed ? draft.config.exposedBonusDamage : 0;
    // A defender returns its attack plus its spines. Spines exist because the
    // first half of that is zero for a coral, an urchin or an anemone — without
    // them, universal retaliation left the reef's walls answering with nothing.
    const returned = (draft.config.defenderStrikesBack ? targetStats.attack : 0) + targetStats.spines;
    if (returned > 0) {
      const dealtBack = strike(
        draft,
        draftAttacker,
        returned + bonusToAttacker,
        draftTarget.instanceId,
        'retaliation',
        bonusToAttacker,
        events,
        draftTarget,
      );

      // Symmetric with the eating case above: a toxic attacker that dies to
      // retaliation poisons whatever finished it off. Biting something toxic
      // kills you whichever side of the bite you were on.
      if (
        isToxic(draftAttacker.definitionId) &&
        !isToxinImmune(draftTarget.definitionId) &&
        attackerStats.health - dealtBack <= 0
      ) {
        draftTarget.poisoned = true;
        events.push({
          type: 'SPECIES_POISONED',
          sourceId: draftAttacker.instanceId,
          victimId: draftTarget.instanceId,
        });
      }
    }
  }

  sweepDeaths(draft, events);
  return { ok: true, state: draft, events };
}

/**
 * Release a matured species from the board back into the wild.
 *
 * The card goes to the conservation pile — a third destination that is neither
 * the board nor the discard. It is out of play for good, but it is an asset
 * rather than a loss: the pile pays a standing income and, filled far enough,
 * it wins the game outright.
 *
 * Two guards keep this from being a free undo: the species must have survived a
 * complete tide cycle, and only so many go back per turn. Releasing a damaged
 * card is legal and costs you nothing extra — the animal is returned to the
 * ocean, not to your hand, so there is nothing to heal.
 */
function release(state: GameState, action: ReleaseAction): ActionResult {
  const player = state.players[action.player];
  const index = player.board.findIndex((c) => c.instanceId === action.instanceId);
  if (index === -1) {
    return err('CARD_NOT_ON_BOARD', `Card ${action.instanceId} is not on your reef.`);
  }

  if (!canReleaseThisTurn(state, action.player)) {
    return err(
      'RELEASE_LIMIT_REACHED',
      `You may release ${state.config.releasesPerTurn} species per turn.`,
    );
  }

  const instance = player.board[index]!;
  const def = getCard(instance.definitionId);
  if (!isMature(state, instance)) {
    const cycles = state.config.releaseMaturityCycles;
    return err(
      'NOT_MATURE',
      `${def.name} must survive ${cycles} complete tide ${cycles === 1 ? 'cycle' : 'cycles'} before it can be released.`,
    );
  }

  const draft = cloneState(state);
  const events: GameEvent[] = [];
  const draftPlayer = draft.players[action.player];
  const [released] = draftPlayer.board.splice(index, 1);
  const card = released!;

  card.damage = 0;
  card.playedOnTurn = null;
  card.playedOnTideStep = null;
  card.hasAttacked = false;
  card.poisoned = false;
  card.dying = false;
  draftPlayer.conservation.push(card);
  draftPlayer.releasesThisTurn += 1;

  events.push({
    type: 'SPECIES_RELEASED',
    player: action.player,
    instanceId: card.instanceId,
    definitionId: card.definitionId,
    conserved: conservedCount(draftPlayer),
  });

  // Losing a card off the board re-stats its neighbours: anything that was only
  // standing because of the released species goes down with it.
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
    draft.tideStep += 1;
    events.push({ type: 'TIDE_CHANGED', from, to: draft.phase });
    // Whatever was already dying — marked on some earlier action, this tide
    // change or a previous one — is taken now, before the new phase gets a
    // chance to mark anything of its own. Order matters: a card that only
    // just went to zero because of *this* phase change gets marked below,
    // not swept here, so it always gets one full tide change of warning.
    sweepDyingCards(draft, events);
    // The new phase re-stats both boards; anything whose ceiling fell below its
    // marked damage is marked dying here rather than removed outright.
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
 * Remove whatever a fresh blow this action actually killed, then re-check the
 * win condition.
 *
 * A card that just took attack or retaliation damage (or ate something toxic)
 * and is now at or below zero health dies here, immediately — that is a real
 * kill, not a status. A card at or below zero health *without* having taken
 * one of those blows this action is at zero for some other reason — a
 * neighbour's aura going away, or the tide dropping its ceiling — and is
 * marked `dying` instead of removed; see `CardInstance.dying` and
 * `sweepDyingCards`, which is what actually takes it, at the next tide
 * change. A dying card that recovers (the aura comes back, it gets healed)
 * comes off the mark here too, on the same pass that finds it healthy again.
 *
 * Symbiosis makes the kill side of this a fixpoint rather than a single pass:
 * an anemonefish standing only because of its anemone drops when the anemone
 * does, and that in turn can pull down whatever was leaning on the
 * anemonefish. Loop until a pass kills nothing. The board is finite and every
 * pass strictly shrinks it, so this always terminates. Marking or clearing
 * `dying` never removes a card from the board, so it cannot itself start a
 * new cascade — only an actual kill does.
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
        const across = draft.players[inst.owner === 0 ? 1 : 0].board;
        const outOfHealth =
          effectiveStats(inst, draft.phase, getCard(inst.definitionId), player.board, across)
            .health <= 0;
        // Any DAMAGE_DEALT counts, arrival included — a dash's strike or sweep
        // is a fresh blow the same as an attack, and settles in the same pass
        // it lands, not as a status. Only a stat ceiling dropping out from
        // under old damage, with no blow behind it, is what "dying" means.
        const tookAFreshBlow = events.some(
          (e) => e.type === 'DAMAGE_DEALT' && e.targetId === inst.instanceId,
        );
        // A toxin is not damage and cannot be out-healed: once marked, the card
        // is dead on the next sweep whatever its health has since become.
        if (inst.poisoned || (outOfHealth && tookAFreshBlow)) {
          player.discard.push(inst);
          events.push({
            type: 'CARD_DESTROYED',
            instanceId: inst.instanceId,
            definitionId: inst.definitionId,
            owner: inst.owner,
            cause: inst.poisoned ? 'toxin' : 'damage',
          });
          killedSomething = true;
        } else if (outOfHealth && !inst.dying) {
          inst.dying = true;
          events.push({
            type: 'SPECIES_DYING',
            instanceId: inst.instanceId,
            definitionId: inst.definitionId,
            owner: inst.owner,
          });
          survivors.push(inst);
        } else if (!outOfHealth && inst.dying) {
          inst.dying = false;
          events.push({
            type: 'SPECIES_STEADIED',
            instanceId: inst.instanceId,
            definitionId: inst.definitionId,
            owner: inst.owner,
          });
          survivors.push(inst);
        } else {
          survivors.push(inst);
        }
      }
      player.board = survivors;
    }
  }

  checkWinner(draft, events);
}

/**
 * Takes everything already marked `dying` — set on some earlier action, and
 * left on the board since — for real. Called once, right as the tide turns,
 * before that new phase gets its own chance to mark anything: a card only
 * ever gets one tide change of warning, never zero and never two.
 *
 * A flat pass, not a fixpoint: unlike `sweepDeaths`, nothing here depends on
 * a stat that could shift mid-pass, so simultaneous removals need no special
 * handling. Whatever this removal exposes downstream — a partner's aura
 * gone, revealing yet another card at zero health — is the next sweepDeaths
 * call's problem, and it is indirect there too, so it is marked, not killed.
 */
function sweepDyingCards(draft: GameState, events: GameEvent[]): void {
  for (const player of draft.players) {
    const survivors: CardInstance[] = [];
    for (const inst of player.board) {
      if (inst.dying) {
        player.discard.push(inst);
        events.push({
          type: 'CARD_DESTROYED',
          instanceId: inst.instanceId,
          definitionId: inst.definitionId,
          owner: inst.owner,
          cause: 'dying',
        });
      } else {
        survivors.push(inst);
      }
    }
    player.board = survivors;
  }
}

/**
 * Deal damage to a card, after its armour has taken what it can.
 *
 * Every source of damage goes through here so armour cannot be forgotten on one
 * of them — which is exactly the bug the old two-branch combat code invited.
 * Returns what actually landed, because callers need to know whether the blow
 * was lethal, and armour means that is no longer the number they asked for.
 *
 * An arrival is the one exception: it is not a hit the target's shell can turn
 * aside, it is something read straight off its life, so it always skips armour
 * regardless of what dealt it.
 */
function strike(
  draft: GameState,
  target: CardInstance,
  raw: number,
  sourceId: string,
  cause: 'attack' | 'retaliation' | 'arrival',
  exposedBonus: number,
  events: GameEvent[],
  /** The card dealing it, when one is identifiable — `pierce` is read off it. */
  source?: CardInstance,
): number {
  const armour =
    cause === 'arrival' || (source && piercesArmour(source.definitionId)) ? 0 : statsFor(draft, target).armour;
  const dealt = Math.max(0, raw - armour);
  const absorbed = raw - dealt;
  target.damage += dealt;
  events.push({
    type: 'DAMAGE_DEALT',
    sourceId,
    targetId: target.instanceId,
    amount: dealt,
    exposedBonus,
    absorbed,
    cause,
  });
  return dealt;
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

/**
 * Resolve both win conditions.
 *
 * Life is checked first, so a player who is already dead cannot be saved by a
 * pile they filled on the same beat. Conservation is checked second and works
 * the same way: fill the pile far enough and you have won, whatever the board
 * looks like. Both are evaluated for both players at once, so a genuine tie is
 * a draw rather than an ordering accident.
 */
function checkWinner(draft: GameState, events: GameEvent[]): void {
  if (draft.winner !== undefined) return;
  const [a, b] = draft.players;

  const aDead = a.life <= 0;
  const bDead = b.life <= 0;
  if (aDead || bDead) {
    draft.winner = aDead && bDead ? null : aDead ? 1 : 0;
    events.push({ type: 'GAME_OVER', winner: draft.winner, reason: 'life' });
    return;
  }

  const target = draft.config.conservationVictory;
  if (target <= 0) return;
  const aSaved = conservedCount(a) >= target;
  const bSaved = conservedCount(b) >= target;
  if (!aSaved && !bSaved) return;

  draft.winner = aSaved && bSaved ? null : aSaved ? 0 : 1;
  events.push({ type: 'GAME_OVER', winner: draft.winner, reason: 'conservation' });
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

  const defenderId = opponentOf(state.activePlayer);
  const defenderBoard = state.players[defenderId].board;

  if (player.board.length < state.config.maxBoardSize) {
    for (const card of player.hand) {
      const def = getCard(card.definitionId);
      if (def.cost > player.energy) continue;
      // A card whose arrival needs a target is not one action but one per
      // target, so the UI and the bot both see the choice as part of the play
      // rather than as something bolted on after it.
      if (arrivalNeedsTarget(def.arrival) && defenderBoard.length > 0) {
        for (const target of defenderBoard) {
          actions.push({
            type: 'PLAY_CARD',
            player: player.id,
            instanceId: card.instanceId,
            targetId: target.instanceId,
          });
        }
      } else {
        actions.push({ type: 'PLAY_CARD', player: player.id, instanceId: card.instanceId });
      }
    }
  }

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

  if (canReleaseThisTurn(state, player.id)) {
    for (const inst of player.board) {
      if (isMature(state, inst)) {
        actions.push({ type: 'RELEASE', player: player.id, instanceId: inst.instanceId });
      }
    }
  }

  actions.push({ type: 'END_TURN', player: player.id });
  return actions;
}
