'use strict';

/** Sprites — 16x16 char grids. '.' is transparent, every other char is a palette key. */

const SPRITES = {
  thriving: [
    '.......tt.......', '.......tt.......', '....xxxxxxxx....', '..xxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxx.', '.xxwwwxxxxwwwxx.', '.xxwbwxxxxwbwxx.', '.xxwwwxxxxwwwxx.',
    '.xxxxxxxxxxxxxx.', '.xxxxmmmmmmxxxx.', '.xxxxxmmmmxxxxx.', '.xxxxxxxxxxxxxx.',
    '..xxxxxxxxxxxx..', '...xxxxxxxxxx...', '...xx......xx...', '..xxx......xxx..',
  ],
  hungry: [
    '......tt........', '.......t........', '.....xxxxxx.....', '..xxxxxxxxxxxx..',
    '.xxxxxxxxxxxxxx.', '.xxwwwxxxxwwwxx.', '.xxbwwxxxxbwwxx.', '.xxwwwxxxxwwwxx.',
    '.xxxxxxxxxxxxxx.', '.xxxxxxxxxxxxxx.', '.xxxxxmmmmxxxxx.', '.xxxxxxxxxxxxxx.',
    '..xxxxxxxxxxxx..', '...xxxxxxxxxx...', '...xx......xx...', '..xxx......xxx..',
  ],
  feral: [
    '................', '.....t..........', '.....xxxxxx.....', '...xxxxxxxxxx...',
    '..xxxxxxxxxxxx..', '..xwwwxxxxwwwx..', '..xwbwxxxxwbwx..', '..xwwwxxxxwwwx..',
    '..xxxxxxxxxxxx..', '..xxmxmxmxmxxx..', '..xxxmxmxmxxxx..', '..xdxxxxxxxxdx..',
    '..xdxxxxxxxxdx..', '...xxxxxxxxxx...', '...x........x...', '..xx........xx..',
  ],
  deceased: [
    '................', '....ssssssss....', '..ssssssssssss..', '.ssssssssssssss.',
    '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.',
    '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.', '.ssssssssssssss.',
    '.ssssssssssssss.', 'gggggggggggggggg', 'gggggggggggggggg', '................',
  ],
};

/**
 * The feeding theatre. Neither of these is 16x16 or mood-keyed, so they sit
 * outside SPRITES and skip the validation below. Both are drawn at a small cell
 * size — they are props, not characters.
 *
 * '#' takes the tint the caller passes; 'o' is the highlight. The food itself
 * lives in lib/snacks.js, which uses the same format and is extensible from
 * grub.config.json.
 */
const HEART = [
  '.##.##.',
  '#######',
  '#######',
  '.#####.',
  '..###..',
  '...#...',
];

/** The little burst of delight, four-pointed and unsubtle. */
const SPARKLE = [
  '..#..',
  '..#..',
  '#####',
  '..#..',
  '..#..',
];

for (const [name, grid] of Object.entries(SPRITES)) {
  if (grid.length !== 16 || grid.some((r) => r.length !== 16)) {
    throw new Error(`sprite "${name}" is not 16x16`);
  }
}

module.exports = { SPRITES, HEART, SPARKLE };
