'use strict';

const { esc, baseStyle, svgDoc, pixelRects } = require('../lib/svg');
const { glyphRects, groupDigits, fitScale, GLYPH_H } = require('../lib/glyphs');
const { SPRITES } = require('../lib/sprites');

const W = 420, H = 180;
const CX = 106, CY = 92;     // centre of the eye
const RX = 76, RY = 42;      // half-width, half-height of the opening
// The numbers column. The eye's outer stroke ends at x=182, so this leaves a
// 26px gutter — enough that the two read as separate elements, close enough that
// they still read as one card. Left-aligned: centring pushed short counts into
// the middle of the card, which looked adrift rather than deliberate.
const COL_X = 208;
const COL_W = 196;           // COL_X -> 16px from the right edge
const LID = 104;             // how far the lids travel to get out of the way
const GRUB_CELL = 2;         // 16x16 sprite -> 32x32
const GRUB = 16 * GRUB_CELL;
const GRUB_X = 396 - GRUB;   // right-aligned with FED, directly above it
const GRUB_Y = 120;
const FED_Y = 168;           // baseline; FED is a footnote and stays in the corner
const NUM_CY = 88;           // centre of the count. Level with the eye (92) to
                             // within a few px, so the two read as a pair and the
                             // count's own margins top and bottom come out even —
                             // the 4px of lift is clearance for the grub below.

/**
 * The eye — the watching card, and the profile view counter.
 *
 * It blinks, the pupil drifts, and the iris takes the mood accent, so it belongs
 * to the same creature as everything else on the page. When GRUB dies the eye
 * closes and stays closed.
 *
 * The big number is profile views, and it carries no label on purpose: an eye
 * with a number beside it does not need to be told what it is counting.
 *
 * What that number honestly is: how many times GitHub's camo image proxy fetched
 * this card, which happens when somebody renders the profile README in a browser.
 * It is NOT unique visitors — camo strips the viewer's IP, so uniqueness is not
 * measurable and no number here pretends otherwise. The counting is done by the
 * Cloudflare Worker in counter/, which serves this same card; the figure drawn
 * here is the committed total from views.json, so it refreshes once a day like
 * every other number on the page. counter/README.md has the full accounting.
 *
 * FED, small in the corner, is how many distinct people went the extra step and
 * actually fed him. The gap between the two is the point of the card.
 *
 * Dancing above FED is GRUB himself at 2px per pixel, drawn from the same mood
 * sprite as the big pet card. He greys out, stops jigging, and turns into a
 * headstone along with everything else when the streak breaks.
 */
module.exports = function renderEye(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.eye;
  const v = ctx.watchers || {};

  // A quadratic control point twice the half-height puts the curve's apex
  // exactly RY away, so the opening is the size it says it is.
  const eye = `M${CX - RX} ${CY}Q${CX} ${CY - RY * 2} ${CX + RX} ${CY}Q${CX} ${CY + RY * 2} ${CX - RX} ${CY}Z`;

  const views = groupDigits(v.profileViews);
  const fed = groupDigits(v.fed);
  // The one number on the card, so it gets the whole column and a bigger ceiling
  // than the old paired layout could afford. It steps down a size rather than
  // overflowing once the count gains a digit, and is centred in the column
  // rather than anchored left — left-aligned it sat right up against the eye.
  const scale = fitScale(views, COL_W, { min: 2, max: 6 });

  const style = `${baseStyle(pal, dead)}
    ${dead ? '' : `
    .lidT{animation:lidT 6.4s ease-in-out infinite}
    .lidB{animation:lidB 6.4s ease-in-out infinite}
    @keyframes lidT{0%,88%{transform:translateY(0)}92%,94%{transform:translateY(${LID}px)}97%,100%{transform:translateY(0)}}
    @keyframes lidB{0%,88%{transform:translateY(0)}92%,94%{transform:translateY(-${LID}px)}97%,100%{transform:translateY(0)}}
    .jig{animation:jig 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    @keyframes jig{0%,100%{transform:translateY(0) rotate(-7deg)}25%{transform:translateY(-3px) rotate(0deg)}50%{transform:translateY(0) rotate(7deg)}75%{transform:translateY(-3px) rotate(0deg)}}`}`;

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

  // A tiny GRUB jigging above the FED line — the mood's own sprite, so he greys
  // out and stops dancing with the rest of the card. The pivot is his feet
  // (transform-origin 50% 100%), which is what makes it read as a jig rather
  // than a spin.
  //
  // Wrapper <g> places him, inner <g> does the moving: a CSS transform on the
  // same element would throw away the translate that puts him there.
  const dancer =
    `<g transform="translate(${GRUB_X} ${GRUB_Y})">` +
    `<g${dead ? '' : ' class="jig"'}>${pixelRects(SPRITES[state.mood], pal, GRUB_CELL)}</g>` +
    '</g>';

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
    // The count, unlabelled, centred on the eye's own axis so the two read as one
    // object rather than a picture with a caption bolted beside it.
    `<g${dead ? '' : ' class="pulse"'}>${glyphRects(views, {
      x: COL_X, y: NUM_CY - Math.round((GLYPH_H * scale) / 2), scale, fill: pal.accent,
    })}</g>` +
    dancer +
    // FED sits in the bottom corner as a footnote, right-aligned so it stays put
    // whatever the digits do. Monospace rather than pixel glyphs: it is an aside,
    // and the pixel font is reserved for numbers meant to be read across a room.
    `<text class="mono" text-anchor="end" x="${W - 24}" y="${FED_Y}">` +
    `<tspan class="lbl">${esc(lbl.fed)}</tspan>` +
    `<tspan class="sm" dx="7">${fed}</tspan>` +
    '</text>';

  return svgDoc({
    w: W, h: H, pal, id: 'eye', style,
    title: `${views} profile views, ${fed} fed him`,
    desc: (v.profileViewsSince ? `Counted since ${v.profileViewsSince}. ` : 'Awaiting the first counted view. ') +
      'Renders of the profile README, measured at GitHub\'s image proxy. Not unique visitors.',
    body,
  });
};
