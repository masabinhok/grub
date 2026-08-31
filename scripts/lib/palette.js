'use strict';

/**
 * One palette per mood. `sat` is the master desaturation dial the whole README
 * hangs off: 1 at full health, 0 once he is dead.
 */

const { merge } = require('./config');

const PALETTES = {
  thriving: {
    x: '#5fd99a', d: '#31a86e', w: '#ffffff', b: '#0d2018', m: '#ff6f8f', t: '#ffd24c',
    bg1: '#0d2018', bg2: '#173d2b', ink: '#e6fff2', dim: '#79c9a4', accent: '#5fd99a',
    ground: '#1f5c40', sat: 1,
  },
  hungry: {
    x: '#93ad78', d: '#61784c', w: '#efefe6', b: '#20250f', m: '#b06274', t: '#c2a244',
    bg1: '#171b12', bg2: '#252c1c', ink: '#dfe6cf', dim: '#94a37d', accent: '#93ad78',
    ground: '#3a4429', sat: 0.6,
  },
  feral: {
    x: '#8b8f86', d: '#565a52', w: '#e9e9e5', b: '#c02626', m: '#a52a2a', t: '#6e6a4a',
    bg1: '#111110', bg2: '#1c1b19', ink: '#c8c8c0', dim: '#8a8a82', accent: '#a03030',
    ground: '#2a2a26', sat: 0.25,
  },
  deceased: {
    s: '#8d939b', g: '#2e2f33', d: '#5c6169', x: '#8d939b', w: '#e9e9e5', b: '#2e2f33',
    bg1: '#0a0a0b', bg2: '#141417', ink: '#9aa0a6', dim: '#6b7076', accent: '#6b7076',
    ground: '#2e2f33', sat: 0,
  },
};

/** Pull a hex colour toward gray. sat=1 keeps it, sat=0 makes it fully gray. */
function desaturate(hex, sat) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const mix = (c) => Math.round(c * sat + l * (1 - sat));
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Built-in palettes with any grub.config.json overrides folded in. */
function resolvePalettes(cfg) {
  return merge(PALETTES, (cfg && cfg.palette) || {});
}


/* ------------------------------------------------------------------ bare mode

Retinting for cards rendered without a background (`--bare`).

The normal palettes assume a dark card behind them: `ink` is #e6fff2, which is
1.05:1 against white — invisible. Take the card away and the type has to survive
whichever theme the reader has GitHub set to, so every colour that carries
meaning gets pulled into the one luminance band that works on both.

There is a hard ceiling here worth knowing before tuning these numbers. Contrast
against white falls as a colour lightens; contrast against #0d1117 rises. The
best a single colour can do against both at once is where those curves cross, at
relative luminance ~0.19, and that is 4.34:1. So AA for large text (3:1) is
comfortably reachable and AA for body text (4.5:1) is not reachable at all — not
by better colour choices, not by anything. The cards buy their way back by
setting type that is large, bold or letter-spaced.

Hue and saturation are preserved; only lightness moves. A green stays the same
green, so the mood palettes still read as themselves.
*/

/** Relative luminance, per WCAG 2.x. */
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const ch = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

/** Contrast ratio between two hex colours. */
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function toHsl(hex) {
  const n = parseInt(/^#?([0-9a-f]{6})$/i.exec(hex)[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0))
    : max === g ? (b - r) / d + 2
      : (r - g) / d + 4;
  return [h / 6, s, l];
}

function toHex([h, s, l]) {
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(v * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * The same colour, moved to `target` relative luminance. Binary search on HSL
 * lightness because luminance is not linear in it — 30 passes lands well inside
 * one 8-bit step, so the result is stable and worth no more iterations.
 */
function atLuminance(hex, target) {
  const [h, s] = toHsl(hex);
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (luminance(toHex([h, s, mid])) < target) lo = mid; else hi = mid;
  }
  return toHex([h, s, (lo + hi) / 2]);
}

// Where each role sits. INK is parked on the crossover for the best contrast
// available on both grounds. DIM rides lighter, which costs contrast on white
// and buys back the hierarchy the card would otherwise lose — it labels, it is
// not the number you came to read.
//
// ACCENT stays near the crossover rather than going lighter with DIM, and the
// reason is the feral palette: its accent is a dark red that already reads well
// on white and badly on dark. Lifting it far enough to fix dark turns it pink
// and breaks white, so it fails at both ends. Near the crossover every mood's
// accent keeps its character and clears 3:1 on both grounds — which is the
// whole point of doing this by luminance instead of by eye.
const BARE_INK = 0.185;
const BARE_DIM = 0.26;
const BARE_ACCENT = 0.22;

/**
 * A copy of `pal` safe to render with no card behind it. Only the roles that
 * carry meaning move: `bg1`/`bg2` stay dark because in bare mode they are no
 * longer backgrounds, they are artwork — the eye's sclera, its lids, the speech
 * bubble — and those read correctly as dark shapes on either theme.
 */
function barePalette(pal) {
  return Object.assign({}, pal, {
    ink: atLuminance(pal.ink, BARE_INK),
    dim: atLuminance(pal.dim, BARE_DIM),
    accent: atLuminance(pal.accent, BARE_ACCENT),
    // The gold the streak and star cards set their headline number in. #ffd24c
    // is 1.44:1 on white — fine burning on a dark card, unreadable as a numeral
    // on a light page. `hot` exists only in bare mode; both cards fall back to
    // their own gold when it is absent, so normal renders are untouched. The
    // flames and the star keep the bright gold: they are shapes, not numerals,
    // and dulling them to satisfy a contrast rule for text would be the wrong
    // trade.
    hot: atLuminance(pal.t || pal.accent, BARE_ACCENT),
    bare: true,
  });
}

module.exports = {
  PALETTES, desaturate, resolvePalettes,
  luminance, contrast, atLuminance, barePalette,
};
