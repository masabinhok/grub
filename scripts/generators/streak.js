'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');

module.exports = function renderStreak(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.streak;
  const s = ctx.streak || {};
  const spark = (s.spark || []).slice(-30);
  const max = Math.max(1, ...spark);

  const BW = 9, GAP = 2, BX = 24, BY = 152, BH = 30;
  const bars = spark.map((c, i) => {
    const h = c ? Math.max(3, Math.round((c / max) * BH)) : 2;
    const fill = c ? pal.accent : pal.dim;
    return `<rect x="${BX + i * (BW + GAP)}" y="${BY - h}" width="${BW}" height="${h}" rx="1.5" fill="${fill}" opacity="${c ? 1 : 0.3}"/>`;
  }).join('');

  const body =
    `<text class="mono lbl" x="24" y="30">${esc(lbl.current)}</text>` +
    `<text class="mono big${dead ? '' : ' pulse'}" x="24" y="68" fill="${pal.accent}">${s.current || 0}</text>` +
    `<text class="mono dim" x="${24 + String(s.current || 0).length * 19 + 8}" y="68">${esc(lbl.days)}</text>` +
    `<text class="mono lbl" x="250" y="30">${esc(lbl.longest)}</text>` +
    `<text class="mono med" x="250" y="52">${s.longest || 0} ${esc(lbl.days)}</text>` +
    `<text class="mono lbl" x="250" y="76">${esc(lbl.activeDays)}</text>` +
    `<text class="mono med" x="250" y="98">${s.activeDays || 0}</text>` +
    `<text class="mono lbl" x="24" y="100">${esc(lbl.spark)}</text>` +
    bars +
    `<text class="mono dim" x="24" y="170" font-size="9.5">${esc(dead ? 'streak irrelevant. host deceased.' : `${s.totalContributions || 0} contributions this year`)}</text>`;

  return svgDoc({
    w: 420, h: 180, pal, id: 'stk', style: baseStyle(pal, dead),
    title: `Current streak ${s.current || 0} days, longest ${s.longest || 0} days`,
    desc: `${s.activeDays || 0} active days in the last year`,
    body,
  });
};
