/**
 * DNS simulation: pure, deterministic, event driven. One browser opens websites by name.
 *
 *   1. The browser checks its own short-lived notes (device cache).
 *   2. Otherwise it asks the DNS resolver. The resolver may be down (no answer), may hold the name on a
 *      blocklist (it answers the address of a warning page), may have a cached answer, or walks the
 *      hierarchy: root → TLD .id → authoritative server of the name. The TLD answers "does not exist"
 *      for a name nobody registered (NXDOMAIN).
 *   3. With an address, the browser goes to that address itself. The server there may answer, or not.
 *
 * Answers are cached with a TTL at the resolver and, shorter, on the device. When the site moves to a new
 * address, cached copies keep pointing at the old one until they expire. Every token, number and label on
 * the page comes from one `DnsSim`.
 */

export type Lane =
  | "dns-go"
  | "dns-back"
  | "root-go"
  | "root-back"
  | "tld-go"
  | "tld-back"
  | "auth-go"
  | "auth-back"
  | "site-go"
  | "site-back"
  | "warn-go"
  | "warn-back";

/** Where a visit is: travelling a lane, looking in a cache, waiting for an answer that does not come, or done. */
export type Stage = Lane | "device-check" | "resolver-check" | "waiting" | "done";
export type Outcome = "page" | "not-found" | "blocked-page" | "dns-timeout" | "site-timeout";
export type Source = "device" | "resolver" | "authoritative" | "blocklist";

export const SITE = "konser-tiket.id";
export const TYPO = "konsertiket.id";
export const BLOCKED = "situs-terlarang.id";
export const ADDRESSES = ["203.0.113.10", "203.0.113.20"] as const;
export const BLOCKED_IP = "198.51.100.7";
export const WARNING_IP = "192.0.2.80";

export interface DnsParams {
  /** Time to look in a cache. */
  check: number;
  /** One way between the browser and the resolver, or the browser and a website. */
  clientHop: number;
  /** One way between the resolver and a server of the hierarchy. */
  serverHop: number;
  /** TTL the authoritative server gives its answer (seconds). */
  ttl: number;
  /** The device keeps an answer at most this long, even if the TTL is longer. */
  localMax: number;
  /** How long the browser waits for an answer before it gives up. */
  timeout: number;
}

/** Demonstration values, chosen to be easy to watch. Real TTLs are usually minutes to hours. */
export const DNS_PARAMS: DnsParams = { check: 0.5, clientHop: 1.2, serverHop: 1.1, ttl: 20, localMax: 6, timeout: 3 };

export interface CacheEntry {
  address: string;
  /** Index into ADDRESSES when the answer is the site's address, else -1. */
  version: number;
  storedAt: number;
  expiresAt: number;
}

export interface Visit {
  id: number;
  name: string;
  stage: Stage;
  /** Lane the visit waits on (for drawing the stuck token). */
  waitingOn: Lane | null;
  stageAt: number;
  stageEnd: number;
  address: string | null;
  version: number;
  source: Source | null;
  /** TTL left on the answer when the resolver sent it. */
  ttl: number;
  /** The name is not registered (NXDOMAIN). */
  missing: boolean;
  outcome: Outcome | null;
  doneAt: number | null;
}

export type DnsAction =
  | { at: number; kind: "visit"; name: string }
  | { at: number; kind: "move" }
  | { at: number; kind: "resolver"; up: boolean }
  | { at: number; kind: "site"; up: boolean };

export type DnsLog =
  | { at: number; kind: "asked"; id: number; name: string }
  | { at: number; kind: "cache-hit"; id: number; where: "device" | "resolver"; address: string; stale: boolean }
  | { at: number; kind: "referral"; id: number; from: "root" | "tld" }
  | { at: number; kind: "nxdomain"; id: number; name: string }
  | { at: number; kind: "answer"; id: number; address: string; ttl: number }
  | { at: number; kind: "blocked"; id: number; name: string }
  | { at: number; kind: "moved"; address: string }
  | { at: number; kind: "outcome"; id: number; name: string; outcome: Outcome; stale: boolean };

export interface DnsSim {
  t: number;
  params: DnsParams;
  /** Which of ADDRESSES the site uses now. */
  zone: number;
  /** Names registered under .id (the TLD knows them). */
  registered: string[];
  blocklist: string[];
  resolverUp: boolean;
  siteUp: boolean;
  device: Record<string, CacheEntry>;
  resolver: Record<string, CacheEntry>;
  visits: Visit[];
  script: DnsAction[];
  log: DnsLog[];
  screen: { name: string; outcome: Outcome; stale: boolean; at: number } | null;
  asked: number;
  serverHops: number;
  cacheHits: number;
  pagesOpened: number;
  nextId: number;
}

const EPS = 1e-9;
const KEEP_DONE = 2.4;
const KEEP_LOG = 160;

export interface DnsSeed {
  params?: Partial<DnsParams>;
  script?: DnsAction[];
  resolverUp?: boolean;
  siteUp?: boolean;
  /** Answers the resolver already holds when the scene starts (name → expires at). */
  resolverCache?: Record<string, number>;
}

export function createDnsSim(seed: DnsSeed = {}): DnsSim {
  const sim: DnsSim = {
    t: 0,
    params: { ...DNS_PARAMS, ...seed.params },
    zone: 0,
    registered: [SITE, BLOCKED],
    blocklist: [BLOCKED],
    resolverUp: seed.resolverUp ?? true,
    siteUp: seed.siteUp ?? true,
    device: {},
    resolver: {},
    visits: [],
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    screen: null,
    asked: 0,
    serverHops: 0,
    cacheHits: 0,
    pagesOpened: 0,
    nextId: 1,
  };
  for (const [name, expiresAt] of Object.entries(seed.resolverCache ?? {})) sim.resolver[name] = { address: addressOf(sim, name)!, version: sim.zone, storedAt: 0, expiresAt };
  return sim;
}

const push = (sim: DnsSim, entry: DnsLog) => {
  sim.log.push(entry);
  if (sim.log.length > KEEP_LOG) sim.log.splice(0, sim.log.length - KEEP_LOG);
};

/** The official address of a name (what its authoritative server says). */
export function addressOf(sim: DnsSim, name: string): string | null {
  if (name === SITE) return ADDRESSES[sim.zone];
  if (name === BLOCKED) return BLOCKED_IP;
  return null;
}

export const valid = (entry: CacheEntry | undefined, t: number): entry is CacheEntry => Boolean(entry && entry.expiresAt > t + EPS);
/** A cached copy that no longer matches the official address. */
export const isStale = (sim: DnsSim, entry: CacheEntry) => entry.version >= 0 && entry.version !== sim.zone;
export const ttlLeft = (entry: CacheEntry, t: number) => Math.max(0, entry.expiresAt - t);

function enter(sim: DnsSim, v: Visit, stage: Stage, duration: number) {
  v.stage = stage;
  v.waitingOn = null;
  v.stageAt = sim.t;
  v.stageEnd = sim.t + duration;
  if (stage === "root-go" || stage === "tld-go" || stage === "auth-go") sim.serverHops += 1;
}
const hop = (sim: DnsSim, v: Visit, lane: Lane) => enter(sim, v, lane, lane.startsWith("dns") || lane.startsWith("site") || lane.startsWith("warn") ? sim.params.clientHop : sim.params.serverHop);
function wait(sim: DnsSim, v: Visit, on: Lane) {
  enter(sim, v, "waiting", sim.params.timeout);
  v.waitingOn = on;
}

/** The browser opens a website by name. */
export function visit(sim: DnsSim, name: string): Visit {
  const v: Visit = { id: sim.nextId++, name, stage: "device-check", waitingOn: null, stageAt: sim.t, stageEnd: sim.t, address: null, version: -1, ttl: 0, source: null, missing: false, outcome: null, doneAt: null };
  sim.asked += 1;
  enter(sim, v, "device-check", sim.params.check);
  sim.visits.push(v);
  push(sim, { at: sim.t, kind: "asked", id: v.id, name });
  return v;
}

/** The site moves to its next address; cached copies are not told. */
export function move(sim: DnsSim) {
  sim.zone = Math.min(ADDRESSES.length - 1, sim.zone + 1);
  push(sim, { at: sim.t, kind: "moved", address: ADDRESSES[sim.zone] });
}

/** Empties both caches (as if the notes were thrown away). */
export function flush(sim: DnsSim) {
  sim.device = {};
  sim.resolver = {};
}

function finish(sim: DnsSim, v: Visit, outcome: Outcome) {
  const stale = v.version >= 0 && v.version !== sim.zone;
  v.stage = "done";
  v.outcome = outcome;
  v.doneAt = sim.t;
  if (outcome === "page") sim.pagesOpened += 1;
  sim.screen = { name: v.name, outcome, stale, at: sim.t };
  push(sim, { at: sim.t, kind: "outcome", id: v.id, name: v.name, outcome, stale });
}

function goToAddress(sim: DnsSim, v: Visit) {
  if (v.missing || v.address === null) return finish(sim, v, "not-found");
  hop(sim, v, v.address === WARNING_IP ? "warn-go" : "site-go");
}

function reachResolver(sim: DnsSim, v: Visit) {
  if (!sim.resolverUp) return wait(sim, v, "dns-go");
  enter(sim, v, "resolver-check", sim.params.check);
}

function resolverDecides(sim: DnsSim, v: Visit) {
  if (sim.blocklist.includes(v.name)) {
    v.address = WARNING_IP;
    v.source = "blocklist";
    push(sim, { at: sim.t, kind: "blocked", id: v.id, name: v.name });
    return hop(sim, v, "dns-back");
  }
  const entry = sim.resolver[v.name];
  if (valid(entry, sim.t)) {
    sim.cacheHits += 1;
    v.address = entry.address;
    v.version = entry.version;
    v.ttl = ttlLeft(entry, sim.t);
    v.source = "resolver";
    push(sim, { at: sim.t, kind: "cache-hit", id: v.id, where: "resolver", address: entry.address, stale: isStale(sim, entry) });
    return hop(sim, v, "dns-back");
  }
  hop(sim, v, "root-go");
}

function store(sim: DnsSim, where: Record<string, CacheEntry>, v: Visit, expiresAt: number) {
  if (v.address === null || v.source === "blocklist") return;
  where[v.name] = { address: v.address, version: v.version, storedAt: sim.t, expiresAt };
}

function arrive(sim: DnsSim, v: Visit) {
  switch (v.stage) {
    case "device-check": {
      const entry = sim.device[v.name];
      if (valid(entry, sim.t)) {
        sim.cacheHits += 1;
        v.address = entry.address;
        v.version = entry.version;
        v.source = "device";
        push(sim, { at: sim.t, kind: "cache-hit", id: v.id, where: "device", address: entry.address, stale: isStale(sim, entry) });
        return goToAddress(sim, v);
      }
      return hop(sim, v, "dns-go");
    }
    case "dns-go":
      return reachResolver(sim, v);
    case "resolver-check":
      return resolverDecides(sim, v);
    case "root-go":
      return hop(sim, v, "root-back");
    case "root-back":
      push(sim, { at: sim.t, kind: "referral", id: v.id, from: "root" });
      return hop(sim, v, "tld-go");
    case "tld-go":
      if (!sim.registered.includes(v.name)) {
        v.missing = true;
        push(sim, { at: sim.t, kind: "nxdomain", id: v.id, name: v.name });
      }
      return hop(sim, v, "tld-back");
    case "tld-back":
      if (v.missing) {
        v.source = "authoritative";
        return hop(sim, v, "dns-back");
      }
      push(sim, { at: sim.t, kind: "referral", id: v.id, from: "tld" });
      return hop(sim, v, "auth-go");
    case "auth-go":
      v.address = addressOf(sim, v.name);
      v.version = v.name === SITE ? sim.zone : -1;
      v.source = "authoritative";
      return hop(sim, v, "auth-back");
    case "auth-back":
      push(sim, { at: sim.t, kind: "answer", id: v.id, address: v.address!, ttl: sim.params.ttl });
      v.ttl = sim.params.ttl;
      store(sim, sim.resolver, v, sim.t + sim.params.ttl);
      return hop(sim, v, "dns-back");
    case "dns-back": {
      // the device keeps the answer for a shorter time, never longer than the resolver's TTL left
      store(sim, sim.device, v, sim.t + Math.min(sim.params.localMax, v.ttl));
      return goToAddress(sim, v);
    }
    case "site-go":
      // nobody answers at an address the site no longer uses, or when the site is down
      if (!sim.siteUp || v.address !== ADDRESSES[sim.zone]) return wait(sim, v, "site-go");
      return hop(sim, v, "site-back");
    case "warn-go":
      return hop(sim, v, "warn-back");
    case "site-back":
      return finish(sim, v, "page");
    case "warn-back":
      return finish(sim, v, "blocked-page");
    case "waiting":
      return finish(sim, v, v.waitingOn === "dns-go" ? "dns-timeout" : "site-timeout");
  }
}

function apply(sim: DnsSim, a: DnsAction) {
  if (a.kind === "visit") visit(sim, a.name);
  else if (a.kind === "move") move(sim);
  else if (a.kind === "resolver") sim.resolverUp = a.up;
  else sim.siteUp = a.up;
}

export function advance(sim: DnsSim, dt: number): DnsSim {
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
    for (const v of sim.visits) if (v.doneAt === null) offer(v.stageEnd, () => arrive(sim, v));
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  sim.visits = sim.visits.filter((v) => v.doneAt === null || sim.t - v.doneAt < KEEP_DONE);
  return sim;
}

export const progressOf = (v: Visit, t: number) => Math.max(0, Math.min(1, (t - v.stageAt) / Math.max(EPS, v.stageEnd - v.stageAt)));
export const inFlight = (sim: DnsSim) => sim.visits.filter((v) => v.doneAt === null);

/** What the browser shows, in plain words. */
export const SCREEN_TEXT: Record<Outcome, string> = {
  page: "Halaman terbuka",
  "not-found": "Situs tidak ditemukan",
  "blocked-page": "Halaman peringatan: akses diblokir",
  "dns-timeout": "Tidak bisa terhubung: DNS tidak menjawab",
  "site-timeout": "Waktu habis: server tidak menjawab",
};
/** The same, short enough for a metric card. */
export const SCREEN_SHORT: Record<Outcome, string> = {
  page: "terbuka",
  "not-found": "tidak ditemukan",
  "blocked-page": "diblokir",
  "dns-timeout": "DNS diam",
  "site-timeout": "waktu habis",
};
