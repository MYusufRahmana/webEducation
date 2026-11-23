import { advance, createSim, type ScriptAction, type Sim } from "./model";

/**
 * Step configuration: which simulation state each learning step starts from.
 *
 * Steps 3–5 are windows on one story, so their counters continue from each
 * other: B stops at t = 4.2 s (just after a passing check), the load balancer
 * keeps sending to it until two checks have failed, and B is switched back on
 * at t = 16 s. Every window is rebuilt from t = 0, so "Ulangi langkah" always
 * replays exactly the same events.
 */

export type StepKey = "why" | "round-robin" | "server-down" | "health-check" | "recovery";
export type PartKey = "client" | "feed" | "lb" | "pins" | "selector" | "lanes" | "hc" | "probes" | "serverA" | "serverB" | "serverC";

export interface StepConfig {
  key: StepKey;
  /** Parts drawn with the lit accent while this step is active. */
  highlight: PartKey[];
  /** Builds the starting simulation of this step. */
  build: () => Sim;
  /** The demonstration holds still at this simulated time (step 3 stops before detection). */
  holdAt?: number;
}

export const B_STOPS_AT = 4.2;
export const STEP3_FROM = 3.0;
export const STEP3_HOLD = 9.8;
export const STEP5_FROM = 15.0;
export const B_RESTARTS_AT = 16.0;

const failure: ScriptAction = { at: B_STOPS_AT, kind: "power", server: "B", up: false };
const restart: ScriptAction = { at: B_RESTARTS_AT, kind: "power", server: "B", up: true };

const base = () => createSim();
const singleServer = () => {
  const sim = createSim({firstRoundAt: Infinity});
  for (const id of ["B", "C"] as const) { sim.servers[id].up = false; sim.servers[id].healthy = false; }
  return sim;
};
const story = () => createSim({ script: [failure] });
const storyAt = (t: number, extra: ScriptAction[] = []) => {
  const sim = advance(story(), t);
  sim.script = [...sim.script, ...extra].sort((a, b) => a.at - b.at);
  return sim;
};

export const STEPS: StepConfig[] = [
  { key: "why", highlight: ["client", "feed", "serverA"], build: singleServer, holdAt: 4.5 },
  { key: "round-robin", highlight: ["selector", "lanes", "serverA", "serverB", "serverC"], build: base, holdAt: 9 },
  { key: "server-down", highlight: ["serverB"], build: () => storyAt(STEP3_FROM), holdAt: STEP3_HOLD },
  { key: "health-check", highlight: ["hc", "probes", "pins"], build: () => storyAt(STEP3_HOLD), holdAt: 14.5 },
  { key: "recovery", highlight: ["serverB", "hc", "pins"], build: () => storyAt(STEP5_FROM, [restart]), holdAt: 24 },
];

export const stepIndexOf = (key: StepKey) => STEPS.findIndex((step) => step.key === key);
