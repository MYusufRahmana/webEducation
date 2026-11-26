import { describe, expect, it } from "vitest";
import { advance, busyOf, CAP, createShardSim, history, order, ordersIn, report, storeFor, type ShardLog, type ShardSim } from "./model";
import { SHARD_STEPS } from "./scenarios";

const of = <K extends ShardLog["kind"]>(sim: ShardSim, kind: K) => sim.log.filter((e): e is Extract<ShardLog, { kind: K }> => e.kind === kind);
const play = (key: string) => {
  const s = SHARD_STEPS.find((x) => x.key === key)!;
  const sim = s.build();
  return advance(sim, s.holdAt - sim.t);
};

describe("Sharding model", () => {
  it("the rule: even ids go to A, odd ids to B; one store when not sharded", () => {
    expect([101, 102, 103, 104].map((id) => storeFor("sharded", id))).toEqual(["B", "A", "B", "A"]);
    expect(storeFor("single", 101)).toBe("S");
  });

  it("step 1: every order lands in the one store", () => {
    const sim = play("satu-tempat");
    expect(of(sim, "stored").map((e) => e.store)).toEqual(["S", "S", "S", "S"]);
    expect(ordersIn(sim, "S")).toHaveLength(4);
    expect(of(sim, "receipt")).toHaveLength(4);
  });

  it("step 2: a steady stream makes the single store queue up", () => {
    const sim = play("mulai-penuh");
    expect(sim.stores.S.peak).toBeGreaterThan(CAP + 3);
  });

  it("step 4–5: Andi (101) is written to B, Budi (102) to A, and nothing else moves", () => {
    const andi = play("pesanan-andi");
    expect(of(andi, "decide")[0]).toEqual(expect.objectContaining({ user: 101, store: "B", parity: "ganjil" }));
    expect(of(andi, "stored")[0]).toEqual(expect.objectContaining({ code: "TKT-005", store: "B" }));
    expect(ordersIn(andi, "A").map((o) => o.code)).toEqual(["TKT-002", "TKT-004"]);
    const budi = play("pesanan-budi");
    expect(of(budi, "stored")[0]).toEqual(expect.objectContaining({ code: "TKT-006", store: "A" }));
  });

  it("step 6: Andi's history asks only B and finds both of his orders", () => {
    const sim = play("riwayat-andi");
    expect(of(sim, "history")[0]).toEqual(expect.objectContaining({ user: 101, store: "B", codes: ["TKT-001", "TKT-005"] }));
    expect(sim.stores.A.peak).toBe(0);
  });

  it("step 7: the report asks every shard and merges the counts", () => {
    const sim = play("laporan");
    const r = of(sim, "report")[0];
    expect(r.stores).toBe(2);
    expect(r.counts).toEqual({ A: 3, B: 3 });
    expect(r.total).toBe(6);
  });

  it("step 8: same stored counts, uneven work: B is busy while A stays idle", () => {
    const sim = play("tidak-seimbang");
    expect(sim.stores.A.peak).toBe(0);
    expect(sim.stores.B.peak).toBeGreaterThan(CAP + 2);
  });

  it("step 9: one stock service sells seat A1 once; the second buyer is refused and nothing is stored for them", () => {
    const sim = play("stok-terpisah");
    expect(of(sim, "seat").map((e) => [e.user, e.ok])).toEqual([
      [101, true],
      [102, false],
    ]);
    expect(sim.seats.A1).toBe(101);
    expect(of(sim, "stored").map((e) => [e.user, e.store])).toEqual([[101, "B"]]);
    expect(of(sim, "receipt").find((e) => e.user === 102)!.failed).toMatch(/A1/);
  });

  it("a store never serves more than CAP at once, and every request finishes", () => {
    const sim = createShardSim({ mode: "single" });
    for (let i = 0; i < 9; i++) order(sim, 101 + (i % 4));
    let max = 0;
    for (let k = 0; k < 200; k++) {
      advance(sim, 0.1);
      max = Math.max(max, sim.stores.S.serving.length);
    }
    expect(max).toBe(CAP);
    expect(busyOf(sim, "S")).toBe(0);
    expect(ordersIn(sim, "S")).toHaveLength(9);
  });

  it("history and report are deterministic and work in single mode too", () => {
    const a = createShardSim({ mode: "single", orders: [101, 102, 101] });
    history(a, 101);
    report(a);
    advance(a, 10);
    expect(of(a, "history")[0].codes).toEqual(["TKT-001", "TKT-003"]);
    expect(of(a, "report")[0]).toEqual(expect.objectContaining({ stores: 1, total: 3 }));
  });

  it("every scene settles without errors", () => {
    for (const s of SHARD_STEPS) {
      const sim = s.build();
      expect(() => advance(sim, s.holdAt)).not.toThrow();
    }
  });
});
