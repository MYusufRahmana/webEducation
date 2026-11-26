import { describe, expect, it } from "vitest";
import { addRow, advance, buildIndex, createIdxSim, search, TARGET, type IdxLog, type IdxSim } from "./model";
import { IDX_STEPS } from "./scenarios";

const of = <K extends IdxLog["kind"]>(sim: IdxSim, kind: K) => sim.log.filter((e): e is Extract<IdxLog, { kind: K }> => e.kind === kind);
const play = (key: string) => {
  const s = IDX_STEPS.find((x) => x.key === key)!;
  const sim = s.build();
  return advance(sim, s.holdAt - sim.t);
};
const slots = (sim: IdxSim) => sim.rows.map((r) => `${r.slot}:${r.code}`);

describe("Database index model", () => {
  it("step 2: without an index every row is checked and Andi's order is found", () => {
    const sim = play("satu-per-satu");
    const r = of(sim, "result")[0];
    expect(r).toEqual(expect.objectContaining({ code: TARGET, mode: "scan", rowsChecked: 8, indexSteps: 0, found: "Andi" }));
  });
  it("step 3: with many more rows the same search checks all of them", () => {
    const sim = play("semakin-banyak");
    expect(of(sim, "result")[0].rowsChecked).toBe(1000);
  });
  it("step 4: building the index reads every row, keeps codes in order, and does not move the rows", () => {
    const before = slots(createIdxSim());
    const sim = play("buat-katalog");
    expect(of(sim, "indexed")).toHaveLength(8);
    expect(sim.index!.map((e) => e.code)).toEqual([...sim.index!.map((e) => e.code)].sort());
    expect(slots(sim)).toEqual(before);
    for (const e of sim.index!) expect(sim.rows.find((r) => r.id === e.rowId)!.code).toBe(e.code);
  });
  it("step 5: the index search still takes steps, then fetches exactly one row", () => {
    const sim = play("cari-lewat-indeks");
    const r = of(sim, "result")[0];
    expect(r.mode).toBe("index");
    expect(r.indexSteps).toBeGreaterThan(0);
    expect(r.fetched).toBe(1);
    expect(r.rowsChecked).toBe(0);
    expect(r.found).toBe("Andi");
  });
  it("step 6: same code, same answer either way; a missing code is not found and nothing is fetched", () => {
    const sim = play("bandingkan");
    const [scan, idx] = sim.results;
    expect(scan.found).toBe(idx.found);
    expect(idx.rowsChecked + idx.fetched).toBeLessThan(scan.rowsChecked);
    const missing = createIdxSim({ indexed: true });
    search(missing, "TKT-110", "index");
    advance(missing, 6);
    expect(missing.results[0]).toEqual(expect.objectContaining({ found: null, fetched: 0 }));
    const missingScan = createIdxSim({ indexed: true });
    search(missingScan, "TKT-110", "scan");
    advance(missingScan, 6);
    expect(missingScan.results[0]).toEqual(expect.objectContaining({ found: null, rowsChecked: 8 }));
  });
  it("step 7: a new order goes into the next table place and a new pointer into the ordered index", () => {
    const sim = play("pelihara-indeks");
    const added = of(sim, "row-added")[0];
    expect(added.slot).toBe(8);
    expect(sim.index!.map((e) => e.code)).toContain("TKT-109");
    expect(sim.index!.map((e) => e.code)).toEqual([...sim.index!.map((e) => e.code)].sort());
    expect(of(sim, "indexed")[0].at).toBeGreaterThan(added.at);
  });
  it("an index is not a uniqueness rule: two rows with the same code are both found", () => {
    const sim = createIdxSim();
    addRow(sim, TARGET, "Andi (kedua)");
    buildIndex(sim);
    advance(sim, 10);
    search(sim, TARGET, "scan");
    advance(sim, 10);
    expect(sim.search!.found).toHaveLength(2);
    expect(sim.index!.filter((e) => e.code === TARGET)).toHaveLength(2);
  });
  it("every scene finishes before it holds, and replays identically", () => {
    for (const s of IDX_STEPS) {
      const a = play(s.key);
      expect(a.search === null || a.search.finishedAt !== null).toBe(true);
      expect(a.building).toHaveLength(0);
      expect(JSON.stringify(play(s.key).log)).toBe(JSON.stringify(a.log));
    }
  });
});
