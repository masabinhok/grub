'use strict';

/**
 * Lurker accounting.
 *
 * The traffic API only ever returns a rolling 14-day window, so a running total
 * has to be accumulated locally: each run overwrites the days it can still see
 * (they are authoritative and can revise upward during the day) and leaves
 * everything older untouched. Nothing is ever deleted, which is what makes the
 * total monotonic.
 *
 * Two honest limitations, both surfaced on the card:
 *   - `uniques` is unique-per-day, so one person visiting on three days counts
 *     three times. It is a lurker index, not a headcount.
 *   - There is no backfill. The total starts at zero on first run, whatever the
 *     repo's actual history.
 *
 * It also counts visitors to the repo, not views of a profile README — those are
 * not measurable at all, since GitHub serves the image through a caching proxy.
 */

const { isoDate } = require('./dates');

/**
 * Fold an API response into the stored map, keyed by day. Returns a new map.
 * `field` picks which number to keep: `uniques` (one per visitor per day, what
 * the counter card calls lurkers) or `count` (every hit, what the eye watches).
 */
function mergeTraffic(existingDaily, views, field = 'uniques') {
  const daily = Object.assign({}, existingDaily || {});
  for (const v of views || []) {
    if (!v || !v.timestamp) continue;
    const day = isoDate(v.timestamp);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    daily[day] = Math.max(0, Number(v[field]) || 0);
  }
  return daily;
}

const trafficTotal = (daily) =>
  Object.values(daily || {}).reduce((a, n) => a + (Number(n) || 0), 0);

/** Earliest day we have a sample for, or null if we have never seen one. */
function firstSampleDate(daily) {
  const days = Object.keys(daily || {}).sort();
  return days.length ? days[0] : null;
}

module.exports = { mergeTraffic, trafficTotal, firstSampleDate };
