/**
 * Generates the TidaliX field guide — the rules, and every species with its live
 * stats in all four tide phases.
 *
 * It reads the engine's own card data through the engine's own `effectiveStats`,
 * so the published page can never drift from what the resolver actually does.
 * Re-run it (`npm run guide`) whenever a card is tuned.
 *
 *   npm run guide            -> docs/field-guide.html
 */
import { writeFileSync } from 'node:fs';
import { CARDS, DEFAULT_CONFIG, TAXON_LABEL, TIDE_CYCLE, effectiveStats } from '../engine/dist/index.js';

const P = [...TIDE_CYCLE];

/** Read every card's live stats out of the engine itself, phase by phase. */
const DATA = {
  config: DEFAULT_CONFIG,
  cards: CARDS.map((c) => {
    const inst = {
      instanceId: 'x',
      definitionId: c.id,
      owner: 0,
      damage: 0,
      playedOnTurn: null,
      playedOnTideStep: null,
      hasAttacked: false,
      poisoned: false,
    };
    const per = {};
    for (const p of P) {
      const s = effectiveStats(inst, p, c);
      per[p] = { a: s.attack, h: s.maxHealth, ex: s.exposed, en: s.energy };
    }
    return {
      id: c.id,
      name: c.name,
      species: c.species,
      type: c.type,
      taxon: c.taxon,
      cost: c.cost,
      base: [c.attack, c.health],
      kw: c.keywords ?? [],
      niche: c.niche,
      armour: c.armour ?? 0,
      spines: c.spines ?? 0,
      arrival: c.arrival ?? null,
      auras: c.auras ?? [],
      text: c.text,
      per,
    };
  }),
};

const byId = new Map(DATA.cards.map((c) => [c.id, c]));
const cfg = DATA.config;

const GROUPS = [
  {
    phase: 'low',
    title: 'Low tide — the exposed flat',
    blurb:
      'The water has drained off the reef flat. These are the animals that keep hunting on foot, in air, or in inches of water, while everything built for deep water is stranded and vulnerable.',
    ids: ['atlantic-mudskipper', 'sally-lightfoot-crab', 'tasselled-wobbegong', 'common-octopus', 'long-spined-urchin'],
  },
  {
    phase: 'rising',
    title: 'Rising tide — the flood',
    blurb:
      'Water climbs back over the crest and carries plankton with it. This is the phase that pays: the flood is the richest income in the game, and the reason banking through a lean low tide is worth doing.',
    ids: ['peacock-mantis-shrimp', 'coral-grouper', 'warty-frogfish', 'moorish-idol'],
  },
  {
    phase: 'high',
    title: 'High tide — over the crest',
    blurb:
      'The reef is fully submerged and the big open-water animals come in over the top. The heaviest bodies in the set live here, and most of them pay for it when the water leaves.',
    ids: ['reef-manta-ray', 'box-jellyfish', 'whitetip-reef-shark', 'green-sea-turtle', 'bumphead-parrotfish', 'giant-trevally'],
  },
  {
    phase: 'falling',
    title: 'Falling tide — the drain',
    blurb:
      'The flat empties into the channels and funnels everything living on it past a few narrow points. Ambush predators hold station and wait.',
    ids: ['great-barracuda', 'giant-moray'],
  },
  {
    phase: null,
    title: 'Armed — animals that punish being attacked',
    blurb:
      'Every defender in TidaliX strikes back, so these animals are not the ones that punish an attacker — they are the ones that are hard to hurt at all. A printed armour value comes off the top of every hit they take, from attacks and from retaliation alike. All three are also toxic: kill one and whatever ate it dies of the toxin, unless it is one of the few predators printed as toxin-immune.',
    ids: ['blackspotted-puffer', 'red-lionfish', 'crown-of-thorns-starfish'],
  },
  {
    phase: null,
    title: 'Residents — the mid phases',
    blurb:
      'Species that never leave the reef and barely notice the cycle. They swing little, which makes them the stable core of a deck rather than its peaks — and two of them are the best symbiosis enablers in the set.',
    ids: ['clown-anemonefish', 'clown-triggerfish', 'mushroom-coral', 'bluestreak-cleaner-wrasse'],
  },
  {
    phase: null,
    title: 'Structures — the reef itself',
    blurb:
      'They do not attack. They hold ground, pay energy on the flood and at high water, shelter the fish that live in them, and bake when the tide goes out — every one of them is exposed at low tide. The two corals also build into each other: each is worth more health with another coral beside it, which is the closest thing in the set to a reef being a structure rather than a pile of cards.',
    ids: ['staghorn-coral', 'table-coral', 'bubble-tip-anemone', 'giant-clam'],
  },
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);

function peakPhases(card) {
  const totals = P.map((p) => card.per[p].a + card.per[p].h);
  const max = Math.max(...totals);
  if (totals.every((t) => t === max)) return [];
  return P.filter((p, i) => totals[i] === max);
}

function strip(card) {
  const peaks = peakPhases(card);
  const cells = P.map((p) => {
    const v = card.per[p];
    const cls = ['ph', `ph--${p}`, peaks.includes(p) ? 'is-peak' : '', v.ex ? 'is-exposed' : ''].filter(Boolean).join(' ');
    const flags = [
      v.en ? `<span class="ph__energy" title="generates ${v.en} energy each turn">+${v.en}&#11041;</span>` : '',
      v.ex ? `<span class="ph__exposed" title="takes +${cfg.exposedBonusDamage} damage from attacks">exposed</span>` : '',
    ].join('');
    return `<div class="${cls}">
        <span class="ph__name">${p}</span>
        <span class="ph__stat">${v.a}<span class="ph__slash">/</span>${v.h}</span>
        <span class="ph__flags">${flags}</span>
      </div>`;
  }).join('\n      ');
  return `<div class="strip" role="group" aria-label="Stats by tide phase">\n      ${cells}\n    </div>`;
}

function cardRow(id) {
  const c = byId.get(id);
  if (!c) throw new Error(`missing card ${id}`);

  const kw = c.kw.map((k) => `<span class="kw kw--${k}">${k}</span>`).join('');
  const type = c.type === 'structure' ? '<span class="kw kw--structure">structure</span>' : '';
  const armour = c.armour
    ? `<span class="kw kw--armour" title="comes off the top of every hit it takes">armour ${c.armour}</span>`
    : '';
  const spines = c.spines
    ? `<span class="kw kw--spines" title="dealt back to whatever attacks it">spines ${c.spines}</span>`
    : '';
  const ARRIVAL_TEXT = {
    strike: (n) => `deal ${n} damage to an enemy creature`,
    sweep: (n) => `deal ${n} damage to every enemy creature`,
    mend: (n) => `heal ${n} from every friendly creature`,
    forage: (n) => `gain ${n} energy`,
    scout: (n) => `draw ${n}`,
  };
  const arrival = c.arrival
    ? `<p class="arrival"><span class="arrival__mark">&#9656;</span><span><b>On arrival:</b> ${ARRIVAL_TEXT[c.arrival.kind](c.arrival.amount)}
        <span class="arrival__note">${esc(c.arrival.note)}</span></span></p>`
    : '';
  // Niche first: the category, before anything the animal does.
  const niche = `<span class="kw kw--niche-${c.niche}">${c.niche}</span>`;
  const taxon = `<span class="kw kw--taxon" title="taxon — what the conservation pile is scored on">${esc(TAXON_LABEL[c.taxon])}</span>`;

  const auras = c.auras
    .map((a) => {
      const da = a.grants.attack ?? 0;
      const dh = a.grants.health ?? 0;
      const harmful = da + dh < 0;
      return `<p class="aura${harmful ? ' aura--harmful' : ''}">
        <span class="aura__mark">${harmful ? '&#10005;' : '&#8644;'}</span>
        <span>every friendly <b>${a.affects}</b> gets <b>${fmt(da)}/${fmt(dh)}</b>
        <span class="aura__note">${esc(a.note)}</span></span>
      </p>`;
    })
    .join('');

  return `<article class="card">
    <div class="card__id">
      <span class="cost" title="energy cost">${c.cost}</span>
      <div class="card__names">
        <h4 class="card__name">${esc(c.name)}</h4>
        <p class="card__sp"><i>${esc(c.species)}</i></p>
      </div>
    </div>
    <div class="card__body">
      <p class="card__text">${esc(c.text)}</p>
      <p class="card__meta"><span class="printed">base ${c.base[0]}/${c.base[1]}</span>${niche}${type}${taxon}${kw}${armour}${spines}</p>
      ${arrival}
      ${auras}
    </div>
    ${strip(c)}
  </article>`;
}

const groupsHtml = GROUPS.map(
  (g) => `<section class="group${g.phase ? ` group--${g.phase}` : ''}">
  <header class="group__head">
    <h3 class="group__title">${esc(g.title)}</h3>
    <p class="group__blurb">${esc(g.blurb)}</p>
  </header>
  <div class="cards">
    ${g.ids.map(cardRow).join('\n    ')}
  </div>
</section>`,
).join('\n\n');

const wants = P.map((p) => {
  const list = DATA.cards.filter((c) => peakPhases(c).includes(p)).map((c) => c.name);
  return `<div class="wants__col wants--${p}">
      <h4 class="wants__phase">${p}</h4>
      <p class="wants__income">${cfg.tideEnergy[p] > 0 ? `pays +${cfg.tideEnergy[p]} energy` : 'pays nothing'}</p>
      <ul class="wants__list">${list.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
    </div>`;
}).join('\n    ');

const symbioses = DATA.cards
  .filter((c) => c.auras.length)
  .flatMap((c) =>
    c.auras.map((a) => {
      const da = a.grants.attack ?? 0;
      const dh = a.grants.health ?? 0;
      const partners = DATA.cards.filter((o) => o.id !== c.id && o.niche === a.affects).map((o) => o.name);
      return `<tr class="${da + dh < 0 ? 'is-harmful' : ''}">
        <td class="sym__from">${esc(c.name)}</td>
        <td><code>${a.affects}</code></td>
        <td class="sym__grant"><b>${fmt(da)}/${fmt(dh)}</b></td>
        <td class="sym__who">${partners.map(esc).join(', ') || '&mdash;'}</td>
        <td class="sym__note">${esc(a.note)}</td>
      </tr>`;
    }),
  )
  .join('\n      ');

const html = `<title>TidaliX Field Guide</title>
<style>
  :root {
    --ground: #e7ecee; --surface: #f4f8f8; --sunken: #dde5e7;
    --ink: #0e2229; --ink-soft: #3d565e; --ink-faint: #6d858c;
    --line: #c4d1d4; --line-soft: #d7e0e2; --accent: #0b6e7f;
    --low: #b4642e; --rising: #2f8570; --high: #1d4e87; --falling: #5d6e90;
    --warn: #a8432b; --good: #2f8570;
    --tint: 12%; --peak-tint: 15%;
    --serif: Georgia, "Iowan Old Style", "Palatino Linotype", Palatino, serif;
    --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
    --measure: 68ch; --pad: clamp(1.1rem, 4vw, 2.75rem);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #091519; --surface: #0f2229; --sunken: #142c35;
      --ink: #dde8ea; --ink-soft: #a0b6bc; --ink-faint: #759098;
      --line: #1f3d47; --line-soft: #182f38; --accent: #52bccd;
      --low: #dd8f52; --rising: #58bda1; --high: #6098db; --falling: #97a7c6;
      --warn: #e5765f; --good: #58bda1;
      --tint: 18%; --peak-tint: 24%;
    }
  }
  :root[data-theme="dark"] {
    --ground: #091519; --surface: #0f2229; --sunken: #142c35;
    --ink: #dde8ea; --ink-soft: #a0b6bc; --ink-faint: #759098;
    --line: #1f3d47; --line-soft: #182f38; --accent: #52bccd;
    --low: #dd8f52; --rising: #58bda1; --high: #6098db; --falling: #97a7c6;
    --warn: #e5765f; --good: #58bda1;
    --tint: 18%; --peak-tint: 24%;
  }

  body { background: var(--ground); color: var(--ink); font-family: var(--sans); font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 1060px; margin: 0 auto; padding: var(--pad); display: flex; flex-direction: column; gap: clamp(2.5rem, 6vw, 4.5rem); }
  h1, h2, h3, h4 { font-family: var(--serif); font-weight: 600; text-wrap: balance; line-height: 1.2; }
  p { text-wrap: pretty; }
  :focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 2px; }
  .lede { max-width: var(--measure); color: var(--ink-soft); }

  .mast { display: flex; flex-direction: column; gap: 1.4rem; }
  .mast__eyebrow { font-family: var(--mono); font-size: .7rem; letter-spacing: .16em; text-transform: uppercase; color: var(--ink-faint); }
  .mast h1 { font-size: clamp(2.4rem, 7vw, 3.9rem); letter-spacing: -.015em; margin: 0; }
  .mast h1 span { color: var(--accent); }

  .cycle { display: flex; flex-wrap: wrap; align-items: stretch; gap: .5rem; padding: 1rem; border: 1px solid var(--line); border-radius: 3px; background: var(--surface); }
  .cycle__step { flex: 1 1 8rem; display: flex; flex-direction: column; gap: .3rem; padding: .7rem .8rem; border-radius: 2px; border-top: 3px solid var(--c); background: color-mix(in srgb, var(--c) var(--tint), var(--surface)); }
  .cycle__step--low { --c: var(--low); } .cycle__step--rising { --c: var(--rising); }
  .cycle__step--high { --c: var(--high); } .cycle__step--falling { --c: var(--falling); }
  .cycle__name { font-family: var(--mono); font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; color: var(--c); font-weight: 700; }
  .cycle__pay { font-family: var(--mono); font-size: .72rem; color: var(--ink); font-weight: 700; }
  .cycle__note { font-size: .82rem; color: var(--ink-soft); line-height: 1.45; }
  .cycle__arrow { align-self: center; color: var(--ink-faint); font-size: .9rem; }

  .rules { display: flex; flex-direction: column; gap: 2rem; }
  .rules__grid { display: grid; gap: 1px; background: var(--line-soft); border: 1px solid var(--line-soft); border-radius: 3px; overflow: hidden; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); }
  .rule { background: var(--surface); padding: 1.25rem 1.35rem; display: flex; flex-direction: column; gap: .55rem; }
  .rule h4 { margin: 0; font-size: 1.05rem; }
  .rule p { margin: 0; font-size: .9rem; color: var(--ink-soft); }
  .rule ul { margin: 0; padding-left: 1.1rem; font-size: .9rem; color: var(--ink-soft); display: flex; flex-direction: column; gap: .35rem; }
  .rule b { color: var(--ink); font-weight: 600; }
  code, .num { font-family: var(--mono); font-size: .87em; font-variant-numeric: tabular-nums; background: var(--sunken); padding: .08em .38em; border-radius: 2px; color: var(--ink); }

  h2 { font-size: clamp(1.5rem, 3.4vw, 2rem); margin: 0 0 .5rem; }
  .sect__head { display: flex; flex-direction: column; gap: .4rem; margin-bottom: 1.6rem; }
  .sect__head .lede { margin: 0; }

  .wants { display: grid; gap: 1px; background: var(--line-soft); border: 1px solid var(--line-soft); border-radius: 3px; overflow: hidden; grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr)); }
  .wants__col { background: var(--surface); padding: 1rem 1.1rem; border-top: 3px solid var(--c); }
  .wants--low { --c: var(--low); } .wants--rising { --c: var(--rising); }
  .wants--high { --c: var(--high); } .wants--falling { --c: var(--falling); }
  .wants__phase { margin: 0 0 .15rem; font-family: var(--mono); font-size: .74rem; letter-spacing: .14em; text-transform: uppercase; color: var(--c); font-weight: 700; }
  .wants__income { margin: 0 0 .6rem; font-family: var(--mono); font-size: .68rem; color: var(--ink-faint); }
  .wants__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .3rem; font-size: .88rem; color: var(--ink-soft); }

  .scroller { overflow-x: auto; border: 1px solid var(--line-soft); border-radius: 3px; }
  table.sym { border-collapse: collapse; width: 100%; min-width: 46rem; background: var(--surface); font-size: .86rem; }
  table.sym th, table.sym td { text-align: left; padding: .6rem .8rem; border-bottom: 1px solid var(--line-soft); vertical-align: top; }
  table.sym th { font-family: var(--mono); font-size: .66rem; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-faint); font-weight: 700; }
  table.sym tr:last-child td { border-bottom: 0; }
  .sym__from { font-family: var(--serif); font-weight: 600; white-space: nowrap; }
  .sym__grant { font-family: var(--mono); color: var(--good); font-variant-numeric: tabular-nums; white-space: nowrap; }
  tr.is-harmful .sym__grant { color: var(--warn); }
  .sym__who { color: var(--ink-soft); }
  .sym__note { color: var(--ink-faint); font-style: italic; }

  .roster { display: flex; flex-direction: column; gap: 3rem; }
  .group { display: flex; flex-direction: column; gap: 1.1rem; }
  .group__head { display: flex; flex-direction: column; gap: .35rem; padding-left: .9rem; border-left: 3px solid var(--c, var(--line)); }
  .group--low { --c: var(--low); } .group--rising { --c: var(--rising); }
  .group--high { --c: var(--high); } .group--falling { --c: var(--falling); }
  .group__title { margin: 0; font-size: 1.28rem; }
  .group__blurb { margin: 0; font-size: .9rem; color: var(--ink-soft); max-width: var(--measure); }

  .cards { display: flex; flex-direction: column; gap: .75rem; }
  .card { display: grid; gap: .9rem 1.4rem; align-items: start; grid-template-columns: minmax(13rem, 1fr) minmax(0, 1.3fr) auto; padding: 1rem 1.15rem; background: var(--surface); border: 1px solid var(--line-soft); border-radius: 3px; }
  .card__id { display: flex; gap: .8rem; align-items: baseline; }
  .cost { flex: none; font-family: var(--mono); font-size: .95rem; font-weight: 700; color: var(--accent); background: var(--sunken); min-width: 1.9rem; height: 1.9rem; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; align-self: center; }
  .card__names { display: flex; flex-direction: column; gap: .1rem; }
  .card__name { margin: 0; font-size: 1.06rem; }
  .card__sp { margin: 0; font-family: var(--serif); font-size: .84rem; color: var(--ink-faint); }
  .card__body { display: flex; flex-direction: column; gap: .5rem; }
  .card__text { margin: 0; font-size: .86rem; color: var(--ink-soft); line-height: 1.5; }
  .card__meta { margin: 0; display: flex; flex-wrap: wrap; gap: .35rem; align-items: center; }
  .printed { font-family: var(--mono); font-size: .72rem; color: var(--ink-faint); font-variant-numeric: tabular-nums; }
  .kw {
    font-family: var(--mono); font-size: .62rem; letter-spacing: .05em; text-transform: uppercase;
    padding: .1em .38em; border-radius: 2px;
    border: 1px solid color-mix(in srgb, var(--b, #c4d1d4) 55%, transparent);
    color: var(--b, #6d858c);
  }
  .kw--surge, .kw--reef-guard, .kw--toxic, .kw--toxin-immune,
  .kw--pierce, .kw--armour, .kw--spines, .kw--arrival {
    background: color-mix(in srgb, var(--b) 13%, transparent); font-weight: 700;
  }
  .kw--surge { --b: #836607; }
  .kw--reef-guard { --b: #0c3ddf; }
  .kw--toxic { --b: #da120b; }
  .kw--toxin-immune { --b: #27684a; }
  .kw--pierce { --b: #870abd; }
  .kw--armour { --b: #505922; }
  .kw--spines { --b: #aa0949; }
  .kw--arrival { --b: #12797d; }
  .kw--structure { --b: #6d858c; }
  .kw--taxon { --b: #27684a; text-transform: none; }
  .kw--niche-reef-dweller { --b: #0972ae; }
  .kw--niche-open-water { --b: #7459c0; }
  .kw--niche-reef-builder { --b: #883f07; }
  .kw--niche-bottom-dweller { --b: #505922; }
  .kw--spines { color: var(--warn); border-color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); font-weight: 700; }
  .arrival { display: flex; gap: 0.4rem; margin: 0.3rem 0 0; font-size: 0.82rem; color: var(--accent); }
  .arrival__mark { opacity: 0.75; }
  .arrival__note { color: var(--muted, #6d858c); font-style: italic; }
  .kw--toxic { color: var(--warn); border-color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); font-weight: 700; }
  .kw--pierce { color: var(--accent); border-color: var(--accent); font-weight: 700; }
  .kw--toxin-immune { color: var(--rising); border-color: color-mix(in srgb, var(--rising) 55%, transparent); }
  .kw--taxon { color: var(--good, var(--rising)); border-color: color-mix(in srgb, var(--rising) 45%, transparent); text-transform: none; }
  .kw--trait { opacity: .75; text-transform: lowercase; letter-spacing: .02em; }

  .aura { margin: 0; display: flex; gap: .45rem; font-size: .8rem; color: var(--good); align-items: baseline; }
  .aura--harmful { color: var(--warn); }
  .aura__mark { font-family: var(--mono); }
  .aura b { color: var(--ink); }
  .aura__note { color: var(--ink-faint); font-style: italic; display: block; font-size: .78rem; }

  .strip { display: grid; grid-template-columns: repeat(4, minmax(4.4rem, 1fr)); gap: 3px; }
  .ph { display: flex; flex-direction: column; align-items: center; gap: .12rem; padding: .45rem .3rem .5rem; border-radius: 2px; border-top: 3px solid color-mix(in srgb, var(--c) 55%, transparent); background: var(--ground); }
  .ph--low { --c: var(--low); } .ph--rising { --c: var(--rising); }
  .ph--high { --c: var(--high); } .ph--falling { --c: var(--falling); }
  .ph.is-peak { border-top-color: var(--c); background: color-mix(in srgb, var(--c) var(--peak-tint), var(--ground)); }
  .ph.is-exposed { background-image: repeating-linear-gradient(-45deg, transparent 0 5px, color-mix(in srgb, var(--warn) 20%, transparent) 5px 7px); }
  .ph__name { font-family: var(--mono); font-size: .6rem; letter-spacing: .1em; text-transform: uppercase; color: var(--c); font-weight: 700; }
  .ph__stat { font-family: var(--mono); font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ink); line-height: 1.25; }
  .ph.is-peak .ph__stat { color: var(--c); }
  .ph__slash { color: var(--ink-faint); font-weight: 400; margin: 0 .05em; }
  .ph__flags { display: flex; gap: .25rem; min-height: .85rem; align-items: center; }
  .ph__energy { font-family: var(--mono); font-size: .6rem; font-weight: 700; color: var(--rising); }
  .ph__exposed { font-family: var(--mono); font-size: .55rem; letter-spacing: .06em; text-transform: uppercase; color: var(--warn); font-weight: 700; }

  .legend { display: flex; flex-wrap: wrap; gap: 1.1rem; align-items: center; padding: .85rem 1.1rem; background: var(--surface); border: 1px solid var(--line-soft); border-radius: 3px; font-size: .8rem; color: var(--ink-soft); }
  .legend span { display: inline-flex; align-items: center; gap: .4rem; }
  .swatch { width: .85rem; height: .85rem; border-radius: 2px; flex: none; }
  .swatch--peak { background: color-mix(in srgb, var(--high) 45%, var(--ground)); border-top: 3px solid var(--high); }
  .swatch--exp { background-image: repeating-linear-gradient(-45deg, transparent 0 4px, color-mix(in srgb, var(--warn) 45%, transparent) 4px 6px); border: 1px solid var(--line); }

  footer { border-top: 1px solid var(--line); padding-top: 1.2rem; font-size: .82rem; color: var(--ink-faint); max-width: var(--measure); }
  footer code { background: var(--sunken); }

  @media (max-width: 900px) {
    .card { grid-template-columns: 1fr; gap: .75rem; }
    .strip { grid-template-columns: repeat(4, 1fr); }
  }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
</style>

<div class="wrap">

  <header class="mast">
    <p class="mast__eyebrow">Reef Flat &middot; starter set &middot; ${DATA.cards.length} species</p>
    <h1>TidaliX <span>Field Guide</span></h1>
    <p class="lede">
      Every rule the engine actually enforces, and every species in the set with
      its live stats in all four tide phases. Numbers here are generated straight
      from the engine's card data, so they cannot drift from what the resolver does.
    </p>

    <div class="cycle">
      <div class="cycle__step cycle__step--low">
        <span class="cycle__name">low</span>
        <span class="cycle__pay">pays 0</span>
        <span class="cycle__note">The flat drains. Reef-dwellers are stranded and take bonus damage, and no plankton comes in at all.</span>
      </div>
      <span class="cycle__arrow">&rarr;</span>
      <div class="cycle__step cycle__step--rising">
        <span class="cycle__name">rising</span>
        <span class="cycle__pay">pays +${cfg.tideEnergy.rising}</span>
        <span class="cycle__note">The flood carries plankton in. The richest phase in the game &mdash; spend what you banked.</span>
      </div>
      <span class="cycle__arrow">&rarr;</span>
      <div class="cycle__step cycle__step--high">
        <span class="cycle__name">high</span>
        <span class="cycle__pay">pays +${cfg.tideEnergy.high}</span>
        <span class="cycle__note">Water over the crest. The big open-water animals come in, and the reef pays rent.</span>
      </div>
      <span class="cycle__arrow">&rarr;</span>
      <div class="cycle__step cycle__step--falling">
        <span class="cycle__name">falling</span>
        <span class="cycle__pay">pays 0</span>
        <span class="cycle__note">The flat empties into channels. Ambush predators hold station; start banking again.</span>
      </div>
      <span class="cycle__arrow">&#8634;</span>
    </div>
  </header>

  <section class="rules">
    <div class="sect__head">
      <h2>The rules</h2>
      <p class="lede">
        One shared tide governs both players. Nobody controls it, it is the only
        clock in the game, and it runs the economy.
      </p>
    </div>

    <div class="rules__grid">
      <div class="rule">
        <h4>Setup</h4>
        <ul>
          <li>Both players start at <b><span class="num">${cfg.startingLife}</span> life</b> and draw <b><span class="num">${cfg.startingHandSize}</span> cards</b>.</li>
          <li>The game opens at <b>low tide</b>.</li>
          <li>Hand cap <span class="num">${cfg.maxHandSize}</span>; drawing past it discards the drawn card.</li>
          <li>The reef holds <span class="num">${cfg.maxBoardSize}</span> cards a side.</li>
        </ul>
      </div>

      <div class="rule">
        <h4>The turn</h4>
        <ul>
          <li>Take your income, then draw one card.</li>
          <li>Play cards and attack in any order.</li>
          <li>End your turn. After both players have gone, the round ends.</li>
          <li>An empty deck means <b>fatigue</b>: 1 damage, then 2, then 3, climbing every draw.</li>
        </ul>
      </div>

      <div class="rule">
        <h4>Energy</h4>
        <ul>
          <li>You open on a base capacity of <span class="num">${cfg.startingEnergyCap}</span>, and it rises by <span class="num">1</span> per <b>complete tide cycle</b> &mdash; not per round &mdash; to a ceiling of <span class="num">${cfg.maxEnergyCap}</span>. Capacity is scarce on purpose: the reef is meant to be your engine.</li>
          <li>The <b>phase pays on top</b>: <span class="num">0</span> on a drained flat, <span class="num">+${cfg.tideEnergy.rising}</span> on the flood, <span class="num">+${cfg.tideEnergy.high}</span> at high water, <span class="num">0</span> on the drain.</li>
          <li>Unspent energy <b>carries over</b>, up to <span class="num">${cfg.carryOverCap}</span>. Bank through a lean phase, dump on the flood.</li>
          <li>Cards on your board that generate energy add theirs at the start of your turn.</li>
          <li>Your <b>conservation pile</b> pays <span class="num">+1</span> every turn per <span class="num">${cfg.conservationIncomePer}</span> distinct <b>taxon</b> in it &mdash; a fish, a coral, a crab and a shark are four; four different fish are one.</li>
        </ul>
      </div>

      <div class="rule">
        <h4>Conservation</h4>
        <ul>
          <li>A species that has survived a <b>complete tide cycle</b> on your reef can be <b>released</b> back to the wild.</li>
          <li>It leaves the board for good into your <b>conservation pile</b> &mdash; neither board nor discard, and the one place a card leaves play as an asset.</li>
          <li>Only <span class="num">${cfg.releasesPerTurn}</span> goes back per turn, and releasing frees the board slot it held.</li>
          <li>The pile scores <b>distinct taxa</b>, not names: biodiversity is measured across branches of the tree, so a pile of six reef fish is one branch protected. Protect <span class="num">${cfg.conservationVictory}</span> of the ${new Set(CARDS.map((c) => c.taxon)).size} taxa in the set and you <b>win outright</b>.</li>
          <li class="rules__taxa">The taxa: ${[...new Set(CARDS.map((c) => c.taxon))].map((t) => `<b>${esc(TAXON_LABEL[t])}</b>`).join(', ')}.</li>
        </ul>
      </div>

      <div class="rule">
        <h4>The tide turns</h4>
        <ul>
          <li>It advances <b>once per round</b>, not once per turn, so both players act inside the same phase.</li>
          <li>Per-turn advancement is configurable, but it locks each player out of two of the four phases.</li>
          <li>A phase change re-stats <b>every card on the board at once</b>.</li>
        </ul>
      </div>

      <div class="rule">
        <h4>Combat</h4>
        <ul>
          <li>A card cannot attack the turn it is played unless it has <b>surge</b>.</li>
          <li>One attack per card per turn. Cards with <span class="num">0</span> attack cannot attack at all.</li>
          <li>The defender <b>always strikes back</b>, for its full attack plus any <b>spines</b>. Killing something is a trade, which is what stops a wide board clearing everything you play for free.</li>
          <li>A <b>reef-guard</b> must be dealt with before anything behind it, face included.</li>
        </ul>
      </div>

      <div class="rule">
        <h4>Armour</h4>
        <p>
          Now that every defender hits back, the armed animals are not the ones
          that punish an attacker &mdash; they are the ones that are hard to hurt.
          <b>Armour</b> is a printed number that comes off the top of every hit
          they take: a pufferfish inflated into a ball, an urchin wedged in its
          socket, an anemone withdrawn.
        </p>
        <p>
          It applies to attacks and to retaliation alike, so an armoured animal is
          both awful to attack and awful to be attacked by. Damage never goes
          below zero: a blocked hit is nothing, not a heal.
        </p>
      </div>

      <div class="rule">
        <h4>Spines</h4>
        <p>
          Retaliation is the defender's attack &mdash; which is <b>nothing</b> for
          an urchin, an anemone or a coral head. Universal retaliation quietly
          made the reef's walls worse rather than better, because attacking them
          was free again.
        </p>
        <p>
          <b>Spines</b> is the answer for animals with no attack to answer with.
          It is dealt back on top of whatever the defender returns by fighting, so
          the rule is still one rule: a defender returns its attack plus its
          spines. Printed only on the unarmed &mdash; the urchin and the anemone.
        </p>
      </div>

      <div class="rule">
        <h4>Arrival</h4>
        <p>
          Some species do something the moment they land &mdash; a strike, a sweep,
          a heal, energy, a card. It resolves immediately, before anything else
          happens, which is what lets a card <em>answer</em> a board rather than
          merely join one and wait a turn to be killed.
        </p>
        <p>
          An arrival is not a free attack: the card still cannot attack the turn it
          is played unless it has <b>surge</b>. Not every card has one, by design
          &mdash; a card without an arrival is paying for it in stats, in its tide
          line, or in an aura.
        </p>
      </div>

      <div class="rule">
        <h4>Exposure</h4>
        <ul>
          <li>Some cards are <b>exposed</b> in some phases &mdash; stranded, bleaching, out of their element.</li>
          <li>An exposed card takes <b>+${cfg.exposedBonusDamage} damage</b> from every attack against it, <b>and from retaliation</b>.</li>
          <li>Destroy a <b>toxic</b> animal by attacking it and your attacker dies too &mdash; eating it is what kills you. Wounding one costs nothing extra, a toxic animal that attacks poisons nobody, and a predator printed <b>toxin-immune</b> eats it and swims away.</li>
          <li>So attacking with a stranded card into anything that can answer is punished twice.</li>
          <li>Exposure is a window, not a state: it opens and closes with the tide.</li>
        </ul>
      </div>

      <div class="rule">
        <h4>Damage and death</h4>
        <p>
          Tide and symbiosis effects are <b>continuous</b> &mdash; a card's stats are
          whatever the current phase and its current neighbours say they are.
          Damage, by contrast, is <b>marked permanently</b> on the card.
        </p>
        <p>
          So a card damaged at high tide can drown when the tide falls and lowers
          its ceiling below the damage already on it. No one attacked it; the
          water simply left. Killing a partner does the same thing, which is why
          deaths <b>cascade</b>.
        </p>
      </div>

      <div class="rule">
        <h4>Winning</h4>
        <ul>
          <li>Reduce your opponent to <span class="num">0</span> life.</li>
          <li>If both players hit zero at once, the reef takes them both &mdash; a draw.</li>
        </ul>
      </div>
    </div>
  </section>

  <section>
    <div class="sect__head">
      <h2>Symbiosis</h2>
      <p class="lede">
        Cards carry biological <b>traits</b>, and some carry <b>auras</b> that grant
        stats to friendly cards with a given trait. Mutualism is not a special case:
        it is simply both partners carrying an aura pointed at the other. Auras never
        apply to the card itself, and never reach across to the opponent.
      </p>
    </div>
    <div class="scroller">
      <table class="sym">
        <thead>
          <tr><th>Source</th><th>Affects trait</th><th>Grants</th><th>In this set</th><th>Relationship</th></tr>
        </thead>
        <tbody>
      ${symbioses}
        </tbody>
      </table>
    </div>
  </section>

  <section>
    <div class="sect__head">
      <h2>Who wants which tide</h2>
      <p class="lede">
        Where each species peaks, by combined attack and health, before symbiosis.
        A few cards are deliberately flat across the cycle &mdash; they trade peaks
        for reliability.
      </p>
    </div>
    <div class="wants">
      ${wants}
    </div>
  </section>

  <section class="roster">
    <div class="sect__head">
      <h2>The species</h2>
      <p class="lede">
        Each card shows its live attack and health in all four phases. Every tide
        line is drawn from how the animal actually behaves &mdash; if a card and its
        species disagree, the card is wrong.
      </p>
    </div>

    <div class="legend">
      <span><span class="swatch swatch--peak"></span> the card's best phase</span>
      <span><span class="swatch swatch--exp"></span> exposed &mdash; takes +${cfg.exposedBonusDamage} damage</span>
      <span><b class="ph__energy">+1&#11041;</b> generates energy each turn</span>
      <span><b class="aura__mark">&#8644;</b> a symbiosis this card offers</span>
      <span><span class="printed">base</span> stats before any effect</span>
    </div>

${groupsHtml}
  </section>

  <footer>
    <p>
      Generated from <code>engine/src/cards.ts</code> through the engine's own
      <code>effectiveStats</code>, so the numbers on this page are the numbers the
      resolver uses. Play it with <code>npm run dev</code>.
    </p>
  </footer>

</div>
`;

const out = new URL('../docs/field-guide.html', import.meta.url);
writeFileSync(out, html);
console.log(
  `wrote docs/field-guide.html — ${DATA.cards.length} species, ${html.length} bytes`,
);
