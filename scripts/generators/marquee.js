'use strict';

const { esc, baseStyle, svgDoc } = require('../lib/svg');
const { quoteOfTheDay, quotesFor } = require('../lib/copy');

const W = 840, H = 88;
const PAD = 14;                       // inset of the CRT panel inside the card
const IW = W - PAD * 2, IH = 46;      // the panel; the strip below it holds the status label
const FS = 15;                        // monospace, so width is predictable
const TRACK = 1;                      // .crt letter-spacing, below
// Advance per character. The tracking has to be in here: it is applied after
// every glyph, so leaving it out under-measures by a pixel a character — which a
// short line absorbs into the loop gap and a long one does not, colliding with
// its own next copy at the seam.
const CHAR_W = FS * 0.6 + TRACK;
const GAP = 6;                        // spaces between loop repetitions
const BASELINE = Math.round(IH / 2 + FS / 3);

/**
 * A CRT panel inside the usual rounded card — the scanlines and the moving text
 * live in the inner rect, the outer frame stays consistent with every other
 * component.
 *
 * The text is monospace <text>, not pixel glyphs: it comes from grub.config.json
 * so it can hold any unicode, and a scrolling sentence at one rect per lit pixel
 * would be several thousand rects. The pixel treatment on this card is the frame,
 * the scanlines and the block cursor.
 */
module.exports = function renderMarquee(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const cfg = ctx.cfg.marquee;
  const lbl = ctx.cfg.labels.marquee;

  // Your own text always wins. Left at null, the ticker runs a joke, a quote or
  // a fact from the pool in copy.js plus anything `copy.quotes` adds to it — a
  // new one every UTC day, so the profile has something different on it tomorrow
  // whether or not anything else changed.
  const raw = cfg.text;
  const text = (Array.isArray(raw) ? raw.filter(Boolean).join(cfg.separator) : raw) ||
    quoteOfTheDay(ctx.now, quotesFor(ctx.cfg));
  const shown = String(text);
  const textW = Math.ceil(shown.length * CHAR_W);

  // A dead pet freezes everything, here as everywhere else.
  const mode = dead ? 'static' : (cfg.mode === 'type' ? 'type' : 'scroll');

  const scanlines = Array.from({ length: Math.floor(IH / 3) }, (_, i) =>
    `<rect x="0" y="${i * 3}" width="${IW}" height="1" fill="${pal.ink}" opacity="0.05"/>`).join('');

  let content;
  if (mode === 'scroll') {
    // Two copies, one gap apart, translated by exactly one copy's width — the
    // seam lands where the first copy started, so the loop is invisible.
    const span = textW + Math.ceil(GAP * CHAR_W);
    const dur = Math.max(8, Math.round(span / 42));
    // Enough copies to cover the panel plus the distance travelled, so a line
    // shorter than the panel still reads as a continuous ticker instead of one
    // phrase crossing an empty screen.
    const copies = Math.ceil((IW + span) / span) + 1;
    const line = Array.from({ length: copies }, (_, i) =>
      `<text class="mono crt" x="${i * span}" y="${BASELINE}">${esc(shown)}</text>`).join('');
    content =
      `<g><animateTransform attributeName="transform" type="translate" from="0 0" to="${-span} 0" dur="${dur}s" repeatCount="indefinite"/>` +
      line + '</g>';
  } else if (mode === 'type') {
    // One discrete keyframe per character, so the reveal actually lands
    // character by character. A three-value animation would just pop.
    const chars = shown.length;
    const widths = Array.from({ length: chars + 1 }, (_, i) => Math.round(i * CHAR_W) + 2);
    // Hold the finished line for a beat before looping.
    const hold = Math.max(2, Math.round(chars * 0.04));
    const values = widths.concat(Array.from({ length: hold }, () => widths[chars]));
    const dur = Math.max(4, Math.round(values.length * 0.13));
    content =
      `<defs><clipPath id="mqtype"><rect x="0" y="0" height="${IH}" width="0">` +
      `<animate attributeName="width" values="${values.join(';')}" dur="${dur}s" repeatCount="indefinite" calcMode="discrete"/>` +
      '</rect></clipPath></defs>' +
      `<g clip-path="url(#mqtype)"><text class="mono crt" x="0" y="${BASELINE}">${esc(shown)}</text></g>` +
      `<rect class="caret" x="0" y="${Math.round(IH / 2 - FS / 2)}" width="${Math.round(CHAR_W)}" height="${FS}" fill="${pal.accent}">` +
      `<animate attributeName="x" values="${values.map((w) => w + 2).join(';')}" dur="${dur}s" repeatCount="indefinite" calcMode="discrete"/>` +
      '</rect>';
  } else {
    content = `<text class="mono crt" x="0" y="${BASELINE}" opacity="0.7">${esc(shown)}</text>`;
  }

  const style = `${baseStyle(pal, dead)}
    .crt{font-size:${FS}px;fill:${pal.ink};letter-spacing:${TRACK}px}
    ${dead ? '' : `.caret{animation:blip 1s steps(1) infinite}
    @keyframes blip{0%,49%{opacity:1}50%,100%{opacity:0}}
    .flicker{animation:flick 4.5s ease-in-out infinite}
    @keyframes flick{0%,96%,100%{opacity:1}97%{opacity:.82}98%{opacity:.94}}`}`;

  const body =
    `<g${dead ? '' : ' class="flicker"'}>` +
    `<rect x="${PAD}" y="${PAD}" width="${IW}" height="${IH}" rx="8" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.3"/>` +
    `<defs><clipPath id="mqpanel"><rect x="${PAD}" y="${PAD}" width="${IW}" height="${IH}" rx="8"/></clipPath></defs>` +
    `<g clip-path="url(#mqpanel)"><g transform="translate(${PAD} ${PAD})">` +
    scanlines +
    `<g transform="translate(16 0)">${content}</g>` +
    '</g></g>' +
    `<text class="mono lbl" x="${PAD}" y="${PAD + IH + 18}">${esc(lbl.title)}</text>` +
    `<text class="mono lbl" x="${W - PAD}" y="${PAD + IH + 18}" text-anchor="end" opacity="0.8" fill="${pal.accent}">${esc(dead ? lbl.dead : lbl.live)}</text>` +
    '</g>';

  return svgDoc({
    w: W, h: H, pal, id: 'mrq', style,
    title: `Marquee: ${shown}`,
    desc: dead ? 'Signal lost — the pet is deceased.' : 'Scrolling status line',
    body,
  });
};
