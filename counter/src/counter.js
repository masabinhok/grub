import { DurableObject } from 'cloudflare:workers';

/**
 * The counter itself: one Durable Object, one SQLite database, one named
 * instance (`idFromName('profile-views')` in src/index.js).
 *
 * Why a Durable Object and not Workers KV: KV is eventually consistent and rate
 * limits to roughly one write per second per key, on top of a small daily free
 * write allowance. A badge that is hit in bursts — one GitHub profile load can
 * fan out to several camo fetches — would silently drop increments and burn the
 * quota doing it. A DO is single-threaded and strongly consistent: every request
 * for this name lands on the same object, in order, and an increment is a real
 * read-modify-write that cannot be lost.
 *
 * Everything here is synchronous. `ctx.storage.sql.exec` on a SQLite-backed DO
 * runs against local disk with no await, so a whole increment completes inside
 * one turn of the event loop and no other request can interleave with it.
 */

/** UTC day bucket. The badge is fetched from everywhere; UTC is the only clock
 *  that does not need a timezone argument to be reproducible. */
const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);

/**
 * How far back a "that was me" ping reaches for the view it cancels. The ping is
 * sent from the owner's browser when the image finishes loading, and the count
 * is recorded before the Worker even starts sending that image, so the view is
 * always already here by the time the ping lands — normally a second or two
 * earlier. Twenty seconds is slack for a slow camo, not a guess at the order.
 */
const SELF_WINDOW_MS = 20_000;

/** How long counted views are remembered for, so a ping has something to claim. */
const RECENT_KEEP_MS = 5 * 60_000;

export class ViewCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;

    // Synchronous, so the schema exists before any handler can run. No
    // blockConcurrencyWhile needed — there is nothing to await.
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS days (
        date  TEXT PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS recent (
        ts    INTEGER NOT NULL,
        date  TEXT    NOT NULL
      );
      CREATE INDEX IF NOT EXISTS recent_ts ON recent (ts);
    `);
  }

  /** First-ever request wins; every later call is a no-op. */
  #seed(now) {
    this.sql.exec(
      "INSERT INTO meta (key, value) VALUES ('since', ?) ON CONFLICT(key) DO NOTHING",
      now,
    );
  }

  #bump(key, by = 1) {
    this.sql.exec(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = CAST(meta.value AS INTEGER) + ?`,
      key, String(by), by,
    );
  }

  #num(key) {
    const row = this.sql.exec('SELECT value FROM meta WHERE key = ?', key).toArray()[0];
    return row ? Number(row.value) || 0 : 0;
  }

  /**
   * A real, counted view. Returns the fresh stats so the badge can be drawn from
   * the same round trip that recorded it — the number on the image always
   * includes the request that fetched it.
   */
  record() {
    const now = new Date();
    const day = utcDay(now);
    // transactionSync so a throw mid-way cannot leave `days` and `total`
    // disagreeing. Sum-of-days === total is a documented invariant of /stats.json.
    this.ctx.storage.transactionSync(() => {
      this.#seed(now.toISOString());
      this.sql.exec(
        `INSERT INTO days (date, count) VALUES (?, 1)
         ON CONFLICT(date) DO UPDATE SET count = days.count + 1`,
        day,
      );
      this.#bump('total');
      // Remembered briefly so the owner's "that was me" ping can take it back.
      this.sql.exec('INSERT INTO recent (ts, date) VALUES (?, ?)', now.getTime(), day);
      this.sql.exec('DELETE FROM recent WHERE ts < ?', now.getTime() - RECENT_KEEP_MS);
    });
    return this.stats(day);
  }

  /**
   * The owner looked at their own profile. Takes back the most recent counted
   * view from the last SELF_WINDOW_MS and files it under `self` instead.
   *
   * Exactly one per ping: one page render is one image load is one camo fetch,
   * so claiming a single view is precise, and it keeps a stranger who happened
   * to look in the same few seconds from being swept up with it. A ping with
   * nothing recent to claim changes nothing — reloading from the browser's own
   * cache fires the same load event without ever reaching the Worker.
   *
   * The day bucket and `total` are decremented together, so sum-of-days ===
   * total still holds.
   */
  claimSelf() {
    const now = Date.now();
    let claimed = false;
    this.ctx.storage.transactionSync(() => {
      const row = this.sql.exec(
        'SELECT rowid, date FROM recent WHERE ts >= ? ORDER BY ts DESC LIMIT 1',
        now - SELF_WINDOW_MS,
      ).toArray()[0];
      if (!row) return;
      this.sql.exec('DELETE FROM recent WHERE rowid = ?', row.rowid);
      this.sql.exec('UPDATE days SET count = count - 1 WHERE date = ? AND count > 0', row.date);
      this.#bump('total', -1);
      this.#bump('self');
      claimed = true;
    });
    return { claimed, ...this.stats() };
  }

  /**
   * A badge request that was served but deliberately not counted — see the camo
   * gate in src/index.js. Tracked because the size of this number is the whole
   * argument that the counted number means something.
   */
  reject() {
    const now = new Date();
    this.ctx.storage.transactionSync(() => {
      this.#seed(now.toISOString());
      this.#bump('rejected');
    });
    return this.stats(utcDay(now));
  }

  stats(today = utcDay()) {
    const days = {};
    for (const row of this.sql.exec('SELECT date, count FROM days ORDER BY date').toArray()) {
      days[row.date] = Number(row.count);
    }
    const sinceRow = this.sql.exec("SELECT value FROM meta WHERE key = 'since'").toArray()[0];
    return {
      total: this.#num('total'),
      today: days[today] || 0,
      days,
      since: sinceRow ? sinceRow.value : null,
      rejected: this.#num('rejected'),
      // Views the owner took back with a "that was me" ping. Not in `total`.
      self: this.#num('self'),
    };
  }
}
