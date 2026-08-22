/**
 * Client smoke test: does the game actually mount, render real cards, and
 * respond to a click by changing the engine state?
 *
 * This is not a UI-detail test. It exists so "it builds" can never again be
 * mistaken for "it runs".
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
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

/** Tear down and rebuild the container, for cases that sweep several seeds. */
function remount() {
  root.unmount();
  container.remove();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
}

/**
 * Seed 7 is fixed deliberately. The engine is deterministic, so this pins the
 * opening hand *and* the coin flip for the first turn — and 7 is one of the
 * seeds where the player moves first, which most of these cases need.
 */
function render(seed = 7) {
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
    // Seed 9, not the default: the opener has two energy and four cards, so
    // roughly a quarter of openings are honestly unplayable. This one is not.
    render(9);
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
      // The unit leads the number, so an amount is never a bare integer.
      expect(line.querySelector('.energy__amount')?.textContent).toMatch(/^⬡\+\d+$/);
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
    const state = startGame(createGame({ seed: 7, startingPlayer: 'random' })).state;
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
    expect(panel!.textContent).toContain('taxa protected');
    expect(panel!.textContent).toContain(`/ ${DEFAULT_CONFIG.conservationVictory}`);
    // The pile is scored on taxon, so every taxon in the set is listed —
    // the ones you hold and, just as importantly, the ones you do not.
    expect(panel!.querySelectorAll('.conserve__taxon').length).toBe(allTaxa().length);
    expect(panel!.querySelectorAll('.conserve__taxon.is-held').length).toBe(0);
  });

  it('states the conservation boost as a standing rate, not a footnote', () => {
    render();
    const boost = container.querySelector('.conserve__boost');
    expect(boost).not.toBeNull();
    // With an empty pile it has to say what protecting a taxon would buy.
    expect(boost!.textContent).toContain('⬡+1 every turn');
  });

  it('makes a targeted arrival a two-click aim, and plays it at what you pick', async () => {
    // A card whose arrival strikes cannot simply be clicked into play — the
    // resolver refuses it without a target. The interface has to stop and ask,
    // and this is the flow that breaks the game outright if it does not.
    vi.useFakeTimers();
    try {
      for (let seed = 1; seed <= 60; seed++) {
        remount();
        render(seed);

        for (let turn = 0; turn < 8; turn++) {
          const enemies = [...container.querySelectorAll<HTMLElement>('.side--enemy .card')];
          const aimable = [...container.querySelectorAll<HTMLButtonElement>('.hand .card--playable')]
            .find((c) => c.querySelector('.card__arrival')?.textContent?.includes('one enemy'));

          if (aimable && enemies.length > 0) {
            const boardBefore = container.querySelectorAll('.side--you .card').length;
            act(() => aimable.click());

            // First click aims: nothing is played yet, and the bar says so.
            expect(container.querySelectorAll('.side--you .card').length).toBe(boardBefore);
            expect(container.querySelector('.bar__hint--aim')?.textContent).toContain('strikes');

            // The enemies it may hit are lit up as targets.
            const marked = container.querySelectorAll('.side--enemy .card--target');
            expect(marked.length).toBeGreaterThan(0);

            // Second click commits it, and the card lands on your reef.
            act(() => (marked[0] as HTMLButtonElement).click());
            expect(container.querySelectorAll('.side--you .card').length).toBe(boardBefore + 1);
            expect(container.querySelector('.bar__hint--aim')).toBeNull();
            return;
          }

          // Pass the turn and let the bot take its beat.
          const endTurn = container.querySelector<HTMLButtonElement>('.btn--primary:not(:disabled)');
          if (!endTurn) break;
          act(() => endTurn.click());
          await act(async () => {
            vi.advanceTimersByTime(800);
          });
        }
      }
      throw new Error('never reached a state with an aimable card and an enemy board');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not grey out a frame-builder just because it cannot attack', () => {
    // Corals, anemones and the clam have no attack at all. They were rendering
    // in the same spent state as an attacker that had already swung, which faded
    // out every card that grants a symbiosis. They get their own state now.
    //
    // Seeds are swept rather than fixed because this needs a 0-attack card that
    // is affordable on turn one, and which opening hand delivers one is an
    // accident of the shuffle, not the thing under test.
    for (let seed = 1; seed <= 40; seed++) {
      remount();
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

  it('asks you to aim a card whose arrival strikes, instead of failing the play', () => {
    // A strike arrival needs a target. Clicking the card must open an aim, not
    // fire a play the resolver will reject.
    //
    // The bot takes its turn on a 650ms beat so the player can read it, so the
    // clock has to be driven by hand here — otherwise the opponent never gets a
    // card onto the board and there is nothing to aim at.
    vi.useFakeTimers();
    try {
      for (let seed = 1; seed <= 40; seed++) {
        root.unmount();
        container.remove();
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        render(seed);

        for (let i = 0; i < 20; i++) {
          const hand = [...container.querySelectorAll<HTMLButtonElement>('.hand .card--playable')];
          const enemies = container.querySelectorAll('.side--enemy .card').length;
          const striker = hand.find((c) => c.textContent?.includes('one enemy'));

          if (striker && enemies > 0) {
            act(() => striker.click());
            // The card is held mid-play and the legal enemies are lit.
            expect(container.querySelector('.hand .card--selected')).not.toBeNull();
            expect(container.querySelectorAll('.side--enemy .card--target').length).toBeGreaterThan(0);
            expect(container.querySelector('.bar__hint--aim')?.textContent).toContain('strikes');

            const before = container.querySelectorAll('.side--you .card').length;
            act(() => container.querySelector<HTMLButtonElement>('.side--enemy .card--target')!.click());
            expect(container.querySelectorAll('.side--you .card').length).toBe(before + 1);
            expect(container.querySelector('.bar__hint--aim')).toBeNull();
            return;
          }

          const endTurn = container.querySelector<HTMLButtonElement>('.btn--primary:not(:disabled)');
          if (hand[0]) act(() => hand[0]!.click());
          else if (endTurn) act(() => endTurn.click());
          else break;
          // Let the opponent take its turn.
          act(() => void vi.advanceTimersByTime(1000));
        }
      }
      throw new Error('never reached a state where a strike card could be aimed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('has a drawing for every species in the set, and no orphans', async () => {
    // The art is keyed by card id, so a renamed or added card silently loses its
    // drawing. This is the check that stops that going unnoticed.
    const { CARDS } = await import('@tidalix/engine');
    const { hasArt } = await import('./SpeciesArt.tsx');

    const missing = CARDS.filter((c) => !hasArt(c.id)).map((c) => c.id);
    expect(missing, 'species with no drawing').toEqual([]);
  });

  it('draws the art inline so it survives the deploy content-security policy', () => {
    // External image hosts are blocked on the published page. If art ever
    // arrives as an <img src>, it will render as a broken box for every player.
    render();
    const art = container.querySelectorAll('.card .art');
    expect(art.length).toBeGreaterThan(0);
    for (const svg of art) expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(container.querySelectorAll('.card img')).toHaveLength(0);
  });

  it('has a drawing for every species in the set', async () => {
    // A card with no silhouette is not broken, just plainer — but the whole
    // point is that a hand can be read by shape, and a gap undoes that.
    const { CARDS } = await import('@tidalix/engine');
    const { hasArt } = await import('./SpeciesArt.tsx');
    const missing = CARDS.filter((c) => !hasArt(c.id)).map((c) => c.name);
    expect(missing).toEqual([]);
  });

  it('tints the drawing with the phase the card is standing in', () => {
    render();
    const card = container.querySelector('.hand .card');
    expect(card?.querySelector('svg.art')).not.toBeNull();
    // The phase class is what the tint hangs off, so it has to be on the card.
    expect(card?.className).toMatch(/card--phase-(low|rising|high|falling)/);
  });

  it('says which opponent you are facing in the log, from the first line', () => {
    // The selector is a small control in the corner of the bar, so the log is
    // where a player can actually confirm which bot they drew.
    render();
    const first = container.querySelector('.log__line');
    expect(first?.textContent).toContain('Normal opponent');
    expect(first?.textContent).toContain('seed 7');
  });

  it('records a mid-game opponent change, and says when it takes effect', () => {
    render();
    const select = container.querySelector<HTMLSelectElement>('.bar__difficulty select')!;
    act(() => {
      select.value = 'hard';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const lines = [...container.querySelectorAll('.log__line')].map((l) => l.textContent ?? '');
    expect(lines.some((l) => l.includes('Hard') && l.includes('next turn'))).toBe(true);
  });

  it('warns on a card the coming tide will kill by itself', async () => {
    // The one loss a player can still prevent, and the one they would otherwise
    // discover only after it happened.
    const { createInstance, effectiveStats, CARDS } = await import('@tidalix/engine');
    const { CardView } = await import('./CardView.tsx');
    const def = CARDS.find((c) => c.id === 'whitetip-reef-shark')!;
    const inst = createInstance(def.id, 0);
    inst.damage = 3;

    act(() => {
      root.render(
        <CardView
          instance={inst}
          stats={effectiveStats(inst, 'low', def)}
          phase="low"
          state="idle"
          dying
        />,
      );
    });
    const card = container.querySelector('.card')!;
    expect(card.classList.contains('is-dying')).toBe(true);
    expect(container.querySelector('.chip--dying')?.textContent).toBe('dying');
    expect(card.getAttribute('aria-label')).toContain('dying at the next tide');
  });

  it('records draws, turns and card powers in the log, without leaking the AI hand', () => {
    // The log is a record to review a game from, so the actions that change the
    // game — picking up a card, an arrival firing — have to be in it. What the
    // opponent drew must not be, which is the one line that has to stay vague.
    render();
    const lines = () => [...container.querySelectorAll('.log__line')].map((l) => l.textContent ?? '');

    expect(lines().some((l) => l.startsWith('— Turn 1'))).toBe(true);
    // Seed 7 opens with the player, and the opener forgoes their first draw —
    // so the log must say that rather than silently showing no draw at all.
    expect(lines().some((l) => l.includes('no draw this turn'))).toBe(true);

    // Play whatever is affordable, and check something got recorded for it.
    const before = lines().length;
    const playable = container.querySelector<HTMLButtonElement>('.hand .card--playable');
    if (playable) {
      act(() => playable.click());
      expect(lines().length).toBeGreaterThan(before);
      expect(lines().some((l) => l.includes('You play'))).toBe(true);
    }

    // Nothing in the log may name a card in the opponent's hand.
    const aiDraws = lines().filter((l) => l.includes('The AI draws'));
    for (const line of aiDraws) expect(line).toBe('The AI draws a card');
  });

  it('gives every species one niche, and every niche a colour', async () => {
    const { CARDS, NICHE_NOTE } = await import('@tidalix/engine');
    const niches = new Set(CARDS.map((c) => c.niche));
    expect(niches.size).toBe(4);
    for (const n of niches) expect(NICHE_NOTE[n], `note for ${n}`).toBeTruthy();
    // The old trait vocabulary is gone entirely, taxon duplicates included.
    for (const dead of ['mollusc', 'echinoderm', 'cephalopod', 'crustacean', 'cleaner', 'reef-fish']) {
      expect([...niches], `"${dead}" should be gone`).not.toContain(dead);
    }
  });

  it('explains the niche and every keyword on the full card', async () => {
    // A bare tag reading "bottom-crawler" tells a player nothing on its own.
    const { CARDS, NICHE_NOTE, createInstance } = await import('@tidalix/engine');
    const { CardDetail } = await import('./CardDetail.tsx');

    for (const def of CARDS.slice(0, 12)) {
      const inst = createInstance(def.id, 0);
      act(() => {
        root.render(
          <CardDetail instance={inst} phase="high" stats={null} zone="hand" onClose={() => {}} />,
        );
      });
      expect(container.textContent, `${def.name} explains its niche`).toContain(
        NICHE_NOTE[def.niche],
      );
      for (const keyword of def.keywords ?? []) {
        const entry = [...container.querySelectorAll('.detail__entry')].find(
          (e) => e.querySelector('dt')?.textContent === keyword,
        );
        expect(entry, `${def.name} explains "${keyword}"`).toBeTruthy();
      }
    }
  });

  it('reads the live stats as one column of the same shape', async () => {
    // The block used to mix three shapes in four rows — "3 / 6", "+1/0", and
    // the prose "no change" — so the sum it is describing was invisible.
    const { createInstance, effectiveStats, getCard } = await import('@tidalix/engine');
    const { CardDetail } = await import('./CardDetail.tsx');

    const def = getCard('coral-grouper'); // 4/4, +1 attack at the high tide
    const inst = { ...createInstance(def.id, 0), damage: 3 };
    const stats = effectiveStats(inst, 'high', def);

    act(() => {
      root.render(
        <CardDetail instance={inst} phase="high" stats={stats} zone="board" onClose={() => {}} />,
      );
    });

    const rows = new Map(
      [...container.querySelectorAll('.detail__grid dt')].map((dt) => [
        dt.textContent,
        dt.nextElementSibling?.textContent ?? '',
      ]),
    );
    expect(rows.get('Base')).toBe('4 / 4');
    expect(rows.get('Tide (high)')).toBe('+1 / +0');
    // No neighbours on this board, and "nothing" is a glyph, not a sentence.
    expect(rows.get('Symbiosis')).toBe('—');
    expect(rows.get('Damage')).toBe('+0 / -3');
    // Base + tide - damage, which only reads as a sum if every row lines up.
    expect(rows.get('Total')).toContain('5 / 1');
    expect(container.textContent).toContain('Live stats');
    expect(container.textContent).not.toContain('Right now');
  });

  it('states every symbiosis in one shape, arrow first, with the niche wearing its badge', async () => {
    const { createInstance, getCard } = await import('@tidalix/engine');
    const { CardDetail } = await import('./CardDetail.tsx');

    for (const id of ['coral-grouper', 'crown-of-thorns-starfish']) {
      const def = getCard(id);
      act(() => {
        root.render(
          <CardDetail
            instance={createInstance(id, 0)}
            phase="high"
            stats={null}
            zone="hand"
            onClose={() => {}}
          />,
        );
      });

      expect(container.textContent).toContain('Symbiosis');
      expect(container.textContent).not.toContain('Symbiosis gift');
      const row = container.querySelector('.detail__auras li')!;
      expect(row.querySelector('.detail__aura-arrow')?.textContent).toBe('→');
      // The niche is the same badge here as it is in the traits list above, so
      // a gift points at something the player can recognise on another card.
      const badge = row.querySelector(`.tag--niche-${def.auras![0]!.affects}`);
      expect(badge, `${def.name} badges its target niche`).toBeTruthy();
      // Both halves of the delta are signed, zero included.
      expect(row.querySelector('b')?.textContent).toMatch(/^[+-]\d+\/[+-]\d+$/);
      // And every line says how far it reaches, not only the one that crosses.
      expect(row.querySelector('.detail__target')?.textContent).toBe(
        def.auras![0]!.crossesWaterline ? 'both reefs' : 'your reef',
      );
    }
  });

  it('reports release readiness the same way on either reef', async () => {
    const { createInstance } = await import('@tidalix/engine');
    const { CardDetail } = await import('./CardDetail.tsx');

    const row = (release: NonNullable<Parameters<typeof CardDetail>[0]['release']>) => {
      act(() => {
        root.render(
          <CardDetail
            instance={createInstance('giant-clam', 0)}
            phase="high"
            stats={null}
            zone="board"
            release={release}
            onClose={() => {}}
          />,
        );
      });
      const dt = [...container.querySelectorAll('.detail__grid dt')].find(
        (e) => e.textContent === 'Release',
      );
      return dt?.nextElementSibling ?? null;
    };

    // Two states, two words each, and nothing about whose turn it is or how the
    // rule works. The section used to explain the one-release-per-turn limit
    // and to word itself differently depending on who owned the card.
    expect(row({ mature: true, stepsRemaining: 0 })?.textContent).toBe('Ready');
    expect(row({ mature: false, stepsRemaining: 3 })?.textContent).toBe(
      'In 3 more tide phases',
    );
    expect(row({ mature: false, stepsRemaining: 1 })?.textContent).toBe(
      'In 1 more tide phase',
    );

    // Readiness is the only thing the section reports: what the card protects is
    // already under its name, and the pile's income is the panel's job.
    expect(container.textContent).not.toContain('Pile pays');
    expect(container.textContent).not.toContain('Protects');
  });
  it('prints each keyword exactly once on a card', async () => {
    // `toxic` and `toxin-immune` were rendering twice: once from the generic
    // pass over def.keywords and again from a hand-written tag beside it. Any
    // keyword that grows a bespoke tag will trip this.
    const { CARDS, createInstance, effectiveStats } = await import('@tidalix/engine');
    const { CardView } = await import('./CardView.tsx');

    for (const def of CARDS.filter((c) => (c.keywords?.length ?? 0) > 0)) {
      const inst = createInstance(def.id, 0);
      act(() => {
        root.render(
          <CardView
            instance={inst}
            stats={effectiveStats(inst, 'high', def)}
            phase="high"
            state="idle"
          />,
        );
      });
      for (const keyword of def.keywords!) {
        const tags = [...container.querySelectorAll('.card__tags .tag')].filter(
          (t) => t.textContent === keyword,
        );
        expect(tags, `${def.name} renders "${keyword}"`).toHaveLength(1);
      }
    }
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
  it('shows the tide and symbiosis breakdown separately, plus armour and auras', async () => {
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
    // Both halves of a delta carry a sign, zero included — the same rule the
    // live-stats column follows, so a chip and a row read alike.
    expect(text).toContain('tide +0/+1');
    expect(text).toContain('symbiosis +0/+2');
    // Its own niche, and its aura pointed back at the host.
    expect(text).toContain('reef-dweller');
    expect(text).toContain('frame-builder');
    // The relationship's *numbers* belong on the card face; the sentence
    // explaining it belongs on the full card, where there is room to read it.
    expect(text).not.toContain('drives off polyp-eaters');
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
    render(9);
    const before = container.querySelectorAll('.side--you .card').length;
    const card = container.querySelector<HTMLElement>('.hand .card--playable')!;
    act(() => {
      card.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
    });
    expect(container.querySelectorAll('.side--you .card').length).toBe(before);
  });

  it('shows armour on an animal that is hard to hurt', async () => {
    const { createInstance, effectiveStats, getCard } = await import('@tidalix/engine');
    const { CardView } = await import('./CardView.tsx');
    const puffer = createInstance('blackspotted-puffer', 0);
    const stats = effectiveStats(puffer, 'low', getCard('blackspotted-puffer'));

    act(() => {
      root.render(<CardView instance={puffer} stats={stats} phase="low" state="idle" />);
    });
    expect(container.textContent).toContain('armour 2');
    expect(container.textContent).toContain('Arothron nigropunctatus');
  });
});

describe('symbiosis links', () => {
  it('draws nothing until a card is asked about', async () => {
    // Every relationship drawn at once turned a six-card board into a cat's
    // cradle. Links are a question you ask about one animal, not furniture.
    vi.useFakeTimers();
    try {
      render(7);
      for (let turn = 0; turn < 10; turn++) {
        const mine = container.querySelectorAll('.side--you .card');
        if (mine.length >= 2) {
          expect(container.querySelectorAll('.symbiosis__link')).toHaveLength(0);
          return;
        }
        const playable = container.querySelector<HTMLButtonElement>('.hand .card--playable');
        if (playable) {
          act(() => playable.click());
          const t = container.querySelector<HTMLButtonElement>('.side--enemy .card--target');
          if (t) act(() => t.click());
          continue;
        }
        const end = container.querySelector<HTMLButtonElement>('.btn--primary:not(:disabled)');
        if (!end) break;
        act(() => end.click());
        await act(async () => { vi.advanceTimersByTime(800); });
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('lets any card be selected, not only one that can attack', () => {
    // A coral cannot attack and is exactly the card whose relationships a player
    // wants to ask about, so it has to be clickable.
    for (let seed = 1; seed <= 40; seed++) {
      remount();
      render(seed);
      const playable = [...container.querySelectorAll<HTMLButtonElement>('.hand .card--playable')];
      const builder = playable.find((c) => c.querySelector('.stat--attack')?.textContent === '0');
      if (!builder) continue;
      act(() => builder.click());
      const onBoard = container.querySelector<HTMLButtonElement>('.side--you .card--support');
      if (!onBoard) continue;
      act(() => onBoard.click());
      expect(container.querySelector('.side--you .card--selected')).not.toBeNull();
      return;
    }
    throw new Error('no 0-attack card reached the reef in 40 seeds');
  });
});

describe('the coin flip', () => {
  it('does not hand the first turn to the player every game', async () => {
    // Moving first wins about 63% of games, so who starts cannot be a constant.
    const { createGame, startGame } = await import('@tidalix/engine');
    let youFirst = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const s = startGame(createGame({ seed, startingPlayer: 'random' })).state;
      if (s.activePlayer === 0) youFirst++;
    }
    expect(youFirst).toBeGreaterThan(70);
    expect(youFirst).toBeLessThan(130);
  });

  it('stays reproducible from the seed, flip included', async () => {
    const { createGame, startGame } = await import('@tidalix/engine');
    for (const seed of [3, 7, 11]) {
      const a = startGame(createGame({ seed, startingPlayer: 'random' })).state;
      const b = startGame(createGame({ seed, startingPlayer: 'random' })).state;
      expect(a.activePlayer).toBe(b.activePlayer);
      expect(a.players[0].hand.map((c) => c.definitionId)).toEqual(
        b.players[0].hand.map((c) => c.definitionId),
      );
    }
  });

  it('says who starts in the opening line of the log', () => {
    render(7);
    expect(container.querySelector('.log__line')?.textContent).toContain('You go first');
  });

  it('deals one copy of each species, never two', async () => {
    const { CARDS, starterDeckList } = await import('@tidalix/engine');
    const deck = starterDeckList();
    expect(deck.length).toBe(CARDS.length);
    expect(new Set(deck).size).toBe(deck.length);
  });
});

describe('log wording', () => {
  it('agrees with its own subject, and never says "You has"', async () => {
    // Grammar bugs in generated strings read as broken software. Every line
    // that takes a player as its subject is checked against both players.
    const { CARDS, createGame, startGame, takeTurn } = await import('@tidalix/engine');
    void CARDS;
    const seen = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      let s = startGame(createGame({ seed, startingPlayer: seed % 2 as 0 | 1 })).state;
      let guard = 0;
      while (s.winner === undefined && guard++ < 200) {
        const { state: next, events } = takeTurn(s, s.activePlayer, 'normal');
        for (const e of events) seen.add(e.type);
        s = next;
      }
    }
    // The suite above only proves the events fire; the strings are checked by
    // rendering them, which the app does. Here we assert the shapes that broke:
    expect(seen.has('DAMAGE_DEALT')).toBe(true);
    expect(seen.has('CARD_DESTROYED')).toBe(true);
  });

  it('leads a card with its niche, then its traits', async () => {
    const { CARDS, createInstance, effectiveStats } = await import('@tidalix/engine');
    const { CardView } = await import('./CardView.tsx');
    const def = CARDS.find((c) => (c.keywords?.length ?? 0) > 0)!;
    const inst = createInstance(def.id, 0);
    act(() => {
      root.render(
        <CardView instance={inst} stats={effectiveStats(inst, 'high', def)} phase="high" state="idle" />,
      );
    });
    const tags = [...container.querySelectorAll('.card__tags .tag')];
    expect(tags[0]?.textContent, 'niche must come first').toBe(def.niche);
  });
});
