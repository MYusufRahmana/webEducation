/**
 * HTTPS lesson simulation: a ticket website, a browser, the network path between them and an observer
 * on that path. This is NOT cryptography. "Encrypted" only marks that the content cannot be read on the
 * way; "tampered" marks that an integrity check on arrival fails. Pure and deterministic.
 *
 * The site starts on plain HTTP. Its owner installs a certificate and turns on HTTPS (TLS) on the server
 * side; the browser then checks the certificate against the domain it wanted to reach, prepares the
 * protected connection (handshake), and only then sends the order form.
 */

export type Side = "browser" | "server" | "owner";
export type MsgKind = "page" | "data" | "reply" | "certificate" | "setup" | "install";
/** plain: HTTP · setup: handshake running · secure: HTTPS ready · untrusted: certificate check failed */
export type Conn = "plain" | "setup" | "secure" | "untrusted";

export const DOMAIN = "tiket.example";
/** Sample data only: never real personal data, never a password. */
export const SAMPLE_FORM = "Nama: Rina Contoh · email: rina@contoh.test";

export interface Msg {
  id: number;
  kind: MsgKind;
  from: Side;
  text: string;
  /** Sent over a protected (TLS) connection: unreadable on the way. */
  encrypted: boolean;
  sentAt: number;
  arriveAt: number;
  tampered: boolean;
  result: "pending" | "accepted" | "rejected";
  doneAt: number | null;
  last?: boolean;
}

export type HttpsAction =
  | { at: number; kind: "page" }
  | { at: number; kind: "send"; text: string }
  | { at: number; kind: "reply"; text: string }
  | { at: number; kind: "install" }
  | { at: number; kind: "certificate" }
  | { at: number; kind: "setup"; from: "browser" | "server"; text: string; last?: boolean }
  | { at: number; kind: "tamper" }
  | { at: number; kind: "back" };

export type HttpsLog =
  | { at: number; kind: "sent"; id: number; msg: MsgKind; encrypted: boolean }
  | { at: number; kind: "seen"; id: number; readable: boolean }
  | { at: number; kind: "installed" }
  | { at: number; kind: "certificate"; valid: boolean; domain: string }
  | { at: number; kind: "secure" }
  | { at: number; kind: "warning" }
  | { at: number; kind: "back" }
  | { at: number; kind: "accepted"; id: number; text: string; by: Side }
  | { at: number; kind: "rejected"; id: number }
  | { at: number; kind: "tampered"; id: number };

export interface HttpsSim {
  t: number;
  /** The domain the user typed; the certificate must be valid for it. */
  target: string;
  /** The domain the presented certificate is for. */
  certDomain: string;
  /** The owner turned HTTPS on at the server (certificate installed, TLS configured). */
  https: boolean;
  conn: Conn;
  check: "none" | "checking" | "ok" | "fail";
  /** The browser shows its full-page warning; the user has not gone back yet. */
  warning: boolean;
  msgs: Msg[];
  script: HttpsAction[];
  log: HttpsLog[];
  observed: { text: string; readable: boolean; at: number } | null;
  /** What the server accepted last, or the last rejection. */
  received: { text: string; ok: boolean; at: number } | null;
  /** What the browser shows from the server last (page, reply). */
  shown: { text: string; at: number } | null;
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

export function createHttpsSim(options: { https?: boolean; conn?: Conn; checked?: boolean; certDomain?: string; script?: HttpsAction[]; travel?: number } = {}): HttpsSim {
  const https = options.https ?? options.conn === "secure";
  return {
    t: 0,
    target: DOMAIN,
    certDomain: options.certDomain ?? DOMAIN,
    https,
    conn: options.conn ?? "plain",
    check: options.checked ? "ok" : "none",
    warning: false,
    msgs: [],
    script: [...(options.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    observed: null,
    received: null,
    shown: null,
    sent: 0,
    readableOnPath: 0,
    rejected: 0,
    setupMsgs: 0,
    nextId: 1,
    travel: options.travel ?? 2.4,
  };
}

function launch(sim: HttpsSim, kind: MsgKind, from: Side, text: string, travel = sim.travel): Msg {
  const carriesContent = kind === "data" || kind === "page" || kind === "reply";
  const msg: Msg = { id: sim.nextId++, kind, from, text, encrypted: carriesContent && sim.conn === "secure", sentAt: sim.t, arriveAt: sim.t + travel, tampered: false, result: "pending", doneAt: null };
  sim.msgs.push(msg);
  if (kind === "data") sim.sent += 1;
  if (kind === "setup") sim.setupMsgs += 1;
  sim.log.push({ at: sim.t, kind: "sent", id: msg.id, msg: kind, encrypted: msg.encrypted });
  return msg;
}

/** The browser sends form data to the server over the current connection. */
export const send = (sim: HttpsSim, text = SAMPLE_FORM) => launch(sim, "data", "browser", text);

/** Someone on the path changes the first content message currently travelling. */
export function tamper(sim: HttpsSim) {
  const msg = sim.msgs.find((m) => (m.kind === "data" || m.kind === "reply" || m.kind === "page") && m.result === "pending" && !m.tampered);
  if (!msg) return false;
  msg.tampered = true;
  sim.log.push({ at: sim.t, kind: "tampered", id: msg.id });
  return true;
}

/** The user leaves the warning page and goes back to safety, instead of continuing. */
export function goBack(sim: HttpsSim) {
  if (!sim.warning) return false;
  sim.warning = false;
  sim.conn = "plain";
  sim.log.push({ at: sim.t, kind: "back" });
  return true;
}

/** Starts the HTTPS visit: the server presents its certificate. */
export function presentCertificate(sim: HttpsSim) {
  if (!sim.https) return null;
  sim.check = "checking";
  return launch(sim, "certificate", "server", `Sertifikat ${sim.certDomain}`);
}

function apply(sim: HttpsSim, action: HttpsAction) {
  switch (action.kind) {
    case "page":
      return void launch(sim, "page", "server", "Halaman pemesanan tiket");
    case "send":
      return void send(sim, action.text);
    case "reply":
      return void launch(sim, "reply", "server", action.text);
    case "install":
      return void launch(sim, "install", "owner", "Pasang sertifikat · aktifkan HTTPS", sim.travel * 0.8);
    case "certificate":
      return void presentCertificate(sim);
    case "tamper":
      return void tamper(sim);
    case "back":
      return void goBack(sim);
    case "setup": {
      if (sim.conn === "plain") sim.conn = "setup";
      const msg = launch(sim, "setup", action.from, action.text, sim.travel * 0.55);
      if (action.last) msg.last = true;
    }
  }
}

function arrive(sim: HttpsSim, msg: Msg) {
  msg.doneAt = sim.t;
  msg.result = "accepted";
  if (msg.kind === "install") {
    sim.https = true;
    sim.log.push({ at: sim.t, kind: "installed" });
    return;
  }
  if (msg.kind === "certificate") {
    const valid = sim.certDomain === sim.target;
    sim.check = valid ? "ok" : "fail";
    sim.log.push({ at: sim.t, kind: "certificate", valid, domain: sim.certDomain });
    if (!valid) {
      sim.conn = "untrusted";
      sim.warning = true;
      sim.log.push({ at: sim.t, kind: "warning" });
    }
    return;
  }
  if (msg.kind === "setup") {
    if (msg.last && sim.check === "ok") {
      sim.conn = "secure";
      sim.log.push({ at: sim.t, kind: "secure" });
    }
    return;
  }
  // content: on a protected connection a changed message fails the integrity check
  if (msg.encrypted && msg.tampered) {
    msg.result = "rejected";
    sim.rejected += 1;
    const text = "Pemeriksaan gagal — data ditolak";
    if (msg.from === "browser") sim.received = { text, ok: false, at: sim.t };
    else sim.shown = { text, at: sim.t };
    sim.log.push({ at: sim.t, kind: "rejected", id: msg.id });
    return;
  }
  const text = msg.tampered ? `${msg.text} (sudah diubah!)` : msg.text;
  if (msg.from === "browser") sim.received = { text, ok: !msg.tampered, at: sim.t };
  else sim.shown = { text, at: sim.t };
  sim.log.push({ at: sim.t, kind: "accepted", id: msg.id, text, by: msg.from === "browser" ? "server" : "browser" });
}

/** The observer stands at the middle of the path; it sees every content message that passes. */
function pass(sim: HttpsSim, msg: Msg) {
  const readable = !msg.encrypted;
  if (readable && msg.kind === "data") sim.readableOnPath += 1;
  sim.observed = { text: readable ? msg.text : "▒▒▒▒▒▒", readable, at: sim.t };
  sim.log.push({ at: sim.t, kind: "seen", id: msg.id, readable });
}

const watched = (m: Msg) => m.kind === "data" || m.kind === "page" || m.kind === "reply";

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
      if (watched(msg) && !seen.has(msg.id)) offer((msg.sentAt + msg.arriveAt) / 2, () => (seen.add(msg.id), pass(sim, msg)));
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

/** What the browser's address bar shows. Real browsers differ in icons and words. */
export function addressBar(sim: HttpsSim): { url: string; status: string; tone: "bad" | "warn" | "ok" } {
  if (sim.conn === "secure") return { url: `https://${sim.target}`, status: "Terlindungi", tone: "ok" };
  if (sim.conn === "untrusted") return { url: `https://${sim.target}`, status: "Tidak dipercaya", tone: "bad" };
  if (sim.conn === "setup" || sim.check === "checking") return { url: `https://${sim.target}`, status: "Memeriksa…", tone: "warn" };
  return { url: `http://${sim.target}`, status: "Tidak aman", tone: "bad" };
}
