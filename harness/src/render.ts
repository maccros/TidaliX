/**
 * Terminal rendering for the TidaliX harness.
 *
 * This is a *client*, not engine code: it reads `boardView` and `GameEvent[]`
 * and turns them into text. Keeping a second renderer alive alongside the future
 * React one is what stops UI assumptions leaking back into the engine.
 *
 * The whole point of the display is to make the tide legible — every card shows
 * what the phase is doing to it right now, next to what it says on the card.
 */

import {
  TIDE_CYCLE,
  boardView,
  conservedCount,
  nextTurnIncome,
  effectiveStats,
  getCard,
  type BoardCardView,
  type GameEvent,
  type GameState,
  type PlayerId,
  type TidePhase,
} from '@tidalix/engine';

/* ANSI, applied by hand so the harness stays dependency-free. */
const useColor = !process.env['NO_COLOR'] && process.stdout.isTTY !== false;
const ESC = '\u001b[';
const RESET = '\u001b[0m';
const wrap = (code: string) => (s: string) => (useColor ? `${ESC}${code}m${s}${RESET}` : s);

export const dim = wrap('2');
export const bold = wrap('1');
export const cyan = wrap('36');
export const blue = wrap('34');
export const green = wrap('32');
export const red = wrap('31');
export const yellow = wrap('33');
export const magenta = wrap('35');

const WIDTH = 66;
const NAME_COL = 26; // longest card name is 25 chars
const rule = (char = '─') => dim(char.repeat(WIDTH));

/** How each phase reads in the log and on the tide track. */
const PHASE_BLURB: Record<TidePhase, string> = {
  low: 'the flat is drained and exposed',
  rising: 'the flood carries plankton in',
  high: 'water covers the reef crest',
  falling: 'the flat empties into the channels',
};

/** Letters index your own board, digits index the enemy's — as typed in commands. */
export const OWN_LABELS = 'abcdefgh';

export function ownLabel(index: number): string {
  return OWN_LABELS[index] ?? '?';
}

/* -------------------------------------------------------------------------- */

/** The tide track, with the live phase called out and its energy payout. */
export function renderTide(state: GameState): string {
  const track = TIDE_CYCLE.map((phase) => {
    if (phase !== state.phase) return dim(phase);
    return bold(cyan(phase.toUpperCase()));
  }).join(dim(' ▸ '));

  const bonus = state.config.tideEnergy[state.phase];
  const payout = bonus > 0 ? green(`  +${bonus} energy`) : '';
  const meta = dim(`round ${state.round} · turn ${state.turn}`);

  return [
    rule('═'),
    `  ${track}${payout}`,
    `  ${dim(PHASE_BLURB[state.phase].padEnd(38))}${meta}`,
    rule('═'),
  ].join('\n');
}

/**
 * A card's stat block, annotated with what the tide is doing to it.
 * `4/3 ▲+1` means the phase is helping; `‼` means it is exposed to bonus damage.
 */
function statBlock(view: {
  attack: number;
  health: number;
  maxHealth: number;
  printedAttack: number;
  printedHealth: number;
  exposed: boolean;
}): string {
  const stats = `${view.attack}/${view.health}`.padEnd(6);
  const dAtk = view.attack - view.printedAttack;
  const dHp = view.maxHealth - view.printedHealth;

  const swing =
    dAtk === 0 && dHp === 0
      ? dim('  ·  ')
      : dAtk + dHp > 0
        ? green(`▲${fmt(dAtk)}/${fmt(dHp)}`)
        : red(`▼${fmt(dAtk)}/${fmt(dHp)}`);

  const exposed = view.exposed ? ' ' + red('‼ exposed') : '';
  return `${bold(stats)} ${swing}${exposed}`;
}

const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function tags(view: BoardCardView, showReady: boolean): string {
  const out: string[] = [];
  if (view.reefGuard) out.push(blue('reef-guard'));
  // Toxicity has to be legible before an attack is declared, not after.
  if (view.armour > 0) out.push(blue(`armour ${view.armour}`));
  if (view.armour > 0) out.push(blue(`armour ${view.armour}`));
  if (view.toxic) out.push(red('toxic'));
  if (view.toxinImmune) out.push(green('immune'));
  if (view.poisoned) out.push(red('POISONED'));
  if (showReady) out.push(view.canAttack ? green('ready') : dim('waiting'));
  // Only shown on your own side, where releasing is a move you can actually make.
  if (showReady) {
    out.push(
      view.mature ? green('releasable') : dim(`matures in ${view.stepsUntilMature}`),
    );
  }
  return out.length > 0 ? '  ' + out.join(dim(' · ')) : '';
}

function renderBoardRow(view: BoardCardView, label: string, showReady: boolean): string {
  return `    ${yellow(label)} ${view.name.padEnd(NAME_COL)} ${statBlock(view)}${tags(view, showReady)}`;
}

/** One player's side: life, energy, and every card on their board. */
export function renderSide(
  state: GameState,
  player: PlayerId,
  heading: string,
  labelFor: (index: number) => string,
  showReady: boolean,
): string {
  const p = state.players[player];
  const bonus = state.config.tideEnergy[state.phase];
  const flood =
    player === state.activePlayer && bonus > 0 ? dim(` (${p.energyCap} +${bonus} tide)`) : '';
  const saved = conservedCount(p);
  const conserved =
    saved > 0
      ? `   ${green(`❋ ${saved}`)}${dim(`/${state.config.conservationVictory}`)}`
      : '';
  const lines = [
    `  ${bold(heading.padEnd(10))} ${red(`♥ ${p.life}`)}   ${magenta(`⬡ ${p.energy}`)}${flood}${conserved}`,
  ];
  const views = boardView(state, player);
  if (views.length === 0) {
    lines.push(dim('    (no cards on the reef)'));
  } else {
    views.forEach((view, i) => lines.push(renderBoardRow(view, labelFor(i), showReady)));
  }
  return lines.join('\n');
}

/**
 * The energy income, itemised — this turn's receipt and next turn's forecast.
 *
 * The terminal cannot draw the client's panel, but it can still refuse to show a
 * bare total, and it must not repeat the client's old mistake of labelling the
 * *current* phase's figures "next turn". The forecast is priced in the phase the
 * player's next turn will actually open in, and says which phase that is.
 */
export function renderIncome(state: GameState, player: PlayerId): string {
  const collected = state.players[player].incomeThisTurn;
  const next = nextTurnIncome(state, player);
  const fmt = (lines: readonly { source: string; amount: number }[]) =>
    lines.length > 0 ? lines.map((l) => `${l.source} +${l.amount}`).join('  ') : 'nothing';
  const earned = collected.reduce((sum, l) => sum + l.amount, 0);
  return [
    dim(`  earned this turn:  ${fmt(collected)}  = ${earned}`),
    dim(`  next turn (${next.phase}): ${fmt(next.lines)}  ≈ ${next.total}`),
  ].join('\n');
}

/**
 * Your hand, priced against your current energy. Stats shown are what the card
 * would be *if played into this phase*, which is the decision you are making.
 */
export function renderHand(state: GameState, player: PlayerId): string {
  const p = state.players[player];
  if (p.hand.length === 0) return dim('  HAND  (empty)');

  const lines = [`  ${bold('HAND')}`];
  p.hand.forEach((inst, i) => {
    const def = getCard(inst.definitionId);
    const stats = effectiveStats(inst, state.phase, def);
    const affordable = def.cost <= p.energy;
    const cost = affordable ? magenta(`⬡${def.cost}`) : dim(`⬡${def.cost}`);
    const name = affordable ? def.name : dim(def.name);
    const keywords = def.keywords?.length ? '  ' + blue(def.keywords.join(' · ')) : '';

    const block = statBlock({
      attack: stats.attack,
      health: stats.maxHealth,
      maxHealth: stats.maxHealth,
      printedAttack: def.attack,
      printedHealth: def.health,
      exposed: stats.exposed,
    });

    lines.push(
      `    ${yellow(String(i + 1))} ${name.padEnd(NAME_COL)} ${cost}  ${block}${keywords}` +
        (affordable ? '' : dim('  (too expensive)')),
    );
  });
  return lines.join('\n');
}

/** The full screen for the human's decision point. */
export function renderScreen(state: GameState, you: PlayerId, them: PlayerId): string {
  return [
    '',
    renderTide(state),
    '',
    renderSide(state, them, 'OPPONENT', (i) => String(i + 1), false),
    '',
    rule(),
    '',
    renderSide(state, you, 'YOU', ownLabel, true),
    renderIncome(state, you),
    '',
    renderHand(state, you),
    '',
  ].join('\n');
}

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

/** Resolve an instance id to a card name by scanning every zone. */
function nameOf(state: GameState, instanceId: string): string {
  for (const p of state.players) {
    for (const zone of [p.board, p.hand, p.discard, p.conservation, p.deck]) {
      const found = zone.find((c) => c.instanceId === instanceId);
      if (found) return getCard(found.definitionId).name;
    }
  }
  return 'something';
}

/**
 * Turn an event into a line of narration, or null to stay quiet about it.
 * `you` is the human's seat, so the log can say "you" and "the AI"; pass null in
 * spectator mode, where neither side is the reader.
 */
export function describe(event: GameEvent, state: GameState, you: PlayerId | null): string | null {
  const isYou = (p: PlayerId) => you !== null && p === you;
  const who = (p: PlayerId) => (you === null ? `Player ${p}` : isYou(p) ? 'You' : 'The AI');
  const whose = (p: PlayerId) =>
    you === null ? `player ${p}'s` : isYou(p) ? 'your' : "the AI's";
  const s = (p: PlayerId) => (isYou(p) ? '' : 's');

  switch (event.type) {
    case 'TIDE_CHANGED':
      return bold(cyan(`~ The tide turns: ${event.from} → ${event.to} — ${PHASE_BLURB[event.to]}`));
    case 'CARD_PLAYED':
      return `${who(event.player)} play${s(event.player)} ${bold(getCard(event.definitionId).name)} ${dim(`(⬡${event.cost})`)}`;
    case 'DAMAGE_DEALT': {
      if (event.targetId === 'face') return null; // PLAYER_DAMAGED says it better
      const bonus = event.exposedBonus > 0 ? red(` (+${event.exposedBonus} exposed)`) : '';
      return `  ${nameOf(state, event.sourceId)} hits ${nameOf(state, event.targetId)} for ${bold(String(event.amount))}${bonus}`;
    }
    case 'PLAYER_DAMAGED':
      return `  ${who(event.player)} take${s(event.player)} ${bold(String(event.amount))} ${dim(`(♥ ${event.life})`)}`;
    case 'CARD_DESTROYED':
      return `  ${red('✖')} ${getCard(event.definitionId).name} ${dim(`(${whose(event.owner)})`)} is destroyed`;
    case 'SPECIES_RELEASED':
      return `  ${green('❋')} ${who(event.player)} release${s(event.player)} ${bold(getCard(event.definitionId).name)} back to the wild ${dim(`(${event.conserved} conserved)`)}`;
    case 'DECK_EMPTY':
      return dim(
        `  ${who(event.player)} draw${s(event.player)} from an empty deck: ${event.fatigueDamage} fatigue`,
      );
    case 'HAND_OVERFLOW':
      return dim(`  ${whose(event.player)} hand is full — a card is discarded`);
    case 'GAME_OVER': {
      const how = event.reason === 'conservation' ? ' The reef is saved.' : '';
      if (event.winner === null) return bold(yellow('\n  The reef takes them both. A draw.'));
      if (you === null) return bold(cyan(`\n  ✦ Player ${event.winner} wins.${how}`));
      return event.winner === you
        ? bold(green(`\n  ✦ You win. The reef is yours.${how}`))
        : bold(red(`\n  ✧ The AI wins.${how}`));
    }
    default:
      return null; // turn/energy/draw churn stays out of the log
  }
}

export function renderEvents(events: GameEvent[], state: GameState, you: PlayerId | null): string {
  return events
    .map((e) => describe(e, state, you))
    .filter((line): line is string => line !== null)
    .join('\n');
}

export const HELP = `
  ${bold('Commands')}
    ${yellow('p')} <n> [t]      play card n from your hand      ${dim('e.g. p 2  /  p 2 1')}
                    a card that strikes on arrival takes an enemy number
    ${yellow('a')} <x> <t>      attack with your card x         ${dim('e.g. a b 1  /  a b face')}
                    target a numbered enemy card, or ${yellow('face')}
    ${yellow('r')} <x>          release your card x to conservation  ${dim('e.g. r b')}
    ${yellow('e')}              end your turn
    ${yellow('?')}              show this help
    ${yellow('q')}              quit

  ${dim('Your cards are lettered, the enemy’s are numbered.')}
  ${dim('Stat swings: ▲ the tide favours this card, ▼ it does not, ‼ exposed to bonus damage.')}
  ${dim('Every defender strikes back. Armour subtracts from every hit a card takes.')}
  ${dim('A species that has survived a whole tide cycle can be released to the wild:')}
  ${dim('it leaves the reef for good, pays a standing income, and counts toward a win.')}
`;
