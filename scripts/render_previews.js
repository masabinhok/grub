#!/usr/bin/env node
'use strict';

/**
 * The showcase — docs/previews/*.svg, one per state.
 *
 * The live cards in assets/ only ever show the state the pet is actually in, so
 * a visitor arriving on a good day has no way to see what starving or dying looks
 * like without cloning the repo and running the simulator. These are the other
 * three quarters of the product, rendered once and committed.
 *
 * Everything here is pinned: the clock, the streak numbers, the resurrection
 * count, the death date, the snack. That is the whole design constraint —
 * re-running this must produce byte-identical files, or every daily CI run would
 * find a diff in the quote-of-the-day and commit a fresh set of previews forever.
 * Nothing in this file may read the real clock, the real state file or the API.
 *
 * Usage:
 *   node scripts/render_previews.js            # write docs/previews/
 *   node scripts/render_previews.js --check    # fail if what is committed is stale
 */

const fs = require('fs');
const path = require('path');

const { ROOT } = require('./lib/constants');
const { DAY_MS } = require('./lib/dates');
const { loadConfig } = require('./lib/config');
const { resolvePalettes } = require('./lib/palette');
const { pickLine, linesFor } = require('./lib/copy');
const { hungerForDays } = require('./lib/mood');
const { resolveSnacks, snackById } = require('./lib/snacks');
const COMPONENTS = require('./generators');

const OUT_DIR = path.join(ROOT, 'docs', 'previews');

// A Thursday, chosen and frozen. pickLine indexes on the weekday, so moving this
// changes every caption; quoteOfTheDay indexes on the day number, so moving it
// changes the marquee too.
const NOW = new Date('2026-01-15T12:00:00.000Z');
const DIED_ON = '2026-01-09';

// Plausible-looking numbers for a profile that has been running a while. They are
// invented, and they are the same every run — these cards are a showroom, not a
// status readout.
const STREAK = { current: 12, longest: 47, activeDays: 214, totalContributions: 1893 };
const WATCHERS = { lurkers: 1204, fed: 37, views: 3160, since: '2025-11-02' };

const SCENES = [
  { file: 'pet-thriving', mood: 'thriving', days: 0 },
  { file: 'pet-hungry', mood: 'hungry', days: 2 },
  { file: 'pet-feral', mood: 'feral', days: 4 },
  { file: 'pet-deceased', mood: 'deceased', days: 6 },
  // The reward for feeding him, which is the one state a visitor can cause.
  { file: 'pet-fed', mood: 'thriving', days: 0, feeder: 'octocat', snack: 'donut' },
];

function renderScene(scene, cfg) {
  const dead = scene.mood === 'deceased';
  const state = {
    lastCommitDate: new Date(NOW.getTime() - scene.days * DAY_MS).toISOString(),
    lastCheckedDate: NOW.toISOString(),
    hunger: dead ? 100 : hungerForDays(scene.days),
    mood: scene.mood,
    alive: !dead,
    diedOn: dead ? DIED_ON : null,
    resurrections: 2,
    pets: 128,
    feeders: [],
    lastFedBy: scene.feeder || null,
    lastSnack: scene.snack || null,
  };

  const snacks = resolveSnacks(cfg);
  const ctx = {
    days: scene.days,
    line: pickLine(scene.mood, state, NOW, linesFor(cfg)),
    revived: false,
    streak: STREAK,
    profile: {},
    watchers: WATCHERS,
    fed: Boolean(scene.feeder),
    feeder: scene.feeder || null,
    snack: snackById(snacks, scene.snack) || snacks[0],
    now: NOW,
    cfg,
    palettes: resolvePalettes(cfg),
  };

  return COMPONENTS[scene.component || 'pet'](state, ctx);
}

function main() {
  const check = process.argv.includes('--check');
  const cfg = loadConfig();
  const rendered = SCENES.map((s) => [`${s.file}.svg`, renderScene(s, cfg)]);

  if (check) {
    const stale = rendered.filter(([name, svg]) => {
      let onDisk = null;
      try { onDisk = fs.readFileSync(path.join(OUT_DIR, name), 'utf8'); } catch (_) { /* missing */ }
      return onDisk !== svg;
    });
    if (stale.length) {
      console.error(
        `x docs/previews is stale: ${stale.map(([n]) => n).join(', ')}\n` +
        '  run: node scripts/render_previews.js');
      process.exit(1);
    }
    console.log(`docs/previews is up to date (${rendered.length} files)`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, svg] of rendered) fs.writeFileSync(path.join(OUT_DIR, name), svg);
  console.log(`wrote ${rendered.length} previews to docs/previews/`);
  for (const [name, svg] of rendered) console.log(`  ${name} — ${svg.length} bytes`);
}

main();
