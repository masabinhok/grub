'use strict';

/** Everything GRUB says, and the banner subtitle that reacts with him. */

const LINES = {
  thriving: [
    'Fed. Cocky. Insufferable. Do it again tomorrow.',
    "You shipped something. I'll allow it.",
    'Green square secured. Do not get comfortable.',
    "I'm full. That's the nicest thing I'll say all week.",
    'Look at you. Almost like a professional.',
    "Zero days since your last commit. I'm as confused as you are.",
    'Peak form. Statistically, this ends Thursday.',
  ],
  hungry: [
    "It's been a day. I'm not mad. I'm just logging it.",
    'Your last commit is starting to smell.',
    'Refactoring your life instead? Bold strategy.',
    'One more day and I start telling people.',
    'That branch is still not merged. I checked. Twice.',
    'I can go a while without food. You cannot go a while without excuses.',
    "Reading the docs isn't committing. Nice try.",
  ],
  feral: [
    'THREE DAYS. I have eaten the README.',
    'I can see through time now. You still have not pushed.',
    "Tell your recruiter I said hi. I'll be the gray one.",
    "I'm chewing the .gitignore. It's fine. Everything is fine.",
    'Your commit history is now a missing persons case.',
    'I have started drafting my own obituary. You are in it.',
    'Do you hear that? That is my ribs. Say hi to my ribs.',
  ],
  deceased: [
    "Cause of death: 'I'll commit tomorrow.'",
    'Here lies GRUB. Starved by someone with 41 open tabs.',
    'Death is temporary. The commit log is forever.',
    "Push a commit that says exactly: i'm sorry. Publicly.",
    'It knew this would happen. It said so. Repeatedly.',
    'No animation. No pulse. No excuses left.',
    'The tombstone is committed to your repo. Enjoy the permanence.',
  ],
  revived: [
    'You said it out loud. In the log. Forever.',
    'I forgive you. `git log` does not.',
    'Back from the dead and keeping receipts.',
    'That apology is now part of your public record. Sleep well.',
    'Resurrected. Slightly worse. Considerably meaner.',
    'I remember dying. I remember whose fault it was.',
    'Second chance granted. There is a counter now.',
  ],
};

// Banner tagline per mood — the header reacts too.
const TAGLINES = {
  thriving: 'building things · currently fed',
  hungry: 'building things · getting peckish',
  feral: 'building things · allegedly',
  deceased: 'was building things · see tombstone',
};

function pickLine(tier, state, now) {
  const pool = LINES[tier];
  return pool[(now.getUTCDay() + (state.resurrections || 0)) % pool.length];
}

/** Built-in taglines with any grub.config.json overrides folded in. */
const taglinesFor = (cfg) => Object.assign({}, TAGLINES, (cfg && cfg.taglines) || {});

module.exports = { LINES, TAGLINES, pickLine, taglinesFor };
