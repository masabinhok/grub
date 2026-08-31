#!/usr/bin/env node
'use strict';

/**
 * Folds the Worker's /stats.json into views.json, which is committed.
 *
 * The Durable Object is the live counter; this file is the memory. A DO can be
 * wiped by a bad migration, a deleted Worker or a moved account, and the whole
 * point of a view counter is that the number only ever goes up. So the history
 * lives in git, in the same spirit as pet-state.json, and the Worker is treated
 * as a source that might reset to zero tomorrow.
 *
 * Merge rules, in one place because they are the entire file:
 *
 *   - today's bucket is still filling, so it is always overwritten
 *   - a past day that is already recorded takes max(committed, fetched). It can
 *     never shrink, which is what makes a DO reset survive as a plateau in the
 *     history rather than a hole in it
 *   - a past day the Worker no longer knows about is kept as-is
 *   - `total` is the sum of the merged days, not the Worker's total. After a
 *     reset those two disagree, and the committed history is the one to trust
 *
 * Days are UTC buckets, matching the Worker (counter/src/counter.js) and the
 * `isoDate` convention in lib/dates.js: they label data that came from
 * somewhere else, so they stay in that somewhere else's clock.
 *
 * Usage:  VIEWS_URL=https://grub-views.example.workers.dev node scripts/merge_views.js
 */

const fs = require('fs');
const { VIEWS_PATH } = require('./lib/constants');

const isoDay = (d = new Date()) => d.toISOString().slice(0, 10);

function emptyHistory() {
  return { since: null, updatedAt: null, total: 0, days: {}, worker: null };
}

function loadHistory() {
  try {
    return Object.assign(emptyHistory(), JSON.parse(fs.readFileSync(VIEWS_PATH, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Refuse rather than silently starting over — a parse error on a file whose
      // only job is to not lose numbers is worth a human looking at it.
      console.error(`! views.json is unreadable (${err.message}). Fix or delete it; refusing to overwrite.`);
      process.exit(1);
    }
    return emptyHistory();
  }
}

async function fetchStats(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'grub-views-history' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const stats = await res.json();
  if (!stats || typeof stats !== 'object' || typeof stats.days !== 'object' || !stats.days) {
    throw new Error('response has no days object');
  }
  return stats;
}

function merge(history, stats, today) {
  const days = { ...history.days };
  let changed = false;

  for (const [day, raw] of Object.entries(stats.days)) {
    // The Worker is a remote source; do not let a malformed key or a negative
    // number into a file that gets committed and later charted.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const count = Math.max(0, Math.floor(Number(raw) || 0));
    const known = days[day];
    const next = day === today || known === undefined ? count : Math.max(known, count);
    if (next !== known) { days[day] = next; changed = true; }
  }

  const total = Object.values(days).reduce((a, b) => a + b, 0);
  // Keep the earliest `since` ever seen: a DO reset issues a new, later one.
  const since = history.since && (!stats.since || history.since < stats.since)
    ? history.since
    : (stats.since || history.since);

  const worker = {
    total: Math.max(0, Math.floor(Number(stats.total) || 0)),
    rejected: Math.max(0, Math.floor(Number(stats.rejected) || 0)),
    since: stats.since || null,
  };

  if (since !== history.since) changed = true;
  if (JSON.stringify(worker) !== JSON.stringify(history.worker)) changed = true;

  return { changed, next: { since, updatedAt: null, total, days, worker } };
}

async function main() {
  const url = (process.env.VIEWS_URL || '').trim();
  if (!url) {
    console.error('! VIEWS_URL is not set. Point it at the Worker, e.g.');
    console.error('    VIEWS_URL=https://grub-views.<subdomain>.workers.dev/stats.json');
    process.exit(1);
  }
  const statsUrl = /\/stats\.json$/.test(url) ? url : `${url.replace(/\/$/, '')}/stats.json`;

  const history = loadHistory();
  const stats = await fetchStats(statsUrl);
  const today = isoDay();
  const { changed, next } = merge(history, stats, today);

  if (!changed) {
    console.log(`views.json unchanged — ${next.total} views across ${Object.keys(next.days).length} days.`);
    return;
  }

  // Only stamped when something actually moved, so the timestamp alone can never
  // be the reason a commit happens.
  next.updatedAt = new Date().toISOString();
  fs.writeFileSync(VIEWS_PATH, `${JSON.stringify(next, null, 2)}\n`);

  const drift = next.total - next.worker.total;
  console.log(`views.json updated — ${next.total} views across ${Object.keys(next.days).length} days ` +
    `(today ${next.days[today] || 0}, worker reports ${next.worker.total}, ${next.worker.rejected} rejected).`);
  if (drift > 0) {
    console.log(`  note: history is ${drift} ahead of the Worker — it was probably reset. History wins.`);
  }
}

main().catch((err) => {
  console.error(`! could not update views.json: ${err.message}`);
  process.exit(1);
});
