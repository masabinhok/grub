'use strict';

const { FONT } = require('../lib/svg');

/** A dashed rule that drifts while the pet lives and freezes when it does not. */
module.exports = function renderDivider(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const style = `
    .mono{font-family:${FONT}}
    ${dead ? '' : `.dash{animation:slide 6s linear infinite}
    @keyframes slide{to{transform:translateX(24px)}}`}`;

  const body =
    `<g class="dash"><line x1="-24" y1="6" x2="864" y2="6" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="6 18" stroke-linecap="round"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 12" width="840" height="12" role="img" aria-label="section divider">
<style>${style}
</style>
<rect width="840" height="12" fill="none"/>
${body}
</svg>
`;
};
