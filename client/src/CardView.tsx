/**
 * A card, drawn so the player can actually read the animal.
 *
 * The whole reason this client exists is that a terminal cannot show *why* a
 * card's numbers are what they are. So every card carries its breakdown: the
 * base line, what the tide is doing to it, and what its neighbours are doing to
 * it, as separate, legible facts.
 *
 * This is still only a summary of the current phase. Right-click (or long-press)
 * opens `CardDetail`, which lays out the whole tide line at once.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import {
  getCard,
  type ArrivalEffect,
  type CardDefinition,
  type CardInstance,
  type EffectiveStats,
  type Keyword,
  type TidePhase,
} from '@tidalix/engine';

import { SpeciesArt } from './SpeciesArt.tsx';


export type CardState =
  | 'idle'
  | 'playable'
  | 'unaffordable'
  | 'ready'
  | 'selected'
  | 'target'
  /** Has attacked already this turn. */
  | 'spent'
  /**
   * Has no attack to spend in the first place — a coral, an anemone, the clam.
   * Kept distinct from `spent` because these are the cards that hold the reef's
   * symbiosis together, and dimming them like used-up attackers hid every
   * relationship on the board behind the cards that grant them.
   */
  | 'support';

export interface CardViewProps {
  instance: CardInstance;
  stats: EffectiveStats;
  phase: TidePhase;
  state: CardState;
  /** Highlighted because it is symbiotically linked to the hovered card. */
  linked?: boolean;
  facedown?: boolean;
  /** Matured on your reef and eligible to be released this turn. */
  releasable?: boolean;
  /**
   * The coming tide kills it on its own. Worth shouting about: it is the one
   * loss a player can still do something about, and the one they would otherwise
   * only discover after it happened.
   */
  dying?: boolean;
  onClick?: () => void;
  /** Open the full card. Bound to right-click and long-press, never to a tap. */
  onInspect?: () => void;
  onHover?: (instanceId: string | null) => void;
  registerRef?: (instanceId: string, el: HTMLElement | null) => void;
}

/** How long a press must be held on touch before it counts as an inspect. */
const LONG_PRESS_MS = 450;

/**
 * What each keyword actually does, as a tooltip.
 *
 * Keywords render from `def.keywords` alone — one tag per keyword, no exceptions.
 * Hand-writing a second tag for a keyword that is already in that list is how
 * `toxic` and `toxin-immune` ended up printed twice on every card carrying them.
 */
/**
 * How each arrival reads on the card face.
 *
 * Phrased as what the animal does on arrival, in the imperative, because that is
 * the decision the player is making when they choose to play it now rather than
 * hold it.
 */
const ARRIVAL_LABEL: Record<ArrivalEffect['kind'], (n: number) => string> = {
  strike: (n) => `On arrival: ${n} damage to an enemy`,
  sweep: (n) => `On arrival: ${n} to every enemy`,
  mend: (n) => `On arrival: heal your reef ${n}`,
  forage: (n) => `On arrival: ⬡+${n}`,
  scout: (n) => `On arrival: draw ${n}`,
};

const KEYWORD_TITLE: Record<Keyword, string> = {
  surge: 'may attack the turn it is played',
  'reef-guard': 'enemies must attack this before anything behind it',
  toxic: 'kills whatever destroys it in combat, unless that animal is immune',
  'toxin-immune': 'can destroy a toxic animal and survive it',
  pierce: 'its damage ignores armour completely',
};

const sign = (n: number) => (n > 0 ? `+${n}` : `${n}`);

/** Attack and health deltas as one compact "+1/+2" string, or null if flat. */
function deltaLabel(bonus: { attack?: number; health?: number }): string | null {
  const a = bonus.attack ?? 0;
  const h = bonus.health ?? 0;
  if (a === 0 && h === 0) return null;
  return `${sign(a)}/${sign(h)}`;
}

export function CardView({
  instance,
  stats,
  phase,
  state,
  linked = false,
  facedown = false,
  releasable = false,
  dying = false,
  onClick,
  onInspect,
  onHover,
  registerRef,
}: CardViewProps) {
  const def: CardDefinition = getCard(instance.definitionId);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressFired = useRef(false);

  const cancelPress = () => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  useEffect(() => cancelPress, []);

  if (facedown) {
    return <div className="card card--back" aria-label="Opponent card" />;
  }

  const tide = deltaLabel(stats.tideBonus);
  const symbiosis = deltaLabel(stats.symbiosisBonus);
  const toxic = def.keywords?.includes('toxic') ?? false;
  const interactive = state === 'playable' || state === 'ready' || state === 'target';
  /**
   * Only a card you cannot pay for refuses a click.
   *
   * Everything else stays clickable, because a click no longer means only "act
   * with this" — it also means "show me this card's relationships", and the
   * cards whose relationships matter most are the corals, which can never
   * attack and were being marked inert. The caller decides what a click means;
   * this only refuses the one case that is never anything.
   */
  const inert = state === 'unaffordable';

  const classes = [
    'card',
    `card--${state}`,
    interactive || state === 'selected' ? 'is-actionable' : '',
    `card--phase-${phase}`,
    linked ? 'is-linked' : '',
    stats.exposed ? 'is-exposed' : '',
    releasable ? 'is-releasable' : '',
    dying ? 'is-dying' : '',
    instance.poisoned ? 'is-poisoned' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ '--phase': `var(--${phase})` } as CSSProperties}
      onClick={() => {
        // A long-press already opened the detail view; do not also play the card.
        if (pressFired.current) {
          pressFired.current = false;
          return;
        }
        if (!inert) onClick?.();
      }}
      onContextMenu={(e) => {
        if (!onInspect) return;
        e.preventDefault();
        onInspect();
      }}
      onPointerDown={(e) => {
        if (!onInspect || e.pointerType !== 'touch') return;
        pressFired.current = false;
        pressTimer.current = setTimeout(() => {
          pressFired.current = true;
          onInspect();
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      aria-disabled={inert}
      onMouseEnter={() => onHover?.(instance.instanceId)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(instance.instanceId)}
      onBlur={() => onHover?.(null)}
      ref={(el) => registerRef?.(instance.instanceId, el)}
      aria-label={[
        def.name,
        `${stats.attack} attack`,
        `${stats.health} health`,
        toxic ? 'toxic' : '',
        dying ? 'dying at the next tide' : '',
        state === 'support' ? 'no attack this phase' : '',
      ]
        .filter(Boolean)
        .join(', ')}
    >
      <header className="card__top">
        <span className="card__cost">{def.cost}</span>
        <span className="card__title">
          <span className="card__name">{def.name}</span>
          <i className="card__species">{def.species}</i>
        </span>
      </header>

      <div className="card__art">
        <SpeciesArt definitionId={def.id} />
      </div>

      <p className="card__text">{def.text}</p>

      <div className="card__tags">
        {def.keywords?.map((k) => (
          <span key={k} className={`tag tag--${k}`} title={KEYWORD_TITLE[k]}>
            {k}
          </span>
        ))}
        {stats.spines > 0 && (
          <span className="tag tag--spines" title="damages anything that attacks it, on top of its attack">
            spines {stats.spines}
          </span>
        )}
        {stats.armour > 0 && (
          <span className="tag tag--armour" title="reduces every incoming hit by this much">
            armour {stats.armour}
          </span>
        )}
        {stats.energy > 0 && (
          <span className="tag tag--energy" title="generates energy each turn">
            ⬡+{stats.energy}
          </span>
        )}
        {releasable && (
          <span className="tag tag--release" title="matured — can be released to conservation">
            releasable
          </span>
        )}
        <span className={`tag tag--niche tag--niche-${def.niche}`}>{def.niche}</span>
      </div>

      {def.arrival && (
        <p className="card__arrival">
          <span className="card__arrival-mark">▸</span>
          <b>{ARRIVAL_LABEL[def.arrival.kind](def.arrival.amount)}</b>
          <span className="card__arrival-note">{def.arrival.note}</span>
        </p>
      )}

      {def.auras?.map((aura, i) => (
        <p key={i} className="card__aura">
          <span className="card__aura-arrow">→</span> {aura.affects}{' '}
          <b>{deltaLabel(aura.grants)}</b>
          <span className="card__aura-note">{aura.note}</span>
        </p>
      ))}

      <footer className="card__stats">
        <span className="stat stat--attack" title="attack">
          {stats.attack}
        </span>
        <span className="card__breakdown">
          <span className="card__printed" title="the card's own stats, before tide and symbiosis">
            base {def.attack}/{def.health}
          </span>
          {tide && (
            <span className="chip chip--tide" title={`${phase} tide`}>
              tide {tide}
            </span>
          )}
          {symbiosis && (
            <span className="chip chip--symbiosis" title="from neighbouring cards">
              symbiosis {symbiosis}
            </span>
          )}
          {stats.exposed && (
            <span className="chip chip--exposed" title="takes +1 damage from attacks">
              exposed
            </span>
          )}
          {dying && (
            <span className="chip chip--dying" title="the coming tide kills it on its own">
              dying
            </span>
          )}
          {instance.poisoned && (
            <span className="chip chip--poisoned" title="poisoned — it dies as the board settles">
              poisoned
            </span>
          )}
        </span>
        <span className="stat stat--health" title="health">
          {stats.health}
          {instance.damage > 0 && <small>/{stats.maxHealth}</small>}
        </span>
      </footer>
    </button>
  );
}
