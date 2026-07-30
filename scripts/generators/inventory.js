'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');

const W = 420;
const ROW_H = 30;
const TOP = 58;              // first row baseline, clear of the header rule
const SWATCH = 9;
const FOOT = 18;             // breathing room under the last row

/**
 * An RPG equipment screen. Slots come from grub.config.json, so the card grows
 * with however many you list rather than assuming four.
 *
 * The companion slot is drawn in the mood accent and marked as the live one —
 * it is the pet, so it is the only row that changes on its own.
 */
module.exports = function renderInventory(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.inventory;
  const petName = ctx.cfg.petName;

  const slots = (ctx.cfg.inventory.slots || []).filter((s) => s && s.slot);
  const h = TOP + Math.max(1, slots.length) * ROW_H + FOOT;

  const rows = slots.map((s, i) => {
    const y = TOP + i * ROW_H;
    const item = String(s.item == null ? '—' : s.item);
    // The row describing the pet tracks the pet.
    const isPet = item.toUpperCase() === String(petName).toUpperCase();
    const tint = isPet ? pal.accent : pal.dim;
    const status = isPet ? (dead ? 'BROKEN' : 'EQUIPPED') : 'EQUIPPED';

    return `<rect x="24" y="${y - SWATCH}" width="${SWATCH}" height="${SWATCH}" fill="${tint}"${isPet && !dead ? ' class="pulse"' : ''}/>` +
      `<text class="mono lbl" x="${24 + SWATCH + 10}" y="${y}">${esc(String(s.slot).toUpperCase())}</text>` +
      `<text class="mono sm" x="196" y="${y}" font-weight="700"${isPet ? ` fill="${pal.accent}"` : ''}>${esc(item)}</text>` +
      `<text class="mono dim" x="${W - 24}" y="${y}" text-anchor="end" font-size="9" opacity="0.7">${esc(status)}</text>` +
      `<line x1="24" y1="${y + 9}" x2="${W - 24}" y2="${y + 9}" stroke="${pal.dim}" stroke-opacity="0.14"/>`;
  }).join('');

  const empty = slots.length
    ? ''
    : `<text class="mono dim" x="24" y="${TOP}">no slots configured</text>`;

  const body =
    `<text class="mono lbl" x="24" y="26">${esc(lbl.title)}</text>` +
    `<text class="mono lbl" x="${W - 24}" y="26" text-anchor="end" opacity="0.7">${slots.length}/${slots.length}</text>` +
    `<line x1="24" y1="36" x2="${W - 24}" y2="36" stroke="${pal.accent}" stroke-opacity="0.25"/>` +
    rows + empty;

  return svgDoc({
    w: W, h, pal, id: 'inv', style: baseStyle(pal, dead),
    title: `Equipped: ${slots.map((s) => `${s.slot}: ${s.item}`).join(', ') || 'nothing'}`,
    desc: 'Tech stack as an RPG equipment screen',
    body,
  });
};
