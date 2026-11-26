import { describe, expect, it } from "vitest";
import { advance, createRouteSim, send, type RouteLog, type RouteSim } from "./model";
import { ROUTE_STEPS } from "./scenarios";

const of = <K extends RouteLog["kind"]>(sim: RouteSim, kind: K) => sim.log.filter((e): e is Extract<RouteLog, { kind: K }> => e.kind === kind);
const play = (key: string, until?: number) => {
  const s = ROUTE_STEPS.find((x) => x.key === key)!;
  const sim = s.build();
  return advance(sim, (until ?? s.holdAt) - sim.t);
};

describe("Routing model", () => {
  it("step 2: DNS gives the address; it is a side trip, not a router on the way", () => {
    const sim = play("cari-alamat");
    expect(sim.known.google).toBe(true);
    expect(of(sim, "hop")).toHaveLength(0);
  });
  it("step 3: the packet first goes to the home router (default gateway)", () => {
    const sim = play("keluar-rumah");
    expect(of(sim, "hop")[0]).toEqual(expect.objectContaining({ node: "H", hops: 1 }));
  });
  it("step 4: the ISP router picks the next hop from its table, and only the next hop", () => {
    const sim = play("router-memilih");
    expect(of(sim, "decide").find((e) => e.node === "I")?.next).toBe("X1");
    expect(of(sim, "hop").map((e) => e.node)).toEqual(["H", "I", "X1"]);
  });
  it("step 5: hop by hop to the service, five hops in all", () => {
    const sim = play("hop-ke-hop");
    expect(of(sim, "hop").map((e) => e.node)).toEqual(["H", "I", "X1", "G", "GS"]);
    expect(of(sim, "hop").slice(-1)[0].hops).toBe(5);
  });
  it("step 6: HTTPS phases, then replies come back on a different path and the page shows", () => {
    const sim = play("jawaban");
    expect(of(sim, "phase").map((e) => e.phase)).toEqual(["Koneksi aman disiapkan", "Permintaan halaman dikirim", "Jawaban dikirim"]);
    expect(sim.screen).toBe("shown");
    expect(of(sim, "arrived").filter((e) => e.packet === "reply")).toHaveLength(3);
  });
  it("step 7: Facebook shares the first part of the way, then branches", () => {
    const sim = play("facebook");
    expect(of(sim, "hop").map((e) => e.node)).toEqual(["H", "I", "X2", "F", "FS"]);
  });
  it("step 8: after a link fails, a packet sent before the update is lost; later packets take the other path", () => {
    const sim = play("jalur-putus");
    const lost = of(sim, "lost");
    expect(lost).toHaveLength(1);
    expect(lost[0].node).toBe("X1");
    const updated = of(sim, "route-updated")[0];
    expect(updated.at).toBeGreaterThan(of(sim, "cut")[0].at);
    const last = of(sim, "hop").filter((e) => e.id === 3).map((e) => e.node);
    expect(last).toEqual(["H", "I", "X2", "G", "GS"]);
  });
  it("step 11: a new probe for each hop limit; the silent router shows as *, the destination answers last", () => {
    const sim = play("batas-langkah");
    expect(sim.probes.map((p) => [p.ttl, p.node, p.ok])).toEqual([
      [1, "H", true],
      [2, "I", true],
      [3, "X1", true],
      [4, null, false],
      [5, "GS", true],
    ]);
    const probeIds = new Set(of(sim, "hop").map((e) => e.id));
    expect(probeIds.size).toBe(5);
  });
  it("routers forward by destination only: a Google packet never takes the Facebook branch", () => {
    const sim = createRouteSim({ known: ["google"] });
    send(sim, "google");
    advance(sim, 10);
    expect(of(sim, "hop").map((e) => e.node)).not.toContain("F");
  });
  it("every scene replays identically", () => {
    for (const s of ROUTE_STEPS) expect(JSON.stringify(play(s.key).log)).toBe(JSON.stringify(play(s.key).log));
  });
});
