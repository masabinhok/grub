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
  // How long the pet card keeps reacting to a feed — the crumbs, the hearts, the
  // feeder's name. A day, so the next scheduled run is what clears it.
  FEED_REACTION_MS: 24 * 60 * 60 * 1000,
  // Petting is open to anyone, so the per-person daily limit is not enough on its
  // own — a pile of throwaway accounts would still be a pile of commits. This is
  // the ceiling for the whole repo per day, counted in the configured timezone.
  MAX_PETS_PER_DAY: 25,
  APOLOGY: "i'm sorry",
  MOODS: ['thriving', 'hungry', 'feral', 'deceased'],
  // Every login that reaches this repo came from a stranger, and one of them ends
  // up drawn onto a public SVG. GitHub's own rule: alphanumerics and single
  // hyphens, no leading or trailing hyphen, 39 characters. Validated on the way
  // in (feed_grub.js) and again on the way out (update_pet.js).
  LOGIN_RE: /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
};
