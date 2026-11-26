/**
 * Sharding simulation: order records kept either in one store or split over two shards by a shard key
 * (the user's id: even → A, odd → B). Pure and deterministic; time only moves through `advance`.
 *
 * Every request is a trip between fixed spots (a user, the app with its routing rule, the stock service,
 * a store). Stores serve at most CAP requests at a time; the rest wait in a queue, so "orders stored" and
 * "requests in progress" are two different numbers. A report visits every store and merges the counts.
 * Seats live only in the separate stock service, so one seat can never be sold by two shards.
 */

export type StoreId = "S" | "A" | "B";
export type Mode = "single" | "sharded";
export type Spot = "app" | "stock" | StoreId | `user:${number}`;

export interface User {
  id: number;
  name: string;
}

export interface Order {
  code: string;
  userId: number;
  name: string;
  concert: string;
  seat?: string;
  store: StoreId;
  at: number;
}

export type TripKind = "write" | "read" | "report" | "part";
export type Stage =
  | "to-app"
  | "to-stock"
  | "checking"
  | "from-stock"
  | "deciding"
  | "to-store"
  | "queued"
  | "serving"
  | "to-app-back"
  | "merging"
  | "to-user"
  | "done";

export interface Trip {
  id: number;
  kind: TripKind;
  userId: number | null;
  /** Where the trip is now (moving: from) and where it goes (moving: to). */
  from: Spot;
  to: Spot | null;
  /** Leg start and end, or the end of a wait. */
  since: number;
  until: number;
  stage: Stage;
  store: StoreId | null;
  seat?: string;
  code?: string;
  /** read: codes found; report part: orders counted. */
  found?: string[];
  count?: number;
  parent?: number;
  failed?: string;
  doneAt: number | null;
  /** The trip the figure follows (cards, rule highlight). */
  focus: boolean;
}

export type ShardAction =
  | { at: number; kind: "order"; user: number; seat?: string; concert?: string }
  | { at: number; kind: "history"; user: number }
  | { at: number; kind: "report" }
  /** Point at one user's id and the store the rule picks for it, with no request. */
  | { at: number; kind: "point"; user: number };

export type ShardLog =
  | { at: number; kind: "decide"; user: number; store: StoreId; parity: "genap" | "ganjil" | null }
  | { at: number; kind: "stored"; code: string; user: number; store: StoreId }
  | { at: number; kind: "history"; user: number; store: StoreId; codes: string[] }
  | { at: number; kind: "report"; counts: Partial<Record<StoreId, number>>; total: number; stores: number }
  | { at: number; kind: "seat"; seat: string; user: number; ok: boolean }
  | { at: number; kind: "receipt"; user: number; code: string | null; failed?: string };

export interface StoreState {
  /** Trips being served. */
  serving: number[];
  /** Trips waiting, first come first served. */
  queue: number[];
  /** Highest serving + queue seen, for the "it got busy" note. */
  peak: number;
}

export interface ShardSim {
  t: number;
  mode: Mode;
  users: User[];
  orders: Order[];
  trips: Trip[];
  stores: Record<StoreId, StoreState>;
  /** Seats: owner's user id, or null when free. Only the stock service changes this. */
  seats: Record<string, number | null>;
  /** Purchases visit the stock service first. */
  stock: boolean;
  nextCode: number;
  nextTrip: number;
  /** The user the rule is pointing at (rule card highlight). */
  pointing: { user: number; store: StoreId; at: number } | null;
  /** Last results, for the cards in the figure. */
  lastHistory: { user: number; store: StoreId; codes: string[]; at: number } | null;
  lastReport: { counts: Partial<Record<StoreId, number>>; total: number; at: number } | null;
  script: ShardAction[];
  log: ShardLog[];
}

export const USERS: User[] = [
  { id: 101, name: "Andi" },
  { id: 102, name: "Budi" },
  { id: 103, name: "Sinta" },
  { id: 104, name: "Rina" },
  { id: 105, name: "Dodi" },
  { id: 107, name: "Eka" },
];
export const CONCERT = "Konser Senja";
export const SEATS = ["A1", "A2", "A3", "B1", "B2", "B3"];

/** Timing (seconds of simulated time). Concept pacing, not a benchmark. */
export const TIMING = {
  userApp: 1.0,
  appStock: 0.8,
  check: 0.6,
  appStore: 1.2,
  decideSingle: 0.3,
  decideSharded: 1.0,
  serve: 1.2,
  merge: 0.5,
};
/** Requests one store serves at the same time. */
export const CAP = 2;
const EPS = 1e-9;

/** The routing rule: the shard key is the user id. */
export function storeFor(mode: Mode, userId: number): StoreId {
  if (mode === "single") return "S";
  return userId % 2 === 0 ? "A" : "B";
}
export const parityOf = (id: number) => (id % 2 === 0 ? "genap" : "ganjil");
export const storesOf = (mode: Mode): StoreId[] => (mode === "single" ? ["S"] : ["A", "B"]);
export const nameOf = (sim: ShardSim, id: number) => sim.users.find((u) => u.id === id)?.name ?? `Pengguna ${id}`;
const code = (n: number) => `TKT-${String(n).padStart(3, "0")}`;

export interface ShardSeed {
  mode?: Mode;
  /** Orders already stored: [user id, concert?]. They go where the rule puts them. */
  orders?: (number | [number, string])[];
  stock?: boolean;
  /** Seats already sold: seat → user. */
  sold?: Record<string, number>;
  script?: ShardAction[];
}

export function createShardSim(seed: ShardSeed = {}): ShardSim {
  const mode = seed.mode ?? "sharded";
  const sim: ShardSim = {
    t: 0,
    mode,
    users: USERS.map((u) => ({ ...u })),
    orders: [],
    trips: [],
    stores: { S: blank(), A: blank(), B: blank() },
    seats: Object.fromEntries(SEATS.map((s) => [s, seed.sold?.[s] ?? null])),
    stock: seed.stock ?? false,
    nextCode: 1,
    nextTrip: 1,
    pointing: null,
    lastHistory: null,
    lastReport: null,
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
  };
  for (const o of seed.orders ?? []) {
    const [user, concert] = Array.isArray(o) ? o : [o, CONCERT];
    sim.orders.push({ code: code(sim.nextCode++), userId: user, name: nameOf(sim, user), concert, store: storeFor(mode, user), at: 0 });
  }
  return sim;
}
function blank(): StoreState {
  return { serving: [], queue: [], peak: 0 };
}

export const ordersIn = (sim: ShardSim, store: StoreId) => sim.orders.filter((o) => o.store === store);
/** Requests a store is handling right now: being served plus waiting. */
export const busyOf = (sim: ShardSim, store: StoreId) => sim.stores[store].serving.length + sim.stores[store].queue.length;
export const activeTrips = (sim: ShardSim) => sim.trips.filter((t) => t.doneAt === null);
export const focusTrip = (sim: ShardSim) => {
  const live = sim.trips.filter((t) => t.focus && t.doneAt === null);
  return live[live.length - 1] ?? [...sim.trips].reverse().find((t) => t.focus) ?? null;
};

function launch(sim: ShardSim, kind: TripKind, userId: number | null, from: Spot, extra: Partial<Trip> = {}): Trip {
  const trip: Trip = { id: sim.nextTrip++, kind, userId, from, to: null, since: sim.t, until: sim.t, stage: "to-app", store: null, doneAt: null, focus: true, ...extra };
  // only the newest request of its kind is followed by the figure's cards
  if (trip.focus) for (const other of sim.trips) if (other.focus && other.kind === kind && other.doneAt === null && kind !== "part") other.focus = false;
  sim.trips.push(trip);
  return trip;
}
function go(sim: ShardSim, trip: Trip, to: Spot, dur: number, stage: Stage) {
  trip.from = trip.to ?? trip.from;
  trip.to = to;
  trip.since = sim.t;
  trip.until = sim.t + dur;
  trip.stage = stage;
}
function wait(sim: ShardSim, trip: Trip, dur: number, stage: Stage) {
  if (trip.to) trip.from = trip.to;
  trip.to = null;
  trip.since = sim.t;
  trip.until = sim.t + dur;
  trip.stage = stage;
}
function finish(sim: ShardSim, trip: Trip) {
  if (trip.to) trip.from = trip.to;
  trip.to = null;
  trip.stage = "done";
  trip.doneAt = sim.t;
  trip.until = Infinity;
}

/** A user buys a ticket: (stock check), the rule picks a store, the order is written there. */
export function order(sim: ShardSim, userId: number, seat?: string, concert = CONCERT) {
  const trip = launch(sim, "write", userId, `user:${userId}`, { seat, code: concert });
  go(sim, trip, "app", TIMING.userApp, "to-app");
  return trip;
}
/** A user opens their order history: only the store the rule picks is asked. */
export function history(sim: ShardSim, userId: number) {
  const trip = launch(sim, "read", userId, `user:${userId}`);
  go(sim, trip, "app", TIMING.userApp, "to-app");
  return trip;
}
/** "All orders today": every store is asked, then the counts are merged. */
export function report(sim: ShardSim) {
  const trip = launch(sim, "report", null, "app");
  wait(sim, trip, 0, "merging");
  trip.until = Infinity;
  for (const store of storesOf(sim.mode)) {
    const part = launch(sim, "part", null, "app", { parent: trip.id, store, focus: true });
    go(sim, part, store, TIMING.appStore, "to-store");
  }
  return trip;
}
export function point(sim: ShardSim, userId: number) {
  sim.pointing = { user: userId, store: storeFor(sim.mode, userId), at: sim.t };
}

function decide(sim: ShardSim, trip: Trip) {
  const store = storeFor(sim.mode, trip.userId!);
  trip.store = store;
  sim.pointing = { user: trip.userId!, store, at: sim.t };
  sim.log.push({ at: sim.t, kind: "decide", user: trip.userId!, store, parity: sim.mode === "single" ? null : parityOf(trip.userId!) });
  go(sim, trip, store, TIMING.appStore, "to-store");
}

function arriveStore(sim: ShardSim, trip: Trip) {
  const st = sim.stores[trip.store!];
  if (st.serving.length < CAP) startServe(sim, trip);
  else {
    st.queue.push(trip.id);
    wait(sim, trip, 0, "queued");
    trip.until = Infinity;
  }
  st.peak = Math.max(st.peak, busyOf(sim, trip.store!));
}
function startServe(sim: ShardSim, trip: Trip) {
  sim.stores[trip.store!].serving.push(trip.id);
  wait(sim, trip, TIMING.serve, "serving");
}
function served(sim: ShardSim, trip: Trip) {
  const store = trip.store!;
  const st = sim.stores[store];
  st.serving = st.serving.filter((id) => id !== trip.id);
  if (trip.kind === "write") {
    const o: Order = { code: code(sim.nextCode++), userId: trip.userId!, name: nameOf(sim, trip.userId!), concert: trip.code ?? CONCERT, seat: trip.seat, store, at: sim.t };
    sim.orders.push(o);
    trip.code = o.code;
    sim.log.push({ at: sim.t, kind: "stored", code: o.code, user: o.userId, store });
  } else if (trip.kind === "read") {
    trip.found = ordersIn(sim, store).filter((o) => o.userId === trip.userId).map((o) => o.code);
  } else if (trip.kind === "part") {
    trip.count = ordersIn(sim, store).length;
  }
  go(sim, trip, "app", TIMING.appStore, "to-app-back");
  const next = st.queue.shift();
  if (next !== undefined) startServe(sim, sim.trips.find((t) => t.id === next)!);
}

function arrive(sim: ShardSim, trip: Trip) {
  switch (trip.stage) {
    case "to-app":
      if (trip.kind === "write" && sim.stock && trip.seat) return go(sim, trip, "stock", TIMING.appStock, "to-stock");
      return wait(sim, trip, sim.mode === "single" ? TIMING.decideSingle : TIMING.decideSharded, "deciding");
    case "to-stock":
      return wait(sim, trip, TIMING.check, "checking");
    case "checking": {
      // one place decides seats, one request at a time: the first claim wins
      const seat = trip.seat!;
      const ok = sim.seats[seat] === null;
      if (ok) sim.seats[seat] = trip.userId!;
      else trip.failed = `kursi ${seat} sudah terjual`;
      sim.log.push({ at: sim.t, kind: "seat", seat, user: trip.userId!, ok });
      return go(sim, trip, "app", TIMING.appStock, "from-stock");
    }
    case "from-stock":
      if (trip.failed) return go(sim, trip, `user:${trip.userId!}` as Spot, TIMING.userApp, "to-user");
      return wait(sim, trip, sim.mode === "single" ? TIMING.decideSingle : TIMING.decideSharded, "deciding");
    case "deciding":
      return decide(sim, trip);
    case "to-store":
      return arriveStore(sim, trip);
    case "serving":
      return served(sim, trip);
    case "to-app-back":
      if (trip.kind === "part") {
        finish(sim, trip);
        const parent = sim.trips.find((t) => t.id === trip.parent)!;
        const parts = sim.trips.filter((t) => t.parent === parent.id);
        if (parts.every((p) => p.doneAt !== null)) wait(sim, parent, TIMING.merge, "merging");
        return;
      }
      if (trip.kind === "read") {
        sim.lastHistory = { user: trip.userId!, store: trip.store!, codes: trip.found ?? [], at: sim.t };
        sim.log.push({ at: sim.t, kind: "history", user: trip.userId!, store: trip.store!, codes: trip.found ?? [] });
      }
      return go(sim, trip, `user:${trip.userId!}` as Spot, TIMING.userApp, "to-user");
    case "merging": {
      const parts = sim.trips.filter((t) => t.parent === trip.id);
      const counts: Partial<Record<StoreId, number>> = {};
      for (const p of parts) counts[p.store!] = p.count ?? 0;
      const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
      sim.lastReport = { counts, total, at: sim.t };
      sim.log.push({ at: sim.t, kind: "report", counts, total, stores: parts.length });
      return finish(sim, trip);
    }
    case "to-user":
      if (trip.kind === "write") sim.log.push({ at: sim.t, kind: "receipt", user: trip.userId!, code: trip.failed ? null : trip.code ?? null, failed: trip.failed });
      return finish(sim, trip);
  }
}

function apply(sim: ShardSim, a: ShardAction) {
  if (a.kind === "order") order(sim, a.user, a.seat, a.concert);
  else if (a.kind === "history") history(sim, a.user);
  else if (a.kind === "report") report(sim);
  else point(sim, a.user);
}

export function advance(sim: ShardSim, dt: number): ShardSim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 20000; guard++) {
    let next: { at: number; run: () => void } | null = null;
    const offer = (when: number, run: () => void) => {
      if (when <= until + EPS && (!next || when < next.at - EPS)) next = { at: when, run };
    };
    if (sim.script.length) {
      const action = sim.script[0];
      offer(action.at, () => (sim.script.shift(), apply(sim, action)));
    }
    for (const trip of sim.trips) if (trip.doneAt === null && Number.isFinite(trip.until)) offer(trip.until, () => arrive(sim, trip));
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  // finished trips are kept briefly for fading cards, then dropped
  sim.trips = sim.trips.filter((t) => t.doneAt === null || sim.t - t.doneAt < 2.5 || t.kind === "report");
  return sim;
}

/** Where a trip is between its two spots, 0…1 (1 when waiting). */
export function progressOf(trip: Trip, t: number) {
  if (!trip.to) return 1;
  const span = trip.until - trip.since || 1;
  return Math.max(0, Math.min(1, (t - trip.since) / span));
}
