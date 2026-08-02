/* GRUB adoption page.
 *
 * Renders live cards with window.GRUB — the generators bundled straight out of
 * scripts/ by scripts/build_site.js. Nothing here reimplements a card, so the
 * preview cannot drift from what the Action actually commits.
 *
 * No build step, no framework, no dependencies. Same rules as the rest of it.
 */
'use strict';

(function () {
  var $ = function (id) { return document.getElementById(id); };
  var cfg = GRUB.config.loadConfig();          // no fs in a browser -> DEFAULTS
  var PALETTES = GRUB.palette.resolvePalettes(cfg);
  var NOW = new Date();

  // ------------------------------------------------------------------ data

  // What we show before anyone types a username. Invented, and labelled as
  // invented in the UI — a demo full of zeroes looks broken, and a demo full of
  // made-up traction is worse than looking broken.
  var SAMPLE = {
    name: 'Ada Lovelace', login: 'octocat', company: 'Analytical Engines',
    location: 'London', followers: 842, publicRepos: 12, stars: 3100,
    languages: [['Rust', 9], ['C', 4], ['Python', 3]],
  };

  // The contribution calendar needs an authenticated GraphQL call, and this page
  // deliberately has no token. So the streak card is always illustrative — said
  // plainly under the preview rather than quietly passed off as real.
  var SAMPLE_STREAK = {
    current: 7, longest: 31, activeDays: 210, totalContributions: 1400,
    spark: [1, 3, 0, 2, 5, 1, 0, 4, 2, 6, 1, 0, 3, 2],
  };

  var state = {
    day: 0,
    profile: SAMPLE,
    real: false,
    layout: 'full',
  };

  // ---------------------------------------------------------------- layouts

  // Rows of [component, width]. Two entries in a row sit side by side, which is
  // exactly how the markdown pairs them.
  var LAYOUTS = {
    full: {
      label: 'Full page',
      blurb: 'Everything. Eleven cards, the whole drain.',
      rows: [
        [['banner', 840]], [['divider', 840]], [['pet', 540]], [['divider', 840]],
        [['streak', 420], ['star', 420]], [['eye', 420], ['languages', 420]],
        [['stats', 420], ['inventory', 420]], [['divider', 840]], [['marquee', 840]],
      ],
    },
    compact: {
      label: 'Compact',
      blurb: 'The creature and four numbers. Fits above the fold.',
      rows: [[['banner', 840]], [['pet', 540]], [['streak', 420], ['languages', 420]]],
    },
    pet: {
      label: 'Pet only',
      blurb: 'Just the creature. Drops into an existing README.',
      rows: [[['pet', 540]]],
    },
    stats: {
      label: 'Stats heavy',
      blurb: 'No creature on show — but it still themes everything.',
      rows: [
        [['banner', 840]], [['streak', 420], ['star', 420]],
        [['stats', 420], ['languages', 420]], [['eye', 420], ['inventory', 420]],
        [['marquee', 840]],
      ],
    },
  };

  // ------------------------------------------------------------- rendering

  function moodFor(days) { return GRUB.mood.moodForDays(days); }

  /** The same shape update_pet.js hands the generators. */
  function build(days) {
    var mood = moodFor(days);
    var dead = mood === 'deceased';
    var petState = {
      mood: mood,
      hunger: GRUB.mood.hungerForDays(days),
      alive: !dead,
      diedOn: dead ? iso(NOW, -(days - 5)) : null,
      resurrections: 0,
      pets: 0,
      feeders: [],
    };
    var snacks = GRUB.snacks.resolveSnacks(cfg);
    var ctx = {
      days: days,
      line: GRUB.copy.pickLine(mood, petState, NOW, GRUB.copy.linesFor(cfg)),
      revived: false,
      streak: SAMPLE_STREAK,
      profile: state.profile,
      watchers: { lurkers: 0, fed: 0, views: 0, since: null },
      fed: false,
      feeder: null,
      snack: snacks[0],
      now: NOW,
      cfg: overlaidConfig(),
      palettes: PALETTES,
    };
    return { state: petState, ctx: ctx };
  }

  function iso(d, offsetDays) {
    var t = new Date(d.getTime() + (offsetDays || 0) * 86400000);
    return t.toISOString().slice(0, 10);
  }

  /** The config as the form currently describes it — drives name and inventory. */
  function overlaidConfig() {
    var petName = ($('pet').value || 'GRUB').trim();
    var items = ($('stack').value || '').split(',').map(function (s) { return s.trim(); })
      .filter(Boolean);
    var labels = ['Primary', 'Database', 'Language', 'Runtime', 'Editor'];
    var slots = (items.length ? items : ['Your framework', 'Your database', 'Your language'])
      .map(function (item, i) { return { slot: labels[i] || 'Slot ' + (i + 1), item: item }; });
    slots.push({ slot: 'Companion', item: petName });
    return GRUB.config.merge(cfg, {
      petName: petName,
      timezone: ($('tz').value || 'Asia/Kathmandu').trim(),
      inventory: { slots: slots },
    });
  }

  function card(name, width, built) {
    var svg = GRUB.components[name](built.state, built.ctx);
    // The generators emit a fixed width; the page needs them fluid.
    return svg.replace(/^<svg /, '<svg style="max-width:' + width + 'px;width:100%;height:auto" ');
  }

  /** Push the mood's palette into the page so the chrome starves too. */
  function theme(mood) {
    var p = PALETTES[mood];
    var r = document.documentElement.style;
    r.setProperty('--accent', p.accent);
    r.setProperty('--ink', p.ink);
    r.setProperty('--dim', p.dim);
    r.setProperty('--panel', p.bg1);
    r.setProperty('--panel2', p.bg2);
    r.setProperty('--warn', p.m || p.accent);
    r.setProperty('--gold', p.t || p.accent);
    // A touch below the card's own ground, so cards read as sitting on the page.
    r.setProperty('--page', GRUB.palette.desaturate(p.bg1, 0.55));
  }

  function renderHero() {
    var built = build(state.day);
    $('hero-card').innerHTML = card('pet', 540, built);
    $('scrub-mood').textContent = built.state.mood;
    theme(built.state.mood);

    var ticks = $('ticks');
    ticks.innerHTML = '';
    for (var d = 0; d <= 6; d++) {
      var s = document.createElement('span');
      s.textContent = d === 6 ? '6+' : d;
      if (d === state.day) s.setAttribute('data-on', '');
      ticks.appendChild(s);
    }
  }

  function renderCanvas() {
    var built = build(state.day);
    var rows = LAYOUTS[state.layout].rows;
    var html = rows.map(function (row) {
      var cards = row.map(function (c) { return card(c[0], c[1], built); }).join('');
      return row.length > 1 ? '<div class="pair">' + cards + '</div>' : cards;
    }).join('');
    $('canvas').innerHTML = html;

    // Be specific about which numbers are yours. Contribution history needs an
    // authenticated GraphQL call and this page deliberately holds no token, so
    // the streak card *and* the contributions figure on the stats card are both
    // invented. Saying "the streak card" alone would be a quiet lie.
    $('streak-note').textContent = state.real
      ? 'Repos, stars, followers and languages are yours, read from the public API just now. '
        + 'The streak card and the contributions figure are sample numbers — contribution '
        + 'history needs an authenticated request and this page holds no token. Both become '
        + 'real the first time the Action runs in your repo.'
      : 'Sample profile. Enter your username to see your own numbers.';
  }

  function renderMarkdown() {
    var user = username();
    var repo = ($('repo').value || 'grub').trim();
    if (!user) { $('markdown').textContent = 'Enter your username above.'; return; }

    var base = 'https://raw.githubusercontent.com/' + user + '/' + repo + '/main/assets/';
    var alt = {
      banner: 'Profile banner', pet: 'GRUB, the tamagotchi of shame', streak: 'Commit streak',
      star: 'Stars earned', eye: 'Lurkers versus people who fed him', stats: 'Profile statistics',
      languages: 'Most used languages', inventory: 'Equipped skills', marquee: 'Status ticker',
      divider: '', cta: 'Adopt your own GRUB',
    };
    var out = LAYOUTS[state.layout].rows.map(function (row) {
      var imgs = row.map(function (c) {
        return '  <img src="' + base + c[0] + '.svg" width="' + c[1] + '" alt="' + alt[c[0]] + '">';
      }).join('\n');
      // The pet links back to the repo so people can find out what they're looking at.
      if (row.length === 1 && row[0][0] === 'pet') {
        return '<p align="center">\n  <a href="https://github.com/' + user + '/' + repo + '">\n  '
          + imgs.trim() + '\n  </a>\n</p>';
      }
      return '<p align="center">\n' + imgs + '\n</p>';
    }).join('\n\n');

    $('markdown').textContent =
      '<!-- Generated by the GRUB adoption page. Cards regenerate daily from\n'
      + '     https://github.com/' + user + '/' + repo + ' -->\n\n' + out + '\n';
  }

  function renderLinks() {
    var user = username();
    var repo = ($('repo').value || 'grub').trim();
    var q = encodeURIComponent;

    set('s1', 'https://github.com/masabinhok/grub/generate'
      + (user ? '?owner=' + q(user) + '&name=' + q(repo) + '&visibility=public'
              : '?name=' + q(repo) + '&visibility=public'));
    if (user) {
      set('s2', 'https://github.com/' + user + '/' + repo + '/settings/actions');
      set('s3', 'https://github.com/' + user + '/' + repo + '/actions/workflows/adopt.yml');
      set('s4', 'https://github.com/' + user + '/' + repo + '/actions/workflows/pet.yml');
      set('s5', 'https://github.com/new?name=' + q(user)
        + '&description=' + q('My profile README. The creature is fed by ' + repo + '.'));
    } else {
      ['s2', 's3', 's4'].forEach(function (id) { set(id, 'https://github.com/masabinhok/grub/blob/main/docs/setup.md'); });
      set('s5', 'https://github.com/new');
    }

    $('v-pet').textContent = ($('pet').value || 'GRUB').trim();
    $('v-tz').textContent = ($('tz').value || 'Asia/Kathmandu').trim();
    $('v-stack').textContent = ($('stack').value || '').trim() || 'leave blank';
  }

  function set(id, href) { $(id).href = href; }
  function username() { return ($('user').value || '').trim().replace(/^@/, ''); }

  function renderAll() { renderHero(); renderCanvas(); renderMarkdown(); renderLinks(); }

  // -------------------------------------------------------------- the API

  var LOGIN_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;

  function loadProfile() {
    var user = username();
    var note = $('load-note');
    note.className = 'note';

    if (!user) { note.textContent = 'Type a username first.'; return; }
    if (!LOGIN_RE.test(user)) {
      note.className = 'note bad';
      note.textContent = '"' + user + '" is not a GitHub username.';
      return;
    }

    note.textContent = 'Reading ' + user + '…';
    var api = 'https://api.github.com/users/' + encodeURIComponent(user);

    Promise.all([
      fetch(api).then(check),
      fetch(api + '/repos?per_page=100&sort=pushed').then(check),
    ]).then(function (res) {
      var u = res[0], repos = res[1];
      var stars = 0, byLang = {};
      repos.forEach(function (r) {
        if (r.fork) return;
        stars += r.stargazers_count || 0;
        if (r.language) byLang[r.language] = (byLang[r.language] || 0) + 1;
      });
      state.profile = {
        name: u.name || u.login, login: u.login, bio: u.bio, company: u.company,
        location: u.location, blog: u.blog, followers: u.followers,
        publicRepos: u.public_repos, stars: stars,
        languages: Object.keys(byLang).map(function (k) { return [k, byLang[k]]; })
          .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8),
      };
      state.real = true;
      note.textContent = 'Showing ' + (u.name || u.login) + '. ' + u.public_repos
        + ' public repos, ' + stars + ' stars, ' + u.followers + ' followers.';
      renderAll();
    }).catch(function (err) {
      note.className = 'note bad';
      // The unauthenticated API allows 60 requests an hour per IP, and a busy
      // day on this page will hit that. Say which failure it is.
      note.textContent = err.status === 404
        ? 'No GitHub user called "' + user + '".'
        : err.status === 403
          ? 'GitHub is rate-limiting this browser (60 requests an hour, unauthenticated). '
            + 'Try again shortly — the setup steps below work regardless.'
          : 'Could not reach the GitHub API: ' + err.message;
    });
  }

  function check(r) {
    if (r.ok) return r.json();
    var e = new Error('HTTP ' + r.status);
    e.status = r.status;
    throw e;
  }

  // ------------------------------------------------------------ star count

  // Every visitor spending a request on the same public number is how a page
  // burns the 60-per-hour unauthenticated budget that the preview above actually
  // needs. Cache it for an hour and paint the cached figure immediately, so a
  // rate-limited visitor still sees a count rather than a bare button.
  var STAR_KEY = 'grub:stars';
  var STAR_TTL = 3600000;

  function showStars(n) {
    $('star-count').textContent = n >= 10000 ? Math.round(n / 1000) + 'k'
      : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
        : String(n);
    $('star-count').parentNode.setAttribute(
      'aria-label', 'Star masabinhok/grub on GitHub — ' + n + (n === 1 ? ' star' : ' stars'));
  }

  function loadStars() {
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(STAR_KEY)); } catch (e) { /* private mode */ }
    if (cached && typeof cached.n === 'number') {
      showStars(cached.n);
      if (Date.now() - cached.at < STAR_TTL) return;
    }
    fetch('https://api.github.com/repos/masabinhok/grub').then(check).then(function (r) {
      showStars(r.stargazers_count);
      try {
        localStorage.setItem(STAR_KEY, JSON.stringify({ n: r.stargazers_count, at: Date.now() }));
      } catch (e) { /* quota or private mode — the count still shows this visit */ }
    }).catch(function () {
      // Offline, rate-limited or blocked. The button is still a link to the repo,
      // which is the part that matters; a broken number would be worse than none.
    });
  }

  // ---------------------------------------------------------------- wiring

  LAYOUTS_INIT: {
    var tabs = $('tabs');
    Object.keys(LAYOUTS).forEach(function (key) {
      var b = document.createElement('button');
      b.textContent = LAYOUTS[key].label;
      b.title = LAYOUTS[key].blurb;
      b.setAttribute('aria-pressed', String(key === state.layout));
      b.onclick = function () {
        state.layout = key;
        Array.prototype.forEach.call(tabs.children, function (c) {
          c.setAttribute('aria-pressed', String(c === b));
        });
        renderCanvas(); renderMarkdown();
      };
      tabs.appendChild(b);
    });
  }

  $('scrub').addEventListener('input', function (e) {
    state.day = parseInt(e.target.value, 10);
    renderHero();
    renderCanvas();
  });

  // #day=6 opens straight into the tombstone. Read on load only — writing it
  // back on every drag would bury the user's history under seven entries.
  var deep = /(?:^|[#&])day=(\d)/.exec(location.hash);
  if (deep) {
    state.day = Math.max(0, Math.min(6, parseInt(deep[1], 10)));
    $('scrub').value = String(state.day);
  }

  // ?user=login preloads someone's cards, so a link to this page can show the
  // person opening it what theirs would look like without them typing anything.
  var who = /[?&]user=([^&]+)/.exec(location.search);
  if (who) {
    $('user').value = decodeURIComponent(who[1]);
    loadProfile();
  }

  $('load').addEventListener('click', loadProfile);
  $('user').addEventListener('keydown', function (e) { if (e.key === 'Enter') loadProfile(); });
  ['user', 'repo'].forEach(function (id) {
    $(id).addEventListener('input', function () { renderMarkdown(); renderLinks(); });
  });
  ['pet', 'tz', 'stack'].forEach(function (id) {
    $(id).addEventListener('input', function () { renderCanvas(); renderHero(); renderLinks(); });
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var text = $(btn.getAttribute('data-copy')).textContent;
    navigator.clipboard.writeText(text).then(function () {
      var was = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(function () { btn.textContent = was; }, 1400);
    });
  });

  renderAll();
  loadStars();
}());
