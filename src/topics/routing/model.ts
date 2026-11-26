/**
 * Routing simulation: Andi's laptop in Jakarta talks to an illustrated Google or Facebook service.
 *
 * Packets are not given a whole route. At every node the next hop is chosen from that node's
 * (simplified) route table, using only the destination; so when a link fails, packets sent before the
 * table is updated are lost, and packets after it take the other path. Replies come back on their own
 * return path, which may differ. Traceroute is simulated with probe packets that each carry a hop limit
 * (TTL): a new probe per limit; the node where the limit runs out answers, unless it does not answer
 * probes. Addresses are documentation examples, never real Google or Facebook addresses.
 * Pure and deterministic; nothing here touches a real network.
 */

export type NodeId = "L" | "DNS" | "H" | "I" | "X1" | "X2" | "G" | "F" | "GS" | "FS";
export type Dest = "google" | "facebook";
export type Kind = "dns-q" | "dns-a" | "req" | "reply" | "probe" | "probe-reply";

export const SERVICE: Record<Dest, NodeId> = { google: "GS", facebook: "FS" };
/** Illustrative addresses from documentation ranges; they do not belong to Google or Facebook. */
export const DEST_IP: Record<Dest, string> = { google: "192.0.2.50", facebook: "198.51.100.80" };
export const linkKey = (a: NodeId, b: NodeId) => [a, b].sort().join("-");

export interface Packet {
  id: number;
  kind: Kind;
  dest: Dest;
  /** Nodes visited so far (the trail), current node last. */
  trail: NodeId[];
  from: NodeId;
  to: NodeId | null;
  moveAt: number;
  moveEnd: number;
  /** Waiting at a router while it reads its route table. */
  deciding: boolean;
  hops: number;
  focus: boolean;
  ttl: number | null;
  /** Stop after reaching this node (to hold a step's picture). */
  stopAt: NodeId | null;
  state: "moving" | "deciding" | "arrived" | "lost";
  doneAt: number | null;
  note: string | null;
  /** A path decided in advance (replies on their return path, probe replies); otherwise routed hop by hop. */
  fixed: NodeId[] | null;
}

export interface ProbeLine {
  ttl: number;
  node: NodeId | null;
  ok: boolean;
}

export type RouteAction =
  | { at: number; kind: "dns"; dest: Dest }
  | { at: number; kind: "send"; dest: Dest; stopAt?: NodeId; focus?: boolean }
  | { at: number; kind: "serve"; dest: Dest }
  | { at: number; kind: "cut" }
  | { at: number; kind: "probe"; ttl: number }
  /** Internal steps the simulation schedules for itself. */
  | { at: number; kind: "phase"; phase: string }
  | { at: number; kind: "reply"; dest: Dest }
  | { at: number; kind: "probe-timeout"; ttl: number };

export type RouteLog =
  | { at: number; kind: "dns"; dest: Dest }
  | { at: number; kind: "hop"; id: number; node: NodeId; hops: number }
  | { at: number; kind: "decide"; id: number; node: NodeId; next: NodeId }
  | { at: number; kind: "arrived"; id: number; node: NodeId; packet: Kind }
  | { at: number; kind: "lost"; id: number; node: NodeId; reason: string }
  | { at: number; kind: "cut"; link: string }
  | { at: number; kind: "route-updated"; node: NodeId; dest: Dest; next: NodeId }
  | { at: number; kind: "phase"; phase: string }
  | { at: number; kind: "page" }
  | { at: number; kind: "probe-line"; ttl: number; node: NodeId | null };

export interface RouteSim {
  t: number;
  dest: Dest;
  known: Record<Dest, boolean>;
  down: string[];
  /** Route table of the ISP router (the only one that changes in this demo). */
  ispTable: Record<Dest, NodeId>;
  routeUpdateAt: number | null;
  packets: Packet[];
  script: RouteAction[];
  log: RouteLog[];
  probes: ProbeLine[];
  nextTtl: number;
  /** Nodes that do not answer probes (in this demo: the destination network's edge router). */
  silent: NodeId[];
  https: { phase: string; at: number } | null;
  screen: "empty" | "loading" | "shown";
  /** Hop of the traceroute example the reader is looking at (step 10). */
  focusHop: number | null;
  nextId: number;
  hop: number;
  decide: number;
  /** Longer pause at the ISP router when the route table is explained. */
  ispPause: number;
  /** The service answers each request on its own (summary step). */
  autoServe: boolean;
  /** A visit waiting for its address from DNS; the request is sent as soon as the address arrives. */
  pendingOpen: Dest | null;
}

const EPS = 1e-9;
const KEEP = 1.6;

export interface RouteSeed {
  dest?: Dest;
  known?: Dest[];
  ispPause?: number;
  script?: RouteAction[];
  silent?: NodeId[];
  screen?: RouteSim["screen"];
  autoServe?: boolean;
}

export function createRouteSim(seed: RouteSeed = {}): RouteSim {
  return {
    t: 0,
    dest: seed.dest ?? "google",
    known: { google: (seed.known ?? []).includes("google"), facebook: (seed.known ?? []).includes("facebook") },
    down: [],
    ispTable: { google: "X1", facebook: "X2" },
    routeUpdateAt: null,
    packets: [],
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    probes: [],
    nextTtl: 1,
    silent: seed.silent ?? ["G"],
    https: null,
    screen: seed.screen ?? "empty",
    focusHop: null,
    nextId: 1,
    hop: 0.7,
    decide: 0.35,
    ispPause: seed.ispPause ?? 0.35,
    autoServe: seed.autoServe ?? false,
    pendingOpen: null,
  };
}

/** The simplified route tables: where each node sends a packet for a destination. */
export function nextHop(sim: RouteSim, at: NodeId, dest: Dest): NodeId | null {
  switch (at) {
    case "L":
      return "H"; // default gateway
    case "H":
      return "I"; // the home router's way out
    case "I":
      return sim.ispTable[dest];
    case "X1":
      return dest === "google" ? "G" : null;
    case "X2":
      return dest === "google" ? "G" : "F";
    case "G":
      return dest === "google" ? "GS" : null;
    case "F":
      return dest === "facebook" ? "FS" : null;
    default:
      return null;
  }
}

/** Replies come back on their own path, which may differ from the way out. */
export function returnPath(dest: Dest): NodeId[] {
  return dest === "google" ? ["GS", "G", "X2", "I", "H", "L"] : ["FS", "F", "X2", "I", "H", "L"];
}

const isRouter = (n: NodeId) => n === "H" || n === "I" || n === "X1" || n === "X2" || n === "G" || n === "F";

function launch(sim: RouteSim, kind: Kind, dest: Dest, from: NodeId, opts: { focus?: boolean; ttl?: number | null; stopAt?: NodeId | null; fixed?: NodeId[] } = {}) {
  const p: Packet = { id: sim.nextId++, kind, dest, trail: [from], from, to: null, moveAt: sim.t, moveEnd: sim.t, deciding: false, hops: 0, focus: opts.focus ?? false, ttl: opts.ttl ?? null, stopAt: opts.stopAt ?? null, state: "moving", doneAt: null, note: null, fixed: opts.fixed ?? null };
  sim.packets.push(p);
  step(sim, p);
  return p;
}

/** Starts the next move of a packet, from where it is. */
function step(sim: RouteSim, p: Packet) {
  const here = p.trail[p.trail.length - 1];
  const fixed = p.fixed;
  const next = fixed ? fixed[p.trail.length] ?? null : p.kind === "dns-q" ? "DNS" : p.kind === "dns-a" ? "L" : nextHop(sim, here, p.dest);
  if (!next) return finish(sim, p, "lost", "tidak ada rute");
  if (sim.down.includes(linkKey(here, next))) return finish(sim, p, "lost", "jalur tidak tersedia");
  if (p.kind === "req" || p.kind === "probe") sim.log.push({ at: sim.t, kind: "decide", id: p.id, node: here, next });
  p.from = here;
  p.to = next;
  p.state = "moving";
  p.deciding = false;
  p.moveAt = sim.t;
  p.moveEnd = sim.t + (p.kind === "probe" || p.kind === "probe-reply" ? sim.hop * 0.65 : p.kind.startsWith("dns") ? 1.0 : sim.hop);
}

function finish(sim: RouteSim, p: Packet, state: "arrived" | "lost", reason?: string) {
  p.state = state;
  p.doneAt = sim.t;
  p.to = null;
  const here = p.trail[p.trail.length - 1];
  if (state === "lost") {
    p.note = reason ?? null;
    sim.log.push({ at: sim.t, kind: "lost", id: p.id, node: here, reason: reason ?? "" });
  } else sim.log.push({ at: sim.t, kind: "arrived", id: p.id, node: here, packet: p.kind });
}

function arrive(sim: RouteSim, p: Packet) {
  const node = p.to!;
  p.trail.push(node);
  p.to = null;
  p.hops += 1;
  if (p.kind === "req" || p.kind === "probe") sim.log.push({ at: sim.t, kind: "hop", id: p.id, node, hops: p.hops });
  // a probe whose hop limit runs out here: this node answers, unless it does not answer probes
  if (p.kind === "probe" && p.ttl !== null && p.hops >= p.ttl) {
    finish(sim, p, "arrived");
    if (sim.silent.includes(node) && node !== SERVICE[p.dest]) {
      sim.script.push({ at: sim.t + 1.4, kind: "probe-timeout", ttl: p.ttl });
      sim.script.sort((a, b) => a.at - b.at);
      return;
    }
    const back = [...p.trail].reverse();
    launch(sim, "probe-reply", p.dest, node, { fixed: back, ttl: p.ttl });
    return;
  }
  if (p.kind === "probe-reply" && node === "L") {
    finish(sim, p, "arrived");
    sim.probes.push({ ttl: p.ttl!, node: p.trail[0], ok: true });
    sim.log.push({ at: sim.t, kind: "probe-line", ttl: p.ttl!, node: p.trail[0] });
    return;
  }
  if (p.kind === "dns-a" && node === "L") {
    sim.known[p.dest] = true;
    sim.log.push({ at: sim.t, kind: "dns", dest: p.dest });
    finish(sim, p, "arrived");
    if (sim.pendingOpen === p.dest) {
      sim.pendingOpen = null;
      send(sim, p.dest);
    }
    return;
  }
  if (p.kind === "dns-q" && node === "DNS") {
    finish(sim, p, "arrived");
    launch(sim, "dns-a", p.dest, "DNS");
    return;
  }
  if (p.kind === "reply" && node === "L") {
    finish(sim, p, "arrived");
    if (!sim.packets.some((x) => x.kind === "reply" && x.state === "moving")) {
      sim.screen = "shown";
      sim.log.push({ at: sim.t, kind: "page" });
    } else sim.screen = "loading";
    return;
  }
  if (node === SERVICE[p.dest] && p.kind === "req") {
    finish(sim, p, "arrived");
    if (sim.autoServe) serve(sim, p.dest);
    return;
  }
  if (p.stopAt === node) return finish(sim, p, "arrived");
  // a router reads its table before sending the packet on
  if (isRouter(node) && (p.kind === "req" || p.kind === "reply")) {
    p.state = "deciding";
    p.deciding = true;
    p.moveAt = sim.t;
    p.moveEnd = sim.t + (node === "I" && p.kind === "req" ? sim.ispPause : sim.decide);
    return;
  }
  step(sim, p);
}

/** The service answers over HTTPS: three short phases, then a few reply packets on the return path. */
export function serve(sim: RouteSim, dest: Dest) {
  const phases = ["Koneksi aman disiapkan", "Permintaan halaman dikirim", "Jawaban dikirim"];
  phases.forEach((phase, i) => sim.script.push({ at: sim.t + i * 0.9, kind: "phase", phase }));
  for (let i = 0; i < 3; i++) sim.script.push({ at: sim.t + 2.7 + i * 0.45, kind: "reply", dest });
  sim.script.sort((a, b) => a.at - b.at);
}

/** One request packet from the laptop towards the chosen service. */
export function send(sim: RouteSim, dest: Dest, opts: { stopAt?: NodeId; focus?: boolean } = {}) {
  sim.dest = dest;
  return launch(sim, "req", dest, "L", { focus: opts.focus ?? true, stopAt: opts.stopAt ?? null });
}

/** Opening a website: ask DNS first if the address is not known yet, then send the request. */
export function open(sim: RouteSim, dest: Dest) {
  sim.dest = dest;
  if (sim.known[dest]) return void send(sim, dest);
  sim.pendingOpen = dest;
  launch(sim, "dns-q", dest, "L", { focus: true });
}

/** A link stops working; the ISP router learns the other way a little later. */
export function cut(sim: RouteSim) {
  const key = linkKey("X1", "G");
  if (sim.down.includes(key)) return;
  sim.down.push(key);
  sim.log.push({ at: sim.t, kind: "cut", link: key });
  sim.routeUpdateAt = sim.t + 3;
}

/** A new probe with a hop limit one larger than the previous one. */
export function probe(sim: RouteSim, ttl = sim.nextTtl) {
  sim.nextTtl = ttl + 1;
  return launch(sim, "probe", "google", "L", { ttl, focus: true });
}

function apply(sim: RouteSim, a: RouteAction) {
  switch (a.kind) {
    case "dns":
      return void launch(sim, "dns-q", a.dest, "L", { focus: true });
    case "send":
      return void send(sim, a.dest, { stopAt: a.stopAt, focus: a.focus });
    case "serve":
      return serve(sim, a.dest);
    case "cut":
      return cut(sim);
    case "probe":
      return void probe(sim, a.ttl);
    case "phase":
      sim.https = { phase: a.phase, at: sim.t };
      sim.log.push({ at: sim.t, kind: "phase", phase: a.phase });
      return;
    case "reply":
      sim.screen = "loading";
      return void launch(sim, "reply", a.dest, SERVICE[a.dest], { fixed: returnPath(a.dest), focus: false });
    case "probe-timeout":
      sim.probes.push({ ttl: a.ttl, node: null, ok: false });
      sim.log.push({ at: sim.t, kind: "probe-line", ttl: a.ttl, node: null });
  }
}

export function advance(sim: RouteSim, dt: number): RouteSim {
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
    if (sim.routeUpdateAt !== null) offer(sim.routeUpdateAt, () => {
      sim.routeUpdateAt = null;
      sim.ispTable.google = "X2";
      sim.log.push({ at: sim.t, kind: "route-updated", node: "I", dest: "google", next: "X2" });
    });
    for (const p of sim.packets) {
      if (p.state === "moving") offer(p.moveEnd, () => arrive(sim, p));
      else if (p.state === "deciding") offer(p.moveEnd, () => step(sim, p));
    }
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  sim.packets = sim.packets.filter((p) => p.doneAt === null || sim.t - p.doneAt < KEEP || p.stopAt !== null);
  return sim;
}

export const progressOf = (p: Packet, t: number) => (p.moveEnd <= p.moveAt ? 1 : Math.max(0, Math.min(1, (t - p.moveAt) / (p.moveEnd - p.moveAt))));
/** The packet the reader follows: the newest focused one still on screen. */
export const focusPacket = (sim: RouteSim) => [...sim.packets].reverse().find((p) => p.focus) ?? null;
