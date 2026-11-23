/**
 * Cache lesson simulation: the cache-aside pattern on one application server. The server checks the
 * cache, reads the database on a miss, stores a copy, and answers. Seat reservations never trust the
 * cache: they run as one transaction in the database. Pure and deterministic; no real Redis.
 */

export type Lane = "c-s" | "s-c" | "s-k" | "k-s" | "s-d" | "d-s" | "a-s" | "s-a";
export type ReqKind = "info" | "seatmap" | "book" | "update";
/** What a trip to the cache is for. */
export type CacheOp = "check" | "store" | "delete";
export type Source = "cache" | "database";
export type Key = "info" | "seatmap";

export const KEYS: Record<Key, string> = { info: "event:konser-01:info", seatmap: "event:konser-01:denah" };

export interface Entry {
  value: string;
  /** Version of the official data this copy was made from. */
  version: number;
  storedAt: number;
  expiresAt: number;
}

export interface Req {
  id: string;
  kind: ReqKind;
  /** What the visitor asked for, shown on the token. */
  ask: string;
  lane: Lane;
  sentAt: number;
  arriveAt: number;
  /** Purpose of the current or last trip to the cache. */
  op: CacheOp | null;
  /** Text shown on the token for the current hop. */
  note: string;
  /** Value carried back (answer, copy to store). */
  value: string | null;
  version: number;
  source: Source | null;
  hit: boolean | null;
  failed: boolean;
  /** Booking result. */
  booked: "reserved" | "taken" | null;
  newTime?: string;
  invalidate?: boolean;
  seat?: string;
  doneAt: number | null;
}

export type CacheAction =
  | { at: number; kind: "ask"; id: string; what: "info" | "seatmap"; ask: string }
  | { at: number; kind: "book"; id: string; seat: string }
  | { at: number; kind: "update"; time: string; invalidate: boolean }
  | { at: number; kind: "clear"; key: Key }
  | { at: number; kind: "db-down"; down: boolean };

export type CacheLog =
  | { at: number; kind: "hit"; id: string; key: Key; stale: boolean }
  | { at: number; kind: "miss"; id: string; key: Key }
  | { at: number; kind: "db-read"; id: string }
  | { at: number; kind: "stored"; key: Key; value: string }
  | { at: number; kind: "deleted"; key: Key }
  | { at: number; kind: "updated"; time: string; version: number }
  | { at: number; kind: "reserved"; id: string; seat: string }
  | { at: number; kind: "taken"; id: string; seat: string }
  | { at: number; kind: "answer"; id: string; text: string; source: Source | null; stale: boolean; ok: boolean };

export interface Answer {
  id: string;
  text: string;
  source: Source | null;
  stale: boolean;
  ok: boolean;
  at: number;
}

export interface CacheSim {
  t: number;
  /** false in the first scenes: the server always asks the database. */
  cacheOn: boolean;
  ttl: number;
  db: { time: string; version: number; seats: Record<string, string | null>; seatVersion: number; down: boolean };
  cache: Partial<Record<Key, Entry>>;
  reqs: Req[];
  script: CacheAction[];
  log: CacheLog[];
  hits: number;
  misses: number;
  dbReads: number;
  answers: Answer[];
  /** Seconds per hop, slowed down so every move can be followed. */
  hop: { client: number; cache: number; db: number };
}

const EPS = 1e-9;
const KEEP = 2.2;
export const SEAT = "A12";

export interface CacheSeed {
  cacheOn?: boolean;
  time?: string;
  version?: number;
  cached?: Partial<Record<Key, { value?: string; version?: number }>>;
  seats?: Record<string, string | null>;
  hits?: number;
  misses?: number;
  dbReads?: number;
  ttl?: number;
  script?: CacheAction[];
}

export function createCacheSim(seed: CacheSeed = {}): CacheSim {
  const sim: CacheSim = {
    t: 0,
    cacheOn: seed.cacheOn ?? true,
    ttl: seed.ttl ?? 60,
    db: { time: seed.time ?? "19.00", version: seed.version ?? 1, seats: { [SEAT]: null, ...(seed.seats ?? {}) }, seatVersion: 1, down: false },
    cache: {},
    reqs: [],
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    hits: seed.hits ?? 0,
    misses: seed.misses ?? 0,
    dbReads: seed.dbReads ?? 0,
    answers: [],
    hop: { client: 1.2, cache: 0.8, db: 1.2 },
  };
  for (const key of Object.keys(seed.cached ?? {}) as Key[]) {
    const c = seed.cached![key]!;
    sim.cache[key] = { value: c.value ?? officialValue(sim, key), version: c.version ?? currentVersion(sim, key), storedAt: 0, expiresAt: sim.ttl };
  }
  return sim;
}

/** What the database holds for a key right now. */
export function officialValue(sim: CacheSim, key: Key) {
  if (key === "info") return sim.db.time;
  const holder = sim.db.seats[SEAT];
  return holder ? `${SEAT} terisi` : `${SEAT} tersedia`;
}
const currentVersion = (sim: CacheSim, key: Key) => (key === "info" ? sim.db.version : sim.db.seatVersion);

/** A cached copy is used only when it exists and has not expired. */
export function lookup(sim: CacheSim, key: Key): Entry | null {
  const entry = sim.cache[key];
  return entry && sim.t < entry.expiresAt - EPS ? entry : null;
}
export const isStale = (sim: CacheSim, key: Key) => {
  const entry = sim.cache[key];
  return Boolean(entry && entry.version < currentVersion(sim, key));
};

const keyOf = (r: Req): Key => (r.kind === "seatmap" || r.kind === "book" ? "seatmap" : "info");
const durationOf = (sim: CacheSim, lane: Lane) => (lane === "s-k" || lane === "k-s" ? sim.hop.cache : lane === "s-d" || lane === "d-s" ? sim.hop.db : sim.hop.client);

function go(sim: CacheSim, r: Req, lane: Lane, note: string) {
  r.lane = lane;
  r.note = note;
  r.sentAt = sim.t;
  r.arriveAt = sim.t + durationOf(sim, lane);
}

function make(sim: CacheSim, id: string, kind: ReqKind, ask: string, from: "c-s" | "a-s"): Req {
  const r: Req = { id, kind, ask, lane: from, sentAt: sim.t, arriveAt: sim.t, op: null, note: "", value: null, version: 0, source: null, hit: null, failed: false, booked: null, doneAt: null };
  go(sim, r, from, `${id} · Permintaan: ${ask}`);
  sim.reqs.push(r);
  return r;
}

/** A visitor asks for event information or the seat map. */
export const ask = (sim: CacheSim, id: string, what: "info" | "seatmap", text = what === "info" ? "Jadwal konser" : "Lihat denah") => make(sim, id, what, text, "c-s");
/** A visitor books a seat: always decided by the database. */
export function book(sim: CacheSim, id: string, seat = SEAT) {
  const r = make(sim, id, "book", `Pesan ${seat}`, "c-s");
  r.seat = seat;
  return r;
}
/** The organiser changes the official schedule through the server. */
export function update(sim: CacheSim, time: string, invalidate = true) {
  const r = make(sim, "Panitia", "update", `Ubah jadwal ${time}`, "a-s");
  r.newTime = time;
  r.invalidate = invalidate;
  return r;
}
/** Deletes a cached copy right away (invalidation). */
export function clear(sim: CacheSim, key: Key) {
  if (!sim.cache[key]) return false;
  delete sim.cache[key];
  sim.log.push({ at: sim.t, kind: "deleted", key });
  return true;
}

function finish(sim: CacheSim, r: Req, text: string, ok: boolean) {
  const stale = r.source === "cache" && r.version < currentVersion(sim, keyOf(r));
  sim.answers.push({ id: r.id, text, source: r.source, stale, ok, at: sim.t });
  sim.log.push({ at: sim.t, kind: "answer", id: r.id, text, source: r.source, stale, ok });
}

/** How a value is named for the question that was asked. */
const named = (r: Req) => (r.kind !== "info" ? r.value : r.ask === "Jadwal konser" ? `jadwal ${r.value}` : `info acara (${r.value})`);
function answerText(r: Req) {
  return r.kind === "info" ? named(r)! : `denah: ${r.value}`;
}

/** What happens when a token reaches the end of its lane. */
function arrive(sim: CacheSim, r: Req) {
  const key = keyOf(r);
  switch (r.lane) {
    case "c-s":
      if (r.kind === "book") return go(sim, r, "s-d", `${r.id} · Reservasi ${r.seat} (transaksi)`);
      if (sim.cacheOn) {
        r.op = "check";
        return go(sim, r, "s-k", `${r.id} · Cek cache`);
      }
      return go(sim, r, "s-d", `${r.id} · Baca database`);
    case "a-s":
      return go(sim, r, "s-d", `Ubah jadwal → ${r.newTime}`);
    case "s-k": {
      if (r.op === "check") {
        const entry = lookup(sim, key);
        if (entry) {
          sim.hits += 1;
          r.hit = true;
          r.value = entry.value;
          r.version = entry.version;
          r.source = "cache";
          const stale = entry.version < currentVersion(sim, key);
          sim.log.push({ at: sim.t, kind: "hit", id: r.id, key, stale });
          return go(sim, r, "k-s", `${r.id} · Cache hit: ${entry.value}`);
        }
        sim.misses += 1;
        r.hit = false;
        sim.log.push({ at: sim.t, kind: "miss", id: r.id, key });
        return go(sim, r, "k-s", `${r.id} · Cache miss: belum ada`);
      }
      if (r.op === "store" && r.value !== null) {
        sim.cache[key] = { value: r.value, version: r.version, storedAt: sim.t, expiresAt: sim.t + sim.ttl };
        sim.log.push({ at: sim.t, kind: "stored", key, value: r.value });
        return go(sim, r, "k-s", `${r.id} · Salinan tersimpan`);
      }
      // delete
      const target: Key = r.kind === "book" ? "seatmap" : "info";
      clear(sim, target);
      return go(sim, r, "k-s", `${r.kind === "update" ? "Panitia" : r.id} · Salinan dihapus`);
    }
    case "k-s":
      if (r.op === "check" && r.hit === false) return go(sim, r, "s-d", `${r.id} · Baca database`);
      if (r.kind === "update") return go(sim, r, "s-a", "Selesai: jadwal diubah");
      if (r.kind === "book") return go(sim, r, "s-c", `${r.id} · Jawaban: ${r.seat} berhasil dipesan`);
      return go(sim, r, "s-c", `${r.id} · Jawaban: ${named(r)}`);
    case "s-d":
      if (sim.db.down) {
        r.failed = true;
        return go(sim, r, "d-s", `${r.id} · Gagal membaca database`);
      }
      if (r.kind === "update") {
        sim.db.time = r.newTime!;
        sim.db.version += 1;
        sim.log.push({ at: sim.t, kind: "updated", time: sim.db.time, version: sim.db.version });
        return go(sim, r, "d-s", `Tersimpan: jadwal ${sim.db.time}`);
      }
      if (r.kind === "book") {
        // one transaction: check and reserve together, so a seat can never be sold twice
        if (sim.db.seats[r.seat!] === null || sim.db.seats[r.seat!] === undefined) {
          sim.db.seats[r.seat!] = r.id;
          sim.db.seatVersion += 1;
          r.booked = "reserved";
          sim.log.push({ at: sim.t, kind: "reserved", id: r.id, seat: r.seat! });
          return go(sim, r, "d-s", `${r.id} · ${r.seat} dicatat untuk ${r.id}`);
        }
        r.booked = "taken";
        sim.log.push({ at: sim.t, kind: "taken", id: r.id, seat: r.seat! });
        return go(sim, r, "d-s", `${r.id} · ${r.seat} sudah dipesan`);
      }
      sim.dbReads += 1;
      r.value = officialValue(sim, key);
      r.version = currentVersion(sim, key);
      r.source = "database";
      sim.log.push({ at: sim.t, kind: "db-read", id: r.id });
      return go(sim, r, "d-s", `${r.id} · Data: ${named(r)}`);
    case "d-s":
      if (r.failed) return go(sim, r, "s-c", `${r.id} · Gagal, coba lagi`);
      if (r.kind === "update") {
        if (r.invalidate && sim.cacheOn) {
          r.op = "delete";
          return go(sim, r, "s-k", "Hapus salinan jadwal");
        }
        return go(sim, r, "s-a", "Selesai: jadwal diubah");
      }
      if (r.kind === "book") {
        if (r.booked === "reserved" && sim.cacheOn && sim.cache.seatmap) {
          r.op = "delete";
          return go(sim, r, "s-k", `${r.id} · Hapus salinan denah`);
        }
        return go(sim, r, "s-c", r.booked === "reserved" ? `${r.id} · Jawaban: ${r.seat} berhasil dipesan` : `${r.id} · Jawaban: ${r.seat} sudah dipesan`);
      }
      if (sim.cacheOn) {
        r.op = "store";
        return go(sim, r, "s-k", `${r.id} · Simpan salinan`);
      }
      return go(sim, r, "s-c", `${r.id} · Jawaban: ${named(r)}`);
    case "s-c":
    case "s-a":
      r.doneAt = sim.t;
      if (r.kind === "update") return;
      if (r.failed) return finish(sim, r, "Gagal, coba lagi", false);
      if (r.kind === "book") return finish(sim, r, r.booked === "reserved" ? `${r.seat} berhasil dipesan` : `${r.seat} sudah dipesan orang lain`, r.booked === "reserved");
      return finish(sim, r, answerText(r), true);
  }
}

function apply(sim: CacheSim, a: CacheAction) {
  if (a.kind === "ask") ask(sim, a.id, a.what, a.ask);
  else if (a.kind === "book") book(sim, a.id, a.seat);
  else if (a.kind === "update") update(sim, a.time, a.invalidate);
  else if (a.kind === "clear") clear(sim, a.key);
  else sim.db.down = a.down;
}

export function advance(sim: CacheSim, dt: number): CacheSim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 10000; guard++) {
    let next: { at: number; run: () => void } | null = null;
    const offer = (at: number, run: () => void) => {
      if (at <= until + EPS && (!next || at < next.at - EPS)) next = { at, run };
    };
    if (sim.script.length) {
      const action = sim.script[0];
      offer(action.at, () => (sim.script.shift(), apply(sim, action)));
    }
    for (const r of sim.reqs) if (r.doneAt === null) offer(r.arriveAt, () => arrive(sim, r));
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  sim.reqs = sim.reqs.filter((r) => r.doneAt === null || sim.t - r.doneAt < KEEP);
  return sim;
}

export const progressOf = (r: Req, t: number) => Math.max(0, Math.min(1, (t - r.sentAt) / Math.max(EPS, r.arriveAt - r.sentAt)));
