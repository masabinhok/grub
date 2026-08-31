# Profile view counter

A Cloudflare Worker that serves the eye card and counts how often GitHub's image
proxy asks for it.

The count is drawn on the eye card itself — the big number, no label. The Worker
does not draw that card: `scripts/generators/eye.js` does, once a day, and the
Worker is a turnstile in front of the committed result. One renderer, one copy
of the art.

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

> **how many times GitHub's camo image proxy fetched `/eye.svg`**

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

### `GET /eye.svg` — the one that matters

Serves the eye card from `assets/eye.svg` in the repo (set by `CARD_URL` in
`wrangler.toml`), counting the fetch on the way through. This is what
`PROFILE-README.md` points at, and pointing it back at `raw.githubusercontent`
is exactly how you turn the counter off without losing the card.

The upstream fetch is edge-cached for five minutes. That cannot cache away a
count — the increment happens before the fetch, and the response you get is
still `no-store`. If GitHub is unreachable the Worker falls back to the
self-contained badge below: a different shape, stretched by the profile's
`width="420"`, but a right number beats a broken image.

**The number on the card lags by up to a day.** The counting is live and exact;
the *drawing* happens in the daily workflow, which reads `views.json`. Every
other number on the profile is daily too. If you want the figure to tick in real
time, the Worker would have to render the card itself — which means a second
copy of the eye art in `counter/`, and that is the trade this design refuses.

### `GET /badge.svg`

A small self-contained badge, drawn by the Worker with no upstream fetch. Not
used by `PROFILE-README.md`; it exists as the fallback above, and as the way to
exercise the counter without touching your profile.

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
  "rejected": 42
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

Days are UTC buckets, matching the `isoDate` convention in
`scripts/lib/dates.js`: the badge is fetched from everywhere, and UTC is the
only clock that does not need a timezone argument to be reproducible.

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

Then point `PROFILE-README.md`'s eye card at your Worker (the line is already
there, with a comment explaining why it is the one image not served from
`raw.githubusercontent`), and set `CARD_URL` in `wrangler.toml` to your own
fork's `assets/eye.svg` before deploying.

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

It runs twice a day, on purpose:

- **`pet.yml`, at 17:45 UTC**, immediately before the cards are drawn. This is
  the one that matters for the number you see: the eye card is rendered from
  `views.json`, so refreshing it in the same run is what makes the count on the
  card current as of midnight rather than as of the previous morning. The step is
  `continue-on-error` — Cloudflare having a bad day must not stop the creature
  from updating.
- **`views.yml`, at 04:25 UTC**, on its own. This one is the backstop. It keeps
  the history accumulating even if the pet job is disabled, failing, or the repo
  has gone quiet, which is the whole reason the history lives in git.

Running it twice is free and idempotent: the merge only writes when a number
actually moved, and only commits when the file changed.

Set the Worker URL as a **repository variable** named `VIEWS_URL` (Settings →
Secrets and variables → Actions → Variables). Not a secret — it is a public URL
that is printed in the README anyway. Without it the workflow skips itself, so a
fork that never deployed the Worker does not collect a red X every morning.

Run it by hand any time from the Actions tab, or locally:

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

curl -s -A 'github-camo (abc123)' -D - -o /dev/null $B/eye.svg     # counts
curl -s -D - -o /dev/null $B/eye.svg                               # served, not counted
curl -s -I -A 'github-camo (abc123)' $B/eye.svg                    # HEAD, not counted
seq 1 50 | xargs -P 50 -I{} curl -s -o /dev/null -A 'github-camo (x)' $B/eye.svg
curl -s $B/stats.json
```

To exercise the upstream-failure fallback:

```sh
npx wrangler dev --var CARD_URL:https://example.invalid/nope.svg
curl -s -A 'github-camo (x)' $B/eye.svg | head -c 60   # the badge, still counted
```

`total` should be up by exactly 51, `rejected` by 2, and `total` should equal the
sum of `days`.
