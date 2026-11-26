/**
 * Database index simulation: a table of order rows that never move, and (once created) an index: the
 * order codes kept in order, each with a pointer to its row. Pure and deterministic.
 *
 * Without an index a search checks every row (this demo looks for all matches, so it checks them all).
 * With an index it walks the ordered codes — starting in the middle and halving the range — then
 * follows the pointer and fetches only the matching row. Three kinds of work are counted separately:
 * rows checked, index steps, rows fetched. Nothing here is a benchmark.
 */

export interface Row {
  id: number;
  code: string;
  name: string;
  /** Fixed place in the table: rows are never re-sorted. */
  slot: number;
}

/** One index entry: a code and the row it points to. */
export interface Entry {
  code: string;
  rowId: number;
}

export type Probe =
  | { kind: "row"; rowId: number }
  /** The pile of extra rows in step 3, checked as one block. */
  | { kind: "pile"; count: number }
  | { kind: "entry"; pos: number; code: string; cmp: "<" | ">" | "=" }
  | { kind: "fetch"; rowId: number };

export type Mode = "scan" | "index";

export interface Search {
  id: number;
  code: string;
  mode: Mode;
  probes: Probe[];
  /** How many probes have been done. */
  done: number;
  startedAt: number;
  /** Rows that match. */
  found: number[];
  rowsChecked: number;
  indexSteps: number;
  fetched: number;
  finishedAt: number | null;
}

export interface Result {
  code: string;
  mode: Mode;
  rowsChecked: number;
  indexSteps: number;
  fetched: number;
  found: string | null;
}

export type IdxAction =
  | { at: number; kind: "search"; code: string; mode: Mode }
  | { at: number; kind: "build" }
  | { at: number; kind: "add"; code: string; name: string };

export type IdxLog =
  | { at: number; kind: "probe"; search: number; probe: Probe }
  | { at: number; kind: "result"; search: number; code: string; mode: Mode; found: string | null; rowsChecked: number; indexSteps: number; fetched: number }
  | { at: number; kind: "indexed"; code: string; rowId: number; pos: number }
  | { at: number; kind: "index-ready"; entries: number }
  | { at: number; kind: "row-added"; rowId: number; code: string; slot: number };

export interface IdxSim {
  t: number;
  rows: Row[];
  /** The ordered index, or null when none exists. Partly filled while being built. */
  index: Entry[] | null;
  /** Rows still to be read into the index (building), in table order. */
  building: number[];
  buildAt: number;
  search: Search | null;
  results: Result[];
  /** Extra rows imagined behind the eight cards (step 3), never drawn one by one. */
  extra: number;
  /** A row waiting to be added to the index after it was inserted into the table. */
  pendingEntry: { rowId: number; at: number } | null;
  script: IdxAction[];
  log: IdxLog[];
  nextSearch: number;
  nextRowId: number;
  /** Seconds per probe, slowed down to be watched. */
  pace: number;
}

const EPS = 1e-9;
export const TARGET = "TKT-104";

/** Eight orders in no particular order. Andi's is in the sixth place. */
export const ORDERS: [string, string][] = [
  ["TKT-107", "Rina"],
  ["TKT-102", "Budi"],
  ["TKT-105", "Sinta"],
  ["TKT-101", "Dewi"],
  ["TKT-108", "Joko"],
  ["TKT-104", "Andi"],
  ["TKT-106", "Maya"],
  ["TKT-103", "Eko"],
];

export interface IdxSeed {
  indexed?: boolean;
  extra?: number;
  script?: IdxAction[];
}

export function createIdxSim(seed: IdxSeed = {}): IdxSim {
  const rows = ORDERS.map(([code, name], slot) => ({ id: slot + 1, code, name, slot }));
  const sim: IdxSim = {
    t: 0,
    rows,
    index: null,
    building: [],
    buildAt: 0,
    search: null,
    results: [],
    extra: seed.extra ?? 0,
    pendingEntry: null,
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    nextSearch: 1,
    nextRowId: rows.length + 1,
    pace: 0.55,
  };
  if (seed.indexed) sim.index = [...rows].sort((a, b) => a.code.localeCompare(b.code)).map((r) => ({ code: r.code, rowId: r.id }));
  return sim;
}

const rowById = (sim: IdxSim, id: number) => sim.rows.find((r) => r.id === id)!;

/** The steps a search will take, decided from the data as it is now. */
function plan(sim: IdxSim, code: string, mode: Mode): Probe[] {
  if (mode === "scan" || !sim.index) {
    const probes: Probe[] = [...sim.rows].sort((a, b) => a.slot - b.slot).map((r) => ({ kind: "row" as const, rowId: r.id }));
    if (sim.extra) probes.push({ kind: "pile", count: sim.extra });
    return probes;
  }
  // walk the ordered codes: look in the middle, keep the half that can hold the code
  const probes: Probe[] = [];
  let lo = 0;
  let hi = sim.index.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    const entry = sim.index[mid];
    const cmp = code === entry.code ? "=" : code < entry.code ? "<" : ">";
    probes.push({ kind: "entry", pos: mid, code: entry.code, cmp });
    if (cmp === "=") {
      probes.push({ kind: "fetch", rowId: entry.rowId });
      break;
    }
    if (cmp === "<") hi = mid - 1;
    else lo = mid + 1;
  }
  return probes;
}

/** Website asks the database for the order with this code. */
export function search(sim: IdxSim, code: string, mode: Mode = sim.index ? "index" : "scan") {
  const s: Search = { id: sim.nextSearch++, code, mode: mode === "index" && sim.index ? "index" : "scan", probes: [], done: 0, startedAt: sim.t, found: [], rowsChecked: 0, indexSteps: 0, fetched: 0, finishedAt: null };
  s.probes = plan(sim, code, s.mode);
  sim.search = s;
  return s;
}

/** CREATE INDEX: read every row's code, in table order, into the ordered index. */
export function buildIndex(sim: IdxSim) {
  sim.index = [];
  sim.building = [...sim.rows].sort((a, b) => a.slot - b.slot).map((r) => r.id);
  sim.buildAt = sim.t + sim.pace;
}

/** INSERT: the row goes into the next free place; the index (if any) gets its new pointer too. */
export function addRow(sim: IdxSim, code: string, name: string) {
  const row: Row = { id: sim.nextRowId++, code, name, slot: sim.rows.length };
  sim.rows.push(row);
  sim.log.push({ at: sim.t, kind: "row-added", rowId: row.id, code, slot: row.slot });
  if (sim.index && !sim.building.length) sim.pendingEntry = { rowId: row.id, at: sim.t + 1.2 };
  return row;
}

function insertEntry(sim: IdxSim, rowId: number) {
  const row = rowById(sim, rowId);
  const pos = sim.index!.findIndex((e) => row.code < e.code);
  const at = pos < 0 ? sim.index!.length : pos;
  sim.index!.splice(at, 0, { code: row.code, rowId });
  sim.log.push({ at: sim.t, kind: "indexed", code: row.code, rowId, pos: at });
}

function probeStep(sim: IdxSim, s: Search) {
  const probe = s.probes[s.done];
  s.done += 1;
  if (probe.kind === "row") {
    s.rowsChecked += 1;
    if (rowById(sim, probe.rowId).code === s.code) s.found.push(probe.rowId);
  } else if (probe.kind === "pile") s.rowsChecked += probe.count;
  else if (probe.kind === "entry") s.indexSteps += 1;
  else {
    s.fetched += 1;
    s.found.push(probe.rowId);
  }
  sim.log.push({ at: sim.t, kind: "probe", search: s.id, probe });
  if (s.done >= s.probes.length) {
    s.finishedAt = sim.t;
    const found = s.found.length ? rowById(sim, s.found[0]).name : null;
    const result: Result = { code: s.code, mode: s.mode, rowsChecked: s.rowsChecked, indexSteps: s.indexSteps, fetched: s.fetched, found };
    sim.results = [...sim.results.filter((r) => !(r.code === s.code && r.mode === s.mode)), result].slice(-4);
    sim.log.push({ at: sim.t, kind: "result", search: s.id, code: s.code, mode: s.mode, found, rowsChecked: s.rowsChecked, indexSteps: s.indexSteps, fetched: s.fetched });
  }
}

function apply(sim: IdxSim, a: IdxAction) {
  if (a.kind === "search") search(sim, a.code, a.mode);
  else if (a.kind === "build") buildIndex(sim);
  else addRow(sim, a.code, a.name);
}

export function advance(sim: IdxSim, dt: number): IdxSim {
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
    const s = sim.search;
    if (s && s.finishedAt === null) offer(s.startedAt + (s.done + 1) * sim.pace, () => probeStep(sim, s));
    if (sim.building.length) offer(sim.buildAt, () => {
      insertEntry(sim, sim.building.shift()!);
      sim.buildAt = sim.t + sim.pace;
      if (!sim.building.length) sim.log.push({ at: sim.t, kind: "index-ready", entries: sim.index!.length });
    });
    const pending = sim.pendingEntry;
    if (pending) offer(pending.at, () => {
      sim.pendingEntry = null;
      insertEntry(sim, pending.rowId);
    });
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  return sim;
}

/** The probe being shown right now (the last one done), if a search is on screen. */
export const currentProbe = (sim: IdxSim): Probe | null => (sim.search && sim.search.done > 0 ? sim.search.probes[sim.search.done - 1] : null);
export const indexReady = (sim: IdxSim) => Boolean(sim.index && !sim.building.length);
