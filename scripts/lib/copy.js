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

/**
 * The banner subtitle. Still keyed by mood so a fork can make the header react,
 * but the default says the same thing whatever state the creature is in — the
 * pips and the MOOD readout beside it already carry that news.
 */
const TAGLINES = {
  thriving: 'what i do is art',
  hungry: 'what i do is art',
  feral: 'what i do is art',
  deceased: 'what i do is art',
};

/**
 * The marquee's daily rotation: jokes, quotes and the occasional fact that stops
 * you for a second. Attributions are only attached where they are genuinely
 * documented; the rest are folk wisdom and stay unsigned.
 *
 * One per UTC day, in order, so it changes every morning and does not repeat
 * inside a month. Add your own — the ticker takes any length.
 */
const QUOTES = [
  'Debugging is like being the detective in a crime movie where you are also the murderer. — Filipe Fortes',
  'First, solve the problem. Then, write the code. — John Johnson',
  'Make it work, make it right, make it fast. — Kent Beck',
  'If you think good architecture is expensive, try bad architecture. — Brian Foote',
  'Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away. — Antoine de Saint-Exupéry',
  'Measuring programming progress by lines of code is like measuring aircraft building progress by weight. — Bill Gates',
  'Give a man a program, frustrate him for a day. Teach a man to program, frustrate him for a lifetime. — Muhammad Waseem',
  'A complex system that works is invariably found to have evolved from a simple system that worked. — John Gall',
  'Bad programmers worry about the code. Good programmers worry about data structures and their relationships. — Linus Torvalds',
  'Software is a gas; it expands to fill its container. — Nathan Myhrvold',
  'Hardware is the part of a computer that you can kick. — Jeff Pesis',
  'The function of good software is to make the complex appear simple. — Grady Booch',
  'Simplicity is about subtracting the obvious and adding the meaningful. — John Maeda',
  'The best code is no code at all. — Jeff Atwood',
  'Adding manpower to a late software project makes it later. — Fred Brooks',
  'Before software can be reusable it first has to be usable. — Ralph Johnson',
  'Code is like humor. When you have to explain it, it\'s bad. — Cory House',
  'The most important property of a program is whether it accomplishes the user\'s intent. — C.A.R. Hoare',
  'Fix the cause, not the symptom. — Steve Maguire',
  'You can\'t control what you can\'t measure. — Tom DeMarco',
  'Controlling complexity is the essence of computer programming. — Brian Kernighan',
  'Legacy code is just code that works and makes money. — Sandi Metz',
  'One man\'s constant is another man\'s variable. — Alan Perlis',
  'There is always one more bug. — Lubarsky\'s Law',
  'Any code of your own that you haven\'t looked at for six months or more might as well have been written by someone else. — Alan Perlis',
  'Optimism is an occupational hazard of programming: feedback is the treatment. — Kent Beck',
  'Any fool can write code that a computer can understand. Good programmers write code that humans can understand. — Martin Fowler',
  'Walking on water and developing software from a specification are easy if both are frozen. — Edward V. Berard',
  'The trouble with programmers is that you can never tell what a programmer is doing until it\'s too late. — Seymour Cray',
  'Don\'t document the problem, fix it. — Atli Björgvin Oddsson',
  'Experience is the name everyone gives to their mistakes. — Oscar Wilde',
  'To iterate is human, to recurse divine. — L. Peter Deutsch',
  'Programming today is a race between software engineers striving to build bigger and better idiot-proof programs, and the Universe trying to produce bigger and better idiots. So far, the Universe is winning. — Rick Cook',
  'The most disastrous thing that you can ever learn is your first programming language. — Alan Kay',
  'A good programmer is someone who always looks both ways before crossing a one-way street. — Doug Linder',
  'Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday\'s code. — Dan Salomon',
  'In software, the most beautiful code, the most beautiful functions, and the most beautiful programs are sometimes not there at all. — Jon Bentley',
  'The bearing of a child takes nine months, no matter how many women are assigned. — Fred Brooks',
  'Every great developer you know got there by solving problems they were unqualified to solve until they actually did it. — Patrick McKenzie',
  'Truth can only be found in one place: the code. — Robert C. Martin',
  'Make interfaces easy to use correctly and hard to use incorrectly. — Scott Meyers',
  'If debugging is the process of removing software bugs, then programming must be the process of putting them in. — Edsger Dijkstra',
  'Code without tests is bad code. It doesn\'t matter how well written it is. — Michael Feathers',
  'Maintenance is the real work of software engineering. — Unknown',
  'Computer science is no more about computers than astronomy is about telescopes. — Edsger Dijkstra',
  'When you don\'t create things, you become defined by your tastes rather than ability. — Why The Lucky Stiff',
  'Design is not just what it looks like and feels like. Design is how it works. — Steve Jobs',
  'We build our computer systems the way we build our cities: over time, without a plan, on top of ruins. — Ellen Ullman',
  'What one programmer can do in one month, two programmers can do in two months. — Fred Brooks',
  'A fallible perspective is better than no perspective at all. — Sandi Metz',
  'Programs must be written for people to read, and only incidentally for machines to execute. — Hal Abelson',
  'The only way to go fast, is to go well. — Robert C. Martin'
];

/**
 * Everything below is extensible from grub.config.json without editing this file.
 *
 * `copy.lines` and `copy.quotes` are **added** to the pools above by default —
 * these are things GRUB can say, and one more of them is almost always what
 * somebody means. Set `copy.replace: true` to start from an empty mouth and use
 * only your own. A mood you never mention keeps its built-ins either way, because
 * an empty pool would leave him with nothing to say at exactly the moment the
 * card needs a line.
 */

const strings = (v) => (Array.isArray(v) ? v : v === undefined || v === null ? [] : [v])
  .filter((s) => typeof s === 'string' && s.trim());

/** The insult pools with any config additions folded in, one pool per mood. */
function linesFor(cfg) {
  const copy = (cfg && cfg.copy) || {};
  const extra = (copy.lines && typeof copy.lines === 'object') ? copy.lines : {};
  const out = {};
  for (const tier of Object.keys(LINES)) {
    const own = strings(extra[tier]);
    const merged = copy.replace ? own : LINES[tier].concat(own);
    out[tier] = merged.length ? merged : LINES[tier];
  }
  return out;
}

/** The marquee rotation with any config additions folded in. */
function quotesFor(cfg) {
  const copy = (cfg && cfg.copy) || {};
  const own = strings(copy.quotes);
  const merged = copy.replace ? own : QUOTES.concat(own);
  return merged.length ? merged : QUOTES;
}

function pickLine(tier, state, now, lines = LINES) {
  const pool = (lines && lines[tier] && lines[tier].length) ? lines[tier] : LINES[tier];
  return pool[(now.getUTCDay() + (state.resurrections || 0)) % pool.length];
}

/** Today's quote. Indexed by whole UTC days, so it turns over at midnight. */
function quoteOfTheDay(now = new Date(), pool = QUOTES) {
  const lines = (pool && pool.length) ? pool : QUOTES;
  const day = Math.floor(now.getTime() / 86400000);
  return lines[((day % lines.length) + lines.length) % lines.length];
}

/** Built-in taglines with any grub.config.json overrides folded in. */
const taglinesFor = (cfg) => Object.assign({}, TAGLINES, (cfg && cfg.taglines) || {});

module.exports = {
  LINES, TAGLINES, QUOTES,
  pickLine, quoteOfTheDay, taglinesFor, linesFor, quotesFor,
};
