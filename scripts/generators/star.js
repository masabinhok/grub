'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { desaturate } = require('../lib/palette');
const { glyphRects, groupDigits, fitScale, GLYPH_H } = require('../lib/glyphs');

// Gold, then run through the mood's desaturation dial — the star dims with the
// pet without ever having to stop being gold. A star tinted to the accent reads
// as a sticker; this one reads as metal.
const GOLD = { lit: '#ffd24c', deep: '#e08a1e' };

const W = 420, H = 180;
const CX = 104, CY = 90;     // centre of the star
const R = 60, IR = 25;       // outer and inner radius
const COL_X = 208;
const COL_W = 188;

/** Points of a five-pointed star, first point straight up. */
function starPoints(cx, cy, outer, inner, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 ? inner : outer;
    const a = (Math.PI * i) / n - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

/**
 * The star — every star anyone has ever given you, in one glazed lump.
 *
 * The glaze is a highlight sweeping across the face on a loop, clipped to the
 * star itself, over a gold-to-accent gradient. Rays turn slowly behind it and
 * sparkles fire off the points. When GRUB dies the light goes out: grey metal,
 * no sweep, no rotation, nothing.
 */
module.exports = function renderStar(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.star;
  const p = ctx.profile || {};

  // Desaturating gold at sat=0 still lands on a bright grey, which would leave a
  // gleaming chrome star on an otherwise unlit tombstone of a card. A dead star
  // takes the dead palette instead.
  const gold = dead ? pal.dim : desaturate(GOLD.lit, pal.sat);
  const deep = dead ? pal.ground : desaturate(GOLD.deep, pal.sat);
  const points = starPoints(CX, CY, R, IR);
  const stars = groupDigits(p.stars || 0);
  const scale = fitScale(stars, COL_W, { min: 2, max: 5 });

  const style = `${baseStyle(pal, dead)}
    ${dead ? '' : `
    .rays{animation:spin 26s linear infinite;transform-box:fill-box;transform-origin:center}
    .halo{animation:halo 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
    .glaze{animation:glaze 3.6s ease-in-out infinite}
    .tw{animation:tw 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes halo{0%,100%{transform:scale(1);opacity:.28}50%{transform:scale(1.1);opacity:.06}}
    @keyframes glaze{0%{transform:translateX(-190px)}55%,100%{transform:translateX(190px)}}
    @keyframes tw{0%,100%{opacity:.15;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}`}`;

  // Behind the star: slow rays, so the whole thing sits in its own weather.
  const rays = dead ? '' :
    `<g class="rays" opacity="0.3">${Array.from({ length: 12 }, (_, i) =>
      `<rect x="${CX - 1.5}" y="${CY - R - 26}" width="3" height="${i % 2 ? 14 : 22}" rx="1.5" fill="${gold}" transform="rotate(${i * 30} ${CX} ${CY})"/>`).join('')}</g>`;

  const sparkles = dead ? '' : [
    [CX - 74, CY - 44, 5, 0],
    [CX + 66, CY - 30, 4, 0.8],
    [CX + 44, CY + 62, 5, 1.5],
    [CX - 56, CY + 54, 3, 2.1],
  // Placed by a wrapper <g>, animated on the child: a CSS transform on the same
  // element would throw away the translate that puts it there.
  ].map(([x, y, r, d]) =>
    `<g transform="translate(${x} ${y})"><path class="tw" style="animation-delay:${d}s" ` +
    `d="M0 ${-r * 2.2}Q${r * 0.35} ${-r * 0.35} ${r * 2.2} 0Q${r * 0.35} ${r * 0.35} 0 ${r * 2.2}Q${-r * 0.35} ${r * 0.35} ${-r * 2.2} 0Q${-r * 0.35} ${-r * 0.35} 0 ${-r * 2.2}Z" ` +
    `fill="${pal.w || pal.ink}"/></g>`).join('');

  const body =
    '<defs>' +
    `<radialGradient id="starFill" cx="0.35" cy="0.3" r="0.8">` +
    `<stop offset="0" stop-color="${pal.w || pal.ink}" stop-opacity="${dead ? 0.25 : 0.75}"/>` +
    `<stop offset="0.45" stop-color="${gold}"/><stop offset="1" stop-color="${deep}"/>` +
    '</radialGradient>' +
    '<linearGradient id="starGlaze" x1="0" y1="0" x2="1" y2="0">' +
    `<stop offset="0" stop-color="${pal.w || pal.ink}" stop-opacity="0"/>` +
    `<stop offset="0.5" stop-color="${pal.w || pal.ink}" stop-opacity="0.75"/>` +
    `<stop offset="1" stop-color="${pal.w || pal.ink}" stop-opacity="0"/>` +
    '</linearGradient>' +
    `<clipPath id="starClip"><polygon points="${points}"/></clipPath>` +
    '</defs>' +
    rays +
    (dead ? '' : `<polygon class="halo" points="${starPoints(CX, CY, R + 12, IR + 6)}" fill="none" stroke="${gold}" stroke-width="3" opacity="0.28"/>`) +
    `<polygon points="${points}" fill="url(#starFill)"/>` +
    (dead ? '' :
      `<g clip-path="url(#starClip)"><g transform="rotate(18 ${CX} ${CY})">` +
      `<rect class="glaze" x="${CX - 22}" y="${CY - R - 10}" width="44" height="${R * 2 + 20}" fill="url(#starGlaze)"/>` +
      '</g></g>') +
    `<polygon points="${points}" fill="none" stroke="${gold}" stroke-opacity="${dead ? 0.35 : 0.85}" stroke-width="2" stroke-linejoin="round"/>` +
    sparkles +
    `<text class="mono lbl" x="${COL_X}" y="60">${esc(lbl.title)}</text>` +
    `<g${dead ? '' : ' class="pulse"'}>${glyphRects(stars, { x: COL_X, y: 108 - GLYPH_H * scale, scale, fill: gold })}</g>` +
    `<text class="mono lbl" x="${COL_X}" y="140">${esc(lbl.repos)}</text>` +
    `<text class="mono med" x="${COL_X + 104}" y="140">${p.publicRepos || 0}</text>`;

  return svgDoc({
    w: W, h: H, pal, id: 'str', style,
    title: `${stars} stars earned across ${p.publicRepos || 0} public repositories`,
    desc: 'Total stars on public repositories',
    body,
  });
};
