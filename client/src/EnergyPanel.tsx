/**
 * Where your energy comes from, itemised — and where next turn's will.
 *
 * The panel is split in two on purpose, because the two halves answer different
 * questions and used to be conflated into one misleading number. The top half is
 * a *receipt*: what actually arrived this turn, which is history and cannot
 * change. The bottom half is a *forecast* for a turn that has not happened yet,
 * and critically it is priced in the phase that turn will open in — the tide
 * will have moved by then, and it moves the two largest lines with it.
 *
 * Both halves come from the engine, from the same call the resolver pays out of,
 * so what is shown here and what lands in the bank cannot drift apart.
 */

import {
  nextTurnIncome,
  type EnergyIncomeLine,
  type EnergySource,
  type GameState,
  type PlayerId,
} from '@tidalix/engine';

const SOURCE_LABEL: Record<EnergySource, string> = {
  turn: 'Base capacity',
  carried: 'Carried over',
  tide: 'Tide',
  card: 'Species',
  conservation: 'Conservation',
};

export interface EnergyPanelProps {
  state: GameState;
  player: PlayerId;
}

function Lines({ lines }: { lines: readonly EnergyIncomeLine[] }) {
  if (lines.length === 0) return <li className="energy__line energy__line--none">nothing</li>;
  return (
    <>
      {lines.map((line) => (
        <li key={line.source} className={`energy__line energy__line--${line.source}`}>
          <span className="energy__amount">⬡+{line.amount}</span>
          <span className="energy__label">{SOURCE_LABEL[line.source]}</span>
          <span className="energy__detail">{line.detail}</span>
        </li>
      ))}
    </>
  );
}

const total = (lines: readonly EnergyIncomeLine[]) => lines.reduce((sum, l) => sum + l.amount, 0);

export function EnergyPanel({ state, player }: EnergyPanelProps) {
  const collected = state.players[player].incomeThisTurn;
  const next = nextTurnIncome(state, player);
  const now = state.players[player].energy;
  const spent = total(collected) - now;

  return (
    <section className="energy" aria-label="Energy">
      <header className="energy__head">
        <span className="energy__now" title="energy available to spend right now">
          ⬡ {now}
        </span>
        <span className="energy__nowlabel">to spend now</span>
      </header>

      <div className="energy__block energy__block--past">
        <h3 className="energy__h">
          Earned this turn
          <b className="energy__sum">⬡+{total(collected)}</b>
        </h3>
        <ul className="energy__lines">
          <Lines lines={collected} />
        </ul>
        {spent > 0 && <p className="energy__spent">{spent} spent so far.</p>}
      </div>

      <div className="energy__block energy__block--next">
        <h3 className="energy__h">
          Next turn, at the <em className={`energy__phase energy__phase--${next.phase}`}>{next.phase}</em> tide
          <b className="energy__sum">≈⬡{next.total}</b>
        </h3>
        <ul className="energy__lines">
          <Lines lines={next.lines} />
        </ul>
        <p className="energy__caveat">
          An estimate: your reef has to survive the opponent&rsquo;s turn, and what you carry over
          falls as you spend.
        </p>
      </div>
    </section>
  );
}
