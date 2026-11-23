/**
 * DNS lookup simulation: pure, deterministic, event driven.
 *
 * A client looks up one name. It first checks its local cache; on a miss it asks the resolver.
 * The resolver checks its own cache; on a miss it walks the hierarchy: the root refers it to the
 * TLD server, the TLD server refers it to the authoritative server, and the authoritative server
 * answers with the address and a TTL. The resolver keeps the answer until the TTL runs out; the
 * client keeps it for at most `localMax` seconds and never longer than the TTL left.
 *
 * Every number, card and sentence on the page comes from one `DnsSim` advanced by `advance()`.
 */

export type Phase =
  | "local-check"
  | "to-resolver"
  | "resolver-check"
  | "to-root"
  | "from-root"
  | "to-tld"
  | "from-tld"
  | "to-auth"
  | "from-auth"
  | "to-client"
  | "done";

export type Source = "local" | "resolver" | "authoritative";

export interface DnsParams {
  /** Time to look in a cache. */
  check: number;
  /** One way between the client and the resolver. */
  clientHop: number;
  /** One way between the resolver and a server of the hierarchy. */
  serverHop: number;
  /** TTL the authoritative server gives its answer (seconds). */
  ttl: number;
  /** The client keeps an answer at most this long, even if the TTL is longer. */
  localMax: number;
}

/** Demonstration values, chosen to be easy to watch. Real TTLs are usually minutes to hours. */
export const DNS_PARAMS: DnsParams = { check: 0.3, clientHop: 0.6, serverHop: 0.7, ttl: 12, localMax: 5 };

export const NAME = "contoh.id";
export const ADDRESSES = ["203.0.113.10", "203.0.113.20"] as const;

export interface CacheEntry {
  /** Index into ADDRESSES. */
  version: number;
  storedAt: number;
  expiresAt: number;
}

export interface Query {
  id: number;
  /** Order number shown to readers. */
  seq: number;
  askedAt: number;
  phase: Phase;
  phaseAt: number;
  phaseEnd: number;
  /** Where the answer came from, once known. */
  source: Source | null;
  version: number | null;
  /** Remaining TTL carried with the answer. */
  ttlLeft: number | null;
  doneAt: number | null;
  /** Servers of the hierarchy this query visited. */
  hops: number;
}

export type DnsAction = { at: number; kind: "ask" } | { at: number; kind: "change" };

export type DnsLog =
  | { at: number; kind: "ask"; seq: number }
  | { at: number; kind: "local"; seq: number; hit: boolean }
  | { at: number; kind: "resolver"; seq: number; hit: boolean }
  | { at: number; kind: "referral"; seq: number; from: "root" | "tld" }
  | { at: number; kind: "authoritative"; seq: number; version: number; ttl: number }
  | { at: number; kind: "answer"; seq: number; source: Source; version: number; stale: boolean; took: number }
  | { at: number; kind: "expire"; cache: "local" | "resolver" }
  | { at: number; kind: "change"; version: number };

export interface DnsSim {
  t: number;
  params: DnsParams;
  queries: Query[];
  local: CacheEntry | null;
  resolver: CacheEntry | null;
  /** The address the authoritative server currently publishes (index into ADDRESSES). */
  zone: number;
  script: DnsAction[];
  log: DnsLog[];
  nextId: number;
  nextSeq: number;
  asked: number;
  localHits: number;
  resolverHits: number;
  fullLookups: number;
  staleAnswers: number;
  serverHops: number;
}

const EPS = 1e-9;
const KEEP_DONE = 2.5;
const KEEP_LOG = 120;

export function createDnsSim(options: { params?: Partial<DnsParams>; script?: DnsAction[] } = {}): DnsSim {
  return {
    t: 0,
    params: { ...DNS_PARAMS, ...options.params },
    queries: [],
    local: null,
    resolver: null,
    zone: 0,
    script: [...(options.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    nextId: 1,
    nextSeq: 1,
    asked: 0,
    localHits: 0,
    resolverHits: 0,
    fullLookups: 0,
    staleAnswers: 0,
    serverHops: 0,
  };
}

const push = (sim: DnsSim, entry: DnsLog) => {
  sim.log.push(entry);
  if (sim.log.length > KEEP_LOG) sim.log.splice(0, sim.log.length - KEEP_LOG);
};
const valid = (entry: CacheEntry | null, t: number) => entry !== null && entry.expiresAt > t + EPS;

function enter(sim: DnsSim, query: Query, phase: Phase, duration: number) {
  query.phase = phase;
  query.phaseAt = sim.t;
  query.phaseEnd = sim.t + duration;
}

export function ask(sim: DnsSim) {
  const query: Query = { id: sim.nextId++, seq: sim.nextSeq++, askedAt: sim.t, phase: "local-check", phaseAt: sim.t, phaseEnd: sim.t + sim.params.check, source: null, version: null, ttlLeft: null, doneAt: null, hops: 0 };
  sim.queries.push(query);
  sim.asked += 1;
  push(sim, { at: sim.t, kind: "ask", seq: query.seq });
}

/** The authoritative server starts publishing the other address. Caches keep the old one until they expire. */
export function changeRecord(sim: DnsSim) {
  sim.zone = (sim.zone + 1) % ADDRESSES.length;
  push(sim, { at: sim.t, kind: "change", version: sim.zone });
}

function finish(sim: DnsSim, query: Query) {
  query.phase = "done";
  query.phaseAt = sim.t;
  query.phaseEnd = Infinity;
  query.doneAt = sim.t;
  const stale = query.version !== sim.zone;
  if (stale) sim.staleAnswers += 1;
  push(sim, { at: sim.t, kind: "answer", seq: query.seq, source: query.source!, version: query.version!, stale, took: sim.t - query.askedAt });
}

function step(sim: DnsSim, query: Query) {
  const { check, clientHop, serverHop, ttl, localMax } = sim.params;
  switch (query.phase) {
    case "local-check": {
      const hit = valid(sim.local, sim.t);
      push(sim, { at: sim.t, kind: "local", seq: query.seq, hit });
      if (hit) {
        sim.localHits += 1;
        query.source = "local";
        query.version = sim.local!.version;
        query.ttlLeft = sim.local!.expiresAt - sim.t;
        finish(sim, query);
      } else enter(sim, query, "to-resolver", clientHop);
      break;
    }
    case "to-resolver":
      enter(sim, query, "resolver-check", check);
      break;
    case "resolver-check": {
      const hit = valid(sim.resolver, sim.t);
      push(sim, { at: sim.t, kind: "resolver", seq: query.seq, hit });
      if (hit) {
        sim.resolverHits += 1;
        query.source = "resolver";
        query.version = sim.resolver!.version;
        query.ttlLeft = sim.resolver!.expiresAt - sim.t;
        enter(sim, query, "to-client", clientHop);
      } else {
        sim.fullLookups += 1;
        enter(sim, query, "to-root", serverHop);
      }
      break;
    }
    case "to-root":
      sim.serverHops += 1;
      query.hops += 1;
      push(sim, { at: sim.t, kind: "referral", seq: query.seq, from: "root" });
      enter(sim, query, "from-root", serverHop);
      break;
    case "from-root":
      enter(sim, query, "to-tld", serverHop);
      break;
    case "to-tld":
      sim.serverHops += 1;
      query.hops += 1;
      push(sim, { at: sim.t, kind: "referral", seq: query.seq, from: "tld" });
      enter(sim, query, "from-tld", serverHop);
      break;
    case "from-tld":
      enter(sim, query, "to-auth", serverHop);
      break;
    case "to-auth":
      sim.serverHops += 1;
      query.hops += 1;
      // the answer is read when the question arrives
      query.version = sim.zone;
      query.ttlLeft = ttl;
      push(sim, { at: sim.t, kind: "authoritative", seq: query.seq, version: sim.zone, ttl });
      enter(sim, query, "from-auth", serverHop);
      break;
    case "from-auth":
      query.source = "authoritative";
      // the TTL counts from the moment the resolver stores the answer
      sim.resolver = { version: query.version!, storedAt: sim.t, expiresAt: sim.t + ttl };
      query.ttlLeft = ttl;
      enter(sim, query, "to-client", clientHop);
      break;
    case "to-client": {
      const left = Math.max(0, query.ttlLeft! - clientHop);
      sim.local = { version: query.version!, storedAt: sim.t, expiresAt: sim.t + Math.min(localMax, left) };
      finish(sim, query);
      break;
    }
    case "done":
      break;
  }
}

/* ------------------------------------------------------------------ events */

type Pending = { at: number; rank: number; run: () => void };

function nextEvent(sim: DnsSim, until: number): Pending | null {
  let best: Pending | null = null;
  const offer = (candidate: Pending) => {
    if (candidate.at > until + EPS) return;
    if (!best || candidate.at < best.at - EPS || (Math.abs(candidate.at - best.at) <= EPS && candidate.rank < best.rank)) best = candidate;
  };
  if (sim.script.length) {
    const action = sim.script[0];
    offer({ at: action.at, rank: 0, run: () => (sim.script.shift(), action.kind === "ask" ? ask(sim) : changeRecord(sim)) });
  }
  if (sim.local) {
    const entry = sim.local;
    offer({ at: entry.expiresAt, rank: 1, run: () => (sim.local === entry ? ((sim.local = null), push(sim, { at: sim.t, kind: "expire", cache: "local" })) : undefined) });
  }
  if (sim.resolver) {
    const entry = sim.resolver;
    offer({ at: entry.expiresAt, rank: 1, run: () => (sim.resolver === entry ? ((sim.resolver = null), push(sim, { at: sim.t, kind: "expire", cache: "resolver" })) : undefined) });
  }
  for (const query of sim.queries) if (query.phase !== "done") offer({ at: query.phaseEnd, rank: 2, run: () => step(sim, query) });
  return best;
}

export function advance(sim: DnsSim, dt: number): DnsSim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 100000; guard++) {
    const event = nextEvent(sim, until);
    if (!event) break;
    sim.t = Math.max(sim.t, event.at);
    event.run();
  }
  sim.t = until;
  sim.queries = sim.queries.filter((query) => query.doneAt === null || sim.t - query.doneAt < KEEP_DONE);
  return sim;
}

/* ------------------------------------------------------------------ readings */

export const inFlight = (sim: DnsSim) => sim.queries.some((query) => query.phase !== "done");
export const ttlLeft = (entry: CacheEntry | null, t: number) => (entry ? Math.max(0, entry.expiresAt - t) : 0);
export const answers = (sim: DnsSim) => sim.log.filter((entry): entry is Extract<DnsLog, { kind: "answer" }> => entry.kind === "answer");

/** The reader clears a cache by hand (like `ipconfig /flushdns` on the client). */
export function flush(sim: DnsSim, cache: "local" | "resolver") {
  if (cache === "local" && sim.local) {
    sim.local = null;
    push(sim, { at: sim.t, kind: "expire", cache });
  }
  if (cache === "resolver" && sim.resolver) {
    sim.resolver = null;
    push(sim, { at: sim.t, kind: "expire", cache });
  }
}
