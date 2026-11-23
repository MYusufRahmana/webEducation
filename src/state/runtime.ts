import type { Bilingual } from "../content/topic";
import type { TopicModule, TopicSim } from "../topics/types";

/**
 * The simulation runtime: one requestAnimationFrame loop that advances the
 * model and asks the figure to draw. React reads a throttled snapshot through
 * `subscribe`/`getSnapshot`, so the page itself never re-renders per frame.
 */

export type Mode = "follow" | "explore";
export type Announcement = { kind: "event"; text: Bilingual } | { kind: "held" | "paused" | "resumed" | "explore" | "follow" };
type Sim = TopicSim;

export interface Snapshot {
  version: number;
  sim: Sim;
  step: number;
  mode: Mode;
  paused: boolean;
  held: boolean;
  /** False while the reader is still on the hero: the figure runs the normal demo without step highlights. */
  learning: boolean;
  atEnd: boolean;
  /** Which pass of the active step's demonstration is playing (1 = first). */
  cycle: number;
  announcement: { id: number; value: Announcement } | null;
}

type Drawer = (sim: Sim, dt: number, info: { paused: boolean; reduced: boolean }) => void;

const MAX_DT = 1 / 30;
const EMIT_EVERY = 0.2; // seconds of wall time between snapshot refreshes

export class Runtime {
  private sim: Sim;
  private step = 0;
  private mode: Mode = "follow";
  private paused = false;
  private held = false;
  private learning = true;
  /** Showing the end state of the step (the summary), not its demonstration. */
  private atEnd = false;
  private cycle = 1;
  private version = 0;
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private drawers = new Set<Drawer>();
  private frame = 0;
  private last = 0;
  private sinceEmit = 0;
  private visible = true;
  private pageVisible = typeof document === "undefined" ? true : document.visibilityState !== "hidden";
  private announced = 0;
  private announcement: Snapshot["announcement"] = null;
  private lastSeen: unknown;
  private reducedQuery: MediaQueryList | null = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;

  readonly topic: TopicModule<any>;

  constructor(topic: TopicModule<any>, private readonly options: { repeat?: boolean } = {}) {
    this.topic = topic;
    this.sim = topic.steps[0].build();
    this.lastSeen = this.sim.log[this.sim.log.length - 1];
    this.snapshot = this.makeSnapshot();
  }

  /** Start listening to page visibility. Paired with dispose(); safe to call again after it. */
  connect() {
    document.addEventListener("visibilitychange", this.onVisibility);
    this.pageVisible = document.visibilityState !== "hidden";
    this.kick();
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.onVisibility);
  }

  /* ---------------------------------------------------------- React side */
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.snapshot;

  get currentStep() { return this.step; }

  get reduced() {
    return Boolean(this.reducedQuery?.matches);
  }

  /* ---------------------------------------------------------- figure side */
  addDrawer(draw: Drawer) {
    this.drawers.add(draw);
    draw(this.sim, 0, { paused: this.paused, reduced: this.reduced });
    this.kick();
    return () => {
      this.drawers.delete(draw);
    };
  }
  setVisible(visible: boolean) {
    this.visible = visible;
    this.kick();
  }

  /**
   * Entering the learning area activates the current step once without rebuilding it:
   * the hero already runs step 1's normal demonstration, so nothing resets.
   */
  setLearning(learning: boolean) {
    if (this.learning === learning) return;
    this.learning = learning;
    this.redraw();
  }

  /* ---------------------------------------------------------- commands */
  /**
   * Show a step from its deterministic start and run its demonstration once (also used by "Ulangi langkah").
   * With `end`, jump straight to the step's final state and hold it (the lesson summary).
   * Always returns to follow mode: choosing a step ends free exploration.
   */
  setStep(index: number, { end = false }: { end?: boolean } = {}) {
    const clamped = Math.max(0, Math.min(this.topic.steps.length - 1, index));
    const switching = this.mode !== "follow";
    const config = this.topic.steps[clamped];
    this.step = clamped;
    this.atEnd = end;
    this.cycle = 1;
    this.sim = config.build();
    this.held = false;
    this.paused = false;
    if (end && config.holdAt !== undefined) {
      this.topic.advance(this.sim, Math.max(0, config.holdAt - this.sim.t));
      this.held = true;
    }
    this.lastSeen = this.sim.log[this.sim.log.length - 1];
    this.mode = "follow";
    if (switching) this.announce({ kind: "follow" });
    this.redraw();
  }
  replay() {
    this.setStep(this.step, { end: this.atEnd });
  }
  explore() {
    if (this.mode === "explore") return;
    this.mode = "explore";
    this.held = false;
    this.topic.onExplore?.(this.sim);
    this.announce({ kind: "explore" });
    this.redraw();
  }
  backToExplanation() {
    this.setStep(this.step, { end: this.atEnd });
  }
  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    this.announce({ kind: paused ? "paused" : "resumed" });
    this.redraw();
  }
  /**
   * A change made by the reader in free exploration: switches to exploration (if needed), applies the
   * change to the simulation and returns its result.
   */
  /** Set while a button drawn inside the figure acts: its controls are already visible, no drawer needed. */
  actingFromFigure = false;

  act<T>(change: (sim: any) => T): T {
    this.explore();
    const result = change(this.sim);
    this.collectAnnouncements();
    this.redraw();
    return result;
  }

  /* ---------------------------------------------------------- loop */
  private onVisibility = () => {
    this.pageVisible = document.visibilityState !== "hidden";
    this.kick();
  };
  private running() {
    return this.visible && this.pageVisible;
  }
  private kick() {
    if (this.frame || !this.running()) return;
    this.last = 0;
    this.frame = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    this.frame = 0;
    if (!this.running()) return;
    const dt = this.last ? Math.min((now - this.last) / 1000, MAX_DT) : 1 / 60;
    this.last = now;
    if (!this.paused && !this.held) {
      const hold = this.mode === "follow" ? this.topic.steps[this.step].holdAt : undefined;
      const simDt = dt * (this.topic.pace ?? 1);
      const room = hold === undefined ? simDt : Math.max(0, hold - this.sim.t);
      this.topic.advance(this.sim, Math.min(simDt, room));
      this.collectAnnouncements();
      if (hold !== undefined && this.sim.t >= hold - 1e-9) {
        if (this.options.repeat !== false && !this.atEnd) {
          // Replay only this scene's event window, never leak the next lesson's event.
          this.sim = this.topic.steps[this.step].build();
          this.cycle += 1;
          this.emit();
          this.lastSeen = this.sim.log[this.sim.log.length - 1];
        } else {
          this.held = true;
          this.announce({ kind: "held" });
        }
      }
    }
    for (const draw of this.drawers) draw(this.sim, dt, { paused: this.paused || this.held, reduced: this.reduced });
    this.sinceEmit += dt;
    if (this.sinceEmit >= EMIT_EVERY) this.emit();
    this.frame = requestAnimationFrame(this.tick);
  };

  private redraw() {
    for (const draw of this.drawers) draw(this.sim, 0, { paused: this.paused || this.held, reduced: this.reduced });
    this.emit();
    this.kick();
  }
  private collectAnnouncements() {
    const log = this.sim.log;
    // the log is trimmed at the front; read only the entries after the last one seen
    const fresh: unknown[] = [];
    for (let i = log.length - 1; i >= 0 && log[i] !== this.lastSeen; i--) fresh.unshift(log[i]);
    this.lastSeen = log[log.length - 1];
    for (const entry of fresh) {
      const text = this.topic.announce(entry);
      if (text) this.announce({ kind: "event", text });
    }
  }
  private announce(value: Announcement) {
    this.announcement = { id: ++this.announced, value };
    this.emit();
  }
  private emit() {
    this.sinceEmit = 0;
    this.version += 1;
    this.snapshot = this.makeSnapshot();
    for (const listener of this.listeners) listener();
  }
  private makeSnapshot(): Snapshot {
    return { version: this.version, sim: this.sim, step: this.step, mode: this.mode, paused: this.paused, held: this.held, learning: this.learning, atEnd: this.atEnd, cycle: this.cycle, announcement: this.announcement };
  }
}
