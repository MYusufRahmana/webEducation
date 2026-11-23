import { describe, expect, it } from "vitest";
import { advance, burstNow, createMqSim, setConsumerPower, setProduceInterval, type MqLog, type MqSim } from "./model";
import { C1_CRASH_AT, C2_JOINS_AT, C1_STOPS_AT, MQ_STEPS, STEP3_HOLD } from "./scenarios";

const of = <K extends MqLog["kind"]>(sim: MqSim, kind: K) => sim.log.filter((entry): entry is Extract<MqLog, { kind: K }> => entry.kind === kind);
const run = (index: number, until: number) => {
  const sim = MQ_STEPS[index].build();
  return advance(sim, until - sim.t);
};

describe("queue basics", () => {
  it("delivers every message once, in order, while the consumer keeps up", () => {
    const sim = run(0, 30);
    const acks = of(sim, "ack");
    expect(acks.map((entry) => entry.seq)).toEqual(acks.map((_, i) => i + 1));
    expect(acks.every((entry) => entry.attempt === 1)).toBe(true);
    expect(sim.redelivered).toBe(0);
    expect(sim.rejected).toBe(0);
  });

  it("does not depend on frame size", () => {
    const one = run(3, 20);
    const many = MQ_STEPS[3].build();
    for (let i = 0; i < 20 * 60; i++) advance(many, 1 / 60);
    expect(many.acked).toBe(one.acked);
    expect(many.redelivered).toBe(one.redelivered);
    expect(many.queue.length).toBe(one.queue.length);
  });
});

describe("buffering a burst", () => {
  it("holds a burst in the queue and drains it at the consumer's pace, first in first out", () => {
    const sim = run(1, 20);
    const peak = Math.max(...of(sim, "enqueue").map((entry) => entry.depth));
    expect(peak).toBeGreaterThanOrEqual(4);
    const acks = of(sim, "ack").map((entry) => entry.seq);
    expect(acks).toEqual([...acks].sort((a, b) => a - b));
    expect(sim.queue.length).toBeLessThanOrEqual(1);
    expect(sim.rejected).toBe(0);
  });
});

describe("a stopped consumer", () => {
  const sim = run(2, STEP3_HOLD);
  it("lets messages wait in the queue without losing any", () => {
    expect(sim.consumers.C1.up).toBe(false);
    expect(sim.queue.length).toBe(4);
    expect(of(sim, "lost").length).toBe(0);
    expect(sim.produced).toBe(sim.acked + sim.queue.length + sim.messages.filter((m) => m.state === "toQueue").length);
  });
  it("does not slow the producer", () => {
    const produced = of(sim, "produce").filter((entry) => entry.at > C1_STOPS_AT).length;
    expect(produced).toBe(4);
  });
});

describe("acknowledgement and redelivery", () => {
  it("redelivers a message whose consumer stopped before acknowledging it", () => {
    const sim = run(3, 12);
    const lost = of(sim, "lost");
    expect(lost.length).toBe(1);
    expect(lost[0].at).toBeCloseTo(C1_CRASH_AT);
    const again = of(sim, "redeliver");
    expect(again.map((entry) => entry.seq)).toEqual([lost[0].seq]);
    expect(again[0].at).toBeGreaterThan(C1_CRASH_AT);
    const ack = of(sim, "ack").find((entry) => entry.seq === lost[0].seq)!;
    expect(ack.attempt).toBe(2);
    expect(sim.unacked.every((record) => record.deadline > sim.t)).toBe(true);
  });

  it("keeps an acknowledged message from coming back", () => {
    const sim = run(0, 20);
    const acked = new Set(of(sim, "ack").map((entry) => entry.seq));
    expect(of(sim, "deliver").filter((entry) => acked.has(entry.seq)).every((entry) => entry.attempt === 1)).toBe(true);
  });
});

describe("competing consumers", () => {
  it("a second consumer shares the work and the queue shrinks", () => {
    const sim = MQ_STEPS[4].build();
    advance(sim, C2_JOINS_AT);
    const before = sim.queue.length;
    expect(before).toBeGreaterThanOrEqual(3);
    advance(sim, 14);
    expect(sim.queue.length).toBeLessThan(before);
    const after = of(sim, "deliver").filter((entry) => entry.at > C2_JOINS_AT);
    expect(after.some((entry) => entry.consumer === "C2")).toBe(true);
    expect(after.some((entry) => entry.consumer === "C1")).toBe(true);
    // each message is handled by exactly one consumer
    const seen = new Map<number, string>();
    for (const entry of of(sim, "ack")) {
      expect(seen.has(entry.seq)).toBe(false);
      seen.set(entry.seq, entry.consumer);
    }
  });
});

describe("controls", () => {
  it("rejects messages when the queue is full", () => {
    const sim = createMqSim();
    advance(sim, 1);
    setConsumerPower(sim, "C1", false);
    setProduceInterval(sim, 0.8);
    advance(sim, 15);
    expect(sim.queue.length).toBe(sim.params.capacity);
    expect(sim.rejected).toBeGreaterThan(0);
  });

  it("a burst adds five messages", () => {
    // the first regular message leaves at 0.3 s and the next at 2.8 s, so only the burst falls in between
    const sim = advance(createMqSim(), 0.5);
    const before = sim.produced;
    burstNow(sim);
    advance(sim, 1.2);
    expect(sim.produced - before).toBe(5);
  });

  it("replaying a step is deterministic", () => {
    expect(JSON.stringify(run(3, 9))).toBe(JSON.stringify(run(3, 9)));
  });
});
