'use strict';

/**
 * Dates. Two different kinds live here, and mixing them up is the bug this file
 * exists to prevent.
 *
 * `isoDate` is UTC and stays UTC. It labels data that came from GitHub — traffic
 * buckets, contribution-calendar days — and those are GitHub's own days. Relabel
 * them in another zone and the stored keys stop lining up with the API's.
 *
 * Everything else is about *your* days. Whether the creature has been fed is a
 * question about the day you are living in, so it is answered in your timezone: a
 * commit pushed at half past midnight in Kathmandu belongs to the day that has
 * just started, not to the UTC day still five and three quarter hours behind.
 * `timezone` in grub.config.json is what sets that.
 */

const DAY_MS = 86400000;

const startOfDayUTC = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

// Intl formatters are expensive to build and the same one gets asked for on
// every call, so they are made once each.
const FORMATTERS = new Map();
const WARNED = new Set();

function formatterFor(tz) {
  if (FORMATTERS.has(tz)) return FORMATTERS.get(tz);
  let fmt;
  try {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch (_) {
    // A typo in a cosmetic setting must not take the whole run down.
    if (!WARNED.has(tz)) {
      console.warn(`! unknown timezone "${tz}" — using UTC. Expected an IANA name, e.g. "Asia/Kathmandu".`);
      WARNED.add(tz);
    }
    fmt = formatterFor('UTC');
  }
  FORMATTERS.set(tz, fmt);
  return fmt;
}

/** Wall-clock fields at instant `d`, as they read in `tz`. */
function partsIn(d, tz) {
  const out = {};
  for (const p of formatterFor(tz).formatToParts(new Date(d))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  if (out.hour === 24) out.hour = 0;   // a legal rendering of midnight
  return out;
}

const pad = (n) => String(n).padStart(2, '0');

/** The calendar date at instant `d`, in `tz`. "YYYY-MM-DD". */
function localDate(d, tz = 'UTC') {
  const p = partsIn(d, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** A "YYYY-MM-DD" as a whole-day counter, so two of them can be subtracted. */
function dayIndex(isoDay) {
  const [y, m, d] = String(isoDay).split('-').map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

/**
 * Whole calendar days from `a` to `b`, counted in `tz`. Never negative — a commit
 * dated in the future reads as today rather than as a debt.
 */
function daysBetween(a, b, tz = 'UTC') {
  return Math.max(0, dayIndex(localDate(b, tz)) - dayIndex(localDate(a, tz)));
}

/** "YYYY-MM-DD" plus n days. Calendar arithmetic, so no DST can skew it. */
const addDays = (isoDay, n) => isoDate((dayIndex(isoDay) + n) * DAY_MS);

/** The instant local midnight happened, as a UTC timestamp. */
function startOfLocalDay(d, tz = 'UTC') {
  const date = new Date(d);
  const p = partsIn(date, tz);
  const asIfUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = asIfUTC - date.getTime();          // +5h45m for Kathmandu
  return Date.UTC(p.year, p.month - 1, p.day) - offset;
}

module.exports = {
  DAY_MS, startOfDayUTC, isoDate,
  localDate, dayIndex, daysBetween, addDays, startOfLocalDay,
};
