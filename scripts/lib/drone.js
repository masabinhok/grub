'use strict';

/**
 * The recon drone, drawn in vector rather than as a pixel grid. Selected with
 * `"pet": { "style": "drone" }` in grub.config.json; the sprite stays the default.
 *
 * Everything is in the same 144x144 box the 16x16 sprite fills, so the pet card
 * places it, bobs it and runs the feeding theatre around it unchanged. The lens
 * is the face: it carries the mood colour, the blink and the scan beam.
 */

const { esc } = require('./svg');

const CX = 72;

/** Rotor pod at (x, y). Spinning is a fast squash of the blur disc, not a rotation. */
function rotor(x, y, pal, spin) {
  const blur = `<ellipse cx="${x}" cy="${y - 4}" rx="22" ry="3.5" fill="${pal.ink}" opacity="0.22">` +
    (spin ? '<animate attributeName="rx" values="22;9;22" dur="0.18s" repeatCount="indefinite"/>' : '') +
    '</ellipse>';
  return `<rect x="${x - 7}" y="${y - 3}" width="14" height="9" rx="2.5" fill="url(#drHull)" stroke="${pal.accent}" stroke-opacity="0.45"/>` +
    `<rect x="${x - 1}" y="${y - 6}" width="2" height="4" fill="${pal.dim}"/>` + blur;
}

/**
 * The drone's body for `mood`, plus `meta` for the dead variant's plate. Returns
 * markup in sprite-local coordinates (0..144).
 */
function droneArt(mood, pal, meta = {}) {
  const dead = mood === 'deceased';
  const lensColor = dead ? pal.g : pal.accent;
  const defs = '<defs>' +
    '<radialGradient id="drHull" cx="0.35" cy="0.3" r="0.8">' +
    `<stop offset="0" stop-color="${pal.dim}" stop-opacity="0.9"/>` +
    `<stop offset="0.45" stop-color="${pal.bg2}"/><stop offset="1" stop-color="${pal.bg1}"/></radialGradient>` +
    '<radialGradient id="drLens" cx="0.5" cy="0.5" r="0.5">' +
    `<stop offset="0" stop-color="${dead ? pal.d : pal.w}"/><stop offset="0.35" stop-color="${lensColor}"/>` +
    `<stop offset="1" stop-color="${lensColor}" stop-opacity="0"/></radialGradient>` +
    '<linearGradient id="drBeam" x1="0" y1="0" x2="0" y2="1">' +
    `<stop offset="0" stop-color="${pal.accent}" stop-opacity="0.45"/><stop offset="1" stop-color="${pal.accent}" stop-opacity="0"/></linearGradient>` +
    '</defs>';

  if (dead) {
    // Grounded: hull on the deck, arms drooped, lens dark and cracked.
    // The tombstone's text classes are tuned for grey stone; on open card they
    // need the lighter dim, and inline style is the only thing that beats a class.
    const y = 112, ink = `style="fill:${pal.dim}"`;
    return defs +
      `<text class="mono rip" ${ink} x="72" y="30" text-anchor="middle">OFFLINE</text>` +
      `<line x1="26" y1="40" x2="118" y2="40" stroke="${pal.g}" stroke-opacity="0.6"/>` +
      `<text class="mono ripsub" ${ink} x="72" y="56" text-anchor="middle">${esc(meta.name || '')} · KIA</text>` +
      `<text class="mono ripsub" ${ink} x="72" y="70" text-anchor="middle">${esc(meta.date || '')}</text>` +
      `<path d="M${CX - 24} ${y} L18 ${y + 22} M${CX + 24} ${y} L126 ${y + 22}" stroke="${pal.d}" stroke-width="4" stroke-linecap="round"/>` +
      rotor(18, y + 26, pal, false) + rotor(126, y + 26, pal, false) +
      `<circle cx="${CX}" cy="${y}" r="30" fill="url(#drHull)" stroke="${pal.g}"/>` +
      `<circle cx="${CX}" cy="${y + 2}" r="13" fill="#050505"/>` +
      `<circle cx="${CX}" cy="${y + 2}" r="8" fill="url(#drLens)" opacity="0.5"/>` +
      `<path d="M${CX - 6} ${y - 6} L${CX + 1} ${y + 2} L${CX - 3} ${y + 9}" stroke="${pal.dim}" stroke-width="1" fill="none"/>`;
  }

  const y = 66;
  // The beam is the drone doing its job: a sweep when thriving, a still and
  // fainter cone when hungry, a stutter when feral.
  const sweep = mood === 'thriving'
    ? `<animateTransform attributeName="transform" type="rotate" values="-16 ${CX} ${y + 10};16 ${CX} ${y + 10};-16 ${CX} ${y + 10}" dur="4.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`
    : mood === 'feral'
      ? '<animate attributeName="opacity" values="1;0.2;1;0;0.8;1" dur="0.9s" repeatCount="indefinite" calcMode="discrete"/>'
      : '';
  const beam = `<g opacity="${mood === 'hungry' ? 0.45 : 1}"><polygon points="${CX - 6},${y + 12} ${CX + 6},${y + 12} ${CX + 40},144 ${CX - 40},144" fill="url(#drBeam)">${sweep}</polygon></g>`;

  // The lens breathes; the beacon on the mast blinks. Both stop when it dies.
  const pulse = `<animate attributeName="opacity" values="1;0.55;1" dur="${mood === 'feral' ? '0.7s' : '2.6s'}" repeatCount="indefinite"/>`;
  const beacon = `<circle cx="${CX + 9}" cy="18" r="2.5" fill="${pal.m}">` +
    '<animate attributeName="opacity" values="1;0.1;1" dur="1.4s" repeatCount="indefinite"/></circle>';

  return defs + beam +
    `<path d="M${CX - 26} ${y - 8} L20 ${y - 22} M${CX + 26} ${y - 8} L124 ${y - 22}" stroke="${pal.d || pal.dim}" stroke-width="4" stroke-linecap="round"/>` +
    rotor(20, y - 22, pal, true) + rotor(124, y - 22, pal, true) +
    `<line x1="${CX + 4}" y1="${y - 32}" x2="${CX + 9}" y2="20" stroke="${pal.dim}" stroke-width="1.5"/>` + beacon +
    `<circle cx="${CX}" cy="${y}" r="34" fill="url(#drHull)" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<path d="M${CX - 33} ${y + 4} Q${CX} ${y + 14} ${CX + 33} ${y + 4}" stroke="${pal.accent}" stroke-opacity="0.35" fill="none"/>` +
    `<circle cx="${CX}" cy="${y + 4}" r="15" fill="#050605" stroke="${pal.accent}" stroke-opacity="0.7"/>` +
    `<circle cx="${CX}" cy="${y + 4}" r="11" fill="url(#drLens)">${pulse}</circle>` +
    `<circle cx="${CX}" cy="${y + 4}" r="3.2" fill="${pal.w}"/>` +
    // Blink: the same .lid class and timing the sprite's eyelids use.
    `<rect class="lid" x="${CX - 15}" y="${y - 11}" width="30" height="30" rx="15" fill="${pal.bg1}"/>` +
    [0, 1, 2].map((i) => `<rect x="${CX - 9 + i * 7}" y="${y - 25}" width="4" height="2" fill="${i === 2 ? pal.m : pal.accent}" opacity="0.8"/>`).join('');
}

module.exports = { droneArt };
