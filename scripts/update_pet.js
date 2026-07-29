#!/usr/bin/env node
'use strict';

/**
 * GRUB — The Tamagotchi of Shame, and the README components that share its mood.
 *
 * Renders a set of standalone SVG cards into assets/. Every card reads the same
 * pet state, so when GRUB starves the entire README desaturates and stops
 * animating with him. When he dies, nothing moves anywhere.
 *
 * Components: banner, pet, streak, stats, languages, divider
 *
 * Zero dependencies. Node 18+ (needs global fetch). CommonJS so there is no
 * package.json and therefore no install step in CI.
 *
 * Usage:
 *   node scripts/update_pet.js                      # normal run (hits the API)
 *   node scripts/update_pet.js --dry-run            # print the summary, write nothing
 *   node scripts/update_pet.js --days 4             # pretend it has been 4 days
 *   node scripts/update_pet.js --apology            # pretend HEAD says "i'm sorry"
 *   node scripts/update_pet.js --offline            # skip the API, use cached state
 *   node scripts/update_pet.js --include-private    # let private repos feed it
 *   node scripts/update_pet.js --mood feral --outdir /tmp/x --offline   # preview
 *   node scripts/update_pet.js --only streak        # render one component
 *
 * Environment:
 *   PET_TOKEN            Classic PAT with `repo` scope. Only needed if the log
 *                        warns private work is invisible. Falls back to GITHUB_TOKEN.
 *   PET_INCLUDE_PRIVATE  "1" to count private contributions.
 *   PET_USERNAME         GitHub login to track. Defaults to the repo owner in CI.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'pet-state.json');
const ASSETS_DIR = path.join(ROOT, 'assets');
const README_PATH = path.join(ROOT, 'README.md');

const PET_NAME = 'GRUB';
const DEATH_THRESHOLD_DAYS = 5;
const APOLOGY = "i'm sorry";
const MOODS = ['thriving', 'hungry', 'feral', 'deceased'];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const hasFlag = (name) => argv.includes(`--${name}`);
const getOpt = (name, fallback = null) => {
  const i = argv.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return fallback;
  if (argv[i].includes('=')) return argv[i].slice(argv[i].indexOf('=') + 1);
  return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const OPTS = {
  dryRun: hasFlag('dry-run'),
  offline: hasFlag('offline'),
  apology: hasFlag('apology'),
  simulateDays: getOpt('days', process.env.PET_SIMULATE_DAYS || null),
  user: getOpt('user', process.env.PET_USERNAME || null),
  outDir: getOpt('outdir', ASSETS_DIR),
  only: getOpt('only', null),
  forceMood: getOpt('mood', null),
  includePrivate: hasFlag('include-private') || process.env.PET_INCLUDE_PRIVATE === '1',
  help: hasFlag('help') || hasFlag('h'),
};

if (OPTS.help) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1].replace(/^ \* ?/gm, ''));
  process.exit(0);
}
if (OPTS.forceMood && !MOODS.includes(OPTS.forceMood)) {
  console.error(`x --mood expects one of: ${MOODS.join(', ')}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Date helpers — everything is UTC, whole days
// ---------------------------------------------------------------------------

const DAY_MS = 86400000;
const startOfDayUTC = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
const daysBetween = (a, b) =>
  Math.max(0, Math.round((startOfDayUTC(new Date(b)) - startOfDayUTC(new Date(a))) / DAY_MS));

// ---------------------------------------------------------------------------
// Sprites — 16x16 char grids. '.' is transparent.
// ---------------------------------------------------------------------------

const SPRITES = {
  thriving: [
    '.......tt.......', '.......tt.......', '....xxxxxxxx....', '..xxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxx.', '.xxwwwxxxxwwwxx.', '.xxwbwxxxxwbwxx.', '.xxwwwxxxxwwwxx.',
    '.xxxxxxxxxxxxxx.', '.xxxxmmmmmmxxxx.', '.xxxxxmmmmxxxxx.', '.xxxxxxxxxxxxxx.',
    '..xxxxxxxxxxxx..', '...xxxxxxxxxx...', '...xx......xx...', '..xxx......xxx..',
  ],
  hungry: [
    '......tt........', '.......t........', '.....xxxxxx.....', '..xxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxx.', '.xxwwwxxxxwwwxx.', '.xxbwwxxxxbwwxx.', '.xxwwwxxxxwwwxx.',
    '.xxxxxxxxxxxxxx.', '.xxxxxxxxxxxxxx.', '.xxxxxmmmmxxxxx.', '.xxxxxxxxxxxxxx.',
    '..xxxxxxxxxxxx..', '...xxxxxxxxxx...', '...xx......xx...', '..xxx......xxx..',
  ],
  feral: [
    '................', '.....t..........', '.....xxxxxx.....', '...xxxxxxxxxx...',
    '..xxxxxxxxxxxx..', '..xwwwxxxxwwwx..', '..xwbwxxxxwbwx..', '..xwwwxxxxwwwx..',
    '..xxxxxxxxxxxx..', '..xxmxmxmxmxxx..', '..xxxmxmxmxxxx..', '..xdxxxxxxxxdx..',
    '..xdxxxxxxxxdx..', '...xxxxxxxxxx...', '...x........x...', '..xx........xx..',
  ],
  deceased: [
    '................', '....ssssssss....', '..ssssssssssss..', '.ssssssssssssss.',
    '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.',
    '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.',
    '.ssssssssssssss.', 'gggggggggggggggg', 'gggggggggggggggg', '................',
  ],
};

for (const [name, grid] of Object.entries(SPRITES)) {
  if (grid.length !== 16 || grid.some((r) => r.length !== 16)) {
    throw new Error(`sprite "${name}" is not 16x16`);
  }
}

const PALETTES = {
  thriving: {
    x: '#5fd99a', d: '#31a86e', w: '#ffffff', b: '#0d2018', m: '#ff6f8f', t: '#ffd24c',
    bg1: '#0d2018', bg2: '#173d2b', ink: '#e6fff2', dim: '#79c9a4', accent: '#5fd99a',
    ground: '#1f5c40', sat: 1,
  },
  hungry: {
    x: '#93ad78', d: '#61784c', w: '#efefe6', b: '#20250f', m: '#b06274', t: '#c2a244',
    bg1: '#171b12', bg2: '#252c1c', ink: '#dfe6cf', dim: '#94a37d', accent: '#93ad78',
    ground: '#3a4429', sat: 0.6,
  },
  feral: {
    x: '#8b8f86', d: '#565a52', w: '#e9e9e5', b: '#c02626', m: '#a52a2a', t: '#6e6a4a',
    bg1: '#111110', bg2: '#1c1b19', ink: '#c8c8c0', dim: '#8a8a82', accent: '#a03030',
    ground: '#2a2a26', sat: 0.25,
  },
  deceased: {
    s: '#8d939b', g: '#2e2f33', d: '#5c6169', x: '#8d939b', w: '#e9e9e5', b: '#2e2f33',
    bg1: '#0a0a0b', bg2: '#141417', ink: '#9aa0a6', dim: '#6b7076', accent: '#6b7076',
    ground: '#2e2f33', sat: 0,
  },
};

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const LINES = {
  thriving: [
    'Fed. Cocky. Insufferable. Do it again tomorrow.',
    "You shipped something. I'll allow it.",
    'Green square secured. Do not get comfortable.',
    "I'm full. That's the nicest thing I'll say all week.",
    'Look at you. Almost like a professional.',
    "Zero days since your last commit. I'm as confused as you are.",
    'Peak form. Statistically, this ends Thursday.',
  ],
  hungry: [
    "It's been a day. I'm not mad. I'm just logging it.",
    'Your last commit is starting to smell.',
    'Refactoring your life instead? Bold strategy.',
    'One more day and I start telling people.',
    'That branch is still not merged. I checked. Twice.',
    'I can go a while without food. You cannot go a while without excuses.',
    "Reading the docs isn't committing. Nice try.",
  ],
  feral: [
    'THREE DAYS. I have eaten the README.',
    'I can see through time now. You still have not pushed.',
    "Tell your recruiter I said hi. I'll be the gray one.",
    "I'm chewing the .gitignore. It's fine. Everything is fine.",
    'Your commit history is now a missing persons case.',
    'I have started drafting my own obituary. You are in it.',
    'Do you hear that? That is my ribs. Say hi to my ribs.',
  ],
  deceased: [
    "Cause of death: 'I'll commit tomorrow.'",
    'Here lies GRUB. Starved by someone with 41 open tabs.',
    'Death is temporary. The commit log is forever.',
    "Push a commit that says exactly: i'm sorry. Publicly.",
    'It knew this would happen. It said so. Repeatedly.',
    'No animation. No pulse. No excuses left.',
    'The tombstone is committed to your repo. Enjoy the permanence.',
  ],
  revived: [
    'You said it out loud. In the log. Forever.',
    'I forgive you. `git log` does not.',
    'Back from the dead and keeping receipts.',
    'That apology is now part of your public record. Sleep well.',
    'Resurrected. Slightly worse. Considerably meaner.',
    'I remember dying. I remember whose fault it was.',
    'Second chance granted. There is a counter now.',
  ],
};

// Banner tagline per mood — the header reacts too.
const TAGLINES = {
  thriving: 'building things · currently fed',
  hungry: 'building things · getting peckish',
  feral: 'building things · allegedly',
  deceased: 'was building things · see tombstone',
};

function pickLine(tier, state, now) {
  const pool = LINES[tier];
  return pool[(now.getUTCDay() + (state.resurrections || 0)) % pool.length];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function defaultState(now) {
  return {
    lastCommitDate: now.toISOString(),
    lastCheckedDate: now.toISOString(),
    hunger: 0,
    mood: 'thriving',
    alive: true,
    diedOn: null,
    resurrections: 0,
    cache: {},
  };
}

function loadState(now) {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
    return Object.assign(defaultState(now), raw);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`! pet-state.json unreadable (${err.message}), starting fresh`);
    return defaultState(now);
  }
}

// ---------------------------------------------------------------------------
// GitHub
// ---------------------------------------------------------------------------

const authToken = () => process.env.PET_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

function resolveUsername() {
  if (OPTS.user) return OPTS.user;
  if (process.env.GITHUB_REPOSITORY_OWNER) return process.env.GITHUB_REPOSITORY_OWNER;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY.split('/')[0];
  try {
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = remote.match(/github\.com[:/]([^/]+)\//);
    if (m) return m[1];
  } catch (_) { /* not a git repo, or no remote */ }
  return null;
}

async function gh(pathname) {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'tamagotchi-of-shame',
  };
  const token = authToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`https://api.github.com${pathname}`, { headers });
  if (!res.ok) throw new Error(`GET ${pathname} -> ${res.status} ${res.statusText}`);
  return res.json();
}

async function ghGraphQL(query, variables) {
  const token = authToken();
  if (!token) throw new Error('no token available (set PET_TOKEN or GITHUB_TOKEN)');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'tamagotchi-of-shame',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL -> ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json.errors && json.errors.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

const isBotCommit = (msg, authorName) =>
  /\[skip ci\]/i.test(msg || '') ||
  /update pet state/i.test(msg || '') ||
  /github-actions(\[bot\])?/i.test(authorName || '');

const normalize = (msg) =>
  String(msg || '').split('\n')[0].toLowerCase()
    .replace(/[‘’'`]/g, '').replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, ' ');

const APOLOGY_NORM = normalize(APOLOGY);

/**
 * Commit author dates are self-reported and frequently nonsense — GitHub is full
 * of commits dated decades in the future. Accepting one would feed the pet
 * forever, so anything beyond a day of clock skew is discarded.
 */
function isSaneDate(iso, nowMs) {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t <= nowMs + DAY_MS;
}

const CONTRIB_QUERY = `
query($login:String!,$from:DateTime!,$to:DateTime!){
  user(login:$login){
    contributionsCollection(from:$from,to:$to){
      restrictedContributionsCount
      commitContributionsByRepository(maxRepositories:100){
        repository{ nameWithOwner isPrivate }
        contributions(first:1, orderBy:{field:OCCURRED_AT, direction:DESC}){ nodes{ occurredAt } }
      }
      contributionCalendar{
        totalContributions
        weeks{ contributionDays{ date contributionCount } }
      }
    }
  }
}`;

/**
 * The contribution graph. Two sources with very different visibility:
 *
 *   commitContributionsByRepository — commits only, but PUBLIC REPOS ONLY.
 *     GitHub anonymises private contributions completely here: no repo name and
 *     no date, regardless of token scope. Verified against a token with full
 *     `repo` scope, querying `viewer` rather than `user(login:)`.
 *
 *   contributionCalendar — per-day totals that DO include private work. This is
 *     the only way to date private activity, and the only source for streaks.
 *
 * The catch: calendar days count every contribution type — commits to default
 * branches, PRs, issues, reviews. Opting into private repos therefore loosens
 * what counts as "feeding", which is why it sits behind PET_INCLUDE_PRIVATE.
 */
async function fetchContributions(username, nowMs) {
  const to = new Date(nowMs).toISOString();
  const from = new Date(nowMs - 365 * DAY_MS).toISOString();
  const data = await ghGraphQL(CONTRIB_QUERY, { login: username, from, to });
  const cc = data && data.user && data.user.contributionsCollection;
  if (!cc) return null;

  const out = {
    commitLatest: null,
    calendarLatest: null,
    restricted: cc.restrictedContributionsCount || 0,
    days: [],
    totalContributions: (cc.contributionCalendar && cc.contributionCalendar.totalContributions) || 0,
  };

  for (const entry of cc.commitContributionsByRepository || []) {
    const nodes = (entry.contributions && entry.contributions.nodes) || [];
    const occurredAt = nodes[0] && nodes[0].occurredAt;
    if (!occurredAt || !isSaneDate(occurredAt, nowMs)) continue;
    if (!out.commitLatest || new Date(occurredAt) > new Date(out.commitLatest)) {
      out.commitLatest = occurredAt;
    }
  }

  const todayIso = isoDate(nowMs);
  for (const week of (cc.contributionCalendar && cc.contributionCalendar.weeks) || []) {
    for (const day of week.contributionDays || []) {
      if (day.date > todayIso) continue; // the calendar pads out the current week
      out.days.push({ date: day.date, count: day.contributionCount || 0 });
      if (!day.contributionCount) continue;
      const iso = `${day.date}T00:00:00.000Z`;
      if (isSaneDate(iso, nowMs) && (!out.calendarLatest || new Date(iso) > new Date(out.calendarLatest))) {
        out.calendarLatest = iso;
      }
    }
  }
  out.days.sort((a, b) => (a.date < b.date ? -1 : 1));
  return out;
}

/**
 * Streaks from the calendar. A day with zero contributions today does not break
 * the streak — the day is not over yet — so the walk starts from yesterday when
 * today is still empty.
 */
function computeStreaks(days) {
  const out = { current: 0, longest: 0, activeDays: 0, spark: [] };
  if (!days || !days.length) return out;

  let i = days.length - 1;
  if (days[i].count === 0) i -= 1;
  while (i >= 0 && days[i].count > 0) { out.current += 1; i -= 1; }

  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > out.longest) out.longest = run;
    if (d.count > 0) out.activeDays += 1;
  }
  out.spark = days.slice(-30).map((d) => d.count);
  return out;
}

/** Profile + repo aggregates for the stats and languages cards. */
async function fetchProfileData(username) {
  const [user, repos] = await Promise.all([
    gh(`/users/${encodeURIComponent(username)}`),
    gh(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`),
  ]);
  const own = (repos || []).filter((r) => !r.fork);
  const langCounts = {};
  let stars = 0;
  for (const r of own) {
    stars += r.stargazers_count || 0;
    if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
  }
  return {
    name: user.name || user.login,
    login: user.login,
    bio: user.bio || null,
    company: user.company || null,
    location: user.location || null,
    blog: user.blog || null,
    followers: user.followers || 0,
    publicRepos: own.length,
    stars,
    languages: Object.entries(langCounts).sort((a, b) => b[1] - a[1]),
  };
}

async function fetchActivity(username) {
  const result = { lastCommitAt: null, apology: false, source: null, contrib: null };
  const sources = [];
  const nowMs = Date.now();

  const consider = (iso, label) => {
    if (!iso || !isSaneDate(iso, nowMs)) return;
    if (!sources.includes(label)) sources.push(label);
    if (!result.lastCommitAt || new Date(iso) > new Date(result.lastCommitAt)) result.lastCommitAt = iso;
  };

  try {
    const contrib = await fetchContributions(username, nowMs);
    if (contrib) {
      result.contrib = contrib;
      consider(contrib.commitLatest, 'contributions');

      if (OPTS.includePrivate) {
        consider(contrib.calendarLatest, 'calendar');
        console.log(`  counting private work: ${contrib.restricted} restricted contribution(s) in window`);
        if (contrib.restricted === 0) {
          console.warn(
            '! PET_INCLUDE_PRIVATE is on but no private contributions are visible.' +
            (process.env.PET_TOKEN
              ? ' Check that PET_TOKEN is a classic PAT with `repo` scope.'
              : ' No PET_TOKEN is set — add one, or enable "Include private' +
                ' contributions on my profile" in your GitHub profile settings.'),
          );
        }
      } else if (contrib.restricted > 0) {
        console.warn(
          `! ${contrib.restricted} private contribution(s) exist but are NOT being counted — ` +
          'set PET_INCLUDE_PRIVATE=1 to let them feed the pet',
        );
      }
    }
  } catch (err) {
    console.warn(`! contributions API failed: ${err.message}`);
  }

  try {
    const events = await gh(`/users/${encodeURIComponent(username)}/events/public?per_page=100`);
    for (const ev of events) {
      const when = new Date(ev.created_at).getTime();
      const commits = (ev.payload && ev.payload.commits) || [];
      if (!isSaneDate(ev.created_at, nowMs)) continue;

      if (ev.type === 'PushEvent') {
        const real = commits.filter((c) => !isBotCommit(c.message, c.author && c.author.name));
        if (real.length) {
          consider(ev.created_at, 'events');
          if (nowMs - when < 2 * DAY_MS && real.some((c) => normalize(c.message) === APOLOGY_NORM)) {
            result.apology = true;
          }
        }
      } else if (ev.type === 'CreateEvent' && ev.payload && ev.payload.ref_type === 'repository') {
        consider(ev.created_at, 'events');
      }
    }
  } catch (err) {
    console.warn(`! events API failed: ${err.message}`);
  }

  if (result.lastCommitAt) {
    result.source = sources.join('+');
    return result;
  }

  try {
    const q = encodeURIComponent(`author:${username}`);
    const data = await gh(`/search/commits?q=${q}&sort=author-date&order=desc&per_page=20`);
    const hit = (data.items || []).find(
      (i) => !isBotCommit(i.commit.message, i.commit.author && i.commit.author.name) &&
             isSaneDate(i.commit.author && i.commit.author.date, Date.now()),
    );
    if (hit) {
      result.lastCommitAt = hit.commit.author.date;
      result.source = 'search';
      if (normalize(hit.commit.message) === APOLOGY_NORM) result.apology = true;
    }
  } catch (err) {
    console.warn(`! search API failed: ${err.message}`);
  }
  return result;
}

function localHeadMessage() {
  try {
    return execSync('git log -1 --pretty=%B', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (_) { return ''; }
}

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

function moodForDays(days) {
  if (days >= DEATH_THRESHOLD_DAYS) return 'deceased';
  if (days >= 3) return 'feral';
  if (days >= 1) return 'hungry';
  return 'thriving';
}
const hungerForDays = (days) => Math.min(100, Math.round((days / DEATH_THRESHOLD_DAYS) * 100));

// ---------------------------------------------------------------------------
// SVG primitives
// ---------------------------------------------------------------------------

const CELL = 9;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Pull a hex colour toward gray. sat=1 keeps it, sat=0 makes it fully gray. */
function desaturate(hex, sat) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const mix = (c) => Math.round(c * sat + l * (1 - sat));
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function pixelRects(grid, palette) {
  const out = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (!palette[ch]) { x += 1; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w += 1;
      out.push(`<rect x="${x * CELL}" y="${y * CELL}" width="${w * CELL}" height="${CELL}" fill="${palette[ch]}"/>`);
      x += w;
    }
  });
  return out.join('');
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

const FONT = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace';

/** Styles every card shares, so the whole README reads as one system. */
function baseStyle(pal, dead) {
  return `
    .mono{font-family:${FONT}}
    .lbl{font-size:9.5px;letter-spacing:1.6px;fill:${pal.dim}}
    .big{font-size:31px;font-weight:700;fill:${pal.ink}}
    .med{font-size:15px;font-weight:700;fill:${pal.ink}}
    .sm{font-size:11px;fill:${pal.ink}}
    .dim{font-size:11px;fill:${pal.dim}}
    ${dead ? '' : `
    .pulse{animation:pulse 3.4s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.62}}`}`;
}

/** Wraps body content in a themed card with a gradient background and border. */
function svgDoc({ w, h, pal, id, title, desc, style, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${id}t ${id}d">
<title id="${id}t">${esc(title)}</title>
<desc id="${id}d">${esc(desc)}</desc>
<defs><linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${pal.bg2}"/><stop offset="1" stop-color="${pal.bg1}"/>
</linearGradient></defs>
<style>${style}
</style>
<rect width="${w}" height="${h}" rx="14" fill="url(#${id}bg)"/>
<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="13.5" fill="none" stroke="${pal.accent}" stroke-opacity="0.35"/>
${body}
</svg>
`;
}

// ---------------------------------------------------------------------------
// Component: pet (the hero card)
// ---------------------------------------------------------------------------

const W = 540, H = 300, SPRITE_X = 46, SPRITE_Y = 116;

function renderPet(state, ctx) {
  const mood = state.mood;
  const pal = PALETTES[mood];
  const dead = mood === 'deceased';
  const animated = !dead;
  const bubbleLines = wrap(ctx.line, 34);
  const bubbleH = 26 + bubbleLines.length * 19;

  const petBase = `
    .mono{font-family:${FONT}}
    .brand{font-size:17px;font-weight:700;letter-spacing:2px;fill:${pal.ink}}
    .sub{font-size:10px;letter-spacing:1px;fill:${pal.dim}}
    .say{font-size:12.5px;fill:${pal.ink}}
    .stat{font-size:11px;fill:${pal.dim}}
    .val{font-size:11px;fill:${pal.ink};font-weight:700}`;

  const style = dead
    ? `${petBase}
    .rip{font-size:21px;font-weight:700;letter-spacing:3px;fill:${pal.g}}
    .ripsub{font-size:9.5px;letter-spacing:1px;fill:${pal.g}}`
    : `${petBase}
    .lid{opacity:0;animation:blink ${mood === 'feral' ? '1.7s' : '5.4s'} steps(1) infinite}
    .bubble{animation:breathe ${mood === 'thriving' ? '3.2s' : '5s'} ease-in-out infinite}
    .meter{animation:meterpulse 2.6s ease-in-out infinite}
    ${mood === 'feral' ? '.glitch{animation:tear 1.1s steps(1) infinite}.shell{animation:desat 2.3s ease-in-out infinite}' : ''}
    ${mood === 'thriving' ? '.spark{animation:twinkle 1.9s ease-in-out infinite}' : ''}
    ${ctx.revived ? '.flash{animation:flash 2.4s ease-out infinite}.ray{animation:spin 9s linear infinite;transform-box:fill-box;transform-origin:center}' : ''}
    @keyframes blink{0%,93%{opacity:0}94%,97%{opacity:1}98%,100%{opacity:0}}
    @keyframes breathe{0%,100%{opacity:1}50%{opacity:.86}}
    @keyframes meterpulse{0%,100%{opacity:1}50%{opacity:.6}}
    @keyframes tear{0%,100%{opacity:0;transform:translateX(0)}12%{opacity:.55;transform:translateX(-4px)}18%{opacity:0}61%{opacity:.4;transform:translateX(5px)}67%{opacity:0}}
    @keyframes desat{0%,100%{filter:saturate(.35)}50%{filter:saturate(0) contrast(1.25)}}
    @keyframes twinkle{0%,100%{opacity:.25}50%{opacity:1}}
    @keyframes flash{0%{opacity:.8}100%{opacity:0}}
    @keyframes spin{to{transform:rotate(360deg)}}`;

  let spriteAnim = '';
  if (mood === 'thriving') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -7; 0 0" keyTimes="0;0.5;1" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" additive="sum"/>';
  } else if (mood === 'hungry') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="4.2s" repeatCount="indefinite" additive="sum"/>';
  } else if (mood === 'feral') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0;2 -1;-3 1;0 0;1 2;-1 0;0 0" dur="0.55s" repeatCount="indefinite" calcMode="discrete" additive="sum"/>';
  }

  const eyeLids = animated
    ? `<rect class="lid" x="${3 * CELL}" y="${5 * CELL}" width="${3 * CELL}" height="${3 * CELL}" fill="${pal.x}"/>` +
      `<rect class="lid" x="${10 * CELL}" y="${5 * CELL}" width="${3 * CELL}" height="${3 * CELL}" fill="${pal.x}"/>`
    : '';

  const tombText = dead
    ? '<text class="mono rip" x="72" y="52" text-anchor="middle">R.I.P.</text>' +
      `<line x1="30" y1="62" x2="114" y2="62" stroke="${pal.g}" stroke-opacity="0.6"/>` +
      `<text class="mono ripsub" x="72" y="80" text-anchor="middle">${esc(PET_NAME)}</text>` +
      `<text class="mono ripsub" x="72" y="97" text-anchor="middle">${esc(state.diedOn || isoDate(Date.now()))}</text>` +
      '<text class="mono ripsub" x="72" y="112" text-anchor="middle">STARVED</text>'
    : '';

  const glitch = mood === 'feral'
    ? `<g class="glitch"><rect x="0" y="${5 * CELL}" width="144" height="${2 * CELL}" fill="${pal.accent}" opacity="0.5"/>` +
      `<rect x="0" y="${10 * CELL}" width="144" height="${CELL}" fill="${pal.w}" opacity="0.35"/></g>` +
      `<rect x="0" y="${8 * CELL}" width="144" height="${CELL}" fill="${pal.b}" opacity="0">` +
      '<animate attributeName="opacity" values="0;0;0.7;0;0;0.45;0" dur="1.3s" repeatCount="indefinite"/>' +
      '<animate attributeName="x" values="0;-6;7;0;4;0;0" dur="1.3s" repeatCount="indefinite"/></rect>'
    : '';

  const sparks = mood === 'thriving'
    ? `<g class="spark"><rect x="-14" y="18" width="6" height="6" fill="${pal.t}"/>` +
      `<rect x="150" y="40" width="5" height="5" fill="${pal.t}"/>` +
      `<rect x="140" y="6" width="4" height="4" fill="${pal.ink}"/></g>`
    : '';

  const rays = ctx.revived
    ? `<g class="ray" opacity="0.35">${[0, 45, 90, 135]
        .map((a) => `<rect x="-40" y="70" width="224" height="4" fill="${pal.t}" transform="rotate(${a} 72 72)"/>`).join('')}</g>` +
      '<rect class="flash" x="-60" y="-60" width="264" height="264" fill="#ffffff" opacity="0"/>'
    : '';

  const spriteGroup =
    `<g transform="translate(${SPRITE_X} ${SPRITE_Y})"><g${mood === 'feral' ? ' class="shell"' : ''}><g>` +
    spriteAnim + rays + pixelRects(SPRITES[mood], pal) + eyeLids + tombText + glitch + sparks +
    '</g></g></g>';

  const BX = 222, BY = 54, BW = 292;
  const bubble =
    `<g${animated ? ' class="bubble"' : ''}>` +
    `<rect x="${BX}" y="${BY}" width="${BW}" height="${bubbleH}" rx="10" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<path d="M${BX + 22} ${BY + bubbleH} L${BX + 2} ${BY + bubbleH + 21} L${BX + 54} ${BY + bubbleH} Z" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<rect x="${BX + 24}" y="${BY + bubbleH - 2}" width="28" height="4" fill="${pal.bg1}"/>` +
    bubbleLines.map((l, i) => `<text class="mono say" x="${BX + 16}" y="${BY + 27 + i * 19}">${esc(l)}</text>`).join('') +
    '</g>';

  const MX = 222, MY = 186, MW = 200;
  const filled = Math.round((state.hunger / 100) * MW);
  const meter =
    `<text class="mono stat" x="${MX}" y="${MY - 6}">HUNGER</text>` +
    `<rect x="${MX}" y="${MY}" width="${MW}" height="10" rx="3" fill="${pal.bg1}" stroke="${pal.dim}" stroke-opacity="0.4"/>` +
    (filled > 2 ? `<rect${animated && state.hunger >= 60 ? ' class="meter"' : ''} x="${MX + 1}" y="${MY + 1}" width="${filled - 2}" height="8" rx="2" fill="${dead ? pal.dim : pal.accent}"/>` : '') +
    `<text class="mono val" x="${MX + MW + 10}" y="${MY + 9}">${state.hunger}%</text>`;

  const statBlock = [
    ['DAYS SINCE COMMIT', String(ctx.days)],
    ['MOOD', mood.toUpperCase()],
    ['RESURRECTIONS', String(state.resurrections)],
  ].map(([k, v], i) =>
    `<text class="mono stat" x="${MX}" y="${214 + i * 19}">${esc(k)}</text>` +
    `<text class="mono val" x="${MX + 180}" y="${214 + i * 19}">${esc(v)}</text>`).join('');

  const footer = `<text class="mono stat" x="${MX}" y="277" opacity="0.7">checked ${esc(isoDate(state.lastCheckedDate))} UTC${state.alive ? '' : ` · died ${esc(state.diedOn || '?')}`}</text>`;

  const body =
    `<text class="mono brand" x="26" y="32">${esc(PET_NAME)}</text>` +
    `<text class="mono sub" x="${26 + PET_NAME.length * 13}" y="32">// THE TAMAGOTCHI OF SHAME</text>` +
    `<line x1="26" y1="44" x2="${W - 26}" y2="44" stroke="${pal.accent}" stroke-opacity="0.28"/>` +
    `<rect x="30" y="262" width="176" height="4" rx="2" fill="${pal.ground}"/>` +
    spriteGroup + bubble + meter + statBlock + footer;

  return svgDoc({
    w: W, h: H, pal, id: 'pet', style,
    title: `${PET_NAME} is ${dead ? 'dead' : mood} — ${ctx.days} day(s) since the last commit, ${state.resurrections} resurrection(s)`,
    desc: ctx.line,
    body,
  });
}

// ---------------------------------------------------------------------------
// Component: banner
// ---------------------------------------------------------------------------

function renderBanner(state, ctx) {
  const pal = PALETTES[state.mood];
  const dead = state.mood === 'deceased';
  const p = ctx.profile || {};
  const name = (p.name || p.login || 'developer').toUpperCase();
  const where = [p.company, p.location].filter(Boolean).join(' · ');

  // A row of pixels that thins out as the pet declines — the header carries the
  // mood even when the pet card is not on screen.
  const pips = 28;
  const lit = dead ? 0 : Math.max(1, Math.round(pips * (1 - state.hunger / 100)));
  const pipRow = Array.from({ length: pips }, (_, i) =>
    `<rect x="${560 + i * 9}" y="78" width="6" height="6" fill="${i < lit ? pal.accent : pal.dim}" opacity="${i < lit ? 1 : 0.25}"/>`).join('');

  const body =
    `<text class="mono big" x="34" y="56">${esc(name)}</text>` +
    `<text class="mono dim" x="34" y="78">${esc(where || (p.login ? `@${p.login}` : ''))}</text>` +
    `<text class="mono lbl" x="34" y="98">${esc(TAGLINES[state.mood].toUpperCase())}</text>` +
    `<text class="mono lbl" x="806" y="42" text-anchor="end">PET STATUS</text>` +
    `<text class="mono med${dead ? '' : ' pulse'}" x="806" y="64" text-anchor="end" fill="${pal.accent}">${state.mood.toUpperCase()}</text>` +
    pipRow;

  return svgDoc({
    w: 840, h: 120, pal, id: 'ban', style: baseStyle(pal, dead),
    title: `${p.name || p.login || 'profile'} — ${TAGLINES[state.mood]}`,
    desc: `Pet status: ${state.mood}`,
    body,
  });
}

// ---------------------------------------------------------------------------
// Component: streak
// ---------------------------------------------------------------------------

function renderStreak(state, ctx) {
  const pal = PALETTES[state.mood];
  const dead = state.mood === 'deceased';
  const s = ctx.streak || {};
  const spark = (s.spark || []).slice(-30);
  const max = Math.max(1, ...spark);

  const BW = 9, GAP = 2, BX = 24, BY = 152, BH = 30;
  const bars = spark.map((c, i) => {
    const h = c ? Math.max(3, Math.round((c / max) * BH)) : 2;
    const fill = c ? pal.accent : pal.dim;
    return `<rect x="${BX + i * (BW + GAP)}" y="${BY - h}" width="${BW}" height="${h}" rx="1.5" fill="${fill}" opacity="${c ? 1 : 0.3}"/>`;
  }).join('');

  const body =
    `<text class="mono lbl" x="24" y="30">CURRENT STREAK</text>` +
    `<text class="mono big${dead ? '' : ' pulse'}" x="24" y="68" fill="${pal.accent}">${s.current || 0}</text>` +
    `<text class="mono dim" x="${24 + String(s.current || 0).length * 19 + 8}" y="68">days</text>` +
    `<text class="mono lbl" x="250" y="30">LONGEST</text>` +
    `<text class="mono med" x="250" y="52">${s.longest || 0} days</text>` +
    `<text class="mono lbl" x="250" y="76">ACTIVE DAYS</text>` +
    `<text class="mono med" x="250" y="98">${s.activeDays || 0}</text>` +
    `<text class="mono lbl" x="24" y="100">LAST 30 DAYS</text>` +
    bars +
    `<text class="mono dim" x="24" y="170" font-size="9.5">${esc(dead ? 'streak irrelevant. host deceased.' : `${s.totalContributions || 0} contributions this year`)}</text>`;

  return svgDoc({
    w: 420, h: 180, pal, id: 'stk', style: baseStyle(pal, dead),
    title: `Current streak ${s.current || 0} days, longest ${s.longest || 0} days`,
    desc: `${s.activeDays || 0} active days in the last year`,
    body,
  });
}

// ---------------------------------------------------------------------------
// Component: stats
// ---------------------------------------------------------------------------

function renderStats(state, ctx) {
  const pal = PALETTES[state.mood];
  const dead = state.mood === 'deceased';
  const p = ctx.profile || {};
  const s = ctx.streak || {};

  const cells = [
    ['PUBLIC REPOS', p.publicRepos || 0],
    ['STARS EARNED', p.stars || 0],
    ['FOLLOWERS', p.followers || 0],
    ['CONTRIBUTIONS', s.totalContributions || 0],
  ];
  const grid = cells.map(([k, v], i) => {
    const x = 24 + (i % 2) * 200;
    const y = 66 + Math.floor(i / 2) * 62; // clears the rule at y=36
    return `<text class="mono lbl" x="${x}" y="${y - 20}">${esc(k)}</text>` +
           `<text class="mono" x="${x}" y="${y + 4}" font-size="26" font-weight="700" fill="${pal.ink}">${v}</text>`;
  }).join('');

  const body =
    `<text class="mono lbl" x="24" y="26">BY THE NUMBERS</text>` +
    `<line x1="24" y1="36" x2="396" y2="36" stroke="${pal.accent}" stroke-opacity="0.25"/>` +
    grid +
    `<text class="mono dim" x="24" y="168" font-size="9.5">${esc(dead ? 'no longer accepting new numbers' : 'public repos only · updated daily')}</text>`;

  return svgDoc({
    w: 420, h: 180, pal, id: 'sts', style: baseStyle(pal, dead),
    title: `${p.publicRepos || 0} public repos, ${p.stars || 0} stars, ${p.followers || 0} followers`,
    desc: 'Profile statistics',
    body,
  });
}

// ---------------------------------------------------------------------------
// Component: languages
// ---------------------------------------------------------------------------

const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Go: '#00ADD8',
  Kotlin: '#A97BFF', Java: '#b07219', 'C++': '#f34b7d', C: '#555555', PHP: '#4F5D95',
  HTML: '#e34c26', CSS: '#563d7c', Rust: '#dea584', Ruby: '#701516', Shell: '#89e051',
  Dart: '#00B4AB', Swift: '#F05138', Vue: '#41b883', Svelte: '#ff3e00',
};

function renderLanguages(state, ctx) {
  const pal = PALETTES[state.mood];
  const dead = state.mood === 'deceased';
  const langs = ((ctx.profile && ctx.profile.languages) || []).slice(0, 5);
  const total = langs.reduce((a, [, n]) => a + n, 0) || 1;

  // Language colours desaturate along with the pet — this is the clearest signal
  // that the whole README is downstream of one state file.
  const colourFor = (name, i) =>
    desaturate(LANG_COLORS[name] || [pal.accent, pal.dim, pal.ink][i % 3], pal.sat);

  let x = 24;
  const segs = langs.map(([name, n], i) => {
    const w = Math.max(6, Math.round((n / total) * 372));
    const r = `<rect x="${x}" y="52" width="${w}" height="14" fill="${colourFor(name, i)}" rx="${i === 0 || i === langs.length - 1 ? 3 : 0}"/>`;
    x += w + 2;
    return r;
  }).join('');

  const legend = langs.map(([name, n], i) => {
    const col = 24 + (i % 2) * 200;
    const row = 96 + Math.floor(i / 2) * 22;
    return `<rect x="${col}" y="${row - 8}" width="9" height="9" rx="2" fill="${colourFor(name, i)}"/>` +
           `<text class="mono sm" x="${col + 15}" y="${row}">${esc(name)}</text>` +
           `<text class="mono dim" x="${col + 15 + name.length * 6.6 + 8}" y="${row}">${Math.round((n / total) * 100)}%</text>`;
  }).join('');

  const body =
    `<text class="mono lbl" x="24" y="26">MOST USED LANGUAGES</text>` +
    `<line x1="24" y1="36" x2="396" y2="36" stroke="${pal.accent}" stroke-opacity="0.25"/>` +
    (langs.length ? segs + legend : `<text class="mono dim" x="24" y="60">no language data</text>`) +
    `<text class="mono dim" x="24" y="168" font-size="9.5">by primary language across ${(ctx.profile && ctx.profile.publicRepos) || 0} public repos</text>`;

  return svgDoc({
    w: 420, h: 180, pal, id: 'lng', style: baseStyle(pal, dead),
    title: `Top languages: ${langs.map(([n]) => n).join(', ') || 'none'}`,
    desc: 'Language distribution across public repositories',
    body,
  });
}

// ---------------------------------------------------------------------------
// Component: divider
// ---------------------------------------------------------------------------

function renderDivider(state) {
  const pal = PALETTES[state.mood];
  const dead = state.mood === 'deceased';
  const style = `
    .mono{font-family:${FONT}}
    ${dead ? '' : `.dash{animation:slide 6s linear infinite}
    @keyframes slide{to{transform:translateX(24px)}}`}`;

  // A dashed rule that drifts while the pet lives and freezes when it does not.
  const body =
    `<g class="dash"><line x1="-24" y1="6" x2="864" y2="6" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="6 18" stroke-linecap="round"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 12" width="840" height="12" role="img" aria-label="section divider">
<style>${style}
</style>
<rect width="840" height="12" fill="none"/>
${body}
</svg>
`;
}

const COMPONENTS = {
  banner: renderBanner,
  pet: renderPet,
  streak: renderStreak,
  stats: renderStats,
  languages: renderLanguages,
  divider: renderDivider,
};

// ---------------------------------------------------------------------------
// README caption
// ---------------------------------------------------------------------------

const CAPTION_START = '<!-- pet:caption -->';
const CAPTION_END = '<!-- /pet:caption -->';

function captionFor(state, days) {
  const n = state.resurrections;
  const scoreboard =
    n === 0 ? (state.alive ? 'Never died. Yet.' : 'First death. It was avoidable.') :
    n === 1 ? 'Resurrected once. It remembers.' :
    `Resurrected ${n} times. It remembers.`;
  const status = state.alive
    ? `**${state.mood}** · ${days} day${days === 1 ? '' : 's'} since the last commit`
    : `**deceased** · died ${state.diedOn} · awaiting an apology`;
  return `${status} · _${scoreboard}_`;
}

function updateReadmeCaption(state, days) {
  let md;
  try { md = fs.readFileSync(README_PATH, 'utf8'); } catch (_) { return false; }
  const start = md.indexOf(CAPTION_START);
  const end = md.indexOf(CAPTION_END);
  if (start === -1 || end === -1 || end < start) return false;
  const next = md.slice(0, start + CAPTION_START.length) + `\n${captionFor(state, days)}\n` + md.slice(end);
  if (next === md) return false;
  fs.writeFileSync(README_PATH, next);
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const now = new Date();
  const state = loadState(now);

  if (new Date(state.lastCommitDate).getTime() > now.getTime()) {
    state.lastCommitDate = now.toISOString();
  }

  let days;
  let apology = OPTS.apology;
  let source = 'state';
  let contrib = null;
  let profile = null;

  if (OPTS.simulateDays !== null && OPTS.simulateDays !== undefined) {
    days = parseInt(OPTS.simulateDays, 10);
    if (Number.isNaN(days)) throw new Error(`--days expects a number, got "${OPTS.simulateDays}"`);
    state.lastCommitDate = new Date(startOfDayUTC(now) - days * DAY_MS).toISOString();
    source = 'simulated';
  } else if (OPTS.offline) {
    days = daysBetween(state.lastCommitDate, now);
    source = 'offline';
  } else {
    const username = resolveUsername();
    if (!username) throw new Error('cannot determine username — pass --user <login> or set PET_USERNAME');

    const activity = await fetchActivity(username);
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

  // --mood is a preview override: render as if the pet were in that state
  // without letting it touch the real saved state.
  const renderState = OPTS.forceMood ? Object.assign({}, state, { mood: OPTS.forceMood, alive: OPTS.forceMood !== 'deceased' }) : state;
  const tier = revived ? 'revived' : renderState.mood;
  const line = pickLine(tier, renderState, now);
  const ctx = { days, line, revived, streak, profile: profileData };

  const names = OPTS.only ? [OPTS.only] : Object.keys(COMPONENTS);
  for (const n of names) if (!COMPONENTS[n]) throw new Error(`unknown component "${n}" (have: ${Object.keys(COMPONENTS).join(', ')})`);
  const rendered = names.map((n) => [n, COMPONENTS[n](renderState, ctx)]);

  console.log(
    `${PET_NAME}: mood=${renderState.mood} days=${days} hunger=${renderState.hunger} alive=${renderState.alive}` +
    `${revived ? ' REVIVED' : ''} resurrections=${state.resurrections} (source: ${source})`);
  console.log(`  "${line}"`);
  if (streak.current !== undefined) {
    console.log(`  streak=${streak.current} longest=${streak.longest} contributions=${streak.totalContributions || 0}`);
  }

  if (OPTS.dryRun) {
    console.log('\n-- dry run, nothing written --');
    console.log(JSON.stringify(state, null, 2));
    rendered.forEach(([n, svg]) => console.log(`  ${n}.svg would be ${svg.length} bytes`));
    console.log(`README caption would be: ${captionFor(state, days)}`);
    return;
  }

  fs.mkdirSync(OPTS.outDir, { recursive: true });
  const written = [];
  for (const [n, svg] of rendered) {
    fs.writeFileSync(path.join(OPTS.outDir, `${n}.svg`), svg);
    written.push(`${n}.svg`);
  }

  // A preview render (--outdir elsewhere, or --mood) must not rewrite real state.
  if (path.resolve(OPTS.outDir) === ASSETS_DIR && !OPTS.forceMood) {
    fs.writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
    written.push('pet-state.json');
    if (updateReadmeCaption(state, days)) written.push('README.md');
  }
  console.log(`  wrote ${written.join(', ')}`);
}

main().catch((err) => {
  console.error(`x ${err.message}`);
  process.exit(1);
});
