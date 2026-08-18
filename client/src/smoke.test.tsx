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
import { DEFAULT_CONFIG } from '@tidalix/engine';
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

  it('shows the conservation pile and its victory target', () => {
    render();
    const panel = container.querySelector('.conserve');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('species conserved');
    // One pip per species needed to win, so the goal is countable at a glance.
    expect(panel!.querySelectorAll('.conserve__pip').length).toBe(
      DEFAULT_CONFIG.conservationVictory,
    );
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
