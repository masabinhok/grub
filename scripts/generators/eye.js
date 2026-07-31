'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { glyphRects, groupDigits, fitScale, GLYPH_H } = require('../lib/glyphs');

const W = 420, H = 180;
const CX = 106, CY = 92;     // centre of the eye
const RX = 76, RY = 42;      // half-width, half-height of the opening
const COL_X = 208;           // the numbers column
const COL_W = 188;
const LID = 104;             // how far the lids travel to get out of the way

/**
 * The eye — the watching card. Lurkers on one side of it, feeders on the other.
 *
 * It blinks, the pupil drifts, and the iris takes the mood accent, so it belongs
 * to the same creature as everything else on the page. When GRUB dies the eye
 * closes and stays closed.
 *
 * LURKERS is repo traffic: people who arrived at this repository, which from a
 * profile README means they clicked the creature. It is not a profile-README
 * view count — nobody can measure those, because GitHub serves README images
 * through a caching proxy that reports nothing back. FED is the number of
 * distinct people who went the extra step and actually fed him. The gap between
 * the two is the entire point of the card.
 */
module.exports = function renderEye(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.eye;
  const v = ctx.watchers || {};

  // A quadratic control point twice the half-height puts the curve's apex
  // exactly RY away, so the opening is the size it says it is.
  const eye = `M${CX - RX} ${CY}Q${CX} ${CY - RY * 2} ${CX + RX} ${CY}Q${CX} ${CY + RY * 2} ${CX - RX} ${CY}Z`;

  const lurkers = groupDigits(v.lurkers);
  const fed = groupDigits(v.fed);
  // One scale for both, driven by the longer, so they read as a matched pair
  // however many digits either one gains.
  const scale = Math.min(
    fitScale(lurkers, COL_W, { min: 2, max: 5 }),
    fitScale(fed, COL_W, { min: 2, max: 5 }),
  );

  const style = `${baseStyle(pal, dead)}
    ${dead ? '' : `
    .lidT{animation:lidT 6.4s ease-in-out infinite}
    .lidB{animation:lidB 6.4s ease-in-out infinite}
    @keyframes lidT{0%,88%{transform:translateY(0)}92%,94%{transform:translateY(${LID}px)}97%,100%{transform:translateY(0)}}
    @keyframes lidB{0%,88%{transform:translateY(0)}92%,94%{transform:translateY(-${LID}px)}97%,100%{transform:translateY(0)}}`}`;

  // The lids park *outside* the eye and move in to blink, rather than the other
  // way round. A renderer that ignores the animation then draws an open eye
  // instead of a permanently half-shut one.
  const lidW = RX * 2 + 16;
  const lids = dead
    // Shut, and level: a closed eye, not a blink caught mid-frame.
    ? `<rect x="${CX - RX - 8}" y="${CY - LID}" width="${lidW}" height="${LID}" fill="${pal.bg2}"/>` +
      `<rect x="${CX - RX - 8}" y="${CY}" width="${lidW}" height="${LID}" fill="${pal.bg2}"/>` +
      `<line x1="${CX - RX + 6}" y1="${CY}" x2="${CX + RX - 6}" y2="${CY}" stroke="${pal.dim}" stroke-width="2"/>`
    : `<rect class="lidT" x="${CX - RX - 8}" y="${CY - LID * 2}" width="${lidW}" height="${LID}" fill="${pal.bg2}"/>` +
      `<rect class="lidB" x="${CX - RX - 8}" y="${CY + LID}" width="${lidW}" height="${LID}" fill="${pal.bg2}"/>`;

  // The pupil never settles — it drifts across the socket the way something does
  // when it is reading over your shoulder.
  const drift = dead
    ? ''
    : '<animateTransform attributeName="transform" type="translate" values="-16 3; 14 -2; 6 4; -16 3" dur="9s" repeatCount="indefinite" calcMode="spline" keySplines="0.6 0 0.4 1;0.6 0 0.4 1;0.6 0 0.4 1"/>';

  const iris = dead
    ? ''
    : `<g>${drift}` +
      `<circle cx="${CX}" cy="${CY}" r="30" fill="url(#eyeIris)"/>` +
      // Fibres, so the iris is not a flat disc.
      Array.from({ length: 12 }, (_, i) =>
        `<rect x="${CX - 1}" y="${CY - 29}" width="2" height="11" fill="${pal.bg1}" opacity="0.35" transform="rotate(${i * 30} ${CX} ${CY})"/>`).join('') +
      `<circle cx="${CX}" cy="${CY}" r="30" fill="none" stroke="${pal.bg1}" stroke-opacity="0.5" stroke-width="2"/>` +
      `<circle cx="${CX}" cy="${CY}" r="13" fill="${pal.b || pal.bg1}"/>` +
      `<rect x="${CX - 13}" y="${CY - 19}" width="8" height="8" fill="${pal.w || pal.ink}" opacity="0.9"/>` +
      `<rect x="${CX + 6}" y="${CY + 8}" width="4" height="4" fill="${pal.w || pal.ink}" opacity="0.5"/>` +
      '</g>';

  // Lashes, one tick per corner-ward step. Static — they read as pixel art.
  const lashes = [-52, -26, 0, 26, 52].map((dx, i) => {
    const x = CX + dx;
    const y = CY - Math.round(RY * (1 - (dx / RX) ** 2)) - 4;
    const len = i === 2 ? 10 : 7;
    return `<rect x="${x - 1.5}" y="${y - len}" width="3" height="${len}" rx="1.5" fill="${pal.accent}" opacity="0.45"/>`;
  }).join('');

  const body =
    `<defs><radialGradient id="eyeIris" cx="0.4" cy="0.35" r="0.75">` +
    `<stop offset="0" stop-color="${pal.accent}"/><stop offset="1" stop-color="${pal.bg1}"/>` +
    '</radialGradient>' +
    `<clipPath id="eyeClip"><path d="${eye}"/></clipPath></defs>` +
    `<g clip-path="url(#eyeClip)">` +
    `<rect x="${CX - RX}" y="${CY - RY - 4}" width="${RX * 2}" height="${RY * 2 + 8}" fill="${pal.bg1}"/>` +
    iris + lids +
    '</g>' +
    `<path d="${eye}" fill="none" stroke="${pal.accent}" stroke-opacity="0.75" stroke-width="2"/>` +
    lashes +
    // Two rows, sharing the column beside the eye: who looked, who helped.
    `<text class="mono lbl" x="${COL_X}" y="48">${esc(lbl.lurkers)}</text>` +
    `<g${dead ? '' : ' class="pulse"'}>${glyphRects(lurkers, { x: COL_X, y: 88 - GLYPH_H * scale, scale, fill: pal.accent })}</g>` +
    `<line x1="${COL_X}" y1="102" x2="${W - 24}" y2="102" stroke="${pal.accent}" stroke-opacity="0.22"/>` +
    `<text class="mono lbl" x="${COL_X}" y="122">${esc(lbl.fed)}</text>` +
    glyphRects(fed, { x: COL_X, y: 162 - GLYPH_H * scale, scale, fill: pal.ink });

  return svgDoc({
    w: W, h: H, pal, id: 'eye', style,
    title: `${lurkers} ${String(lbl.lurkers).toLowerCase()}, ${fed} fed him`,
    desc: (v.since ? `Counted since ${v.since}. ` : 'Awaiting the first traffic sample. ') +
      `${groupDigits(v.views)} total repository views.`,
    body,
  });
};
