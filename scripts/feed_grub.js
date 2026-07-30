#!/usr/bin/env node
'use strict';

/**
 * Pet GRUB — the cosmetic half of the state file.
 *
 * The premise of this repo is that only a real commit feeds him and only a commit
 * whose message is exactly "i'm sorry" brings him back. A button anyone can press
 * would undo both. So petting is deliberately powerless: it bumps a counter,
 * records who did it, and puts a heart on the card for a day. It cannot change
 * hunger, mood, whether he is alive, or when he last ate — and the script asserts
 * that on the way out rather than trusting itself.
 *
 * Rendering is not this script's job. It mutates state and exits; the workflow
 * then runs `update_pet.js --offline`, which redraws every card from the state
 * file exactly as the daily run would.
 *
 * Usage:
 *   node scripts/feed_grub.js --actor octocat
 *   node scripts/feed_grub.js --actor octocat --dry-run
 *
 * Writes result=fed|rate-limited|invalid-actor plus a comment body to
 * $GITHUB_OUTPUT when running under Actions.
 */

const fs = require('fs');
const { loadState, saveState } = require('./lib/state');
const { isoDate } = require('./lib/dates');
const { loadConfig } = require('./lib/config');

// Anything that reaches this script came from a stranger, so the login is
// validated against GitHub's own rules before it is stored or echoed anywhere.
const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

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
  const actor = String(OPTS.actor || '').trim();
  const cfg = loadConfig();
  const petName = cfg.petName;

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
  const today = isoDate(now);

  state.feedLog = state.feedLog || {};
  state.feeders = Array.isArray(state.feeders) ? state.feeders : [];

  if (state.feedLog[actor] === today) {
    console.log(`${petName}: @${actor} already petted him today — nothing to do`);
    emit({
      result: 'rate-limited',
      pets: state.pets || 0,
      feeders: state.feeders.length,
      message:
        `You already petted ${petName} today, @${actor}. He is flattered and unmoved.\n\n` +
        `One pet per person per day. Come back tomorrow, or write some code — ` +
        `that is the only thing that actually feeds him.`,
    });
    return;
  }

  const firstTime = !state.feeders.includes(actor);
  state.pets = (state.pets || 0) + 1;
  state.feedLog[actor] = today;
  state.lastPettedAt = now.toISOString();
  if (firstTime) state.feeders.push(actor);

  // The whole point of this script is what it does *not* change.
  if (pick(state, PROTECTED) !== before) {
    throw new Error(`petting altered protected state (${PROTECTED.join(', ')}) — refusing to save`);
  }

  const dead = state.alive === false;
  const message = dead
    ? `@${actor} pets ${petName}. ${petName} is dead, so nothing happens.\n\n` +
      `Petting is cosmetic — it has never fed him and it cannot raise him. ` +
      `That takes a commit whose message is exactly \`i'm sorry\`, pushed by the ` +
      `person who let him starve.\n\n` +
      `Pet count: **${state.pets}** · people who have tried: **${state.feeders.length}**`
    : `@${actor} pets ${petName}.${firstTime ? ' First time — you are on the record now.' : ''}\n\n` +
      `He is **${state.mood}** and that has not changed, because petting does not ` +
      `feed him. Only commits do. He did enjoy it, allegedly.\n\n` +
      `Pet count: **${state.pets}** · people who have pet him: **${state.feeders.length}**`;

  console.log(
    `${petName}: petted by @${actor}${firstTime ? ' (new feeder)' : ''} — ` +
    `pets=${state.pets} feeders=${state.feeders.length} mood=${state.mood} (unchanged)`);

  if (OPTS.dryRun) {
    console.log('\n-- dry run, nothing written --');
    console.log(JSON.stringify({ pets: state.pets, feeders: state.feeders, lastPettedAt: state.lastPettedAt }, null, 2));
    emit({ result: 'fed', pets: state.pets, feeders: state.feeders.length, first: String(firstTime), message });
    return;
  }

  saveState(state);
  emit({ result: 'fed', pets: state.pets, feeders: state.feeders.length, first: String(firstTime), message });
}

try {
  main();
} catch (err) {
  console.error(`x ${err.message}`);
  process.exit(1);
}
