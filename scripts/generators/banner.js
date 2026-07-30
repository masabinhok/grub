'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { taglinesFor } = require('../lib/copy');

module.exports = function renderBanner(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.banner;
  const taglines = taglinesFor(ctx.cfg);
  const p = ctx.profile || {};
  const name = (p.name || p.login || 'developer').toUpperCase();
  const where = [p.company, p.location].filter(Boolean).join(' · ');

  // A row of pixels that thins out as the pet declines — the header carries the
  // mood even when the pet card is not on screen.
  const pips = 28;
  const lit = dead ? 0 : Math.max(1, Math.round(pips * (1 - state.hunger / 100)));
  const pipRow = Array.from({ length: pips }, (_, i) =>
    `<rect x="${560 + i * 9}" y="78" width="6" height="6" fill="${i < lit ? pal.accent : pal.dim}" opacity="${i < lit ? 1 : 0.25}"/>`).join('');

  const body =
    `<text class="mono big" x="34" y="56">${esc(name)}</text>` +
    `<text class="mono dim" x="34" y="78">${esc(where || (p.login ? `@${p.login}` : ''))}</text>` +
    `<text class="mono lbl" x="34" y="98">${esc(taglines[state.mood].toUpperCase())}</text>` +
    `<text class="mono lbl" x="806" y="42" text-anchor="end">${esc(lbl.status)}</text>` +
    `<text class="mono med${dead ? '' : ' pulse'}" x="806" y="64" text-anchor="end" fill="${pal.accent}">${state.mood.toUpperCase()}</text>` +
    pipRow;

  return svgDoc({
    w: 840, h: 120, pal, id: 'ban', style: baseStyle(pal, dead),
    title: `${p.name || p.login || 'profile'} — ${taglines[state.mood]}`,
    desc: `Pet status: ${state.mood}`,
    body,
  });
};
