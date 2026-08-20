/**
 * TidaliX browser client.
 *
 * Every affordance is derived from `legalActions`, so the interface cannot offer
 * a move the resolver would reject: what looks clickable is exactly what is
 * legal. The engine stays the single source of truth for the rules.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DIFFICULTIES,
  DIFFICULTY_NOTE,
  TAXON_LABEL,
  TIDE_CYCLE,
  allTaxa,
  applyAction,
  canReleaseThisTurn,
  conservationIncome,
  conservedCount,
  conservedSpecies,
  conservedTaxa,
  createGame,
  cyclesCompleted,
  effectiveStats,
  getCard,
  legalActions,
  startGame,
  statsFor,
  stepsUntilMature,
  takeTurn,
  taxaToNextIncome,
  type CardInstance,
  type Difficulty,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayerId,
  type TidePhase,
} from '@tidalix/engine';

import { CardView, type CardState } from './CardView.tsx';
import { CardDetail } from './CardDetail.tsx';
import { EnergyPanel } from './EnergyPanel.tsx';
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
  /**
   * A card in hand whose arrival needs a target, waiting for the player to pick
   * one. Playing such a card is two clicks, because it is two decisions: what to
   * commit, and what to answer with it.
   */
  const [aiming, setAiming] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [log, setLog] = useState<{ text: string; kind: string }[]>([]);
  const [botThinking, setBotThinking] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

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
    setAiming(null);
    setInspecting(null);
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
      setAiming(null);
      setRevision((r) => r + 1);
    },
    [state, pushEvents],
  );

  useEffect(() => {
    if (!aiming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAiming(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aiming]);

  /* The bot plays its own turn, on a beat, so the player can read what happened. */
  useEffect(() => {
    if (state.winner !== undefined || state.activePlayer !== BOT) return;
    setBotThinking(true);
    const timer = setTimeout(() => {
      const { state: next, events } = takeTurn(state, BOT, difficulty);
      setState(next);
      pushEvents(events, next);
      setBotThinking(false);
      setRevision((r) => r + 1);
    }, 650);
    return () => clearTimeout(timer);
  }, [state, pushEvents, difficulty]);

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
  /** Your species that have matured and may go back to the wild this turn. */
  const releasable = useMemo(
    () =>
      new Set(
        actions
          .filter((a): a is Extract<GameAction, { type: 'RELEASE' }> => a.type === 'RELEASE')
          .map((a) => a.instanceId),
      ),
    [actions],
  );

  /**
   * For each card in hand whose arrival needs a target, the enemies it may hit.
   * Read straight off `legalActions`, so the interface cannot offer an aim the
   * resolver would reject.
   */
  const arrivalTargets = useMemo(() => {
    const out = new Map<string, Set<string>>();
    for (const a of actions) {
      if (a.type !== 'PLAY_CARD' || a.targetId === undefined) continue;
      const set = out.get(a.instanceId) ?? new Set<string>();
      set.add(a.targetId);
      out.set(a.instanceId, set);
    }
    return out;
  }, [actions]);

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

  /** Locate whatever is being inspected, wherever it lives. */
  const inspected = useMemo(() => {
    if (!inspecting) return null;
    for (const player of state.players) {
      const zones = [
        ['board', player.board],
        ['hand', player.hand],
        ['conservation', player.conservation],
      ] as const;
      for (const [zone, cards] of zones) {
        const found = cards.find((c) => c.instanceId === inspecting);
        if (found) return { instance: found, zone, owner: player.id };
      }
    }
    return null;
  }, [inspecting, state]);

  const handState = (id: string, cost: number): CardState => {
    if (!yourTurn) return 'idle';
    if (aiming === id) return 'selected';
    if (playable.has(id)) return 'playable';
    return cost > you.energy ? 'unaffordable' : 'idle';
  };

  /**
   * How one of your board cards should read.
   *
   * The distinction that matters here is between a card that has *used* its
   * attack and one that was never going to have one. Corals, anemones, the clam
   * and the urchin have no attack at all — they are the reef, not the hunters —
   * and lumping them in with spent attackers greyed out every single card that
   * carries a symbiosis. The relationships were being drawn between cards the
   * interface had already dismissed.
   */
  const boardState = (id: string, mine: boolean): CardState => {
    if (!mine) {
      if (aiming) return arrivalTargets.get(aiming)?.has(id) ? 'target' : 'idle';
      return targets.has(id) ? 'target' : 'idle';
    }
    if (selected === id) return 'selected';
    if (attackers.has(id)) return 'ready';
    if (!yourTurn) return 'idle';
    const card = you.board.find((c) => c.instanceId === id);
    // No attack in this phase means it is standing its ground, not resting.
    if (card && statsFor(state, card).attack <= 0) return 'support';
    return 'spent';
  };

  const clickBoardCard = (id: string, mine: boolean) => {
    if (mine) {
      setSelected((cur) => (cur === id ? null : attackers.has(id) ? id : cur));
      return;
    }
    // Aiming an arrival takes priority: the card is mid-play and the click is
    // the second half of that decision, not the start of an attack.
    if (aiming && arrivalTargets.get(aiming)?.has(id)) {
      run({ type: 'PLAY_CARD', player: YOU, instanceId: aiming, targetId: id });
      return;
    }
    if (selected && targets.has(id)) {
      run({ type: 'ATTACK', player: YOU, attackerId: selected, targetId: id });
    }
  };

  /** Play a card from hand, stopping to aim first when its arrival needs it. */
  const clickHandCard = (id: string) => {
    if (aiming === id) {
      setAiming(null);
      return;
    }
    if (!playable.has(id)) return;
    if (arrivalTargets.has(id)) {
      setSelected(null);
      setAiming(id);
      return;
    }
    run({ type: 'PLAY_CARD', player: YOU, instanceId: id });
  };

  const canHitFace = selected !== null && targets.has('face');

  return (
    <div className="app">
      <TideTrack state={state} />

      <main className="table" ref={setBoardEl}>
        <SymbiosisLinks
          boards={[bot.board, you.board]}
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
            onInspect={setInspecting}
            onHover={setHovered}
            linked={linked}
            releasable={EMPTY_SET}
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
            onInspect={setInspecting}
            onHover={setHovered}
            linked={linked}
            releasable={releasable}
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

      <div className="dash">
        <EnergyPanel state={state} player={YOU} />
        <ConservationPanel
          state={state}
          player={YOU}
          releasable={releasable}
          onRelease={(id) => run({ type: 'RELEASE', player: YOU, instanceId: id })}
          onInspect={setInspecting}
        />
      </div>

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
              onInspect={() => setInspecting(card.instanceId)}
              onClick={() => clickHandCard(card.instanceId)}
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
        <label className="bar__difficulty" title={DIFFICULTY_NOTE[difficulty]}>
          <span className="bar__difficulty-label">opponent</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            aria-label="Opponent difficulty"
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <span className="bar__seed">seed {seed}</span>
        {aiming ? (
          <span className="bar__hint bar__hint--aim">
            {getCard(you.hand.find((c) => c.instanceId === aiming)!.definitionId).name} arrives
            striking — pick an enemy, or press Escape to cancel.
          </span>
        ) : selected ? (
          <span className="bar__hint">Pick a target, or click the card again to cancel.</span>
        ) : (
          <span className="bar__hint bar__hint--quiet">Right-click any card for its full detail.</span>
        )}
        {state.winner !== undefined && (
          <strong className="bar__result">
            {state.winner === null
              ? 'A draw.'
              : state.winner === YOU
                ? 'You win.'
                : 'The AI wins.'}
          </strong>
        )}
        <LogPanel entries={log} />
      </footer>

      {inspected && (
        <CardDetail
          instance={inspected.instance}
          phase={state.phase}
          // Only a card on a board has neighbours, so only there is there a
          // symbiosis figure worth reporting.
          stats={
            inspected.zone === 'board'
              ? statsFor(state, inspected.instance)
              : inspected.zone === 'hand'
                ? effectiveStats(inspected.instance, state.phase, getCard(inspected.instance.definitionId))
                : null
          }
          zone={inspected.zone}
          release={
            inspected.zone === 'board' && inspected.owner === YOU
              ? {
                  mature: stepsUntilMature(state, inspected.instance) === 0,
                  stepsRemaining: stepsUntilMature(state, inspected.instance),
                  allowedThisTurn: canReleaseThisTurn(state, YOU),
                  lineageHeld: conservedTaxa(you).includes(
                    getCard(inspected.instance.definitionId).taxon,
                  ),
                  incomeAfter: Math.floor(
                    (conservedCount(you) + 1) / Math.max(1, state.config.conservationIncomePer),
                  ),
                }
              : null
          }
          onClose={() => setInspecting(null)}
        />
      )}
    </div>
  );
}

/** Shared empty set, so the opponent's row does not allocate one every render. */
const EMPTY_SET: ReadonlySet<string> = new Set();

/* -------------------------------------------------------------------------- */

/**
 * The tide track, and the one place the tide cycle is explained.
 *
 * "A complete tide cycle" used to be spelled out in the energy panel, the
 * conservation panel and every card's detail view at once — four restatements of
 * one fact, which is how a rule stops being read. The cycle is a property of the
 * tide, so it is reported here, on the tide, and everything else just points at
 * how many phases are left.
 */
function TideTrack({ state }: { state: GameState }) {
  const cycles = cyclesCompleted(state.tideStep);
  const toGo = TIDE_CYCLE.length - (state.tideStep % TIDE_CYCLE.length);
  const atCeiling = state.players[0].energyCap >= state.config.maxEnergyCap;

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
              {state.config.tideEnergy[phase] > 0 ? `⬡+${state.config.tideEnergy[phase]}` : '—'}
            </span>
          </li>
        ))}
      </ol>
      <p className="tide__note">
        <b>{state.phase}</b> · round {state.round} · {PHASE_NOTE[state.phase]}
      </p>
      <p className="tide__cycle">
        <span className="tide__cyclecount">
          {cycles} {cycles === 1 ? 'cycle' : 'cycles'} complete
        </span>
        <span className="tide__cyclenext">
          {atCeiling ? (
            <>capacity is at its ceiling of {state.config.maxEnergyCap}</>
          ) : (
            <>
              next closes in {toGo} {toGo === 1 ? 'phase' : 'phases'} — capacity ⬡+1
            </>
          )}
        </span>
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
  onInspect,
  onHover,
  linked,
  releasable,
  registerRef,
}: {
  board: readonly CardInstance[];
  state: GameState;
  mine: boolean;
  cardState: (id: string, mine: boolean) => CardState;
  onClick: (id: string, mine: boolean) => void;
  onInspect: (id: string) => void;
  onHover: (id: string | null) => void;
  linked: Set<string>;
  releasable: ReadonlySet<string>;
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
          releasable={releasable.has(card.instanceId)}
          onClick={() => onClick(card.instanceId, mine)}
          onInspect={() => onInspect(card.instanceId)}
          onHover={onHover}
          registerRef={registerRef}
        />
      ))}
    </div>
  );
}

/**
 * The conservation pile: what you have given back, and what it is worth.
 *
 * This is the second win condition, so it gets a permanent readout rather than
 * living in the log — a player should never have to count a pile themselves to
 * know how close they are to winning with it.
 *
 * It is scored on *lineage*, which is a rule that only works if the player can
 * see it. So the pile is drawn as the eight branches of the tree with the ones
 * you hold lit up, and the standing income it pays is stated as a number rather
 * than left to be inferred from the energy panel. A boost nobody can find is a
 * boost nobody plays for.
 */
function ConservationPanel({
  state,
  player,
  releasable,
  onRelease,
  onInspect,
}: {
  state: GameState;
  player: PlayerId;
  releasable: ReadonlySet<string>;
  onRelease: (instanceId: string) => void;
  onInspect: (instanceId: string) => void;
}) {
  const me = state.players[player];
  const held = conservedTaxa(me);
  const saved = conservedCount(me);
  const species = conservedSpecies(me);
  const target = state.config.conservationVictory;
  const income = conservationIncome(state, player);
  const toNext = taxaToNextIncome(state, player);
  const ready = me.board.filter((c) => releasable.has(c.instanceId));

  return (
    <section className="conserve" aria-label="Conservation">
      <header className="conserve__head">
        <span className="conserve__score">
          ❋ {saved}
          {target > 0 && <small> / {target}</small>}
        </span>
        <span className="conserve__label">
          lineages protected
          {species > saved && <small> · {species} species in the pile</small>}
        </span>
      </header>

      {/* The boost, stated outright. It is standing income, so it is worth more
          than any one release and deserves to be read as a rate, not an event. */}
      <p className={`conserve__boost ${income > 0 ? 'is-paying' : ''}`}>
        {income > 0 ? (
          <>
            <b>⬡+{income} every turn</b> from the pile
            {toNext > 0 && (
              <span className="conserve__next">
                {' '}
                — {toNext} more {toNext === 1 ? 'lineage' : 'lineages'} for ⬡+{income + 1}
              </span>
            )}
          </>
        ) : (
          <>
            Protect {toNext} {toNext === 1 ? 'lineage' : 'lineages'} for <b>⬡+1 every turn</b>
          </>
        )}
      </p>

      {/* The tree, so "a different type" is something you can look at rather
          than something you have to keep in your head. */}
      <ul className="conserve__taxa">
        {allTaxa().map((t) => (
          <li
            key={t}
            className={`conserve__taxon ${held.includes(t) ? 'is-held' : ''}`}
            title={held.includes(t) ? `${TAXON_LABEL[t]} — protected` : `${TAXON_LABEL[t]} — not yet`}
          >
            {TAXON_LABEL[t]}
          </li>
        ))}
      </ul>

      {me.conservation.length > 0 && (
        <ul className="conserve__pile">
          {me.conservation.map((c) => (
            <li key={c.instanceId}>
              <button type="button" className="conserve__entry" onClick={() => onInspect(c.instanceId)}>
                {getCard(c.definitionId).name}
                <small className="conserve__entrytaxon">{TAXON_LABEL[getCard(c.definitionId).taxon]}</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {ready.length > 0 ? (
        <div className="conserve__actions">
          <span className="conserve__prompt">Release back to the wild:</span>
          {ready.map((c) => {
            const def = getCard(c.definitionId);
            const isNew = !held.includes(def.taxon);
            return (
              <button
                key={c.instanceId}
                type="button"
                className={`btn btn--release ${isNew ? 'btn--release-new' : ''}`}
                onClick={() => onRelease(c.instanceId)}
                title={
                  isNew
                    ? `A new lineage: ${TAXON_LABEL[def.taxon]}`
                    : `${TAXON_LABEL[def.taxon]} is already protected — this adds no income`
                }
              >
                {def.name}
                <small>{isNew ? `+ ${TAXON_LABEL[def.taxon]}` : TAXON_LABEL[def.taxon]}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="conserve__hint">
          {target > 0
            ? `Protect ${target} different lineages to win. A species matures after one full cycle of the tide.`
            : 'A species matures after one full cycle of the tide.'}
        </p>
      )}
    </section>
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
    for (const zone of [p.board, p.discard, p.conservation, p.hand, p.deck]) {
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
      const verb =
        event.cause === 'retaliation' ? 'fights back at' : event.cause === 'arrival' ? 'strikes' : 'hits';
      const bonus = event.exposedBonus > 0 ? ` (+${event.exposedBonus} exposed)` : '';
      return {
        text: `${nameOf(state, event.sourceId)} ${verb} ${nameOf(state, event.targetId)} for ${event.amount}${bonus}`,
        kind: event.cause,
      };
    }
    case 'PLAYER_DAMAGED':
      return { text: `${who(event.player)} took ${event.amount} (♥ ${event.life})`, kind: 'damage' };
    case 'SPECIES_POISONED':
      return {
        text: `${nameOf(state, event.victimId)} ate ${nameOf(state, event.sourceId)} — and the toxin is fatal`,
        kind: 'toxin',
      };
    case 'CARD_DESTROYED':
      return {
        text:
          event.cause === 'toxin'
            ? `${getCard(event.definitionId).name} dies of the toxin`
            : `${getCard(event.definitionId).name} destroyed`,
        kind: event.cause === 'toxin' ? 'toxin' : 'death',
      };
    case 'SPECIES_RELEASED':
      return {
        text: `${who(event.player)} released ${getCard(event.definitionId).name} — ${event.conserved} conserved`,
        kind: 'conserve',
      };
    case 'GAME_OVER': {
      const how = event.reason === 'conservation' ? ' by conservation' : '';
      return {
        text:
          event.winner === null
            ? 'A draw.'
            : event.winner === YOU
              ? `You win${how}.`
              : `The AI wins${how}.`,
        kind: 'over',
      };
    }
    default:
      return null;
  }
}
