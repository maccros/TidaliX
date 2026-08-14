/**
 * A card, drawn so the player can actually read the animal.
 *
 * The whole reason this client exists is that a terminal cannot show *why* a
 * card's numbers are what they are. So every card carries its breakdown: the
 * printed line, what the tide is doing to it, and what its neighbours are doing
 * to it, as separate, legible facts.
 */

import type { CSSProperties } from 'react';
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
  onClick?: () => void;
  onHover?: (instanceId: string | null) => void;
  registerRef?: (instanceId: string, el: HTMLElement | null) => void;
}

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
  onClick,
  onHover,
  registerRef,
}: CardViewProps) {
  const def: CardDefinition = getCard(instance.definitionId);

  if (facedown) {
    return <div className="card card--back" aria-label="Opponent card" />;
  }

  const tide = deltaLabel(stats.tideBonus);
  const symbiosis = deltaLabel(stats.symbiosisBonus);
  const interactive = state === 'playable' || state === 'ready' || state === 'target';

  const classes = [
    'card',
    `card--${state}`,
    `card--phase-${phase}`,
    linked ? 'is-linked' : '',
    stats.exposed ? 'is-exposed' : '',
    def.type === 'structure' ? 'card--structure' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ '--phase': `var(--${phase})` } as CSSProperties}
      onClick={onClick}
      disabled={!interactive && state !== 'selected'}
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
          <span className="card__printed">
            printed {def.attack}/{def.health}
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
