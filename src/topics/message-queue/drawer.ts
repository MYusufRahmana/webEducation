import ART from "./art.generated.json";
import { iso, lineOnTop, translateAlong } from "../../figure/kit/iso-kit.mjs";
import { slotFor, track, type Plane, type SlotItem, type Vec3 } from "../../figure/slotting";
import { CONSUMERS, type ConsumerId, type Message, type MqSim } from "./model";

/**
 * Draws one message-queue state onto the figure built by scripts/build-figure-mq.mjs. Only
 * attributes change per frame: card positions and variants, gates, needles, lamps and ack pulses.
 */

const P = ART.P as { origin: [number, number]; scale: number; azimuth: number; elevation: number };
const V = ART.V as number[];
const ITEMS = ART.items as SlotItem[];
const CARD_POOL = 24;
const PULSE_POOL = 4;

export const MQ_FIGURE_LABEL = ART.label as { id: string; en: string };

const PRODUCE = track(ART.produce);
const DELIVER = Object.fromEntries(CONSUMERS.map((id) => [id, ART.deliver[id]])) as Record<ConsumerId, number[][]>;
const ACK = Object.fromEntries(CONSUMERS.map((id) => [id, track(ART.ack[id])])) as Record<ConsumerId, ReturnType<typeof track>>;
const { head, pitch, z: RACK_Z, entry } = ART.slot;
const T = ART.tile;
const cardExtent = (n: Plane) => (T.w / 2) * Math.abs(n[0]) + (T.d / 2) * Math.abs(n[1]) + (T.h / 2) * Math.abs(n[2]);
const pulseExtent = () => 1.2;
/** Screen box of a card standing at `point`. */
function cardBox(point: Vec3) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const dx of [-T.w / 2, T.w / 2]) for (const dy of [-T.d / 2, T.d / 2]) for (const dz of [0, T.h]) {
    const [sx, sy] = iso([point[0] + dx, point[1] + dy, point[2] + dz], P);
    x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
  }
  return [x0, y0, x1, y1];
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const follow = (current: number, target: number, dt: number, tau: number) => (dt <= 0 ? target : current + (target - current) * (1 - Math.exp(-dt / tau)));

type Variant = "up" | "retry" | "fail" | "ghost";
interface Card {
  el: SVGGElement;
  variants: Record<Variant, SVGGElement>;
  slot: number;
  used: boolean;
}

export class MqDrawer {
  private svg: SVGSVGElement;
  private layer: SVGGElement;
  private items: SVGGElement[];
  private cards: Card[] = [];
  private pulses: { el: SVGCircleElement; slot: number; used: boolean }[] = [];
  /** Where each message is drawn on the rack (x), eased toward its slot so the queue slides forward. */
  private rackX = new Map<number, number>();
  /** Where a message was drawn when it left the rack or a lane, so its next leg starts there. */
  private lastPoint = new Map<number, Vec3>();
  /** Where each delivery started, fixed for the whole leg. */
  private deliverStart = new Map<number, Vec3>();
  private gates = new Map<ConsumerId, { el: SVGGElement; open: number }>();

  constructor(host: HTMLElement) {
    host.innerHTML = `<svg class="iso-svg lb-svg mq-svg" viewBox="0 0 ${ART.width} ${ART.height}" role="img" focusable="false">${ART.svg}</svg>`;
    this.svg = host.querySelector("svg")!;
    this.layer = this.svg.querySelector(".lb-items")!;
    this.items = Array.from(this.layer.children) as SVGGElement[];
    for (let i = 0; i < CARD_POOL; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
      el.setAttribute("class", "lb-token mq-card");
      el.innerHTML = (["up", "retry", "fail", "ghost"] as Variant[]).map((v) => `<g data-v="${v}">${T[v]}</g>`).join("");
      el.style.display = "none";
      this.layer.appendChild(el);
      const variants = Object.fromEntries(Array.from(el.children).map((child) => [(child as SVGGElement).dataset.v, child])) as Record<Variant, SVGGElement>;
      this.cards.push({ el, variants, slot: -1, used: false });
    }
    for (let i = 0; i < PULSE_POOL; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      el.setAttribute("class", "lb-pulse");
      el.setAttribute("r", "2");
      el.style.display = "none";
      this.layer.appendChild(el);
      this.pulses.push({ el, slot: -1, used: false });
    }
    for (const el of Array.from(this.svg.querySelectorAll<SVGGElement>('[data-live="gate"]'))) this.gates.set(el.dataset.consumer as ConsumerId, { el, open: 1 });
  }

  partAt(node: Element | null): string | null {
    const part = node?.closest<SVGGElement>(".it")?.dataset.part;
    return part && part !== "base" ? part : null;
  }
  setLabel(text: string) {
    this.svg.setAttribute("aria-label", text);
  }
  setVisual({ highlight, selected }: { highlight: string[]; selected: string | null }) {
    const lit = new Set<string>([...highlight, ...(selected ? [selected] : [])]);
    this.svg.toggleAttribute("data-focus", lit.size > 0);
    for (const item of this.items) {
      item.toggleAttribute("data-hl", lit.has(item.dataset.part ?? ""));
      item.toggleAttribute("data-sel", Boolean(selected) && item.dataset.part === selected);
    }
  }

  draw(sim: MqSim, dt: number, { reduced }: { paused: boolean; reduced: boolean }) {
    const t = sim.t;
    const { toQueue, deliver, process, ackTimeout } = sim.params;
    const motion = reduced ? 0 : dt;
    for (const card of this.cards) card.used = false;
    let next = 0;
    const place = (point: Vec3, variant: Variant, opacity = 1) => {
      const card = this.cards[next++];
      if (!card) return;
      card.used = true;
      card.el.style.display = "";
      card.el.setAttribute("transform", translateAlong(P, point));
      card.el.style.opacity = opacity >= 0.999 ? "" : String(Math.max(0, opacity));
      for (const v of Object.keys(card.variants) as Variant[]) card.variants[v].style.display = v === variant ? "" : "none";
      this.slot(card, slotFor(ITEMS, V, [point[0], point[1], point[2] + T.h / 2], cardExtent, undefined, cardBox(point)));
    };

    // the queue: each waiting card slides toward its slot (head first)
    const position = new Map<number, number>();
    sim.queue.forEach((id, index) => position.set(id, index));
    const seen = new Set<number>();
    for (const message of sim.messages) {
      seen.add(message.id);
      const point = this.pointOf(message, sim, position, motion, { toQueue, deliver, process });
      if (!point) continue;
      if (message.state === "queued" || message.state === "toQueue") {
        place(point, message.state === "queued" && message.attempt > 0 ? "retry" : "up");
      } else if (message.state === "delivering" || message.state === "processing") {
        place(point, message.attempt > 1 ? "retry" : "up");
      } else if (message.state === "acked") {
        const age = t - (message.endedAt ?? t);
        if (age < 0.45 && !reduced) place(point, message.attempt > 1 ? "retry" : "up", 1 - age / 0.45);
      } else {
        // a lost copy or a rejected card: crossed, then fades
        const age = t - (message.endedAt ?? t);
        place(point, "fail", 1 - clamp01((age - 1.2) / 0.8));
      }
    }
    for (const id of Array.from(this.rackX.keys())) if (!seen.has(id)) this.rackX.delete(id);
    for (const id of Array.from(this.lastPoint.keys())) if (!seen.has(id)) this.lastPoint.delete(id);
    for (const id of Array.from(this.deliverStart.keys())) if (!seen.has(id)) this.deliverStart.delete(id);

    // copies waiting for an ack, stacked in each consumer's bay
    const stacks: Record<ConsumerId, number> = { C1: 0, C2: 0 };
    for (const record of sim.unacked) {
      const bay = ART.bay[record.consumer];
      place([bay[0], bay[1], bay[2] + stacks[record.consumer] * T.h], "ghost");
      stacks[record.consumer] += 1;
    }
    for (const card of this.cards) if (!card.used) card.el.style.display = "none";

    // timer needles: the oldest copy of each consumer counts down to its timeout
    for (const id of CONSUMERS) {
      const oldest = sim.unacked.find((record) => record.consumer === id);
      const share = oldest ? clamp01((t - oldest.deliveredAt) / ackTimeout) : 0;
      this.needle(`[data-live="timer"][data-consumer="${id}"]`, ART.timer[id], share);
      const consumer = sim.consumers[id];
      const holding = consumer.current === null ? null : sim.messages.find((message) => message.id === consumer.current);
      const progress = holding && holding.state === "processing" && holding.doneAt !== null ? clamp01(1 - (holding.doneAt - t) / process) : 0;
      this.needle(`[data-live="progress"][data-consumer="${id}"]`, ART.progress[id], progress);
      this.flag(`[data-live="power"][data-consumer="${id}"]`, consumer.up);
      const acked = sim.log.some((entry) => entry.kind === "ack" && entry.consumer === id && t - entry.at < 0.35);
      this.flag(`[data-live="ack"][data-consumer="${id}"]`, acked);
      const gate = this.gates.get(id);
      if (gate) {
        const target = consumer.attached ? 1 : 0;
        gate.open = motion > 0 ? follow(gate.open, target, motion, 0.12) : target;
        if (Math.abs(gate.open - target) < 0.002) gate.open = target;
        gate.el.setAttribute("transform", translateAlong(P, [0, 0, ART.gateTravel * gate.open]));
      }
    }
    this.flag('[data-live="send"]', sim.lastProducedAt !== null && t - sim.lastProducedAt < 0.25);
    const rate = sim.params.produceInterval >= 4 ? "slow" : sim.params.produceInterval <= 0.8 ? "fast" : "normal";
    for (const knob of Array.from(this.svg.querySelectorAll<SVGGElement>('[data-live="knob"]'))) knob.style.display = knob.dataset.rate === rate ? "" : "none";

    // ack pulses travel from the consumer to the broker
    for (const pulse of this.pulses) pulse.used = false;
    let p = 0;
    if (!reduced) {
      for (const entry of sim.log) {
        if (entry.kind !== "ack") continue;
        const age = t - entry.at;
        if (age < 0 || age > 0.45) continue;
        const pulse = this.pulses[p++];
        if (!pulse) break;
        const point = ACK[entry.consumer].frac(age / 0.45);
        const [x, y] = iso(point, P);
        pulse.used = true;
        pulse.el.style.display = "";
        pulse.el.setAttribute("cx", x.toFixed(1));
        pulse.el.setAttribute("cy", y.toFixed(1));
        this.slot(pulse, slotFor(ITEMS, V, point, pulseExtent, `ackLines.cable${entry.consumer}`));
      }
    }
    for (const pulse of this.pulses) if (!pulse.used) pulse.el.style.display = "none";
  }

  /** Where a message is drawn now, or null when it is hidden. */
  private pointOf(message: Message, sim: MqSim, position: Map<number, number>, motion: number, { toQueue, deliver }: { toQueue: number; deliver: number; process: number }): Vec3 | null {
    const t = sim.t;
    const remember = (point: Vec3) => {
      this.lastPoint.set(message.id, point);
      return point;
    };
    switch (message.state) {
      case "toQueue":
        return remember(PRODUCE.frac((t - message.createdAt) / toQueue));
      case "queued": {
        this.deliverStart.delete(message.id);
        const index = position.get(message.id) ?? 0;
        const target = head - index * pitch;
        const from = this.rackX.get(message.id) ?? (message.attempt > 0 ? head : entry);
        const x = motion > 0 ? follow(from, target, motion, 0.22) : target;
        this.rackX.set(message.id, Math.abs(x - target) < 0.05 ? target : x);
        return remember([this.rackX.get(message.id)!, 0, RACK_Z]);
      }
      case "delivering":
      case "processing": {
        // from wherever the card was on the rack, through the broker, out of the gate onto the anvil
        if (!this.deliverStart.has(message.id)) {
          this.deliverStart.set(message.id, this.rackX.has(message.id) ? [this.rackX.get(message.id)!, 0, RACK_Z] : [head, 0, RACK_Z]);
          this.rackX.delete(message.id);
        }
        const start = this.deliverStart.get(message.id)!;
        const path = track([start, ...DELIVER[message.consumer!]]);
        const since = t - (message.deliveredAt ?? t);
        return remember(path.frac(since / deliver));
      }
      case "acked": {
        const age = t - (message.endedAt ?? t);
        const from = ART.anvil[message.consumer!] as number[];
        const into = ART.intoBody[message.consumer!] as number[];
        const s = clamp01(age / 0.45);
        return [from[0] + (into[0] - from[0]) * s, from[1] + (into[1] - from[1]) * s, from[2]];
      }
      case "lost":
        return this.lastPoint.get(message.id) ?? (ART.anvil[message.consumer ?? "C1"] as Vec3);
      case "rejected":
        return [entry, 0, RACK_Z];
    }
  }

  private needle(selector: string, [x, y, z, r]: number[], share: number) {
    const el = this.svg.querySelector(selector);
    if (!el) return;
    const a = share * Math.PI * 2;
    el.setAttribute("d", lineOnTop([x, y], [x + Math.sin(a) * r, y - Math.cos(a) * r], z, P));
  }
  private slot(entry: { el: SVGElement; slot: number }, slot: number) {
    if (entry.slot === slot && entry.el.parentNode === this.layer) return;
    entry.slot = slot;
    this.layer.insertBefore(entry.el, this.items[slot] ?? null);
  }
  private flag(selector: string, on: boolean) {
    for (const el of Array.from(this.svg.querySelectorAll(selector))) el.toggleAttribute("data-on", on);
  }
}
