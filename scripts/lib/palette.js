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

module.exports = { PALETTES, desaturate, resolvePalettes };
