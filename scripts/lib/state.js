'use strict';

/** pet-state.json — the bot's own memory. Written on genuine runs only. */

const fs = require('fs');
const { STATE_PATH } = require('./constants');

function defaultState(now) {
  return {
    lastCommitDate: now.toISOString(),
    lastCheckedDate: now.toISOString(),
    hunger: 0,
    mood: 'thriving',
    alive: true,
    diedOn: null,
    resurrections: 0,
    // Cosmetic only. Feeding is a real commit — these two never touch hunger,
    // mood or lastCommitDate. See the feed workflow.
    pets: 0,
    feeders: [],
    lastPettedAt: null,
    // login -> UTC date of that login's last pet, for the one-a-day limit.
    feedLog: {},
    cache: {},
  };
}

function loadState(now, statePath = STATE_PATH) {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return Object.assign(defaultState(now), raw);
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn(`! pet-state.json unreadable (${err.message}), starting fresh`);
    return defaultState(now);
  }
}

function saveState(state, statePath = STATE_PATH) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

module.exports = { defaultState, loadState, saveState };
