'use strict';

/**
 * What people throw at him.
 *
 * A snack is two things: a scrap of pixel art the pet card rains down during the
 * feeding reaction, and one line of GRUB's reaction to it in the issue reply.
 * Both live in the same record so a contributor adding a snack never has to
 * touch a generator — the art and the words arrive together or not at all.
 *
 * Forks can add their own without editing this file at all: `copy.snacks` in
 * grub.config.json takes the same shape. See docs/configuration.md.
 *
 * Art grids are the same char-grid format as lib/sprites.js, but small and not
 * mood-keyed — these are props, not characters. Exactly three characters are
 * meaningful:
 *   '.'  transparent
 *   '#'  the snack's tint
 *   'o'  the highlight (the card's paper colour)
 * Anything else is dropped by pixelRects, so a typo loses a pixel rather than
 * breaking the card.
 */

const ART_CHARS = /^[.#o]+$/;
const ID_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;
// Palette keys a snack may tint itself with. Deliberately short: these are the
// keys every live mood defines, so a snack can never resolve to `undefined` and
// vanish. (The dead palette is missing some of them, but a corpse is never fed.)
const TINTS = ['m', 't', 'w', 'x', 'd', 'ink', 'accent'];

const SNACKS = [
  {
    id: 'berry',
    name: 'a berry',
    tint: 'm',
    cell: 3,
    response: 'He swallows it whole and does not ask what was in it.',
    art: [
      '.##.',
      '#o##',
      '####',
      '.##.',
    ],
  },
  {
    id: 'donut',
    name: 'a donut',
    tint: 't',
    cell: 3,
    response: 'Sugar. Excellent. Now he is fast *and* insufferable.',
    art: [
      '.####.',
      '#o..o#',
      '#....#',
      '#....#',
      '#o..o#',
      '.####.',
    ],
  },
  {
    id: 'coffee',
    name: 'a coffee',
    tint: 'w',
    cell: 3,
    response: 'He does not have a nervous system. He drank it anyway.',
    art: [
      '..oo.',
      '.oo..',
      '#####',
      '#...#',
      '#...#',
      '.###.',
    ],
  },
  {
    id: 'pizza',
    name: 'a cold slice of pizza',
    tint: 'm',
    cell: 3,
    response: 'Cold, folded, gone in one motion. No notes.',
    art: [
      '######',
      '.####.',
      '.#oo#.',
      '..##..',
      '..oo..',
      '...#..',
    ],
  },
  {
    id: 'cookie',
    name: 'a cookie',
    tint: 't',
    cell: 3,
    response: 'Crumbs everywhere. He is not sorry and neither are you.',
    art: [
      '.###.',
      '#o#o#',
      '#####',
      '#o#o#',
      '.###.',
    ],
  },
  {
    id: 'bug',
    name: 'a bug',
    tint: 'x',
    cell: 3,
    response: 'You fed him a bug. He is used to it. He filed it anyway.',
    art: [
      '#..#..#',
      '.#####.',
      '##o#o##',
      '.#####.',
      '#..#..#',
    ],
  },
];

/**
 * Why a snack is unusable, or null if it is fine. Returns the reason rather than
 * throwing so one bad entry in somebody's config drops itself instead of taking
 * the whole run down — a card that renders is worth more than a strict parse.
 */
function snackProblem(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return 'not an object';
  if (!ID_RE.test(String(s.id || ''))) return `id "${s.id}" must be lowercase a-z0-9- (max 24)`;
  if (!s.name || typeof s.name !== 'string') return 'name must be a non-empty string';
  if (!s.response || typeof s.response !== 'string') return 'response must be a non-empty string';
  if (s.tint !== undefined && !TINTS.includes(s.tint)) return `tint "${s.tint}" must be one of: ${TINTS.join(', ')}`;
  if (s.cell !== undefined && !(Number.isInteger(s.cell) && s.cell >= 1 && s.cell <= 6)) {
    return 'cell must be a whole number between 1 and 6';
  }
  if (!Array.isArray(s.art) || s.art.length < 1 || s.art.length > 12) return 'art must be 1-12 rows';
  const w = String(s.art[0]).length;
  if (w < 1 || w > 12) return 'art rows must be 1-12 characters wide';
  for (const row of s.art) {
    if (typeof row !== 'string' || row.length !== w) return 'every art row must be a string of the same length';
    if (!ART_CHARS.test(row)) return "art rows may only contain '.', '#' and 'o'";
  }
  return null;
}

/** Fill in the optional fields so every consumer can read them unconditionally. */
const normalize = (s) => ({
  id: s.id, name: s.name, response: s.response,
  tint: s.tint || 'm', cell: s.cell || 3, art: s.art.slice(),
});

/**
 * The built-in snacks with anything from `copy.snacks` folded in. An entry whose
 * id matches a built-in replaces it, which is how a fork reskins the berry
 * without losing the other five. `copy.replace` starts from an empty pantry
 * instead, for people who want only their own.
 */
function resolveSnacks(cfg) {
  const extra = (cfg && cfg.copy && Array.isArray(cfg.copy.snacks)) ? cfg.copy.snacks : [];
  const base = (cfg && cfg.copy && cfg.copy.replace) ? [] : SNACKS;
  const byId = new Map(base.map((s) => [s.id, normalize(s)]));
  for (const s of extra) {
    const problem = snackProblem(s);
    if (problem) { console.warn(`! ignoring snack: ${problem}`); continue; }
    byId.set(s.id, normalize(s));
  }
  const out = [...byId.values()];
  return out.length ? out : SNACKS.map(normalize);
}

/** djb2. Deliberately boring: it only has to be stable across runs. */
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Which snack a given feed gets. Keyed rather than random so feed_grub.js and the
 * renderer independently agree — the issue reply says "a donut" and the card
 * genuinely rains donuts, with nothing passed between the two but the state file.
 */
const pickSnack = (snacks, key) => snacks[hash(String(key)) % snacks.length];

/** The snack with this id, or null. Used to honour what the reply already said. */
const snackById = (snacks, id) => snacks.find((s) => s.id === id) || null;

module.exports = { SNACKS, TINTS, resolveSnacks, snackProblem, pickSnack, snackById, hash };
