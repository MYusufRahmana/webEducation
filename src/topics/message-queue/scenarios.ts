import { createMqSim, type MqSim } from "./model";

/**
 * Step configuration for the message queue topic. Each step starts from its own deterministic
 * simulation, so "Replay step" always shows the same events.
 */

export type MqStepKey = "why" | "buffer" | "consumer-down" | "ack" | "scale";
export type MqPartKey = "producer" | "conveyor" | "queue" | "broker" | "unacked" | "lanes" | "consumer1" | "consumer2" | "ackLines";

export interface MqStepConfig {
  key: MqStepKey;
  highlight: MqPartKey[];
  build: () => MqSim;
  holdAt?: number;
}

export const BURST_AT = 3;
export const C1_STOPS_AT = 5;
export const STEP3_HOLD = 14;
export const C1_CRASH_AT = 4.5;
export const C1_BACK_AT = 5.4;
export const C2_JOINS_AT = 8;
export const FAST = 0.7;

export const MQ_STEPS: MqStepConfig[] = [
  { key: "why", highlight: ["producer", "queue", "consumer1"], build: () => createMqSim(), holdAt: 7.6 },
  {
    key: "buffer",
    highlight: ["queue", "conveyor"],
    build: () => createMqSim({ script: [{ at: BURST_AT, kind: "burst", count: 6, spacing: 0.25 }] }),
    holdAt: 18.2,
  },
  {
    key: "consumer-down",
    highlight: ["consumer1", "queue"],
    build: () => createMqSim({ script: [{ at: C1_STOPS_AT, kind: "power", consumer: "C1", up: false }] }),
    holdAt: STEP3_HOLD,
  },
  {
    key: "ack",
    highlight: ["unacked", "ackLines", "consumer1"],
    build: () =>
      createMqSim({
        script: [
          { at: C1_CRASH_AT, kind: "power", consumer: "C1", up: false },
          { at: C1_BACK_AT, kind: "power", consumer: "C1", up: true },
        ],
      }),
    holdAt: 8.2,
  },
  {
    key: "scale",
    highlight: ["consumer2", "lanes", "queue"],
    build: () => createMqSim({ params: { produceInterval: FAST }, script: [{ at: C2_JOINS_AT, kind: "attach", consumer: "C2", attached: true }] }),
    holdAt: 16,
  },
];
