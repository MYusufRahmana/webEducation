/**
 * Object storage simulation (S3-style, as in MinIO, Cloudflare R2 or Amazon S3): pure, deterministic,
 * event driven.
 *
 * Clients (the application server, or a user's browser holding a temporary link) send requests to
 * the storage service. Objects live in a bucket under a key. Each object is written as 4 shards
 * (2 data + 2 parity, like erasure coding in MinIO) on 4 drives: a write needs 3 drives up, a read
 * needs any 2. With versioning on, writing the same key keeps the old version.
 */

export type DriveId = "D1" | "D2" | "D3" | "D4";
export const DRIVES: readonly DriveId[] = ["D1", "D2", "D3", "D4"];
export const WRITE_QUORUM = 3;
export const READ_QUORUM = 2;

export interface OsParams {
  /** One way between a client and the storage service. */
  hop: number;
  /** Shards travelling between the service and the drives. */
  shard: number;
  /** Looking up the key in the bucket's index. */
  lookup: number;
  /** How long a temporary link stays valid. */
  linkTtl: number;
}

/** Demonstration values, slowed down to be watched. Real requests take milliseconds. */
export const OS_PARAMS: OsParams = { hop: 0.7, shard: 0.6, lookup: 0.25, linkTtl: 6 };

export interface Version {
  v: number;
  sizeMb: number;
  at: number;
  /** Drives that hold one of its shards. */
  drives: DriveId[];
}

export type From = "app" | "browser";
export type OpKind = "put" | "get" | "presign";
export type Phase = "to-api" | "lookup" | "write" | "read" | "to-client" | "done";
export type Status = 200 | 403 | 404 | 503;

export interface Op {
  id: number;
  seq: number;
  kind: OpKind;
  from: From;
  key: string;
  sizeMb: number;
  /** For a browser download: the link it uses. */
  linkId: number | null;
  phase: Phase;
  phaseAt: number;
  phaseEnd: number;
  status: Status | null;
  version: number | null;
  /** Drives the shards travel to or from in the write/read phase. */
  drives: DriveId[];
  doneAt: number | null;
}

export interface Link {
  id: number;
  key: string;
  expiresAt: number;
  /** Handed to the browser. */
  givenAt: number | null;
}

export type OsAction =
  | { at: number; kind: "put"; key: string; sizeMb: number }
  | { at: number; kind: "get"; key: string }
  | { at: number; kind: "presign"; key: string }
  | { at: number; kind: "download" }
  | { at: number; kind: "drive"; drive: DriveId; up: boolean };

export type OsLog =
  | { at: number; kind: "request"; seq: number; op: OpKind; from: From; key: string }
  | { at: number; kind: "stored"; seq: number; key: string; version: number; drives: number }
  | { at: number; kind: "served"; seq: number; key: string; status: Status; from: From; version: number | null }
  | { at: number; kind: "link"; seq: number; key: string; expiresAt: number }
  | { at: number; kind: "drive"; drive: DriveId; up: boolean };

export interface OsSim {
  t: number;
  params: OsParams;
  bucket: string;
  objects: Record<string, Version[]>;
  drives: Record<DriveId, boolean>;
  ops: Op[];
  links: Link[];
  script: OsAction[];
  log: OsLog[];
  nextId: number;
  nextSeq: number;
  requests: number;
  failed: number;
  lastStatus: Status | null;
}

const EPS = 1e-9;
const KEEP_DONE = 2.2;
const KEEP_LOG = 120;

export function createOsSim(options: { params?: Partial<OsParams>; script?: OsAction[]; seed?: Record<string, number> } = {}): OsSim {
  const sim: OsSim = {
    t: 0,
    params: { ...OS_PARAMS, ...options.params },
    bucket: "foto-toko",
    objects: {},
    drives: { D1: true, D2: true, D3: true, D4: true },
    ops: [],
    links: [],
    script: [...(options.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    nextId: 1,
    nextSeq: 1,
    requests: 0,
    failed: 0,
    lastStatus: null,
  };
  // objects already in the bucket when the step starts
  for (const [key, sizeMb] of Object.entries(options.seed ?? {})) sim.objects[key] = [{ v: 1, sizeMb, at: 0, drives: [...DRIVES] }];
  return sim;
}

const push = (sim: OsSim, entry: OsLog) => {
  sim.log.push(entry);
  if (sim.log.length > KEEP_LOG) sim.log.splice(0, sim.log.length - KEEP_LOG);
};
const upDrives = (sim: OsSim) => DRIVES.filter((id) => sim.drives[id]);
export const latest = (sim: OsSim, key: string) => sim.objects[key]?.[sim.objects[key].length - 1] ?? null;

function start(sim: OsSim, kind: OpKind, from: From, key: string, sizeMb = 0, linkId: number | null = null) {
  const op: Op = { id: sim.nextId++, seq: sim.nextSeq++, kind, from, key, sizeMb, linkId, phase: "to-api", phaseAt: sim.t, phaseEnd: sim.t + sim.params.hop, status: null, version: null, drives: [], doneAt: null };
  sim.ops.push(op);
  sim.requests += 1;
  push(sim, { at: sim.t, kind: "request", seq: op.seq, op: kind, from, key });
  return op;
}

/** The application stores a file under a key. */
export const put = (sim: OsSim, key: string, sizeMb: number) => start(sim, "put", "app", key, sizeMb);
/** The application reads a file back. */
export const get = (sim: OsSim, key: string) => start(sim, "get", "app", key);
/** The application asks the service for a temporary download link. */
export const presign = (sim: OsSim, key: string) => start(sim, "presign", "app", key);
/** The browser downloads straight from storage with the newest link it was given. */
export function download(sim: OsSim) {
  const link = [...sim.links].reverse().find((entry) => entry.givenAt !== null);
  if (!link) return null;
  return start(sim, "get", "browser", link.key, 0, link.id);
}
export function setDrive(sim: OsSim, drive: DriveId, up: boolean) {
  if (sim.drives[drive] === up) return;
  sim.drives[drive] = up;
  push(sim, { at: sim.t, kind: "drive", drive, up });
}

function enter(sim: OsSim, op: Op, phase: Phase, duration: number) {
  op.phase = phase;
  op.phaseAt = sim.t;
  op.phaseEnd = sim.t + duration;
}
function respond(sim: OsSim, op: Op, status: Status) {
  op.status = status;
  enter(sim, op, "to-client", sim.params.hop);
}

function step(sim: OsSim, op: Op) {
  const { shard, lookup } = sim.params;
  switch (op.phase) {
    case "to-api":
      if (op.kind === "put") {
        const up = upDrives(sim);
        if (up.length < WRITE_QUORUM) return respond(sim, op, 503);
        op.drives = up;
        enter(sim, op, "write", shard);
      } else enter(sim, op, "lookup", lookup);
      break;
    case "lookup": {
      if (op.from === "browser") {
        const link = sim.links.find((entry) => entry.id === op.linkId);
        if (!link || link.expiresAt <= sim.t + EPS) return respond(sim, op, 403);
      }
      const version = latest(sim, op.key);
      if (!version) return respond(sim, op, 404);
      if (op.kind === "presign") {
        const link: Link = { id: sim.nextId++, key: op.key, expiresAt: sim.t + sim.params.linkTtl, givenAt: null };
        sim.links.push(link);
        op.linkId = link.id;
        push(sim, { at: sim.t, kind: "link", seq: op.seq, key: op.key, expiresAt: link.expiresAt });
        return respond(sim, op, 200);
      }
      const holding = version.drives.filter((id) => sim.drives[id]);
      if (holding.length < READ_QUORUM) return respond(sim, op, 503);
      op.version = version.v;
      op.sizeMb = version.sizeMb;
      // only the shards needed to rebuild the file travel back
      op.drives = holding.slice(0, READ_QUORUM);
      enter(sim, op, "read", shard);
      break;
    }
    case "write": {
      const versions = (sim.objects[op.key] ??= []);
      const v = versions.length + 1;
      versions.push({ v, sizeMb: op.sizeMb, at: sim.t, drives: [...op.drives] });
      op.version = v;
      push(sim, { at: sim.t, kind: "stored", seq: op.seq, key: op.key, version: v, drives: op.drives.length });
      respond(sim, op, 200);
      break;
    }
    case "read":
      respond(sim, op, 200);
      break;
    case "to-client": {
      op.phase = "done";
      op.doneAt = sim.t;
      op.phaseEnd = Infinity;
      sim.lastStatus = op.status;
      if (op.status !== 200) sim.failed += 1;
      if (op.kind === "presign" && op.linkId !== null) {
        const link = sim.links.find((entry) => entry.id === op.linkId);
        if (link) link.givenAt = sim.t;
        push(sim, { at: sim.t, kind: "served", seq: op.seq, key: op.key, status: op.status!, from: op.from, version: null });
      } else push(sim, { at: sim.t, kind: "served", seq: op.seq, key: op.key, status: op.status!, from: op.from, version: op.version });
      break;
    }
    case "done":
      break;
  }
}

function apply(sim: OsSim, action: OsAction) {
  if (action.kind === "put") put(sim, action.key, action.sizeMb);
  else if (action.kind === "get") get(sim, action.key);
  else if (action.kind === "presign") presign(sim, action.key);
  else if (action.kind === "download") download(sim);
  else setDrive(sim, action.drive, action.up);
}

export function advance(sim: OsSim, dt: number): OsSim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 100000; guard++) {
    let best: { at: number; run: () => void } | null = null;
    if (sim.script.length && sim.script[0].at <= until + EPS) {
      const action = sim.script[0];
      best = { at: action.at, run: () => (sim.script.shift(), apply(sim, action)) };
    }
    for (const op of sim.ops) {
      if (op.phase === "done" || op.phaseEnd > until + EPS) continue;
      if (!best || op.phaseEnd < best.at - EPS) best = { at: op.phaseEnd, run: () => step(sim, op) };
    }
    if (!best) break;
    sim.t = Math.max(sim.t, best.at);
    best.run();
  }
  sim.t = until;
  sim.ops = sim.ops.filter((op) => op.doneAt === null || sim.t - op.doneAt < KEEP_DONE);
  return sim;
}

/* ------------------------------------------------------------------ readings */
export const totalMb = (sim: OsSim) => Object.values(sim.objects).reduce((sum, versions) => sum + versions.reduce((s, v) => s + v.sizeMb, 0), 0);
export const keys = (sim: OsSim) => Object.keys(sim.objects);
export const activeLink = (sim: OsSim) => [...sim.links].reverse().find((link) => link.givenAt !== null) ?? null;
export const STATUS_TEXT: Record<Status, string> = { 200: "200 OK", 403: "403 ditolak", 404: "404 tidak ada", 503: "503 tidak tersedia" };
