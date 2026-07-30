'use strict';

const { DEATH_THRESHOLD_DAYS } = require('./constants');

function moodForDays(days) {
  if (days >= DEATH_THRESHOLD_DAYS) return 'deceased';
  if (days >= 3) return 'feral';
  if (days >= 1) return 'hungry';
  return 'thriving';
}

const hungerForDays = (days) => Math.min(100, Math.round((days / DEATH_THRESHOLD_DAYS) * 100));

module.exports = { moodForDays, hungerForDays };
