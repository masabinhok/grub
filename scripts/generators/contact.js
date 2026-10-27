'use strict';

const { esc } = require('../lib/svg');
const { ICONS } = require('../lib/icons');

const S = 30;

// Drawn here rather than borrowed: simple-icons has no plain envelope, only
// mail providers' logos.
const ENVELOPE = (stroke) =>
  `<rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="${stroke}" stroke-width="1.8"/>` +
  `<path d="M3 6.5l9 6.5 9-6.5" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linejoin="round"/>`;

/**
 * A single contact mark — `kind` is "linkedin" or "email" — sized to sit inline
 * in the README as a link. Tinted with the mood accent like every other card,
 * so the icons fade with the rest of the page.
 */
module.exports = (kind) => function renderContact(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const art = kind === 'email' ? ENVELOPE(pal.accent) : `<path d="${ICONS[kind]}" fill="${pal.accent}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${S}" height="${S}" role="img" aria-label="${esc(kind)}">
<title>${esc(kind)}</title>
${art}
</svg>
`;
};
