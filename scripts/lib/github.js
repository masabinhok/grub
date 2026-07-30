'use strict';

/** Everything that talks to GitHub, plus the one thing that talks to local git. */

const { execSync } = require('child_process');
const { ROOT, APOLOGY } = require('./constants');
const { DAY_MS, isoDate } = require('./dates');

const authToken = () => process.env.PET_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

/**
 * Who are we tracking? Explicit flag, then config, then whatever CI tells us,
 * then the git remote.
 */
function resolveUsername({ user = null, configUsername = null } = {}) {
  if (user) return user;
  if (configUsername) return configUsername;
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

/**
 * Which repo's traffic are we counting? "owner/name", from config, then CI, then
 * the git remote.
 */
function resolveRepo({ repo = null } = {}) {
  if (repo) return repo;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  try {
    const remote = execSync('git config --get remote.origin.url', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    const m = remote.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\s*$/);
    if (m) return `${m[1]}/${m[2]}`;
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

async function fetchActivity(username, { includePrivate = false } = {}) {
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

      if (includePrivate) {
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

/**
 * Repo traffic. Unlike everything else here this endpoint needs *push* access —
 * a classic PAT with `repo` scope, or a fine-grained one with Administration:
 * read. Without it the call 403s, which the caller treats as "reuse the last
 * known total" rather than an error.
 */
async function fetchTraffic(nameWithOwner) {
  const [owner, repo] = String(nameWithOwner).split('/');
  if (!owner || !repo) throw new Error(`cannot parse repo "${nameWithOwner}"`);
  const data = await gh(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/traffic/views?per=day`,
  );
  return (data && data.views) || [];
}

function localHeadMessage() {
  try {
    return execSync('git log -1 --pretty=%B', { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (_) { return ''; }
}

module.exports = {
  authToken,
  resolveUsername,
  resolveRepo,
  fetchTraffic,
  gh,
  ghGraphQL,
  isBotCommit,
  normalize,
  APOLOGY_NORM,
  isSaneDate,
  fetchContributions,
  computeStreaks,
  fetchProfileData,
  fetchActivity,
  localHeadMessage,
};
