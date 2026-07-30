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
  // Said for 24 hours after a stranger feeds him. `{who}` is the feeder's login,
  // already validated against GitHub's rules before it gets here.
  fed: [
    '{who} fed me. A stranger. Not the person who owes me commits.',
    'Snack from {who}. Tastes like pity. I am fine with that.',
    '{who} brought food. New favourite. Low bar.',
    'Fed by {who}. My own developer is right there, doing nothing.',
    '{who} gave me a snack. It changes nothing. It was delicious.',
    'I ate whatever {who} gave me. I did not ask what it was.',
    'Thank you {who}. You are the only one who visits.',
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

/**
 * What he says about a snack. Keyed off the feeder's name rather than the date,
 * so two people feeding him on the same day get different reactions — the point
 * of the whole thing is that it feels like a reply to *you*.
 */
function feedLine(who, state) {
  const name = String(who);
  const seed = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const pool = LINES.fed;
  // Every line has room for a 39-character login inside three wrapped lines of
  // speech bubble, but only just — so an extreme one is shortened for the bubble.
  // The placard above his head still shows more of it.
  const shown = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  return pool[(seed + (state.pets || 0)) % pool.length].replace(/\{who\}/g, `@${shown}`);
}

/** Built-in taglines with any grub.config.json overrides folded in. */
const taglinesFor = (cfg) => Object.assign({}, TAGLINES, (cfg && cfg.taglines) || {});

module.exports = { LINES, TAGLINES, pickLine, feedLine, taglinesFor };
