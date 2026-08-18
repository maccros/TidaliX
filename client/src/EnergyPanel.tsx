/**
 * Where your energy comes from, itemised.
 *
 * An income you cannot account for is an income you cannot plan around, and this
 * game now has five separate sources feeding one number. So none of them are
 * summarised away: every line names itself, says what it paid, and says why.
 *
 * The figures come straight from `energyIncome` in the engine — the same
 * function the resolver pays out of — so what is shown here and what lands in
 * the bank cannot drift apart.
 */

import { energyIncome, type EnergySource, type GameState, type PlayerId } from '@tidalix/engine';

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

export function EnergyPanel({ state, player }: EnergyPanelProps) {
  const income = energyIncome(state, player);
  const now = state.players[player].energy;
  const cycles = Math.floor(state.tideStep / 4);
  const stepsToNextCycle = 4 - (state.tideStep % 4);
  const atCeiling = state.players[player].energyCap >= state.config.maxEnergyCap;

  return (
    <section className="energy" aria-label="Energy income">
      <header className="energy__head">
        <span className="energy__now" title="energy available right now">
          ⬡ {now}
        </span>
        <span className="energy__next">next turn ≈ {income.total}</span>
      </header>

      <ul className="energy__lines">
        {income.lines.map((line) => (
          <li key={line.source} className={`energy__line energy__line--${line.source}`}>
            <span className="energy__amount">+{line.amount}</span>
            <span className="energy__label">{SOURCE_LABEL[line.source]}</span>
            <span className="energy__detail">{line.detail}</span>
          </li>
        ))}
      </ul>

      <p className="energy__ramp">
        {atCeiling ? (
          <>Base capacity is at its ceiling of {state.config.maxEnergyCap}.</>
        ) : (
          <>
            {cycles} complete tide {cycles === 1 ? 'cycle' : 'cycles'} · capacity rises to{' '}
            <b>{state.players[player].energyCap + 1}</b> in {stepsToNextCycle}{' '}
            {stepsToNextCycle === 1 ? 'phase' : 'phases'}
          </>
        )}
      </p>
    </section>
  );
}
