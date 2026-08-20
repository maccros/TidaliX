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
  TAXON_LABEL,
  TIDE_CYCLE,
  TRAIT_NOTE,
  auraSourcesFor,
  type ArrivalEffect,
  effectiveStats,
  getCard,
  tideEffectFor,
  type CardInstance,
  type EffectiveStats,
  type Keyword,
  type TidePhase,
} from '@tidalix/engine';

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
  /** Release readiness, for a card on your own board. */
  release?: {
    mature: boolean;
    stepsRemaining: number;
    allowedThisTurn: boolean;
    /** Whether this card's lineage is already in the pile. */
    lineageHeld: boolean;
    /** Standing income the pile would pay after releasing it. */
    incomeAfter: number;
  } | null;
  onClose: () => void;
}

const KEYWORD_TEXT: Record<Keyword, string> = {
  surge: 'May attack the turn it is played, instead of waiting a turn.',
  'reef-guard': 'Enemies must deal with this before they can attack anything behind it, your face included.',
  toxic: 'Destroy it by attacking and your attacker dies too — eating it is what kills you. Wounding it costs nothing extra.',
  'toxin-immune': 'Can destroy a toxic animal and survive it. Immunity is to the venom, not to the wound.',
};

const ARRIVAL_TEXT: Record<ArrivalEffect['kind'], (n: number) => string> = {
  strike: (n) => `Deal ${n} damage to an enemy creature.`,
  sweep: (n) => `Deal ${n} damage to every enemy creature.`,
  mend: (n) => `Heal ${n} damage from every friendly creature.`,
  forage: (n) => `Gain ${n} energy immediately.`,
  scout: (n) => `Draw ${n} card${n === 1 ? '' : 's'}.`,
};

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

function deltaLabel(bonus: { attack?: number; health?: number }): string | null {
  const a = bonus.attack ?? 0;
  const h = bonus.health ?? 0;
  if (a === 0 && h === 0) return null;
  return `${sign(a)}/${sign(h)}`;
}

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
                      {effect.exposed ? 'exposed — takes bonus damage' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {def.arrival && (
          <section className="detail__section">
            <h3 className="detail__h">On arrival</h3>
            <p className="detail__arrival">
              <b>{ARRIVAL_TEXT[def.arrival.kind](def.arrival.amount)}</b>
              <span className="detail__arrivalnote">{def.arrival.note}</span>
            </p>
            <p className="detail__arrivalrule">
              Resolves the moment the card is played, before anything else happens — which
              is what lets a card answer a board rather than merely join one. It does not let
              the card attack: that still waits a turn unless it has <em>surge</em>.
            </p>
          </section>
        )}

        {(def.keywords?.length || def.traits?.length || def.armour || def.spines) && (
          <section className="detail__section">
            <h3 className="detail__h">Traits and keywords</h3>
            <dl className="detail__glossary">
              {def.keywords?.map((k) => (
                <div key={k} className="detail__entry">
                  <dt>
                    <span className={`tag tag--${k}`}>{k}</span>
                  </dt>
                  <dd>{KEYWORD_TEXT[k]}</dd>
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

              {/* Every trait is explained, and — more usefully — says what in the
                  set actually reads it. A trait nothing reads is decoration, and
                  the player deserves to be able to tell which is which. */}
              {def.traits?.map((t) => {
                const readers = auraSourcesFor(t).filter((r) => r.card.id !== def.id);
                return (
                  <div key={t} className="detail__entry">
                    <dt>
                      <span className="tag tag--trait">{t}</span>
                    </dt>
                    <dd>
                      {TRAIT_NOTE[t]}
                      {readers.length > 0 ? (
                        <span className="detail__readers">
                          Read by{' '}
                          {readers.map((r, i) => (
                            <span key={r.card.id}>
                              {i > 0 ? ', ' : ''}
                              <b>{r.card.name}</b> ({deltaLabel(r.aura.grants)})
                            </span>
                          ))}
                          .
                        </span>
                      ) : (
                        <span className="detail__readers">
                          Nothing in the set reads this yet — on this card it is description, not
                          a rule.
                        </span>
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {(def.keywords?.includes('toxic') || def.keywords?.includes('toxin-immune')) && (
          <section className="detail__section">
            <h3 className="detail__h">Toxin</h3>
            {def.keywords?.includes('toxic') && (
              <p className="detail__toxin">
                <b>Toxic.</b> Anything that destroys this animal by attacking it dies too —
                eating it is what kills you. A predator with <em>toxin-immune</em> is the
                exception, and so is anything that merely wounds it: the toxin only answers a
                kill.
              </p>
            )}
            {def.keywords?.includes('toxin-immune') && (
              <p className="detail__toxin">
                <b>Toxin-immune.</b> It can destroy a <em>toxic</em> animal and swim away. Spines
                still hurt it — immunity is to the venom, not to the wound.
              </p>
            )}
          </section>
        )}

        {def.auras && def.auras.length > 0 && (
          <section className="detail__section">
            <h3 className="detail__h">Symbiosis it offers</h3>
            <ul className="detail__auras">
              {def.auras.map((aura, i) => (
                <li key={i}>
                  <b>{deltaLabel(aura.grants)}</b> to friendly <em>{aura.affects}</em>
                  <span className="detail__auranote">{aura.note}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {stats && (
          <section className="detail__section">
            <h3 className="detail__h">Right now</h3>
            <dl className="detail__grid">
              <dt>Base</dt>
              <dd>
                {def.attack} / {def.health}
              </dd>
              <dt>Tide ({phase})</dt>
              <dd>{deltaLabel(stats.tideBonus) ?? 'no change'}</dd>
              <dt>Symbiosis</dt>
              <dd>{deltaLabel(stats.symbiosisBonus) ?? 'none active'}</dd>
              {instance.damage > 0 && (
                <>
                  <dt>Damage</dt>
                  <dd className="down">−{instance.damage}</dd>
                </>
              )}
              <dt>Live</dt>
              <dd className="detail__live">
                {stats.attack} / {stats.health}
                {instance.damage > 0 && <small> of {stats.maxHealth}</small>}
              </dd>
            </dl>
          </section>
        )}

        {zone === 'board' && release && (
          <section className="detail__section">
            <h3 className="detail__h">Conservation</h3>
            <p className="detail__release">
              {release.mature ? (
                release.allowedThisTurn ? (
                  <span className="good">Ready to release.</span>
                ) : (
                  <span>Ready, but you have already released a species this turn.</span>
                )
              ) : (
                <>
                  Needs {release.stepsRemaining} more tide{' '}
                  {release.stepsRemaining === 1 ? 'phase' : 'phases'} on the reef first.
                </>
              )}
            </p>
            {/* What the release is worth, which is the part that is easy to get
                wrong: the pile pays for lineages, so a second fish pays nothing. */}
            <p className="detail__lineage">
              {release.lineageHeld ? (
                <>
                  You already protect <b>{TAXON_LABEL[def.taxon]}</b>. Releasing this adds a
                  species to the pile but no income — the pile pays per lineage.
                </>
              ) : (
                <>
                  A lineage you do not hold: <b>{TAXON_LABEL[def.taxon]}</b>. Releasing it takes
                  the pile&rsquo;s standing income to <b>⬡+{release.incomeAfter} a turn</b>.
                </>
              )}
            </p>
          </section>
        )}

        {zone === 'conservation' && (
          <section className="detail__section">
            <p className="detail__release good">
              Released back to the wild, protecting the <b>{TAXON_LABEL[def.taxon]}</b> lineage.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
