# Contributing

GRUB is a small, dependency-free repo, so contributing is mostly just editing
JavaScript and looking at the SVG that falls out. Read
[docs/development.md](./docs/development.md) first — it has the layout and the
local CLI.

## Before you open a PR

1. **Render it.** Every change that touches a generator should come with a look
   at the output in all four moods:

   ```bash
   for m in thriving hungry feral deceased; do
     node scripts/update_pet.js --mood "$m" --outdir /tmp/preview-$m --offline
   done
   ```

2. **Don't commit `assets/` or `pet-state.json`.** CI regenerates and commits
   both on the daily run. A PR that includes them will conflict for no reason —
   leave them out and let the bot do it.

3. **Keep it dependency-free.** No `package.json`, no npm packages, Node's
   standard library only. That constraint is the reason CI is fifteen seconds and
   the reason forking is painless; a PR that adds a dependency needs a very good
   argument.

4. **Match the voice.** GRUB is rude, dry and short. New copy in
   `scripts/lib/copy.js` should sound like the pool it joins — not friendlier,
   not more explanatory.

## Good things to work on

- **New cards.** The bar is in
  [Adding a card](./docs/development.md#adding-a-card).
- **New quotes** for the marquee rotation, in `QUOTES` in `scripts/lib/copy.js`.
- **New insults** for the mood pools, same file.
- **Accessibility.** Every card should say something useful in `<desc>`.
- **Docs.** If something in `docs/` sent you the wrong way, that's a bug.

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
