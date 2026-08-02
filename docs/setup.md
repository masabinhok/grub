# Setup

Getting GRUB living on your own profile, start to finish. About ten minutes,
no build step, nothing to install.

> **The short way:** [the adoption page](https://masabinhok.github.io/grub/)
> walks the same steps with the forms pre-filled, and previews the cards with
> your own profile data first. It asks for no signup and no token — it just
> builds the links and the markdown for you. This page is the long-form version,
> and the reference when something goes wrong.

- [What you are building](#what-you-are-building)
- [1. Get a copy](#1-get-a-copy)
- [2. Make it yours](#2-make-it-yours) ← **do not skip this one**
- [3. Let the Action write](#3-let-the-action-write)
- [4. Set your timezone](#4-set-your-timezone)
- [5. Run it once](#5-run-it-once)
- [6. Your profile repo](#6-your-profile-repo)
- [7. Paste the README](#7-paste-the-readme)
- [8. Check it worked](#8-check-it-worked)
- [Tokens](#tokens)
- [Feeding it on private repos](#feeding-it-on-private-repos)
- [Turning yours into a template](#turning-yours-into-a-template)
- [When it goes wrong](#when-it-goes-wrong)

---

## What you are building

Two repos, doing two different jobs. Almost every setup problem is a confusion
between them, so it is worth being clear up front:

| | |
| --- | --- |
| **The GRUB repo** — your copy of this one | Runs the Action, holds `pet-state.json`, writes the SVGs into `assets/`. Can be named anything. Must be **public**. |
| **Your profile repo** — `your-login/your-login` | Holds a `README.md` that GitHub shows at the top of your profile. Contains no code — just `<img>` tags pointing at the SVGs in the first repo. |

Nothing is copied between them. The profile README links to raw URLs, GitHub
fetches those through its image cache, and the cards update on your profile
because the file behind the URL changed.

That is also why the repo has to be public: `raw.githubusercontent.com` will not
serve an image out of a private repo, and your profile would render as broken
image icons.

---

## 1. Get a copy

Two ways, differing in exactly one thing:

| | |
| --- | --- |
| **[Use this template](https://github.com/masabinhok/grub/generate)** | A clean repo, no commit history attached, not listed as a fork |
| **[Fork](https://github.com/masabinhok/grub/fork)** | Keeps the link back to the original and shows in its fork count |

Template is the tidier start if this is going to be *your* repo; fork is
friendlier if you plan to send changes back. Name it whatever you like — `grub`,
`tamagotchi`, `shame-machine`. Just make sure it is public.

> **Don't name it `your-login/your-login`.** That repo is your profile README and
> it is the *second* repo, in [step 6](#6-your-profile-repo). Putting the workflow
> there works, but every state commit the bot makes then lands on your profile
> repo's history, and you lose the clean separation.

---

## 2. Make it yours

**This is the step everybody skips, and it is the one that matters.**

A copy of this repo arrives carrying the person you copied it from. Not secrets —
all of it is public — but all of it renders on *your* profile:

| What you inherited | Where it shows up |
| --- | --- |
| `pet-state.json` → `cache.profile` | Their name, company, location, followers, repo count, star count and language mix, on your banner, stats, star and language cards |
| `pet-state.json` → `cache.streak` | Their streak and contribution total, on your streak card |
| `pet-state.json` → `feeders`, `pets` | Their feeders counted as yours, on the eye card |
| `grub.config.json` → `inventory.slots` | Their tech stack, on your equipment card |
| `wall-of-shame.json` | Their repo on your wall, yours nowhere |
| `PROFILE-README.md` | Absolute image URLs pointing at **their** repo — paste it unchanged and your profile shows their creature forever, no matter what your own Action does |
| `assets/*.svg` | Their rendered cards, live on your repo's README from the minute you copy it |

The cached profile is the sneaky one. `update_pet.js` falls back to
`cache.profile` whenever the GitHub API call fails, so a missing token doesn't
give you *empty* cards — it gives you **theirs**, indefinitely, with no error
that looks like an error.

One command clears all of it:

```bash
git clone https://github.com/your-login/your-repo.git
cd your-repo
node scripts/adopt.js
```

It resolves your login and repo name from the `origin` remote, resets
`pet-state.json` to a blank slate, puts you on your own wall, and rewrites every
URL in `PROFILE-README.md` to point at your repo. Then commit:

```bash
git add -A && git commit -m "chore: adopt GRUB" && git push
```

Options, all optional:

```bash
node scripts/adopt.js \
  --name WORM \                              # rename the creature
  --timezone Europe/Lisbon \                 # whose midnight it starves by
  --stack "Next.js,Postgres,TypeScript"      # your inventory slots
```

`--dry-run` prints the plan and writes nothing. `node scripts/adopt.js --help`
lists the rest. It refuses to run against `masabinhok/grub` itself, so a stray
clone of the original can't be reset by accident.

Left alone, `--stack` fills the inventory with `Your framework` / `Your database`
/ `Your language`. That is deliberate — a slot reading "Your language" is visibly
unfinished and gets fixed, whereas somebody else's stack sitting there looks
fine and ships.

### Never touching a terminal?

If you only work in the browser: **Actions** tab → **Adopt this GRUB** → **Run
workflow**. Same script, same result, committed for you. Fill in the pet name,
timezone and stack boxes or leave them blank.

If you would rather do it by hand, the equivalent is:

1. Replace the entire contents of `pet-state.json` with `{}`. Every key is filled
   in from defaults, so an empty object is a valid fresh start — and unlike
   deleting individual keys, nothing survives by being one you forgot.
2. In `grub.config.json`, rewrite `inventory.slots` and `petName`.
3. In `wall-of-shame.json`, replace the entry with your own.
4. In `PROFILE-README.md`, find-and-replace `masabinhok/grub` with
   `your-login/your-repo`.

---

## 3. Let the Action write

**Settings → Actions → General → Workflow permissions → Read and write
permissions.** Save.

The job commits the regenerated SVGs and the updated state file back to the repo.
Without this it runs, renders everything correctly, and fails on the push — the
log ends in a `403`, and nothing on your profile ever changes.

If you used **Fork** rather than **Use this template**, also check
**Actions → General → Fork pull request workflows** and confirm Actions are
enabled at all: GitHub disables scheduled workflows on new forks by default, and
there is usually a banner on the Actions tab asking you to enable them.

---

## 4. Set your timezone

Two places, and they have to agree.

In `grub.config.json`:

```json
{ "timezone": "Europe/Lisbon" }
```

Then the cron in `.github/workflows/pet.yml`, which is in **UTC**:

```yaml
- cron: '45 17 * * *'   # 23:30 in Kathmandu (UTC+05:45)
```

Aim for late evening in *your* zone, and not on the hour — GitHub's scheduler is
best-effort and runs latest when every repo in the world has asked for `:00`.

| You want | Your offset | UTC cron |
| --- | --- | --- |
| 23:30 Kathmandu | +05:45 | `45 17 * * *` |
| 23:30 Lisbon (winter) | +00:00 | `30 23 * * *` |
| 23:30 New York (winter) | −05:00 | `30 04 * * *` |
| 23:30 Berlin (winter) | +01:00 | `30 22 * * *` |
| 23:30 Tokyo | +09:00 | `30 14 * * *` |

Why both: the config decides which calendar day "days since the last commit" is
counted in, and the cron decides when the question gets asked. The job asks *"was
anything committed today?"*, so it has to ask while today is still happening.
Change one without the other and your day boundary lands somewhere nobody lives —
you commit at 9pm, the job has already run, and the creature starves over a
commit that happened.

GitHub's cron does not observe daylight saving. If your zone shifts, the check
drifts an hour twice a year. An hour of headroom before midnight absorbs it.

---

## 5. Run it once

**Actions** tab → **Tamagotchi of Shame** → **Run workflow** → leave every input
blank → green button.

Blank inputs mean a real run: it hits the API, writes `pet-state.json`, renders
`assets/`, and commits. Filling in *Pretend this many days have passed* renders a
simulation that is deliberately never saved.

Watch it finish. It takes about fifteen seconds, and it should end with a commit
titled `chore: update pet state [skip ci]`. Open `assets/banner.svg` in the repo
and confirm it has **your** name on it.

**Do not move on until this run has succeeded.** Until it does, `assets/` still
holds the cards you inherited, and step 7 would put them on your profile.

---

## 6. Your profile repo

The second repo. GitHub has a hidden feature: a public repo named **exactly the
same as your username** renders its `README.md` at the top of your profile page.

If you already have one, skip ahead. Otherwise:

1. [Create a new repository](https://github.com/new).
2. Name it your login, character for character —
   `octocat` → repo named `octocat`. GitHub will show a small note reading
   *"You found a secret! …is a special repository"*. If you don't see that note,
   the name is wrong.
3. **Public.** A private profile repo shows nothing.
4. Tick **Add a README file**.
5. Create.

---

## 7. Paste the README

Open `PROFILE-README.md` in your GRUB repo. If you ran step 2, every URL in it
already points at your own repo. Copy the whole thing into the `README.md` of
your profile repo and commit.

Sanity check before you do — one of the image URLs should read:

```
https://raw.githubusercontent.com/YOUR-LOGIN/YOUR-REPO/main/assets/pet.svg
```

If it still says somebody else's login, go back to [step 2](#2-make-it-yours).

Keep what you like and delete the rest; the cards are independent and any of them
can be dropped, reordered or resized. Individual copy-paste blocks, sizes and a
few alternative layouts are in **[Embedding the cards](./embedding.md)**.

If your default branch is `master`, or you renamed it, change `/main/` in the
URLs to match — that path segment is a branch name, not a keyword.

---

## 8. Check it worked

Load `github.com/your-login`. You should see your cards, animating.

**Give it a few minutes.** GitHub serves README images through its `camo` proxy,
which caches aggressively — a card you regenerated thirty seconds ago can keep
showing the old version for a while. This is the single most common "it's
broken" that isn't broken. Open the `raw.githubusercontent.com` URL directly in a
tab: if that shows the new card and your profile doesn't, it is only the cache.

Then, the honest test of the whole thing: **don't commit tomorrow.** The day
after, the banner should read `HUNGRY` and the colour should be visibly duller.

Optional last step — put yourself on the shared
[Wall of Shame](../WALL-OF-SHAME.md#get-on-the-wall). It ranks every public GRUB
by deaths survived, read live from each repo's `pet-state.json`. One PR against
`masabinhok/grub`, adding four lines to `wall-of-shame.json`.

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

---

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
commits to default branches, pull requests, issues, reviews. Leaving this on
means opening an issue also feeds the pet. If you want the creature to be a
strict commit detector, turn it off.

The shipped workflow has it **on**: `PET_INCLUDE_PRIVATE: '1'` in
`.github/workflows/pet.yml`. Set it to `'0'` (or drop the line) for commits only.
The equivalent config key is `github.includePrivate`.

**You may not need a token at all.** If you have *Include private contributions on
my profile* enabled in your GitHub profile settings, the calendar exposes your
private contribution counts to the built-in `GITHUB_TOKEN`, and it just works. The
job log prints `counting private work: N restricted contribution(s)` when this is
the case. If instead it warns that no private contributions are visible, add
`PET_TOKEN` as above.

With private work excluded, the script still logs how many private contributions
it can see but is ignoring, so you can tell the difference between "you did
nothing" and "you did a lot, privately".

Note the apology commit is deliberately unaffected: resurrection is detected from
the public event feed and this repo's `HEAD`. A public death demands a public
apology.

---

## Turning yours into a template

The **Use this template** button only exists on repos that have been marked as
one, and the setting is off by default — a `/generate` link to a repo without it
just 404s.

Settings → General → **Template repository** → tick it. That's the whole change:
no workflow edits, nothing rebuilt, and forking still works exactly as before for
anyone who prefers it.

Worth doing if you want other people running your version. The `cta.svg` card
points at `cta.upstream` in `grub.config.json`, which ships pointing at
`masabinhok/grub` — so out of the box your copy sends people to the original.
`adopt.js` deliberately leaves that alone. Point it at yourself and it sends them
to you instead:

```json
{ "cta": { "upstream": "your-login/your-repo" } }
```

---

## When it goes wrong

| Symptom | Cause |
| --- | --- |
| Cards show somebody else's name, stars or languages | You skipped [step 2](#2-make-it-yours), or the API call failed and it fell back to the inherited `cache.profile`. Run `adopt.js`, then re-run the workflow. |
| Profile shows the right cards but they never change | The URLs in your profile README still point at the original repo. Check one against [step 7](#7-paste-the-readme). |
| Job succeeds, profile never updates | `camo` cache. Open the raw URL directly to confirm, then wait. |
| Job fails on the last step with `403` | Workflow permissions are read-only — [step 3](#3-let-the-action-write). |
| Broken image icons on your profile | The GRUB repo is private, or the branch in the URL is wrong (`main` vs `master`). |
| Nothing at all on your profile page | The profile repo name doesn't exactly match your login, or it is private. |
| The cron never fires | Scheduled workflows are disabled on new forks until you enable them on the Actions tab. GitHub also disables them on repos with no activity for 60 days. |
| `LURKERS` stuck at 0 | No `PET_TOKEN`, or it isn't a classic PAT with `repo` scope — [Tokens](#tokens). |
| Pet starves on days you worked | Your work is private, or the cron and `timezone` disagree — steps [4](#4-set-your-timezone) and [private repos](#feeding-it-on-private-repos). |
| Pet is dead and won't come back | The apology has to be the **first line** of a commit on your default branch, and pushed. Case and punctuation don't matter — `I'm sorry`, `Im sorry` and `i’m sorry` all count — but it is read from the public event feed, so a private or unpushed commit won't do it. |

---

← [Back to the README](../README.md) · Next: [Embedding the cards](./embedding.md)
