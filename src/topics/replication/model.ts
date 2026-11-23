/**
 * Database replication lesson model (concert tickets). Pure and deterministic; no real database.
 *
 * Rules the model enforces (and the tests check):
 *  - exactly one database accepts writes at a time ("writer"); a replica refuses writes until promoted;
 *  - reserving a ticket is one atomic step on the writer: check stock and decrement together;
 *  - stock never goes below zero, and an order id is reserved at most once (a retry is answered, not re-applied);
 *  - an order is "reserved" only after the writer commits it; without a commit the client sees "try again";
 *  - changes reach the replica asynchronously, after a lag, in commit order;
 *  - the failover manager isolates the old primary before promoting the replica and reopening writes.
 * Payment is not simulated: "reserved" means the ticket is held for this order, not paid.
 */

export type AppId = "A" | "B" | "C";
export const APPS: readonly AppId[] = ["A", "B", "C"];
export type DbId = "D1" | "D2";
export type Role = "absent" | "copying" | "replica" | "primary" | "down" | "isolated" | "syncing";

export interface Db {
  role: Role;
  stock: number;
  /** Number of the last transaction this database holds. */
  applied: number;
  /** 0…1 while making the first full copy or catching up. */
  progress: number;
}

export type OrderPhase = "to-lb" | "to-app" | "to-db" | "to-client" | "done";
export type OrderResult = "reserved" | "sold-out" | "retry" | "duplicate";

export interface Order {
  /** Order id the shop gives the buyer, e.g. P-101. A retry reuses it. */
  id: string;
  app: AppId;
  phase: OrderPhase;
  phaseAt: number;
  phaseEnd: number;
  /** Database it was sent to (or null when no writer was known). */
  db: DbId | null;
  result: OrderResult | null;
  /** Transaction number given by the writer on commit. */
  tx: number | null;
  doneAt: number | null;
}

export interface Read {
  id: number;
  app: AppId;
  db: DbId;
  sentAt: number;
  arriveAt: number;
  /** Stock the reader was shown, and whether it was behind the writer at that moment. */
  shown: number | null;
  stale: boolean;
  doneAt: number | null;
}

/** One committed change on its way to the replica. */
export interface Change {
  tx: number;
  orderId: string;
  stockAfter: number;
  from: DbId;
  to: DbId;
  sentAt: number;
  arriveAt: number;
}

export type FailoverPhase = "idle" | "detecting" | "isolating" | "checking" | "promoting" | "redirecting" | "done";

export type ReplAction =
  | { at: number; kind: "order"; id: string; app: AppId }
  | { at: number; kind: "read"; app: AppId }
  | { at: number; kind: "fail"; db: DbId }
  | { at: number; kind: "start-replica"; db: DbId }
  | { at: number; kind: "failover" }
  | { at: number; kind: "rejoin"; db: DbId };

export type ReplLog =
  | { at: number; kind: "commit"; id: string; tx: number; db: DbId; stock: number }
  | { at: number; kind: "answer"; id: string; result: OrderResult }
  | { at: number; kind: "applied"; tx: number; db: DbId }
  | { at: number; kind: "role"; db: DbId; role: Role }
  | { at: number; kind: "failover"; phase: FailoverPhase }
  | { at: number; kind: "read"; db: DbId; shown: number; stale: boolean };

export interface ReplSim {
  t: number;
  dbs: Record<DbId, Db>;
  /** Where the application sends writes; null while there is no confirmed writer. */
  writer: DbId | null;
  orders: Order[];
  reads: Read[];
  changes: Change[];
  failover: { phase: FailoverPhase; phaseAt: number; phaseEnd: number; old: DbId | null; candidate: DbId | null };
  /** Order ids already reserved, with their transaction number (for idempotent retries). */
  reservedIds: Record<string, number>;
  script: ReplAction[];
  log: ReplLog[];
  nextRead: number;
  reserved: number;
  soldOut: number;
  retries: number;
  duplicates: number;
  /** Seconds (slowed down to be watched). */
  hop: number;
  lag: number;
}

export const TOTAL_TICKETS = 12;
const EPS = 1e-9;
const KEEP = 2.6;
const FAILOVER_STEPS: { phase: FailoverPhase; seconds: number }[] = [
  { phase: "detecting", seconds: 1.0 },
  { phase: "isolating", seconds: 0.9 },
  { phase: "checking", seconds: 0.7 },
  { phase: "promoting", seconds: 0.8 },
  { phase: "redirecting", seconds: 0.8 },
];

export function createReplSim(options: { stock?: number; applied?: number; d1?: Role; d2?: Role; d2Stock?: number; d2Applied?: number; writer?: DbId | null; reservedIds?: Record<string, number>; script?: ReplAction[] } = {}): ReplSim {
  const stock = options.stock ?? TOTAL_TICKETS;
  const applied = options.applied ?? 0;
  const d2Role = options.d2 ?? "absent";
  return {
    t: 0,
    dbs: {
      D1: { role: options.d1 ?? "primary", stock, applied, progress: 1 },
      D2: { role: d2Role, stock: options.d2Stock ?? stock, applied: options.d2Applied ?? applied, progress: d2Role === "absent" ? 0 : 1 },
    },
    writer: options.writer === undefined ? "D1" : options.writer,
    orders: [],
    reads: [],
    changes: [],
    failover: { phase: "idle", phaseAt: 0, phaseEnd: Infinity, old: null, candidate: null },
    reservedIds: { ...(options.reservedIds ?? {}) },
    script: [...(options.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    nextRead: 1,
    reserved: 0,
    soldOut: 0,
    retries: 0,
    duplicates: 0,
    hop: 0.7,
    lag: 1.3,
  };
}

const other = (db: DbId): DbId => (db === "D1" ? "D2" : "D1");
const setRole = (sim: ReplSim, db: DbId, role: Role) => {
  if (sim.dbs[db].role === role) return;
  sim.dbs[db].role = role;
  sim.log.push({ at: sim.t, kind: "role", db, role });
};
export const replicaOf = (sim: ReplSim): DbId | null => (["D1", "D2"] as DbId[]).find((db) => sim.dbs[db].role === "replica") ?? null;
export const writerDb = (sim: ReplSim): DbId | null => (sim.writer && sim.dbs[sim.writer].role === "primary" ? sim.writer : null);
/** Transactions the replica is behind the writer (replication lag in transactions). */
export function lagTx(sim: ReplSim) {
  const w = writerDb(sim) ?? (["D1", "D2"] as DbId[]).find((db) => sim.dbs[db].role === "primary" || sim.dbs[db].role === "down") ?? null;
  const r = replicaOf(sim);
  return w && r ? Math.max(0, sim.dbs[w].applied - sim.dbs[r].applied) : 0;
}

/** A buyer presses Beli: the order goes through the load balancer to an app server, then to the writer. */
export function order(sim: ReplSim, id: string, app: AppId) {
  if (sim.orders.some((o) => o.id === id && o.phase !== "done")) return null;
  const o: Order = { id, app, phase: "to-lb", phaseAt: sim.t, phaseEnd: sim.t + sim.hop * 0.8, db: null, result: null, tx: null, doneAt: null };
  if (sim.log.some((e) => e.kind === "answer" && e.id === id)) sim.retries += 1;
  sim.orders.push(o);
  return o;
}

/** A visitor opens the event page: reads may be served by a ready replica. */
export function read(sim: ReplSim, app: AppId) {
  const db = replicaOf(sim) ?? writerDb(sim);
  if (!db) return null;
  const r: Read = { id: sim.nextRead++, app, db, sentAt: sim.t, arriveAt: sim.t + sim.hop, shown: null, stale: false, doneAt: null };
  sim.reads.push(r);
  return r;
}

/** Atomic reservation on the writer: check and decrement in one step, idempotent per order id. */
function commit(sim: ReplSim, o: Order) {
  const db = o.db ? sim.dbs[o.db] : null;
  if (!db || db.role !== "primary" || o.db !== sim.writer) return answer(sim, o, "retry");
  if (o.id in sim.reservedIds) {
    o.tx = sim.reservedIds[o.id];
    return answer(sim, o, "duplicate");
  }
  if (db.stock <= 0) return answer(sim, o, "sold-out");
  db.stock -= 1;
  db.applied += 1;
  o.tx = db.applied;
  sim.reservedIds[o.id] = o.tx;
  sim.reserved += 1;
  sim.log.push({ at: sim.t, kind: "commit", id: o.id, tx: o.tx, db: o.db!, stock: db.stock });
  // asynchronous replication: the change leaves after the commit and arrives after the lag
  for (const target of ["D1", "D2"] as DbId[]) {
    if (target !== o.db && (sim.dbs[target].role === "replica" || sim.dbs[target].role === "syncing")) sim.changes.push({ tx: o.tx, orderId: o.id, stockAfter: db.stock, from: o.db!, to: target, sentAt: sim.t, arriveAt: sim.t + sim.lag });
  }
  answer(sim, o, "reserved");
}

function answer(sim: ReplSim, o: Order, result: OrderResult) {
  o.result = result;
  o.phase = "to-client";
  o.phaseAt = sim.t;
  o.phaseEnd = sim.t + sim.hop;
  if (result === "sold-out") sim.soldOut += 1;
  if (result === "duplicate") sim.duplicates += 1;
}

function apply(sim: ReplSim, action: ReplAction) {
  switch (action.kind) {
    case "order":
      order(sim, action.id, action.app);
      break;
    case "read":
      read(sim, action.app);
      break;
    case "fail":
      setRole(sim, action.db, "down");
      break;
    case "start-replica":
      // the first full copy is taken while the primary is healthy
      setRole(sim, action.db, "copying");
      sim.dbs[action.db].progress = 0;
      break;
    case "failover": {
      // decided once, when the failover starts: which database failed and which copy takes over
      const old = (["D1", "D2"] as DbId[]).find((db) => sim.dbs[db].role === "down" || sim.dbs[db].role === "primary") ?? null;
      sim.failover.old = old;
      sim.failover.candidate = replicaOf(sim);
      enterFailover(sim, 0);
      break;
    }
    case "rejoin":
      setRole(sim, action.db, "syncing");
      sim.dbs[action.db].progress = 0;
      break;
  }
}

function enterFailover(sim: ReplSim, index: number) {
  const step = FAILOVER_STEPS[index];
  if (!step) {
    sim.failover = { ...sim.failover, phase: "done", phaseAt: sim.t, phaseEnd: Infinity };
    sim.log.push({ at: sim.t, kind: "failover", phase: "done" });
    return;
  }
  sim.failover = { ...sim.failover, phase: step.phase, phaseAt: sim.t, phaseEnd: sim.t + step.seconds };
  sim.log.push({ at: sim.t, kind: "failover", phase: step.phase });
}

function finishFailoverPhase(sim: ReplSim) {
  const phase = sim.failover.phase;
  const { old, candidate } = sim.failover;
  if (phase === "detecting") sim.writer = null; // no writes are confirmed while roles change
  if (phase === "isolating" && old) setRole(sim, old, "isolated"); // fencing: the old primary may not accept writes any more
  if (phase === "promoting" && candidate) setRole(sim, candidate, "primary");
  if (phase === "redirecting" && candidate) sim.writer = candidate;
  if (phase === "checking" && candidate && old && sim.dbs[candidate].applied < sim.dbs[old].applied) {
    // a lagging asynchronous replica would lose the newest transactions here; the demonstration avoids it
  }
  enterFailover(sim, FAILOVER_STEPS.findIndex((s) => s.phase === phase) + 1);
}

export function advance(sim: ReplSim, dt: number): ReplSim {
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
    if (sim.failover.phase !== "idle" && sim.failover.phase !== "done") offer(sim.failover.phaseEnd, () => finishFailoverPhase(sim));
    for (const c of sim.changes) offer(c.arriveAt, () => {
      sim.changes = sim.changes.filter((x) => x !== c);
      const db = sim.dbs[c.to];
      if (db.role !== "replica" && db.role !== "syncing") return;
      if (c.tx === db.applied + 1) {
        db.applied = c.tx;
        db.stock = c.stockAfter;
        sim.log.push({ at: sim.t, kind: "applied", tx: c.tx, db: c.to });
      }
    });
    for (const db of ["D1", "D2"] as DbId[]) {
      const d = sim.dbs[db];
      if (d.role !== "copying" && d.role !== "syncing") continue;
      // copying/syncing takes 2.4 s here; then the database holds everything the writer holds
      const end = (d as Db & { startedAt?: number }).startedAt ?? ((d as Db & { startedAt?: number }).startedAt = sim.t);
      offer(end + 2.4, () => {
        const source = sim.dbs[other(db)];
        d.stock = source.stock;
        d.applied = source.applied;
        d.progress = 1;
        delete (d as Db & { startedAt?: number }).startedAt;
        setRole(sim, db, "replica");
      });
    }
    for (const o of sim.orders) {
      if (o.phase === "done") continue;
      offer(o.phaseEnd, () => {
        if (o.phase === "to-lb") {
          o.phase = "to-app";
          o.phaseAt = sim.t;
          o.phaseEnd = sim.t + sim.hop * 0.8;
        } else if (o.phase === "to-app") {
          o.db = sim.writer;
          if (!o.db) return answer(sim, o, "retry");
          o.phase = "to-db";
          o.phaseAt = sim.t;
          // a write to a database that does not answer waits for a timeout, then the client is told to try again
          o.phaseEnd = sim.t + (sim.dbs[o.db].role === "primary" ? sim.hop : sim.hop * 2.2);
        } else if (o.phase === "to-db") commit(sim, o);
        else {
          o.phase = "done";
          o.doneAt = sim.t;
          sim.log.push({ at: sim.t, kind: "answer", id: o.id, result: o.result! });
        }
      });
    }
    for (const r of sim.reads) {
      if (r.doneAt !== null || r.shown !== null) continue;
      offer(r.arriveAt, () => {
        const w = writerDb(sim);
        r.shown = sim.dbs[r.db].stock;
        r.stale = w !== null && r.db !== w && sim.dbs[r.db].applied < sim.dbs[w].applied;
        r.doneAt = sim.t;
        sim.log.push({ at: sim.t, kind: "read", db: r.db, shown: r.shown, stale: r.stale });
      });
    }
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  for (const db of ["D1", "D2"] as DbId[]) {
    const d = sim.dbs[db] as Db & { startedAt?: number };
    if ((d.role === "copying" || d.role === "syncing") && d.startedAt !== undefined) d.progress = Math.min(1, (sim.t - d.startedAt) / 2.4);
  }
  sim.orders = sim.orders.filter((o) => o.doneAt === null || sim.t - o.doneAt < KEEP);
  sim.reads = sim.reads.filter((r) => r.doneAt === null || sim.t - r.doneAt < KEEP);
  return sim;
}

export const RESULT_TEXT: Record<OrderResult, string> = {
  reserved: "Reservasi berhasil",
  "sold-out": "Tiket habis",
  retry: "Belum terkonfirmasi — coba lagi",
  duplicate: "Sudah tercatat (tidak dipotong lagi)",
};
