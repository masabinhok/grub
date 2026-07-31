# 🪱 The Tamagotchi of Shame

**This creature dies if I stop coding.**

Meet **GRUB**. It lives in this repo, it watches my commit history, and it is not
supportive. Every day at midnight UTC a GitHub Action checks whether I committed
anything. If I did, GRUB eats. If I didn't, GRUB starves — visibly, publicly, on
my profile — until it dies and leaves a tombstone with the date on it.

It can only be brought back by pushing a commit whose message is exactly
`i'm sorry`. The resurrection counter never resets.

<p align="center">
  <a href="../../issues/new?title=feed%20GRUB&body=here%20you%20go"><img src="./assets/pet.svg" alt="GRUB, the tamagotchi of shame" width="540"></a>
</p>

<p align="center">
  <b><a href="../../issues/new?title=feed%20GRUB&body=here%20you%20go">🍓 Feed GRUB</a></b> —
  opens an issue titled <code>feed GRUB</code>. Submit it and he chews, sparkles,
  and puts <b>your username on the card</b> for 24 hours.
</p>

<!-- pet:caption -->
**hungry** · 1 day since the last commit · _Never died. Yet._
<!-- /pet:caption -->

> The line above is rewritten by the Action on every run. Don't edit it by hand;
> it will just overwrite you, which is thematically appropriate.

---

## How it works

| Days since last commit | State | What you see |
| --- | --- | --- |
| 0 | `thriving` | Bright greens, bouncing idle animation, unbearable smugness |
| 1–2 | `hungry` | Dimmer palette, slow drift, side-eye, passive aggression |
| 3–4 | `feral` | Colour draining out, twitching and tearing, visible ribs |
| 5+ | `deceased` | Tombstone, death date, **no animation at all** |

The stats — days since last commit, current mood, resurrection count — are
rendered *inside* the SVG, not in the caption. You can't fake them without
regenerating the image, and regenerating the image requires the real state file.

### Resurrection

Once `alive` is `false`, the script skips all decay logic and just re-renders the
tombstone forever. The only way out:

```bash
git commit --allow-empty -m "i'm sorry"
git push
```

Case-insensitive. On the next run GRUB comes back with a burst of rotating light,
`resurrections` goes up by one, and that number stays in the image permanently.
That's the whole point — the shame is cumulative and public.

---

## The components

The pet is the centrepiece, but the same state file themes a whole set of cards.
Every one of them reads GRUB's mood, so when he starves the entire README
desaturates together — and when he dies, **nothing on the page animates at all.**

| File | Size | What it shows |
| --- | --- | --- |
| `assets/banner.svg` | 840×120 | Name, location, mood-reactive status pips |
| `assets/marquee.svg` | 840×88 | CRT ticker — a new joke, quote or fact every day |
| `assets/divider.svg` | 840×12 | Dashed rule that drifts while alive, freezes when dead |
| `assets/pet.svg` | 540×300 | GRUB himself, asking to be fed |
| `assets/streak.svg` | 420×180 | A fire the size of your streak, one coal per day |
| `assets/eye.svg` | 420×180 | An eye that watches back. Lurkers vs. people who fed him |
| `assets/star.svg` | 420×180 | One glazed star holding every star you've earned |
| `assets/stats.svg` | 420×180 | Repos, stars, followers, contributions |
| `assets/languages.svg` | 420×180 | Top languages as a segmented bar |
| `assets/inventory.svg` | 420×196 | Tech stack as an RPG equipment screen |

`inventory.svg` grows with your slot list — 196px at four slots, +30px each after.

Three of them are deliberately single-minded — one number, one piece of art, no
supporting paragraph:

- **The eye** blinks on a loop, drifts its pupil around like it is reading over
  your shoulder, and takes the iris colour from GRUB's mood. When he dies it
  closes and stays closed. Beside it: `LURKERS`, everyone who turned up, and
  `FED`, the ones who did something about it. The gap is the point.
- **The star** is a five-pointer under a highlight that sweeps across it on a
  loop, with rays turning slowly behind and sparkles firing off the points. Dead
  pet, dead star: grey metal, no sweep.
- **The streak** is a fire. It grows with every consecutive day and there is one
  coal in the bed per day of the current streak, so a ten-day streak is a tall
  flame over ten coals. Break the streak and you get a cold pile and a thread of
  smoke.

The 840-wide cards span a full row. The 420-wide ones pair up two to a line, and
`pet.svg` sits comfortably next to nothing, so give it its own row.

### Copy-paste blocks

Replace `USERNAME/REPO` in each. Use the **raw** URL, not a relative path —
relative paths only resolve inside the repo that holds the file, so they break the
moment you paste them into your profile README.

**Banner** — 840×120

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/banner.svg" width="840" alt="Profile banner">
```

**Marquee** — 840×88

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/marquee.svg" width="840" alt="Status ticker">
```

**Divider** — 840×12

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/divider.svg" width="840" alt="">
```

**Pet** — 540×300. Wrap it in a link to the feed issue so people can act on the
plea the card is making:

```html
<a href="https://github.com/USERNAME/REPO/issues/new?title=feed%20GRUB">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/pet.svg" width="540" alt="GRUB, the tamagotchi of shame">
</a>
```

**Streak** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/streak.svg" width="420" alt="Commit streak">
```

**Eye** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/eye.svg" width="420" alt="Lurkers versus people who fed him">
```

**Star** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/star.svg" width="420" alt="Stars earned">
```

**Stats** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/stats.svg" width="420" alt="Profile statistics">
```

**Languages** — 420×180

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/languages.svg" width="420" alt="Most used languages">
```

**Inventory** — 420×196

```html
<img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/inventory.svg" width="420" alt="Equipped skills">
```

### A full layout

[`PROFILE-README.md`](./PROFILE-README.md) is the finished version of this — a
complete profile page with the feeding call-to-action, real URLs and every card
in place. Copy it to `USERNAME/USERNAME/README.md` and change the two names.

The bare layout, everything at once, with the rows lined up:

```html
<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/banner.svg" width="840" alt="Profile banner">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/marquee.svg" width="840" alt="Status ticker">
</p>

<p align="center">
  <a href="https://github.com/USERNAME/REPO/issues/new?title=feed%20GRUB">
    <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/pet.svg" width="540" alt="GRUB, the tamagotchi of shame">
  </a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/streak.svg" width="420" alt="Commit streak">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/star.svg" width="420" alt="Stars earned">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/eye.svg" width="420" alt="Lurkers versus people who fed him">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/stats.svg" width="420" alt="Profile statistics">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/languages.svg" width="420" alt="Most used languages">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/inventory.svg" width="420" alt="Equipped skills">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/divider.svg" width="840" alt="">
</p>
```

One limitation worth knowing: SVGs embedded via `<img>` cannot contain working
hyperlinks, so anything clickable has to be markdown around the image (or an
`<a>` wrapping the whole card). Same sandbox rules kill external fonts, external
CSS and any JavaScript, which is why the pixel type is drawn as rectangles and the
text uses a system monospace stack.

---

## Configuration

`grub.config.json` holds everything you'd want to change. It is **read only** —
the bot never writes it, so your edits survive every run. Delete the file and the
built-in defaults produce byte-identical output.

Abridged — see [`grub.config.json`](./grub.config.json) for every key:

```json
{
  "petName": "GRUB",
  "tagline": "// THE TAMAGOTCHI OF SHAME",
  "github": { "username": null, "includePrivate": false, "repo": null },
  "components": { "banner": true, "eye": true, "star": true, "marquee": true },
  "marquee": { "text": null, "mode": "scroll", "separator": "   ·   " },
  "inventory": {
    "slots": [
      { "slot": "Primary", "item": "NestJS" },
      { "slot": "Companion", "item": "GRUB" }
    ]
  },
  "labels": { "eye": { "lurkers": "LURKERS", "fed": "FED" } },
  "taglines": {},
  "palette": {}
}
```

| Key | Effect |
| --- | --- |
| `petName` | Renames the creature everywhere, including the tombstone |
| `tagline` | The `//` subtitle beside his name on the pet card |
| `github.username` | Whose profile to track. `null` auto-detects from CI or the git remote |
| `github.includePrivate` | Let private contributions feed him (see below) |
| `github.repo` | `owner/name` whose traffic the eye watches. `null` auto-detects |
| `components.*` | Set any to `false` and that SVG is never written |
| `labels.pet.feedMe` | The plea on the placard above his head. Long strings shrink to fit |
| `labels.pet.fedBy` | What the placard says instead once somebody has fed him |
| `marquee.text` | A string, or an array joined with `separator`. `null` runs the daily quote rotation |
| `marquee.mode` | `"scroll"` or `"type"` |
| `inventory.slots` | Any number of `{ slot, item }` rows. The one matching `petName` becomes the live companion |
| `labels.*` | Every fixed string on every card |
| `taglines` | The banner subtitle, per mood. All four say `what i do is art` out of the box; give one mood a different string and the others keep theirs |
| `palette` | Per-mood colour overrides, e.g. `{ "feral": { "accent": "#ff0000" } }` |

Rename the pet and write your own insults — the defaults are calibrated for me,
not you. Everything he says lives in `scripts/lib/copy.js`: the insult pool, the
banner subtitle, and `QUOTES`, the marquee's rotation.

### The daily quote

Leave `marquee.text` at `null` and the ticker runs one line a day from `QUOTES` —
jokes, a few genuinely-attributed quotes, and facts that are worth a second look.
Thirty of them, indexed by whole UTC days, so it turns over at midnight and does
not repeat inside a month. Add your own to the array; the ticker takes any length
and scrolls it. Set `marquee.text` to a string or an array and yours wins instead.

---

## Feeding him

The pet card asks: a placard over his head that bobs and blinks **FEED ME**. The
instructions live here and in the link above the card rather than on it — the
card stays a picture.

**Anyone can feed GRUB.** [Open an issue](../../issues/new?title=feed%20GRUB)
whose title starts with `feed` or `pet` — any capitalisation — and
`.github/workflows/feed.yml` runs, then replies and closes the issue. Nothing to
install, no account beyond the GitHub one you already have.

What you get for it, for the next 24 hours:

- **Your name on the card.** The placard flips from `FEED ME` to `FED BY
  @you` — on the profile README, where everyone can see it.
- **He reacts.** Food rains down, he squashes and stretches chewing it, hearts go
  up, sparkles go off, and there are crumbs on the ground when he is done.
- **A tally.** The `FED` number on the eye card goes up, permanently.

He does not thank you in the speech bubble. That belongs to his mood, and his
mood is about whether *I* have committed. After 24 hours the placard goes back to
asking, needily, as if none of it ever happened.

Maintainers can also label an existing issue `feed-grub`, or send a
`repository_dispatch` of type `feed-grub`.

### What a snack explicitly cannot do

Feed him, in the sense that matters. A snack never touches `hunger`, `mood`,
`alive`, `diedOn`, `resurrections` or `lastCommitDate` — `scripts/feed_grub.js`
asserts all six are unchanged and refuses to save if they aren't. Only commits
keep GRUB alive; only `i'm sorry` revives him. A stranger's sympathy is not an
apology.

That is the point of the `LURKERS` vs `FED` split on the eye card: the gap is how
many people looked at a starving worm and did nothing.

### Because it's a public write path

An issue from a stranger can cause a commit to this repo, so:

- **One snack per person per UTC day.** Repeats get a reply and no state change.
- **A repo-wide ceiling of 25 a day** (`MAX_PETS_PER_DAY`), so a pile of
  throwaway accounts is still only a pile of one commit each up to the cap.
- **Logins are validated** against GitHub's own rules — before being stored, and
  again in the renderer before one is drawn onto a public SVG.
- **No untrusted code ever runs.** An issue carries none, and the login and title
  arrive as environment variables rather than being interpolated into a shell
  command.
- **The daily job's concurrency group is reused**, so a feed and a cron run can't
  race each other's push.
- **Issues that aren't about the pet are left completely alone** — no reply and,
  importantly, no auto-close. If the script fails before deciding anything, the
  issue is also left alone, so a crash can't close someone's bug report.

### What `LURKERS` actually counts

The honest answer, because it is easy to assume otherwise.

**`FED` is exact.** It is the number of distinct logins in `feeders`. Those people
each opened an issue; there is nothing to estimate.

**`LURKERS` is unique visitors to this repository**, from GitHub's traffic API,
summed per day. On a profile README that is *almost exactly* "people who clicked
GRUB", because the card is the only thing on the page linking here — but it also
catches anyone who arrived from search, a link, or their own bookmarks.

A literal click counter is not possible without a server. The image cannot run
JavaScript, and the click itself is a plain navigation to GitHub that nobody gets
told about. The closest strictly-clicks alternative would be pointing the card at
a dedicated repo page and reading GitHub's *popular paths* endpoint — but that
one only reports a rolling 14-day aggregate for the top ten paths, with no daily
breakdown, so a running total off it could only ever be an estimate. Unique
visitors is the number that accumulates correctly, so that is the number on the
card.

The rest of the small print:

- Not a **profile README view counter**. Nobody's is: the image is served through
  a caching proxy that reports nothing back to anyone.
- The API only returns a rolling **14-day window**, so the total is accumulated
  locally in `pet-state.json`. It starts at zero on first run and there is **no
  backfill** of history.
- Uniques are counted per day, so one person visiting on three days counts three
  times. It's a lurker index, not a headcount.
- The traffic endpoint needs **push access**. Without a suitable token the card
  reuses its last known total and the job log says so — it never zeroes out.
- Total views are collected too, and stored, but not drawn — they live in the
  card's `<desc>`, which is what a screen reader gets.

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
file of state committed to the repo. **Zero dependencies** — no `package.json`, so
no `npm install` step in CI and the whole job runs in about fifteen seconds.

Adding a card is one file in `scripts/generators/` plus one line in its
`index.js`. The key you register it under is both the `--only` argument and the
output filename.

---

## Fork this for your own profile

1. **Fork or copy this repo.** It can be any public repo you own; it does not
   have to be your profile repo.

2. **Reset the state.** Overwrite `pet-state.json` with a fresh start:

   ```json
   {
     "lastCommitDate": "2026-01-01T00:00:00.000Z",
     "lastCheckedDate": "2026-01-01T00:00:00.000Z",
     "hunger": 0,
     "mood": "thriving",
     "alive": true,
     "diedOn": null,
     "resurrections": 0
   }
   ```

   Use today's date — seed it with an old one and your pet starts dead. Any keys
   you leave out are filled in from defaults.

3. **Check Actions permissions.** Settings → Actions → General → Workflow
   permissions → **Read and write permissions**. Without this the bot can't push
   the updated SVGs back.

4. **Edit `grub.config.json`.** Rename the pet, set your inventory slots, turn off
   any cards you don't want.

5. **Add a `PET_TOKEN` secret** if you want the eye's lurker count, or if the job log
   warns that your private work is invisible. See below.

6. **Run it once manually.** Actions tab → *Tamagotchi of Shame* → *Run workflow*.
   Leave the inputs blank for a real run.

7. **Embed the cards** in your profile README using the blocks above.

---

## Tokens

Two features want more than the Action's built-in `GITHUB_TOKEN`:

| Feature | Needs |
| --- | --- |
| `eye.svg` (the `LURKERS` half) | Push access to read the traffic API |
| Private contributions | A token that can see `contributionsCollection` |

Both are served by a single **classic PAT with `repo` scope**
([github.com/settings/tokens](https://github.com/settings/tokens)), stored as a
repo secret named `PET_TOKEN` (Settings → Secrets and variables → Actions). A
fine-grained token needs **Administration: read** for traffic, and does not
reliably serve `contributionsCollection` at all.

Without it: the eye reuses its stored lurker total, and everything else works
normally.

### Feeding it on private repos

If most of your work is private, the pet will starve while you are busy. Fixing
that is not just a scope change — GitHub genuinely will not tell you *when* you
committed to a private repo.

**What doesn't work:** `commitContributionsByRepository` (the GraphQL commit
contribution API) anonymises private work completely. It returns no repo name and
no date for private repos regardless of token scope — verified against a token
with full `repo` scope, querying `viewer` directly. All you get is an opaque
`restrictedContributionsCount`.

**What does work:** the `contributionCalendar`. Its per-day totals *do* include
private contributions, which makes it the only way to date private activity.

The catch, stated plainly: calendar days count **every** contribution type —
commits to default branches, pull requests, issues, reviews. Turning this on
means opening an issue also feeds the pet. If you want the creature to be a
strict commit detector, leave it off.

To enable, set `PET_INCLUDE_PRIVATE: '1'` in `.github/workflows/pet.yml` (or
`github.includePrivate` in `grub.config.json`) — then check the job log before
doing anything else.

**You may not need a token at all.** If you have *Include private contributions on
my profile* enabled in your GitHub profile settings, the calendar exposes your
private contribution counts to the built-in `GITHUB_TOKEN`, and it just works. The
job log prints `counting private work: N restricted contribution(s)` when this is
the case. If instead it warns that no private contributions are visible, add
`PET_TOKEN` as above.

Without `--include-private`, the script logs how many private contributions it
can see but is ignoring, so you can tell the difference between "you did nothing"
and "you did a lot, privately".

Note the apology commit is deliberately unaffected: resurrection is detected from
the public event feed and this repo's `HEAD`. A public death demands a public
apology.

---

## Testing locally

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

## Caveats

- By default **private commits don't count** — see "Feeding it on private repos",
  which is a genuine trade rather than a switch you just flip.
- GitHub proxies README images through its `camo` cache, so a freshly updated
  pet can lag by a few minutes before it shows up on your profile.
- The Action's own commits are filtered out by author and by `[skip ci]`, so the
  pet can never feed itself.
- The eye's `LURKERS` figure starts at zero on the day you first run it and
  counts repo traffic. It is not a profile README view counter, because no such
  thing is possible for anyone.
- Feeding him is cosmetic on purpose. If you were hoping the button would keep
  him alive, that is the joke.

---

*GRUB has no feelings. GRUB has a commit log. These are not the same thing, but
GRUB does not care about the distinction.*
