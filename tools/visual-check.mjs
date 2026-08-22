/**
 * Consolidates the ad hoc Playwright checks CLAUDE.md asks for into one
 * reusable script, so they run the same way every time instead of being
 * hand-written per session.
 *
 * Boots the real client (jsdom has no layout, so it can't catch any of
 * this) and checks for horizontal overflow on the board (a cascade/collision
 * symptom), in both the light and dark themes (prefers-color-scheme).
 *
 * A blanket per-text-node WCAG contrast sweep was tried and dropped: this
 * design system deliberately uses lower-contrast --ink-faint/--ink-soft for
 * secondary text (captions, base-stat labels), so a single threshold flags
 * dozens of intentional choices as failures. Contrast is checked instead
 * where the project actually specifies a rule for it — the art plate below.
 *
 * With --art, it walks the dev-only /gallery.html (every species'
 * art on its real plate) and runs the two checks CLAUDE.md calls out after
 * any art change:
 *
 *   - every drawn element's getBBox against the shared 120x80 viewBox
 *   - the contrast of every pale fill or stroke against the plate
 *
 *   npm run visual-check        -> general UI checks against the live app
 *   npm run visual-check:art    -> art-plate checks against every species
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync } from 'node:fs';

// The environment ships a fixed pre-installed Chromium build. Pointing at it
// directly, rather than the version Playwright would otherwise resolve to,
// avoids needing a browser download every time playwright's version drifts.
const CHROMIUM_PATH = '/opt/pw-browsers/chromium';

const PORT = 5183;
const BASE = `http://localhost:${PORT}`;
const ART_MODE = process.argv.includes('--art');

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await delay(500);
  }
  throw new Error(`vite dev server did not come up on ${BASE}`);
}

async function checkOverflow(page, label) {
  const overflowing = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  if (overflowing) {
    console.error(`✗ [${label}] horizontal overflow: scrollWidth > clientWidth`);
    return 1;
  }
  console.log(`✓ [${label}] no horizontal overflow`);
  return 0;
}

async function checkArtPlate(page) {
  const results = await page.evaluate(() => {
    const PLATE = [242, 246, 247]; // #f2f6f7, the hard-coded light plate
    function luminance([r, g, b]) {
      const c = [r, g, b].map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    }
    function ratio(a, b) {
      const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    }
    function toRgb(color) {
      if (!color || color === 'none') return null;
      const probe = document.createElement('div');
      probe.style.color = color;
      document.body.appendChild(probe);
      const computed = getComputedStyle(probe).color;
      probe.remove();
      const m = computed.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((n) => parseFloat(n.trim()));
      if ((parts[3] ?? 1) < 0.5) return null; // transparent, no plate mismatch possible
      return parts.slice(0, 3);
    }

    const out = [];
    for (const wrap of document.querySelectorAll('[data-species-id]')) {
      const id = wrap.getAttribute('data-species-id');
      const svg = wrap.querySelector('svg.art');
      if (!svg) {
        out.push({ id, issue: 'missing-art' });
        continue;
      }
      const view = svg.viewBox.baseVal; // 0 0 120 80
      for (const shape of svg.querySelectorAll('path, circle, ellipse, rect, polygon, line')) {
        let bbox;
        try {
          bbox = shape.getBBox();
        } catch {
          continue;
        }
        if (
          bbox.x < view.x - 0.5 ||
          bbox.y < view.y - 0.5 ||
          bbox.x + bbox.width > view.x + view.width + 0.5 ||
          bbox.y + bbox.height > view.y + view.height + 0.5
        ) {
          out.push({
            id,
            issue: 'out-of-bounds',
            detail: `bbox ${bbox.x.toFixed(1)},${bbox.y.toFixed(1)} ${bbox.width.toFixed(1)}x${bbox.height.toFixed(1)} vs viewBox 0,0 120x80`,
          });
        }
        // A pale fill is fine if the shape carries its own dark edge (the
        // documented fix: "the same path drawn twice, a light stroke over a
        // heavier dark one"), so only flag a pale mark when nothing — its own
        // stroke, or its fill if it has no stroke at all — is rescuing it.
        const style = getComputedStyle(shape);
        const strokeWidth = parseFloat(style.strokeWidth) || 0;
        const strokeRgb = toRgb(style.stroke);
        const hasDarkEdge = strokeRgb && strokeWidth > 0.5 && ratio(strokeRgb, PLATE) >= 3;
        if (hasDarkEdge) continue;

        const fillRgb = toRgb(style.fill);
        if (fillRgb && ratio(fillRgb, PLATE) < 1.6) {
          out.push({ id, issue: 'low-plate-contrast', detail: `fill=${style.fill}, no rescuing stroke, ratio ${ratio(fillRgb, PLATE).toFixed(2)}:1` });
        } else if (!fillRgb && strokeRgb && ratio(strokeRgb, PLATE) < 1.6) {
          // Fill-less shape (a pure line): its own stroke is the whole mark.
          out.push({ id, issue: 'low-plate-contrast', detail: `stroke=${style.stroke} ratio ${ratio(strokeRgb, PLATE).toFixed(2)}:1` });
        }
      }
    }
    return out;
  });

  // Geometry is unambiguous: a shape outside the shared viewBox is always a
  // bug, so it fails the run. Plate contrast is a heuristic that can't tell a
  // pale mark nested inside a darker shape (the shared eye highlight, sitting
  // inside the dark iris) from one that's genuinely floating free — CLAUDE.md
  // itself says this class of check is judged by eye, not by comparing
  // values, so it's reported for a human look rather than failing the run.
  let hard = 0;
  const bySpecies = new Set();
  for (const r of results) {
    bySpecies.add(r.id);
    const mark = r.issue === 'out-of-bounds' ? '✗' : '⚠';
    console.error(`${mark} [art:${r.id}] ${r.issue}${r.detail ? ` — ${r.detail}` : ''}`);
    if (r.issue === 'out-of-bounds') hard++;
  }
  console.log(`${hard === 0 ? '✓' : '✗'} [art] ${hard} geometry failure(s), ${results.length - hard} plate-contrast candidate(s) to eyeball, across ${bySpecies.size} species`);
  return hard;
}

async function main() {
  console.log(`Starting vite dev server on :${PORT}...`);
  // Spawned directly rather than via `npx vite`: npx adds a wrapper process
  // that vite.kill() below doesn't reach, leaving the real server orphaned
  // on the port after this script exits.
  const viteBin = new URL('../node_modules/.bin/vite', import.meta.url).pathname;
  const vite = spawn(viteBin, ['--port', String(PORT), '--strictPort'], {
    cwd: new URL('../client', import.meta.url).pathname,
    stdio: 'pipe',
  });
  vite.stderr.on('data', (d) => process.stderr.write(d));

  let failures = 0;
  try {
    await waitForServer();
    const browser = await chromium.launch({
      executablePath: existsSync(CHROMIUM_PATH) ? CHROMIUM_PATH : undefined,
    });
    try {
      if (ART_MODE) {
        const page = await browser.newPage();
        await page.goto(`${BASE}/gallery.html`);
        await page.waitForSelector('[data-species-id]');
        failures += await checkArtPlate(page);
      } else {
        for (const scheme of ['light', 'dark']) {
          const page = await browser.newPage();
          await page.emulateMedia({ colorScheme: scheme });
          await page.goto(BASE);
          await page.waitForSelector('.board, #root');
          failures += await checkOverflow(page, scheme);
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  } finally {
    vite.kill();
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\nAll checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
