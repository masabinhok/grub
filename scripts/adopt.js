#!/usr/bin/env node
'use strict';

/**
 * adopt.js — make a fresh copy of this repo yours.
 *
 * A fork arrives carrying the previous owner: their cached profile, their
 * streak, their stack, their wall entry, and a profile README pointing at their
 * raw.githubusercontent URLs. None of it is secret, but all of it renders on
 * *your* profile until it is cleared, and the cached profile is the one that
 * bites — update_pet.js falls back to `cache.profile` whenever the API call
 * fails, so a bad token doesn't give you empty cards, it gives you theirs.
 *
 * This clears all of it in one shot. Run it once, immediately after cloning.
 *
 * Usage:
 *   node scripts/adopt.js                          # resolve everything from git
 *   node scripts/adopt.js --user you --repo grub
 *   node scripts/adopt.js --name WORM --timezone Europe/Lisbon
 *   node scripts/adopt.js --stack "Next.js,Postgres,TypeScript"
 *   node scripts/adopt.js --dry-run                # print the plan, write nothing
 *
 * Options:
 *   --user <login>       GitHub login. Default: owner of the `origin` remote.
 *   --repo <name>        Repo name. Default: name of the `origin` remote.
 *   --branch <name>      Branch the assets are served from. Default: main.
 *   --name <PETNAME>     Rename the creature. Default: leave it alone.
 *   --timezone <IANA>    Whose midnight it starves by, e.g. Asia/Tokyo.
 *   --stack "a,b,c"      Inventory items. Default: placeholders you must edit.
 *   --keep-inventory     Don't touch inventory.slots at all.
 *   --dry-run            Print what would change and exit.
 *   --force              Allow running against the upstream repo itself.
 *
 * Zero dependencies, same as everything else here.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { ROOT, STATE_PATH, CONFIG_PATH, ASSETS_DIR } = require('./lib/constants');
const { defaultState } = require('./lib/state');

const PROFILE_README = path.join(ROOT, 'PROFILE-README.md');
const WALL_PATH = path.join(ROOT, 'wall-of-shame.json');

// The repo this was copied from. Guarded rather than rewritten: running adopt
// against the original would wipe the very state the original is tracking.
const UPSTREAM = 'masabinhok/grub';

const LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const REPO_RE = /^[A-Za-z0-9._-]{1,100}$/;

// ---------------------------------------------------------------- arguments

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n, fallback = null) => {
  const i = argv.findIndex((a) => a === `--${n}` || a.startsWith(`--${n}=`));
  if (i === -1) return fallback;
  if (argv[i].includes('=')) return argv[i].slice(argv[i].indexOf('=') + 1);
  return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

if (has('help') || has('h')) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1].replace(/^ \* ?/gm, ''));
  process.exit(0);
}

const DRY = has('dry-run');

function remote() {
  try {
    const url = execSync('git config --get remote.origin.url', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd: ROOT,
    });
    const m = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\s*$/);
    return m ? { user: m[1], repo: m[2] } : {};
  } catch (_) {
    return {};
  }
}

const git = remote();
const user = opt('user', git.user);
const repo = opt('repo', git.repo);
const branch = opt('branch', 'main');

function die(msg) {
  console.error(`x ${msg}`);
  process.exit(1);
}

if (!user) die('cannot work out your GitHub login — pass --user <login>');
if (!repo) die('cannot work out the repo name — pass --repo <name>');
if (!LOGIN_RE.test(user)) die(`"${user}" is not a GitHub login`);
if (!REPO_RE.test(repo)) die(`"${repo}" is not a repo name`);

if (`${user}/${repo}`.toLowerCase() === UPSTREAM.toLowerCase() && !has('force')) {
  die(`this is ${UPSTREAM} itself — adopting would wipe its real state.\n` +
      '  If you genuinely mean to reset it, re-run with --force.');
}

// ------------------------------------------------------------------- helpers

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const changes = [];

function writeJson(p, value) {
  changes.push(path.relative(ROOT, p));
  if (!DRY) fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(p, value) {
  changes.push(path.relative(ROOT, p));
  if (!DRY) fs.writeFileSync(p, value);
}

// ----------------------------------------------------------------- the work

// 1. State. Rebuilt from defaults rather than edited, so nothing survives by
//    being a key nobody thought to delete — cache, feeders, feedLog, all of it.
const fresh = defaultState(new Date());
if (fs.existsSync(STATE_PATH)) {
  const old = readJson(STATE_PATH);
  const carried = ['cache', 'feeders', 'feedLog', 'lastFedBy', 'lastSnack'].filter((k) => {
    const v = old[k];
    return v && (Array.isArray(v) ? v.length : Object.keys(v).length || typeof v === 'string');
  });
  if (carried.length) console.log(`  clearing inherited ${carried.join(', ')}`);
}
writeJson(STATE_PATH, fresh);

// 2. Config. Only the keys that describe a person get touched; labels, palette,
//    copy and components are the adopter's business and are left as found.
const cfg = readJson(CONFIG_PATH);
const petName = opt('name', cfg.petName);
cfg.petName = petName;
if (opt('timezone')) cfg.timezone = opt('timezone');

if (!has('keep-inventory')) {
  const stack = opt('stack');
  // Placeholders on purpose. Leaving the previous owner's stack in place means
  // their tools quietly ship on your profile; a slot reading "Your language"
  // is visibly unfinished, which is the failure mode you want.
  const items = stack
    ? stack.split(',').map((s) => s.trim()).filter(Boolean)
    : ['Your framework', 'Your database', 'Your language'];
  const labels = ['Primary', 'Database', 'Language', 'Runtime', 'Editor'];
  cfg.inventory = cfg.inventory || {};
  cfg.inventory.slots = items
    .map((item, i) => ({ slot: labels[i] || `Slot ${i + 1}`, item }))
    // The slot whose item matches petName is drawn as the live companion, so
    // it has to follow a rename.
    .concat([{ slot: 'Companion', item: petName }]);
}
writeJson(CONFIG_PATH, cfg);

// 3. The wall. Theirs is a list of repos that are not yours; yours starts with
//    you on it. Getting onto the *upstream* wall is a separate PR.
writeJson(WALL_PATH, {
  $comment: readJson(WALL_PATH).$comment,
  entries: [{ user, repo, petName, note: '' }],
});

// 4. The profile README. This is the file that actually reaches your profile,
//    and every image in it is an absolute URL — left alone, you would be
//    embedding somebody else's cards under your own name.
if (fs.existsSync(PROFILE_README)) {
  const before = fs.readFileSync(PROFILE_README, 'utf8');

  // Work out whose repo it currently points at, from the image URLs — they are
  // the one thing guaranteed to be present and correctly formed. Then swap that
  // slug everywhere it appears, not just inside href="". The previous owner's
  // name also shows up as link *text* ("regenerates daily from owner/repo"),
  // and a rewrite that fixes the href but not the label is worse than none:
  // it reads as yours and silently is not.
  const src = before.match(/https:\/\/raw\.githubusercontent\.com\/([^/\s]+)\/([^/\s]+)\/([^/\s]+)\/assets\//);
  let after = before;

  if (src) {
    const [, oldUser, oldRepo] = src;
    const lit = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    after = after
      // Profile repo (<login>/<login>) first — otherwise the generic slug swap
      // below would already have consumed it when login and repo name match.
      .replace(new RegExp(`${lit(oldUser)}/${lit(oldUser)}\\b`, 'g'), `${user}/${user}`)
      .replace(new RegExp(`${lit(oldUser)}/${lit(oldRepo)}\\b`, 'g'), `${user}/${repo}`);
  }

  // Branch segment last: the slug swap above leaves it alone, and a copy served
  // from `master` needs it moved.
  after = after.replace(
    /(https:\/\/raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/)[^/\s]+(\/assets\/)/g,
    `$1${branch}$2`,
  );

  const urls = (after.match(/raw\.githubusercontent\.com/g) || []).length;
  if (after !== before) writeText(PROFILE_README, after);

  // Only meaningful when the old owner was somebody else — re-running adopt on
  // an already-adopted copy finds your own login all over the file, correctly.
  const prev = src && src[1] !== user ? src[1] : null;
  const stragglers = prev && after.includes(`${prev}/`) ? ` — "${prev}" still appears, check it by hand` : '';
  console.log(`  PROFILE-README.md now points at ${user}/${repo}@${branch} (${urls} images)${stragglers}`);

  // The view-counter badge is the one image that is NOT on raw.githubusercontent
  // and so is not covered by the swap above. It points at somebody's deployed
  // Cloudflare Worker, and this script has no way to guess yours — you may not
  // have deployed one at all. Left in place it is worse than a stale image: it
  // silently feeds the previous owner's counter and shows you their number.
  //
  // So: warn, loudly, and do not touch it. See counter/README.md.
  const worker = after.match(/https:\/\/[^/\s"']+\.workers\.dev\/badge\.svg/);
  if (worker) {
    console.log('');
    console.log(`  ! PROFILE-README.md still has a view-counter badge pointing at`);
    console.log(`      ${worker[0]}`);
    console.log('    That is somebody else\'s Worker. Deploy your own (see counter/README.md)');
    console.log('    and swap the host, or delete the badge block. Leaving it counts your');
    console.log('    profile views onto their total.');
  }
}

// ------------------------------------------------------------------- report

console.log(`\n${DRY ? 'would rewrite' : 'rewrote'}: ${changes.join(', ')}`);

const stale = fs.existsSync(ASSETS_DIR)
  ? fs.readdirSync(ASSETS_DIR).filter((f) => f.endsWith('.svg')).length
  : 0;

console.log(`
GRUB is yours. ${petName} lives in ${user}/${repo}, starving by ${cfg.timezone}.

Still to do — see docs/setup.md:
  1. Settings -> Actions -> General -> Workflow permissions -> Read and write
  2. Actions tab -> "Tamagotchi of Shame" -> Run workflow, inputs blank
     ${stale} card${stale === 1 ? '' : 's'} in assets/ and WALL-OF-SHAME.md are still
     the previous owner's renders until that run rebuilds them. Do not paste
     PROFILE-README.md into your profile before it has.
  3. Copy PROFILE-README.md into ${user}/${user}/README.md
  4. Edit grub.config.json: inventory slots, timezone, and the cron in
     .github/workflows/pet.yml if you changed the timezone
${DRY ? '\n-- dry run, nothing written --' : ''}`);
