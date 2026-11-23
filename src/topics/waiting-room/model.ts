/**
 * Waiting room simulation: 10 visitors, 3 active places in the purchase area, first come first served.
 * Visitors are people that walk between places; data requests (only in the purchase step) are packets.
 * Counters are always computed from where the people are, so numbers and icons can never disagree.
 *
 * Simplifications on purpose (stated in the lesson): the numbers, first-come-first-served order and
 * "a finished buyer releases one place" are rules of this simulation, not of any real ticket website.
 * Pure and deterministic.
 */

export type Place =
  | { kind: "outside"; i: number }
  /** In front of the website, before any waiting room exists (step 1). */
  | { kind: "front"; i: number }
  /** Inside the purchase area without a waiting room: everyone crowds in (step 2). */
  | { kind: "crowd"; i: number }
  | { kind: "queue"; i: number }
  | { kind: "gate" }
  | { kind: "slot"; i: number }
  | { kind: "exit" }
  | { kind: "gone" };

export interface Visitor {
  id: number;
  name: string;
  andi: boolean;
  place: Place;
  from: Place;
  moveAt: number;
  moveEnd: number;
  /** The next leg, taken when this move ends (queue → gate → slot). */
  then: { place: Place; dur: number } | null;
  /** Admitted: counted as active from the moment the gate lets it through. */
  admitted: boolean;
  /** Step 2: this visitor already sent its request from the crowded purchase area. */
  asked?: boolean;
}

export type Leg = "to-server" | "waiting" | "to-db" | "db-back" | "server-back";
export interface Packet {
  id: number;
  leg: Leg;
  text: string;
  /** What comes back. */
  answer: string;
  sentAt: number;
  arriveAt: number;
  doneAt: number | null;
}

export type WaitAction =
  | { at: number; kind: "arrive" }
  | { at: number; kind: "crowd-in" }
  | { at: number; kind: "open" }
  | { at: number; kind: "release"; slot: number }
  | { at: number; kind: "request"; text: string; answer: string }
  /** Internal: a freed place is handed to the front of the queue. */
  | { at: number; kind: "open-next" };

export type WaitLog =
  | { at: number; kind: "arrived"; count: number }
  | { at: number; kind: "admitted"; id: number; name: string; slot: number }
  | { at: number; kind: "released"; id: number; slot: number }
  | { at: number; kind: "queued"; id: number; position: number }
  | { at: number; kind: "answer"; text: string };

export interface WaitSim {
  t: number;
  /** false in steps 1–2: there is no waiting room yet. */
  roomOn: boolean;
  capacity: number;
  visitors: Visitor[];
  packets: Packet[];
  /** Ids in the queue, front first. */
  queue: number[];
  /** Visitor id per active place, or null when free. */
  slots: (number | null)[];
  gateOpenUntil: number;
  script: WaitAction[];
  log: WaitLog[];
  nextPacket: number;
  /** The last answer Andi's page shows. */
  andiScreen: { text: string; at: number } | null;
  /** Delay between a place becoming free and the next visitor being let in. */
  admitDelay: number;
  /** Packets waiting for the server's single worker, first in line first. */
  serverLine: number[];
  serverBusy: boolean;
}

const EPS = 1e-9;
export const ANDI_ID = 5;
const DUR = { walk: 1.6, toQueue: 1.0, shift: 0.6, toGate: 0.7, toSlot: 0.8, exit: 1.2, crowd: 1.1, hop: 0.9 };

export interface WaitSeed {
  roomOn?: boolean;
  /** Where the visitors start. */
  start?: "outside" | "front" | "seated";
  /** For "seated": visitor ids in the places, then the queue in order. */
  slots?: number[];
  queue?: number[];
  gone?: number[];
  script?: WaitAction[];
}

export function createWaitSim(seed: WaitSeed = {}): WaitSim {
  const visitors: Visitor[] = Array.from({ length: 10 }, (_, k) => {
    const id = k + 1;
    const place: Place = seed.start === "front" ? { kind: "front", i: k } : { kind: "outside", i: k };
    return { id, name: id === ANDI_ID ? "Andi" : `Pengunjung ${id}`, andi: id === ANDI_ID, place, from: place, moveAt: 0, moveEnd: 0, then: null, admitted: false };
  });
  const sim: WaitSim = {
    t: 0,
    roomOn: seed.roomOn ?? true,
    capacity: 3,
    visitors,
    packets: [],
    queue: [],
    slots: [null, null, null],
    gateOpenUntil: -1,
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    nextPacket: 1,
    andiScreen: null,
    admitDelay: 0.9,
    serverLine: [],
    serverBusy: false,
  };
  if (seed.start === "seated") {
    (seed.slots ?? []).forEach((id, i) => {
      const v = sim.visitors[id - 1];
      v.place = v.from = { kind: "slot", i };
      v.admitted = true;
      sim.slots[i] = id;
    });
    (seed.queue ?? []).forEach((id, i) => {
      const v = sim.visitors[id - 1];
      v.place = v.from = { kind: "queue", i };
      sim.queue.push(id);
    });
    for (const id of seed.gone ?? []) {
      const v = sim.visitors[id - 1];
      v.place = v.from = { kind: "gone" };
    }
  }
  return sim;
}

const V = (sim: WaitSim, id: number) => sim.visitors[id - 1];

function move(sim: WaitSim, v: Visitor, place: Place, dur: number, then: Visitor["then"] = null, delay = 0) {
  v.from = v.place;
  v.place = place;
  v.moveAt = sim.t + delay;
  v.moveEnd = sim.t + delay + dur;
  v.then = then;
}

/** Counters, always derived from the people. */
export const activeCount = (sim: WaitSim) => sim.visitors.filter((v) => v.admitted && (v.place.kind === "slot" || v.place.kind === "gate")).length;
export const waitingCount = (sim: WaitSim) => sim.queue.length;
export const insideCount = (sim: WaitSim) => sim.visitors.filter((v) => v.place.kind === "crowd").length;
export const positionOf = (sim: WaitSim, id: number) => {
  const i = sim.queue.indexOf(id);
  return i < 0 ? null : i + 1;
};

/** Lets the front of the queue through the gate into a free place. */
function admitNext(sim: WaitSim) {
  const free = sim.slots.findIndex((s) => s === null);
  if (free < 0 || !sim.queue.length) return;
  const id = sim.queue.shift()!;
  const v = V(sim, id);
  sim.slots[free] = id;
  v.admitted = true;
  sim.gateOpenUntil = sim.t + DUR.toGate + DUR.toSlot * 0.5;
  move(sim, v, { kind: "gate" }, DUR.toGate, { place: { kind: "slot", i: free }, dur: DUR.toSlot });
  sim.log.push({ at: sim.t, kind: "admitted", id, name: v.name, slot: free });
  // everyone behind steps one place forward
  sim.queue.forEach((qid, i) => move(sim, V(sim, qid), { kind: "queue", i }, DUR.shift, null, 0.3));
}

function apply(sim: WaitSim, a: WaitAction) {
  switch (a.kind) {
    case "arrive":
      sim.visitors.forEach((v, k) => move(sim, v, { kind: "front", i: k }, DUR.walk, null, k * 0.12));
      sim.log.push({ at: sim.t, kind: "arrived", count: sim.visitors.length });
      return;
    case "crowd-in":
      // without a waiting room everybody goes straight into the purchase area
      sim.visitors.forEach((v, k) => move(sim, v, { kind: "crowd", i: k }, DUR.crowd, null, k * 0.1));
      return;
    case "open": {
      // the first three go in, the others line up in arrival order
      sim.visitors.forEach((v, k) => {
        if (k < sim.capacity) {
          sim.slots[k] = v.id;
          v.admitted = true;
          move(sim, v, { kind: "gate" }, DUR.toGate + 0.4, { place: { kind: "slot", i: k }, dur: DUR.toSlot }, k * 0.35);
          sim.log.push({ at: sim.t, kind: "admitted", id: v.id, name: v.name, slot: k });
        } else {
          sim.queue.push(v.id);
          move(sim, v, { kind: "queue", i: k - sim.capacity }, DUR.toQueue + 0.2, null, 0.3 + (k - sim.capacity) * 0.1);
          sim.log.push({ at: sim.t, kind: "queued", id: v.id, position: k - sim.capacity + 1 });
        }
      });
      sim.gateOpenUntil = sim.t + 2.4;
      return;
    }
    case "release": {
      const id = sim.slots[a.slot];
      if (id === null) return;
      const v = V(sim, id);
      sim.slots[a.slot] = null;
      v.admitted = false;
      move(sim, v, { kind: "exit" }, DUR.exit, { place: { kind: "gone" }, dur: 0.01 });
      sim.log.push({ at: sim.t, kind: "released", id, slot: a.slot });
      sim.script.push({ at: sim.t + sim.admitDelay, kind: "open-next" });
      sim.script.sort((x, y) => x.at - y.at);
      return;
    }
    case "request":
      return void sendPacket(sim, a.text, a.answer);
    case "open-next":
      return admitNext(sim);
  }
}

function sendPacket(sim: WaitSim, text: string, answer: string) {
  const p: Packet = { id: sim.nextPacket++, leg: "to-server", text, answer, sentAt: sim.t, arriveAt: sim.t + DUR.hop, doneAt: null };
  sim.packets.push(p);
  return p;
}

/** The server has one worker: the next packet in line goes to the database. */
function serveNext(sim: WaitSim) {
  if (sim.serverBusy || !sim.serverLine.length) return;
  const p = sim.packets.find((x) => x.id === sim.serverLine[0])!;
  sim.serverLine.shift();
  sim.serverBusy = true;
  p.leg = "to-db";
  p.sentAt = sim.t;
  p.arriveAt = sim.t + DUR.hop;
}

function packetArrives(sim: WaitSim, p: Packet) {
  if (p.leg === "to-server") {
    p.leg = "waiting";
    p.sentAt = sim.t;
    p.arriveAt = Infinity;
    sim.serverLine.push(p.id);
    return serveNext(sim);
  }
  if (p.leg === "to-db") {
    p.leg = "db-back";
    p.sentAt = sim.t;
    p.arriveAt = sim.t + DUR.hop;
    return;
  }
  if (p.leg === "db-back") {
    sim.serverBusy = false;
    p.leg = "server-back";
    p.sentAt = sim.t;
    p.arriveAt = sim.t + DUR.hop;
    return serveNext(sim);
  }
  p.doneAt = sim.t;
  sim.andiScreen = { text: p.answer, at: sim.t };
  sim.log.push({ at: sim.t, kind: "answer", text: p.answer });
}

export function advance(sim: WaitSim, dt: number): WaitSim {
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
    for (const v of sim.visitors) {
      if (v.then && v.moveEnd > sim.t - EPS) offer(v.moveEnd, () => {
        const then = v.then!;
        v.then = null;
        move(sim, v, then.place, then.dur);
      });
      if (v.place.kind === "crowd" && !v.asked && v.moveEnd > sim.t - EPS) offer(v.moveEnd, () => {
        v.asked = true;
        sendPacket(sim, "Cek kursi", "Daftar kursi");
      });
    }
    for (const p of sim.packets) if (p.doneAt === null && Number.isFinite(p.arriveAt)) offer(p.arriveAt, () => packetArrives(sim, p));
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  sim.packets = sim.packets.filter((p) => p.doneAt === null || sim.t - p.doneAt < 2);
  return sim;
}

export const moveProgress = (v: Visitor, t: number) => (v.moveEnd <= v.moveAt ? 1 : Math.max(0, Math.min(1, (t - v.moveAt) / (v.moveEnd - v.moveAt))));
export const packetProgress = (p: Packet, t: number) => (Number.isFinite(p.arriveAt) ? Math.max(0, Math.min(1, (t - p.sentAt) / (p.arriveAt - p.sentAt))) : 1);

/** A rough waiting estimate shown as “Perkiraan”, never a promise: one minute per place ahead, in this demo. */
export const estimateMinutes = (position: number) => position;
