/**
 * CDN simulation: visitors in Jakarta load a concert poster whose origin server is in Singapore.
 *
 * Every trip goes visitor → Jakarta point. Without a CDN that point is only the network on the way,
 * and the request continues to the origin. With a CDN the point is the CDN Jakarta server: it answers
 * from its copy when the copy exists and is still valid (hit), otherwise it fetches the poster from
 * the origin, stores a copy for `ttl` seconds and answers (miss). Buying a ticket is never cached:
 * it always goes on to the purchase application. Times are simulated and slowed down, never measured.
 * Pure and deterministic.
 */

export type Who = "Andi" | "Budi" | "Citra";
export const PEOPLE: Who[] = ["Andi", "Budi", "Citra"];
export type Kind = "poster" | "buy";
/** Which way a trip is told to go: through the CDN, or straight to the origin (the comparison). */
export type Via = "cdn" | "direct";
export type Stage = "to-j" | "j-origin" | "origin-j" | "j-buy" | "buy-j" | "j-user" | "done";

export interface Trip {
  id: number;
  who: Who;
  kind: Kind;
  via: Via;
  stage: Stage;
  stageAt: number;
  stageEnd: number;
  startedAt: number;
  /** hit / miss at the CDN, or "origin" when no CDN was used. */
  result: "hit" | "miss" | "origin" | null;
  doneAt: number | null;
}

export interface Copy {
  storedAt: number;
  expiresAt: number;
}

export type Screen = { state: "empty" | "asking" | "from-origin" | "from-cdn" | "shown" | "bought"; at: number; took: number | null };

export interface Result {
  mode: "Tanpa CDN" | "Dengan CDN — salinan tersedia" | "Dengan CDN — salinan belum ada";
  route: string;
  took: number;
  originFetches: number;
}

export type CdnAction =
  | { at: number; kind: "load"; who: Who; via?: Via }
  | { at: number; kind: "buy"; who: Who }
  | { at: number; kind: "clear" };

export type CdnLog =
  | { at: number; kind: "asked"; id: number; who: Who; kind2: Kind }
  | { at: number; kind: "hit"; id: number; who: Who }
  | { at: number; kind: "miss"; id: number; who: Who }
  | { at: number; kind: "origin"; id: number; who: Who }
  | { at: number; kind: "stored"; expiresAt: number }
  | { at: number; kind: "shown"; id: number; who: Who; took: number; result: Trip["result"] }
  | { at: number; kind: "bought"; id: number; who: Who }
  | { at: number; kind: "cleared" };

export interface CdnSim {
  t: number;
  cdnOn: boolean;
  /** The poster copy at CDN Jakarta, if any. */
  copy: Copy | null;
  ttl: number;
  trips: Trip[];
  script: CdnAction[];
  log: CdnLog[];
  originFetches: number;
  hits: number;
  misses: number;
  screens: Record<Who, Screen>;
  results: Result[];
  nextId: number;
  hop: { near: number; far: number };
}

const EPS = 1e-9;
const KEEP = 2;

export interface CdnSeed {
  cdnOn?: boolean;
  copy?: boolean;
  shown?: Who[];
  originFetches?: number;
  script?: CdnAction[];
}

export function createCdnSim(seed: CdnSeed = {}): CdnSim {
  const empty = (): Screen => ({ state: "empty", at: 0, took: null });
  const sim: CdnSim = {
    t: 0,
    cdnOn: seed.cdnOn ?? false,
    copy: seed.copy ? { storedAt: 0, expiresAt: 60 } : null,
    ttl: 60,
    trips: [],
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    originFetches: seed.originFetches ?? 0,
    hits: 0,
    misses: 0,
    screens: { Andi: empty(), Budi: empty(), Citra: empty() },
    results: [],
    nextId: 1,
    hop: { near: 0.8, far: 1.8 },
  };
  for (const who of seed.shown ?? []) sim.screens[who] = { state: "shown", at: 0, took: null };
  return sim;
}

/** The copy is used only while it is still valid. */
export const validCopy = (sim: CdnSim) => Boolean(sim.copy && sim.t < sim.copy.expiresAt - EPS);
export const copyLeft = (sim: CdnSim) => (sim.copy ? Math.max(0, sim.copy.expiresAt - sim.t) : 0);

function go(sim: CdnSim, trip: Trip, stage: Stage) {
  trip.stage = stage;
  trip.stageAt = sim.t;
  trip.stageEnd = sim.t + (stage === "to-j" || stage === "j-user" ? sim.hop.near : sim.hop.far);
}

/** A visitor's browser asks for the poster. */
export function load(sim: CdnSim, who: Who, via: Via = "cdn") {
  const trip: Trip = { id: sim.nextId++, who, kind: "poster", via: sim.cdnOn ? via : "direct", stage: "to-j", stageAt: sim.t, stageEnd: sim.t, startedAt: sim.t, result: null, doneAt: null };
  go(sim, trip, "to-j");
  sim.trips.push(trip);
  sim.screens[who] = { state: "asking", at: sim.t, took: null };
  sim.log.push({ at: sim.t, kind: "asked", id: trip.id, who, kind2: "poster" });
  return trip;
}

/** A visitor buys a ticket: never answered from a copy. */
export function buy(sim: CdnSim, who: Who) {
  const trip: Trip = { id: sim.nextId++, who, kind: "buy", via: "direct", stage: "to-j", stageAt: sim.t, stageEnd: sim.t, startedAt: sim.t, result: null, doneAt: null };
  go(sim, trip, "to-j");
  sim.trips.push(trip);
  sim.log.push({ at: sim.t, kind: "asked", id: trip.id, who, kind2: "buy" });
  return trip;
}

/** Empties the CDN copy, so the next request is a miss again. */
export function clearCopy(sim: CdnSim) {
  sim.copy = null;
  sim.log.push({ at: sim.t, kind: "cleared" });
}

function arrive(sim: CdnSim, trip: Trip) {
  switch (trip.stage) {
    case "to-j":
      if (trip.kind === "buy") return go(sim, trip, "j-buy");
      if (sim.cdnOn && trip.via === "cdn") {
        if (validCopy(sim)) {
          trip.result = "hit";
          sim.hits += 1;
          sim.screens[trip.who] = { state: "from-cdn", at: sim.t, took: null };
          sim.log.push({ at: sim.t, kind: "hit", id: trip.id, who: trip.who });
          return go(sim, trip, "j-user");
        }
        trip.result = "miss";
        sim.misses += 1;
        sim.log.push({ at: sim.t, kind: "miss", id: trip.id, who: trip.who });
      } else trip.result = "origin";
      sim.screens[trip.who] = { state: "from-origin", at: sim.t, took: null };
      return go(sim, trip, "j-origin");
    case "j-origin":
      sim.originFetches += 1;
      sim.log.push({ at: sim.t, kind: "origin", id: trip.id, who: trip.who });
      return go(sim, trip, "origin-j");
    case "origin-j":
      if (trip.result === "miss") {
        sim.copy = { storedAt: sim.t, expiresAt: sim.t + sim.ttl };
        sim.log.push({ at: sim.t, kind: "stored", expiresAt: sim.copy.expiresAt });
      }
      return go(sim, trip, "j-user");
    case "j-buy":
      return go(sim, trip, "buy-j");
    case "buy-j":
      return go(sim, trip, "j-user");
    case "j-user": {
      trip.stage = "done";
      trip.doneAt = sim.t;
      const took = Math.round((sim.t - trip.startedAt) * 10) / 10;
      if (trip.kind === "buy") {
        sim.screens[trip.who] = { state: "bought", at: sim.t, took };
        sim.log.push({ at: sim.t, kind: "bought", id: trip.id, who: trip.who });
        return;
      }
      sim.screens[trip.who] = { state: "shown", at: sim.t, took };
      sim.log.push({ at: sim.t, kind: "shown", id: trip.id, who: trip.who, took, result: trip.result });
      const mode = trip.result === "origin" ? "Tanpa CDN" : trip.result === "hit" ? "Dengan CDN — salinan tersedia" : "Dengan CDN — salinan belum ada";
      const route = trip.result === "hit" ? "Jakarta → CDN Jakarta → Jakarta" : trip.result === "miss" ? "Jakarta → CDN → Singapura → CDN → Jakarta" : "Jakarta → Singapura → Jakarta";
      sim.results = [...sim.results.filter((r) => r.mode !== mode), { mode, route, took, originFetches: trip.result === "hit" ? 0 : 1 }];
    }
  }
}

function apply(sim: CdnSim, a: CdnAction) {
  if (a.kind === "load") load(sim, a.who, a.via);
  else if (a.kind === "buy") buy(sim, a.who);
  else clearCopy(sim);
}

export function advance(sim: CdnSim, dt: number): CdnSim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 10000; guard++) {
    let next: { at: number; run: () => void } | null = null;
    const offer = (when: number, run: () => void) => {
      if (when <= until + EPS && (!next || when < next.at - EPS)) next = { at: when, run };
    };
    if (sim.script.length) {
      const action = sim.script[0];
      offer(action.at, () => (sim.script.shift(), apply(sim, action)));
    }
    for (const trip of sim.trips) if (trip.doneAt === null) offer(trip.stageEnd, () => arrive(sim, trip));
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  sim.trips = sim.trips.filter((trip) => trip.doneAt === null || sim.t - trip.doneAt < KEEP);
  return sim;
}

export const progressOf = (trip: Trip, t: number) => Math.max(0, Math.min(1, (t - trip.stageAt) / Math.max(EPS, trip.stageEnd - trip.stageAt)));
