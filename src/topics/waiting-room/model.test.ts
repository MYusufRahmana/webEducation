import { describe, expect, it } from "vitest";
import { activeCount, advance, ANDI_ID, createWaitSim, insideCount, positionOf, waitingCount, type WaitLog, type WaitSim } from "./model";
import { WAIT_STEPS } from "./scenarios";

const of = <K extends WaitLog["kind"]>(sim: WaitSim, kind: K) => sim.log.filter((e): e is Extract<WaitLog, { kind: K }> => e.kind === kind);
const play = (key: string, until?: number) => {
  const s = WAIT_STEPS.find((x) => x.key === key)!;
  const sim = s.build();
  return advance(sim, (until ?? s.holdAt) - sim.t);
};
const shown = (sim: WaitSim) => ({
  slot: sim.visitors.filter((v) => v.admitted && (v.place.kind === "slot" || v.place.kind === "gate")).length,
  queue: sim.visitors.filter((v) => v.place.kind === "queue").length,
});

describe("Waiting room model", () => {
  it("step 1: ten visitors arrive at the website", () => {
    const sim = play("dibuka");
    expect(sim.visitors.filter((v) => v.place.kind === "front")).toHaveLength(10);
    expect(of(sim, "arrived")[0].count).toBe(10);
  });
  it("step 2: without a waiting room all ten go in and requests pile up at the server", () => {
    const sim = play("bersamaan");
    expect(insideCount(sim)).toBe(10);
    expect(sim.serverLine.length).toBeGreaterThanOrEqual(5);
  });
  it("step 3: three are let in, seven wait; Andi is second in line", () => {
    const sim = play("ruang-tunggu");
    expect(activeCount(sim)).toBe(3);
    expect(waitingCount(sim)).toBe(7);
    expect(positionOf(sim, ANDI_ID)).toBe(2);
    expect(shown(sim)).toEqual({ slot: 3, queue: 7 });
  });
  it("step 4: one place is released, briefly 2/3, then exactly one visitor goes in; Andi is now first", () => {
    const between = play("satu-tempat", 1.2);
    expect(activeCount(between)).toBe(2);
    expect(waitingCount(between)).toBe(7);
    const sim = play("satu-tempat");
    expect(of(sim, "admitted")).toHaveLength(1);
    expect(activeCount(sim)).toBe(3);
    expect(waitingCount(sim)).toBe(6);
    expect(positionOf(sim, ANDI_ID)).toBe(1);
    expect(shown(sim)).toEqual({ slot: 3, queue: 6 });
  });
  it("step 5: the next released place goes to Andi", () => {
    const sim = play("giliran-andi");
    expect(of(sim, "admitted").map((e) => e.name)).toEqual(["Andi"]);
    expect(activeCount(sim)).toBe(3);
    expect(waitingCount(sim)).toBe(5);
    expect(positionOf(sim, ANDI_ID)).toBeNull();
  });
  it("step 6: inside, Andi's requests go through the server to the database; an order is not a ticket yet", () => {
    const sim = play("pilih-tiket");
    const answers = of(sim, "answer").map((e) => e.text);
    expect(answers).toHaveLength(2);
    expect(answers[1]).toMatch(/selesaikan pembayaran/);
    expect(answers.some((a) => /tiket (milikmu|didapat)|berhasil dibayar/i.test(a))).toBe(false);
  });
  it("the first come is the first served, and only as many as the places", () => {
    const sim = createWaitSim({ start: "front", script: [{ at: 0, kind: "open" }] });
    advance(sim, 5);
    expect(sim.slots).toEqual([1, 2, 3]);
    expect(sim.queue).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });
  it("every scene replays identically", () => {
    for (const s of WAIT_STEPS) expect(JSON.stringify(play(s.key).log)).toBe(JSON.stringify(play(s.key).log));
  });
});
