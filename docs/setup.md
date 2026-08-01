# Setup

Getting GRUB running on your own profile. Five minutes, no build step, no
dependencies.

- [Fork it](#fork-it)
- [Tokens](#tokens)
- [Feeding it on private repos](#feeding-it-on-private-repos)

---

## Fork it

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
   any cards you don't want, and set `timezone` to yours — then move the cron in
   `.github/workflows/pet.yml` to match, so the daily check still lands at the end
   of your day rather than somebody else's. Full key reference:
   [Configuration](./configuration.md).

5. **Add a `PET_TOKEN` secret** if you want the eye's lurker count, or if the job
   log warns that your private work is invisible. See [Tokens](#tokens).

6. **Run it once manually.** Actions tab → *Tamagotchi of Shame* → *Run workflow*.
   Leave the inputs blank for a real run.

7. **Embed the cards** in your profile README — the blocks are in
   [Embedding the cards](./embedding.md).

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

← [Back to the README](../README.md) · Next: [Embedding the cards](./embedding.md)
