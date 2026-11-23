import { describe, expect, it } from "vitest";
import { advance, createReplSim, lagTx, order, writerDb, type ReplLog, type ReplSim } from "./model";
import { REPL_STEPS } from "./scenarios";

const of = <K extends ReplLog["kind"]>(sim: ReplSim, kind: K) => sim.log.filter((e): e is Extract<ReplLog, { kind: K }> => e.kind === kind);
const run = (i: number, t = REPL_STEPS[i].holdAt) => advance(REPL_STEPS[i].build(), t);
const answers = (sim: ReplSim) => Object.fromEntries(of(sim, "answer").map((e) => [`${e.id}@${e.at.toFixed(2)}`, e.result]));

describe("one source of writes", () => {
  it("three app servers all commit on the same primary", () => {
    const sim = run(0);
    expect(of(sim, "commit").map((e) => e.db)).toEqual(["D1", "D1", "D1"]);
    expect(sim.dbs.D1.stock).toBe(9);
  });
  it("two buyers for the last ticket: one reservation, one sold out, stock never negative", () => {
    const sim = run(1);
    expect(Object.values(answers(sim)).sort()).toEqual(["reserved", "sold-out"]);
    expect(sim.dbs.D1.stock).toBe(0);
  });
  it("a replica refuses writes: orders never commit on it before promotion", () => {
    for (const i of [3, 4]) expect(of(run(i), "commit").every((e) => e.db === "D1")).toBe(true);
  });
});

describe("replication", () => {
  it("the copy is ready before anything can fail", () => {
    const sim = run(2);
    expect(sim.dbs.D2.role).toBe("replica");
    expect(sim.dbs.D2.applied).toBe(sim.dbs.D1.applied);
  });
  it("a change reaches the replica after a lag; meanwhile it is one transaction behind", () => {
    const step = REPL_STEPS[3];
    const sim = step.build();
    const commitAt = of(advance(step.build(), step.holdAt), "commit")[0].at;
    advance(sim, commitAt + 0.1);
    expect(lagTx(sim)).toBe(1);
    advance(sim, step.holdAt - sim.t);
    expect(lagTx(sim)).toBe(0);
    expect(sim.dbs.D2.stock).toBe(sim.dbs.D1.stock);
  });
  it("a read from the replica can be behind, a later one catches up", () => {
    const reads = of(run(4), "read");
    expect(reads.map((r) => r.stale)).toEqual([true, false]);
    expect(reads[0].shown).toBe(8);
    expect(reads[1].shown).toBe(7);
  });
});

describe("failure and failover", () => {
  it("while the primary is down an order is not reported as reserved", () => {
    const sim = run(5);
    expect(Object.values(answers(sim))).toEqual(["retry"]);
    expect(sim.reserved).toBe(0);
  });
  it("the old primary is isolated before the replica is promoted and writes reopen", () => {
    const sim = run(6);
    const roles = of(sim, "role");
    const isolated = roles.find((e) => e.db === "D1" && e.role === "isolated")!.at;
    const promoted = roles.find((e) => e.db === "D2" && e.role === "primary")!.at;
    expect(isolated).toBeLessThan(promoted);
    expect(writerDb(sim)).toBe("D2");
    expect(sim.dbs.D1.role).toBe("isolated");
  });
  it("orders during the switch are told to try again; a retry reserves once; a second retry is not charged twice", () => {
    const sim = run(6);
    const list = of(sim, "answer").map((e) => `${e.id}:${e.result}`);
    expect(list).toEqual(["P-107:retry", "P-106:reserved", "P-106:duplicate"]);
    expect(sim.dbs.D2.stock).toBe(6);
  });
  it("only one database accepts writes at any time", () => {
    for (let i = 0; i < REPL_STEPS.length; i++) {
      const sim = REPL_STEPS[i].build();
      for (let t = 0; t < REPL_STEPS[i].holdAt; t += 0.1) {
        advance(sim, 0.1);
        expect((["D1", "D2"] as const).filter((db) => sim.dbs[db].role === "primary").length).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("restoring protection", () => {
  it("the old database rejoins as a replica after catching up, and copies new changes", () => {
    const sim = run(7);
    expect(sim.dbs.D1.role).toBe("replica");
    expect(writerDb(sim)).toBe("D2");
    expect(sim.dbs.D1.applied).toBe(sim.dbs.D2.applied);
    expect(sim.dbs.D1.stock).toBe(5);
  });
  it("replays are identical, and the same order id is never reserved twice", () => {
    for (const step of REPL_STEPS) expect(JSON.stringify(advance(step.build(), step.holdAt).log)).toBe(JSON.stringify(advance(step.build(), step.holdAt).log));
    const sim = createReplSim();
    order(sim, "P-1", "A");
    advance(sim, 4);
    order(sim, "P-1", "B");
    advance(sim, 4);
    expect(sim.dbs.D1.stock).toBe(11);
    expect(sim.duplicates).toBe(1);
  });
});
