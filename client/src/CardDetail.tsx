/**
 * The full card, opened on demand.
 *
 * The board card is a summary — it shows what a species is *right now*. This is
 * the other half: the whole tide line laid out at once, so a player can see that
 * the manta they are holding is worthless at low water and a monster at high,
 * and plan around it rather than discovering it.
 *
 * It is deliberately a read-only surface. Nothing here takes a game action, so
 * opening a card can never cost you a turn — which is what lets it be bound to a
 * gesture as casual as a right-click.
 */

import { useEffect, useRef } from 'react';
import {
  DEFAULT_CONFIG,
  TAXON_LABEL,
  TIDE_CYCLE,
  NICHE_NOTE,
  type ArrivalEffect,
  effectiveStats,
  getCard,
  tideEffectFor,
  type CardInstance,
  type EffectiveStats,
  type Keyword,
  type TidePhase,
} from '@tidalix/engine';

import { NIL, deltaLabel, deltaPair, pair, sign } from './format.ts';
import { SpeciesArt } from './SpeciesArt.tsx';


export interface CardDetailProps {
  instance: CardInstance;
  /** The live phase, highlighted in the tide table. */
  phase: TidePhase;
  /**
   * The card's current stats in context. Null for a card in hand, which has no
   * neighbours yet and so has no symbiosis to report.
   */
  stats: EffectiveStats | null;
  /** Where the card is, which decides what is worth explaining. */
  zone: 'hand' | 'board' | 'conservation';
  /** Release readiness. Read the same way for a card on either board. */
  release?: {
    mature: boolean;
    stepsRemaining: number;
  } | null;
  onClose: () => void;
}

const TRAIT_TEXT: Record<Keyword, string> = {
  surge: 'May attack the turn it is played, instead of waiting a turn.',
  'reef-guard': 'Enemies must deal with this before they can attack anything behind it, your face included.',
  toxic: 'Kill it in combat, whichever side of the bite you were on, and whatever landed the blow dies too. Wounding it costs nothing extra.',
  'toxin-immune': 'Can destroy a toxic animal and survive it. Immunity is to the venom, not to the wound.',
  pierce: 'Its damage ignores armour completely — the answer to something that has become unkillable behind a shell.',
};

/**
 * Same syntax as the card face: the kind name, then the icon and its number.
 * The full card used to spell the amount out in words instead of a symbol,
 * which meant the same effect read two different ways depending where you saw
 * it — the one thing the interface grammar rules out.
 */
const ARRIVAL_EFFECT: Record<ArrivalEffect['kind'], (n: number) => string> = {
  strike: (n) => `♥-${n}`,
  sweep: (n) => `♥-${n}`,
  mend: (n) => `♥+${n}`,
  forage: (n) => `⬡+${n}`,
  scout: (n) => `+${n} card${n === 1 ? '' : 's'}`,
};

/** Who it lands on. Four distinct answers, and never a redundant one. */
const ARRIVAL_TARGET: Record<ArrivalEffect['kind'], string> = {
  strike: 'one enemy',
  sweep: 'every enemy',
  mend: 'your reef',
  forage: 'you',
  scout: 'you',
};

/** Arrivals that land on the other side of the channel, marked as such. */
const ARRIVAL_HOSTILE: Record<ArrivalEffect['kind'], boolean> = {
  strike: true,
  sweep: true,
  mend: false,
  forage: false,
  scout: false,
};

export function CardDetail({ instance, phase, stats, zone, release, onClose }: CardDetailProps) {
  const def = getCard(instance.definitionId);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Escape closes, and focus lands inside the dialog so keyboard users are not
  // stranded behind it.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="detail__scrim" onClick={onClose} role="presentation">
      <div
        className={`detail detail--phase-${phase}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${def.name} card details`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail__head">
          <span className="detail__cost" title="energy cost">
            {def.cost}
          </span>
          <span className="detail__title">
            <b className="detail__name">{def.name}</b>
            <i className="detail__species">{def.species}</i>
            <span className="detail__taxon">{TAXON_LABEL[def.taxon]}</span>
          </span>
          <button
            type="button"
            className="detail__close"
            onClick={onClose}
            ref={closeRef}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="detail__art">
          <SpeciesArt definitionId={def.id} className="art art--large" />
        </div>

        {def.text && <p className="detail__text">{def.text}</p>}

        <section className="detail__section">
          <h3 className="detail__h">Through the tide</h3>
          <table className="tidetable">
            <thead>
              <tr>
                <th>Phase</th>
                <th>Attack</th>
                <th>Health</th>
                <th>Energy</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {TIDE_CYCLE.map((p) => {
                const effect = tideEffectFor(def, p);
                // Printed stats plus this phase's line — symbiosis is excluded on
                // purpose, since it depends on a board this card may not be on.
                const alone = effectiveStats(
                  { ...instance, damage: 0 },
                  p,
                  def,
                  [],
                );
                const dA = effect.attack ?? 0;
                const dH = effect.health ?? 0;
                return (
                  <tr key={p} className={p === phase ? 'is-now' : ''}>
                    <th scope="row" className={`tidetable__phase tidetable__phase--${p}`}>
                      {p}
                      {p === phase && <span className="tidetable__now">now</span>}
                    </th>
                    <td>
                      {alone.attack}
                      {dA !== 0 && <small className={dA > 0 ? 'up' : 'down'}> {sign(dA)}</small>}
                    </td>
                    <td>
                      {alone.maxHealth}
                      {dH !== 0 && <small className={dH > 0 ? 'up' : 'down'}> {sign(dH)}</small>}
                    </td>
                    <td>{effect.energy ? `⬡+${effect.energy}` : '—'}</td>
                    <td className="tidetable__note">
                      {effect.exposed ? `exposed — every hit on it deals +${DEFAULT_CONFIG.exposedBonusDamage}` : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {(def.keywords?.length || def.armour || def.spines || def.niche) && (
          <section className="detail__section">
            <h3 className="detail__h">Niche and traits</h3>
            <dl className="detail__glossary">
              {/* Niche first: the category, before anything the animal does. */}
              <div className="detail__entry">
                <dt>
                  <span className={`tag tag--niche tag--niche-${def.niche}`}>{def.niche}</span>
                </dt>
                <dd>{NICHE_NOTE[def.niche]}</dd>
              </div>

              {def.keywords?.map((k) => (
                <div key={k} className="detail__entry">
                  <dt>
                    <span className={`tag tag--${k}`}>{k}</span>
                  </dt>
                  <dd>{TRAIT_TEXT[k]}</dd>
                </div>
              ))}

              {def.armour ? (
                <div className="detail__entry">
                  <dt>
                    <span className="tag tag--armour">armour {def.armour}</span>
                  </dt>
                  <dd>
                    Comes off the top of every hit it takes, from attacks and retaliation alike.
                    Damage never goes below zero.
                  </dd>
                </div>
              ) : null}

              {def.spines ? (
                <div className="detail__entry">
                  <dt>
                    <span className="tag tag--spines">spines {def.spines}</span>
                  </dt>
                  <dd>
                    Dealt back to anything that attacks it, on top of whatever it returns by
                    fighting. This animal has no attack, so its spines are its whole answer.
                  </dd>
                </div>
              ) : null}

            </dl>
          </section>
        )}

        {def.arrival && (
          <section className="detail__section">
            <h3 className="detail__h">Dash</h3>
            <p className="detail__arrival">
              <span className="detail__arrival-mark">▸</span>
              <span className="detail__linelabel">{def.arrival.kind}</span>
              <b>{ARRIVAL_EFFECT[def.arrival.kind](def.arrival.amount)}</b>
              <span className="detail__to">to</span>
              <span
                className={`detail__target${
                  ARRIVAL_HOSTILE[def.arrival.kind] ? ' detail__target--hostile' : ''
                }`}
              >
                {ARRIVAL_TARGET[def.arrival.kind]}
              </span>
              <span className="detail__arrivalnote">{def.arrival.note}</span>
            </p>
          </section>
        )}

        {def.auras && def.auras.length > 0 && (
          <section className="detail__section">
            <h3 className="detail__h">Symbiosis gift</h3>
            {/* One shape per line: what it gives, who to, how far it reaches.
                The niche wears the same badge it wears everywhere else, so the
                line points at something the player can find on a card. */}
            <ul className="detail__auras">
              {def.auras.map((aura, i) => (
                <li key={i}>
                  <b>{deltaLabel(aura.grants)}</b>
                  <span className="detail__to">to</span>
                  <span className={`tag tag--niche tag--niche-${aura.affects}`}>{aura.affects}</span>
                  <span className={`detail__target${aura.crossesWaterline ? ' detail__target--hostile' : ''}`}>
                    {aura.crossesWaterline ? 'both reefs' : 'your reef'}
                  </span>
                  <span className="detail__auranote">{aura.note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats && (
          <section className="detail__section">
            <h3 className="detail__h">Live stats</h3>
            <dl className="detail__grid">
              <dt>Base</dt>
              <dd className="num">{pair(def.attack, def.health)}</dd>
              <dt>Tide ({phase})</dt>
              <dd className="num">
                {stats.tideBonus.attack || stats.tideBonus.health
                  ? deltaPair(stats.tideBonus.attack ?? 0, stats.tideBonus.health ?? 0)
                  : NIL}
              </dd>
              <dt>Symbiosis</dt>
              <dd className="num">
                {stats.symbiosisBonus.attack || stats.symbiosisBonus.health
                  ? deltaPair(stats.symbiosisBonus.attack ?? 0, stats.symbiosisBonus.health ?? 0)
                  : NIL}
              </dd>
              {instance.damage > 0 && (
                <>
                  <dt>Damage</dt>
                  {/* Damage only ever comes off health, and saying which half it
                      takes keeps the column a sum rather than a list. */}
                  <dd className="num down">{deltaPair(0, -instance.damage)}</dd>
                </>
              )}
              <dt>Total</dt>
              {/* The two halves carry the colours they carry on the card face:
                  ochre for attack, deep blue for health. This row is the same
                  number the player reads off the bottom of the card, so it has
                  to be the same colour there too. */}
              <dd className="num detail__live">
                <span className="stat--attack">{stats.attack}</span>
                <span className="detail__slash"> / </span>
                <span className="stat--health">{stats.health}</span>
                {instance.damage > 0 && <small> of {stats.maxHealth}</small>}
              </dd>
            </dl>
          </section>
        )}

        {zone === 'board' && release && (
          <section className="detail__section">
            <h3 className="detail__h">Conservation</h3>
            {/* One fact, worded the same on either reef: when this card can
                leave. Everything else that was here said something already on
                screen — the taxon under its name, the pile's income in the
                conservation panel — or explained the rule instead of
                reporting the state. */}
            <dl className="detail__grid">
              <dt>Release</dt>
              <dd>
                {release.mature
                  ? 'Ready'
                  : `In ${release.stepsRemaining} more tide ${
                      release.stepsRemaining === 1 ? 'phase' : 'phases'
                    }`}
              </dd>
            </dl>
          </section>
        )}

        {zone === 'conservation' && (
          <section className="detail__section">
            <h3 className="detail__h">Conservation</h3>
            <dl className="detail__grid">
              <dt>Release</dt>
              <dd className="good">Released back to the wild</dd>
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}
