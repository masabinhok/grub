'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { desaturate } = require('../lib/palette');
const { glyphRects, textWidth, fitScale, GLYPH_H } = require('../lib/glyphs');

// Fire is orange. None of the mood palettes contain an orange, and tinting the
// flame green would stop it reading as fire at all — so these are fixed hues run
// through the mood's own desaturation dial. The fire still fades with the pet,
// it just fades from something that was on fire to begin with.
const FIRE = { hot: '#ff4d1c', mid: '#ffa726', core: '#fff3c4' };

const W = 420, H = 180;
const FIRE_X = 100;          // centre of the flame
const BASE_Y = 148;          // where the fire meets the hearth
const COL_X = 200;           // the numbers column

/**
 * The streak, on fire.
 *
 * The flame is the number: it grows with the current streak and there is one
 * ember in the bed per day of it, so a ten-day streak is literally ten coals and
 * a tall fire. Let it lapse and the fire goes out — a dead pet gets a cold hearth
 * and a wisp of smoke, and nothing on the card moves.
 */

/**
 * One tongue of flame, base-centred at (x, y). Leans right and curls at the tip,
 * which is what keeps it from reading as a leaf.
 */
function flamePath(x, y, w, h) {
  const hw = w / 2;
  return `M${(x - hw).toFixed(1)} ${y}` +
    `C${(x - hw).toFixed(1)} ${(y - h * 0.42).toFixed(1)} ${(x - w * 0.3).toFixed(1)} ${(y - h * 0.58).toFixed(1)} ${(x - w * 0.08).toFixed(1)} ${(y - h).toFixed(1)}` +
    `C${(x + w * 0.12).toFixed(1)} ${(y - h * 0.74).toFixed(1)} ${(x + w * 0.2).toFixed(1)} ${(y - h * 0.68).toFixed(1)} ${(x + w * 0.08).toFixed(1)} ${(y - h * 0.5).toFixed(1)}` +
    `C${(x + w * 0.42).toFixed(1)} ${(y - h * 0.54).toFixed(1)} ${(x + hw).toFixed(1)} ${(y - h * 0.26).toFixed(1)} ${(x + hw).toFixed(1)} ${y}Z`;
}

module.exports = function renderStreak(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const lbl = ctx.cfg.labels.streak;
  const s = ctx.streak || {};
  const current = Math.max(0, Number(s.current) || 0);

  const hot = desaturate(FIRE.hot, pal.sat);
  const gold = desaturate(FIRE.mid, pal.sat);
  const core = desaturate(FIRE.core, pal.sat);

  // The fire is fed by the streak: taller and wider every day, up to a point
  // where the card runs out of room and it just roars in place.
  const lit = current > 0 && !dead;
  const h = Math.min(98, 30 + current * 7);
  const w = Math.min(76, 30 + current * 4.4);

  const glow = lit
    ? '<defs><radialGradient id="stkGlow" cx="0.5" cy="0.5" r="0.5">' +
      `<stop offset="0" stop-color="${gold}" stop-opacity="0.28"/>` +
      `<stop offset="1" stop-color="${gold}" stop-opacity="0"/></radialGradient></defs>` +
      `<ellipse cx="${FIRE_X}" cy="${(BASE_Y - h * 0.45).toFixed(1)}" rx="${(w * 1.5).toFixed(1)}" ry="${(h * 0.9).toFixed(1)}" fill="url(#stkGlow)"/>`
    : '';

  const hearth =
    `<ellipse cx="${FIRE_X}" cy="${BASE_Y + 2}" rx="${(w * 0.72).toFixed(1)}" ry="7" fill="${lit ? gold : pal.dim}" opacity="${lit ? 0.22 : 0.12}"/>` +
    `<rect x="${FIRE_X - 34}" y="${BASE_Y}" width="68" height="6" rx="3" fill="${pal.ground}"/>` +
    `<rect x="${FIRE_X - 22}" y="${BASE_Y + 5}" width="44" height="4" rx="2" fill="${pal.ground}" opacity="0.7"/>`;

  const fire = lit
    ? `<g class="f1"><path d="${flamePath(FIRE_X, BASE_Y, w, h)}" fill="${hot}" opacity="0.92"/></g>` +
      `<g class="f2"><path d="${flamePath(FIRE_X + 1, BASE_Y, w * 0.66, h * 0.7)}" fill="${gold}" opacity="0.95"/></g>` +
      `<g class="f3"><path d="${flamePath(FIRE_X + 2, BASE_Y, w * 0.32, h * 0.4)}" fill="${core}" opacity="0.85"/></g>`
    : // Out. A cold pile and one thread of smoke going nowhere.
      `<path d="M${FIRE_X - 16} ${BASE_Y} q16 -14 32 0 z" fill="${pal.dim}" opacity="0.5"/>` +
      `<path d="M${FIRE_X} ${BASE_Y - 12} c-10 -12 10 -18 0 -30 c-8 -10 6 -14 2 -22" fill="none" stroke="${pal.dim}" stroke-width="2" stroke-linecap="round" opacity="0.4">` +
      (dead ? '' : '<animate attributeName="opacity" values="0.4;0.15;0.4" dur="4s" repeatCount="indefinite"/>') +
      '</path>';

  const embers = lit
    ? [0, 1, 2].map((i) =>
      `<rect class="em" style="animation-delay:${(i * 0.8).toFixed(1)}s" x="${FIRE_X - 12 + i * 13}" y="${BASE_Y - h - 4}" width="3" height="3" fill="${gold}" opacity="0"/>`).join('')
    : '';

  // One coal per day of the streak, so the count is legible without reading a
  // number. Past fourteen the bed is full and the last coal carries a "+".
  const coals = Math.min(current, 14);
  const coalW = 9;
  const coalX = FIRE_X - (coals * coalW) / 2;
  const coalBed = Array.from({ length: coals }, (_, i) =>
    `<rect x="${(coalX + i * coalW).toFixed(1)}" y="163" width="6" height="6" rx="1.5" fill="${lit ? gold : pal.dim}" opacity="${lit ? 0.55 + (i / Math.max(1, coals)) * 0.45 : 0.25}"${lit ? ` class="coal" style="animation-delay:${(i * 0.18).toFixed(2)}s"` : ''}/>`).join('') +
    (current > 14 ? `<text class="mono dim" x="${(coalX + coals * coalW + 4).toFixed(1)}" y="169" font-size="9">+${current - 14}</text>` : '');

  // The number itself, in the pixel type the rest of the repo uses.
  const num = String(current);
  const scale = fitScale(num, 120, { min: 3, max: 7 });
  const numY = 96 - GLYPH_H * scale;
  const numW = textWidth(num, scale);

  const style = `${baseStyle(pal, dead)}
    .fnum{font-size:11px;fill:${pal.dim}}
    ${lit ? `
    .f1{animation:fl1 1.15s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .f2{animation:fl2 0.87s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .f3{animation:fl3 0.61s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .em{animation:em 2.4s ease-out infinite}
    .coal{animation:coal 2.8s ease-in-out infinite}
    @keyframes fl1{0%,100%{transform:scale(1,1) translateX(0)}30%{transform:scale(.94,1.06) translateX(-1.5px)}65%{transform:scale(1.05,.95) translateX(1.5px)}}
    @keyframes fl2{0%,100%{transform:scale(1.03,.96) translateX(1px)}45%{transform:scale(.93,1.1) translateX(-2px)}}
    @keyframes fl3{0%,100%{transform:scale(1,1)}50%{transform:scale(.88,1.14)}}
    @keyframes em{0%{opacity:0;transform:translate(0,0)}15%{opacity:.9}100%{opacity:0;transform:translate(-6px,-34px)}}
    @keyframes coal{0%,100%{opacity:.5}50%{opacity:1}}` : ''}`;

  const body =
    glow + hearth + fire + embers + coalBed +
    `<text class="mono lbl" x="${COL_X}" y="42">${esc(lbl.current)}</text>` +
    glyphRects(num, { x: COL_X, y: numY, scale, fill: lit ? gold : pal.dim }) +
    `<text class="mono fnum" x="${COL_X + numW + 8}" y="94">${esc(lbl.days)}</text>` +
    `<text class="mono lbl" x="${COL_X}" y="130">${esc(lbl.longest)}</text>` +
    `<text class="mono med" x="${COL_X}" y="152">${s.longest || 0}</text>` +
    `<text class="mono lbl" x="${COL_X + 104}" y="130">${esc(lbl.activeDays)}</text>` +
    `<text class="mono med" x="${COL_X + 104}" y="152">${s.activeDays || 0}</text>`;

  return svgDoc({
    w: W, h: H, pal, id: 'stk', style,
    title: `Current streak ${current} days, longest ${s.longest || 0} days`,
    desc: lit ? `The fire is ${current} days tall` : 'The fire is out',
    body,
  });
};
