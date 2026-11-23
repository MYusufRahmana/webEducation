import { describe, expect, it } from "vitest";
import { advance, checkNow, cloneSim, createSim, measuredRate, recentDecisions, setPower, setRequestInterval, totals, type LogEntry, type Sim } from "./model";
import { B_RESTARTS_AT, B_STOPS_AT, STEP3_HOLD, STEPS } from "./scenarios";

const decisions = (sim: Sim) => sim.log.filter((entry): entry is Extract<LogEntry, { kind: "decide" }> => entry.kind === "decide");
const arrivals = (sim: Sim) => sim.log.filter((entry): entry is Extract<LogEntry, { kind: "arrive" }> => entry.kind === "arrive");
const healthAt = (sim: Sim, healthy: boolean) => sim.log.find((entry) => entry.kind === "health" && entry.server === "B" && entry.healthy === healthy)?.at;

describe("round robin", () => {
  it("cycles A → B → C → A while every server is healthy", () => {
    const sim = advance(createSim(), 12.5);
    const order = decisions(sim).map((entry) => entry.server).join("");
    expect(order).toBe("ABCABCABCABC");
  });

  it("counts are cumulative and match the forwarded requests", () => {
    const sim = advance(createSim(), 30.5);
    const sent = decisions(sim).length;
    const t = totals(sim);
    expect(t.sent).toBe(30);
    expect(sim.servers.A.sent + sim.servers.B.sent + sim.servers.C.sent).toBe(t.sent);
    expect(sent).toBeGreaterThan(0);
    expect(t.ok + t.failed).toBeLessThanOrEqual(t.sent);
    expect(t.created - t.sent).toBe(1); // one request still on its way to the load balancer
  });

  it("does not depend on frame size", () => {
    const one = advance(createSim({ script: [{ at: B_STOPS_AT, kind: "power", server: "B", up: false }] }), 25);
    const many = createSim({ script: [{ at: B_STOPS_AT, kind: "power", server: "B", up: false }] });
    for (let i = 0; i < 25 * 60; i++) advance(many, 1 / 60);
    expect(totals(many)).toEqual(totals(one));
    expect(many.servers.B).toEqual(one.servers.B);
  });

  it("measures the rate over its window", () => {
    const sim = advance(createSim(), 20);
    // one request per second split over three servers: 3 or 4 forwards fall in a 10 s window
    const rate = measuredRate(sim, "A")!;
    expect(rate).toBeGreaterThanOrEqual(0.3);
    expect(rate).toBeLessThanOrEqual(0.4);
    expect(rate * 10).toBe(sim.servers.A.sentTimes.filter((at) => at > sim.t - 10).length);
    expect(measuredRate(advance(createSim(), 1), "A")).toBeNull();
  });
});

describe("failure before detection", () => {
  const sim = STEPS[2].build();
  advance(sim, STEP3_HOLD - sim.t);

  it("B is physically down but the load balancer still believes it is healthy", () => {
    expect(sim.servers.B.up).toBe(false);
    expect(sim.servers.B.healthy).toBe(true);
    expect(sim.servers.B.streak).toBe(1); // one failed check, threshold is two
  });

  it("requests sent to B after it stopped fail and are not moved elsewhere", () => {
    const failed = arrivals(sim).filter((entry) => !entry.ok);
    expect(failed.length).toBe(2);
    expect(failed.every((entry) => entry.server === "B" && entry.at > B_STOPS_AT)).toBe(true);
    expect(sim.servers.B.failed).toBe(2);
    // each failed request id was decided once, for B only
    for (const entry of failed) expect(decisions(sim).filter((d) => d.id === entry.id).map((d) => d.server)).toEqual(["B"]);
  });
});

describe("detection and recovery", () => {
  it("skips B once health checks mark it unhealthy, and only then", () => {
    const sim = STEPS[3].build();
    advance(sim, 25 - sim.t);
    const marked = healthAt(sim, false)!;
    expect(marked).toBeGreaterThan(STEP3_HOLD);
    const after = decisions(sim).filter((entry) => entry.at > marked);
    expect(after.length).toBeGreaterThan(5);
    expect(after.some((entry) => entry.server === "B")).toBe(false);
    expect(after.map((entry) => entry.server).join("")).toMatch(/^(AC)+A?$|^(CA)+C?$/);
    expect(after.filter((entry) => entry.skipped.includes("B")).length).toBeGreaterThan(0);
  });

  it("brings B back only after enough passing checks", () => {
    const sim = STEPS[4].build();
    advance(sim, 30 - sim.t);
    const back = healthAt(sim, true)!;
    expect(back).toBeGreaterThan(B_RESTARTS_AT);
    const between = decisions(sim).filter((entry) => entry.at > B_RESTARTS_AT && entry.at < back);
    expect(between.some((entry) => entry.server === "B")).toBe(false);
    const after = decisions(sim).filter((entry) => entry.at > back).map((entry) => entry.server);
    expect(after).toContain("B");
    expect(after.slice(0, 6).join("")).toMatch(/ABC|BCA|CAB/);
    const lastB = arrivals(sim).filter((entry) => entry.server === "B" && entry.at > back);
    expect(lastB.every((entry) => entry.ok)).toBe(true);
  });
});

describe("controls", () => {
  it("replaying a step is deterministic", () => {
    const a = advance(STEPS[3].build(), 9);
    const b = advance(STEPS[3].build(), 9);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("a manual check detects a stopped server sooner", () => {
    const sim = advance(createSim(), 5);
    setPower(sim, "B", false);
    advance(sim, 0.1);
    while (!checkNow(sim)) advance(sim, 0.1);
    advance(sim, 1.01);
    while (!checkNow(sim)) advance(sim, 0.1);
    advance(sim, 1.01);
    expect(sim.servers.B.healthy).toBe(false);
  });

  it("a check refuses to start while one is in flight", () => {
    const sim = advance(createSim(), 0.7);
    expect(checkNow(sim)).toBe(false);
  });

  it("changing the rate changes the interval between new requests", () => {
    const sim = advance(createSim(), 5.25);
    const before = sim.created;
    setRequestInterval(sim, 0.5);
    advance(sim, 4);
    expect(sim.created - before).toBe(8);
  });

  it("recent decisions report outcomes", () => {
    const sim = STEPS[2].build();
    advance(sim, STEP3_HOLD - sim.t);
    const recent = recentDecisions(sim, 9);
    expect(recent.filter((entry) => entry.server === "B" && entry.outcome === "fail").length).toBe(2);
    expect(cloneSim(sim)).toEqual(sim);
  });
});
