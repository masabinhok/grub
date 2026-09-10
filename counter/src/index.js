import { renderBadge } from './badge.js';

export { ViewCounter } from './counter.js';

/**
 * A profile view counter that is honest about what it counts.
 *
 * GitHub exposes no profile-page analytics — not in the UI, not in the API. The
 * traffic API covers repositories only. So this measures exactly one event: a
 * fetch of /streak.svg by GitHub's camo image proxy, which happens when somebody
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
 * The streak card, as rendered by the daily workflow and committed to assets/.
 *
 * The Worker proxies it rather than drawing it: the art, the palette and the
 * mood machinery all live in scripts/generators/streak.js, and a second copy in
 * here would drift the first time somebody edited one of them. So there is one
 * renderer, and this is a turnstile in front of it.
 *
 * Why the streak card and not one that shows the count: the count is recorded,
 * not displayed. Any card that is on the profile anyway works as the turnstile —
 * every render of the README fetches it once — so the counter rides on one that
 * was going to be there regardless. The number lives in /stats.json and
 * views.json, and nowhere on the page.
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
    // GitHub being down must not take the image down with it — the caller falls
    // back to a blank card of the same size.
    return null;
  }
}

/**
 * What /streak.svg serves when the real card cannot be fetched: nothing, at the
 * card's size. Not the badge — the count is recorded, never displayed, and an
 * outage is no reason to start putting it on the profile. Empty rather than a
 * broken-image icon, and if raw.githubusercontent is down this badly then every
 * other card on the page is missing too, so a gap is what fits in.
 */
const BLANK_CARD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 180" width="420" height="180"/>\n';

/**
 * Whether `given` is the owner's key. Constant-time, so response timing cannot
 * be used to guess it a character at a time. Both sides are hashed first
 * because timingSafeEqual needs equal lengths, and comparing lengths directly
 * would leak the one thing it is meant to hide.
 */
async function isOwnerKey(given, expected) {
  if (!given || !expected) return false;
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const stub = env.VIEWS.get(env.VIEWS.idFromName(COUNTER_NAME));

    // Both image routes count into the same total, because both mean the same
    // thing: somebody's browser rendered the profile README. Only one of them is
    // ever embedded at a time, so there is nothing to double-count.
    //
    //   /streak.svg  the real card, and what PROFILE-README.md points at
    //   /badge.svg   a small self-contained alternative that draws the count
    if (url.pathname === '/streak.svg' || url.pathname === '/badge.svg') {
      const ua = request.headers.get('user-agent') || '';
      // HEAD is excluded deliberately. Camo issues one on its own account when
      // it is sizing or revalidating an image, and no human is looking at
      // anything when it does.
      const counted = request.method === 'GET' && CAMO.test(ua);

      // Both branches touch the DO: the rejected tally is the evidence for the
      // counted one. The image is served either way — an uncounted request is
      // still somebody looking at an image, and breaking it to make a point
      // about accuracy would just show a broken image on the profile.
      const stats = counted ? await stub.record() : await stub.reject();

      // Counting first, art second: whether the card renders has no bearing on
      // whether the view happened.
      const body = url.pathname === '/streak.svg'
        ? (await fetchCard(env)) || BLANK_CARD
        : renderBadge(stats.total, counted);

      return new Response(body, {
        status: 200,
        headers: badgeHeaders(),
      });
    }

    // "That was me." Sent by counter/self-view.user.js from the owner's browser
    // when the counted image finishes loading on a page they are looking at. The
    // Worker cannot tell the owner apart on its own — camo strips the cookie,
    // the referrer, the browser and the IP before anything reaches us — so the
    // owner's browser has to say so.
    //
    // Off unless SELF_KEY is set (`npx wrangler secret put SELF_KEY`). A leaked
    // key can only take views away, one per request, never add them.
    if (url.pathname === '/self') {
      if (!env.SELF_KEY) return new Response('not found\n', { status: 404 });
      if (request.method !== 'POST') return new Response('POST only\n', { status: 405 });
      if (!(await isOwnerKey(request.headers.get('x-self-key'), env.SELF_KEY))) {
        return new Response('forbidden\n', { status: 403 });
      }
      const result = await stub.claimSelf();
      return new Response(JSON.stringify({ claimed: result.claimed, self: result.self }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
