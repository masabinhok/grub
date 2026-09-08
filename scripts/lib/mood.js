'use strict';

const { DEATH_THRESHOLD_DAYS } = require('./constants');

/**
 * Mood and hunger, read off *missed* days — whole calendar days that came and
 * went in the tracked timezone with nothing committed in them. `daysMissed` in
 * lib/dates.js does the counting; the day the last commit landed in is not one
 * of them, and neither is the day currently in progress.
 *
 * One number, one meaning: what these thresholds are read against is exactly
 * what the card prints. 0 is up to date, 1 is one whole day gone by untouched,
 * and DEATH_THRESHOLD_DAYS of them is fatal.
 */
function moodForDays(missed) {
  if (missed >= DEATH_THRESHOLD_DAYS) return 'deceased';
  if (missed >= 3) return 'feral';
  if (missed >= 1) return 'hungry';
  return 'thriving';
}

const hungerForDays = (missed) =>
  Math.min(100, Math.round((Math.max(0, missed) / DEATH_THRESHOLD_DAYS) * 100));

module.exports = { moodForDays, hungerForDays };
