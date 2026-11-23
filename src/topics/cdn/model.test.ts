import { describe, expect, it } from "vitest";
import { advance, clearCopy, createCdnSim, load, type CdnLog, type CdnSim } from "./model";
import { CDN_STEPS } from "./scenarios";

const of = <K extends CdnLog["kind"]>(sim: CdnSim, kind: K) => sim.log.filter((e): e is Extract<CdnLog, { kind: K }> => e.kind === kind);
const play = (key: string) => {
  const s = CDN_STEPS.find((x) => x.key === key)!;
  const sim = s.build();
  return advance(sim, s.holdAt - sim.t);
};

describe("CDN model", () => {
  it("step 1: nothing is loaded yet", () => {
    const sim = play("buka-website");
    expect(sim.screens.Andi.state).toBe("empty");
    expect(sim.originFetches).toBe(0);
  });
  it("step 2: without a CDN the poster comes from the origin and is shown", () => {
    const sim = play("dari-singapura");
    expect(sim.originFetches).toBe(1);
    expect(sim.screens.Andi.state).toBe("shown");
  });
  it("step 3: the same poster is sent from the origin again for every visitor", () => {
    const sim = play("banyak-orang");
    expect(sim.originFetches).toBe(3);
    expect(of(sim, "origin").map((e) => e.who)).toEqual(["Budi", "Citra"]);
  });
  it("step 5: a miss fetches from the origin, then the CDN keeps a copy for a limited time", () => {
    const sim = play("cache-miss");
    expect(of(sim, "miss")).toHaveLength(1);
    expect(sim.originFetches).toBe(1);
    expect(sim.copy).not.toBeNull();
    expect(sim.copy!.expiresAt - sim.copy!.storedAt).toBe(sim.ttl);
    const order = sim.log.filter((e) => ["miss", "origin", "stored", "shown"].includes(e.kind)).map((e) => e.kind);
    expect(order).toEqual(["miss", "origin", "stored", "shown"]);
  });
  it("step 6: a hit is served from Jakarta and does not contact the origin", () => {
    const sim = play("cache-hit");
    expect(of(sim, "hit")).toHaveLength(1);
    expect(of(sim, "origin")).toHaveLength(0);
    expect(sim.originFetches).toBe(1);
    expect(sim.screens.Budi.state).toBe("shown");
  });
  it("step 7: with the same visitor and poster, the hit takes less simulated time and no origin fetch", () => {
    const sim = play("bandingkan");
    const without = sim.results.find((r) => r.mode === "Tanpa CDN")!;
    const withCopy = sim.results.find((r) => r.mode === "Dengan CDN — salinan tersedia")!;
    expect(withCopy.took).toBeLessThan(without.took);
    expect(without.originFetches).toBe(1);
    expect(withCopy.originFetches).toBe(0);
    expect(sim.originFetches).toBe(1);
  });
  it("step 8: buying is never answered from the copy", () => {
    const sim = play("lihat-vs-beli");
    expect(of(sim, "hit")).toHaveLength(1);
    expect(of(sim, "bought")).toHaveLength(1);
    expect(sim.screens.Andi.state).toBe("bought");
  });
  it("a copy is used only while valid; clearing it makes the next request a miss", () => {
    const sim = createCdnSim({ cdnOn: true, copy: true });
    clearCopy(sim);
    load(sim, "Andi");
    advance(sim, 8);
    expect(sim.misses).toBe(1);
    const expired = createCdnSim({ cdnOn: true, copy: true });
    advance(expired, 61);
    load(expired, "Budi");
    advance(expired, 8);
    expect(expired.misses).toBe(1);
  });
  it("every scene finishes before it holds, and replays identically", () => {
    for (const s of CDN_STEPS) {
      const a = play(s.key);
      expect(a.trips.every((t) => t.doneAt !== null)).toBe(true);
      expect(JSON.stringify(play(s.key).log)).toBe(JSON.stringify(a.log));
    }
  });
});
