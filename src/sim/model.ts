/**
 * Load balancer simulation: pure, deterministic, event driven.
 *
 * Every number on the page (counters, rates, server status, the tokens drawn
 * in the figure and the narration) is read from one `Sim` object advanced by
 * `advance()`. Events are processed in time order, so the result does not
 * depend on the frame rate: advancing 10 s in one call or in 600 small calls
 * gives the same state.
 *
 * Two different facts are kept per server:
 *  - `up`      the physical state of the server (is the process running?)
 *  - `healthy` what the load balancer believes, changed only by health checks.
 */

export type ServerId = "A" | "B" | "C";
export const SERVERS: readonly ServerId[] = ["A", "B", "C"];

export interface Params {
  /** Seconds between two new requests from the client. */
  requestInterval: number;
  /** Travel time of a request from the client to the load balancer. */
  toLb: number;
  /** Travel time of a request from the load balancer to a server. */
  toServer: number;
  /** Seconds between two health-check rounds. */
  hcInterval: number;
  /** One-way travel time of a health probe. */
  probeTravel: number;
  /** A probe without a reply is declared failed this long after it was sent. */
  hcTimeout: number;
  /** Consecutive failed checks before a healthy server is marked unhealthy. */
  failThreshold: number;
  /** Consecutive passed checks before an unhealthy server is marked healthy. */
  passThreshold: number;
  /** Window (seconds) for the measured request rate. */
  rateWindow: number;
}

/** Demonstration values. They are chosen to be easy to watch, not production defaults. */
export const DEMO_PARAMS: Params = {
  requestInterval: 1,
  toLb: 1.0,
  toServer: 1.4,
  hcInterval: 3,
  probeTravel: 0.5,
  hcTimeout: 1.0,
  failThreshold: 2,
  passThreshold: 2,
  rateWindow: 10,
};

export const RATE_OPTIONS = [
  { key: "slow", interval: 2 },
  { key: "normal", interval: 1 },
  { key: "fast", interval: 0.5 },
] as const;
export type RateKey = (typeof RATE_OPTIONS)[number]["key"];

export interface ServerState {
  up: boolean;
  healthy: boolean;
  /** Consecutive check results pointing toward a status change (fails while healthy, passes while unhealthy). */
  streak: number;
  lastProbe: "ok" | "fail" | null;
  /** Requests the load balancer forwarded to this server (cumulative). */
  sent: number;
  ok: number;
  failed: number;
  /** Times of forwarding, for the measured rate. Trimmed to the rate window. */
  sentTimes: number[];
}

export type Outcome = "pending" | "ok" | "fail" | "rejected";

export interface Request {
  id: number;
  createdAt: number;
  decideAt: number;
  decided: boolean;
  target: ServerId | null;
  arriveAt: number | null;
  outcome: Outcome;
  resolvedAt: number | null;
}

export interface Probe {
  id: number;
  round: number;
  server: ServerId;
  sentAt: number;
  reachAt: number;
  resolveAt: number;
  /** Physical state of the server when the probe reached it (null before that). */
  serverUp: boolean | null;
  result: "pending" | "ok" | "fail";
  manual: boolean;
}

export type ScriptAction = { at: number; kind: "power"; server: ServerId; up: boolean };

export type LogEntry =
  | { at: number; kind: "power"; server: ServerId; up: boolean }
  | { at: number; kind: "decide"; id: number; server: ServerId; skipped: ServerId[] }
  | { at: number; kind: "reject"; id: number }
  | { at: number; kind: "arrive"; id: number; server: ServerId; ok: boolean }
  | { at: number; kind: "round"; round: number; manual: boolean }
  | { at: number; kind: "probe"; server: ServerId; ok: boolean; streak: number }
  | { at: number; kind: "health"; server: ServerId; healthy: boolean };

export interface Sim {
  t: number;
  params: Params;
  servers: Record<ServerId, ServerState>;
  /** Round-robin pointer: index in SERVERS where the next search starts. */
  rr: number;
  nextId: number;
  nextRequestAt: number;
  lastCreatedAt: number | null;
  nextRoundAt: number;
  round: number;
  requests: Request[];
  probes: Probe[];
  script: ScriptAction[];
  log: LogEntry[];
  created: number;
  rejected: number;
}

const EPS = 1e-9;
const KEEP_RESOLVED = 4.2; // seconds a finished request stays visible (fail tokens wait at the shutter)
const KEEP_LOG = 80;

export function createSim(options: { params?: Partial<Params>; firstRequestAt?: number; firstRoundAt?: number; script?: ScriptAction[] } = {}): Sim {
  const params = { ...DEMO_PARAMS, ...options.params };
  const server = (): ServerState => ({ up: true, healthy: true, streak: 0, lastProbe: null, sent: 0, ok: 0, failed: 0, sentTimes: [] });
  return {
    t: 0,
    params,
    servers: { A: server(), B: server(), C: server() },
    rr: 0,
    nextId: 1,
    nextRequestAt: options.firstRequestAt ?? 0.2,
    lastCreatedAt: null,
    nextRoundAt: options.firstRoundAt ?? 0.6,
    round: 0,
    requests: [],
    probes: [],
    script: [...(options.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    created: 0,
    rejected: 0,
  };
}

export const cloneSim = (sim: Sim): Sim => structuredClone(sim);

/* ------------------------------------------------------------------ events */

type Pending =
  | { at: number; rank: 0; kind: "script"; action: ScriptAction }
  | { at: number; rank: 1; kind: "reach"; probe: Probe }
  | { at: number; rank: 2; kind: "resolve"; probe: Probe }
  | { at: number; rank: 3; kind: "arrive"; request: Request }
  | { at: number; rank: 4; kind: "decide"; request: Request }
  | { at: number; rank: 5; kind: "round" }
  | { at: number; rank: 6; kind: "create" };

function nextEvent(sim: Sim, until: number): Pending | null {
  let best: Pending | null = null;
  const offer = (candidate: Pending) => {
    if (candidate.at > until + EPS) return;
    if (!best || candidate.at < best.at - EPS || (Math.abs(candidate.at - best.at) <= EPS && candidate.rank < best.rank)) best = candidate;
  };
  if (sim.script.length) offer({ at: sim.script[0].at, rank: 0, kind: "script", action: sim.script[0] });
  for (const probe of sim.probes) {
    if (probe.serverUp === null) offer({ at: probe.reachAt, rank: 1, kind: "reach", probe });
    else if (probe.result === "pending") offer({ at: probe.resolveAt, rank: 2, kind: "resolve", probe });
  }
  for (const request of sim.requests) {
    if (!request.decided) offer({ at: request.decideAt, rank: 4, kind: "decide", request });
    else if (request.outcome === "pending" && request.arriveAt !== null) offer({ at: request.arriveAt, rank: 3, kind: "arrive", request });
  }
  offer({ at: sim.nextRoundAt, rank: 5, kind: "round" });
  offer({ at: sim.nextRequestAt, rank: 6, kind: "create" });
  return best;
}

const push = (sim: Sim, entry: LogEntry) => {
  sim.log.push(entry);
  if (sim.log.length > KEEP_LOG) sim.log.splice(0, sim.log.length - KEEP_LOG);
};

/** Round robin over the servers the load balancer believes are healthy. */
export function pickServer(sim: Sim): { server: ServerId | null; skipped: ServerId[] } {
  const skipped: ServerId[] = [];
  for (let step = 0; step < SERVERS.length; step++) {
    const index = (sim.rr + step) % SERVERS.length;
    const id = SERVERS[index];
    if (sim.servers[id].healthy) {
      sim.rr = (index + 1) % SERVERS.length;
      return { server: id, skipped };
    }
    skipped.push(id);
  }
  return { server: null, skipped };
}

function startRound(sim: Sim, manual: boolean) {
  sim.round += 1;
  const { probeTravel, hcTimeout } = sim.params;
  for (const id of SERVERS) {
    sim.probes.push({
      id: sim.nextId++,
      round: sim.round,
      server: id,
      sentAt: sim.t,
      reachAt: sim.t + probeTravel,
      resolveAt: sim.t + Math.max(hcTimeout, probeTravel * 2),
      serverUp: null,
      result: "pending",
      manual,
    });
  }
  push(sim, { at: sim.t, kind: "round", round: sim.round, manual });
}

function handle(sim: Sim, event: Pending) {
  const { params } = sim;
  switch (event.kind) {
    case "script": {
      sim.script.shift();
      setPower(sim, event.action.server, event.action.up);
      break;
    }
    case "reach": {
      event.probe.serverUp = sim.servers[event.probe.server].up;
      break;
    }
    case "resolve": {
      const probe = event.probe;
      // The reply only comes back if the server was running when the probe reached it.
      probe.result = probe.serverUp ? "ok" : "fail";
      const server = sim.servers[probe.server];
      server.lastProbe = probe.result;
      const ok = probe.result === "ok";
      if (server.healthy) {
        server.streak = ok ? 0 : server.streak + 1;
        if (server.streak >= params.failThreshold) {
          server.healthy = false;
          server.streak = 0;
          push(sim, { at: sim.t, kind: "probe", server: probe.server, ok, streak: params.failThreshold });
          push(sim, { at: sim.t, kind: "health", server: probe.server, healthy: false });
          break;
        }
      } else {
        server.streak = ok ? server.streak + 1 : 0;
        if (server.streak >= params.passThreshold) {
          server.healthy = true;
          server.streak = 0;
          push(sim, { at: sim.t, kind: "probe", server: probe.server, ok, streak: params.passThreshold });
          push(sim, { at: sim.t, kind: "health", server: probe.server, healthy: true });
          break;
        }
      }
      push(sim, { at: sim.t, kind: "probe", server: probe.server, ok, streak: server.streak });
      break;
    }
    case "arrive": {
      const request = event.request;
      const server = sim.servers[request.target!];
      // A request that reaches a stopped server fails. It is not retried or moved elsewhere.
      const ok = server.up;
      request.outcome = ok ? "ok" : "fail";
      request.resolvedAt = sim.t;
      if (ok) server.ok += 1;
      else server.failed += 1;
      push(sim, { at: sim.t, kind: "arrive", id: request.id, server: request.target!, ok });
      break;
    }
    case "decide": {
      const request = event.request;
      request.decided = true;
      const { server, skipped } = pickServer(sim);
      if (!server) {
        request.outcome = "rejected";
        request.resolvedAt = sim.t;
        sim.rejected += 1;
        push(sim, { at: sim.t, kind: "reject", id: request.id });
        break;
      }
      request.target = server;
      request.arriveAt = sim.t + params.toServer;
      const state = sim.servers[server];
      state.sent += 1;
      state.sentTimes.push(sim.t);
      push(sim, { at: sim.t, kind: "decide", id: request.id, server, skipped });
      break;
    }
    case "round": {
      startRound(sim, false);
      sim.nextRoundAt = sim.t + params.hcInterval;
      break;
    }
    case "create": {
      sim.requests.push({
        id: sim.nextId++,
        createdAt: sim.t,
        decideAt: sim.t + params.toLb,
        decided: false,
        target: null,
        arriveAt: null,
        outcome: "pending",
        resolvedAt: null,
      });
      sim.created += 1;
      sim.lastCreatedAt = sim.t;
      sim.nextRequestAt = sim.t + params.requestInterval;
      break;
    }
  }
}

function prune(sim: Sim) {
  const { t } = sim;
  sim.requests = sim.requests.filter((request) => request.resolvedAt === null || t - request.resolvedAt < KEEP_RESOLVED);
  sim.probes = sim.probes.filter((probe) => probe.result === "pending" || t - probe.resolveAt < 1.2);
  for (const id of SERVERS) {
    const times = sim.servers[id].sentTimes;
    while (times.length && times[0] <= t - sim.params.rateWindow - EPS) times.shift();
  }
}

/** Advance simulated time by `dt` seconds, processing every event on the way in order. */
export function advance(sim: Sim, dt: number): Sim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 100000; guard++) {
    const event = nextEvent(sim, until);
    if (!event) break;
    sim.t = Math.max(sim.t, event.at);
    handle(sim, event);
  }
  sim.t = until;
  prune(sim);
  return sim;
}

/* ------------------------------------------------------------- actions */

export function setPower(sim: Sim, server: ServerId, up: boolean) {
  if (sim.servers[server].up === up) return;
  sim.servers[server].up = up;
  push(sim, { at: sim.t, kind: "power", server, up });
}

export const probesInFlight = (sim: Sim) => sim.probes.some((probe) => probe.result === "pending");

/** Run a health-check round now. Returns false when a round is still in flight. */
export function checkNow(sim: Sim): boolean {
  if (probesInFlight(sim)) return false;
  startRound(sim, true);
  sim.nextRoundAt = sim.t + sim.params.hcInterval;
  return true;
}

export function setRequestInterval(sim: Sim, interval: number) {
  sim.params = { ...sim.params, requestInterval: interval };
  const from = sim.lastCreatedAt ?? sim.t;
  sim.nextRequestAt = Math.max(sim.t, from + interval);
}

export const rateKeyOf = (sim: Sim): RateKey => RATE_OPTIONS.find((option) => Math.abs(option.interval - sim.params.requestInterval) < EPS)?.key ?? "normal";

/* ------------------------------------------------------------- readings */

/** Measured forwarding rate (requests per second) over the rate window, or null while too little time has passed. */
export function measuredRate(sim: Sim, server: ServerId): number | null {
  const window = Math.min(sim.params.rateWindow, sim.t);
  if (window < 3) return null;
  const count = sim.servers[server].sentTimes.filter((at) => at > sim.t - window + EPS).length;
  return count / window;
}

/** Last forwarding decisions, oldest first, with their outcome so far. */
export function recentDecisions(sim: Sim, count = 9) {
  const decided = sim.log.filter((entry): entry is Extract<LogEntry, { kind: "decide" }> => entry.kind === "decide").slice(-count);
  return decided.map((entry) => {
    const arrival = sim.log.find((other) => other.kind === "arrive" && other.id === entry.id) as Extract<LogEntry, { kind: "arrive" }> | undefined;
    return { id: entry.id, server: entry.server, skipped: entry.skipped, outcome: arrival ? (arrival.ok ? "ok" : "fail") : "pending" } as const;
  });
}

export const totals = (sim: Sim) => {
  const sent = SERVERS.reduce((sum, id) => sum + sim.servers[id].sent, 0);
  const ok = SERVERS.reduce((sum, id) => sum + sim.servers[id].ok, 0);
  const failed = SERVERS.reduce((sum, id) => sum + sim.servers[id].failed, 0);
  return { created: sim.created, sent, ok, failed, rejected: sim.rejected };
};
