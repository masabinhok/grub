'use strict';

const { CELL, FONT, esc, pixelRects, wrap, svgDoc } = require('../lib/svg');
const { SPRITES, HEART, SPARKLE } = require('../lib/sprites');
const { SNACKS } = require('../lib/snacks');
const { localDate } = require('../lib/dates');

const W = 540, H = 300, SPRITE_X = 46, SPRITE_Y = 116;
const SPRITE_MID = SPRITE_X + 8 * CELL;   // 118 — the creature's centre line

// The placard above his head: the plea when nobody has fed him, the feeder's
// name when somebody has. Same box either way, so the card does not jump.
const PLEA_X = 34, PLEA_Y = 52, PLEA_W = 168, PLEA_H = 48;

/**
 * Largest font size at which `chars` characters of mono fit `width`, allowing for
 * the letter-spacing on that class. Labels are configurable, so a long one has to
 * shrink rather than run off the card.
 */
const fitFont = (chars, width, max, min, tracking = 0) => {
  const n = Math.max(1, chars);
  return Math.max(min, Math.min(max, (width - tracking * (n - 1)) / (n * 0.62)));
};

module.exports = function renderPet(state, ctx) {
  const mood = state.mood;
  const pal = ctx.palettes[mood];
  const petName = ctx.cfg.petName;
  const lbl = ctx.cfg.labels.pet;
  const dead = mood === 'deceased';
  const animated = !dead;
  // A snack is cosmetic and expires on its own — a dead pet shows nothing,
  // because a stranger's sympathy is not an apology.
  const fed = Boolean(ctx.fed) && !dead;
  const feeder = fed && ctx.feeder ? String(ctx.feeder) : null;
  const bubbleLines = wrap(ctx.line, 34);
  const bubbleH = 26 + bubbleLines.length * 19;

  const petBase = `
    .mono{font-family:${FONT}}
    .brand{font-size:17px;font-weight:700;letter-spacing:2px;fill:${pal.ink}}
    .sub{font-size:10px;letter-spacing:1px;fill:${pal.dim}}
    .say{font-size:12.5px;fill:${pal.ink}}
    .stat{font-size:11px;fill:${pal.dim}}
    .val{font-size:11px;fill:${pal.ink};font-weight:700}
    .call{font-size:16px;font-weight:700;letter-spacing:2.5px;fill:${pal.accent}}
    .callsub{font-size:9px;letter-spacing:0.8px;fill:${pal.dim}}
    .who{font-weight:700;fill:${pal.accent}}`;

  const style = dead
    ? `${petBase}
    .rip{font-size:21px;font-weight:700;letter-spacing:3px;fill:${pal.g}}
    .ripsub{font-size:9.5px;letter-spacing:1px;fill:${pal.g}}`
    : `${petBase}
    .lid{opacity:0;animation:blink ${mood === 'feral' ? '1.7s' : '5.4s'} steps(1) infinite}
    .bubble{animation:breathe ${mood === 'thriving' ? '3.2s' : '5s'} ease-in-out infinite}
    .meter{animation:meterpulse 2.6s ease-in-out infinite}
    ${mood === 'feral' ? '.glitch{animation:tear 1.1s steps(1) infinite}.shell{animation:desat 2.3s ease-in-out infinite}' : ''}
    ${mood === 'thriving' ? '.spark{animation:twinkle 1.9s ease-in-out infinite}' : ''}
    ${ctx.revived ? '.flash{animation:flash 2.4s ease-out infinite}.ray{animation:spin 9s linear infinite;transform-box:fill-box;transform-origin:center}' : ''}
    ${fed ? `
    .munch{animation:munch 2.9s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}
    .crumb{animation:drop 2.9s cubic-bezier(.35,0,.85,1) infinite}
    .heart{animation:rise 2.9s ease-out infinite}
    .pop{animation:pop 2.9s ease-out infinite;transform-box:fill-box;transform-origin:center}
    @keyframes munch{0%,100%{transform:scale(1,1)}8%{transform:scale(1.08,.9)}17%{transform:scale(.94,1.07)}26%{transform:scale(1.05,.96)}36%{transform:scale(1,1)}}
    @keyframes drop{0%{opacity:0;transform:translateY(-132px)}12%{opacity:1}55%,100%{opacity:1;transform:translateY(0)}}
    @keyframes rise{0%{opacity:0;transform:translateY(10px) scale(.7)}20%{opacity:1}72%{opacity:.85}100%{opacity:0;transform:translateY(-30px) scale(1.1)}}
    @keyframes pop{0%,34%{opacity:0;transform:scale(.2)}44%{opacity:.95;transform:scale(1)}72%,100%{opacity:0;transform:scale(1.6)}}`
    : `
    .plea{animation:bob 2.1s ease-in-out infinite}
    .beat{animation:beat 2.1s ease-in-out infinite}
    @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
    @keyframes beat{0%,100%{opacity:1}50%{opacity:.25}}`}
    @keyframes blink{0%,93%{opacity:0}94%,97%{opacity:1}98%,100%{opacity:0}}
    @keyframes breathe{0%,100%{opacity:1}50%{opacity:.86}}
    @keyframes meterpulse{0%,100%{opacity:1}50%{opacity:.6}}
    @keyframes tear{0%,100%{opacity:0;transform:translateX(0)}12%{opacity:.55;transform:translateX(-4px)}18%{opacity:0}61%{opacity:.4;transform:translateX(5px)}67%{opacity:0}}
    @keyframes desat{0%,100%{filter:saturate(.35)}50%{filter:saturate(0) contrast(1.25)}}
    @keyframes twinkle{0%,100%{opacity:.25}50%{opacity:1}}
    @keyframes flash{0%{opacity:.8}100%{opacity:0}}
    @keyframes spin{to{transform:rotate(360deg)}}`;

  let spriteAnim = '';
  if (mood === 'thriving') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -7; 0 0" keyTimes="0;0.5;1" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" additive="sum"/>';
  } else if (mood === 'hungry') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="4.2s" repeatCount="indefinite" additive="sum"/>';
  } else if (mood === 'feral') {
    spriteAnim = '<animateTransform attributeName="transform" type="translate" values="0 0;2 -1;-3 1;0 0;1 2;-1 0;0 0" dur="0.55s" repeatCount="indefinite" calcMode="discrete" additive="sum"/>';
  }

  const eyeLids = animated
    ? `<rect class="lid" x="${3 * CELL}" y="${5 * CELL}" width="${3 * CELL}" height="${3 * CELL}" fill="${pal.x}"/>` +
      `<rect class="lid" x="${10 * CELL}" y="${5 * CELL}" width="${3 * CELL}" height="${3 * CELL}" fill="${pal.x}"/>`
    : '';

  const tombText = dead
    ? '<text class="mono rip" x="72" y="52" text-anchor="middle">R.I.P.</text>' +
      `<line x1="30" y1="62" x2="114" y2="62" stroke="${pal.g}" stroke-opacity="0.6"/>` +
      `<text class="mono ripsub" x="72" y="80" text-anchor="middle">${esc(petName)}</text>` +
      `<text class="mono ripsub" x="72" y="97" text-anchor="middle">${esc(state.diedOn || localDate(Date.now(), ctx.cfg.timezone))}</text>` +
      '<text class="mono ripsub" x="72" y="112" text-anchor="middle">STARVED</text>'
    : '';

  const glitch = mood === 'feral'
    ? `<g class="glitch"><rect x="0" y="${5 * CELL}" width="144" height="${2 * CELL}" fill="${pal.accent}" opacity="0.5"/>` +
      `<rect x="0" y="${10 * CELL}" width="144" height="${CELL}" fill="${pal.w}" opacity="0.35"/></g>` +
      `<rect x="0" y="${8 * CELL}" width="144" height="${CELL}" fill="${pal.b}" opacity="0">` +
      '<animate attributeName="opacity" values="0;0;0.7;0;0;0.45;0" dur="1.3s" repeatCount="indefinite"/>' +
      '<animate attributeName="x" values="0;-6;7;0;4;0;0" dur="1.3s" repeatCount="indefinite"/></rect>'
    : '';

  const sparks = mood === 'thriving'
    ? `<g class="spark"><rect x="-14" y="18" width="6" height="6" fill="${pal.t}"/>` +
      `<rect x="150" y="40" width="5" height="5" fill="${pal.t}"/>` +
      `<rect x="140" y="6" width="4" height="4" fill="${pal.ink}"/></g>`
    : '';

  const rays = ctx.revived
    ? `<g class="ray" opacity="0.35">${[0, 45, 90, 135]
        .map((a) => `<rect x="-40" y="70" width="224" height="4" fill="${pal.t}" transform="rotate(${a} 72 72)"/>`).join('')}</g>` +
      '<rect class="flash" x="-60" y="-60" width="264" height="264" fill="#ffffff" opacity="0"/>'
    : '';

  // The chew lives on its own wrapper: the inner group already carries the idle
  // animateTransform, and a CSS transform on the same element would replace it.
  const spriteGroup =
    `<g transform="translate(${SPRITE_X} ${SPRITE_Y})"><g${mood === 'feral' ? ' class="shell"' : ''}>` +
    `<g${fed ? ' class="munch"' : ''}><g>` +
    spriteAnim + rays + pixelRects(SPRITES[mood], pal) + eyeLids + tombText + glitch + sparks +
    '</g></g></g></g>';

  // --- the feeding theatre ------------------------------------------------
  // Food rains down, he chews, hearts go up, sparkles go off. All of it is on
  // the same 2.9s loop as the munch, so the bites land with the food.
  const at = (x, y, cls, delay, inner) =>
    `<g transform="translate(${x} ${y})"><g class="${cls}"${delay ? ` style="animation-delay:${delay}s"` : ''}>${inner}</g></g>`;

  // Whatever the feeder was given by feed_grub.js, so the issue reply and the
  // card agree on what he is eating. Nothing but the state file passes between
  // them, so an unknown id falls back rather than drawing an empty snack.
  const snack = ctx.snack || SNACKS[0];
  const scrap = pixelRects(snack.art, { '#': pal[snack.tint] || pal.accent, o: pal.w }, snack.cell);

  // Each scrap is placed where it lands, and the animation lifts it back up to
  // fall again — so the frame a non-animating renderer draws is three crumbs on
  // the ground rather than three snacks stuck in mid-air over his face.
  const food = fed
    ? at(64, 248, 'crumb', 0, scrap) +
      at(112, 250, 'crumb', 0.55, scrap) +
      at(164, 246, 'crumb', 1.15, scrap)
    : '';

  const hearts = fed
    ? at(196, 152, 'heart', 0, pixelRects(HEART, { '#': pal.m }, 3)) +
      at(196, 194, 'heart', 0.9, pixelRects(HEART, { '#': pal.m }, 2)) +
      at(24, 172, 'heart', 1.6, pixelRects(HEART, { '#': pal.m }, 2))
    : '';

  const sparkle = (tint) => pixelRects(SPARKLE, { '#': tint }, 2);
  const burst = fed
    ? at(58, 196, 'pop', 0.1, sparkle(pal.t)) +
      at(176, 178, 'pop', 0.5, sparkle(pal.w)) +
      at(92, 236, 'pop', 0.8, sparkle(pal.t)) +
      at(162, 232, 'pop', 1.3, sparkle(pal.m)) +
      `<circle class="pop" cx="${SPRITE_MID}" cy="206" r="30" fill="none" stroke="${pal.t}" stroke-width="2" opacity="0"/>`
    : '';

  // --- the placard --------------------------------------------------------
  const placardBox = (inner, cls) =>
    `<g${cls ? ` class="${cls}"` : ''}>` +
    `<rect x="${PLEA_X}" y="${PLEA_Y}" width="${PLEA_W}" height="${PLEA_H}" rx="9" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<path d="M${SPRITE_MID - 9} ${PLEA_Y + PLEA_H} L${SPRITE_MID + 9} ${PLEA_Y + PLEA_H} L${SPRITE_MID} ${PLEA_Y + PLEA_H + 12} Z" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<rect x="${SPRITE_MID - 8}" y="${PLEA_Y + PLEA_H - 2}" width="16" height="4" fill="${pal.bg1}"/>` +
    inner + '</g>';

  let placard = '';
  if (fed && feeder) {
    // Long logins shrink to fit rather than running off the card.
    const shown = feeder.length > 26 ? `${feeder.slice(0, 25)}…` : feeder;
    const fs = fitFont(shown.length + 1, PLEA_W - 24, 15, 8);
    placard = placardBox(
      `<text class="mono callsub" x="${SPRITE_MID}" y="${PLEA_Y + 20}" text-anchor="middle">${esc(lbl.fedBy)}</text>` +
      `<text class="mono who" x="${SPRITE_MID}" y="${PLEA_Y + 38}" text-anchor="middle" font-size="${fs.toFixed(1)}">@${esc(shown)}</text>`);
  } else if (!dead) {
    const call = String(lbl.feedMe);
    const sub = String(lbl.feedMeSub);
    placard = placardBox(
      `<text class="mono call" x="${SPRITE_MID}" y="${PLEA_Y + 22}" text-anchor="middle" font-size="${fitFont(call.length, PLEA_W - 26, 16, 9, 2.5).toFixed(1)}">${esc(call)}</text>` +
      `<text class="mono callsub beat" x="${SPRITE_MID}" y="${PLEA_Y + 38}" text-anchor="middle" font-size="${fitFont(sub.length, PLEA_W - 26, 9, 6, 0.8).toFixed(1)}">${esc(sub)}</text>`,
      'plea');
  }

  const BX = 222, BY = 54, BW = 292;
  const bubble =
    `<g${animated ? ' class="bubble"' : ''}>` +
    `<rect x="${BX}" y="${BY}" width="${BW}" height="${bubbleH}" rx="10" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<path d="M${BX + 22} ${BY + bubbleH} L${BX + 2} ${BY + bubbleH + 21} L${BX + 54} ${BY + bubbleH} Z" fill="${pal.bg1}" stroke="${pal.accent}" stroke-opacity="0.55" stroke-width="1.5"/>` +
    `<rect x="${BX + 24}" y="${BY + bubbleH - 2}" width="28" height="4" fill="${pal.bg1}"/>` +
    bubbleLines.map((l, i) => `<text class="mono say" x="${BX + 16}" y="${BY + 27 + i * 19}">${esc(l)}</text>`).join('') +
    '</g>';

  const MX = 222, MY = 192, MW = 200;
  const filled = Math.round((state.hunger / 100) * MW);
  const meter =
    `<text class="mono stat" x="${MX}" y="${MY - 6}">${esc(lbl.hunger)}</text>` +
    `<rect x="${MX}" y="${MY}" width="${MW}" height="10" rx="3" fill="${pal.bg1}" stroke="${pal.dim}" stroke-opacity="0.4"/>` +
    (filled > 2 ? `<rect${animated && state.hunger >= 60 ? ' class="meter"' : ''} x="${MX + 1}" y="${MY + 1}" width="${filled - 2}" height="8" rx="2" fill="${dead ? pal.dim : pal.accent}"/>` : '') +
    `<text class="mono val" x="${MX + MW + 10}" y="${MY + 9}">${state.hunger}%</text>`;

  // Set clear of the hunger bar rather than tucked under it: the meter is a
  // gauge and these are a list, and touching they read as one confused block.
  const STAT_Y = 236;
  const statBlock = [
    [lbl.daysSinceCommit, String(ctx.days)],
    [lbl.mood, mood.toUpperCase()],
    [lbl.resurrections, String(state.resurrections)],
  ].map(([k, v], i) =>
    `<text class="mono stat" x="${MX}" y="${STAT_Y + i * 19}">${esc(k)}</text>` +
    `<text class="mono val" x="${MX + 180}" y="${STAT_Y + i * 19}">${esc(v)}</text>`).join('');

  const body =
    `<text class="mono brand" x="26" y="32">${esc(petName)}</text>` +
    `<text class="mono sub" x="${26 + petName.length * 13}" y="32">${esc(ctx.cfg.tagline)}</text>` +
    `<line x1="26" y1="44" x2="${W - 26}" y2="44" stroke="${pal.accent}" stroke-opacity="0.28"/>` +
    `<rect x="30" y="262" width="176" height="4" rx="2" fill="${pal.ground}"/>` +
    placard + spriteGroup + food + burst + hearts + bubble + meter + statBlock;

  return svgDoc({
    w: W, h: H, pal, id: 'pet', style,
    title: `${petName} is ${dead ? 'dead' : mood} — ${ctx.days} day(s) since the last commit, ${state.resurrections} resurrection(s)` +
      (feeder ? `, last fed ${snack.name} by @${feeder}` : ''),
    desc: ctx.line,
    body,
  });
};
