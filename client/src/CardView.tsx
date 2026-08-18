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
  type CardDefinition,
  type CardInstance,
  type EffectiveStats,
  type TidePhase,
} from '@tidalix/engine';

export type CardState =
  | 'idle'
  | 'playable'
  | 'unaffordable'
  | 'ready'
  | 'selected'
  | 'target'
  | 'spent';

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
  onClick?: () => void;
  /** Open the full card. Bound to right-click and long-press, never to a tap. */
  onInspect?: () => void;
  onHover?: (instanceId: string | null) => void;
  registerRef?: (instanceId: string, el: HTMLElement | null) => void;
}

/** How long a press must be held on touch before it counts as an inspect. */
const LONG_PRESS_MS = 450;

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
  const interactive = state === 'playable' || state === 'ready' || state === 'target';
  // Not `disabled`: a disabled button swallows pointer events, and inspecting a
  // card has to work on every card — including the opponent's and your own spent
  // ones. The click handler enforces playability instead.
  const inert = !interactive && state !== 'selected';

  const classes = [
    'card',
    `card--${state}`,
    `card--phase-${phase}`,
    linked ? 'is-linked' : '',
    stats.exposed ? 'is-exposed' : '',
    releasable ? 'is-releasable' : '',
    def.type === 'structure' ? 'card--structure' : '',
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
      aria-label={`${def.name}, ${stats.attack} attack, ${stats.health} health`}
    >
      <header className="card__top">
        <span className="card__cost">{def.cost}</span>
        <span className="card__title">
          <span className="card__name">{def.name}</span>
          <i className="card__species">{def.species}</i>
        </span>
      </header>

      <p className="card__text">{def.text}</p>

      <div className="card__tags">
        {def.keywords?.map((k) => (
          <span key={k} className={`tag tag--${k}`}>
            {k}
          </span>
        ))}
        {stats.spines > 0 && (
          <span className="tag tag--spines" title="damages anything that attacks it">
            spines {stats.spines}
          </span>
        )}
        {stats.energy > 0 && (
          <span className="tag tag--energy" title="generates energy each turn">
            +{stats.energy} energy
          </span>
        )}
        {releasable && (
          <span className="tag tag--release" title="matured — can be released to conservation">
            releasable
          </span>
        )}
        {def.traits?.map((t) => (
          <span key={t} className="tag tag--trait">
            {t}
          </span>
        ))}
      </div>

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
        </span>
        <span className="stat stat--health" title="health">
          {stats.health}
          {instance.damage > 0 && <small>/{stats.maxHealth}</small>}
        </span>
      </footer>
    </button>
  );
}
