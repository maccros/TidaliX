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
  effectiveStats,
  getCard,
  tideEffectFor,
  type CardInstance,
  type EffectiveStats,
  type TidePhase,
} from '@tidalix/engine';

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
                    <td>{effect.energy ? `+${effect.energy}` : '—'}</td>
                    <td className="tidetable__note">
                      {effect.exposed ? 'exposed — takes bonus damage' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {(def.keywords?.length || def.traits?.length || def.spines) && (
          <section className="detail__section">
            <h3 className="detail__h">Traits and keywords</h3>
            <div className="detail__tags">
              {def.keywords?.map((k) => (
                <span key={k} className={`tag tag--${k}`}>
                  {k}
                </span>
              ))}
              {def.spines ? (
                <span className="tag tag--spines">spines {def.spines}</span>
              ) : null}
              {def.traits?.map((t) => (
                <span key={t} className="tag tag--trait">
                  {t}
                </span>
              ))}
            </div>
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
                  the pile&rsquo;s standing income to <b>+{release.incomeAfter} energy a turn</b>.
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
