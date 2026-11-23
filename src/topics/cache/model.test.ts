import { describe, expect, it } from "vitest";
import { advance, ask, book, createCacheSim, lookup, update, type CacheLog, type CacheSim } from "./model";
import { CACHE_STEPS } from "./scenarios";

const of = <K extends CacheLog["kind"]>(sim: CacheSim, kind: K) => sim.log.filter((e): e is Extract<CacheLog, { kind: K }> => e.kind === kind);
const run = (i: number) => advance(CACHE_STEPS[i].build(), CACHE_STEPS[i].holdAt);

describe("Cache lesson model", () => {
  it("steps 1–2: without a cache every question reads the database", () => {
    for (const i of [0, 1]) {
      const sim = run(i);
      expect(sim.dbReads).toBe(3);
      expect(sim.hits + sim.misses).toBe(0);
      expect(sim.answers).toHaveLength(3);
    }
  });
  it("step 3: the cache appears empty", () => {
    const sim = run(2);
    expect(sim.cacheOn).toBe(true);
    expect(Object.keys(sim.cache)).toHaveLength(0);
  });
  it("step 4: a miss reads the database, stores a copy, then answers — in that order", () => {
    const sim = run(3);
    expect(sim.misses).toBe(1);
    expect(sim.dbReads).toBe(1);
    expect(sim.cache.info?.value).toBe("19.00");
    const order = sim.log.filter((e) => ["miss", "db-read", "stored", "answer"].includes(e.kind)).map((e) => e.kind);
    expect(order).toEqual(["miss", "db-read", "stored", "answer"]);
    expect(sim.answers[0].source).toBe("database");
  });
  it("step 5: hits answer from the cache without reading the database", () => {
    const sim = run(4);
    expect(sim.hits).toBe(2);
    expect(sim.dbReads).toBe(1);
    expect(of(sim, "db-read")).toHaveLength(0);
    expect(sim.answers.every((a) => a.source === "cache" && !a.stale)).toBe(true);
  });
  it("step 6: the official change comes first, the old copy is served until it is deleted, then refilled", () => {
    const sim = run(5);
    expect(sim.db.time).toBe("20.00");
    const [p7, p8] = sim.answers;
    expect(p7).toEqual(expect.objectContaining({ id: "P7", source: "cache", stale: true }));
    expect(p7.text).toContain("19.00");
    expect(p8).toEqual(expect.objectContaining({ id: "P8", source: "database", stale: false }));
    expect(p8.text).toContain("20.00");
    expect(sim.cache.info?.value).toBe("20.00");
    const updatedAt = of(sim, "updated")[0].at;
    const deletedAt = of(sim, "deleted")[0].at;
    expect(updatedAt).toBeLessThan(deletedAt);
  });
  it("updating the database alone does not refresh the cache", () => {
    const sim = createCacheSim({ cached: { info: {} } });
    update(sim, "21.00", false);
    advance(sim, 8);
    expect(sim.db.time).toBe("21.00");
    expect(sim.cache.info?.value).toBe("19.00");
    ask(sim, "X", "info");
    advance(sim, 6);
    expect(sim.answers.slice(-1)[0]).toEqual(expect.objectContaining({ source: "cache", stale: true }));
  });
  it("an expired copy is a miss", () => {
    const sim = createCacheSim({ cached: { info: {} }, ttl: 5 });
    advance(sim, 6);
    expect(lookup(sim, "info")).toBeNull();
    ask(sim, "X", "info");
    advance(sim, 12);
    expect(sim.misses).toBe(1);
    expect(sim.dbReads).toBe(1);
  });
  it("a failed database read never produces a success answer or a cached copy", () => {
    const sim = createCacheSim({ script: [{ at: 0, kind: "db-down", down: true }] });
    ask(sim, "X", "info");
    advance(sim, 12);
    expect(sim.answers[0].ok).toBe(false);
    expect(sim.cache.info).toBeUndefined();
  });
  it("step 7: seat map from the cache, booking decided once by the database, availability refreshed", () => {
    const sim = run(6);
    expect(of(sim, "reserved")).toEqual([expect.objectContaining({ id: "P10", seat: "A12" })]);
    expect(of(sim, "taken")).toEqual([expect.objectContaining({ id: "P11" })]);
    expect(sim.db.seats.A12).toBe("P10");
    const p9 = sim.answers.find((a) => a.id === "P9")!;
    const p12 = sim.answers.find((a) => a.id === "P12")!;
    expect(p9.source).toBe("cache");
    expect(p9.text).toContain("tersedia");
    expect(p12.source).toBe("database");
    expect(p12.text).toContain("terisi");
  });
  it("bookings never touch the cache, even when it says the seat is free", () => {
    const sim = createCacheSim({ cached: { seatmap: {} } });
    book(sim, "A", "A12");
    advance(sim, 0.5);
    book(sim, "B", "A12");
    advance(sim, 12);
    expect(of(sim, "hit").length + of(sim, "miss").length).toBe(0);
    expect(of(sim, "reserved")).toHaveLength(1);
    expect(sim.answers.filter((a) => a.ok)).toHaveLength(1);
  });
  it("every scene finishes before it holds, and replays identically", () => {
    for (const step of CACHE_STEPS) {
      const a = advance(step.build(), step.holdAt);
      expect(a.reqs.every((r) => r.doneAt !== null)).toBe(true);
      expect(JSON.stringify(advance(step.build(), step.holdAt).log)).toBe(JSON.stringify(a.log));
    }
  });
});
