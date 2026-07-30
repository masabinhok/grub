'use strict';

/**
 * A 5x7 pixel font, drawn as <rect> runs.
 *
 * Why hand-rolled: GitHub sandboxes README SVGs, so @font-face and any external
 * URL are dead ends, and base64-inlining a real pixel font would add tens of KB
 * to every card. A grid is a few hundred bytes and lines up exactly with the
 * sprite work the rest of the repo already does.
 *
 * Deliberately small — digits and separators, which is all the big numbers on the
 * counter need. Long or arbitrary strings (marquee text, inventory rows, labels
 * from grub.config.json) stay as monospace <text>: they can hold any unicode a
 * user types, and one rect per lit pixel does not scale to a sentence.
 *
 * Glyph width is per-character (the comma is 2 wide, digits are 5), so numbers
 * with separators do not sit in awkward gaps.
 */

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
  '.': ['..', '..', '..', '..', '..', '##', '##'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '%': ['#..#.', '#.#..', '..#..', '.#...', '.#.#.', '#..#.', '...#.'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
  // Stands in for anything unmapped, so a surprise character is visible in the
  // output rather than silently collapsing the layout.
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
};

const GLYPH_H = 7;

const glyphFor = (ch) => GLYPHS[ch] || GLYPHS['?'];
const glyphWidth = (ch) => glyphFor(ch)[0].length;

/** Width in pixels of `text` at `scale`, including inter-glyph tracking. */
function textWidth(text, scale, tracking = 1) {
  const chars = String(text).split('');
  if (!chars.length) return 0;
  const units = chars.reduce((a, ch) => a + glyphWidth(ch), 0) + tracking * (chars.length - 1);
  return units * scale;
}

/**
 * Largest integer scale in [min, max] whose rendering of `text` fits `maxWidth`.
 * Keeps big numbers pixel-aligned instead of letting them overflow the card once
 * the count grows a digit.
 */
function fitScale(text, maxWidth, { min = 2, max = 5, tracking = 1 } = {}) {
  for (let s = max; s > min; s -= 1) {
    if (textWidth(text, s, tracking) <= maxWidth) return s;
  }
  return min;
}

/**
 * Render `text` as pixel rects. (x, y) is the top-left corner. Pass integer x, y
 * and scale and every rect lands on a whole pixel.
 */
function glyphRects(text, { x = 0, y = 0, scale = 4, tracking = 1, fill = '#fff' } = {}) {
  const out = [];
  let penX = x;
  for (const ch of String(text)) {
    const grid = glyphFor(ch);
    grid.forEach((row, ry) => {
      let rx = 0;
      while (rx < row.length) {
        if (row[rx] !== '#') { rx += 1; continue; }
        let w = 1;
        while (rx + w < row.length && row[rx + w] === '#') w += 1;
        out.push(`<rect x="${penX + rx * scale}" y="${y + ry * scale}" width="${w * scale}" height="${scale}" fill="${fill}"/>`);
        rx += w;
      }
    });
    penX += (grid[0].length + tracking) * scale;
  }
  return out.join('');
}

/** 1234567 -> "1,234,567". Keeps the pixel digits readable at a glance. */
const groupDigits = (n) => String(Math.max(0, Math.round(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

module.exports = { GLYPHS, GLYPH_H, glyphWidth, textWidth, fitScale, glyphRects, groupDigits };
