'use strict';

/**
 * grub.config.json — the user-owned knobs.
 *
 * This file is read, never written. pet-state.json is the opposite: written by
 * the bot on every run. Keeping them separate means a fork can hand-edit its
 * config without the next cron run stomping on it.
 *
 * Every value here has a default that reproduces GRUB's own output, so a missing
 * or partial config renders exactly the same cards as no config at all.
 */

const fs = require('fs');
const { CONFIG_PATH } = require('./constants');

const DEFAULTS = {
  // Shown on the pet card and in the log. Rename it if you fork this.
  petName: 'GRUB',
  tagline: '// THE TAMAGOTCHI OF SHAME',

  github: {
    // null means "work it out" — PET_USERNAME, then the CI repo owner, then the
    // git remote. Set it explicitly if you render for someone else's profile.
    username: null,
    includePrivate: false,
  },

  // Which cards get written. Order is irrelevant; each SVG stands alone.
  components: {
    banner: true,
    pet: true,
    streak: true,
    stats: true,
    languages: true,
    divider: true,
  },

  // Every fixed string on a card, in one place.
  labels: {
    banner: { status: 'PET STATUS' },
    pet: {
      hunger: 'HUNGER',
      daysSinceCommit: 'DAYS SINCE COMMIT',
      mood: 'MOOD',
      resurrections: 'RESURRECTIONS',
    },
    streak: {
      current: 'CURRENT STREAK',
      days: 'days',
      longest: 'LONGEST',
      activeDays: 'ACTIVE DAYS',
      spark: 'LAST 30 DAYS',
    },
    stats: {
      title: 'BY THE NUMBERS',
      repos: 'PUBLIC REPOS',
      stars: 'STARS EARNED',
      followers: 'FOLLOWERS',
      contributions: 'CONTRIBUTIONS',
    },
    languages: { title: 'MOST USED LANGUAGES' },
  },

  // Per-mood banner subtitle. Merged over the built-ins, so overriding one mood
  // leaves the other three alone.
  taglines: {},

  // Per-mood palette overrides, e.g. { "thriving": { "accent": "#ff00aa" } }.
  // Merged over the built-in palettes the same way.
  palette: {},
};

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** Recursive merge, source wins. Arrays and scalars replace rather than merge. */
function merge(base, override) {
  if (!isPlainObject(override)) return base;
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const [k, v] of Object.entries(override)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? merge(out[k], v) : v;
  }
  return out;
}

function loadConfig(configPath = CONFIG_PATH) {
  let raw = {};
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    // A broken config is worth shouting about — silently falling back to
    // defaults looks identical to "my settings did nothing".
    if (err.code !== 'ENOENT') {
      console.warn(`! ${configPath} unreadable (${err.message}), using defaults`);
    }
    return merge(DEFAULTS, {});
  }
  if (!isPlainObject(raw)) {
    console.warn(`! ${configPath} is not an object, using defaults`);
    return merge(DEFAULTS, {});
  }
  return merge(DEFAULTS, raw);
}

/** Component names the config leaves switched on, in registry order. */
function enabledComponents(cfg, registry) {
  return Object.keys(registry).filter((name) => cfg.components[name] !== false);
}

module.exports = { DEFAULTS, loadConfig, enabledComponents, merge };
