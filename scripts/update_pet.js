#!/usr/bin/env node
'use strict';

/**
 * GRUB — The Tamagotchi of Shame, and the README components that share its mood.
 *
 * Renders a set of standalone SVG cards into assets/. Every card reads the same
 * pet state, so when GRUB starves the entire README desaturates and stops
 * animating with him. When he dies, nothing moves anywhere.
 *
 * Components: banner, pet, streak, eye, star, stats, languages, divider,
 * marquee, inventory
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
 *   PET_TOKEN            Classic PAT with `repo` scope. Needed for the eye card
 *                        (the traffic API requires push access), and if the log
 *                        warns private work is invisible. Falls back to
 *                        GITHUB_TOKEN.
 *   PET_INCLUDE_PRIVATE  "1" to count private contributions.
 *   PET_USERNAME         GitHub login to track. Defaults to the repo owner in CI.
 */

const fs = require('fs');
const path = require('path');

const {
  ASSETS_DIR, STATE_PATH, DEATH_THRESHOLD_DAYS, FEED_REACTION_MS, MOODS, LOGIN_RE,
} = require('./lib/constants');
const { DAY_MS, localDate, addDays, daysBetween, startOfLocalDay } = require('./lib/dates');
const { parseArgs } = require('./lib/cli');
const { loadConfig, enabledComponents } = require('./lib/config');
const { resolvePalettes } = require('./lib/palette');
const { loadState, saveState } = require('./lib/state');
const { moodForDays, hungerForDays } = require('./lib/mood');
const { pickLine, linesFor } = require('./lib/copy');
const { resolveSnacks, snackById, pickSnack } = require('./lib/snacks');
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
  // Whose day it is. Every "how many days" question below is asked in this zone,
  // so a late-night commit counts for the night it was made.
  const tz = cfg.timezone;

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
    state.lastCommitDate = new Date(startOfLocalDay(now, tz) - days * DAY_MS).toISOString();
    source = 'simulated';
  } else if (OPTS.offline) {
    days = daysBetween(state.lastCommitDate, now, tz);
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
    days = daysBetween(state.lastCommitDate, now, tz);
    if (!apology && normalize(localHeadMessage()) === APOLOGY_NORM) apology = true;

    try { profile = await fetchProfileData(username); }
    catch (err) { console.warn(`! profile API failed: ${err.message}`); }

    // The eye is the only component that needs push access, so a missing or
    // under-scoped token degrades to the stored totals instead of failing the run.
    if (cfg.components.eye !== false) {
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
      state.diedOn = addDays(localDate(state.lastCommitDate, tz), DEATH_THRESHOLD_DAYS);
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
  const storedTraffic = (state.cache && state.cache.traffic) || {};
  const storedDaily = storedTraffic.daily || {};
  const storedViews = storedTraffic.views || {};
  const daily = trafficViews ? mergeTraffic(storedDaily, trafficViews, 'uniques') : storedDaily;
  const dailyViews = trafficViews ? mergeTraffic(storedViews, trafficViews, 'count') : storedViews;
  if (trafficViews) {
    state.cache = Object.assign({}, state.cache, { traffic: { daily, views: dailyViews } });
  }
  // What the eye is looking at. `lurkers` is unique visitors per day, summed:
  // people who arrived at the repo, which from a profile README means they
  // clicked the creature. `views` is every hit — kept because it costs nothing
  // (same API response) and it is the honest number for the card's description.
  const watchers = {
    lurkers: trafficTotal(daily),
    fed: (state.feeders || []).length,
    views: trafficTotal(dailyViews),
    since: firstSampleDate(daily) || firstSampleDate(dailyViews),
  };

  // --mood is a preview override: render as if the pet were in that state
  // without letting it touch the real saved state.
  const isPreview = Boolean(OPTS.forceMood) || source === 'simulated';
  const renderState = OPTS.forceMood ? Object.assign({}, state, { mood: OPTS.forceMood, alive: OPTS.forceMood !== 'deceased' }) : state;
  // The reaction expires on its own, so a normal scheduled run is what clears it —
  // the feed workflow never has to schedule a follow-up to take it back down.
  const fedAt = state.lastPettedAt ? new Date(state.lastPettedAt).getTime() : NaN;
  const recentlyFed = Number.isFinite(fedAt) &&
    fedAt <= now.getTime() &&
    now.getTime() - fedAt < FEED_REACTION_MS;
  // Whoever fed him is drawn onto a public SVG, so the login is validated again
  // here — the state file is a file like any other and could have been edited by
  // hand. Anything that is not a GitHub login is simply not a feeder.
  const feeder = recentlyFed && LOGIN_RE.test(String(state.lastFedBy || '')) ? state.lastFedBy : null;
  // The reaction and the credit are the same event, so they arrive together —
  // crumbs raining down under a placard that still says FEED ME would be
  // nonsense, and a state file from before feeders were recorded gets neither.
  const fed = Boolean(feeder) && renderState.mood !== 'deceased';

  // The bubble is the mood's, always. A snack shows up as the placard and the
  // reaction on the card; it does not get to interrupt what he was saying.
  const tier = revived ? 'revived' : renderState.mood;
  const line = pickLine(tier, renderState, now, linesFor(cfg));

  // What he is chewing. feed_grub.js wrote the id when it replied to the issue,
  // so the card draws exactly what the reply promised. An id from a config that
  // has since changed simply falls back to a fresh pick.
  const snacks = resolveSnacks(cfg);
  const snack = snackById(snacks, state.lastSnack) || pickSnack(snacks, feeder || petName);

  const ctx = {
    days, line, revived, streak, profile: profileData, watchers, fed, feeder, snack, now,
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
  console.log(
    `  lurkers=${watchers.lurkers} fed=${watchers.fed} views=${watchers.views}` +
    `${watchers.since ? ` since=${watchers.since}` : ' (no traffic sampled yet)'}` +
    `${feeder ? ` · last fed ${snack.name} by @${feeder}` : ''}`);

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
