#!/usr/bin/env node
'use strict';

/**
 * Feed GRUB — the cosmetic half of the state file.
 *
 * Anyone can hand him a snack. The premise of this repo is that only a real
 * commit keeps him alive and only a commit reading exactly "i'm sorry" brings him
 * back, so a button anyone can press must not be able to shortcut either. A snack
 * is deliberately powerless: it bumps a counter, records who did it, and makes
 * the pet card chew, sparkle and credit the feeder by name for a day. It cannot
 * change hunger, mood, whether he is alive, or when he last ate — and the script
 * asserts that on the way out rather than trusting itself.
 *
 * This runs on a PUBLIC trigger: anyone can open an issue and reach it. Three
 * things keep that boring — the protected-field assertion, one snack per person
 * per day, and MAX_PETS_PER_DAY across the whole repo. Every
 * attacker-controlled string (the login, the issue title) arrives as an
 * environment variable and is validated here; none of it is ever interpolated
 * into a shell command.
 *
 * Rendering is not this script's job. It mutates state and exits; the workflow
 * then runs `update_pet.js --offline`, which redraws every card from the state
 * file exactly as the daily run would.
 *
 * Usage:
 *   node scripts/feed_grub.js --actor octocat
 *   node scripts/feed_grub.js --actor octocat --dry-run
 *
 * Environment:
 *   FEED_EVENT   "opened" gates on the issue title; "labeled" and
 *                "repository_dispatch" are taken as intentional.
 *   FEED_TITLE   The issue title, when FEED_EVENT is "opened".
 *   GITHUB_REPOSITORY  Only used to link the pet card in the reply.
 *
 * Writes result=fed|ignored|rate-limited|daily-cap|invalid-actor plus a comment
 * body to $GITHUB_OUTPUT when running under Actions. Only "fed" should lead to a
 * commit; "ignored" should lead to no reply at all, because the issue was not
 * about the pet.
 */

const fs = require('fs');
const { loadState, saveState } = require('./lib/state');
const { localDate } = require('./lib/dates');
const { loadConfig } = require('./lib/config');
const { resolveSnacks, pickSnack } = require('./lib/snacks');
const { MAX_PETS_PER_DAY, LOGIN_RE } = require('./lib/constants');

/**
 * What counts as asking to pet him. Checked here rather than in the workflow's
 * `if:` because GitHub Actions expressions cannot lowercase a string, so a YAML
 * startsWith would quietly miss "Pet GRUB".
 */
const PET_REQUEST_RE = /^\s*(pet|feed)\b/i;

// Petting these is not allowed, ever. Checked before and after the mutation.
const PROTECTED = ['lastCommitDate', 'hunger', 'mood', 'alive', 'diedOn', 'resurrections'];

const argv = process.argv.slice(2);
const getOpt = (name) => {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return null;
  if (argv[i].includes('=')) return argv[i].slice(argv[i].indexOf('=') + 1);
  return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

const OPTS = {
  actor: getOpt('actor'),
  dryRun: argv.includes('--dry-run'),
  event: process.env.FEED_EVENT || null,
  title: process.env.FEED_TITLE || '',
};

const pick = (obj, keys) => JSON.stringify(keys.map((k) => obj[k]));

/** Hand results back to the workflow without letting user text break the file. */
function emit(outputs) {
  const file = process.env.GITHUB_OUTPUT;
  const lines = Object.entries(outputs).map(([k, v]) => {
    const s = String(v);
    if (!s.includes('\n')) return `${k}=${s}`;
    const delim = `EOF_${k}_${Math.random().toString(36).slice(2, 10)}`;
    return `${k}<<${delim}\n${s}\n${delim}`;
  });
  if (file) fs.appendFileSync(file, `${lines.join('\n')}\n`);
  for (const [k, v] of Object.entries(outputs)) {
    if (k !== 'message') console.log(`  ${k}=${v}`);
  }
}

function main() {
  const cfg = loadConfig();
  const petName = cfg.petName;

  // A freshly opened issue is only a pet request if it says so. Everything else
  // is somebody's actual bug report and must be left completely alone — no
  // counter bump, no reply, and above all no auto-close.
  if (OPTS.event === 'opened' && !PET_REQUEST_RE.test(OPTS.title)) {
    console.log(`not a pet request ("${OPTS.title.slice(0, 60)}") — leaving it alone`);
    emit({ result: 'ignored' });
    return;
  }

  const actor = String(OPTS.actor || '').trim();
  if (!LOGIN_RE.test(actor)) {
    console.error(`x --actor must be a GitHub login, got "${actor}"`);
    emit({
      result: 'invalid-actor',
      message: `That does not look like a GitHub username, so ${petName} is ignoring it.`,
    });
    process.exit(1);
  }

  const now = new Date();
  const state = loadState(now);
  const before = pick(state, PROTECTED);
  // The same day the creature lives by, so "one a day" rolls over when his does
  // rather than in the middle of his afternoon.
  const today = localDate(now, cfg.timezone);

  state.feedLog = state.feedLog || {};
  state.feeders = Array.isArray(state.feeders) ? state.feeders : [];
  // A new day, in the creature's timezone, resets the repo-wide count.
  state.feedDay = (state.feedDay && state.feedDay.date === today)
    ? state.feedDay
    : { date: today, count: 0 };

  if (state.feedLog[actor] === today) {
    console.log(`${petName}: @${actor} already fed him today — nothing to do`);
    emit({
      result: 'rate-limited',
      pets: state.pets || 0,
      feeders: state.feeders.length,
      message:
        `You already fed ${petName} today, @${actor}. He is flattered and unmoved.\n\n` +
        'One snack per person per day. Come back tomorrow, or write some code — ' +
        'that is the only thing that actually keeps him alive.',
    });
    return;
  }

  if (state.feedDay.count >= MAX_PETS_PER_DAY) {
    console.log(`${petName}: repo-wide cap of ${MAX_PETS_PER_DAY} pets reached for ${today}`);
    emit({
      result: 'daily-cap',
      pets: state.pets || 0,
      feeders: state.feeders.length,
      message:
        `${petName} has been fed ${MAX_PETS_PER_DAY} times today and is now ` +
        'visibly bloated. He is done for the day.\n\nTry again tomorrow.',
    });
    return;
  }

  // Which snack this is. Derived from the feeder and the day rather than picked
  // at random, so the reply below and the card the renderer draws agree without
  // either of them having to ask the other — the id in the state file is the
  // whole handshake.
  const snack = pickSnack(resolveSnacks(cfg), `${actor}:${today}`);

  const firstTime = !state.feeders.includes(actor);
  state.pets = (state.pets || 0) + 1;
  state.feedLog[actor] = today;
  state.feedDay.count += 1;
  state.lastPettedAt = now.toISOString();
  // Credited on the pet card until the reaction expires. Validated above, and
  // re-validated by the renderer before it is drawn.
  state.lastFedBy = actor;
  state.lastSnack = snack.id;
  if (firstTime) state.feeders.push(actor);

  // The whole point of this script is what it does *not* change.
  if (pick(state, PROTECTED) !== before) {
    throw new Error(`petting altered protected state (${PROTECTED.join(', ')}) — refusing to save`);
  }

  // Relative links are not reliably resolved inside issue comments, so the card
  // is only linked when CI tells us the full repo name. Locally there is no link.
  const repo = process.env.GITHUB_REPOSITORY || '';
  const cardLink = /^[\w.-]+\/[\w.-]+$/.test(repo)
    ? ` [Go look.](https://github.com/${repo}/blob/main/assets/pet.svg)`
    : '';

  const dead = state.alive === false;
  const message = dead
    ? `@${actor} offers ${petName} ${snack.name}. ${petName} is dead, so nothing happens.\n\n` +
      'Snacks are cosmetic — they have never fed him properly and they cannot ' +
      'raise him. That takes a commit whose message is exactly `i\'m sorry`, ' +
      'pushed by the person who let him starve.\n\n' +
      `Feed count: **${state.pets}** · people who have tried: **${state.feeders.length}**`
    : `@${actor} fed ${petName} ${snack.name}.${firstTime ? ' First time — you are on the record now.' : ''}\n\n` +
      `${snack.response}\n\n` +
      'He is chewing about it on the card right now, and your name is on it for ' +
      `the next 24 hours.${cardLink}\n\n` +
      `He is still **${state.mood}**, because a snack is not a meal — only commits ` +
      'actually feed him. He did enjoy it, allegedly.\n\n' +
      `Feed count: **${state.pets}** · people who have fed him: **${state.feeders.length}**`;

  console.log(
    `${petName}: fed ${snack.name} by @${actor}${firstTime ? ' (new feeder)' : ''} — ` +
    `pets=${state.pets} feeders=${state.feeders.length} today=${state.feedDay.count}/${MAX_PETS_PER_DAY} ` +
    `mood=${state.mood} (unchanged)`);

  const outputs = {
    result: 'fed',
    pets: state.pets,
    feeders: state.feeders.length,
    first: String(firstTime),
    message,
  };

  if (OPTS.dryRun) {
    console.log('\n-- dry run, nothing written --');
    console.log(JSON.stringify({
      pets: state.pets, feeders: state.feeders, lastFedBy: state.lastFedBy,
      lastSnack: state.lastSnack, lastPettedAt: state.lastPettedAt, feedDay: state.feedDay,
    }, null, 2));
    emit(outputs);
    return;
  }

  saveState(state);
  emit(outputs);
}

try {
  main();
} catch (err) {
  console.error(`x ${err.message}`);
  process.exit(1);
}
