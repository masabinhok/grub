'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { ICONS } = require('../lib/icons');

const W = 840;
const COLS = 7;
const CELL_W = 112, ROW_H = 76, TOP = 14;
const ICON = 28;

/**
 * The tools I use, as a plain grid of marks with their names under them.
 * Reads `stack` from grub.config.json; with none set it falls back to the
 * inventory card's items, so the two never need to be kept in step by hand.
 */
module.exports = function renderStack(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const names = (ctx.cfg.stack && ctx.cfg.stack.length
    ? ctx.cfg.stack
    : (ctx.cfg.inventory.slots || []).map((s) => s && s.item)).filter(Boolean).map(String);

  const rows = Math.max(1, Math.ceil(names.length / COLS));
  const h = TOP + rows * ROW_H;
  const left = (W - COLS * CELL_W) / 2;

  const cells = names.map((name, i) => {
    // The last row is centred rather than left-aligned under a full one.
    const row = Math.floor(i / COLS);
    const inRow = Math.min(COLS, names.length - row * COLS);
    const x = left + ((COLS - inRow) / 2 + (i % COLS)) * CELL_W + CELL_W / 2;
    const y = TOP + row * ROW_H;
    const icon = ICONS[name.toLowerCase()];
    const mark = icon
      ? `<path transform="translate(${x - ICON / 2} ${y}) scale(${ICON / 24})" d="${icon}" fill="${pal.accent}"/>`
      : `<text class="mono med" x="${x}" y="${y + 21}" text-anchor="middle" fill="${pal.accent}">${esc(name.charAt(0))}</text>`;
    return `<g class="cell" style="animation-delay:${(i * 0.05).toFixed(2)}s">${mark}` +
      `<text class="mono dim" x="${x}" y="${y + ICON + 20}" text-anchor="middle">${esc(name)}</text></g>`;
  }).join('');

  const style = `${baseStyle(pal, dead)}
    ${dead ? '' : `.cell{animation:in .6s ease-out both}
    @keyframes in{from{opacity:0}to{opacity:1}}`}`;

  return svgDoc({
    w: W, h, pal, id: 'stk2', style,
    title: `Stack: ${names.join(', ') || 'nothing'}`,
    desc: 'Languages, frameworks and tools I work with',
    body: cells,
  });
};
