// ==UserScript==
// @name         GRUB views: not me
// @namespace    https://github.com/masabinhok/grub
// @version      1.0.0
// @description  Tells the grub-views counter when a profile README render was you, so it is not counted.
// @match        https://github.com/*
// @grant        GM_xmlhttpRequest
// @connect      grub-views.sifarish-less.workers.dev
// @run-at       document-start
// ==/UserScript==

/*
 * The counter in counter/ cannot tell who is looking: GitHub's camo proxy fetches
 * the image from its own servers and strips the cookie, the referrer, the browser
 * and the IP on the way. So your own browser has to say "that was me".
 *
 * It says so once per real network fetch of the counted card, on any GitHub page
 * — your profile, the profile repo, PROFILE-README.md — and never otherwise. The
 * trigger is the browser's Resource Timing feed, not the image's load event,
 * because the two disagree in exactly the case that matters: when GitHub swaps a
 * page in place, the browser can reuse the image from memory and fire `load`
 * without anything reaching the Worker. A ping then would cancel a view that
 * never happened — which, in practice, means a stranger's. A resource timing
 * entry only exists for a fetch that went over the network, and every such fetch
 * through camo is one the Worker counted.
 *
 * Order is guaranteed: the Worker records the view before it sends the image, so
 * by the time the fetch finishes and this fires, the view is there to take back.
 * The Worker takes back exactly one per ping. See claimSelf() in src/counter.js.
 *
 * GM_xmlhttpRequest rather than fetch: GitHub's Content-Security-Policy blocks
 * page scripts from talking to any other host, and the extension's request is
 * not subject to it. @connect is what allows it, and it allows only the Worker.
 *
 * Adopting this? Change WORKER and the @connect line to your own Worker, and KEY
 * to the SELF_KEY you set on it. Do not commit the file with your key in it.
 */

(function () {
  'use strict';

  const WORKER = 'https://grub-views.sifarish-less.workers.dev';
  const KEY = 'PASTE-YOUR-SELF_KEY-HERE';

  /**
   * Whether a fetched URL is the counted card. GitHub serves README images via
   * camo.githubusercontent.com/<signature>/<hex of the original URL>, so the
   * original can be read straight back out of the address without the DOM.
   */
  function isCountedCard(url) {
    if (url.startsWith(`${WORKER}/`)) return true;
    const m = /^https:\/\/camo\.githubusercontent\.com\/[0-9a-f]+\/([0-9a-f]+)/.exec(url);
    if (!m) return false;
    let target = '';
    for (let i = 0; i < m[1].length; i += 2) target += String.fromCharCode(parseInt(m[1].slice(i, i + 2), 16));
    return target.startsWith(`${WORKER}/`);
  }

  function notMe() {
    GM_xmlhttpRequest({
      method: 'POST',
      url: `${WORKER}/self`,
      headers: { 'X-Self-Key': KEY },
      onload: (res) => console.debug('[grub-views] not me:', res.status, res.responseText),
    });
  }

  // document-start, so this is listening before the page's images are requested.
  // It survives GitHub's in-place page swaps (Turbo): same document, same feed.
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.initiatorType === 'img' && isCountedCard(entry.name)) notMe();
    }
  }).observe({ type: 'resource', buffered: true });
})();
