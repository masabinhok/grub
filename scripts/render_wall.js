#!/usr/bin/env node
'use strict';

/**
 * The Wall of Shame — every GRUB running in public, ranked by deaths survived.
 *
 * Reads wall-of-shame.json (a list of forks, added by PR), fetches each one's
 * pet-state.json straight off raw.githubusercontent.com, and rewrites the table
 * in WALL-OF-SHAME.md between its markers. No API token, no auth, no third-party
 * service: the state file is already public in every fork, which is the entire
 * reason this can exist without a backend.
 *
 * The one exception is our own row, which is read off disk — see fetchStatus.
 *
 * Every entry arrives by pull request from a stranger, so nothing here trusts the
 * file:
 *   - `user`, `repo` and `branch` are validated against character sets before
 *     they are ever put in a URL.
 *   - `petName` and `note` are stripped to a safe character set before they are
 *     put in markdown, so an entry cannot inject a table row, a link, or HTML
 *     into a page that renders on the repo front door.
 *   - A fork that is unreachable, private, deleted or serving something that is
 *     not GRUB state renders as "—" and never fails the run. The wall is
 *     decoration; it must not be able to break the daily job.
 *
 * Usage:
 *   node scripts/render_wall.js             # fetch every fork's state, rewrite the table
 *   node scripts/render_wall.js --offline   # rewrite from the list alone, no network
 *   node scripts/render_wall.js --dry-run   # print the table, write nothing
 */

const fs = require('fs');
const path = require('path');

const { ROOT, STATE_PATH, LOGIN_RE } = require('./lib/constants');
const { loadConfig } = require('./lib/config');
const { resolveRepo } = require('./lib/github');

const DATA_PATH = path.join(ROOT, 'wall-of-shame.json');
const PAGE_PATH = path.join(ROOT, 'WALL-OF-SHAME.md');
const START = '<!-- wall:start -->';
const END = '<!-- wall:end -->';

const REPO_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/;
const BRANCH_RE = /^[A-Za-z0-9_][A-Za-z0-9_./-]{0,99}$/;
const FETCH_TIMEOUT_MS = 8000;
const CONCURRENCY = 6;

const MOODS = {
  thriving: '🟢 thriving',
  hungry: '🟡 hungry',
  feral: '🔴 feral',
  deceased: '🪦 deceased',
};

/**
 * Free text from a pull request, on its way into a markdown table. Anything
 * outside this set is dropped rather than escaped — a wall entry has no business
 * containing a pipe, a bracket or a tag, and dropping is the one transformation
 * that cannot be undone by a renderer downstream.
 */
const safeText = (v, max) => String(v == null ? '' : v)
  .replace(/[^\w .,:!?&'+#-]/g, '')
  .trim()
  .slice(0, max);

/** Why an entry cannot be used, or null. */
function entryProblem(e) {
  if (!e || typeof e !== 'object' || Array.isArray(e)) return 'not an object';
  if (!LOGIN_RE.test(String(e.user || ''))) return `user "${e.user}" is not a GitHub login`;
  if (!REPO_RE.test(String(e.repo || ''))) return `repo "${e.repo}" is not a repository name`;
  if (e.branch !== undefined && !BRANCH_RE.test(String(e.branch))) return `branch "${e.branch}" is not a branch name`;
  return null;
}

function loadEntries() {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.warn(`! ${DATA_PATH} unreadable (${err.message}) — rendering an empty wall`);
    return [];
  }
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw.entries) ? raw.entries : []);
  const seen = new Set();
  const out = [];
  for (const e of list) {
    const problem = entryProblem(e);
    if (problem) { console.warn(`! skipping wall entry: ${problem}`); continue; }
    const key = `${e.user}/${e.repo}`.toLowerCase();
    if (seen.has(key)) { console.warn(`! skipping duplicate wall entry: ${key}`); continue; }
    seen.add(key);
    out.push({
      user: e.user,
      repo: e.repo,
      branch: e.branch || 'main',
      petName: safeText(e.petName, 24) || 'GRUB',
      note: safeText(e.note, 60),
    });
  }
  return out;
}

async function getJson(url) {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: control.signal,
      headers: { 'user-agent': 'grub-wall-of-shame' },
    });
    if (!res.ok) return null;
    const text = await res.text();
    // A fork can serve anything at this path. Anything that is not an object with
    // a mood in it is simply not GRUB state.
    const data = JSON.parse(text);
    return (data && typeof data === 'object' && !Array.isArray(data)) ? data : null;
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const EMPTY = { reachable: false, mood: null, resurrections: null, pets: null };

/** Whatever of a state file we are willing to put in the table. */
const statusFrom = (state) => (state ? {
  reachable: true,
  mood: MOODS[state.mood] ? state.mood : null,
  resurrections: Number.isFinite(state.resurrections) ? state.resurrections : null,
  pets: Number.isFinite(state.pets) ? state.pets : null,
} : EMPTY);

/** This repo's own `owner/name`, so it can recognise itself in the list. */
function localRepo() {
  try {
    return resolveRepo({ repo: loadConfig().github.repo });
  } catch (_) {
    return null;
  }
}

/** The state file sitting next to this script, for our own row. */
function readLocalState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * One fork's public state, or an empty status if it cannot be read.
 *
 * Our own row is read off disk rather than over the network. Fetching it would
 * always be a run behind: this runs before the daily job commits the new state,
 * and raw.githubusercontent.com serves a cached copy for minutes afterwards
 * anyway. Everyone else's row is a day old whatever we do — but there is no
 * excuse for the wall misreporting the pet whose repo it lives in.
 */
async function fetchStatus(entry, self) {
  if (self && `${entry.user}/${entry.repo}`.toLowerCase() === self.toLowerCase()) {
    const state = readLocalState();
    if (state) return statusFrom(state);
    console.warn(`! ${entry.user}/${entry.repo} is this repo but pet-state.json is unreadable — fetching instead`);
  }
  const raw = (branch) =>
    `https://raw.githubusercontent.com/${entry.user}/${entry.repo}/${branch}/pet-state.json`;
  // `main` first, then `master` — a fork of a template can be on either, and
  // guessing wrong is the most likely reason a real entry looks dead.
  const state = await getJson(raw(entry.branch)) ||
    (entry.branch === 'main' ? await getJson(raw('master')) : null);
  return statusFrom(state);
}

/** Resolve `fn` over `items` a few at a time, in order. */
async function pool(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Deaths survived first — the counter nobody can reset is the only honest
 * leaderboard here. Ties break on who has been fed more, then alphabetically, so
 * the order is stable between runs and the diff stays quiet.
 */
function rank(rows) {
  return rows.slice().sort((a, b) =>
    (b.status.resurrections || 0) - (a.status.resurrections || 0) ||
    (b.status.pets || 0) - (a.status.pets || 0) ||
    a.entry.user.localeCompare(b.entry.user));
}

function renderTable(rows) {
  if (!rows.length) {
    return '_Nobody yet. The first name on this wall gets to say they were first._';
  }
  const head =
    '| # | Keeper | Pet | State | Deaths survived | Times fed |\n' +
    '| --- | --- | --- | --- | --- | --- |';
  const num = (v) => (v === null ? '—' : String(v));
  const body = rank(rows).map(({ entry, status }, i) => {
    const repoUrl = `https://github.com/${entry.user}/${entry.repo}`;
    const pet = `[${entry.petName}](${repoUrl})${entry.note ? ` <br><sub>${entry.note}</sub>` : ''}`;
    const state = status.reachable
      ? (status.mood ? MOODS[status.mood] : '⬛ unreadable')
      : '⬛ unreachable';
    return `| ${i + 1} | [@${entry.user}](https://github.com/${entry.user}) | ${pet} | ${state} | ` +
      `${num(status.resurrections)} | ${num(status.pets)} |`;
  }).join('\n');
  return `${head}\n${body}`;
}

function write(table, count) {
  let page;
  try {
    page = fs.readFileSync(PAGE_PATH, 'utf8');
  } catch (_) {
    console.error(`x ${PAGE_PATH} is missing — it holds the markers this table goes between`);
    process.exit(1);
  }
  const a = page.indexOf(START);
  const b = page.indexOf(END);
  if (a === -1 || b === -1 || b < a) {
    console.error(`x ${PAGE_PATH} has no ${START} / ${END} markers`);
    process.exit(1);
  }
  const next = `${page.slice(0, a + START.length)}\n${table}\n${page.slice(b)}`;
  if (next === page) {
    console.log(`WALL-OF-SHAME.md unchanged (${count} on the wall)`);
    return;
  }
  fs.writeFileSync(PAGE_PATH, next);
  console.log(`wrote WALL-OF-SHAME.md (${count} on the wall)`);
}

async function main() {
  const offline = process.argv.includes('--offline');
  const dryRun = process.argv.includes('--dry-run');
  const entries = loadEntries();
  const self = localRepo();

  // --offline still reads our own state file: it means "no network", not
  // "know nothing", and the one row that needs no network is ours.
  const rows = offline
    ? entries.map((entry) => ({
      entry,
      status: (self && `${entry.user}/${entry.repo}`.toLowerCase() === self.toLowerCase())
        ? statusFrom(readLocalState())
        : EMPTY,
    }))
    : await pool(entries, CONCURRENCY, async (entry) => ({ entry, status: await fetchStatus(entry, self) }));

  const unreachable = rows.filter((r) => !r.status.reachable).length;
  if (!offline && unreachable) {
    console.warn(`! ${unreachable} of ${rows.length} forks did not answer — they render as "—"`);
  }

  const table = renderTable(rows);
  if (dryRun) {
    console.log(table);
    console.log(`\n-- dry run, nothing written (${rows.length} entries) --`);
    return;
  }
  write(table, rows.length);
}

main().catch((err) => {
  // The wall is decoration on somebody else's daily job. It does not get to fail it.
  console.warn(`! wall render failed (${err.message}) — leaving WALL-OF-SHAME.md alone`);
});
