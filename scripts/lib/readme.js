'use strict';

/**
 * The one line of README the bot owns. Everything between the markers is
 * regenerated; everything outside them is yours.
 */

const fs = require('fs');
const { README_PATH } = require('./constants');

const CAPTION_START = '<!-- pet:caption -->';
const CAPTION_END = '<!-- /pet:caption -->';

function captionFor(state, days) {
  const n = state.resurrections;
  const scoreboard =
    n === 0 ? (state.alive ? 'Never died. Yet.' : 'First death. It was avoidable.') :
    n === 1 ? 'Resurrected once. It remembers.' :
    `Resurrected ${n} times. It remembers.`;
  const status = state.alive
    ? `**${state.mood}** · ${days} day${days === 1 ? '' : 's'} since the last commit`
    : `**deceased** · died ${state.diedOn} · awaiting an apology`;
  return `${status} · _${scoreboard}_`;
}

function updateReadmeCaption(state, days, readmePath = README_PATH) {
  let md;
  try { md = fs.readFileSync(readmePath, 'utf8'); } catch (_) { return false; }
  const start = md.indexOf(CAPTION_START);
  const end = md.indexOf(CAPTION_END);
  if (start === -1 || end === -1 || end < start) return false;
  const next = md.slice(0, start + CAPTION_START.length) + `\n${captionFor(state, days)}\n` + md.slice(end);
  if (next === md) return false;
  fs.writeFileSync(readmePath, next);
  return true;
}

module.exports = { CAPTION_START, CAPTION_END, captionFor, updateReadmeCaption };
