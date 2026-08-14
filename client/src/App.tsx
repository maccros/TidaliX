/**
 * TidaliX browser client.
 *
 * Every affordance is derived from `legalActions`, so the interface cannot offer
 * a move the resolver would reject: what looks clickable is exactly what is
 * legal. The engine stays the single source of truth for the rules.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TIDE_CYCLE,
  applyAction,
  createGame,
  effectiveStats,
  getCard,
  legalActions,
  startGame,
  statsFor,
  takeTurn,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayerId,
  type TidePhase,
} from '@tidalix/engine';

import { CardView, type CardState } from './CardView.tsx';
import { SymbiosisLinks } from './SymbiosisLinks.tsx';

const YOU: PlayerId = 0;
const BOT: PlayerId = 1;

const PHASE_NOTE: Record<TidePhase, string> = {
  low: 'The flat is drained. Reef-dwellers are stranded and take bonus damage.',
  rising: 'The flood carries plankton in. The richest phase for energy.',
  high: 'Water covers the crest. The big open-water animals come in.',
  falling: 'The flat empties into the channels. Ambush predators hold station.',
};

function newGame(seed: number): GameState {
  return startGame(createGame({ seed })).state;
}

/**
 * Reads ?seed= from the URL so a game can be linked and replayed exactly — the
 * engine is deterministic, so the same seed is always the same game.
 */
function seedFromUrl(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get('seed');
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export interface AppProps {
  /** Fixes the game. Falls back to ?seed= in the URL, then to a random game. */
  seed?: number;
}

export function App({ seed: fixedSeed }: AppProps = {}) {
  const [seed, setSeed] = useState(
    () => fixedSeed ?? seedFromUrl() ?? Math.floor(Math.random() * 100000),
  );
  const [state, setState] = useState<GameState>(() => newGame(seed));
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; kind: string }[]>([]);
  const [botThinking, setBotThinking] = useState(false);

  const [boardEl, setBoardEl] = useState<HTMLElement | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [revision, setRevision] = useState(0);

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  }, []);

  const pushEvents = useCallback((events: GameEvent[], s: GameState) => {
    const lines = events.map((e) => describe(e, s)).filter((l): l is { text: string; kind: string } => l !== null);
    if (lines.length) setLog((prev) => [...prev.slice(-60), ...lines]);
  }, []);

  const restart = useCallback((nextSeed: number) => {
    nodes.current.clear();
    setSeed(nextSeed);
    setState(newGame(nextSeed));
    setSelected(null);
    setLog([]);
  }, []);

  const run = useCallback(
    (action: GameAction) => {
      const result = applyAction(state, action);
      if (!result.ok) {
        setLog((prev) => [...prev, { text: result.message, kind: 'error' }]);
        return;
      }
      setState(result.state);
      pushEvents(result.events, result.state);
      setSelected(null);
      setRevision((r) => r + 1);
    },
    [state, pushEvents],
  );

  /* The bot plays its own turn, on a beat, so the player can read what happened. */
  useEffect(() => {
    if (state.winner !== undefined || state.activePlayer !== BOT) return;
    setBotThinking(true);
    const timer = setTimeout(() => {
      const { state: next, events } = takeTurn(state, BOT);
      setState(next);
      pushEvents(events, next);
      setBotThinking(false);
      setRevision((r) => r + 1);
    }, 650);
    return () => clearTimeout(timer);
  }, [state, pushEvents]);

  const yourTurn = state.activePlayer === YOU && state.winner === undefined;
  const actions = useMemo(() => (yourTurn ? legalActions(state) : []), [state, yourTurn]);

  const playable = useMemo(
    () =>
      new Set(
        actions
          .filter((a): a is Extract<GameAction, { type: 'PLAY_CARD' }> => a.type === 'PLAY_CARD')
          .map((a) => a.instanceId),
      ),
    [actions],
  );
  const attackers = useMemo(
    () =>
      new Set(
        actions
          .filter((a): a is Extract<GameAction, { type: 'ATTACK' }> => a.type === 'ATTACK')
          .map((a) => a.attackerId),
      ),
    [actions],
  );
  const targets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(
      actions
        .filter((a): a is Extract<GameAction, { type: 'ATTACK' }> => a.type === 'ATTACK')
        .filter((a) => a.attackerId === selected)
        .map((a) => a.targetId),
    );
  }, [actions, selected]);

  /** Cards symbiotically linked to whatever is hovered, for highlighting. */
  const linked = useMemo(() => {
    if (!hovered) return new Set<string>();
    const out = new Set<string>();
    for (const player of [YOU, BOT] as const) {
      const board = state.players[player].board;
      if (!board.some((c) => c.instanceId === hovered)) continue;
      const hoveredCard = board.find((c) => c.instanceId === hovered)!;
      const hoveredDef = getCard(hoveredCard.definitionId);
      for (const other of board) {
        if (other.instanceId === hovered) continue;
        const otherDef = getCard(other.definitionId);
        const givesToOther = hoveredDef.auras?.some((a) => otherDef.traits?.includes(a.affects));
        const getsFromOther = otherDef.auras?.some((a) => hoveredDef.traits?.includes(a.affects));
        if (givesToOther || getsFromOther) out.add(other.instanceId);
      }
    }
    return out;
  }, [hovered, state]);

  const you = state.players[YOU];
  const bot = state.players[BOT];

  const handState = (id: string, cost: number): CardState => {
    if (!yourTurn) return 'idle';
    if (playable.has(id)) return 'playable';
    return cost > you.energy ? 'unaffordable' : 'idle';
  };

  const boardState = (id: string, mine: boolean): CardState => {
    if (!mine) return targets.has(id) ? 'target' : 'idle';
    if (selected === id) return 'selected';
    if (attackers.has(id)) return 'ready';
    return yourTurn ? 'spent' : 'idle';
  };

  const clickBoardCard = (id: string, mine: boolean) => {
    if (mine) {
      setSelected((cur) => (cur === id ? null : attackers.has(id) ? id : cur));
      return;
    }
    if (selected && targets.has(id)) {
      run({ type: 'ATTACK', player: YOU, attackerId: selected, targetId: id });
    }
  };

  const canHitFace = selected !== null && targets.has('face');

  return (
    <div className="app">
      <TideTrack state={state} />

      <main className="table" ref={setBoardEl}>
        <SymbiosisLinks
          board={[...bot.board, ...you.board]}
          container={boardEl}
          nodes={nodes.current}
          focusId={hovered}
          revision={revision}
        />

        <section className="side side--enemy">
          <PlayerBar
            label="Opponent"
            life={bot.life}
            energy={bot.energy}
            hand={bot.hand.length}
            deck={bot.deck.length}
            active={state.activePlayer === BOT}
            thinking={botThinking}
            targetable={canHitFace}
            onClick={() =>
              canHitFace &&
              selected &&
              run({ type: 'ATTACK', player: YOU, attackerId: selected, targetId: 'face' })
            }
          />
          <Row
            board={bot.board}
            state={state}
            mine={false}
            cardState={boardState}
            onClick={clickBoardCard}
            onHover={setHovered}
            linked={linked}
            registerRef={registerRef}
          />
        </section>

        <div className="waterline" aria-hidden="true" />

        <section className="side side--you">
          <Row
            board={you.board}
            state={state}
            mine
            cardState={boardState}
            onClick={clickBoardCard}
            onHover={setHovered}
            linked={linked}
            registerRef={registerRef}
          />
          <PlayerBar
            label="You"
            life={you.life}
            energy={you.energy}
            hand={you.hand.length}
            deck={you.deck.length}
            active={yourTurn}
          />
        </section>
      </main>

      <section className="hand" aria-label="Your hand">
        {you.hand.map((card) => {
          const def = getCard(card.definitionId);
          return (
            <CardView
              key={card.instanceId}
              instance={card}
              // A card in hand has no neighbours yet, so this is its tide line only.
              stats={effectiveStats(card, state.phase, def)}
              phase={state.phase}
              state={handState(card.instanceId, def.cost)}
              onHover={setHovered}
              onClick={() =>
                playable.has(card.instanceId) &&
                run({ type: 'PLAY_CARD', player: YOU, instanceId: card.instanceId })
              }
            />
          );
        })}
        {you.hand.length === 0 && <p className="hand__empty">Your hand is empty.</p>}
      </section>

      <footer className="bar">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!yourTurn}
          onClick={() => run({ type: 'END_TURN', player: YOU })}
        >
          End turn
        </button>
        <button type="button" className="btn" onClick={() => restart(Math.floor(Math.random() * 100000))}>
          New game
        </button>
        <span className="bar__seed">seed {seed}</span>
        {selected && <span className="bar__hint">Pick a target, or click the card again to cancel.</span>}
        {state.winner !== undefined && (
          <strong className="bar__result">
            {state.winner === null ? 'A draw.' : state.winner === YOU ? 'You win.' : 'The AI wins.'}
          </strong>
        )}
        <LogPanel entries={log} />
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TideTrack({ state }: { state: GameState }) {
  return (
    <header className="tide">
      <ol className="tide__track">
        {TIDE_CYCLE.map((phase) => (
          <li
            key={phase}
            className={`tide__step tide__step--${phase} ${phase === state.phase ? 'is-now' : ''}`}
          >
            <span className="tide__name">{phase}</span>
            <span className="tide__income">
              {state.config.tideEnergy[phase] > 0 ? `+${state.config.tideEnergy[phase]}` : '—'}
            </span>
          </li>
        ))}
      </ol>
      <p className="tide__note">
        <b>{state.phase}</b> · round {state.round} · {PHASE_NOTE[state.phase]}
      </p>
    </header>
  );
}

function Row({
  board,
  state,
  mine,
  cardState,
  onClick,
  onHover,
  linked,
  registerRef,
}: {
  board: readonly import('@tidalix/engine').CardInstance[];
  state: GameState;
  mine: boolean;
  cardState: (id: string, mine: boolean) => CardState;
  onClick: (id: string, mine: boolean) => void;
  onHover: (id: string | null) => void;
  linked: Set<string>;
  registerRef: (id: string, el: HTMLElement | null) => void;
}) {
  if (board.length === 0) {
    return <div className="row row--empty">{mine ? 'Your reef is empty.' : 'Their reef is empty.'}</div>;
  }
  return (
    <div className="row">
      {board.map((card) => (
        <CardView
          key={card.instanceId}
          instance={card}
          stats={statsFor(state, card)}
          phase={state.phase}
          state={cardState(card.instanceId, mine)}
          linked={linked.has(card.instanceId)}
          onClick={() => onClick(card.instanceId, mine)}
          onHover={onHover}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
}

function PlayerBar({
  label,
  life,
  energy,
  hand,
  deck,
  active,
  thinking = false,
  targetable = false,
  onClick,
}: {
  label: string;
  life: number;
  energy: number;
  hand: number;
  deck: number;
  active: boolean;
  thinking?: boolean;
  targetable?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`player ${active ? 'is-active' : ''} ${targetable ? 'is-targetable' : ''}`}
      onClick={onClick}
      disabled={!targetable}
    >
      <span className="player__name">{label}</span>
      <span className="player__life" title="life">
        ♥ {life}
      </span>
      <span className="player__energy" title="energy">
        ⬡ {energy}
      </span>
      <span className="player__zones">
        hand {hand} · deck {deck}
      </span>
      {thinking && <span className="player__thinking">thinking…</span>}
      {targetable && <span className="player__hit">attack</span>}
    </button>
  );
}

function LogPanel({ entries }: { entries: { text: string; kind: string }[] }) {
  const ref = useRef<HTMLUListElement | null>(null);
  useEffect(() => {
    // scrollTop rather than scrollTo(): same result, and supported everywhere.
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries]);
  return (
    <ul className="log" ref={ref}>
      {entries.map((e, i) => (
        <li key={i} className={`log__line log__line--${e.kind}`}>
          {e.text}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */

function nameOf(state: GameState, instanceId: string): string {
  for (const p of state.players) {
    for (const zone of [p.board, p.discard, p.hand, p.deck]) {
      const found = zone.find((c) => c.instanceId === instanceId);
      if (found) return getCard(found.definitionId).name;
    }
  }
  return 'something';
}

function describe(event: GameEvent, state: GameState): { text: string; kind: string } | null {
  const who = (p: PlayerId) => (p === YOU ? 'You' : 'The AI');
  switch (event.type) {
    case 'TIDE_CHANGED':
      return { text: `The tide turns: ${event.from} → ${event.to}`, kind: 'tide' };
    case 'CARD_PLAYED':
      return {
        text: `${who(event.player)} played ${getCard(event.definitionId).name}`,
        kind: 'play',
      };
    case 'DAMAGE_DEALT': {
      if (event.targetId === 'face') return null;
      const verb = event.cause === 'spines' ? 'stings' : 'hits';
      const bonus = event.exposedBonus > 0 ? ` (+${event.exposedBonus} exposed)` : '';
      return {
        text: `${nameOf(state, event.sourceId)} ${verb} ${nameOf(state, event.targetId)} for ${event.amount}${bonus}`,
        kind: event.cause,
      };
    }
    case 'PLAYER_DAMAGED':
      return { text: `${who(event.player)} took ${event.amount} (♥ ${event.life})`, kind: 'damage' };
    case 'CARD_DESTROYED':
      return { text: `${getCard(event.definitionId).name} destroyed`, kind: 'death' };
    case 'GAME_OVER':
      return {
        text: event.winner === null ? 'A draw.' : event.winner === YOU ? 'You win.' : 'The AI wins.',
        kind: 'over',
      };
    default:
      return null;
  }
}
