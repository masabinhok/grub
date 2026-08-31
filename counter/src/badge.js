/**
 * The badge SVG, hand-written, no dependencies — same rule the rest of this repo
 * runs under (see scripts/lib/svg.js).
 *
 * Everything here is a copy of the shared identity rather than an import: a
 * Worker bundle cannot reach into scripts/lib/, and vendoring ~60 lines of grid
 * beats wiring a build step into a repo whose whole point is not having one.
 * The sprite is the `thriving` grub from scripts/lib/sprites.js, the colours are
 * the `thriving` palette from scripts/lib/palette.js, and the digits are the 5x7
 * font from scripts/lib/glyphs.js. Change those and change these.
 *
 * Two deliberate differences from the cards in assets/:
 *
 * 1. Pixels are emitted as <path> runs, not <rect>. Identical geometry, about a
 *    quarter of the bytes — which is what keeps a 16x16 sprite plus six pixel
 *    digits inside the ~4KB budget for something that ships on every request.
 * 2. No mood. The Worker has no access to pet-state.json, so the grub on the
 *    badge is always the healthy one. The counter is not part of the simulation.
 *
 * The card paints its own opaque background, so it reads the same on GitHub
 * light and dark. That is on purpose and not a preference: camo-proxied images
 * are sandboxed, and prefers-color-scheme inside them is not reliably honoured,
 * so a media query would be a coin flip rather than a theme.
 */

const PAL = {
  x: '#5fd99a', w: '#ffffff', b: '#0d2018', m: '#ff6f8f', t: '#ffd24c',
  bg1: '#0d2018', bg2: '#173d2b', ink: '#e6fff2', dim: '#79c9a4', accent: '#5fd99a',
};

const GRUB = [
  '.......tt.......', '.......tt.......', '....xxxxxxxx....', '..xxxxxxxxxxxx..',
  '.xxxxxxxxxxxxxx.', '.xxwwwxxxxwwwxx.', '.xxwbwxxxxwbwxx.', '.xxwwwxxxxwwwxx.',
  '.xxxxxxxxxxxxxx.', '.xxxxmmmmmmxxxx.', '.xxxxxmmmmxxxxx.', '.xxxxxxxxxxxxxx.',
  '..xxxxxxxxxxxx..', '...xxxxxxxxxx...', '...xx......xx...', '..xxx......xxx..',
];

const GLYPHS = {
  '0': ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['#####', '...#.', '..##.', '....#', '....#', '#...#', '.###.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ',': ['..', '..', '..', '..', '##', '##', '#.'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
};
const GLYPH_H = 7;

const FONT = 'ui-monospace,SFMono-Regular,Menlo,Consolas,"DejaVu Sans Mono",monospace';

const LABEL = 'PROFILE VIEWS';
const LABEL_PX = 9.5;
const LABEL_TRACK = 1.6;
// Monospace advance is ~0.6em across every family in the stack above. The width
// only decides the canvas, so an approximation is fine — it just has to be an
// over-estimate, never an under-estimate, or the text clips.
const LABEL_W = Math.ceil(LABEL.length * (LABEL_PX * 0.6 + LABEL_TRACK));

const CELL = 2;          // sprite pixel size -> 16x16 grid renders at 32x32
const SCALE = 2;         // digit pixel size  -> 5x7 glyph renders at 10x14
const TRACK = 1;         // inter-glyph gap, in glyph pixels
const PAD = 9;
const H = 40;
const SPRITE = 16 * CELL;
const TEXT_X = PAD + SPRITE + 10;
// Digits sit under the label, five pixels off the bottom edge.
const NUM_Y = H - 5 - GLYPH_H * SCALE;

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** 1234567 -> "1,234,567" */
const groupDigits = (n) => String(Math.max(0, Math.round(Number(n) || 0)))
  .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const glyphFor = (ch) => GLYPHS[ch] || GLYPHS['?'];

function textWidth(text) {
  const chars = String(text).split('');
  if (!chars.length) return 0;
  const units = chars.reduce((a, ch) => a + glyphFor(ch)[0].length, 0) + TRACK * (chars.length - 1);
  return units * SCALE;
}

/** One <path> per colour, each a chain of horizontal runs. */
function spritePaths(grid, palette, cell, ox, oy) {
  const byFill = new Map();
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      const fill = palette[ch];
      if (!fill) { x += 1; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w += 1;
      const px = ox + x * cell;
      byFill.set(fill, (byFill.get(fill) || '') +
        `M${px} ${oy + y * cell}h${w * cell}v${cell}h-${w * cell}z`);
      x += w;
    }
  });
  return [...byFill].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('');
}

/** The number, as one path — every digit shares a fill. */
function glyphPath(text, x, y, fill) {
  let d = '';
  let pen = x;
  for (const ch of String(text)) {
    const grid = glyphFor(ch);
    grid.forEach((row, ry) => {
      let rx = 0;
      while (rx < row.length) {
        if (row[rx] !== '#') { rx += 1; continue; }
        let w = 1;
        while (rx + w < row.length && row[rx + w] === '#') w += 1;
        d += `M${pen + rx * SCALE} ${y + ry * SCALE}h${w * SCALE}v${SCALE}h-${w * SCALE}z`;
        rx += w;
      }
    });
    pen += (grid[0].length + TRACK) * SCALE;
  }
  return `<path fill="${fill}" d="${d}"/>`;
}

/**
 * @param {number} total  views counted so far
 * @param {boolean} counted  whether the request being served was itself counted
 */
export function renderBadge(total, counted) {
  const num = groupDigits(total);
  const w = TEXT_X + Math.max(LABEL_W, textWidth(num)) + PAD;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-labelledby="vt vd">
<title id="vt">${esc(num)} profile README renders</title>
<desc id="vd">Times GitHub's camo proxy fetched this badge. Not unique visitors.</desc>
<defs><linearGradient id="vbg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${PAL.bg2}"/><stop offset="1" stop-color="${PAL.bg1}"/>
</linearGradient></defs>
<style>.mono{font-family:${FONT}}
.lbl{font-size:${LABEL_PX}px;letter-spacing:${LABEL_TRACK}px;fill:${PAL.dim}}
${counted ? '.pulse{animation:pulse 3.4s ease-in-out infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.62}}' : ''}
</style>
<rect width="${w}" height="${H}" rx="10" fill="url(#vbg)"/>
<rect x="0.75" y="0.75" width="${w - 1.5}" height="${H - 1.5}" rx="9.25" fill="none" stroke="${PAL.accent}" stroke-opacity="0.35"/>
${spritePaths(GRUB, PAL, CELL, PAD, (H - SPRITE) / 2)}
<text class="mono lbl" x="${TEXT_X}" y="16">${LABEL}</text>
<g${counted ? ' class="pulse"' : ''}>${glyphPath(num, TEXT_X, NUM_Y, PAL.ink)}</g>
</svg>
`;
}
