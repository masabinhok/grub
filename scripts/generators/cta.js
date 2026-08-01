'use strict';

const { esc, pixelRects, baseStyle, svgDoc } = require('../lib/svg');
const { SPRITES } = require('../lib/sprites');

const W = 840, H = 64;
const PAD = 18;
const CELL = 2;                       // 16x16 sprite at 2px a pixel — 32 square
const FS = 12.5, TRACK = 1.6;         // the button's type
const CHAR_W = FS * 0.62 + TRACK;

/**
 * The adoption card: a button-shaped invitation to run one of these yourself.
 *
 * It is a picture, like everything else here — an SVG inside an <img> cannot
 * carry a working hyperlink, so the README wraps it in an <a>. That is also why
 * the destination is written out in text on the card: somebody reading it as a
 * flat image still gets the address.
 *
 * A fork keeps `cta.upstream` pointed at the original by default, so every fork
 * quietly advertises the template it came from. Point it at yourself if you would
 * rather it advertised you, or switch the card off in `components`.
 */
module.exports = function renderCta(state, ctx) {
  const mood = state.mood;
  const pal = ctx.palettes[mood];
  const dead = mood === 'deceased';
  const lbl = ctx.cfg.labels.cta;
  const upstream = String(ctx.cfg.cta.upstream || '').trim();

  const button = String(lbl.button);
  const bw = Math.max(186, Math.round(button.length * CHAR_W) + 52);
  const bx = W - PAD - bw, by = (H - 34) / 2;

  const style = `${baseStyle(pal, dead)}
    .cta{font-size:13px;font-weight:700;letter-spacing:2.2px;fill:${pal.ink}}
    .ctasub{font-size:10px;letter-spacing:0.6px;fill:${pal.dim}}
    .btn{font-size:${FS}px;font-weight:700;letter-spacing:${TRACK}px;fill:${pal.accent}}
    .repo{fill:${pal.accent};font-weight:700}
    ${dead ? '' : `
    .nudge{animation:nudge 3.6s ease-in-out infinite}
    @keyframes nudge{0%,88%,100%{transform:translateX(0)}94%{transform:translateX(4px)}}`}`;

  // The creature's current mood rides along on the card. It is the honest advert:
  // this is what the thing you are about to fork looks like right now.
  const chip =
    `<g transform="translate(${PAD} ${(H - 16 * CELL) / 2})">${pixelRects(SPRITES[mood], pal, CELL)}</g>`;

  const TX = PAD + 16 * CELL + 16;
  const text =
    `<text class="mono cta" x="${TX}" y="${H / 2 - 3}">${esc(lbl.title)}</text>` +
    `<text class="mono ctasub" x="${TX}" y="${H / 2 + 15}">` +
    (upstream ? `<tspan class="repo">${esc(upstream)}</tspan> · ` : '') +
    `${esc(lbl.sub)}</text>`;

  const cta =
    `<g${dead ? '' : ' class="pulse"'}>` +
    `<rect x="${bx}" y="${by}" width="${bw}" height="34" rx="9" fill="${pal.bg1}" ` +
    `stroke="${pal.accent}" stroke-opacity="0.75" stroke-width="1.5"/>` +
    `<text class="mono btn" x="${bx + bw / 2 - 9}" y="${by + 22}" text-anchor="middle">${esc(button)}</text>` +
    `<g${dead ? '' : ' class="nudge"'}><text class="mono btn" x="${bx + bw - 18}" y="${by + 22}" text-anchor="middle">&#8594;</text></g>` +
    '</g>';

  return svgDoc({
    w: W, h: H, pal, id: 'cta', style,
    title: `${lbl.title} — ${upstream || ctx.cfg.petName}`,
    desc: `${lbl.button}${upstream ? ` at github.com/${upstream}` : ''}. ${lbl.sub}.`,
    body: chip + text + cta,
  });
};
