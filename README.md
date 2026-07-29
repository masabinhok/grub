# 🪱 The Tamagotchi of Shame

**This creature dies if I stop coding.**

Meet **GRUB**. It lives in this repo, it watches my commit history, and it is not
supportive. Every day at midnight UTC a GitHub Action checks whether I committed
anything. If I did, GRUB eats. If I didn't, GRUB starves — visibly, publicly, on
my profile — until it dies and leaves a tombstone with the date on it.

It can only be brought back by pushing a commit whose message is exactly
`i'm sorry`. The resurrection counter never resets.

<p align="center">
  <img src="./assets/pet.svg" alt="GRUB, the tamagotchi of shame" width="540">
</p>

<!-- pet:caption -->
**thriving** · 0 days since the last commit · _Never died. Yet._
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

## The components

The pet is the centrepiece, but the same state file themes a whole set of cards.
Every one of them reads GRUB's mood, so when he starves the entire README
desaturates together — and when he dies, **nothing on the page animates at all.**

| File | Size | What it shows |
| --- | --- | --- |
| `assets/banner.svg` | 840×120 | Name, location, mood-reactive status pips |
| `assets/pet.svg` | 540×300 | GRUB himself |
| `assets/streak.svg` | 420×180 | Current + longest streak, 30-day sparkline |
| `assets/stats.svg` | 420×180 | Repos, stars, followers, contributions |
| `assets/languages.svg` | 420×180 | Top languages as a segmented bar |
| `assets/divider.svg` | 840×12 | Dashed rule that drifts while alive, freezes when dead |

Streaks come from the contribution calendar, so **private work counts** when
`PET_INCLUDE_PRIVATE` is on. See [`PROFILE-README.md`](./PROFILE-README.md) for a
ready-to-paste layout using all of them.

Preview any mood without touching real state:

```bash
node scripts/update_pet.js --mood feral --outdir /tmp/preview --offline
node scripts/update_pet.js --only streak      # render just one component
```

One limitation worth knowing: SVGs embedded via `<img>` cannot contain working
hyperlinks, so anything clickable has to be markdown around the image (or an
`<a>` wrapping the whole card). That is why the project list is a table and not
a generated graphic.

## What's in here

```
scripts/update_pet.js       # everything: API calls, state machine, SVG renderers
pet-state.json              # the only persistence layer. no database.
assets/*.svg                # generated output, committed by CI
PROFILE-README.md           # paste-ready profile layout
.github/workflows/pet.yml   # daily cron + manual trigger
```

No backend, no database, no third-party services. Just the GitHub REST API with
the Action's built-in `GITHUB_TOKEN`, and one file of state committed to the repo.
The script has zero dependencies — no `npm install` step in CI.

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

   (Use today's date. If you seed it with an old date, your pet starts dead.)

3. **Check Actions permissions.** Settings → Actions → General → Workflow
   permissions → **Read and write permissions**. Without this the bot can't push
   the updated SVG back.

4. **Run it once manually.** Actions tab → *Tamagotchi of Shame* → *Run workflow*.
   Leave the inputs blank for a real run.

5. **Embed it in your profile README** (the `username/username` repo):

   ```markdown
   <img src="https://raw.githubusercontent.com/USERNAME/REPO/main/assets/pet.svg" width="540">
   ```

   Replace `USERNAME` and `REPO`. Use the raw URL, not a relative path — relative
   paths only resolve inside the repo that contains the file.

6. **Rename the pet** by editing `PET_NAME` and the `LINES` object at the top of
   `scripts/update_pet.js`. Write your own insults; the defaults are calibrated
   for me, not you.

## Feeding it on private repos

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

To enable, set `PET_INCLUDE_PRIVATE: '1'` in `.github/workflows/pet.yml` — then
check the job log before doing anything else.

**You may not need a token at all.** If you have *Include private contributions on
my profile* enabled in your GitHub profile settings, the calendar exposes your
private contribution counts to the Action's built-in `GITHUB_TOKEN`, and it just
works. The job log prints `counting private work: N restricted contribution(s)`
when this is the case.

If instead the log warns that no private contributions are visible, add a token:

1. Create a **classic PAT** with `repo` scope
   ([github.com/settings/tokens](https://github.com/settings/tokens)). Fine-grained
   tokens do not reliably serve `contributionsCollection`.
2. Add it as a repo secret named `PET_TOKEN`
   (Settings → Secrets and variables → Actions).

Locally:

```bash
PET_TOKEN=$(gh auth token) node scripts/update_pet.js --include-private --dry-run
```

Without `--include-private`, the script logs how many private contributions it
can see but is ignoring, so you can tell the difference between "you did nothing"
and "you did a lot, privately".

Note the apology commit is deliberately unaffected: resurrection is detected from
the public event feed and this repo's `HEAD`. A public death demands a public
apology.

## Testing locally

```bash
node scripts/update_pet.js --help          # usage
node scripts/update_pet.js --days 3 --dry-run   # see 'feral' without writing anything
node scripts/update_pet.js --days 5 --out /tmp/dead.svg   # render one state to a scratch file
```

`--days N` skips the API entirely and pretends N days have passed. `--out` writes
the SVG somewhere else and leaves `pet-state.json` untouched, which is the safe
way to preview states without corrupting your real pet.

## Caveats

- By default **private commits don't count** — see "Feeding it on private repos"
  below, which is a genuine trade rather than a switch you just flip.
- GitHub proxies README images through its `camo` cache, so a freshly updated
  pet can lag by a few minutes before it shows up on your profile.
- The Action's own commits are filtered out by author and by `[skip ci]`, so the
  pet can never feed itself.

---

*GRUB has no feelings. GRUB has a commit log. These are not the same thing, but
GRUB does not care about the distinction.*
