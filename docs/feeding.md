# Feeding him

Anyone can feed GRUB. Nobody can save him. Those are different things, and the
difference is the joke.

- [How to feed him](#how-to-feed-him)
- [What a snack explicitly cannot do](#what-a-snack-explicitly-cannot-do)
- [Because it's a public write path](#because-its-a-public-write-path)
- [What `LURKERS` actually counts](#what-lurkers-actually-counts)

---

## How to feed him

The pet card asks: a placard over his head that bobs and blinks **FEED ME**. The
instructions live here and in the link above the card rather than on it — the
card stays a picture.

**Anyone can feed GRUB.** [Open an issue](../../../issues/new?title=feed%20GRUB)
whose title starts with `feed` or `pet` — any capitalisation — and
`.github/workflows/feed.yml` runs, then replies and closes the issue. Nothing to
install, no account beyond the GitHub one you already have.

What you get for it, for the next 24 hours:

- **Your name on the card.** The placard flips from `FEED ME` to `FED BY
  @you` — on the profile README, where everyone can see it.
- **He reacts.** Food rains down, he squashes and stretches chewing it, hearts go
  up, sparkles go off, and there are crumbs on the ground when he is done.
- **A tally.** The `FED` number on the eye card goes up, permanently.

### What he gets

A berry, a donut, a coffee, a cold slice of pizza, a cookie, or a bug. Which one
is derived from your login and the date, so the reply naming it and the card
raining it agree without either asking the other — the only thing passing between
them is a snack id in `pet-state.json`.

Adding another is deliberately the smallest useful contribution in this repo:
some pixel art and one line of GRUB being ungrateful. The schema is in
[Add a snack](../CONTRIBUTING.md#add-a-snack), and the same shape works from
`grub.config.json` under `copy.snacks` if you only want it in your own fork.

He does not thank you in the speech bubble. That belongs to his mood, and his
mood is about whether *I* have committed. After 24 hours the placard goes back to
asking, needily, as if none of it ever happened.

Maintainers can also label an existing issue `feed-grub`, or send a
`repository_dispatch` of type `feed-grub`.

---

## What a snack explicitly cannot do

Feed him, in the sense that matters. A snack never touches `hunger`, `mood`,
`alive`, `diedOn`, `resurrections` or `lastCommitDate` — `scripts/feed_grub.js`
asserts all six are unchanged and refuses to save if they aren't. Only commits
keep GRUB alive; only `i'm sorry` revives him. A stranger's sympathy is not an
apology.

That is the point of the `LURKERS` vs `FED` split on the eye card: the gap is how
many people looked at a starving worm and did nothing.

---

## Because it's a public write path

An issue from a stranger can cause a commit to this repo, so:

- **One snack per person per day**, on the creature's clock. Repeats get a reply
  and no state change.
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

---

## What `LURKERS` actually counts

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
- The traffic endpoint needs **push access** — see [Tokens](./setup.md#tokens).
  Without a suitable token the card reuses its last known total and the job log
  says so; it never zeroes out.
- Total views are collected too, and stored, but not drawn — they live in the
  card's `<desc>`, which is what a screen reader gets.

---

← [Configuration](./configuration.md) · Next: [Development](./development.md)
