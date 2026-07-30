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

/** Wraps body content in a themed card with a gradient background and border. */
function svgDoc({ w, h, pal, id, title, desc, style, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="${id}t ${id}d">
<title id="${id}t">${esc(title)}</title>
<desc id="${id}d">${esc(desc)}</desc>
<defs><linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${pal.bg2}"/><stop offset="1" stop-color="${pal.bg1}"/>
</linearGradient></defs>
<style>${style}
</style>
<rect width="${w}" height="${h}" rx="14" fill="url(#${id}bg)"/>
<rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="13.5" fill="none" stroke="${pal.accent}" stroke-opacity="0.35"/>
${body}
</svg>
`;
}

module.exports = { CELL, FONT, esc, pixelRects, wrap, baseStyle, svgDoc };
