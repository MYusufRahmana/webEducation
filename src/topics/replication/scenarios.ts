import { createReplSim, type ReplSim } from "./model";

/**
 * Eight scenes of one ticket sale (12 tickets, scaled down for the demonstration). Every scene is
 * rebuilt from the state the earlier scenes established, so each replay shows the same events.
 * Scene 2 jumps to the last ticket on purpose; scenes 3–8 continue from scene 1 (9 tickets left).
 */
export type ReplPartKey = "visitors" | "lb" | "apps" | "primary" | "replica" | "stream" | "manager" | "reads";

export interface ReplStepConfig {
  key: string;
  highlight: ReplPartKey[];
  build: () => ReplSim;
  holdAt: number;
}

const AFTER_1 = { stock: 9, applied: 3, reservedIds: { "P-101": 1, "P-102": 2, "P-103": 3 } };
const AFTER_4 = { stock: 8, applied: 4, reservedIds: { ...AFTER_1.reservedIds, "P-104": 4 } };
const AFTER_5 = { stock: 7, applied: 5, reservedIds: { ...AFTER_4.reservedIds, "P-105": 5 } };
const AFTER_7 = { reservedIds: { ...AFTER_5.reservedIds, "P-106": 6 } };

export const REPL_STEPS: ReplStepConfig[] = [
  {
    key: "satu-catatan",
    highlight: ["apps", "primary", "lb"],
    build: () =>
      createReplSim({
        script: [
          { at: 0.4, kind: "order", id: "P-101", app: "A" },
          { at: 1.4, kind: "order", id: "P-102", app: "B" },
          { at: 2.4, kind: "order", id: "P-103", app: "C" },
        ],
      }),
    holdAt: 5.8,
  },
  {
    key: "tiket-terakhir",
    highlight: ["primary"],
    build: () =>
      createReplSim({
        stock: 1,
        applied: 11,
        script: [
          { at: 0.5, kind: "order", id: "P-211", app: "A" },
          { at: 0.55, kind: "order", id: "P-212", app: "C" },
        ],
      }),
    holdAt: 4.6,
  },
  { key: "siapkan-salinan", highlight: ["replica", "stream"], build: () => createReplSim({ ...AFTER_1, script: [{ at: 0.6, kind: "start-replica", db: "D2" }] }), holdAt: 4.4 },
  {
    key: "perubahan-disalin",
    highlight: ["stream", "replica", "primary"],
    build: () => createReplSim({ ...AFTER_1, d2: "replica", script: [{ at: 0.4, kind: "order", id: "P-104", app: "B" }] }),
    holdAt: 5.4,
  },
  {
    key: "baca-dan-tulis",
    highlight: ["reads", "replica", "primary"],
    build: () =>
      createReplSim({
        ...AFTER_4,
        d2: "replica",
        script: [
          { at: 0.3, kind: "order", id: "P-105", app: "A" },
          { at: 1.6, kind: "read", app: "C" },
          { at: 3.6, kind: "read", app: "C" },
        ],
      }),
    holdAt: 6.2,
  },
  {
    key: "utama-gagal",
    highlight: ["primary", "apps"],
    build: () => createReplSim({ ...AFTER_5, d2: "replica", script: [{ at: 0.6, kind: "fail", db: "D1" }, { at: 0.9, kind: "order", id: "P-106", app: "C" }] }),
    holdAt: 5.6,
  },
  {
    key: "ambil-alih",
    highlight: ["manager", "replica", "primary"],
    build: () =>
      createReplSim({
        ...AFTER_5,
        d1: "down",
        d2: "replica",
        script: [
          { at: 0.3, kind: "failover" },
          { at: 1.2, kind: "order", id: "P-107", app: "A" },
          { at: 5.0, kind: "order", id: "P-106", app: "C" },
          { at: 7.7, kind: "order", id: "P-106", app: "C" },
        ],
      }),
    holdAt: 10.8,
  },
  {
    key: "pulihkan",
    highlight: ["primary", "replica", "stream"],
    build: () =>
      createReplSim({
        stock: 7,
        applied: 5,
        d1: "isolated",
        d2: "primary",
        d2Stock: 6,
        d2Applied: 6,
        writer: "D2",
        ...AFTER_7,
        script: [
          { at: 0.5, kind: "rejoin", db: "D1" },
          { at: 3.6, kind: "order", id: "P-108", app: "B" },
        ],
      }),
    holdAt: 7.6,
  },
];
