'use strict';

const { FONT, esc } = require('../lib/svg');

const W = 840, H = 104;
const SIZE = 50, TRACK = 7;
const ADVANCE = SIZE * 0.6 + TRACK;   // monospace advance plus tracking

/**
 * Just the name, set large: letters rise in one after another, a hairline
 * draws out from the centre beneath them, and a band of light crosses the
 * name every few seconds. One <text> per letter, because a monospace advance
 * is the only way to know where each one lands without a font to measure.
 */
module.exports = function renderName(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const p = ctx.profile || {};
  const name = String(p.name || p.login || ctx.cfg.github.username || 'developer');
  const chars = [...name];
  const x0 = (W - (chars.length * ADVANCE - TRACK)) / 2;
  const base = 64;

  const letters = chars.map((c, i) => (c === ' ' ? '' :
    `<text class="ch" x="${(x0 + i * ADVANCE).toFixed(1)}" y="${base}" style="animation-delay:${(i * 0.06).toFixed(2)}s">${esc(c)}</text>`)).join('');

  const style = `
    .ch{font-family:${FONT};font-size:${SIZE}px;font-weight:300;fill:url(#nmFill)}
    ${dead ? '' : `.ch{animation:rise .9s cubic-bezier(.2,.8,.2,1) both;transform-box:fill-box}
    .rule{animation:draw 1.4s .5s cubic-bezier(.6,0,.2,1) both;transform-box:fill-box;transform-origin:center}
    @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}`;

  // The sweep is a bright stop riding a wide gradient across the whole card. It
  // rests off the card, so a renderer that does not animate shows plain type.
  const sweep = dead ? '' :
    `<animateTransform attributeName="gradientTransform" type="translate" values="-${W} 0;${W} 0;${W} 0" keyTimes="0;0.45;1" dur="7s" begin="1.6s" repeatCount="indefinite"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(name)}">
<defs><linearGradient id="nmFill" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0" gradientTransform="translate(-${W} 0)">
<stop offset="0" stop-color="${pal.accent}"/><stop offset="0.44" stop-color="${pal.accent}"/>
<stop offset="0.5" stop-color="${dead ? pal.accent : pal.t || pal.ink}"/>
<stop offset="0.56" stop-color="${pal.accent}"/><stop offset="1" stop-color="${pal.accent}"/>${sweep}
</linearGradient></defs>
<style>${style}
</style>
<title>${esc(name)}</title>
${letters}
<rect class="rule" x="${W / 2 - 150}" y="${base + 20}" width="300" height="1" fill="${pal.accent}" opacity="0.5"/>
<rect x="${W / 2 - 2}" y="${base + 18.5}" width="4" height="4" fill="${pal.accent}" transform="rotate(45 ${W / 2} ${base + 20.5})"/>
</svg>
`;
};
