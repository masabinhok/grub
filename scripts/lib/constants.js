'use strict';

/** Paths and the handful of numbers the whole simulation hangs off. */

const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

module.exports = {
  ROOT,
  STATE_PATH: path.join(ROOT, 'pet-state.json'),
  ASSETS_DIR: path.join(ROOT, 'assets'),
  README_PATH: path.join(ROOT, 'README.md'),
  CONFIG_PATH: path.join(ROOT, 'grub.config.json'),

  DEATH_THRESHOLD_DAYS: 5,
  // How long the heart stays on the pet card after someone pets him. A day, so
  // the next scheduled run is what clears it.
  PET_HEART_MS: 24 * 60 * 60 * 1000,
  APOLOGY: "i'm sorry",
  MOODS: ['thriving', 'hungry', 'feral', 'deceased'],
};
