'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');

module.exports = function renderStats(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.stats;
  const p = ctx.profile || {};
  const s = ctx.streak || {};

  const cells = [
    [lbl.repos, p.publicRepos || 0],
    [lbl.stars, p.stars || 0],
    [lbl.followers, p.followers || 0],
    [lbl.contributions, s.totalContributions || 0],
  ];
  const grid = cells.map(([k, v], i) => {
    const x = 24 + (i % 2) * 200;
    const y = 72 + Math.floor(i / 2) * 66; // clears the rule at y=36
    return `<text class="mono lbl" x="${x}" y="${y - 20}">${esc(k)}</text>` +
           `<text class="mono" x="${x}" y="${y + 4}" font-size="26" font-weight="700" fill="${pal.ink}">${v}</text>`;
  }).join('');

  const body =
    `<text class="mono lbl" x="24" y="26">${esc(lbl.title)}</text>` +
    `<line x1="24" y1="36" x2="396" y2="36" stroke="${pal.accent}" stroke-opacity="0.25"/>` +
    grid;

  return svgDoc({
    w: 420, h: 180, pal, id: 'sts', style: baseStyle(pal, dead),
    title: `${p.publicRepos || 0} public repos, ${p.stars || 0} stars, ${p.followers || 0} followers`,
    desc: 'Profile statistics',
    body,
  });
};
