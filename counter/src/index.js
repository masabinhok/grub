import { renderBadge } from './badge.js';

export { ViewCounter } from './counter.js';

/**
 * A profile view counter that is honest about what it counts.
 *
 * GitHub exposes no profile-page analytics — not in the UI, not in the API. The
 * traffic API covers repositories only. So this measures exactly one event: a
 * fetch of /badge.svg by GitHub's camo image proxy, which happens when somebody
 * renders the profile README in a browser. See counter/README.md before putting
 * a number from here in front of anyone.
 *
 * The two things that make the number better than the usual badge:
 *
 *   - no-store on every response, and no validators, so camo cannot serve a
 *     cached copy or revalidate into a 304 and skip us
 *   - a camo gate, so hitting the URL by hand does not move the number
 */

/** One counter, one name, forever. Changing this string starts a new count. */
const COUNTER_NAME = 'profile-views';

/**
 * Camo identifies itself as `github-camo (<hash>)`. The hash rotates, so only
 * the prefix is stable. Case-insensitive because a proxy in front of us is free
 * to normalise header casing, and this is a heuristic either way — it stops
 * casual inflation from a browser or a curl, which is what it is for. It is not
 * a security control, and cannot be: any client can send any User-Agent.
 */
const CAMO = /github-camo/i;

/** Never let a conditional request turn into a 304 that skips the counter. */
function badgeHeaders() {
  return {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    // Belt and braces: the three header families every layer between here and
    // the reader might listen to. No ETag and no Last-Modified anywhere —
    // without a validator there is nothing for camo to revalidate against.
    'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    // Cloudflare's own edge cache reads this one in preference to Cache-Control.
    // Without it the Worker's response can be served from a colo without ever
    // reaching the Durable Object.
    'CDN-Cache-Control': 'no-store',
  };
}

/**
 * The eye card, as rendered by the daily workflow and committed to assets/.
 *
 * The Worker proxies it rather than drawing it: the art, the palette and the
 * mood machinery all live in scripts/generators/eye.js, and a second copy in
 * here would drift the first time somebody edited one of them. So there is one
 * renderer, and this is a turnstile in front of it.
 *
 * What that costs: the number drawn on the card is the committed total from
 * views.json, refreshed by the daily workflow, so the *display* lags by up to a
 * day. The *counting* does not — every camo fetch is recorded live and exactly.
 * Every other number on the profile is daily too, so the card is not the odd one
 * out.
 *
 * The upstream fetch is cached at the edge for five minutes. That saves a GitHub
 * round trip on a hot path; it cannot cache away a count, because the increment
 * happens before this is ever called and the outer response is still no-store.
 */
async function fetchCard(env) {
  if (!env.CARD_URL) return null;
  try {
    const res = await fetch(env.CARD_URL, {
      cf: { cacheTtl: 300, cacheEverything: true },
      headers: { 'User-Agent': 'grub-views' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (_) {
    // GitHub being down must not take the badge down with it — the caller falls
    // back to the self-contained badge, which needs nothing but the count.
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const stub = env.VIEWS.get(env.VIEWS.idFromName(COUNTER_NAME));

    // Both image routes count into the same total, because both mean the same
    // thing: somebody's browser rendered the profile README. Only one of them is
    // ever embedded at a time, so there is nothing to double-count.
    //
    //   /eye.svg    the real card, and what PROFILE-README.md points at
    //   /badge.svg  a small self-contained alternative, and the fallback below
    if (url.pathname === '/eye.svg' || url.pathname === '/badge.svg') {
      const ua = request.headers.get('user-agent') || '';
      // HEAD is excluded deliberately. Camo issues one on its own account when
      // it is sizing or revalidating an image, and no human is looking at
      // anything when it does.
      const counted = request.method === 'GET' && CAMO.test(ua);

      // Both branches touch the DO: the rejected tally is the evidence for the
      // counted one. The badge is served either way — an uncounted request is
      // still somebody looking at an image, and breaking it to make a point
      // about accuracy would just show a broken image on the profile.
      const stats = counted ? await stub.record() : await stub.reject();

      // Counting first, art second: whether the card renders has no bearing on
      // whether the view happened.
      const card = url.pathname === '/eye.svg' ? await fetchCard(env) : null;

      // The fallback is the standalone badge. It is a different shape, so a
      // profile using width="420" will stretch it — deliberately: a slightly
      // wrong-looking card that still shows the right number beats a broken
      // image icon on somebody's profile.
      return new Response(card || renderBadge(stats.total, counted), {
        status: 200,
        headers: badgeHeaders(),
      });
    }

    if (url.pathname === '/stats.json') {
      const stats = await stub.stats();
      return new Response(JSON.stringify(stats, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          // Safe to cache: it is read by a daily workflow and, eventually, by
          // the static site. Nothing about reading it moves a number.
          'Cache-Control': 'public, max-age=60',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response('not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
