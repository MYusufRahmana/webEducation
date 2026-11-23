/**
 * HTTPS lesson simulation: an educational model of what happens on one browser–server connection.
 * This is NOT cryptography. "Encrypted" only marks that the content cannot be read on the way,
 * and "tampered" marks that an integrity check on arrival fails. Pure and deterministic.
 */

export type Side = "browser" | "server";
export type MsgKind = "data" | "certificate" | "setup";
export type Conn = "plain" | "setup" | "secure";

export interface Msg {
  id: number;
  kind: MsgKind;
  from: Side;
  /** What the sender wrote (for data) or what the message is (for setup/certificate). */
  text: string;
  /** Sent over a protected (TLS) connection: unreadable on the way. */
  encrypted: boolean;
  sentAt: number;
  arriveAt: number;
  /** Changed by someone on the path. */
  tampered: boolean;
  result: "pending" | "accepted" | "rejected";
  doneAt: number | null;
}

export interface Certificate {
  domain: string;
  /** Shown by the server (travelling or arrived). */
  sent: boolean;
  arrived: boolean;
  /** Checked by the browser against the address it wanted to reach. */
  checked: boolean;
  valid: boolean;
}

export type HttpsAction =
  | { at: number; kind: "send"; text: string }
  | { at: number; kind: "certificate" }
  | { at: number; kind: "setup"; from: Side; text: string; last?: boolean }
  | { at: number; kind: "tamper" };

export type HttpsLog =
  | { at: number; kind: "sent"; id: number; msg: MsgKind; encrypted: boolean }
  | { at: number; kind: "seen"; id: number; readable: boolean }
  | { at: number; kind: "certificate"; valid: boolean; domain: string }
  | { at: number; kind: "secure" }
  | { at: number; kind: "accepted"; id: number; text: string }
  | { at: number; kind: "rejected"; id: number }
  | { at: number; kind: "tampered"; id: number };

export interface HttpsSim {
  t: number;
  /** Domain the user typed; the certificate must be valid for it. */
  target: string;
  conn: Conn;
  cert: Certificate;
  msgs: Msg[];
  script: HttpsAction[];
  log: HttpsLog[];
  /** What the observer on the path saw last. */
  observed: { text: string; readable: boolean; at: number } | null;
  /** What the server accepted last, or the last rejection. */
  received: { text: string; ok: boolean; at: number } | null;
  sent: number;
  readableOnPath: number;
  rejected: number;
  setupMsgs: number;
  nextId: number;
  /** Seconds one message needs to cross the path (slowed down to be watched). */
  travel: number;
}

const EPS = 1e-9;
const KEEP = 2.4;
export const DOMAIN = "toko-contoh.id";

export function createHttpsSim(options: { conn?: Conn; certChecked?: boolean; script?: HttpsAction[]; travel?: number } = {}): HttpsSim {
  const checked = Boolean(options.certChecked);
  return {
    t: 0,
    target: DOMAIN,
    conn: options.conn ?? "plain",
    cert: { domain: DOMAIN, sent: checked, arrived: checked, checked, valid: checked },
    msgs: [],
    script: [...(options.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    observed: null,
    received: null,
    sent: 0,
    readableOnPath: 0,
    rejected: 0,
    setupMsgs: 0,
    nextId: 1,
    travel: options.travel ?? 2.4,
  };
}

function launch(sim: HttpsSim, kind: MsgKind, from: Side, text: string): Msg {
  const msg: Msg = { id: sim.nextId++, kind, from, text, encrypted: kind === "data" && sim.conn === "secure", sentAt: sim.t, arriveAt: sim.t + sim.travel, tampered: false, result: "pending", doneAt: null };
  sim.msgs.push(msg);
  if (kind === "data") sim.sent += 1;
  if (kind === "setup") sim.setupMsgs += 1;
  sim.log.push({ at: sim.t, kind: "sent", id: msg.id, msg: kind, encrypted: msg.encrypted });
  return msg;
}

/** The browser sends a message to the server over the current connection. */
export const send = (sim: HttpsSim, text: string) => launch(sim, "data", "browser", text);

/** Someone on the path changes the first data message currently travelling. */
export function tamper(sim: HttpsSim) {
  const msg = sim.msgs.find((m) => m.kind === "data" && m.result === "pending" && !m.tampered);
  if (!msg) return false;
  msg.tampered = true;
  sim.log.push({ at: sim.t, kind: "tampered", id: msg.id });
  return true;
}

function apply(sim: HttpsSim, action: HttpsAction) {
  if (action.kind === "send") send(sim, action.text);
  else if (action.kind === "tamper") tamper(sim);
  else if (action.kind === "certificate") {
    sim.cert.sent = true;
    launch(sim, "certificate", "server", `Sertifikat ${sim.cert.domain}`);
  } else {
    if (sim.conn === "plain") sim.conn = "setup";
    const msg = launch(sim, "setup", action.from, action.text);
    if (action.last) (msg as Msg & { last?: boolean }).last = true;
  }
}

function arrive(sim: HttpsSim, msg: Msg) {
  msg.doneAt = sim.t;
  if (msg.kind === "certificate") {
    sim.cert.arrived = true;
    sim.cert.checked = true;
    sim.cert.valid = sim.cert.domain === sim.target;
    msg.result = "accepted";
    sim.log.push({ at: sim.t, kind: "certificate", valid: sim.cert.valid, domain: sim.cert.domain });
    return;
  }
  if (msg.kind === "setup") {
    msg.result = "accepted";
    if ((msg as Msg & { last?: boolean }).last) {
      sim.conn = "secure";
      sim.log.push({ at: sim.t, kind: "secure" });
    }
    return;
  }
  // data: on a protected connection a changed message fails the integrity check
  if (msg.encrypted && msg.tampered) {
    msg.result = "rejected";
    sim.rejected += 1;
    sim.received = { text: "Pemeriksaan gagal — data ditolak", ok: false, at: sim.t };
    sim.log.push({ at: sim.t, kind: "rejected", id: msg.id });
    return;
  }
  msg.result = "accepted";
  const text = msg.tampered ? `${msg.text} (sudah diubah!)` : msg.text;
  sim.received = { text, ok: !msg.tampered, at: sim.t };
  sim.log.push({ at: sim.t, kind: "accepted", id: msg.id, text });
}

/** The observer stands at the middle of the path. */
function pass(sim: HttpsSim, msg: Msg) {
  if (msg.kind !== "data") return;
  const readable = !msg.encrypted;
  if (readable) sim.readableOnPath += 1;
  sim.observed = { text: readable ? msg.text : "▒▒▒▒▒▒", readable, at: sim.t };
  sim.log.push({ at: sim.t, kind: "seen", id: msg.id, readable });
}

export function advance(sim: HttpsSim, dt: number): HttpsSim {
  const until = sim.t + Math.max(0, dt);
  const seen = new Set(sim.log.filter((e) => e.kind === "seen").map((e) => (e as { id: number }).id));
  for (let guard = 0; guard < 10000; guard++) {
    let next: { at: number; run: () => void } | null = null;
    const offer = (at: number, run: () => void) => {
      if (at <= until + EPS && (!next || at < next.at - EPS)) next = { at, run };
    };
    if (sim.script.length) {
      const action = sim.script[0];
      offer(action.at, () => (sim.script.shift(), apply(sim, action)));
    }
    for (const msg of sim.msgs) {
      if (msg.result !== "pending") continue;
      const mid = (msg.sentAt + msg.arriveAt) / 2;
      if (msg.kind === "data" && !seen.has(msg.id)) offer(mid, () => (seen.add(msg.id), pass(sim, msg)));
      offer(msg.arriveAt, () => arrive(sim, msg));
    }
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  sim.msgs = sim.msgs.filter((m) => m.doneAt === null || sim.t - m.doneAt < KEEP);
  return sim;
}

export const progressOf = (msg: Msg, t: number) => Math.max(0, Math.min(1, (t - msg.sentAt) / (msg.arriveAt - msg.sentAt)));
