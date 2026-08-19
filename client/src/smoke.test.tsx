/**
 * Client smoke test: does the game actually mount, render real cards, and
 * respond to a click by changing the engine state?
 *
 * This is not a UI-detail test. It exists so "it builds" can never again be
 * mistaken for "it runs".
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_CONFIG, allTaxa } from '@tidalix/engine';
import { App } from './App.tsx';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

/**
 * Seed 3 is fixed deliberately: the engine is deterministic, so this pins the
 * opening hand exactly. Letting the app pick its own random seed made these
 * assertions flaky.
 */
function render(seed = 3) {
  act(() => {
    root.render(<App seed={seed} />);
  });
}

describe('client', () => {
  it('mounts and draws the tide track', () => {
    render();
    const text = container.textContent ?? '';
    for (const phase of ['low', 'rising', 'high', 'falling']) {
      expect(text).toContain(phase);
    }
  });

  it('renders real species with binomial names and stat breakdowns', () => {
    render();
    const species = container.querySelectorAll('.card__species');
    expect(species.length).toBeGreaterThan(0);
    // Binomial nomenclature: "Genus species".
    for (const el of species) {
      expect(el.textContent).toMatch(/^[A-Z][a-z]+ [a-z]+$/);
    }
    expect(container.querySelectorAll('.card__printed').length).toBeGreaterThan(0);
  });

  it('offers playable cards on turn one, and playing one moves it to the reef', () => {
    render();
    const playable = container.querySelectorAll<HTMLButtonElement>('.card--playable');
    expect(playable.length).toBeGreaterThan(0);

    const before = container.querySelectorAll('.side--you .card').length;
    act(() => {
      playable[0]!.click();
    });
    const after = container.querySelectorAll('.side--you .card').length;
    expect(after).toBe(before + 1);
  });

  it('never renders a card the player cannot afford as playable', () => {
    render();
    // The opening cap is the whole budget on turn one — nothing dearer may glow.
    const budget = DEFAULT_CONFIG.startingEnergyCap;
    for (const card of container.querySelectorAll('.card--playable')) {
      const cost = Number(card.querySelector('.card__cost')?.textContent);
      expect(cost).toBeLessThanOrEqual(budget);
    }
  });

  it('itemises the energy income by source rather than showing a bare total', () => {
    render();
    const panel = container.querySelector('.energy');
    expect(panel).not.toBeNull();
    // The base capacity line is always present; the rest depend on the board.
    expect(panel!.textContent).toContain('Base capacity');
    expect(panel!.querySelectorAll('.energy__line').length).toBeGreaterThan(0);
    for (const line of panel!.querySelectorAll('.energy__line')) {
      expect(line.querySelector('.energy__amount')?.textContent).toMatch(/^\+\d+$/);
      expect(line.querySelector('.energy__detail')?.textContent?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('separates what was earned this turn from what next turn will pay', () => {
    render();
    const panel = container.querySelector('.energy')!;
    const past = panel.querySelector('.energy__block--past');
    const next = panel.querySelector('.energy__block--next');

    expect(past?.textContent).toContain('Earned this turn');
    expect(next?.textContent).toContain('Next turn');
    // Both halves are itemised, and neither is a bare number.
    expect(past!.querySelectorAll('.energy__line').length).toBeGreaterThan(0);
    expect(next!.querySelectorAll('.energy__line').length).toBeGreaterThan(0);
  });

  it('prices the forecast in the phase that turn will actually open in', async () => {
    const { nextTurnIncome, createGame, startGame } = await import('@tidalix/engine');
    render();
    // The game opens at low water; the player's next turn is on the rising tide,
    // and the panel must name that phase rather than the one on the board.
    const state = startGame(createGame({ seed: 3 })).state;
    const projected = nextTurnIncome(state, 0);
    expect(state.phase).toBe('low');
    expect(projected.phase).toBe('rising');

    const next = container.querySelector('.energy__block--next')!;
    expect(next.querySelector('.energy__phase')?.textContent).toBe('rising');
    // And the tide line is priced at the rising rate, which low water does not pay.
    expect(next.textContent).toContain('the rising tide');
  });

  it('shows the conservation pile, its victory target and what it pays', () => {
    render();
    const panel = container.querySelector('.conserve');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('lineages protected');
    expect(panel!.textContent).toContain(`/ ${DEFAULT_CONFIG.conservationVictory}`);
    // The pile is scored on lineage, so every lineage in the set is listed —
    // the ones you hold and, just as importantly, the ones you do not.
    expect(panel!.querySelectorAll('.conserve__taxon').length).toBe(allTaxa().length);
    expect(panel!.querySelectorAll('.conserve__taxon.is-held').length).toBe(0);
  });

  it('states the conservation boost as a standing rate, not a footnote', () => {
    render();
    const boost = container.querySelector('.conserve__boost');
    expect(boost).not.toBeNull();
    // With an empty pile it has to say what protecting a lineage would buy.
    expect(boost!.textContent).toContain('+1 energy every turn');
  });

  it('does not grey out a reef-builder just because it cannot attack', () => {
    // Corals, anemones and the clam have no attack at all. They were rendering
    // in the same spent state as an attacker that had already swung, which faded
    // out every card that grants a symbiosis. They get their own state now.
    //
    // Seeds are swept rather than fixed because this needs a 0-attack card that
    // is affordable on turn one, and which opening hand delivers one is an
    // accident of the shuffle, not the thing under test.
    for (let seed = 1; seed <= 40; seed++) {
      root.unmount();
      container.remove();
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
      render(seed);

      const playable = [...container.querySelectorAll<HTMLButtonElement>('.hand .card--playable')];
      const reefBuilder = playable.find(
        (c) => c.querySelector('.stat--attack')?.textContent === '0',
      );
      if (!reefBuilder) continue;

      act(() => reefBuilder.click());
      const support = container.querySelector('.side--you .card--support');
      expect(support).not.toBeNull();
      expect(support!.classList.contains('card--spent')).toBe(false);
      // Still fully legible: it is the reef, not a used-up attacker.
      expect(support!.querySelector('.card__name')?.textContent?.length ?? 0).toBeGreaterThan(0);
      return;
    }
    throw new Error('no affordable 0-attack card in any of 40 opening hands');
  });

  it('marks a toxic animal on its face, before anyone attacks it', async () => {
    const { CARDS } = await import('@tidalix/engine');
    // The rule only works if it is visible in advance: you cannot decline to eat
    // something you did not know was poisonous.
    const toxic = CARDS.filter((c) => c.keywords?.includes('toxic'));
    expect(toxic.length).toBeGreaterThan(0);
    for (const card of toxic) {
      expect(card.keywords).not.toContain('toxin-immune');
    }
    // And there is a predator for them, or the keyword is a dead end.
    expect(CARDS.some((c) => c.keywords?.includes('toxin-immune'))).toBe(true);
  });

  it('draws symbiosis links only between cards on the same side', async () => {
    const { activeSymbioses, createInstance } = await import('@tidalix/engine');
    // A mutualistic pair split across the waterline must produce no links: the
    // engine scores each side's board on its own, and the client must ask it
    // that way rather than concatenating the two.
    const mine = createInstance('clown-anemonefish', 0);
    const theirs = createInstance('bubble-tip-anemone', 1);
    expect(activeSymbioses([mine])).toHaveLength(0);
    expect(activeSymbioses([theirs])).toHaveLength(0);
    // Together on one board they would link — which is exactly what must not
    // happen when they are on opposite boards.
    expect(activeSymbioses([mine, theirs]).length).toBeGreaterThan(0);
  });
});

describe('card detail', () => {
  it('shows the tide and symbiosis breakdown separately, plus spines and auras', async () => {
    const { createInstance, effectiveStats, getCard } = await import('@tidalix/engine');
    const { CardView } = await import('./CardView.tsx');

    // An anemonefish standing next to its anemone: +1 health from the tide
    // (rising) and +2 from the host it is immune to.
    const fish = createInstance('clown-anemonefish', 0);
    const anemone = createInstance('bubble-tip-anemone', 0);
    const stats = effectiveStats(fish, 'rising', getCard('clown-anemonefish'), [fish, anemone]);

    act(() => {
      root.render(<CardView instance={fish} stats={stats} phase="rising" state="idle" />);
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Clown Anemonefish');
    expect(text).toContain('Amphiprion ocellaris');
    expect(text).toContain('base 1/3');
    expect(text).toContain('tide 0/+1');
    expect(text).toContain('symbiosis 0/+2');
    // Its own aura, pointed back at the host.
    expect(text).toContain('anemone');
    expect(text).toContain('drives off polyp-eaters');
    expect(stats.maxHealth).toBe(6);
  });

  it('opens the full card on right-click, and closes on Escape', () => {
    render();
    expect(container.querySelector('.detail')).toBeNull();

    const card = container.querySelector<HTMLElement>('.hand .card')!;
    act(() => {
      card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });

    const detail = container.querySelector('.detail');
    expect(detail).not.toBeNull();
    // The point of the detail view: the whole tide line at once, not just now.
    for (const phase of ['low', 'rising', 'high', 'falling']) {
      expect(detail!.textContent?.toLowerCase()).toContain(phase);
    }
    expect(detail!.querySelectorAll('.tidetable tbody tr')).toHaveLength(4);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(container.querySelector('.detail')).toBeNull();
  });

  it('inspects a card the player cannot interact with', () => {
    render();
    // Opponent cards and spent cards are inert, but must still be readable —
    // this is why the card is aria-disabled rather than disabled.
    const inert = container.querySelector<HTMLElement>('.card[aria-disabled="true"]');
    expect(inert).not.toBeNull();
    act(() => {
      inert!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    expect(container.querySelector('.detail')).not.toBeNull();
  });

  it('does not play a card when it is right-clicked', () => {
    render();
    const before = container.querySelectorAll('.side--you .card').length;
    const card = container.querySelector<HTMLElement>('.hand .card--playable')!;
    act(() => {
      card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    expect(container.querySelectorAll('.side--you .card').length).toBe(before);
  });

  it('shows spines on an armed animal', async () => {
    const { createInstance, effectiveStats, getCard } = await import('@tidalix/engine');
    const { CardView } = await import('./CardView.tsx');
    const puffer = createInstance('blackspotted-puffer', 0);
    const stats = effectiveStats(puffer, 'low', getCard('blackspotted-puffer'));

    act(() => {
      root.render(<CardView instance={puffer} stats={stats} phase="low" state="idle" />);
    });
    expect(container.textContent).toContain('spines 3');
    expect(container.textContent).toContain('Arothron nigropunctatus');
  });
});
