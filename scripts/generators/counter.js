'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { glyphRects, groupDigits, textWidth, fitScale, GLYPH_H } = require('../lib/glyphs');

const W = 420, H = 180;
const RULE_X = 210;          // the divider between the two stats
const COL_W = 162;           // usable width inside each column
const NUM_BOTTOM = 112;      // shared baseline for the pixel digits

/**
 * Two numbers, side by side: how many people came to look, and how many of them
 * actually fed him. Both climb; feeding never decrements the lurker total, so the
 * left figure is monotonic and the gap between them is the point.
 */
module.exports = function renderCounter(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.counter;
  const c = ctx.counter || {};

  const lurkers = groupDigits(c.lurkers);
  const fed = groupDigits(c.fed);

  // One scale for both numbers, driven by the longer of the two, so they read as
  // a matched pair and share a baseline however many digits each one gains.
  const scale = Math.min(
    fitScale(lurkers, COL_W, { min: 2, max: 5 }),
    fitScale(fed, COL_W, { min: 2, max: 5 }),
  );
  const y = NUM_BOTTOM - GLYPH_H * scale;

  // Centred in its column, so the pair stays visually balanced.
  const stat = (text, x, fill) => glyphRects(text, {
    x: Math.round(x + (COL_W - textWidth(text, scale)) / 2),
    y,
    scale,
    fill,
  });

  const footnote = c.since
    ? `repo visitors since ${c.since} · unique per day`
    : 'awaiting the first traffic sample';

  const body =
    `<text class="mono lbl" x="24" y="26">${esc(lbl.title)}</text>` +
    `<line x1="24" y1="36" x2="${W - 24}" y2="36" stroke="${pal.accent}" stroke-opacity="0.25"/>` +
    `<text class="mono lbl" x="24" y="60">${esc(lbl.lurkers)}</text>` +
    `<text class="mono lbl" x="234" y="60">${esc(lbl.fed)}</text>` +
    `<line x1="${RULE_X}" y1="48" x2="${RULE_X}" y2="140" stroke="${pal.accent}" stroke-opacity="0.28"/>` +
    `<g${dead ? '' : ' class="pulse"'}>${stat(lurkers, 24, pal.accent)}</g>` +
    stat(fed, 234, pal.ink) +
    `<text class="mono dim" x="24" y="168" font-size="9.5">${esc(dead ? 'they watched. nobody helped.' : footnote)}</text>`;

  return svgDoc({
    w: W, h: H, pal, id: 'cnt', style: baseStyle(pal, dead),
    title: `${lurkers} ${lbl.lurkers.toLowerCase()}, ${fed} fed him`,
    desc: footnote,
    body,
  });
};
