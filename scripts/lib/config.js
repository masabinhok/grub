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

  // Whose midnight the creature starves by. An IANA zone name — the day boundary
  // for "days since the last commit", for the death date, and for the one-feed-
  // per-person-per-day limit. Change this and change the cron in
  // .github/workflows/pet.yml with it: the job should run at the end of *this*
  // day, not at the end of UTC's.
  timezone: 'Asia/Kathmandu',

  github: {
    // null means "work it out" — PET_USERNAME, then the CI repo owner, then the
    // git remote. Set it explicitly if you render for someone else's profile.
    username: null,
    includePrivate: false,
    // "owner/name" whose traffic feeds the counter. null resolves from
    // GITHUB_REPOSITORY, then the git remote.
    repo: null,
  },

  // Which cards get written. Order is irrelevant; each SVG stands alone.
  components: {
    banner: true,
    cta: true,
    pet: true,
    streak: true,
    eye: true,
    star: true,
    stats: true,
    languages: true,
    divider: true,
    marquee: true,
    inventory: true,
  },

  // The scrolling CRT line. `text` accepts a string or an array of strings; null
  // runs the daily joke/quote/fact rotation from lib/copy.js instead.
  marquee: {
    text: null,
    mode: 'scroll',       // "scroll" or "type"
    separator: '   ·   ',
  },

  // The "adopt one of these" card. `upstream` is the repo it sends people to —
  // leave it pointing at the original and a fork becomes an advert for the
  // template it came from, which is the entire idea.
  cta: {
    upstream: 'masabinhok/grub',
  },

  // Everything the creature can say or be handed, extensible without touching
  // scripts/lib/. `lines` and `quotes` are added to the built-in pools; `snacks`
  // adds to the pantry, and an entry reusing a built-in id replaces it. Set
  // `replace: true` to drop the built-ins entirely and use only your own.
  //
  //   "copy": {
  //     "lines": { "feral": ["I have eaten the LICENSE."] },
  //     "quotes": ["Weeks of coding can save you hours of planning."],
  //     "snacks": [{ "id": "mango", "name": "a mango", "tint": "t",
  //                  "response": "Seasonal. Sticky. Gone.",
  //                  "art": [".##.", "####", "####", ".##."] }]
  //   }
  copy: {
    replace: false,
    lines: {},
    quotes: [],
    snacks: [],
  },

  // The RPG equipment screen. Any number of slots; the one whose item matches
  // petName is drawn as the live companion.
  inventory: {
    slots: [
      { slot: 'Primary', item: 'NestJS' },
      { slot: 'Database', item: 'Postgres' },
      { slot: 'Language', item: 'TypeScript' },
      { slot: 'Companion', item: 'GRUB' },
    ],
  },

  // Every fixed string on a card, in one place.
  labels: {
    banner: { status: 'PET STATUS' },
    cta: {
      title: 'ADOPT ONE OF THESE',
      sub: 'it starves when you stop committing',
      button: 'USE THIS TEMPLATE',
    },
    pet: {
      hunger: 'HUNGER',
      daysSinceCommit: 'DAYS SINCE COMMIT',
      mood: 'MOOD',
      resurrections: 'RESURRECTIONS',
      // The placard above his head: the plea, and what it says instead once
      // somebody has fed him.
      feedMe: 'FEED ME',
      feedMeSub: 'strangers only',
      fedBy: 'FED BY',
    },
    streak: {
      current: 'CURRENT STREAK',
      days: 'days',
      longest: 'LONGEST',
      activeDays: 'ACTIVE DAYS',
    },
    eye: {
      lurkers: 'LURKERS',
      fed: 'FED',
    },
    star: {
      title: 'STARS EARNED',
      repos: 'REPOS',
    },
    stats: {
      title: 'BY THE NUMBERS',
      repos: 'PUBLIC REPOS',
      stars: 'STARS EARNED',
      followers: 'FOLLOWERS',
      contributions: 'CONTRIBUTIONS',
    },
    languages: { title: 'MOST USED LANGUAGES' },
    marquee: {
      title: 'NOW BROADCASTING',
      live: 'ON AIR',
      dead: 'SIGNAL LOST',
    },
    inventory: { title: 'EQUIPPED SKILLS' },
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
