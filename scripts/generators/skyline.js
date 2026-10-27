'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');

const W = 840, H = 152;
const DAYS = 30;
const GROUND = 140;          // street level
const LEFT = 40;             // first tower's front-left corner
const PITCH = 25;            // tower to tower
const FACE = 16;             // front face width
const DX = 8, DY = 5;        // isometric depth offset of the side and roof
const MAX_H = 112;           // tallest tower above the street
const STUB = 5;              // a quiet day is still a building, just a low one
const WIN = 4, WIN_GAP = 3;  // window size and spacing on the front face

/**
 * A night city, one isometric tower per day for the last month. A tower's height
 * and its lit windows are that day's count from views.json — renders of the
 * profile README, though the card deliberately never says so. Days are UTC, the
 * same buckets the Worker counts in.
 *
 * Height scales to the busiest day in the window, but never below 5, so a month
 * of zeros and ones reads as a low skyline rather than a row of towers maxed out.
 */
module.exports = function renderSkyline(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const history = (ctx.watchers && ctx.watchers.profileViewDays) || {};
  const now = ctx.now || new Date();

  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(today - (DAYS - 1 - i) * 86400000).toISOString().slice(0, 10);
    return { date, n: Math.max(0, Number(history[date]) || 0) };
  });
  const peak = Math.max(5, ...days.map((d) => d.n));
  const pane = (cls, x, y, delay) =>
    `<rect class="${cls}" x="${x}" y="${y}" width="${WIN}" height="${WIN}"${delay ? ` style="animation-delay:${delay}s"` : ''}/>`;

  const towers = days.map((d, i) => {
    const x = LEFT + i * PITCH;
    const h = STUB + Math.round((d.n / peak) * (MAX_H - STUB));
    const top = GROUND - h;
    const last = i === DAYS - 1;

    // Windows fill bottom-up, two to a floor, one lit per count. Whatever the
    // tower is too short to hold simply is not drawn.
    const floors = Math.max(0, Math.floor((h - 6) / (WIN + WIN_GAP)));
    let lit = d.n, wins = '';
    for (let f = 0; f < floors; f += 1) {
      for (let c = 0; c < 2; c += 1) {
        const wx = x + 3 + c * (WIN + WIN_GAP + 2), wy = GROUND - 6 - (f + 1) * (WIN + WIN_GAP) + WIN_GAP;
        // A few lit windows flicker, offset per tower, so the city looks lived in.
        const on = lit > 0;
        wins += pane(on ? ((f + c + i) % 5 === 0 ? 'win on fl' : 'win on') : 'win', wx, wy, on ? ((i * 0.37 + f * 0.6) % 3).toFixed(2) : 0);
        if (on) lit -= 1;
      }
    }

    const beacon = last && !dead
      ? `<circle class="beacon" cx="${x + FACE / 2 + DX / 2}" cy="${top - DY / 2 - 5}" r="2.5" fill="${pal.m || pal.accent}"/>` +
        `<line x1="${x + FACE / 2 + DX / 2}" y1="${top - DY / 2}" x2="${x + FACE / 2 + DX / 2}" y2="${top - DY / 2 - 4}" stroke="${pal.dim}"/>`
      : '';

    return `<g class="tw" style="animation-delay:${(i * 0.04).toFixed(2)}s">` +
      `<title>${esc(d.date)}: ${d.n}</title>` +
      // right side, roof, front — painter's order
      `<path d="M${x + FACE} ${GROUND}V${top}l${DX} ${-DY}V${GROUND - DY}Z" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.3"/>` +
      `<path d="M${x} ${top}l${DX} ${-DY}h${FACE}l${-DX} ${DY}Z" fill="${pal.accent}" fill-opacity="${last ? 0.55 : 0.28}" stroke="${pal.accent}" stroke-opacity="0.5"/>` +
      `<rect x="${x}" y="${top}" width="${FACE}" height="${h}" fill="${pal.bg2}" stroke="${pal.accent}" stroke-opacity="0.4"/>` +
      wins + beacon + '</g>';
  }).join('');

  // A searchlight from the street, sweeping the skyline while the pet lives.
  const light = dead ? '' :
    `<polygon points="${W - 70},${GROUND} ${W - 64},${GROUND} ${W - 180},12 ${W - 250},12" fill="url(#skyBeam)" opacity="0.5">` +
    `<animateTransform attributeName="transform" type="rotate" values="-22 ${W - 67} ${GROUND};30 ${W - 67} ${GROUND};-22 ${W - 67} ${GROUND}" dur="11s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/></polygon>`;

  const style = `${baseStyle(pal, dead)}
    .win{fill:${pal.dim};fill-opacity:0.12}
    .on{fill:${pal.t || pal.accent};fill-opacity:0.9}
    ${dead ? '' : `
    .tw{animation:rise 1.1s cubic-bezier(.2,.8,.2,1) both;transform-box:fill-box;transform-origin:50% 100%}
    .fl{animation:flick 3.2s steps(1) infinite}
    .beacon{animation:blinkb 1.3s ease-in-out infinite}
    @keyframes rise{from{transform:scaleY(0.02);opacity:0}to{transform:scaleY(1);opacity:1}}
    @keyframes flick{0%,70%{fill-opacity:.9}72%,78%{fill-opacity:.15}80%,100%{fill-opacity:.9}}
    @keyframes blinkb{0%,100%{opacity:1}50%{opacity:.1}}`}`;

  const body =
    '<defs><linearGradient id="skyBeam" x1="0" y1="1" x2="0" y2="0">' +
    `<stop offset="0" stop-color="${pal.accent}" stop-opacity="0.35"/><stop offset="1" stop-color="${pal.accent}" stop-opacity="0"/></linearGradient></defs>` +
    light + towers +
    `<line x1="${LEFT - 10}" y1="${GROUND + 0.5}" x2="${W - LEFT + 10}" y2="${GROUND + 0.5}" stroke="${pal.accent}" stroke-opacity="0.6"/>`;

  return svgDoc({
    w: W, h: H, pal, id: 'sky', style,
    title: `Sector activity over the last ${DAYS} days`,
    desc: days.map((d) => `${d.date} ${d.n}`).join(', '),
    body,
  });
};
