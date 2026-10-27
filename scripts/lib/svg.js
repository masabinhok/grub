'use strict';

/**
 * SVG primitives shared by every card.
 *
 * Constraint worth remembering before adding anything here: GitHub serves README
 * images through its camo proxy inside an <img>, which is sandboxed. No external
 * fonts, no external CSS, no JS, no working links. Everything must be inline and
 * self-contained, which is why text uses a system monospace stack and the pixel
 * art is plain <rect> runs.
 */

const CELL = 9;

const FONT = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace';

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Collapse a char grid into horizontal runs of <rect>, one per colour change.
 * `cell` defaults to the sprite grid size; pass a smaller one for incidental
 * pixel art that should not be 9px per pixel.
 */
function pixelRects(grid, palette, cell = CELL) {
  const out = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (!palette[ch]) { x += 1; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w += 1;
      out.push(`<rect x="${x * cell}" y="${y * cell}" width="${w * cell}" height="${cell}" fill="${palette[ch]}"/>`);
      x += w;
    }
  });
  return out.join('');
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > maxChars) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/** Styles every card shares, so the whole README reads as one system. */
function baseStyle(pal, dead) {
  return `
    .mono{font-family:${FONT}}
    .lbl{font-size:9.5px;letter-spacing:1.6px;fill:${pal.dim}}
    .big{font-size:31px;font-weight:700;fill:${pal.ink}}
    .med{font-size:15px;font-weight:700;fill:${pal.ink}}
    .sm{font-size:11px;fill:${pal.ink}}
    .dim{font-size:11px;fill:${pal.dim}}
    ${dead ? '' : `
    .pulse{animation:pulse 3.4s ease-in-out infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.62}}`}`;
}

/**
 * Wraps body content in a themed card with a gradient background and border.
 *
 * EXPERIMENTAL: a palette carrying `bare: true` (set by --bare, see
 * scripts/lib/cli.js) drops the background and the border, leaving the artwork
 * to sit directly on the README page. Everything else renders identically, so
 * the two modes cannot drift apart.
 *
 * The flag rides on the palette rather than the argument list because every
 * generator already threads `pal` through to here — this way the mode reaches
 * all ten cards without editing any of them.
 *
 * Read the caveat in docs/development.md before using it for real: the card
 * background is the only reason the light-coloured type is legible, and GitHub
 * renders READMEs on white as readily as on black.
 */
/**
 * Tactical HUD dressing for a palette carrying `hud: true`: corner brackets on
 * every card, and on boxed cards a faint scanline texture with a slow sweep
 * line. The sweep stops when the pet is dead (sat 0), like every other motion.
 */
function hudChrome(w, h, id, pal) {
  const L = 14, i = 5;
  const brackets = `<path d="M${i} ${i + L}V${i}H${i + L}M${w - i - L} ${i}H${w - i}V${i + L}` +
    `M${w - i} ${h - i - L}V${h - i}H${w - i - L}M${i + L} ${h - i}H${i}V${h - i - L}" ` +
    `fill="none" stroke="${pal.accent}" stroke-width="1.5" stroke-opacity="0.8"/>`;
  if (pal.bare) return brackets;
  const sweep = pal.sat > 0
    ? `<rect x="0" y="0" width="${w}" height="1.5" fill="${pal.accent}" opacity="0.18">` +
      `<animate attributeName="y" values="0;${h};${h}" keyTimes="0;0.6;1" dur="7s" repeatCount="indefinite"/></rect>`
    : '';
  return `<defs><pattern id="${id}scan" width="4" height="3" patternUnits="userSpaceOnUse">` +
    '<rect width="4" height="1" fill="#ffffff" opacity="0.025"/></pattern></defs>' +
    `<rect width="${w}" height="${h}" rx="4" fill="url(#${id}scan)"/>` + sweep + brackets;
}

function svgDoc({ w, h, pal, id, title, desc, style, body }) {
  // The newline between the two rects is load-bearing: without it every card in
  // assets/ re-serialises differently and the next scheduled run commits eleven
  // files of pure whitespace churn. Bare mode leaves a blank line here instead,
  // which costs one byte and changes nothing.
  const rx = pal.hud ? 4 : 14;
  const chrome = (pal.bare ? '' :
    `<rect width="${w}" height="${h}" rx="${rx}" fill="url(#${id}bg)"/>\n` +
    `<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="${rx - 0.5}" fill="none" stroke="${pal.accent}" stroke-opacity="0.35"/>`) +
    (pal.hud ? hudChrome(w, h, id, pal) : '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${id}t ${id}d">
<title id="${id}t">${esc(title)}</title>
<desc id="${id}d">${esc(desc)}</desc>
<defs><linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${pal.bg2}"/><stop offset="1" stop-color="${pal.bg1}"/>
</linearGradient></defs>
<style>${style}
</style>
${chrome}
${body}
</svg>
`;
}

/**
 * Lowercase every run of text in a finished SVG. Tags and attributes are left
 * alone, and so is <style>: animation names and url(#id) references in CSS are
 * case-sensitive.
 */
const lowercaseText = (svg) => svg
  .split(/(<style>[\s\S]*?<\/style>)/)
  .map((part, i) => (i % 2 ? part : part.replace(/>([^<]+)</g, (_, t) => `>${t.toLowerCase()}<`)))
  .join('');

module.exports = { CELL, FONT, esc, pixelRects, wrap, baseStyle, svgDoc, lowercaseText };
