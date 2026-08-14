/**
 * TidaliX terminal client.
 *
 *   npm run play                  play against the bot
 *   npm run play -- --seed 7      a specific, reproducible game
 *   npm run play -- --watch       bot vs bot, hands off
 *
 * Runs on Node's native TypeScript support — no build step, no ts-node.
 */

import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

import {
  applyAction,
  createGame,
  startGame,
  takeTurn,
  type GameAction,
  type GameState,
  type PlayerId,
} from '@tidalix/engine';

import {
  HELP,
  OWN_LABELS,
  bold,
  cyan,
  dim,
  red,
  renderEvents,
  renderScreen,
  renderTide,
  yellow,
} from './render.ts';

const YOU: PlayerId = 0;
const BOT: PlayerId = 1;

/* -------------------------------------------------------------------------- */
/* Args                                                                        */
/* -------------------------------------------------------------------------- */

function parseArgs(argv: string[]): { seed: number; watch: boolean } {
  const seedFlag = argv.indexOf('--seed');
  const seed =
    seedFlag !== -1 && argv[seedFlag + 1] !== undefined
      ? Number(argv[seedFlag + 1])
      : Math.floor(Math.random() * 100000);
  return { seed: Number.isFinite(seed) ? seed : 1, watch: argv.includes('--watch') };
}

/* -------------------------------------------------------------------------- */
/* Command parsing                                                             */
/* -------------------------------------------------------------------------- */

type Command =
  | { kind: 'action'; action: GameAction }
  | { kind: 'help' }
  | { kind: 'quit' }
  | { kind: 'error'; message: string };

/**
 * Translate a typed line into a GameAction. Index errors are caught here so the
 * engine only ever sees well-formed actions with real instance ids.
 */
function parseCommand(input: string, state: GameState): Command {
  const [verb, ...rest] = input.trim().toLowerCase().split(/\s+/);
  const me = state.players[YOU];

  switch (verb) {
    case '?':
    case 'h':
    case 'help':
      return { kind: 'help' };

    case 'q':
    case 'quit':
      return { kind: 'quit' };

    case 'e':
    case 'end':
      return { kind: 'action', action: { type: 'END_TURN', player: YOU } };

    case 'p':
    case 'play': {
      const index = Number(rest[0]) - 1;
      const card = me.hand[index];
      if (!card) return { kind: 'error', message: `No card ${rest[0] ?? '?'} in hand.` };
      return { kind: 'action', action: { type: 'PLAY_CARD', player: YOU, instanceId: card.instanceId } };
    }

    case 'a':
    case 'attack': {
      const attackerIndex = OWN_LABELS.indexOf(rest[0] ?? '');
      const attacker = attackerIndex === -1 ? undefined : me.board[attackerIndex];
      if (!attacker) return { kind: 'error', message: `No card '${rest[0] ?? '?'}' on your board.` };

      const rawTarget = rest[1];
      if (rawTarget === undefined) {
        return { kind: 'error', message: 'Attack what? Give a number, or "face".' };
      }
      if (rawTarget === 'face' || rawTarget === 'f') {
        return {
          kind: 'action',
          action: { type: 'ATTACK', player: YOU, attackerId: attacker.instanceId, targetId: 'face' },
        };
      }

      const target = state.players[BOT].board[Number(rawTarget) - 1];
      if (!target) return { kind: 'error', message: `No enemy card ${rawTarget}.` };
      return {
        kind: 'action',
        action: {
          type: 'ATTACK',
          player: YOU,
          attackerId: attacker.instanceId,
          targetId: target.instanceId,
        },
      };
    }

    case '':
    case undefined:
      return { kind: 'error', message: '' };

    default:
      return { kind: 'error', message: `Unknown command '${verb}'. Type ? for help.` };
  }
}

/* -------------------------------------------------------------------------- */
/* Main loop                                                                   */
/* -------------------------------------------------------------------------- */

/** `seat` is the reader's side, or null when spectating a bot-vs-bot game. */
function log(state: GameState, events: Parameters<typeof renderEvents>[0], seat: PlayerId | null) {
  const text = renderEvents(events, state, seat);
  if (text.trim().length > 0) console.log(text);
}

/** Run one bot turn and narrate it. */
function botTurn(state: GameState, bot: PlayerId, seat: PlayerId | null): GameState {
  const label = seat === null ? `player ${bot}` : 'the AI';
  console.log(`\n${dim(`── ${label} ${'─'.repeat(50)}`)}`);
  const { state: next, events } = takeTurn(state, bot);
  log(next, events, seat);
  return next;
}

async function main(): Promise<void> {
  const { seed, watch } = parseArgs(process.argv.slice(2));

  console.log(bold(cyan('\n  TidaliX')) + dim(`  ·  seed ${seed}\n`));
  console.log(dim('  The tide turns once per round. Play the phase, not just the card.'));
  if (!watch) console.log(HELP);

  let state = startGame(createGame({ seed })).state;
  const seat: PlayerId | null = watch ? null : YOU;
  const rl = createInterface({ input: stdin, output: stdout });

  try {
    while (state.winner === undefined) {
      if (watch || state.activePlayer !== YOU) {
        state = botTurn(state, state.activePlayer, seat);
        continue;
      }

      console.log(renderScreen(state, YOU, BOT));

      const answer = await rl.question(bold(yellow('  > ')));
      const command = parseCommand(answer, state);

      if (command.kind === 'quit') {
        console.log(dim('\n  The tide goes out without you.\n'));
        return;
      }
      if (command.kind === 'help') {
        console.log(HELP);
        continue;
      }
      if (command.kind === 'error') {
        if (command.message) console.log(red(`  ${command.message}`));
        continue;
      }

      const result = applyAction(state, command.action);
      if (!result.ok) {
        // The engine's rejection message is already player-facing.
        console.log(red(`  ${result.message}`));
        continue;
      }

      state = result.state;
      log(state, result.events, seat);
    }

    console.log('\n' + renderTide(state));
    console.log(
      dim(`\n  Replay this game with: npm run play -- --seed ${seed}\n`),
    );
  } finally {
    rl.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
