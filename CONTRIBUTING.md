# Contributing

GRUB is a small, dependency-free repo, so contributing is mostly just editing
JavaScript and looking at the SVG that falls out. Read
[docs/development.md](./docs/development.md) first — it has the layout and the
local CLI.

**New here?** The three sections under [Good first PRs](#good-first-prs) are
deliberately self-contained: a snack, a quote, or an insult. Each is one array
entry, no build step, and you can see your change in a browser in under a minute.

---

## Good first PRs

### Add a snack

A snack is what visitors throw at him when they [feed him](./docs/feeding.md).
It is two things at once — a scrap of pixel art the card rains down, and one line
of GRUB reacting to it in the issue reply. They live in the same record, in
[`scripts/lib/snacks.js`](./scripts/lib/snacks.js), so adding one never means
touching a generator.

Append to the `SNACKS` array:

```js
{
  id: 'mango',                    // lowercase a-z0-9-, unique, max 24
  name: 'a mango',                // as it reads mid-sentence: "fed GRUB a mango"
  tint: 't',                      // palette key: m, t, w, x, d, ink or accent
  cell: 3,                        // pixel size, 1-6. 3 is the house default
  response: 'Seasonal, sticky, and gone in four seconds.',
  art: [                          // 1-12 rows, all the same width, max 12 wide
    '.##.',                       // '.' transparent
    '#o##',                       // '#' the tint
    '####',                       // 'o' the highlight
    '.##.',
  ],
},
```

Rules the validator enforces, so you may as well know them up front:

- **Every row the same length.** A ragged grid is rejected with a warning.
- **Only `.`, `#` and `o`.** Anything else is not a colour, it's a typo.
- **`tint` from the list above.** Those are the keys every live mood defines, so
  the snack can never resolve to nothing and vanish.
- **Keep it small.** 12×12 is the ceiling and 4×4 is plenty. It falls past his
  face at three pixels a cell; detail is wasted.
- **`response` is one line, in his voice.** Rude, dry, short. He is not grateful.

Then look at it:

```bash
node scripts/feed_grub.js --actor you --dry-run    # which snack that picks
node scripts/feed_grub.js --actor you && node scripts/update_pet.js --offline
```

The picker is keyed off the feeder's name and the date, so try a few `--actor`
values until yours comes up, or force it by setting `lastSnack` in
`pet-state.json` to your id and re-rendering.

### Add a marquee quote

The CRT ticker runs one line a day from `QUOTES` in
[`scripts/lib/copy.js`](./scripts/lib/copy.js) — jokes, genuinely-attributed
quotes, and facts worth a second look. Append a string:

```js
'Weeks of coding can save you hours of planning.',
```

- **Attribute it, or don't.** `— Name` only where the attribution is genuinely
  documented. Folk wisdom stays unsigned; a misattributed quote is worse than an
  anonymous one.
- **Any length works.** The ticker measures and scrolls it.
- **No duplicates.** The rotation is indexed by day; a repeat inside a month is
  visible.

```bash
node scripts/update_pet.js --only marquee --outdir /tmp/preview --offline
```

### Add a mood insult

`LINES` in the same file, one pool per mood — `thriving`, `hungry`, `feral`,
`deceased`, `revived`. Append to whichever pool fits:

```js
feral: [
  // ...
  'I have eaten the LICENSE. It was permissive.',
],
```

- **Match the escalation.** `thriving` is smug, `hungry` is passive-aggressive,
  `feral` is unhinged, `deceased` is post-mortem, `revived` keeps receipts.
- **Fit the bubble.** It wraps at 34 characters and hard-stops at three lines —
  roughly 100 characters total. Longer lines get silently truncated.
- **Second person.** He is talking to the person who let him starve.

```bash
node scripts/update_pet.js --mood feral --outdir /tmp/preview --offline
```

### Don't want to open a PR?

All three of the above are also settable in `grub.config.json` under `copy`,
without touching this repo at all — see
[Configuration](./docs/configuration.md#your-own-snacks-quotes-and-insults).
A PR puts yours in everybody's fork; the config keeps it in yours.

---

## Before you open a PR

1. **Render it.** Every change that touches a generator should come with a look
   at the output in all four moods:

   ```bash
   for m in thriving hungry feral deceased; do
     node scripts/update_pet.js --mood "$m" --outdir /tmp/preview-$m --offline
   done
   ```

2. **Refresh the showcase if you changed how a card looks.** The four-state
   previews in the README are committed files:

   ```bash
   node scripts/render_previews.js --check   # is what's committed still accurate?
   node scripts/render_previews.js           # rewrite docs/previews/
   ```

   Those renders are pinned to a fixed clock so they are byte-identical between
   runs. Nothing in `render_previews.js` may read the real clock, the real state
   file or the API — otherwise CI would find a diff every single day.

3. **Don't commit `assets/` or `pet-state.json`.** CI regenerates and commits
   both on the daily run. A PR that includes them will conflict for no reason —
   leave them out and let the bot do it. `docs/previews/` is the exception: it is
   only regenerated by hand, so it *should* be in your PR.

4. **Keep it dependency-free.** No `package.json`, no npm packages, Node's
   standard library only. That constraint is the reason CI is fifteen seconds and
   the reason forking is painless; a PR that adds a dependency needs a very good
   argument.

5. **Keep the SVGs self-contained.** No external fonts, no external CSS, no
   JavaScript, no remote images. GitHub serves these through its `camo` proxy
   inside an `<img>`, which strips all of it — see
   [What SVGs can't do here](./docs/embedding.md#what-svgs-cant-do-here).

6. **Match the voice.** GRUB is rude, dry and short. New copy should sound like
   the pool it joins — not friendlier, not more explanatory.

---

## Other good things to work on

- **New cards.** The bar is in
  [Adding a card](./docs/development.md#adding-a-card).
- **Accessibility.** Every card should say something useful in `<desc>`; that is
  what a screen reader gets instead of the picture.
- **Palettes.** A whole alternative mood palette is a config-only contribution.
- **Docs.** If something in `docs/` sent you the wrong way, that's a bug.

## Getting on the Wall of Shame

Not a code change — one entry in [`wall-of-shame.json`](./wall-of-shame.json)
listing your own GRUB, ranked by deaths survived. Fields and rules are in
[WALL-OF-SHAME.md](./WALL-OF-SHAME.md#get-on-the-wall). You need a running GRUB
first; the wall reads its live state from your repo.

## Reporting a bug

Open an issue — but note that titles starting with `feed` or `pet` are captured
by the feeding workflow and auto-closed with a snack. Anything else is left
completely alone, so name your bug report something else and it'll be fine.

Useful to include: the job log from the failing Action run, your
`grub.config.json` with anything private removed, and what you expected the card
to look like.

## Feeding him is not a contribution

It is [explicitly cosmetic](./docs/feeding.md#what-a-snack-explicitly-cannot-do).
Thank you anyway.
