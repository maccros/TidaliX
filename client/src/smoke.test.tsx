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
 * opening hand to exactly one affordable card. Letting the app pick its own
 * random seed made these assertions flaky.
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

  it('offers exactly one playable card on turn one, and playing it moves it to the reef', () => {
    render();
    const playable = container.querySelectorAll<HTMLButtonElement>('.card--playable');
    expect(playable.length).toBe(1); // one energy, one affordable card

    const before = container.querySelectorAll('.side--you .card').length;
    act(() => {
      playable[0]!.click();
    });
    const after = container.querySelectorAll('.side--you .card').length;
    expect(after).toBe(before + 1);
  });

  it('never renders a card the player cannot afford as playable', () => {
    render();
    for (const card of container.querySelectorAll('.card--playable')) {
      const cost = Number(card.querySelector('.card__cost')?.textContent);
      expect(cost).toBeLessThanOrEqual(1); // one energy on turn one
    }
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
    expect(text).toContain('printed 1/3');
    expect(text).toContain('tide 0/+1');
    expect(text).toContain('symbiosis 0/+2');
    // Its own aura, pointed back at the host.
    expect(text).toContain('anemone');
    expect(text).toContain('drives off polyp-eaters');
    expect(stats.maxHealth).toBe(6);
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
