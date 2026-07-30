'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { desaturate } = require('../lib/palette');

const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5', Go: '#00ADD8',
  Kotlin: '#A97BFF', Java: '#b07219', 'C++': '#f34b7d', C: '#555555', PHP: '#4F5D95',
  HTML: '#e34c26', CSS: '#563d7c', Rust: '#dea584', Ruby: '#701516', Shell: '#89e051',
  Dart: '#00B4AB', Swift: '#F05138', Vue: '#41b883', Svelte: '#ff3e00',
};

module.exports = function renderLanguages(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.languages;
  const langs = ((ctx.profile && ctx.profile.languages) || []).slice(0, 5);
  const total = langs.reduce((a, [, n]) => a + n, 0) || 1;

  // Language colours desaturate along with the pet — this is the clearest signal
  // that the whole README is downstream of one state file.
  const colourFor = (name, i) =>
    desaturate(LANG_COLORS[name] || [pal.accent, pal.dim, pal.ink][i % 3], pal.sat);

  let x = 24;
  const segs = langs.map(([name, n], i) => {
    const w = Math.max(6, Math.round((n / total) * 372));
    const r = `<rect x="${x}" y="58" width="${w}" height="14" fill="${colourFor(name, i)}" rx="${i === 0 || i === langs.length - 1 ? 3 : 0}"/>`;
    x += w + 2;
    return r;
  }).join('');

  const legend = langs.map(([name, n], i) => {
    const col = 24 + (i % 2) * 200;
    const row = 106 + Math.floor(i / 2) * 26;
    return `<rect x="${col}" y="${row - 8}" width="9" height="9" rx="2" fill="${colourFor(name, i)}"/>` +
           `<text class="mono sm" x="${col + 15}" y="${row}">${esc(name)}</text>` +
           `<text class="mono dim" x="${col + 15 + name.length * 6.6 + 8}" y="${row}">${Math.round((n / total) * 100)}%</text>`;
  }).join('');

  const body =
    `<text class="mono lbl" x="24" y="26">${esc(lbl.title)}</text>` +
    `<line x1="24" y1="36" x2="396" y2="36" stroke="${pal.accent}" stroke-opacity="0.25"/>` +
    (langs.length ? segs + legend : '<text class="mono dim" x="24" y="60">no language data</text>');

  return svgDoc({
    w: 420, h: 180, pal, id: 'lng', style: baseStyle(pal, dead),
    title: `Top languages: ${langs.map(([n]) => n).join(', ') || 'none'}`,
    desc: 'Language distribution across public repositories',
    body,
  });
};
