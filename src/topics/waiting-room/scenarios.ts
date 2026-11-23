import { createWaitSim, type WaitSim } from "./model";

/**
 * Six scenes on one sale. Each builds its own state from where the previous scene ended, so a replay
 * always shows the same people in the same places (replaying never changes the counts).
 */
export type WaitPartKey = "visitors" | "room" | "gate" | "area" | "server" | "db" | "andi" | "counters";

export interface WaitStepConfig {
  key: string;
  highlight: WaitPartKey[];
  build: () => WaitSim;
  holdAt: number;
}

const QUEUE = [4, 5, 6, 7, 8, 9, 10];

export const WAIT_STEPS: WaitStepConfig[] = [
  { key: "dibuka", highlight: ["visitors", "andi"], build: () => createWaitSim({ roomOn: false, script: [{ at: 0.4, kind: "arrive" }] }), holdAt: 4.4 },
  { key: "bersamaan", highlight: ["area", "server"], build: () => createWaitSim({ roomOn: false, start: "front", script: [{ at: 0.6, kind: "crowd-in" }] }), holdAt: 9.0 },
  { key: "ruang-tunggu", highlight: ["room", "gate", "counters", "andi"], build: () => createWaitSim({ start: "front", script: [{ at: 0.6, kind: "open" }] }), holdAt: 5.0 },
  { key: "satu-tempat", highlight: ["gate", "counters"], build: () => createWaitSim({ start: "seated", slots: [1, 2, 3], queue: QUEUE, script: [{ at: 0.8, kind: "release", slot: 0 }] }), holdAt: 4.8 },
  { key: "giliran-andi", highlight: ["andi", "gate"], build: () => createWaitSim({ start: "seated", slots: [4, 2, 3], queue: QUEUE.slice(1), gone: [1], script: [{ at: 0.8, kind: "release", slot: 1 }] }), holdAt: 4.8 },
  {
    key: "pilih-tiket",
    highlight: ["area", "server", "db"],
    build: () =>
      createWaitSim({
        start: "seated",
        slots: [4, 5, 3],
        queue: QUEUE.slice(2),
        gone: [1, 2],
        script: [
          { at: 0.6, kind: "request", text: "Cek kategori B", answer: "Kategori B: masih tersedia" },
          { at: 5.0, kind: "request", text: "Pesan 1 tiket kategori B", answer: "Pesanan dibuat · selesaikan pembayaran" },
        ],
      }),
    holdAt: 10.2,
  },
];
