/**
 * Rate limiting simulation: two accounts (Andi, Budi) press “Cek kursi”. Each press is one request.
 *
 *   browser → (rate limiter) → application server → database → back to the browser
 *
 * The limiter uses one mechanism only: a FIXED WINDOW of `period` seconds. Every account has its own
 * counter; a request is forwarded while the counter is below `limit`, otherwise it is answered at once
 * with 429 and never reaches the server (and is not queued). All counters reset at the start of the
 * next window. The server has one worker: requests it receives wait in line. Pure and deterministic.
 */

export type Account = "Andi" | "Budi";
export const ACCOUNTS: Account[] = ["Andi", "Budi"];

/** Lanes: per account to and from the limiter; shared to/from the server and the database. */
export type Leg = "to-gate" | "gate-back" | "to-server" | "server-back" | "to-db" | "db-back";
export type Stage = Leg | "queued" | "done";

export interface Req {
  id: number;
  who: Account;
  /** Number of this account's press, 1-based (for labels). */
  seq: number;
  stage: Stage;
  stageAt: number;
  stageEnd: number;
  result: "forwarded" | "limited" | "served" | null;
  /** Seconds to wait, given with a 429. */
  retryIn: number | null;
  queuedAt: number | null;
  doneAt: number | null;
}

export type RateAction = { at: number; kind: "check"; who: Account };

export type RateLog =
  | { at: number; kind: "sent"; id: number; who: Account }
  | { at: number; kind: "forwarded"; id: number; who: Account; count: number }
  | { at: number; kind: "limited"; id: number; who: Account; retryIn: number }
  | { at: number; kind: "served"; id: number; who: Account }
  | { at: number; kind: "reset"; windowStart: number };

export interface RateSim {
  t: number;
  /** false in the first scenes: there is no limiter yet, every request goes to the server. */
  limiterOn: boolean;
  limit: number;
  period: number;
  windowStart: number;
  counts: Record<Account, number>;
  reqs: Req[];
  /** The server's line (request ids), first is being served. */
  line: number[];
  busyUntil: number | null;
  script: RateAction[];
  log: RateLog[];
  forwarded: number;
  limited: number;
  served: number;
  /** Most requests ever waiting at the server at once (step 2). */
  maxLine: number;
  nextId: number;
  pressed: Record<Account, number>;
  hop: { user: number; server: number; db: number };
  /** The last answer each browser shows. */
  screen: Record<Account, { text: string; ok: boolean; at: number } | null>;
}

const EPS = 1e-9;
const KEEP = 2;

export interface RateSeed {
  limiterOn?: boolean;
  t?: number;
  counts?: Partial<Record<Account, number>>;
  script?: RateAction[];
}

export function createRateSim(seed: RateSeed = {}): RateSim {
  const t = seed.t ?? 0;
  const period = 10;
  return {
    t,
    limiterOn: seed.limiterOn ?? true,
    limit: 5,
    period,
    windowStart: Math.floor(t / period) * period,
    counts: { Andi: 0, Budi: 0, ...seed.counts },
    reqs: [],
    line: [],
    busyUntil: null,
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    forwarded: 0,
    limited: 0,
    served: 0,
    maxLine: 0,
    nextId: 1,
    pressed: { Andi: 0, Budi: 0 },
    hop: { user: 1.0, server: 0.8, db: 0.45 },
    screen: { Andi: null, Budi: null },
  };
}

const dur = (sim: RateSim, leg: Leg) => (leg === "to-gate" || leg === "gate-back" ? sim.hop.user : leg === "to-server" || leg === "server-back" ? sim.hop.server : sim.hop.db);
function go(sim: RateSim, r: Req, leg: Leg) {
  r.stage = leg;
  r.stageAt = sim.t;
  r.stageEnd = sim.t + dur(sim, leg);
}

/** One press of “Cek kursi”: one request from the browser to the server. */
export function check(sim: RateSim, who: Account) {
  sim.pressed[who] += 1;
  const r: Req = { id: sim.nextId++, who, seq: sim.pressed[who], stage: "to-gate", stageAt: sim.t, stageEnd: sim.t, result: null, retryIn: null, queuedAt: null, doneAt: null };
  go(sim, r, "to-gate");
  sim.reqs.push(r);
  sim.log.push({ at: sim.t, kind: "sent", id: r.id, who });
  return r;
}

/** Seconds until the next window starts. */
export const secondsLeft = (sim: RateSim) => Math.max(0, sim.windowStart + sim.period - sim.t);

function startNext(sim: RateSim) {
  const id = sim.line[0];
  if (id === undefined || sim.busyUntil !== null) return;
  const r = sim.reqs.find((x) => x.id === id)!;
  sim.busyUntil = sim.t + 2 * sim.hop.db;
  go(sim, r, "to-db");
}

function arrive(sim: RateSim, r: Req) {
  switch (r.stage) {
    case "to-gate": {
      if (sim.limiterOn && sim.counts[r.who] >= sim.limit) {
        r.result = "limited";
        r.retryIn = Math.ceil(secondsLeft(sim) - EPS);
        sim.limited += 1;
        sim.log.push({ at: sim.t, kind: "limited", id: r.id, who: r.who, retryIn: r.retryIn });
        return go(sim, r, "gate-back");
      }
      if (sim.limiterOn) sim.counts[r.who] += 1;
      r.result = "forwarded";
      sim.forwarded += 1;
      sim.log.push({ at: sim.t, kind: "forwarded", id: r.id, who: r.who, count: sim.counts[r.who] });
      return go(sim, r, "to-server");
    }
    case "to-server":
      r.stage = "queued";
      r.queuedAt = sim.t;
      r.stageAt = sim.t;
      r.stageEnd = Infinity;
      sim.line.push(r.id);
      sim.maxLine = Math.max(sim.maxLine, sim.line.length);
      return startNext(sim);
    case "to-db":
      return go(sim, r, "db-back");
    case "db-back":
      sim.line.shift();
      sim.busyUntil = null;
      go(sim, r, "server-back");
      return startNext(sim);
    case "server-back":
      return go(sim, r, "gate-back");
    case "gate-back":
      r.doneAt = sim.t;
      r.stage = "done";
      if (r.result === "limited") sim.screen[r.who] = { text: `Terlalu banyak permintaan. Coba lagi dalam ${r.retryIn} detik.`, ok: false, at: sim.t };
      else {
        r.result = "served";
        sim.served += 1;
        sim.screen[r.who] = { text: "Kursi tersedia: B12, B14, C3", ok: true, at: sim.t };
        sim.log.push({ at: sim.t, kind: "served", id: r.id, who: r.who });
      }
  }
}

export function advance(sim: RateSim, dt: number): RateSim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 20000; guard++) {
    let next: { at: number; run: () => void } | null = null;
    const offer = (at: number, run: () => void) => {
      if (at <= until + EPS && (!next || at < next.at - EPS)) next = { at, run };
    };
    // the window boundary comes first when it coincides with an arrival
    const boundary = sim.windowStart + sim.period;
    offer(boundary - EPS / 2, () => {
      sim.windowStart = boundary;
      sim.counts = { Andi: 0, Budi: 0 };
      sim.log.push({ at: boundary, kind: "reset", windowStart: boundary });
    });
    if (sim.script.length) {
      const action = sim.script[0];
      offer(action.at, () => (sim.script.shift(), check(sim, action.who)));
    }
    for (const r of sim.reqs) if (r.doneAt === null && Number.isFinite(r.stageEnd)) offer(r.stageEnd, () => arrive(sim, r));
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  sim.reqs = sim.reqs.filter((r) => r.doneAt === null || sim.t - r.doneAt < KEEP);
  return sim;
}

export const progressOf = (r: Req, t: number) => (Number.isFinite(r.stageEnd) ? Math.max(0, Math.min(1, (t - r.stageAt) / Math.max(EPS, r.stageEnd - r.stageAt))) : 1);
