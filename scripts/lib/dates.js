'use strict';

/** Date helpers — everything is UTC, whole days. */

const DAY_MS = 86400000;

const startOfDayUTC = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
const daysBetween = (a, b) =>
  Math.max(0, Math.round((startOfDayUTC(new Date(b)) - startOfDayUTC(new Date(a))) / DAY_MS));

module.exports = { DAY_MS, startOfDayUTC, isoDate, daysBetween };
