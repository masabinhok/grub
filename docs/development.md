# Development

Zero dependencies. No `package.json`, no `npm install` step in CI, and the whole
job runs in about fifteen seconds. If you have Node, you can run everything here.

- [What's in here](#whats-in-here)
- [Running it locally](#running-it-locally)
- [Adding a card](#adding-a-card)

---

## What's in here

```
scripts/update_pet.js          # entrypoint: CLI, state machine, writing files
scripts/feed_grub.js           # the feed counter, and nothing else
scripts/lib/                   # state, github, palette, svg, glyphs, traffic, copy...
scripts/generators/            # one module per card + index.js registry
grub.config.json               # your settings. never written by the bot
pet-state.json                 # the only persistence layer. no database
assets/*.svg                   # generated output, committed by CI
.github/workflows/pet.yml      # daily cron + manual trigger
.github/workflows/feed.yml     # feeding, by anyone who asks
```

No backend, no database, no third-party services. Just the GitHub API and one
file of state committed to the repo.

---

## Running it locally

```bash
node scripts/update_pet.js --help                 # usage
node scripts/update_pet.js --offline --dry-run    # render from cached state, write nothing
node scripts/update_pet.js --only streak          # just one card
node scripts/feed_grub.js --actor you --dry-run   # a feed, without saving it
```

To see the feeding reaction without editing anything, feed him for real locally
and re-render — it lasts 24 hours and the next scheduled run clears it:

```bash
node scripts/feed_grub.js --actor you && node scripts/update_pet.js --offline
```

Previewing a mood needs somewhere to put the output:

```bash
node scripts/update_pet.js --mood feral --outdir /tmp/preview --offline
node scripts/update_pet.js --days 4 --outdir /tmp/preview
```

`--mood` and `--days` are **simulations**. Aimed at the real `assets/` directory
they refuse to write anything at all, because a `--days 4` render would otherwise
leave feral cards sitting next to a thriving state file and CI would commit the
mismatch. Point them at `--outdir` and they never touch `pet-state.json`.

`--config path.json` runs against a different config, which is the easy way to try
a palette or a slot list without editing the live one.

For the traffic-backed lurker count:

```bash
PET_TOKEN=$(gh auth token) node scripts/update_pet.js --dry-run
```

---

## Adding a card

One file in `scripts/generators/` plus one line in its `index.js`. The key you
register it under is both the `--only` argument and the output filename.

A generator receives the resolved state, config and palette, and returns an SVG
string. The things every existing card gets right and a new one should too:

- **Read the mood.** A card that looks the same whether GRUB is thriving or dead
  breaks the one rule the whole set follows.
- **Stop animating when he's dead.** Not slower — stopped.
- **Stay self-contained.** No external fonts, no external CSS, no JavaScript;
  GitHub's sandbox strips all three. See
  [What SVGs can't do here](./embedding.md#what-svgs-cant-do-here).
- **Fill in `<desc>`.** It's what a screen reader gets.
- **Add a `components` key** so it can be turned off, and a copy-paste block to
  [Embedding the cards](./embedding.md).

---

← [Feeding him](./feeding.md) · [Contributing](../CONTRIBUTING.md)
