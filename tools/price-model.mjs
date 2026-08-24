/**
 * A transparent, documented power-scoring model for TidaliX's cost curve.
 *
 * Every incremental trait/dash/symbiosis edit up to this point was costed by
 * comparing the one card being changed to its nearest peers — sound in
 * isolation, but with no way to catch drift across dozens of separate
 * decisions. This scores every card on one consistent scale instead, so a
 * mispricing shows up relative to the whole set rather than only its
 * immediate neighbours.
 *
 * Weights below are informed by how each trait/dash/aura has actually been
 * priced across this project's incremental edits (a keyword addition = +1
 * cost, calibrated against peers; a dash or aura addition = +1 cost),
 * converted into points on a common scale. The points-per-cost conversion
 * rate is NOT assumed — it's fit against the set's own total cost (see
 * below), so results reflect relative mispricing, not a guessed ratio.
 *
 * Run: node tools/price-model.mjs (after `npm run build -w @tidalix/engine`)
 */
import { CARDS } from '@tidalix/engine';
const KEYWORD_POINTS = {
  toxic: 2,           // symmetric kill-back — a real deterrent on any attack
  'toxin-immune': 1,  // only matters against toxic — situational upside
  pierce: 1.5,        // only matters against armour — situational but decisive
  'reef-guard': 2.5,  // forces attacks, protects the whole rest of the board
  surge: 2,           // an attack a turn early, live stats and risk included
};
const ARMOUR_POINT = 2.5;   // blocks damage on *every* incoming hit, not just one
const SPINES_POINT = 2;     // guaranteed retaliation add-on
const ARRIVAL_POINTS = {
  strike: 1.5,   // guaranteed, no retaliation risk
  sweep: 3,      // scales with board width — can hit several targets at once
  mend: 1,       // only as good as the damage already on the board
  forage: 1.5,   // energy tempo
  scout: 3,      // card advantage
};
const AURA_POINT = 1.5; // per point granted, per stat (attack or health treated equally)
const ENERGY_POINT = 1.5; // matches the aura energy weight above — a point of energy outvalues a point of stat
const EXPOSED_PENALTY = 1; // matches config.exposedBonusDamage: one phase exposed costs about one extra hit's worth

// The tide is not a one-shot trait, it is live for the entire game — a card
// spends roughly a quarter of a long game in each phase, so its printed
// attack/health/energy swings and its `exposed` phases are priced on their
// average over the full four-phase cycle, at the same per-point rate as the
// base stats and aura grants they modify. Missing this was the model's own
// blind spot: it scored every trait touching a card's stats except the one
// already printed on nearly every card in the set.
function tideScore(c) {
  const phases = ['low', 'rising', 'high', 'falling'];
  let sum = 0;
  for (const p of phases) {
    const e = c.tide?.[p];
    if (!e) continue;
    sum += (e.attack ?? 0) + (e.health ?? 0) + (e.energy ?? 0) * ENERGY_POINT;
    if (e.exposed) sum -= EXPOSED_PENALTY;
  }
  return sum / phases.length;
}

function powerScore(c) {
  let p = (c.attack ?? 0) + (c.health ?? 0);
  if (c.armour) p += c.armour * ARMOUR_POINT;
  if (c.spines) p += c.spines * SPINES_POINT;
  for (const kw of c.keywords ?? []) p += KEYWORD_POINTS[kw] ?? 0;
  if (c.arrival) p += (ARRIVAL_POINTS[c.arrival.kind] ?? 0) * c.arrival.amount;
  for (const aura of c.auras ?? []) {
    if (aura.crossesWaterline) continue; // COTS's outbreak debuff — different sign, scored separately below
    const g = (aura.grants.attack ?? 0) + (aura.grants.health ?? 0) + (aura.grants.energy ?? 0) * ENERGY_POINT;
    p += g * AURA_POINT;
  }
  p += tideScore(c);
  return p;
}

// Calibrate the points-per-cost conversion against the set itself rather
// than assuming one: find the ratio that makes total implied cost match
// total current cost, so deltas show relative mispricing instead of a
// uniform bias from a guessed conversion rate.
const rawScores = CARDS.map(powerScore);
const totalRaw = rawScores.reduce((a, b) => a + b, 0);
const totalCurrentCost = CARDS.reduce((a, c) => a + c.cost, 0);
const POINTS_PER_COST = totalRaw / totalCurrentCost;
console.log(`Calibrated: ${POINTS_PER_COST.toFixed(3)} points per cost point\n`);

const rows = CARDS.map((c) => {
  const score = powerScore(c);
  const impliedCost = score / POINTS_PER_COST;
  return {
    name: c.name,
    cost: c.cost,
    score: Math.round(score * 10) / 10,
    implied: Math.round(impliedCost * 10) / 10,
    delta: Math.round((impliedCost - c.cost) * 10) / 10,
    type: c.type,
  };
});

rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

console.log('name'.padEnd(28), 'cost', 'score', 'implied', 'delta');
for (const r of rows) {
  console.log(
    r.name.padEnd(28),
    String(r.cost).padStart(4),
    String(r.score).padStart(6),
    String(r.implied).padStart(8),
    String(r.delta).padStart(6),
  );
}

const totalCost = rows.reduce((s, r) => s + r.cost, 0);
const totalImplied = rows.reduce((s, r) => s + r.implied, 0);
console.log('\nTotal current cost:', totalCost, '| Total implied cost:', Math.round(totalImplied * 10) / 10);

// The set's two cheapest openers are deliberately pinned below their
// power-implied cost — the opener/cheap-card design rules (set.test.ts)
// depend on them, the same exception already made for Mudskipper last round.
const PINNED = new Set(['Atlantic Mudskipper', 'Clown Anemonefish']);

console.log('\n=== Rounded change list (cards where rounded implied != current) ===');
const changes = rows
  .map((r) => ({ ...r, target: PINNED.has(r.name) ? r.cost : Math.max(1, Math.round(r.implied)) }))
  .filter((r) => r.target !== r.cost)
  .sort((a, b) => b.target - b.cost - (a.target - a.cost));
console.log('name'.padEnd(28), 'cost', '->', 'target');
for (const r of changes) {
  console.log(r.name.padEnd(28), String(r.cost).padStart(4), '->', String(r.target).padStart(4));
}
console.log(`\n${changes.length} of ${rows.length} cards would change.`);
