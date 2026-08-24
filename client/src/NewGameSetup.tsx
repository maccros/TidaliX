/**
 * The new-game setup screen — deck for you, deck and difficulty for the
 * opponent. It replaces the board entirely rather than floating over it: the
 * point is one clean decision before anything else is on screen, not a
 * dialog stacked on top of a half-visible game.
 */

import { useState } from 'react';

import { DIFFICULTIES, DIFFICULTY_NOTE, STARTER_DECKS, type Difficulty } from '@tidalix/engine';

export interface NewGameSetupProps {
  playerDeckId: string;
  opponentDeckId: string;
  difficulty: Difficulty;
  onStart: (playerDeckId: string, opponentDeckId: string, difficulty: Difficulty) => void;
  /** Omitted on the very first load, when there's no game yet to return to. */
  onCancel?: () => void;
}

function DeckPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="setup__deckpicker">
      <h3 className="setup__h">{label}</h3>
      <div className="setup__decks" role="radiogroup" aria-label={label}>
        {STARTER_DECKS.map((deck) => {
          const species = new Set(deck.list).size;
          return (
            <button
              key={deck.id}
              type="button"
              role="radio"
              aria-checked={value === deck.id}
              className={`setup__deck${value === deck.id ? ' is-picked' : ''}`}
              onClick={() => onChange(deck.id)}
            >
              <span className="setup__deckname">{deck.name}</span>
              <span className="setup__decksize">
                {deck.list.length} cards · {species} species
              </span>
              <span className="setup__deckblurb">{deck.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NewGameSetup({
  playerDeckId,
  opponentDeckId,
  difficulty,
  onStart,
  onCancel,
}: NewGameSetupProps) {
  const [player, setPlayer] = useState(playerDeckId);
  const [opponent, setOpponent] = useState(opponentDeckId);
  const [diff, setDiff] = useState<Difficulty>(difficulty);

  return (
    <div className="setup">
      <header className="setup__head">
        <p className="setup__eyebrow">Reef flat · starter set · 50 species</p>
        <h1 className="setup__title">
          Tidali<span className="setup__x">X</span>
        </h1>
        <p className="setup__tagline">Pick a deck. Pick your opponent. The tide does the rest.</p>
      </header>

      <DeckPicker label="Your deck" value={player} onChange={setPlayer} />
      <DeckPicker label="Opponent's deck" value={opponent} onChange={setOpponent} />

      <div className="setup__difficulty">
        <h3 className="setup__h">Opponent difficulty</h3>
        <div className="setup__diffs" role="radiogroup" aria-label="Opponent difficulty">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={diff === d}
              className={`setup__diff${diff === d ? ' is-picked' : ''}`}
              title={DIFFICULTY_NOTE[d]}
              onClick={() => setDiff(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="setup__actions">
        <button
          type="button"
          className="btn btn--primary setup__start"
          onClick={() => onStart(player, opponent, diff)}
        >
          Start game
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Back to game
          </button>
        )}
      </div>
    </div>
  );
}
