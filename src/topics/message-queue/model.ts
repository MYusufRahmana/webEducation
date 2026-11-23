/**
 * Message queue simulation: pure, deterministic, event driven.
 *
 * A producer puts messages on a FIFO queue held by a broker. Consumers take one message at a
 * time (prefetch 1). The broker keeps every delivered message as "unacknowledged" until the
 * consumer acknowledges it. If no ack arrives before the ack timeout (like a visibility timeout),
 * the broker puts the message back at the head of the queue and delivers it again.
 *
 * Every number, token and sentence on the page is read from one `MqSim` advanced by `advance()`;
 * the result does not depend on frame size.
 */

export type ConsumerId = "C1" | "C2";
export const CONSUMERS: readonly ConsumerId[] = ["C1", "C2"];

export interface MqParams {
  /** Seconds between two messages from the producer. */
  produceInterval: number;
  /** Travel time from the producer to the queue. */
  toQueue: number;
  /** Travel time from the queue head to a consumer. */
  deliver: number;
  /** Processing time at a consumer. */
  process: number;
  /** Seconds the broker waits for an ack before it delivers the message again. */
  ackTimeout: number;
  /** Messages the queue can hold; a message arriving at a full queue is rejected. */
  capacity: number;
  /** Window (seconds) for measured rates. */
  rateWindow: number;
}

/** Demonstration values, chosen to be easy to watch. Not production defaults. */
export const MQ_PARAMS: MqParams = {
  produceInterval: 2.5,
  toQueue: 0.8,
  deliver: 0.7,
  process: 0.5,
  ackTimeout: 2,
  capacity: 12,
  rateWindow: 10,
};

export const MQ_RATES = [
  { key: "slow", interval: 4 },
  { key: "normal", interval: 2.5 },
  { key: "fast", interval: 0.8 },
] as const;
export type MqRateKey = (typeof MQ_RATES)[number]["key"];

export type MessageState = "toQueue" | "queued" | "delivering" | "processing" | "acked" | "lost" | "rejected";

export interface Message {
  id: number;
  /** Order number shown to readers (#1, #2 …). */
  seq: number;
  createdAt: number;
  arriveAt: number;
  state: MessageState;
  /** Delivery attempts so far (1 on the first delivery). */
  attempt: number;
  consumer: ConsumerId | null;
  deliveredAt: number | null;
  doneAt: number | null;
  /** When the state last changed to a final one (acked, lost copy, rejected). */
  endedAt: number | null;
}

/** The broker's record of a delivered message that has not been acknowledged yet. */
export interface Unacked {
  id: number;
  consumer: ConsumerId;
  deliveredAt: number;
  deadline: number;
}

export interface ConsumerState {
  up: boolean;
  /** Attached to the queue (consumer C2 is only attached in step 5 or by the reader). */
  attached: boolean;
  current: number | null;
  done: number;
  doneTimes: number[];
}

export type MqAction =
  | { at: number; kind: "power"; consumer: ConsumerId; up: boolean }
  | { at: number; kind: "attach"; consumer: ConsumerId; attached: boolean }
  | { at: number; kind: "burst"; count: number; spacing: number }
  | { at: number; kind: "interval"; interval: number };

export type MqLog =
  | { at: number; kind: "produce"; seq: number }
  | { at: number; kind: "enqueue"; seq: number; depth: number }
  | { at: number; kind: "reject"; seq: number }
  | { at: number; kind: "deliver"; seq: number; consumer: ConsumerId; attempt: number }
  | { at: number; kind: "ack"; seq: number; consumer: ConsumerId; attempt: number }
  | { at: number; kind: "lost"; seq: number; consumer: ConsumerId }
  | { at: number; kind: "redeliver"; seq: number; attempt: number }
  | { at: number; kind: "power"; consumer: ConsumerId; up: boolean }
  | { at: number; kind: "attach"; consumer: ConsumerId; attached: boolean };

export interface MqSim {
  t: number;
  params: MqParams;
  messages: Message[];
  /** Message ids waiting in the queue, head first. */
  queue: number[];
  unacked: Unacked[];
  consumers: Record<ConsumerId, ConsumerState>;
  nextProduceAt: number;
  lastProducedAt: number | null;
  /** Extra messages scheduled by a burst. */
  pending: number[];
  script: MqAction[];
  log: MqLog[];
  nextId: number;
  nextSeq: number;
  /** Consumer to try first on the next dispatch, so idle consumers take turns. */
  turn: number;
  produced: number;
  rejected: number;
  acked: number;
  redelivered: number;
}

const EPS = 1e-9;
const KEEP_FINISHED = 2.5;
const KEEP_LOG = 120;

export function createMqSim(options: { params?: Partial<MqParams>; script?: MqAction[]; firstAt?: number; consumers?: Partial<Record<ConsumerId, Partial<ConsumerState>>> } = {}): MqSim {
  const params = { ...MQ_PARAMS, ...options.params };
  const consumer = (attached: boolean): ConsumerState => ({ up: true, attached, current: null, done: 0, doneTimes: [] });
  const sim: MqSim = {
    t: 0,
    params,
    messages: [],
    queue: [],
    unacked: [],
    consumers: { C1: consumer(true), C2: consumer(false) },
    nextProduceAt: options.firstAt ?? 0.3,
    lastProducedAt: null,
    pending: [],
    script: [...(options.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
    nextId: 1,
    nextSeq: 1,
    turn: 0,
    produced: 0,
    rejected: 0,
    acked: 0,
    redelivered: 0,
  };
  for (const id of CONSUMERS) Object.assign(sim.consumers[id], options.consumers?.[id] ?? {});
  return sim;
}

export const cloneMq = (sim: MqSim): MqSim => structuredClone(sim);
const byId = (sim: MqSim, id: number) => sim.messages.find((message) => message.id === id)!;
const push = (sim: MqSim, entry: MqLog) => {
  sim.log.push(entry);
  if (sim.log.length > KEEP_LOG) sim.log.splice(0, sim.log.length - KEEP_LOG);
};

/* ------------------------------------------------------------------ events */

type Pending =
  | { at: number; rank: 0; kind: "script"; action: MqAction }
  | { at: number; rank: 1; kind: "timeout"; record: Unacked }
  | { at: number; rank: 2; kind: "done"; message: Message }
  | { at: number; rank: 3; kind: "reach"; message: Message }
  | { at: number; rank: 4; kind: "arrive"; message: Message }
  | { at: number; rank: 5; kind: "burst"; at0: number }
  | { at: number; rank: 6; kind: "produce" };

function nextEvent(sim: MqSim, until: number): Pending | null {
  let best: Pending | null = null;
  const offer = (candidate: Pending) => {
    if (candidate.at > until + EPS) return;
    if (!best || candidate.at < best.at - EPS || (Math.abs(candidate.at - best.at) <= EPS && candidate.rank < best.rank)) best = candidate;
  };
  if (sim.script.length) offer({ at: sim.script[0].at, rank: 0, kind: "script", action: sim.script[0] });
  for (const record of sim.unacked) offer({ at: record.deadline, rank: 1, kind: "timeout", record });
  for (const message of sim.messages) {
    if (message.state === "processing" && message.doneAt !== null) offer({ at: message.doneAt, rank: 2, kind: "done", message });
    if (message.state === "delivering" && message.deliveredAt !== null) offer({ at: message.deliveredAt + sim.params.deliver, rank: 3, kind: "reach", message });
    if (message.state === "toQueue") offer({ at: message.arriveAt, rank: 4, kind: "arrive", message });
  }
  if (sim.pending.length) offer({ at: sim.pending[0], rank: 5, kind: "burst", at0: sim.pending[0] });
  offer({ at: sim.nextProduceAt, rank: 6, kind: "produce" });
  return best;
}

function produce(sim: MqSim) {
  const seq = sim.nextSeq++;
  sim.messages.push({ id: sim.nextId++, seq, createdAt: sim.t, arriveAt: sim.t + sim.params.toQueue, state: "toQueue", attempt: 0, consumer: null, deliveredAt: null, doneAt: null, endedAt: null });
  sim.produced += 1;
  sim.lastProducedAt = sim.t;
  push(sim, { at: sim.t, kind: "produce", seq });
}

/** Hand the head of the queue to every idle, running, attached consumer (prefetch 1), taking turns. */
function dispatch(sim: MqSim) {
  for (let round = 0; round < CONSUMERS.length && sim.queue.length; round++) {
    const id = CONSUMERS[(sim.turn + round) % CONSUMERS.length];
    const consumer = sim.consumers[id];
    if (!consumer.up || !consumer.attached || consumer.current !== null) continue;
    const message = byId(sim, sim.queue.shift()!);
    message.state = "delivering";
    message.consumer = id;
    message.attempt += 1;
    message.deliveredAt = sim.t;
    message.doneAt = null;
    consumer.current = message.id;
    sim.unacked.push({ id: message.id, consumer: id, deliveredAt: sim.t, deadline: sim.t + sim.params.ackTimeout });
    sim.turn = (CONSUMERS.indexOf(id) + 1) % CONSUMERS.length;
    push(sim, { at: sim.t, kind: "deliver", seq: message.seq, consumer: id, attempt: message.attempt });
    round = -1; // start the scan again so both consumers can be served in one instant
  }
}

/** The consumer loses the message it holds (it stopped or was detached); the broker still waits for an ack. */
function dropCurrent(sim: MqSim, id: ConsumerId) {
  const consumer = sim.consumers[id];
  if (consumer.current === null) return;
  const message = byId(sim, consumer.current);
  consumer.current = null;
  if (message.state === "delivering" || message.state === "processing") {
    message.state = "lost";
    message.endedAt = sim.t;
    push(sim, { at: sim.t, kind: "lost", seq: message.seq, consumer: id });
  }
}

function apply(sim: MqSim, action: MqAction) {
  switch (action.kind) {
    case "power":
      setConsumerPower(sim, action.consumer, action.up);
      break;
    case "attach":
      setAttached(sim, action.consumer, action.attached);
      break;
    case "burst":
      for (let i = 0; i < action.count; i++) sim.pending.push(sim.t + i * action.spacing);
      sim.pending.sort((a, b) => a - b);
      break;
    case "interval":
      setProduceInterval(sim, action.interval);
      break;
  }
}

function handle(sim: MqSim, event: Pending) {
  const { params } = sim;
  switch (event.kind) {
    case "script":
      sim.script.shift();
      apply(sim, event.action);
      break;
    case "timeout": {
      // no ack in time: the broker puts the message back at the head of the queue
      sim.unacked = sim.unacked.filter((record) => record !== event.record);
      const message = byId(sim, event.record.id);
      const holder = sim.consumers[event.record.consumer];
      if (holder.current === message.id) holder.current = null;
      message.state = "queued";
      message.consumer = null;
      message.deliveredAt = null;
      message.doneAt = null;
      message.endedAt = null;
      sim.queue.unshift(message.id);
      sim.redelivered += 1;
      push(sim, { at: sim.t, kind: "redeliver", seq: message.seq, attempt: message.attempt + 1 });
      break;
    }
    case "done": {
      const message = event.message;
      const consumer = sim.consumers[message.consumer!];
      message.state = "acked";
      message.endedAt = sim.t;
      consumer.current = null;
      consumer.done += 1;
      consumer.doneTimes.push(sim.t);
      sim.unacked = sim.unacked.filter((record) => record.id !== message.id);
      sim.acked += 1;
      push(sim, { at: sim.t, kind: "ack", seq: message.seq, consumer: message.consumer!, attempt: message.attempt });
      break;
    }
    case "reach": {
      const message = event.message;
      message.state = "processing";
      message.doneAt = sim.t + params.process;
      break;
    }
    case "arrive": {
      const message = event.message;
      if (sim.queue.length >= params.capacity) {
        message.state = "rejected";
        message.endedAt = sim.t;
        sim.rejected += 1;
        push(sim, { at: sim.t, kind: "reject", seq: message.seq });
        break;
      }
      message.state = "queued";
      sim.queue.push(message.id);
      push(sim, { at: sim.t, kind: "enqueue", seq: message.seq, depth: sim.queue.length });
      break;
    }
    case "burst":
      sim.pending.shift();
      produce(sim);
      break;
    case "produce":
      produce(sim);
      sim.nextProduceAt = sim.t + params.produceInterval;
      break;
  }
}

function prune(sim: MqSim) {
  sim.messages = sim.messages.filter((message) => message.endedAt === null || sim.t - message.endedAt < KEEP_FINISHED);
  for (const id of CONSUMERS) {
    const times = sim.consumers[id].doneTimes;
    while (times.length && times[0] <= sim.t - sim.params.rateWindow - EPS) times.shift();
  }
}

export function advance(sim: MqSim, dt: number): MqSim {
  const until = sim.t + Math.max(0, dt);
  dispatch(sim);
  for (let guard = 0; guard < 100000; guard++) {
    const event = nextEvent(sim, until);
    if (!event) break;
    sim.t = Math.max(sim.t, event.at);
    handle(sim, event);
    dispatch(sim);
  }
  sim.t = until;
  prune(sim);
  return sim;
}

/* ------------------------------------------------------------------ actions */

export function setConsumerPower(sim: MqSim, id: ConsumerId, up: boolean) {
  const consumer = sim.consumers[id];
  if (consumer.up === up) return;
  consumer.up = up;
  if (!up) dropCurrent(sim, id);
  push(sim, { at: sim.t, kind: "power", consumer: id, up });
  dispatch(sim);
}

export function setAttached(sim: MqSim, id: ConsumerId, attached: boolean) {
  const consumer = sim.consumers[id];
  if (consumer.attached === attached) return;
  consumer.attached = attached;
  if (!attached) dropCurrent(sim, id);
  push(sim, { at: sim.t, kind: "attach", consumer: id, attached });
  dispatch(sim);
}

export function setProduceInterval(sim: MqSim, interval: number) {
  sim.params = { ...sim.params, produceInterval: interval };
  sim.nextProduceAt = Math.max(sim.t, (sim.lastProducedAt ?? sim.t) + interval);
}

/** Five messages at once, as a sudden burst of work. */
export function burstNow(sim: MqSim, count = 5) {
  apply(sim, { at: sim.t, kind: "burst", count, spacing: 0.25 });
}

export const mqRateKeyOf = (sim: MqSim): MqRateKey => MQ_RATES.find((rate) => Math.abs(rate.interval - sim.params.produceInterval) < EPS)?.key ?? "normal";

/* ------------------------------------------------------------------ readings */

export const queuedMessages = (sim: MqSim) => sim.queue.map((id) => byId(sim, id));

/** Seconds the oldest waiting message has waited in the queue, or 0. */
export function oldestWait(sim: MqSim) {
  const head = sim.queue[0];
  if (head === undefined) return 0;
  const message = byId(sim, head);
  return Math.max(0, sim.t - message.arriveAt);
}

export function consumerRate(sim: MqSim, id: ConsumerId): number | null {
  const window = Math.min(sim.params.rateWindow, sim.t);
  if (window < 3) return null;
  return sim.consumers[id].doneTimes.filter((at) => at > sim.t - window + EPS).length / window;
}

/** Most recent completions, oldest first, for the order strip. */
export function recentAcks(sim: MqSim, count = 9) {
  return sim.log.filter((entry): entry is Extract<MqLog, { kind: "ack" }> => entry.kind === "ack").slice(-count);
}
