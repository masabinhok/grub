'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');

const W = 840, H = 152;
const DAYS = 30;
const GROUND = 140;          // street level
const LEFT = 40;             // first building's front-left corner
const PITCH = 25;            // building to building
const FACE = 16;             // front face width
const DX = 8, DY = 5;        // isometric depth offset of the side and roof
const MAX_H = 112;           // tallest building above the street
const STUB = 5;              // a quiet day is still a building, just a low one
const WIN = 4, WIN_GAP = 3;  // window size and spacing on the front face
const TWO_COLS = [3, 3 + WIN + WIN_GAP + 2];
const ONE_COL = [(FACE - WIN) / 2];

/**
 * Which building a day gets: the park for no views, then the remaining styles
 * spread evenly up to the busiest day, so the bands follow the data rather than
 * a fixed step and adding a style re-spreads them on its own.
 */
const band = (n, peak, styles) => (n === 0 ? 0 : Math.min(styles - 1, Math.ceil((n * (styles - 1)) / peak)));

/**
 * A night city, one isometric building per day for the last month. A building's
 * height and its lit windows are that day's count from views.json — renders of
 * the profile README, though the card deliberately never says so. Days are UTC,
 * the same buckets the Worker counts in. The style climbs with the count, Tokyo
 * at night: torii or sakura, izakaya, pencil building, billboard, skyscraper.
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

  // An iso block: right side, roof, front — painter's order. `d` scales the depth
  // so a setback can stand inside the roof below it.
  const box = (x, bottom, top, face, roofOp, d = 1) =>
    `<path d="M${x + face} ${bottom}V${top}l${DX * d} ${-DY * d}V${bottom - DY * d}Z" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.3"/>` +
    `<path d="M${x} ${top}l${DX * d} ${-DY * d}h${face}l${-DX * d} ${DY * d}Z" fill="${pal.accent}" fill-opacity="${roofOp}" stroke="${pal.accent}" stroke-opacity="0.5"/>` +
    `<rect x="${x}" y="${top}" width="${face}" height="${bottom - top}" fill="${pal.bg2}" stroke="${pal.accent}" stroke-opacity="0.4"/>`;

  // Windows fill bottom-up, one lit per count. Whatever the wall is too short to
  // hold simply is not drawn.
  const windows = (x, h, n, i, cols) => {
    const floors = Math.max(0, Math.floor((h - 6) / (WIN + WIN_GAP)));
    let lit = n, out = '';
    for (let f = 0; f < floors; f += 1) {
      cols.forEach((ox, c) => {
        const wy = GROUND - 6 - (f + 1) * (WIN + WIN_GAP) + WIN_GAP;
        // A few lit windows flicker, offset per building, so the city looks lived in.
        const on = lit > 0;
        out += pane(on ? ((f + c + i) % 5 === 0 ? 'win on fl' : 'win on') : 'win', x + ox, wy, on ? ((i * 0.37 + f * 0.6) % 3).toFixed(2) : 0);
        if (on) lit -= 1;
      });
    }
    return out;
  };

  const red = pal.m || pal.accent, glow = pal.t || pal.accent;

  // Quiet to busy, Tokyo at night. Each returns its markup and `tip`, the y of its
  // highest point above the roof's centre line, which is where today's beacon goes.
  const BUILDINGS = [
    // No views: nothing built. A torii, or on alternate days a sakura tree.
    (x, h, n, i) => {
      const cx = x + FACE / 2 + DX / 2, gy = GROUND - DY / 2;
      const plot = `<path d="M${x} ${GROUND}l${DX} ${-DY}h${FACE}l${-DX} ${DY}Z" fill="${pal.accent}" fill-opacity="0.1" stroke="${pal.accent}" stroke-opacity="0.25"/>`;
      if (i % 2) {
        return {
          tip: gy - 13,
          svg: plot + `<line x1="${cx}" y1="${gy}" x2="${cx}" y2="${gy - 5}" stroke="${pal.dim}"/>` +
            `<circle cx="${cx}" cy="${gy - 8}" r="4.5" fill="${red}" fill-opacity="0.3" stroke="${red}" stroke-opacity="0.6"/>`,
        };
      }
      return {
        tip: gy - 16,
        svg: plot + `<g fill="${red}" fill-opacity="0.85">` +
          `<rect x="${cx - 5}" y="${gy - 13}" width="1.5" height="13"/><rect x="${cx + 3.5}" y="${gy - 13}" width="1.5" height="13"/>` +
          `<path d="M${cx - 8} ${gy - 15.5}Q${cx} ${gy - 13.5} ${cx + 8} ${gy - 15.5}V${gy - 13.5}Q${cx} ${gy - 12} ${cx - 8} ${gy - 13.5}Z"/>` +
          `<rect x="${cx - 6}" y="${gy - 11}" width="12" height="1.2"/></g>`,
      };
    },
    // An izakaya: a low shop with an awning and a red lantern by the door.
    (x, h, n, i, roofOp) => {
      const top = GROUND - h, aw = GROUND - Math.min(11, h - 3);
      return {
        tip: top - DY / 2,
        svg: box(x, GROUND, top, FACE, roofOp) +
          windows(x, GROUND - aw, n, i, ONE_COL) +
          `<path d="M${x - 1} ${aw}h${FACE + 2}l-3 3h${-(FACE - 4)}Z" fill="${pal.accent}" fill-opacity="0.5" stroke="${pal.accent}" stroke-opacity="0.6"/>` +
          `<circle cx="${x + 2.5}" cy="${aw + 6}" r="4" fill="${red}" fill-opacity="0.2"/>` +
          `<ellipse cx="${x + 2.5}" cy="${aw + 6}" rx="1.6" ry="2" fill="${red}"/>`,
      };
    },
    // A pencil building with a vertical neon sign down its front edge.
    (x, h, n, i, roofOp) => {
      const top = GROUND - h, sh = Math.max(8, Math.round(h * 0.55));
      return {
        tip: top - DY / 2,
        svg: box(x, GROUND, top, FACE, roofOp) + windows(x, h, n, i, TWO_COLS) +
          `<rect class="${i % 3 ? '' : 'fl'}" x="${x - 3}" y="${top + 4}" width="3.5" height="${sh}" fill="${red}" fill-opacity="0.9" style="animation-delay:${(i * 0.53 % 3).toFixed(2)}s"/>` +
          `<path d="${Array.from({ length: Math.floor(sh / 5) }, (_, k) => `M${x - 2.4} ${top + 6.5 + k * 5}h2.3`).join('')}" stroke="${pal.bg1}" stroke-opacity="0.8"/>`,
      };
    },
    // A mid-rise with a lit billboard standing on the roof.
    (x, h, n, i, roofOp) => {
      const top = GROUND - h, bx = x + DX * 0.6, by = top - DY * 0.6 - 9;
      return {
        tip: by - 1,
        svg: box(x, GROUND, top, FACE, roofOp) + windows(x, h, n, i, TWO_COLS) +
          `<path d="M${bx + 3} ${by + 7}V${top - DY * 0.6}M${bx + FACE - 3} ${by + 7}V${top - DY * 0.6}" stroke="${pal.dim}" stroke-opacity="0.8"/>` +
          `<rect x="${bx}" y="${by}" width="${FACE}" height="7" fill="${glow}" fill-opacity="0.25" stroke="${glow}" stroke-opacity="0.9"/>` +
          `<path d="M${bx + 3} ${by + 2.5}h${FACE - 6}M${bx + 3} ${by + 4.5}h${FACE - 9}" stroke="${glow}" stroke-opacity="0.8"/>`,
      };
    },
    // A skyscraper: a lit crown and red aircraft-warning lights on its corners.
    (x, h, n, i, roofOp) => {
      const top = GROUND - h;
      return {
        tip: top - DY - 2,
        svg: box(x, GROUND, top, FACE, roofOp) + windows(x, h, n, i, TWO_COLS) +
          `<rect x="${x}" y="${top}" width="${FACE}" height="3" fill="${glow}" fill-opacity="0.3"/>` +
          `<circle class="av" cx="${x + 1}" cy="${top - 1}" r="1.4" fill="${red}"/>` +
          `<circle class="av" cx="${x + FACE + DX - 1}" cy="${top - DY - 1}" r="1.4" fill="${red}" style="animation-delay:.6s"/>`,
      };
    },
  ];

  const towers = days.map((d, i) => {
    const x = LEFT + i * PITCH;
    const h = STUB + Math.round((d.n / peak) * (MAX_H - STUB));
    const last = i === DAYS - 1;
    const b = BUILDINGS[band(d.n, peak, BUILDINGS.length)](x, h, d.n, i, last ? 0.55 : 0.28);
    const cx = x + FACE / 2 + DX / 2;

    const beacon = last && !dead
      ? `<circle class="beacon" cx="${cx}" cy="${b.tip - 5}" r="2.5" fill="${pal.m || pal.accent}"/>` +
        `<line x1="${cx}" y1="${b.tip}" x2="${cx}" y2="${b.tip - 4}" stroke="${pal.dim}"/>`
      : '';

    return `<g class="tw" style="animation-delay:${(i * 0.04).toFixed(2)}s">` +
      `<title>${esc(d.date)}: ${d.n}</title>` +
      b.svg + beacon + '</g>';
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
    .av{animation:blinkb 2.4s ease-in-out infinite}
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

module.exports.band = band;
