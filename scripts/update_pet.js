#!/usr/bin/env node
'use strict';

/**
 * GRUB — The Tamagotchi of Shame, and the README components that share its mood.
 *
 * Renders a set of standalone SVG cards into assets/. Every card reads the same
 * pet state, so when GRUB starves the entire README desaturates and stops
 * animating with him. When he dies, nothing moves anywhere.
 *
 * Components: banner, pet, streak, stats, languages, divider, counter, marquee,
 * inventory
 *
 * This file is the entrypoint only — CLI parsing, the state machine, and writing
 * files. The pieces live in:
 *   scripts/lib/*         shared plumbing (state, github, palette, svg, copy, ...)
 *   scripts/generators/*  one module per card, registered in generators/index.js
 *
 * Zero dependencies. Node 18+ (needs global fetch). CommonJS so there is no
 * package.json and therefore no install step in CI.
 *
 * Usage:
 *   node scripts/update_pet.js                      # normal run (hits the API)
 *   node scripts/update_pet.js --dry-run            # print the summary, write nothing
 *   node scripts/update_pet.js --days 4             # pretend it has been 4 days
 *
 * --days and --mood are simulations: they render but never persist, so a test
 * run cannot backdate lastCommitDate and starve the pet off fictional data.
 *   node scripts/update_pet.js --apology            # pretend HEAD says "i'm sorry"
 *   node scripts/update_pet.js --offline            # skip the API, use cached state
 *   node scripts/update_pet.js --include-private    # let private repos feed it
 *   node scripts/update_pet.js --mood feral --outdir /tmp/x --offline   # preview
 *   node scripts/update_pet.js --only streak        # render one component
 *   node scripts/update_pet.js --config alt.json    # use a different config
 *
 * Configuration:
 *   grub.config.json     Which cards to build, their labels, palette overrides.
 *                        Read only — the bot never writes it. See lib/config.js
 *                        for the full set of defaults.
 *
 * Environment:
 *   PET_TOKEN            Classic PAT with `repo` scope. Needed for the counter
 *                        card (the traffic API requires push access), and if the
 *                        log warns private work is invisible. Falls back to
 *                        GITHUB_TOKEN.
 *   PET_INCLUDE_PRIVATE  "1" to count private contributions.
 *   PET_USERNAME         GitHub login to track. Defaults to the repo owner in CI.
 */

const fs = require('fs');
const path = require('path');

const { ASSETS_DIR, STATE_PATH, DEATH_THRESHOLD_DAYS, PET_HEART_MS, MOODS } = require('./lib/constants');
const { DAY_MS, startOfDayUTC, isoDate, daysBetween } = require('./lib/dates');
const { parseArgs } = require('./lib/cli');
const { loadConfig, enabledComponents } = require('./lib/config');
const { resolvePalettes } = require('./lib/palette');
const { loadState, saveState } = require('./lib/state');
const { moodForDays, hungerForDays } = require('./lib/mood');
const { pickLine } = require('./lib/copy');
const { captionFor, updateReadmeCaption } = require('./lib/readme');
const {
  resolveUsername, resolveRepo, fetchActivity, fetchProfileData, fetchTraffic,
  computeStreaks, normalize, APOLOGY_NORM, localHeadMessage,
} = require('./lib/github');
const { mergeTraffic, trafficTotal, firstSampleDate } = require('./lib/traffic');
const COMPONENTS = require('./generators');

const OPTS = parseArgs();

if (OPTS.help) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1].replace(/^ \* ?/gm, ''));
  process.exit(0);
}
if (OPTS.forceMood && !MOODS.includes(OPTS.forceMood)) {
  console.error(`x --mood expects one of: ${MOODS.join(', ')}`);
  process.exit(1);
}

async function main() {
  const now = new Date();
  const cfg = loadConfig(OPTS.config || undefined);
  const state = loadState(now);
  const petName = cfg.petName;

  if (new Date(state.lastCommitDate).getTime() > now.getTime()) {
    state.lastCommitDate = now.toISOString();
  }

  let days;
  let apology = OPTS.apology;
  let source = 'state';
  let contrib = null;
  let profile = null;
  let trafficViews = null;

  if (OPTS.simulateDays !== null && OPTS.simulateDays !== undefined) {
    days = parseInt(OPTS.simulateDays, 10);
    if (Number.isNaN(days)) throw new Error(`--days expects a number, got "${OPTS.simulateDays}"`);
    state.lastCommitDate = new Date(startOfDayUTC(now) - days * DAY_MS).toISOString();
    source = 'simulated';
  } else if (OPTS.offline) {
    days = daysBetween(state.lastCommitDate, now);
    source = 'offline';
  } else {
    const username = resolveUsername({ user: OPTS.user, configUsername: cfg.github.username });
    if (!username) throw new Error('cannot determine username — pass --user <login> or set PET_USERNAME');

    const includePrivate = OPTS.includePrivate || cfg.github.includePrivate === true;
    const activity = await fetchActivity(username, { includePrivate });
    contrib = activity.contrib;
    if (activity.lastCommitAt) {
      if (new Date(activity.lastCommitAt) > new Date(state.lastCommitDate)) {
        state.lastCommitDate = activity.lastCommitAt;
      }
      apology = apology || activity.apology;
      source = activity.source;
    } else {
      console.warn('! no activity data returned — decaying from stored state only');
      source = 'frozen';
    }
    days = daysBetween(state.lastCommitDate, now);
    if (!apology && normalize(localHeadMessage()) === APOLOGY_NORM) apology = true;

    try { profile = await fetchProfileData(username); }
    catch (err) { console.warn(`! profile API failed: ${err.message}`); }

    // The counter is the only component that needs push access, so a missing or
    // under-scoped token degrades to the stored total instead of failing the run.
    if (cfg.components.counter !== false) {
      const repo = resolveRepo({ repo: cfg.github.repo });
      if (!repo) {
        console.warn('! cannot determine repo for traffic — set github.repo in grub.config.json');
      } else {
        try { trafficViews = await fetchTraffic(repo); }
        catch (err) {
          console.warn(
            `! traffic API failed for ${repo} (${err.message}) — reusing the stored lurker total.` +
            ' It needs push access: a classic PAT with `repo` scope, or fine-grained with Administration: read.',
          );
        }
      }
    }
  }

  let revived = false;
  if (!state.alive) {
    if (apology) {
      Object.assign(state, {
        alive: true, diedOn: null, hunger: 0, mood: 'thriving',
        resurrections: state.resurrections + 1, lastCommitDate: now.toISOString(),
      });
      days = 0;
      revived = true;
    } else {
      state.mood = 'deceased';
      state.hunger = 100;
    }
  } else {
    state.mood = moodForDays(days);
    state.hunger = hungerForDays(days);
    if (state.mood === 'deceased') {
      state.alive = false;
      state.diedOn = isoDate(startOfDayUTC(new Date(state.lastCommitDate)) + DEATH_THRESHOLD_DAYS * DAY_MS);
      state.hunger = 100;
    }
  }

  state.lastCheckedDate = now.toISOString();

  // Cache the expensive bits so --offline and API outages still render fully.
  const streak = contrib
    ? Object.assign(computeStreaks(contrib.days), { totalContributions: contrib.totalContributions })
    : (state.cache && state.cache.streak) || {};
  if (contrib) state.cache = Object.assign({}, state.cache, { streak });
  if (profile) state.cache = Object.assign({}, state.cache, { profile });
  const profileData = profile || (state.cache && state.cache.profile) || {};

  // Lurkers accumulate: the API only shows a 14-day window, so the days it can
  // still see get overwritten and everything older is kept. Nothing is dropped,
  // which is what keeps the total monotonic even as people feed him.
  const storedDaily = (state.cache && state.cache.traffic && state.cache.traffic.daily) || {};
  const daily = trafficViews ? mergeTraffic(storedDaily, trafficViews) : storedDaily;
  if (trafficViews) {
    state.cache = Object.assign({}, state.cache, { traffic: { daily } });
  }
  const counter = {
    lurkers: trafficTotal(daily),
    fed: (state.feeders || []).length,
    since: firstSampleDate(daily),
  };

  // --mood is a preview override: render as if the pet were in that state
  // without letting it touch the real saved state.
  const isPreview = Boolean(OPTS.forceMood) || source === 'simulated';
  const renderState = OPTS.forceMood ? Object.assign({}, state, { mood: OPTS.forceMood, alive: OPTS.forceMood !== 'deceased' }) : state;
  const tier = revived ? 'revived' : renderState.mood;
  const line = pickLine(tier, renderState, now);
  // The heart expires on its own, so a normal scheduled run is what clears it —
  // the feed workflow never has to schedule a follow-up to take it back down.
  const pettedAt = state.lastPettedAt ? new Date(state.lastPettedAt).getTime() : NaN;
  const petted = Number.isFinite(pettedAt) &&
    pettedAt <= now.getTime() &&
    now.getTime() - pettedAt < PET_HEART_MS;

  const ctx = {
    days, line, revived, streak, profile: profileData, counter, petted,
    cfg, palettes: resolvePalettes(cfg),
  };

  const names = OPTS.only ? [OPTS.only] : enabledComponents(cfg, COMPONENTS);
  for (const n of names) if (!COMPONENTS[n]) throw new Error(`unknown component "${n}" (have: ${Object.keys(COMPONENTS).join(', ')})`);
  const rendered = names.map((n) => [n, COMPONENTS[n](renderState, ctx)]);

  console.log(
    `${petName}: mood=${renderState.mood} days=${days} hunger=${renderState.hunger} alive=${renderState.alive}` +
    `${revived ? ' REVIVED' : ''} resurrections=${state.resurrections} (source: ${source})`);
  console.log(`  "${line}"`);
  if (streak.current !== undefined) {
    console.log(`  streak=${streak.current} longest=${streak.longest} contributions=${streak.totalContributions || 0}`);
  }
  console.log(`  lurkers=${counter.lurkers} fed=${counter.fed}${counter.since ? ` since=${counter.since}` : ' (no traffic sampled yet)'}`);

  if (OPTS.dryRun) {
    console.log('\n-- dry run, nothing written --');
    console.log(JSON.stringify(state, null, 2));
    rendered.forEach(([n, svg]) => console.log(`  ${n}.svg would be ${svg.length} bytes`));
    console.log(`README caption would be: ${captionFor(state, days)}`);
    return;
  }

  // A simulation aimed at the real assets directory writes nothing at all —
  // otherwise `--days 4` leaves feral cards next to a thriving state file, and
  // the mismatch gets committed. Point it somewhere else to actually see them.
  if (isPreview && path.resolve(OPTS.outDir) === ASSETS_DIR) {
    console.log('\n-- simulation, nothing written --');
    console.log('   re-run with --outdir <dir> to write these previews somewhere safe');
    return;
  }

  fs.mkdirSync(OPTS.outDir, { recursive: true });
  const written = [];
  for (const [n, svg] of rendered) {
    fs.writeFileSync(path.join(OPTS.outDir, `${n}.svg`), svg);
    written.push(`${n}.svg`);
  }

  // A preview render must never rewrite real state. --mood and --days are both
  // simulations: persisting them would backdate lastCommitDate and starve the
  // pet off fictional data. Only a genuine run touches the state file.
  if (path.resolve(OPTS.outDir) === ASSETS_DIR && !isPreview) {
    saveState(state, STATE_PATH);
    written.push('pet-state.json');
    if (updateReadmeCaption(state, days)) written.push('README.md');
  }
  console.log(`  wrote ${written.join(', ')}`);
}

main().catch((err) => {
  console.error(`x ${err.message}`);
  process.exit(1);
});
