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
  pet: require('./pet'),
  streak: require('./streak'),
  stats: require('./stats'),
  languages: require('./languages'),
  divider: require('./divider'),
};
