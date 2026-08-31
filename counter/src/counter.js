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
    `);
  }

  /** First-ever request wins; every later call is a no-op. */
  #seed(now) {
    this.sql.exec(
      "INSERT INTO meta (key, value) VALUES ('since', ?) ON CONFLICT(key) DO NOTHING",
      now,
    );
  }

  #bump(key) {
    this.sql.exec(
      `INSERT INTO meta (key, value) VALUES (?, '1')
       ON CONFLICT(key) DO UPDATE SET value = CAST(meta.value AS INTEGER) + 1`,
      key,
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
    });
    return this.stats(day);
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
    };
  }
}
