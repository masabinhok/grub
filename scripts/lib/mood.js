'use strict';

const { DEATH_THRESHOLD_DAYS } = require('./constants');

/**
 * `days` (from daysBetween) counts calendar-day boundaries crossed since the
 * last commit, in the tracked timezone. It ticks over to 1 the instant a new
 * local day begins — before there was any chance to commit on that new day.
 * That first day is a grace day, not a missed one, so mood/hunger are judged
 * on how many days have FULLY elapsed with no commit: `days - 1`.
 */
const missedDays = (days) => Math.max(0, days - 1);

function moodForDays(days) {
  const missed = missedDays(days);
  if (missed >= DEATH_THRESHOLD_DAYS) return 'deceased';
  if (missed >= 3) return 'feral';
  if (missed >= 1) return 'hungry';
  return 'thriving';
}

const hungerForDays = (days) => Math.min(100, Math.round((missedDays(days) / DEATH_THRESHOLD_DAYS) * 100));

module.exports = { moodForDays, hungerForDays };
