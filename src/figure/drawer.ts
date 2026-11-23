import ART from "./art.generated.json";
import { extrude, iso, translateAlong } from "./kit/iso-kit.mjs";
import type { Request, ServerId, Sim } from "../sim/model";
import type { PartKey } from "../sim/scenarios";

/**
 * Draws one simulation state onto the figure built by scripts/build-figure.mjs.
 *
 * Static parts are the kit's art, in the settled painter's order. Live parts
 * write attributes only: tokens and pulses are moved with transforms and slotted
 * into that order by the convex planes of each part, shutters slide, pins and
 * lamps toggle, and the selector arm is rebuilt with the kit's `extrude`.
 */

type Vec3 = [number, number, number];
type Plane = [number, number, number, number];
interface ItemInfo {
  part: string;
  planes: Plane[] | null;
  contain: boolean;
  cable: { name: string; box: [number, number][] } | null;
}

const P = ART.P as { origin: [number, number]; scale: number; azimuth: number; elevation: number };
const V = ART.V as Vec3;
const ITEMS = ART.items as ItemInfo[];
const SERVERS: ServerId[] = ["A", "B", "C"];
const TOKEN_POOL = 16;
const PULSE_POOL = 8;

export const FIGURE_SIZE = { width: ART.width, height: ART.height };
export const FIGURE_LABEL = ART.label as { id: string; en: string };

const lerp3 = (a: number[], b: number[], t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** A polyline with arc-length lookup. */
function track(points: number[][]) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]));
  const total = lengths[lengths.length - 1];
  const at = (distance: number): Vec3 => {
    const d = Math.max(0, Math.min(total, distance));
    let i = 1;
    while (i < points.length - 1 && lengths[i] < d) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    return lerp3(points[i - 1], points[i], (d - lengths[i - 1]) / span);
  };
  return { total, lengths, at, frac: (t: number) => at(t * total) };
}

const FEED = track(ART.feed);
const LANES = Object.fromEntries(SERVERS.map((id) => [id, track(ART.lanes[id].path)])) as Record<ServerId, ReturnType<typeof track>>;
/** Arc length on each lane where the token reaches the port face. */
const PORT_AT = Object.fromEntries(SERVERS.map((id) => [id, LANES[id].lengths[1]])) as Record<ServerId, number>;
const STOP_AT = Object.fromEntries(
  SERVERS.map((id) => {
    const stop = ART.lanes[id].stop as number[];
    return [id, Math.hypot(stop[0], stop[1])];
  }),
) as Record<ServerId, number>;
const PROBES = Object.fromEntries(SERVERS.map((id) => [id, track(ART.probes[id])])) as Record<ServerId, ReturnType<typeof track>>;
const STATUS = track(ART.status);
const ANGLE = ART.angles as Record<ServerId, number>;

/** Index in the settled order after which a small live object at `p` must be drawn. */
function slotFor(p: Vec3, extent: (n: Plane) => number, cable?: string): number {
  let front = -1;
  for (let i = 0; i < ITEMS.length; i++) {
    const item = ITEMS[i];
    if (item.cable) {
      if (cable && item.cable.name === cable) {
        const b = item.cable.box;
        if (p[0] >= b[0][0] && p[0] <= b[0][1] && p[1] >= b[1][0] && p[1] <= b[1][1] && p[2] >= b[2][0] && p[2] <= b[2][1]) front = Math.max(front, i);
      }
      continue;
    }
    if (!item.planes) continue;
    let separated = 0;
    for (const n of item.planes) {
      const out = n[0] * p[0] + n[1] * p[1] + n[2] * p[2] - n[3];
      if (out >= extent(n) - 0.02) {
        separated = n[0] * V[0] + n[1] * V[1] + n[2] * V[2] > 0 ? 1 : -1;
        if (separated > 0) break;
      }
    }
    if (separated > 0) front = Math.max(front, i);
  }
  return front + 1;
}
const tokenExtent = (n: Plane) => ART.token.r * Math.hypot(n[0], n[1]) + (ART.token.h / 2) * Math.abs(n[2]);
const pulseExtent = () => 1.2;

const easeOut = (current: number, target: number, dt: number, tau: number) => (dt <= 0 ? current : current + (target - current) * (1 - Math.exp(-dt / tau)));

export interface Visual {
  highlight: PartKey[];
  selected: PartKey | null;
}

export class FigureDrawer {
  private svg: SVGSVGElement;
  private layer: SVGGElement;
  private items: SVGGElement[];
  private tokens: { el: SVGGElement; up: SVGGElement; fail: SVGGElement; slot: number; used: boolean }[] = [];
  private pulses: { el: SVGCircleElement; slot: number; used: boolean }[] = [];
  private shutters = new Map<ServerId, { el: SVGGElement; open: number }>();
  private armPaths: SVGPathElement[];
  private armAngle = ANGLE.A;
  private lastArmKey = "";

  constructor(host: HTMLElement) {
    host.innerHTML = `<svg class="iso-svg lb-svg" viewBox="0 0 ${ART.width} ${ART.height}" role="img" focusable="false">${ART.svg}</svg>`;
    this.svg = host.querySelector("svg")!;
    this.layer = this.svg.querySelector(".lb-items")!;
    this.items = Array.from(this.layer.children) as SVGGElement[];
    const tokenUp = ART.token.up;
    const tokenFail = ART.token.fail;
    for (let i = 0; i < TOKEN_POOL; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
      el.setAttribute("class", "lb-token");
      el.innerHTML = `<g data-v="up">${tokenUp}</g><g data-v="fail">${tokenFail}</g>`;
      el.style.display = "none";
      this.layer.appendChild(el);
      this.tokens.push({ el, up: el.firstElementChild as SVGGElement, fail: el.lastElementChild as SVGGElement, slot: -1, used: false });
    }
    for (let i = 0; i < PULSE_POOL; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      el.setAttribute("class", "lb-pulse");
      el.setAttribute("r", "2.1");
      el.style.display = "none";
      this.layer.appendChild(el);
      this.pulses.push({ el, slot: -1, used: false });
    }
    for (const el of Array.from(this.svg.querySelectorAll<SVGGElement>('[data-live="shutter"]'))) this.shutters.set(el.dataset.server as ServerId, { el, open: 1 });
    this.armPaths = Array.from(this.svg.querySelectorAll<SVGPathElement>('[data-live="arm"] path'));
  }

  /** The part key under a DOM node inside the figure, if any. */
  partAt(node: Element | null): PartKey | null {
    const item = node?.closest<SVGGElement>(".it");
    const part = item?.dataset.part;
    return part && part !== "base" ? (part as PartKey) : null;
  }

  setLabel(text: string) {
    this.svg.setAttribute("aria-label", text);
  }

  setVisual({ highlight, selected }: Visual) {
    const lit = new Set<string>([...highlight, ...(selected ? [selected] : [])]);
    this.svg.toggleAttribute("data-focus", lit.size > 0);
    for (const item of this.items) {
      const on = lit.has(item.dataset.part ?? "");
      if (on) item.setAttribute("data-hl", "");
      else item.removeAttribute("data-hl");
      if (selected && item.dataset.part === selected) item.setAttribute("data-sel", "");
      else item.removeAttribute("data-sel");
    }
  }

  draw(sim: Sim, dt: number, { reduced }: { paused: boolean; reduced: boolean }) {
    const t = sim.t;
    const { toLb, toServer } = sim.params;
    const motion = reduced ? 0 : dt;

    /* tokens */
    for (const token of this.tokens) token.used = false;
    let next = 0;
    const place = (request: Request, point: Vec3, failed: boolean, opacity: number) => {
      const token = this.tokens[next++];
      if (!token) return;
      token.used = true;
      token.el.style.display = "";
      token.el.setAttribute("transform", translateAlong(P, [point[0], point[1], 0]));
      token.el.style.opacity = opacity >= 0.999 ? "" : String(Math.max(0, opacity));
      token.up.style.display = failed ? "none" : "";
      token.fail.style.display = failed ? "" : "none";
      token.el.dataset.id = String(request.id);
      this.slot(token, slotFor([point[0], point[1], point[2] + ART.token.h / 2], tokenExtent));
    };
    // failed tokens queue in front of a closed shutter: the oldest touches it, newer ones wait behind
    const QUEUE = ART.token.r * 2 + 0.8;
    const queued: Record<ServerId, Request[]> = { A: [], B: [], C: [] };
    for (const request of sim.requests) if (request.outcome === "fail" && request.target) queued[request.target].push(request);
    for (const id of SERVERS) queued[id].sort((a, b) => (a.resolvedAt ?? 0) - (b.resolvedAt ?? 0));
    for (const request of sim.requests) {
      if (!request.decided) {
        const share = clamp01((t - request.createdAt) / toLb);
        // with reduced motion a token waits at the drum inlet instead of travelling
        const point = reduced ? FEED.at(FEED.total - 30) : FEED.frac(share);
        place(request, point, false, 1);
        continue;
      }
      if (request.outcome === "rejected" || !request.target) continue;
      const lane = LANES[request.target];
      const since = t - request.decideAt;
      const portAt = PORT_AT[request.target];
      const shutterClosed = !sim.servers[request.target].up;
      if (request.outcome === "pending") {
        let distance = reduced ? STOP_AT[request.target] : clamp01(since / toServer) * portAt;
        if (shutterClosed) distance = Math.min(distance, STOP_AT[request.target] - queued[request.target].length * QUEUE);
        place(request, lane.at(distance), false, 1);
      } else if (request.outcome === "fail") {
        const age = t - (request.resolvedAt ?? t);
        const queueIndex = queued[request.target].indexOf(request);
        place(request, lane.at(STOP_AT[request.target] - queueIndex * QUEUE), true, 1 - clamp01((age - 3.4) / 0.7));
      } else {
        // accepted: slides into the port and fades as it enters
        const age = t - (request.resolvedAt ?? t);
        if (age > 0.4 || reduced) continue;
        place(request, lane.at(portAt + age * 30), false, 1 - age / 0.4);
      }
    }
    for (const token of this.tokens) if (!token.used) token.el.style.display = "none";

    /* pulses: probes out and replies back; the status line carries a verdict to the pins */
    let p = 0;
    const pulse = (point: Vec3, cable: string, opacity = 1, lit = false) => {
      const entry = this.pulses[p++];
      if (!entry) return;
      entry.used = true;
      const [x, y] = iso(point, P);
      entry.el.style.display = "";
      entry.el.setAttribute("cx", x.toFixed(1));
      entry.el.setAttribute("cy", y.toFixed(1));
      entry.el.style.opacity = opacity >= 0.999 ? "" : String(Math.max(0, opacity));
      entry.el.toggleAttribute("data-back", lit);
      this.slot(entry, slotFor(point, pulseExtent, cable));
    };
    for (const entry of this.pulses) entry.used = false;
    if (!reduced) {
      for (const probe of sim.probes) {
        const route = PROBES[probe.server];
        const travel = sim.params.probeTravel;
        const age = t - probe.sentAt;
        if (age < 0) continue;
        if (age <= travel) pulse(route.frac(age / travel), `probes.cable${probe.server}`);
        else if (probe.serverUp) {
          if (age <= travel * 2) pulse(route.frac(1 - (age - travel) / travel), `probes.cable${probe.server}`, 1, true);
        } else if (probe.result === "pending") {
          // no answer: the pulse waits at the connector until the timeout
          pulse(route.frac(1), `probes.cable${probe.server}`, 0.35 + 0.65 * Math.abs(Math.cos(age * 6)));
        }
      }
      for (const entry of sim.log) {
        if (entry.kind !== "health") continue;
        const age = t - entry.at;
        if (age >= 0 && age <= 0.8) pulse(STATUS.frac(age / 0.8), "hc.status", 1, true);
      }
    }
    for (const entry of this.pulses) if (!entry.used) entry.el.style.display = "none";

    /* shutters, lamps, pins, knob */
    for (const id of SERVERS) {
      const state = sim.servers[id];
      const shutter = this.shutters.get(id);
      if (shutter) {
        const target = state.up ? 1 : 0;
        shutter.open = motion > 0 ? easeOut(shutter.open, target, motion, 0.12) : target;
        if (Math.abs(shutter.open - target) < 0.002) shutter.open = target;
        shutter.el.setAttribute("transform", translateAlong(P, [0, 0, ART.shutterTravel * shutter.open]));
      }
      this.flag(`[data-live="power"][data-server="${id}"]`, state.up);
      const busy = sim.log.some((entry) => entry.kind === "arrive" && entry.server === id && entry.ok && t - entry.at < 0.35);
      this.flag(`[data-live="act"][data-server="${id}"]`, busy);
      this.flag(`[data-live="hcl"][data-server="${id}"]`, state.lastProbe !== "fail");
      for (const n of [0, 1]) this.flag(`[data-live="pip"][data-server="${id}"][data-n="${n}"]`, state.streak > n);
      const pin = this.svg.querySelector<SVGGElement>(`[data-live="pin"][data-server="${id}"]`);
      if (pin) pin.dataset.state = state.healthy ? "up" : "down";
    }
    this.flag('[data-live="send"]', sim.lastCreatedAt !== null && t - sim.lastCreatedAt < 0.25);
    const rate = sim.params.requestInterval >= 2 ? "slow" : sim.params.requestInterval <= 0.5 ? "fast" : "normal";
    for (const knob of Array.from(this.svg.querySelectorAll<SVGGElement>('[data-live="knob"]'))) knob.style.display = knob.dataset.rate === rate ? "" : "none";

    /* selector arm: points at the lane of the last forwarding decision */
    const last = [...sim.log].reverse().find((entry) => entry.kind === "decide") as { server: ServerId } | undefined;
    const target = ANGLE[last?.server ?? "A"];
    let delta = target - this.armAngle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.armAngle = motion > 0 ? this.armAngle + delta * (1 - Math.exp(-motion / 0.09)) : target;
    if (Math.abs(target - this.armAngle) < 1e-3) this.armAngle = target;
    this.drawArm(this.armAngle);
  }

  private slot(entry: { el: SVGElement; slot: number }, slot: number) {
    if (entry.slot === slot && entry.el.parentNode === this.layer) return;
    entry.slot = slot;
    const before = this.items[slot] ?? null;
    this.layer.insertBefore(entry.el, before);
  }

  private flag(selector: string, on: boolean) {
    for (const el of Array.from(this.svg.querySelectorAll(selector))) el.toggleAttribute("data-on", on);
  }

  private drawArm(angle: number) {
    const key = angle.toFixed(4);
    if (key === this.lastArmKey || this.armPaths.length < 8) return;
    this.lastArmKey = key;
    const { z, h, from, to, half, tip } = ART.arm;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const pt = (along: number, across: number): [number, number] => [c * along - s * across, s * along + c * across];
    const ring = [pt(from, -half), pt(to - tip, -half), pt(to, 0), pt(to - tip, half), pt(from, half)];
    const paths = extrude(ring, z, h, P, { convex: true });
    const [fill, s0, s1, s2, s3, top, crease, edge] = this.armPaths;
    fill.setAttribute("d", paths.fill);
    s0.setAttribute("d", paths.shades[0] || "");
    s1.setAttribute("d", paths.shades[1] || "");
    s2.setAttribute("d", paths.shades[2] || "");
    s3.setAttribute("d", paths.shades[3] || "");
    top.setAttribute("d", paths.top);
    crease.setAttribute("d", paths.crease || "");
    edge.setAttribute("d", paths.outline);
  }
}
