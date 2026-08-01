'use strict';

/**
 * The component registry — the single place a card is wired in.
 *
 * Each module exports render(state, ctx) -> SVG string, and the key here is both
 * the `--only <name>` argument and the output filename (`<name>.svg`). Adding a
 * card means one file plus one line here, and a matching entry under
 * `components` in grub.config.json if it should be togglable.
 */

module.exports = {
  banner: require('./banner'),
  cta: require('./cta'),
  pet: require('./pet'),
  streak: require('./streak'),
  eye: require('./eye'),
  star: require('./star'),
  stats: require('./stats'),
  languages: require('./languages'),
  divider: require('./divider'),
  marquee: require('./marquee'),
  inventory: require('./inventory'),
};
