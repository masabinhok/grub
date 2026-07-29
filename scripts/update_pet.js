#!/usr/bin/env node
'use strict';

/**
 * GRUB — The Tamagotchi of Shame
 *
 * Reads pet-state.json, asks the GitHub API when you last committed, decays the
 * creature accordingly, and writes an animated SVG to assets/pet.svg.
 *
 * Zero dependencies. Node 18+ (needs global fetch). CommonJS so there is no
 * package.json and therefore no install step in CI.
 *
 * Usage:
 *   node scripts/update_pet.js                 # normal run (hits the API)
 *   node scripts/update_pet.js --dry-run       # print the summary, write nothing
 *   node scripts/update_pet.js --days 4        # pretend it has been 4 days (no API call)
 *   node scripts/update_pet.js --apology       # pretend the latest commit says "i'm sorry"
 *   node scripts/update_pet.js --offline       # skip the API, decay from stored state
 *   node scripts/update_pet.js --user octocat  # override the username
 *   node scripts/update_pet.js --out /tmp/x.svg
 *   node scripts/update_pet.js --include-private    # let private repos feed it
 *
 * Environment:
 *   PET_TOKEN            Classic PAT with `repo` scope. Needed for private work
 *                        to be visible. Falls back to GITHUB_TOKEN (public only).
 *   PET_INCLUDE_PRIVATE  "1" to count private contributions. See the comment on
 *                        fetchContributions for what this trades away.
 *   PET_USERNAME         GitHub login to track. Defaults to the repo owner in CI.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const STATE_PATH = path.join(ROOT, 'pet-state.json');
const SVG_PATH = path.join(ROOT, 'assets', 'pet.svg');
const README_PATH = path.join(ROOT, 'README.md');

const PET_NAME = 'GRUB';
const DEATH_THRESHOLD_DAYS = 5; // 5+ days with no commit and it is over
const APOLOGY = "i'm sorry";

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
  // Count private-repo work via the contribution calendar. Side effect: the
  // calendar also counts issues/PRs/reviews, not just commits.
  includePrivate: hasFlag('include-private') || process.env.PET_INCLUDE_PRIVATE === '1',
  out: getOpt('out', SVG_PATH),
  help: hasFlag('help') || hasFlag('h'),
};

if (OPTS.help) {
  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1].replace(/^ \* ?/gm, ''));
  process.exit(0);
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
//   x body   d body shadow   w eye white   b pupil   m mouth   t antenna
//   s stone  g ground
// ---------------------------------------------------------------------------

const SPRITES = {
  thriving: [
    '.......tt.......',
    '.......tt.......',
    '....xxxxxxxx....',
    '..xxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxx.',
    '.xxwwwxxxxwwwxx.',
    '.xxwbwxxxxwbwxx.',
    '.xxwwwxxxxwwwxx.',
    '.xxxxxxxxxxxxxx.',
    '.xxxxmmmmmmxxxx.',
    '.xxxxxmmmmxxxxx.',
    '.xxxxxxxxxxxxxx.',
    '..xxxxxxxxxxxx..',
    '...xxxxxxxxxx...',
    '...xx......xx...',
    '..xxx......xxx..',
  ],
  hungry: [
    '......tt........',
    '.......t........',
    '.....xxxxxx.....',
    '..xxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxx.',
    '.xxwwwxxxxwwwxx.',
    '.xxbwwxxxxbwwxx.',
    '.xxwwwxxxxwwwxx.',
    '.xxxxxxxxxxxxxx.',
    '.xxxxxxxxxxxxxx.',
    '.xxxxxmmmmxxxxx.',
    '.xxxxxxxxxxxxxx.',
    '..xxxxxxxxxxxx..',
    '...xxxxxxxxxx...',
    '...xx......xx...',
    '..xxx......xxx..',
  ],
  feral: [
    '................',
    '.....t..........',
    '.....xxxxxx.....',
    '...xxxxxxxxxx...',
    '..xxxxxxxxxxxx..',
    '..xwwwxxxxwwwx..',
    '..xwbwxxxxwbwx..',
    '..xwwwxxxxwwwx..',
    '..xxxxxxxxxxxx..',
    '..xxmxmxmxmxxx..',
    '..xxxmxmxmxxxx..',
    '..xdxxxxxxxxdx..',
    '..xdxxxxxxxxdx..',
    '...xxxxxxxxxx...',
    '...x........x...',
    '..xx........xx..',
  ],
  deceased: [
    '................',
    '....ssssssss....',
    '..ssssssssssss..',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    '.ssssssssssssss.',
    'gggggggggggggggg',
    'gggggggggggggggg',
    '................',
  ],
};

// Cheap insurance against a typo turning the sprite into modern art.
for (const [name, grid] of Object.entries(SPRITES)) {
  if (grid.length !== 16 || grid.some((r) => r.length !== 16)) {
    throw new Error(`sprite "${name}" is not 16x16`);
  }
}

const PALETTES = {
  thriving: {
    x: '#5fd99a', d: '#31a86e', w: '#ffffff', b: '#0d2018', m: '#ff6f8f', t: '#ffd24c',
    bg1: '#0d2018', bg2: '#173d2b', ink: '#e6fff2', dim: '#79c9a4', accent: '#5fd99a',
    ground: '#1f5c40',
  },
  hungry: {
    x: '#93ad78', d: '#61784c', w: '#efefe6', b: '#20250f', m: '#b06274', t: '#c2a244',
    bg1: '#171b12', bg2: '#252c1c', ink: '#dfe6cf', dim: '#94a37d', accent: '#93ad78',
    ground: '#3a4429',
  },
  feral: {
    x: '#8b8f86', d: '#565a52', w: '#e9e9e5', b: '#c02626', m: '#a52a2a', t: '#6e6a4a',
    bg1: '#111110', bg2: '#1c1b19', ink: '#c8c8c0', dim: '#8a8a82', accent: '#a03030',
    ground: '#2a2a26',
  },
  deceased: {
    s: '#8d939b', g: '#2e2f33', d: '#5c6169',
    bg1: '#0a0a0b', bg2: '#141417', ink: '#9aa0a6', dim: '#6b7076', accent: '#6b7076',
    ground: '#2e2f33',
  },
};

// ---------------------------------------------------------------------------
// Copy — a few lines per tier so it does not repeat itself daily.
// Picked by (day-of-week + resurrections) so the rotation shifts every revival.
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

function pickLine(tier, state, now) {
  const pool = LINES[tier];
  const idx = (now.getUTCDay() + (state.resurrections || 0)) % pool.length;
  return pool[idx];
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

function resolveUsername() {
  if (OPTS.user) return OPTS.user;
  if (process.env.GITHUB_REPOSITORY_OWNER) return process.env.GITHUB_REPOSITORY_OWNER;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY.split('/')[0];
  try {
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = remote.match(/github\.com[:/]([^/]+)\//);
    if (m) return m[1];
  } catch (_) { /* not a git repo, or no remote */ }
  return null;
}

// PET_TOKEN is the opt-in PAT that can see private repos; GITHUB_TOKEN is the
// Action's built-in token, which only ever sees public activity.
const authToken = () => process.env.PET_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

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
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

// The bot commits back to this repo every run. Never let that count as food.
const isBotCommit = (msg, authorName) =>
  /\[skip ci\]/i.test(msg || '') ||
  /update pet state/i.test(msg || '') ||
  /github-actions(\[bot\])?/i.test(authorName || '');

const normalize = (msg) =>
  String(msg || '')
    .split('\n')[0]
    .toLowerCase()
    .replace(/[‘’'`]/g, '')      // straight + curly apostrophes and backticks
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

const APOLOGY_NORM = normalize(APOLOGY); // "im sorry"

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
      hasAnyRestrictedContributions
      restrictedContributionsCount
      commitContributionsByRepository(maxRepositories:100){
        repository{ nameWithOwner isPrivate }
        contributions(first:1, orderBy:{field:OCCURRED_AT, direction:DESC}){
          nodes{ occurredAt }
        }
      }
      contributionCalendar{
        weeks{ contributionDays{ date contributionCount } }
      }
    }
  }
}`;

/**
 * The contribution graph. Two sources with very different visibility:
 *
 *   commitContributionsByRepository — commits only, but PUBLIC REPOS ONLY.
 *     GitHub anonymises private contributions completely here: it will not name
 *     the repo or give you a date, no matter what scopes the token carries.
 *     Verified against a token with full `repo` scope: zero private repos, even
 *     when querying `viewer` rather than `user(login:)`.
 *
 *   contributionCalendar — per-day totals that DO include private work (as
 *     anonymous counts). This is the only way to date private activity, which
 *     makes it the only thing that can feed the pet on private repos.
 *
 * The catch: calendar days count every contribution type — commits to default
 * branches, PRs, issues, reviews — not just commits. Opting into private repos
 * therefore also loosens what counts as "feeding". That is a real trade and why
 * it sits behind PET_INCLUDE_PRIVATE rather than being the default.
 *
 * Also note contributions only ever count commits to DEFAULT branches, which is
 * why the public event feed is still queried in parallel — it sees any branch.
 */
async function fetchContributions(username, nowMs) {
  const to = new Date(nowMs).toISOString();
  const from = new Date(nowMs - 90 * DAY_MS).toISOString();
  const data = await ghGraphQL(CONTRIB_QUERY, { login: username, from, to });
  const cc = data && data.user && data.user.contributionsCollection;
  if (!cc) return null;

  const out = {
    commitLatest: null,
    calendarLatest: null,
    restricted: cc.restrictedContributionsCount || 0,
  };

  for (const entry of cc.commitContributionsByRepository || []) {
    const nodes = (entry.contributions && entry.contributions.nodes) || [];
    const occurredAt = nodes[0] && nodes[0].occurredAt;
    if (!occurredAt || !isSaneDate(occurredAt, nowMs)) continue;
    if (!out.commitLatest || new Date(occurredAt) > new Date(out.commitLatest)) {
      out.commitLatest = occurredAt;
    }
  }

  const weeks = (cc.contributionCalendar && cc.contributionCalendar.weeks) || [];
  for (const week of weeks) {
    for (const day of week.contributionDays || []) {
      if (!day.contributionCount) continue;
      const iso = `${day.date}T00:00:00.000Z`;
      if (!isSaneDate(iso, nowMs)) continue;
      if (!out.calendarLatest || new Date(iso) > new Date(out.calendarLatest)) {
        out.calendarLatest = iso;
      }
    }
  }

  return out;
}

/**
 * Merges every available source and takes the most recent credible timestamp.
 * No single source sees everything: contributions cover private repos but only
 * default branches; the event feed covers any branch but only public repos.
 */
async function fetchActivity(username) {
  const result = { lastCommitAt: null, apology: false, source: null };
  const sources = [];
  const nowMs = Date.now();

  const consider = (iso, label) => {
    if (!iso || !isSaneDate(iso, nowMs)) return;
    if (!sources.includes(label)) sources.push(label);
    if (!result.lastCommitAt || new Date(iso) > new Date(result.lastCommitAt)) {
      result.lastCommitAt = iso;
    }
  };

  try {
    const contrib = await fetchContributions(username, nowMs);
    if (contrib) {
      consider(contrib.commitLatest, 'contributions');

      if (OPTS.includePrivate) {
        consider(contrib.calendarLatest, 'calendar');
        console.log(`  counting private work: ${contrib.restricted} restricted contribution(s) in window`);

        // Silent-starvation guard. Private work is only visible to a token that
        // can see it: your own PAT, or GITHUB_TOKEN if (and only if) you enabled
        // "Include private contributions on my profile". Seeing zero restricted
        // contributions while private counting is ON almost always means the
        // token is blind rather than that you did nothing.
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
          'set PET_INCLUDE_PRIVATE=1 (and PET_TOKEN) to let them feed the pet',
        );
      }
    }
  } catch (err) {
    console.warn(`! contributions API failed: ${err.message}`);
  }

  try {
    const events = await gh(`/users/${encodeURIComponent(username)}/events/public?per_page=100`);
    const now = nowMs;
    for (const ev of events) {
      const when = new Date(ev.created_at).getTime();
      const commits = (ev.payload && ev.payload.commits) || [];

      if (!isSaneDate(ev.created_at, now)) continue;

      if (ev.type === 'PushEvent') {
        const real = commits.filter((c) => !isBotCommit(c.message, c.author && c.author.name));
        if (real.length) {
          consider(ev.created_at, 'events');
          // Only an apology from the last 48h counts — no reviving off old history.
          if (now - when < 2 * DAY_MS && real.some((c) => normalize(c.message) === APOLOGY_NORM)) {
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

  // Fallback: search API. Covers commits older than the ~90 day contributions
  // window, and repos whose activity never surfaced as a public event.
  try {
    const q = encodeURIComponent(`author:${username}`);
    // Over-fetch: the newest hits are the ones most likely to be future-dated junk.
    const data = await gh(`/search/commits?q=${q}&sort=author-date&order=desc&per_page=20`);
    const hit = (data.items || []).find(
      (i) =>
        !isBotCommit(i.commit.message, i.commit.author && i.commit.author.name) &&
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

/** Last resort / local testing: read the checked-out repo's HEAD message. */
function localHeadMessage() {
  try {
    return execSync('git log -1 --pretty=%B', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (_) {
    return '';
  }
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
// SVG rendering
// ---------------------------------------------------------------------------

const W = 540;
const H = 300;
const CELL = 9;
const SPRITE_X = 46;
const SPRITE_Y = 116;

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Merge horizontal runs of identical pixels into single rects. */
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

function renderSvg(state, ctx) {
  const mood = state.mood;
  const pal = PALETTES[mood];
  const dead = mood === 'deceased';
  const animated = !dead;
  const bubbleLines = wrap(ctx.line, 34);
  const bubbleH = 26 + bubbleLines.length * 19;

  // --- animation definitions -------------------------------------------------
  // Deceased gets none. Stillness is the punchline.
  const baseStyle = `
    .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace}
    .brand{font-size:17px;font-weight:700;letter-spacing:2px;fill:${pal.ink}}
    .sub{font-size:10px;letter-spacing:1px;fill:${pal.dim}}
    .say{font-size:12.5px;fill:${pal.ink}}
    .stat{font-size:11px;fill:${pal.dim}}
    .val{font-size:11px;fill:${pal.ink};font-weight:700}`;

  const style = dead
    ? `${baseStyle}
    .rip{font-size:21px;font-weight:700;letter-spacing:3px;fill:${pal.g}}
    .ripsub{font-size:9.5px;letter-spacing:1px;fill:${pal.g}}`
    : `${baseStyle}
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

  // --- idle motion via SMIL ---------------------------------------------------
  let spriteAnim = '';
  if (mood === 'thriving') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -7; 0 0" keyTimes="0;0.5;1" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" additive="sum"/>';
  } else if (mood === 'hungry') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="4.2s" repeatCount="indefinite" additive="sum"/>';
  } else if (mood === 'feral') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0;2 -1;-3 1;0 0;1 2;-1 0;0 0" dur="0.55s" repeatCount="indefinite" calcMode="discrete" additive="sum"/>';
  }

  // --- sprite -----------------------------------------------------------------
  const grid = SPRITES[mood];

  // Eye blocks live at cols 3-5 / 10-12, rows 5-7 in every living sprite.
  const eyeLids = animated
    ? `<rect class="lid" x="${3 * CELL}" y="${5 * CELL}" width="${3 * CELL}" height="${3 * CELL}" fill="${pal.x}"/>` +
      `<rect class="lid" x="${10 * CELL}" y="${5 * CELL}" width="${3 * CELL}" height="${3 * CELL}" fill="${pal.x}"/>`
    : '';

  // The stone spans y 9..117 inside the sprite group; keep every line inside it.
  const tombText = dead
    ? '<text class="mono rip" x="72" y="52" text-anchor="middle">R.I.P.</text>' +
      `<line x1="30" y1="62" x2="114" y2="62" stroke="${pal.g}" stroke-opacity="0.6"/>` +
      `<text class="mono ripsub" x="72" y="80" text-anchor="middle">${esc(PET_NAME)}</text>` +
      `<text class="mono ripsub" x="72" y="97" text-anchor="middle">${esc(state.diedOn || isoDate(Date.now()))}</text>` +
      '<text class="mono ripsub" x="72" y="112" text-anchor="middle">STARVED</text>'
    : '';

  // Two glitch layers: one CSS-driven, one SMIL-driven, so the effect survives
  // renderers that support only one of the two.
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
        .map((a) => `<rect x="-40" y="70" width="224" height="4" fill="${pal.t}" transform="rotate(${a} 72 72)"/>`)
        .join('')}</g>` +
      '<rect class="flash" x="-60" y="-60" width="264" height="264" fill="#ffffff" opacity="0"/>'
    : '';

  const spriteGroup =
    `<g transform="translate(${SPRITE_X} ${SPRITE_Y})">` +
      `<g${mood === 'feral' ? ' class="shell"' : ''}>` +
        '<g>' + spriteAnim +
          rays +
          pixelRects(grid, pal) +
          eyeLids +
          tombText +
          glitch +
          sparks +
        '</g>' +
      '</g>' +
    '</g>';

  // --- speech bubble ----------------------------------------------------------
  // Right column rhythm. BY + max bubble height (3 lines = 83) + tail (21) = 158,
  // which is what the meter below has to clear.
  const BX = 222;
  const BY = 54;
  const BW = 292;
  const bubble =
    `<g${animated ? ' class="bubble"' : ''}>` +
    `<rect x="${BX}" y="${BY}" width="${BW}" height="${bubbleH}" rx="10" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    // Tail hangs off the bubble's bottom-left corner, gesturing at the creature.
    `<path d="M${BX + 22} ${BY + bubbleH} L${BX + 2} ${BY + bubbleH + 21} L${BX + 54} ${BY + bubbleH} Z" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<rect x="${BX + 24}" y="${BY + bubbleH - 2}" width="28" height="4" fill="${pal.bg1}"/>` +
    bubbleLines
      .map((l, i) => `<text class="mono say" x="${BX + 16}" y="${BY + 27 + i * 19}">${esc(l)}</text>`)
      .join('') +
    '</g>';

  // --- hunger meter -----------------------------------------------------------
  const MX = 222;
  const MY = 186;
  const MW = 200;
  const filled = Math.round((state.hunger / 100) * MW);
  const meter =
    `<text class="mono stat" x="${MX}" y="${MY - 6}">HUNGER</text>` +
    `<rect x="${MX}" y="${MY}" width="${MW}" height="10" rx="3" fill="${pal.bg1}" stroke="${pal.dim}" stroke-opacity="0.4"/>` +
    (filled > 2
      ? `<rect${animated && state.hunger >= 60 ? ' class="meter"' : ''} x="${MX + 1}" y="${MY + 1}" width="${filled - 2}" height="8" rx="2" fill="${dead ? pal.dim : pal.accent}"/>`
      : '') +
    `<text class="mono val" x="${MX + MW + 10}" y="${MY + 9}">${state.hunger}%</text>`;

  // --- stat block (baked into the image, not just the caption) ----------------
  const stats = [
    ['DAYS SINCE COMMIT', String(ctx.days)],
    ['MOOD', mood.toUpperCase()],
    ['RESURRECTIONS', String(state.resurrections)],
  ];
  const statBlock = stats
    .map(([k, v], i) =>
      `<text class="mono stat" x="${MX}" y="${214 + i * 19}">${esc(k)}</text>` +
      `<text class="mono val" x="${MX + 180}" y="${214 + i * 19}">${esc(v)}</text>`)
    .join('');

  const footer =
    `<text class="mono stat" x="${MX}" y="277" opacity="0.7">checked ${esc(isoDate(state.lastCheckedDate))} UTC` +
    `${state.alive ? '' : ` · died ${esc(state.diedOn || '?')}`}</text>`;

  const title = `${PET_NAME} is ${dead ? 'dead' : mood} — ${ctx.days} day(s) since the last commit, ${state.resurrections} resurrection(s)`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="petTitle petDesc">
<title id="petTitle">${esc(title)}</title>
<desc id="petDesc">${esc(ctx.line)}</desc>
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${pal.bg2}"/><stop offset="1" stop-color="${pal.bg1}"/>
</linearGradient>
</defs>
<style>${style}
</style>
<rect width="${W}" height="${H}" rx="14" fill="url(#bg)"/>
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="13.5" fill="none" stroke="${pal.accent}" stroke-opacity="0.35"/>
<text class="mono brand" x="26" y="32">${esc(PET_NAME)}</text>
<text class="mono sub" x="${26 + PET_NAME.length * 13}" y="32">// THE TAMAGOTCHI OF SHAME</text>
<line x1="26" y1="44" x2="${W - 26}" y2="44" stroke="${pal.accent}" stroke-opacity="0.28"/>
<rect x="30" y="262" width="176" height="4" rx="2" fill="${pal.ground}"/>
${spriteGroup}
${bubble}
${meter}
${statBlock}
${footer}
</svg>
`;
}

// ---------------------------------------------------------------------------
// README caption — rewritten in place between the marker comments so the
// resurrection count is public in text, not only baked into the image.
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
  try {
    md = fs.readFileSync(README_PATH, 'utf8');
  } catch (_) {
    return false; // no README, nothing to do
  }
  const start = md.indexOf(CAPTION_START);
  const end = md.indexOf(CAPTION_END);
  if (start === -1 || end === -1 || end < start) return false;

  const next =
    md.slice(0, start + CAPTION_START.length) +
    `\n${captionFor(state, days)}\n` +
    md.slice(end);
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

  // Defensive: a state file already poisoned with a future date would make the
  // pet immortal. The clock never runs ahead of now.
  if (new Date(state.lastCommitDate).getTime() > now.getTime()) {
    state.lastCommitDate = now.toISOString();
  }

  let days;
  let apology = OPTS.apology;
  let source = 'state';

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
    if (activity.lastCommitAt) {
      // Never move the clock backwards; the feed can lag behind reality.
      if (new Date(activity.lastCommitAt) > new Date(state.lastCommitDate)) {
        state.lastCommitDate = activity.lastCommitAt;
      }
      apology = apology || activity.apology;
      source = activity.source;
    } else {
      // API outage: do not starve the pet over an infrastructure problem.
      console.warn('! no activity data returned — decaying from stored state only');
      source = 'frozen';
    }
    days = daysBetween(state.lastCommitDate, now);

    if (!apology && normalize(localHeadMessage()) === APOLOGY_NORM) apology = true;
  }

  let revived = false;

  if (!state.alive) {
    // Dead pets do not decay and do not change — except by apology.
    if (apology) {
      state.alive = true;
      state.diedOn = null;
      state.hunger = 0;
      state.mood = 'thriving';
      state.resurrections += 1;
      state.lastCommitDate = now.toISOString();
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
      // The date it actually crossed the line, not the date CI noticed.
      state.diedOn = isoDate(startOfDayUTC(new Date(state.lastCommitDate)) + DEATH_THRESHOLD_DAYS * DAY_MS);
      state.hunger = 100;
    }
  }

  state.lastCheckedDate = now.toISOString();

  const tier = revived ? 'revived' : state.mood;
  const line = pickLine(tier, state, now);
  const svg = renderSvg(state, { days, line, revived });

  console.log(
    `${PET_NAME}: mood=${state.mood} days=${days} hunger=${state.hunger} alive=${state.alive}` +
    `${revived ? ' REVIVED' : ''} resurrections=${state.resurrections} (source: ${source})`,
  );
  console.log(`  "${line}"`);

  if (OPTS.dryRun) {
    console.log('\n-- dry run, nothing written --');
    console.log('pet-state.json would become:');
    console.log(JSON.stringify(state, null, 2));
    console.log(`assets/pet.svg would be ${svg.length} bytes`);
    console.log(`README caption would be: ${captionFor(state, days)}`);
    return;
  }

  fs.mkdirSync(path.dirname(OPTS.out), { recursive: true });
  fs.writeFileSync(OPTS.out, svg);

  // --out means "preview somewhere else": leave the real state and README alone.
  const written = [path.relative(ROOT, path.resolve(OPTS.out))];
  if (path.resolve(OPTS.out) === SVG_PATH) {
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
