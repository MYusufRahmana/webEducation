import { createShardSim, type ShardAction, type ShardSim } from "./model";

/**
 * Eleven scenes. Each builds its own state. Orders already stored before a scene (seeds) always follow
 * the same rule, so Andi's older order TKT-001 is in Shard B in every sharded scene.
 */
export type ShardPartKey = "users" | "app" | "rule" | "single" | "shardA" | "shardB" | "cards" | "gauges" | "report" | "stock" | "sql";

export interface ShardStepConfig {
  key: string;
  highlight: ShardPartKey[];
  build: () => ShardSim;
  holdAt: number;
}

/** Andi, Budi, Sinta, Rina: one older order each (TKT-001…004). */
const SEED = [101, 102, 103, 104];

/** A steady stream of requests: every `gap` seconds from `from` to `to`, cycling through users. */
function stream(from: number, to: number, gap: number, users: number[], readEvery = 2): ShardAction[] {
  const out: ShardAction[] = [];
  let i = 0;
  for (let at = from; at <= to + 1e-9; at += gap, i++) {
    const user = users[i % users.length];
    out.push(i % readEvery === 0 ? { at: Math.round(at * 100) / 100, kind: "history", user } : { at: Math.round(at * 100) / 100, kind: "order", user });
  }
  return out;
}

export const SHARD_STEPS: ShardStepConfig[] = [
  {
    key: "satu-tempat",
    highlight: ["single", "cards"],
    build: () =>
      createShardSim({
        mode: "single",
        script: [
          { at: 0.6, kind: "order", user: 101 },
          { at: 1.8, kind: "order", user: 102 },
          { at: 3.0, kind: "order", user: 103 },
          { at: 4.2, kind: "order", user: 104 },
        ],
      }),
    holdAt: 10.4,
  },
  {
    key: "mulai-penuh",
    highlight: ["single", "gauges"],
    build: () => createShardSim({ mode: "single", orders: SEED, script: stream(0.4, 6.4, 0.3, [101, 102, 103, 104]) }),
    holdAt: 10,
  },
  {
    key: "aturan",
    highlight: ["rule", "shardA", "shardB"],
    build: () =>
      createShardSim({
        orders: SEED,
        script: [
          { at: 0.6, kind: "point", user: 101 },
          { at: 2.0, kind: "point", user: 102 },
          { at: 3.4, kind: "point", user: 103 },
          { at: 4.8, kind: "point", user: 104 },
        ],
      }),
    holdAt: 6.4,
  },
  {
    key: "pesanan-andi",
    highlight: ["rule", "shardB", "cards"],
    build: () => createShardSim({ orders: SEED, script: [{ at: 0.6, kind: "order", user: 101 }] }),
    holdAt: 7.8,
  },
  {
    key: "pesanan-budi",
    highlight: ["rule", "shardA", "cards"],
    build: () => createShardSim({ orders: [...SEED, 101], script: [{ at: 0.6, kind: "order", user: 102 }] }),
    holdAt: 7.8,
  },
  {
    key: "riwayat-andi",
    highlight: ["shardB", "app"],
    build: () => createShardSim({ orders: [...SEED, 101, 102], script: [{ at: 0.6, kind: "history", user: 101 }] }),
    holdAt: 7.2,
  },
  {
    key: "laporan",
    highlight: ["report", "shardA", "shardB"],
    build: () => createShardSim({ orders: [...SEED, 101, 102], script: [{ at: 0.6, kind: "report" }] }),
    holdAt: 5.8,
  },
  {
    key: "tidak-seimbang",
    highlight: ["gauges", "shardB"],
    build: () => createShardSim({ orders: [...SEED, 101, 102], script: stream(0.4, 6.4, 0.3, [101, 103, 105, 107], 3) }),
    holdAt: 10,
  },
  {
    key: "stok-terpisah",
    highlight: ["stock"],
    build: () =>
      createShardSim({
        orders: [...SEED, 101, 102],
        stock: true,
        sold: { A2: 104 },
        script: [
          { at: 0.6, kind: "order", user: 101, seat: "A1" },
          { at: 0.9, kind: "order", user: 102, seat: "A1" },
        ],
      }),
    holdAt: 9,
  },
  { key: "latihan-mysql", highlight: ["sql", "shardA", "shardB"], build: () => createShardSim(), holdAt: 3 },
  { key: "kapan-perlu", highlight: ["single", "gauges"], build: () => createShardSim({ mode: "single", orders: SEED, script: stream(0.6, 11, 1.4, [101, 102, 103, 104]) }), holdAt: 12 },
];
