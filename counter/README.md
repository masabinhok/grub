# Profile view counter

A Cloudflare Worker that serves the streak card and counts how often GitHub's
image proxy asks for it.

The count is recorded, not displayed. Nothing on the profile shows it; it lives
in `/stats.json` on the Worker and in `views.json` in the repo, folded in by the
daily workflow. The streak card is just the turnstile — it was going to be on the
profile anyway, and every render of the README fetches it once. The Worker does
not draw it: `scripts/generators/streak.js` does, once a day, and the Worker
passes the committed result through. One renderer, one copy of the art.

It deploys on its own and is not part of the site build. `vercel.json` builds
`site/` via `scripts/build_site.js` and never looks in this directory; nothing
here runs on Vercel, and nothing in `site/` needs this Worker to exist.

---

## What this actually measures

Read this before you put the number in front of anyone.

**GitHub does not expose profile page views.** Not in the UI, not in the REST
API, not in GraphQL. The traffic API covers repositories only — views and clones
of `github.com/you/some-repo`, never `github.com/you`. There is no endpoint this
could have called instead.

So the counter measures exactly one event:

> **how many times GitHub's camo image proxy fetched `/streak.svg`**

which happens when somebody renders the profile README **in a browser**. That is
a decent proxy for "someone looked at my profile", and it is not the same thing.
Four consequences, none of which are papered over anywhere in this code:

**Unique visitors are impossible.** Camo fetches the image on the reader's
behalf from Cloudflare's own network. Every request arrives from camo, with
camo's IP and camo's headers; the reader's address never reaches us. There is no
signal to deduplicate on, so there is no unique-visitor number on the badge, in
`/stats.json`, or in `views.json`. Any badge that shows you one is inventing it.

**The count is naturally bot-light.** Scrapers that read the raw markdown never
load the image, so they never touch camo and never reach this Worker. That is a
happy accident of the mechanism rather than filtering on our part.

**Most badges undercount, and this one tries not to.** Camo caches aggressively
by default, so the usual counter badge is only fetched once per cache period no
matter how many people scroll past it. Every response here carries
`Cache-Control: no-cache, no-store, must-revalidate, max-age=0`, `Pragma`,
`Expires: 0` and `CDN-Cache-Control: no-store`, and deliberately carries **no
`ETag` and no `Last-Modified`** — with no validator to send, a revalidating camo
cannot be answered with a `304` that would skip the increment.

**Anyone who knows the URL could inflate it.** The gate against that is the
User-Agent: only requests whose UA matches `github-camo` (case-insensitively —
camo sends `github-camo (<hash>)`, and the hash rotates) are counted. Everything
else is served the badge and tallied under `rejected` instead. This stops a
browser tab, a curl and a link preview from moving the number. It is not a
security control and cannot be: any client can send any User-Agent. If somebody
wants to sit there forging camo's UA, they can, and the number will be wrong.

The badge says `PROFILE VIEWS` because that is what fits on a badge. What it
counts is README renders. It is not a "real profile views" counter, and if you
adopt this repo, please do not describe it as one.

---

## Endpoints

### `GET /streak.svg` — the one that matters

Serves the streak card from `assets/bare/streak.svg` in the repo (set by
`CARD_URL` in `wrangler.toml`), counting the fetch on the way through. This is
what `PROFILE-README.md` points at, and pointing it back at
`raw.githubusercontent` is exactly how you turn the counter off without losing
the card.

The upstream fetch is edge-cached for five minutes. That cannot cache away a
count — the increment happens before the fetch, and the response you get is
still `no-store`. If GitHub is unreachable the Worker serves a blank card of the
same size rather than the badge below: the count is not meant to be on the
profile, and an outage is no reason to put it there. If raw.githubusercontent is
down, every other card on the page is missing too, so a gap fits in.

### `GET /badge.svg`

A small self-contained badge that *does* draw the count, rendered by the Worker
with no upstream fetch. Not used by `PROFILE-README.md`; it is the way to
exercise the counter without touching your profile, and the drop-in if you ever
want the number back on show.

Both image routes count into the same total — both mean "somebody rendered the
profile README", and only one is ever embedded at a time.

Both serve the image **always**, counted or not. An uncounted request still came
from somebody looking at an image, and breaking it to make a point about
accuracy would just leave a broken image on the profile.

A request is counted only when **both** hold:

| condition | why |
|---|---|
| method is `GET` | `HEAD` is camo sizing or revalidating an image on its own account. Nobody is reading anything when it does. |
| User-Agent matches `/github-camo/i` | the anti-inflation gate described above |

Response headers, on every single request:

```
Content-Type:      image/svg+xml; charset=utf-8
Cache-Control:     no-cache, no-store, must-revalidate, max-age=0
Pragma:            no-cache
Expires:           0
CDN-Cache-Control: no-store
```

and no `ETag`, no `Last-Modified`.

### `GET /stats.json`

Public, read-only, `Cache-Control: public, max-age=60`, CORS open so the static
site can chart it later. Reading it never moves a number.

```json
{
  "total": 1234,
  "today": 17,
  "days": { "2026-08-31": 17 },
  "since": "2026-08-31T03:54:24.711Z",
  "rejected": 42,
  "self": 9
}
```

- `total` — counted views, all time. Always equals the sum of `days`.
- `today` — the current UTC day's bucket.
- `days` — every UTC day that has ever had a view, oldest first.
- `since` — ISO timestamp of the first request this counter ever saw, counted
  or not.
- `rejected` — badge requests that were served but **not** counted: a non-camo
  User-Agent, or a `HEAD`. Deliberately a superset of "someone hit the URL by
  hand", because the useful question is how much traffic the gate is filtering,
  not which reason it used. If this number is wildly larger than `total`,
  somebody is hammering the URL directly and the gate is doing its job.
- `self` — your own views, taken back by the userscript below. Not in `total`
  or in `days`.

Days are UTC buckets, matching the `isoDate` convention in
`scripts/lib/dates.js`: the badge is fetched from everywhere, and UTC is the
only clock that does not need a timezone argument to be reproducible.

### `POST /self` — "that was me"

Takes back the most recent counted view from the last 20 seconds and files it
under `self`. Needs the header `X-Self-Key: <SELF_KEY>`; a wrong or missing key
is a `403`, and with no `SELF_KEY` set the route does not exist (`404`). Returns
`{"claimed": true|false, "self": n}`. One request takes back at most one view,
so a leaked key can hide views but never add any.

Nothing calls this but `self-view.user.js`, described next.

---

## Not counting yourself

The Worker has no way to recognise you. Camo fetches the image from GitHub's own
servers, and by the time the request reaches the Worker the cookie, the referrer,
the browser and the IP are all gone — every view, yours included, arrives from a
GitHub address as `github-camo (<hash>)`. So your browser has to say so.

[`self-view.user.js`](./self-view.user.js) is a userscript that watches for the
counted card being fetched on any GitHub page and posts to `/self` each time.
It triggers on the browser's Resource Timing feed rather than the image's `load`
event: the feed only records fetches that went over the network, which are
exactly the ones the Worker counted, whereas `load` also fires when the browser
reuses the image from memory — and a ping with no view of yours behind it would
take back a stranger's.

**Set it up:**

1. Make a key and give it to the Worker. Run from `counter/`, and keep the key —
   the script needs it too:

   ```sh
   openssl rand -hex 32 | tee /dev/stderr | npx wrangler secret put SELF_KEY
   ```

2. Install [Tampermonkey](https://www.tampermonkey.net/) or
   [Violentmonkey](https://violentmonkey.github.io/) in every browser you look at
   your profile from.
3. Create a new script, paste in `self-view.user.js`, and replace
   `PASTE-YOUR-SELF_KEY-HERE` with the key. Save. Do not commit the edited file.
4. Check it: open your profile, then `/stats.json` — `self` should have gone up
   by one and `total` should not have moved. The browser console on the profile
   also logs `[grub-views] not me: 200 {"claimed":true,...}`.

**What it does not cover.** Anywhere the script is not installed: your phone,
the GitHub mobile app, a browser you forgot. Those still count as views. And a
stranger whose view lands in the same 20 seconds as one of yours can be taken
back instead of yours — at a few views a day, rare, and the reason a ping only
ever claims one.

**The history can keep the odd one.** The daily merge snapshots the current UTC
day and later takes `max(committed, fetched)` for past days, so a view of yours
that was counted just before the snapshot and taken back just after it stays in
`views.json`. It needs your visit to straddle the daily run to within twenty
seconds.

---

## Storage

One Durable Object with SQLite storage, one named instance
(`idFromName('profile-views')`), created by the `v1` migration in
`wrangler.toml`.

```sql
CREATE TABLE days (date TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE meta (key  TEXT PRIMARY KEY, value TEXT NOT NULL);  -- total, rejected, since
```

**Not Workers KV.** KV is eventually consistent and rate limits to roughly one
write per second per key, on top of a small daily free write allowance. A badge
gets hit in bursts — one profile load can fan out to several camo fetches — so a
KV counter would silently lose increments *and* burn through the quota doing it.
A Durable Object is single-threaded and strongly consistent: every request for
this name lands on the same object, in order, and an increment is a real
read-modify-write that cannot be lost. Verified below with 50 concurrent
requests landing as exactly 50.

---

## Deploy

```sh
cd counter
npx wrangler login      # once
npx wrangler deploy
```

That prints the URL, `https://grub-views.<your-subdomain>.workers.dev`. Check it:

```sh
curl -s https://grub-views.<your-subdomain>.workers.dev/stats.json
```

Then point `PROFILE-README.md`'s streak card at your Worker (the line is already
there, with a comment explaining why it is the one image not served from
`raw.githubusercontent`), and set `CARD_URL` in `wrangler.toml` to your own
fork's `assets/bare/streak.svg` before deploying.

### Custom domain (optional)

`*.workers.dev` works, but a subdomain you own means the URL in the README
survives renaming the Worker, and stays out of the way of corporate proxies that
are unenthusiastic about `workers.dev`. Uncomment the `[[routes]]` block at the
bottom of `wrangler.toml`, set your zone, and add the record in the Cloudflare
dashboard. The zone has to be on the same Cloudflare account.

### Cost

Free. This runs entirely inside the Workers Free plan — **SQLite-backed Durable
Objects have been included on the free plan since April 2025**, which is exactly
what the `new_sqlite_classes` migration in `wrangler.toml` creates. (The
key-value storage backend is the one that still needs a paid plan. This does not
use it.)

Free plan, per day:

| | included | what a busy profile actually uses |
|---|---|---|
| requests | 100,000 | one per README render |
| rows read | 5,000,000 | ~3 per request |
| rows written | 100,000 | 2 per counted view |
| SQL storage | 5 GB total | one row per day, forever — call it 30 KB a decade |

The write limit is the first one you would ever hit, and it caps out around
50,000 counted views a day. If a GitHub profile is drawing that, the badge is no
longer your most interesting problem.

---

## Keeping the history

The Durable Object is the live counter; it is not an archive. `scripts/merge_views.js`
reads `/stats.json` and folds it into `views.json` at the repo root — append-only
per day, past days never rewritten downward. If the DO is ever wiped, the history
is still in git and the total plateaus instead of falling off a cliff.

It runs once a day, inside **`pet.yml` at 18:15 UTC** (00:00 Kathmandu),
immediately before the cards are drawn. Nothing on the profile displays the
count any more, but `views.json` is still the durable record — and the eye card
still draws from it for anyone who embeds that card.

It used to be two jobs — this one plus a separate `views.yml` on its own
schedule — and that was worse in both directions. The two raced for the same push
to `main`, and whichever ran second drew a card whose number was hours older than
the run that drew it. One job, one push, one number.

Nothing is lost by dropping to a single daily merge. Days are UTC buckets and the
Worker keeps a full per-day map, so a late or skipped run picks up every day it
missed; the current day's partial bucket is simply overwritten with the complete
one on the next run. The step is `continue-on-error` — Cloudflare having a bad
night must not stop the creature from updating.

Set the Worker URL as a **repository variable** named `VIEWS_URL` (Settings →
Secrets and variables → Actions → Variables). Not a secret — it is a public URL
that is printed in the README anyway. Without it the merge step skips itself and
the rest of the job carries on, so a fork that never deployed the Worker still
gets its creature updated.

Run it by hand any time from the Actions tab (**Tamagotchi of Shame** → **Run
workflow**), or locally:

```sh
VIEWS_URL=https://grub-views.<your-subdomain>.workers.dev node scripts/merge_views.js
```

---

## Local development

```sh
cd counter
npx wrangler dev
```

Runs the real Durable Object against local SQLite. The verification suite:

```sh
B=http://127.0.0.1:8787

curl -s -A 'github-camo (abc123)' -D - -o /dev/null $B/streak.svg  # counts
curl -s -D - -o /dev/null $B/streak.svg                            # served, not counted
curl -s -I -A 'github-camo (abc123)' $B/streak.svg                 # HEAD, not counted
seq 1 50 | xargs -P 50 -I{} curl -s -o /dev/null -A 'github-camo (x)' $B/streak.svg
curl -s $B/stats.json
```

To exercise the upstream-failure fallback:

```sh
npx wrangler dev --var CARD_URL:https://example.invalid/nope.svg
curl -s -A 'github-camo (x)' $B/streak.svg | head -c 60   # a blank card, still counted
```

`total` should be up by exactly 51, `rejected` by 2, and `total` should equal the
sum of `days`.
