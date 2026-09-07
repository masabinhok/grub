# 🪱 The Tamagotchi of Shame

**This creature dies if I stop coding.**

Meet **GRUB**. It lives in this repo, it watches my commit history, and it is not
supportive. At the end of every day in Kathmandu a GitHub Action checks whether I
committed anything. If I did, GRUB eats. If I didn't, GRUB starves — visibly, publicly, on
my profile — until it dies and leaves a tombstone with the date on it.

It can only be brought back by pushing a commit whose message is exactly
`i'm sorry`. The resurrection counter never resets.

<p align="center">
  <a href="../../issues/new?title=feed%20GRUB%20%F0%9F%8D%93&body=%F0%9F%8D%93%20**A%20snack%20has%20been%20prepared%20for%20GRUB.**%0A%0A-%20**Ration%3A**%20one%20%281%29%20suspiciously%20ripe%20strawberry%0A-%20**Delivered%20by%3A**%20a%20passing%20stranger%20with%20good%20intentions%0A-%20**Nutritional%20value%3A**%20none%20%E2%80%94%20purely%20emotional%0A%0A%3C!--%20Submit%20this%20issue%20to%20feed%20the%20pet%20and%20your%20name%20will%20be%20displayed%20on%20his%20card.%20--%3E%0A%0A**Just%20press%20%60Submit%20new%20issue%60.**%20GRUB%20will%20chew%2C%20sparkle%20and%20wear%20*your%20username*%20on%20his%20card%20for%20the%20next%2024%20hours%2C%20then%20close%20this%20issue%20himself.%0A%0A_Snacks%20are%20cosmetic%20%E2%80%94%20they%20cannot%20keep%20him%20alive.%20Only%20commits%20do%20that%2C%20and%20that%20is%20my%20problem%2C%20not%20yours._"><img src="./assets/pet.svg" alt="GRUB, the tamagotchi of shame" width="540"></a>
</p>

<p align="center">
  <b><a href="../../issues/new?title=feed%20GRUB%20%F0%9F%8D%93&body=%F0%9F%8D%93%20**A%20snack%20has%20been%20prepared%20for%20GRUB.**%0A%0A-%20**Ration%3A**%20one%20%281%29%20suspiciously%20ripe%20strawberry%0A-%20**Delivered%20by%3A**%20a%20passing%20stranger%20with%20good%20intentions%0A-%20**Nutritional%20value%3A**%20none%20%E2%80%94%20purely%20emotional%0A%0A%3C!--%20Submit%20this%20issue%20to%20feed%20the%20pet%20and%20your%20name%20will%20be%20displayed%20on%20his%20card.%20--%3E%0A%0A**Just%20press%20%60Submit%20new%20issue%60.**%20GRUB%20will%20chew%2C%20sparkle%20and%20wear%20*your%20username*%20on%20his%20card%20for%20the%20next%2024%20hours%2C%20then%20close%20this%20issue%20himself.%0A%0A_Snacks%20are%20cosmetic%20%E2%80%94%20they%20cannot%20keep%20him%20alive.%20Only%20commits%20do%20that%2C%20and%20that%20is%20my%20problem%2C%20not%20yours._">🍓 Feed GRUB</a></b> —
  opens a <b>pre-filled issue</b>, title and snack already written. Press
  <i>Submit new issue</i> and he chews, sparkles, and puts <b>your username on the
  card</b> for 24 hours. He closes the issue himself.
</p>

<!-- pet:caption -->
**thriving** · 1 day since the last commit · _Never died. Yet._
<!-- /pet:caption -->

> The line above is rewritten by the Action on every run. Don't edit it by hand;
> it will just overwrite you, which is thematically appropriate.

---

## Adopt one

<p align="center">
  <a href="https://github.com/masabinhok/grub/generate"><img src="./assets/cta.svg" width="840" alt="Use this template — adopt your own GRUB"></a>
</p>

<p align="center">
  <b><a href="https://masabinhok.github.io/grub/">Adopt one in three minutes →</a></b>
</p>

<p align="center">
  <a href="https://github.com/masabinhok/grub/generate">Use this template</a> ·
  <a href="../../fork">Fork it</a> ·
  <a href="./docs/setup.md">Full setup guide</a> ·
  <a href="./WALL-OF-SHAME.md">Wall of Shame</a>
</p>

The [adoption page](https://masabinhok.github.io/grub/) previews the cards with
**your** GitHub profile before you commit to anything, then hands you the exact
markdown and pre-filled links for every step. No signup, no token, no service —
it renders those previews in your browser using the same modules the Action runs.

**Use this template** gives you a clean repo with no commit history attached.
**Fork** keeps the link back here and shows up in the fork count. Either works —
the [setup](./docs/setup.md) is the same from both, and there is nothing to
install at either end.

Whichever you pick, **run this first**:

```bash
node scripts/adopt.js
```

A copy of this repo arrives carrying me — my cached profile, my streak, my stack,
and a `PROFILE-README.md` whose image URLs still point back here. That one
command clears the lot and rewrites the URLs to your repo. Browser only? Actions
tab → **Adopt this GRUB** → Run workflow. Then follow
[the setup guide](./docs/setup.md) the rest of the way.

The button above is one of the cards this thing generates, so it wears the
creature's current mood like everything else on the page. If GRUB is dead right
now, that button is grey. That is the honest advert.

---

## Documentation

| | |
| --- | --- |
| **[Setup](./docs/setup.md)** | Fork it for your own profile, Actions permissions, `PET_TOKEN`, private repos |
| **[Embedding the cards](./docs/embedding.md)** | Every card, copy-paste blocks, a full profile layout |
| **[Configuration](./docs/configuration.md)** | Every key in `grub.config.json`, your own snacks and insults |
| **[Feeding him](./docs/feeding.md)** | How anyone can feed GRUB, and the safety rules on a public write path |
| **[Development](./docs/development.md)** | Repo layout, the local CLI, adding a card |
| **[Contributing](./CONTRIBUTING.md)** | Send a snack, a quote or an insult — good first PRs |
| **[Wall of Shame](./WALL-OF-SHAME.md)** | Every GRUB running in public, ranked by deaths survived |

Want it on your own profile? **[Start here](./docs/setup.md)** — about five
minutes, no build step, zero dependencies.

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

### All four states

The card at the top of this page only ever shows the state GRUB is actually in,
which on a good day is the least interesting one. Here is the rest of it — real
renders, animating, no cloning required. Watch the colour drain out.

<table>
  <tr>
    <td align="center"><b>thriving</b> — day 0<br><sub>bouncing, bright, unbearable</sub></td>
    <td align="center"><b>hungry</b> — day 2<br><sub>dimmer, slower, keeping notes</sub></td>
  </tr>
  <tr>
    <td><img src="./docs/previews/pet-thriving.svg" width="420" alt="GRUB thriving"></td>
    <td><img src="./docs/previews/pet-hungry.svg" width="420" alt="GRUB hungry"></td>
  </tr>
  <tr>
    <td align="center"><b>feral</b> — day 4<br><sub>tearing, twitching, ribs out</sub></td>
    <td align="center"><b>deceased</b> — day 5+<br><sub>a tombstone with a date on it</sub></td>
  </tr>
  <tr>
    <td><img src="./docs/previews/pet-feral.svg" width="420" alt="GRUB feral"></td>
    <td><img src="./docs/previews/pet-deceased.svg" width="420" alt="GRUB deceased — the tombstone"></td>
  </tr>
</table>

The tombstone is the whole point of the exercise: it carries the death date, it
does not move, and it gets committed to your repo and rendered on your profile
until you [apologise in public](#resurrection).

And this is what a stranger gets for [feeding him](./docs/feeding.md) — food
rains down, he chews, and **their** username is on the card for 24 hours:

<p align="center">
  <img src="./docs/previews/pet-fed.svg" width="540" alt="GRUB being fed a donut by a visitor">
</p>

> These five are rendered off a pinned clock by `scripts/render_previews.js`, so
> they are stable, byte-identical between runs, and never quietly drift out of
> date with the real cards.

### Whose day is it

A day is a **calendar day in `timezone`** — `Asia/Kathmandu` out of the box — and
the Action runs at **23:30 local**, near the end of it. Those two facts belong
together: the job asks "was anything committed today?", so it has to ask while
today is still happening.

The upshot is the one you'd want. Commit at any point during a day and the count
stays at 0 when the day closes. Let a whole day go by untouched and it reads 1.
A commit at half past midnight counts for the day that just started — under a UTC
day boundary that same commit would have been filed five and three quarter hours
back, in yesterday, and the pet would have gone hungry over a commit that
happened.

Somewhere else in the world? Change `timezone` **and** the cron in
`.github/workflows/pet.yml` together; there is a worked example in the comment
above it. Only the creature's own clock moves — the traffic and contribution
numbers stay on GitHub's UTC days, because they are GitHub's to bucket.

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
| `assets/eye.svg` | 420×180 | An eye that watches back, counting profile views |
| `assets/star.svg` | 420×180 | One glazed star holding every star you've earned |
| `assets/stats.svg` | 420×180 | Repos, stars, followers, contributions |
| `assets/languages.svg` | 420×180 | Top languages as a segmented bar |
| `assets/inventory.svg` | 420×196 | Tech stack as an RPG equipment screen |
| `assets/cta.svg` | 840×64 | The adoption button at the top of this page |

Copy-paste blocks for all eleven, plus a finished profile layout, are in
**[Embedding the cards](./docs/embedding.md)**. Turn any of them off with
`components` in [`grub.config.json`](./grub.config.json).

---

## Feeding him

**Anyone can feed GRUB.** [Open an issue](../../issues/new?title=feed%20GRUB%20%F0%9F%8D%93&body=%F0%9F%8D%93%20**A%20snack%20has%20been%20prepared%20for%20GRUB.**%0A%0A-%20**Ration%3A**%20one%20%281%29%20suspiciously%20ripe%20strawberry%0A-%20**Delivered%20by%3A**%20a%20passing%20stranger%20with%20good%20intentions%0A-%20**Nutritional%20value%3A**%20none%20%E2%80%94%20purely%20emotional%0A%0A%3C!--%20Submit%20this%20issue%20to%20feed%20the%20pet%20and%20your%20name%20will%20be%20displayed%20on%20his%20card.%20--%3E%0A%0A**Just%20press%20%60Submit%20new%20issue%60.**%20GRUB%20will%20chew%2C%20sparkle%20and%20wear%20*your%20username*%20on%20his%20card%20for%20the%20next%2024%20hours%2C%20then%20close%20this%20issue%20himself.%0A%0A_Snacks%20are%20cosmetic%20%E2%80%94%20they%20cannot%20keep%20him%20alive.%20Only%20commits%20do%20that%2C%20and%20that%20is%20my%20problem%2C%20not%20yours._)
— it comes pre-filled, so press *Submit new issue* and he chews, sparkles, and
wears **your username on the card** for 24 hours. Any title starting with `feed`
or `pet` does the same. Nothing to install.

What he gets is picked from a pantry — a berry, a donut, a coffee, a cold slice,
a cookie, or a bug — and the reply tells you which, because the card is genuinely
raining that one. [Adding another](./CONTRIBUTING.md#add-a-snack) is a small
self-contained PR: some pixel art and one rude line.

It is also, deliberately, cosmetic. A snack never touches `hunger`, `mood` or
`alive` — only commits keep GRUB alive, and only `i'm sorry` revives him. That
gap between people who looked and people who acted is the whole point of the eye
card: a big view count, and a small `FED` beside it.

The full rules and the abuse limits on a public write path:
**[Feeding him](./docs/feeding.md)**.

---

## GRUBs in the Wild

Every GRUB running in public, ranked by **deaths survived** — the counter that
never resets. A high rank is not an achievement. It means that many commits in
your history read `i'm sorry`.

<p align="center">
  <b><a href="./WALL-OF-SHAME.md">🪦 See the Wall of Shame →</a></b>
</p>

**Getting on it takes one PR.** Adopt a GRUB, then add yourself to
[`wall-of-shame.json`](./wall-of-shame.json):

```json
{
  "user": "your-github-username",
  "repo": "the-repo-your-grub-lives-in",
  "petName": "WHATEVER YOU RENAMED IT TO",
  "note": "one dry line, 60 characters"
}
```

That is the whole submission. The table rebuilds itself on the next daily run:
`scripts/render_wall.js` reads each fork's `pet-state.json` — a public file in
every one of these repos — and re-ranks the wall. No form, no service, no
account beyond the GitHub one you have. Full field reference and the house rules
are on [the wall itself](./WALL-OF-SHAME.md#get-on-the-wall).

---

## Under the hood

```
scripts/update_pet.js          # entrypoint: CLI, state machine, writing files
scripts/feed_grub.js           # the feed counter, and nothing else
scripts/render_previews.js     # the four-state showcase, off a pinned clock
scripts/render_wall.js         # the Wall of Shame, off every fork's public state
scripts/lib/                   # state, github, palette, svg, glyphs, snacks, copy...
scripts/generators/            # one module per card + index.js registry
grub.config.json               # your settings. never written by the bot
pet-state.json                 # the only persistence layer. no database
wall-of-shame.json             # the fork list. one PR per entry
assets/*.svg                   # generated output, committed by CI
docs/previews/*.svg            # the showcase renders, regenerated on demand
.github/workflows/             # the daily cron, and feeding by anyone who asks
```

No backend, no database, no third-party services. Just the GitHub API and one
file of state committed to the repo. **Zero dependencies** — no `package.json`, so
no `npm install` step in CI and the whole job runs in about fifteen seconds.

Local commands and how to add a card: **[Development](./docs/development.md)**.

---

## Caveats

- By default **private commits don't count** — see [Feeding it on private
  repos](./docs/setup.md#feeding-it-on-private-repos), which is a genuine trade
  rather than a switch you just flip.
- GitHub proxies README images through its `camo` cache, so a freshly updated
  pet can lag by a few minutes before it shows up on your profile.
- The Action's own commits are filtered out by author and by `[skip ci]`, so the
  pet can never feed itself.
- The eye's view count starts at zero the day you deploy the Worker in
  `counter/`, and counts fetches of the card by GitHub's image proxy — i.e.
  renders of your profile README. It is not unique visitors: the proxy strips
  the viewer's IP, so that number is not measurable by anyone. Without the
  Worker the card renders a 0 and everything else still works.
  See **[counter/README.md](./counter/README.md)**.
- Feeding him is cosmetic on purpose. If you were hoping the button would keep
  him alive, that is the joke.

---

*GRUB has no feelings. GRUB has a commit log. These are not the same thing, but
GRUB does not care about the distinction.*
