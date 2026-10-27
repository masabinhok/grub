'use strict';

const { FONT, esc, wrap, baseStyle, svgDoc } = require('../lib/svg');

const W = 540, H = 300;       // the pet card's frame, so the two pair up side by side
const SIZE = 44, TRACK = 4;

/**
 * A player card: the name, set large on one line, and `bio` from
 * grub.config.json beneath it. Sized to sit beside the pet card at the same
 * height. Links cannot live inside a README image, so contacts stay outside.
 */
// Line-drawn status glyphs on a 24-unit grid, stroked in the accent.
const GLYPHS = {
  game: '<path d="M6.5 8.5h11a4 4 0 0 1 3.9 4.9l-.7 3.2a2.4 2.4 0 0 1-4.2 1l-2.2-2.6H9.7l-2.2 2.6a2.4 2.4 0 0 1-4.2-1l-.7-3.2A4 4 0 0 1 6.5 8.5z"/>' +
    '<path d="M7.5 11v3.5M5.75 12.75h3.5"/><circle cx="16" cy="11.5" r=".6"/><circle cx="17.8" cy="13.6" r=".6"/>',
  tv: '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8.5 3.5l3.5 4 3.5-4"/>',
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
};

module.exports = function renderProfile(state, ctx) {
  const pal = ctx.palettes[state.mood];
  const dead = state.mood === 'deceased';
  const p = ctx.profile || {};
  const full = String(p.name || p.login || 'developer');
  // One line; a long name shrinks to the card's width rather than wrapping.
  const size = Math.min(SIZE, (W - 52 + TRACK) / ([...full].length * (0.6 + TRACK / SIZE)));
  const adv = size * 0.6 + TRACK;

  const bioLines = wrap(ctx.cfg.bio || '', 60);
  // Centre the name-and-bio block in the space under the header rule, so a
  // one-line bio does not leave the bottom of the card empty.
  // `status` rows ride along the foot of the card: [{ icon, text }], icon one of
  // GLYPHS. The name block centres in whatever space they leave above them.
  const status = (ctx.cfg.status || []).filter((r) => r && r.text);
  const STATUS_Y = 262;
  const floor = status.length ? STATUS_Y - 30 : H;
  const blockTop = 96 - size, blockEnd = 156 + Math.max(0, bioLines.length - 1) * 21;
  const dy = Math.round((44 + floor) / 2 - (blockTop + blockEnd) / 2);

  // Laid out left to right; each item is its glyph plus its text at ~7.6px a char.
  let sx = 26;
  const statusRow = status.map((r) => {
    const g = GLYPHS[r.icon] || GLYPHS.game;
    const item = `<g transform="translate(${sx} ${STATUS_Y - 16}) scale(0.9)" fill="none" stroke="${pal.accent}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${g}</g>` +
      `<text class="mono st" x="${sx + 28}" y="${STATUS_Y}">${esc(r.text)}</text>`;
    sx += 28 + String(r.text).length * 7.9 + 28;
    return item;
  }).join('');

  const name = [...full].map((c, i) => (c === ' ' ? '' :
    `<text class="ch" x="${(26 + i * adv).toFixed(1)}" y="96" style="animation-delay:${(i * 0.05).toFixed(2)}s">${esc(c)}</text>`)).join('');

  const bio = bioLines
    .map((l, i) => `<text class="mono bio" x="26" y="${152 + i * 21}">${esc(l)}</text>`).join('');

  const style = `${baseStyle(pal, dead)}
    .ch{font-family:${FONT};font-size:${size.toFixed(1)}px;font-weight:300;fill:${pal.accent}}
    .bio{font-size:14px;letter-spacing:.5px;fill:${pal.ink}}
    .st{font-size:13px;letter-spacing:.4px;fill:${pal.dim}}
    ${dead ? '' : `.ch{animation:rise .9s cubic-bezier(.2,.8,.2,1) both;transform-box:fill-box}
    .rule{animation:draw 1.2s .6s cubic-bezier(.6,0,.2,1) both;transform-box:fill-box;transform-origin:left}
    .live{animation:pulse 2s ease-in-out infinite}
    @keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}`;

  const body =
    `<text class="mono lbl" x="26" y="32">operator</text>` +
    `<circle${dead ? '' : ' class="live"'} cx="${W - 84}" cy="28.5" r="3.5" fill="${dead ? pal.dim : pal.accent}"/>` +
    `<text class="mono lbl" x="${W - 26}" y="32" text-anchor="end">${dead ? 'offline' : 'online'}</text>` +
    `<line x1="26" y1="44" x2="${W - 26}" y2="44" stroke="${pal.accent}" stroke-opacity="0.28"/>` +
    `<g transform="translate(0 ${dy})">${name}` +
    `<rect class="rule" x="26" y="118" width="120" height="1.5" fill="${pal.accent}"/>` +
    `${bio}</g>` +
    (status.length ? `<line x1="26" y1="${STATUS_Y - 26}" x2="${W - 26}" y2="${STATUS_Y - 26}" stroke="${pal.accent}" stroke-opacity="0.18"/>` : '') +
    statusRow;

  return svgDoc({
    w: W, h: H, pal, id: 'prf', style,
    title: full,
    desc: ctx.cfg.bio || '',
    body,
  });
};
