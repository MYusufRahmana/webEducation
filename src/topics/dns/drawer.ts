import ART from "./art.generated.json";
import { iso, lineOnTop, translateAlong } from "../../figure/kit/iso-kit.mjs";
import { slotFor, track, type Plane, type SlotItem, type Vec3 } from "../../figure/slotting";
import type { CacheEntry, DnsSim, Query } from "./model";

/**
 * Draws one DNS state onto the figure built by scripts/build-figure-dns.mjs. Only attributes
 * change per frame: card positions and faces, TTL needles and bureau lamps.
 */

const P = ART.P as { origin: [number, number]; scale: number; azimuth: number; elevation: number };
const V = ART.V as number[];
const ITEMS = ART.items as SlotItem[];
const C = ART.card;
const POOL = 8;

export const DNS_FIGURE_LABEL = ART.label as { id: string; en: string };

type Face = "query" | "referral" | "ans0" | "ans1";
type Tier = "root" | "tld" | "auth";
const FACES: Face[] = ["query", "referral", "ans0", "ans1"];
const ROUTES = Object.fromEntries((["root", "tld", "auth"] as Tier[]).map((id) => [id, track(ART.routes[id])])) as Record<Tier, ReturnType<typeof track>>;
const TO_LOCAL = track(ART.toLocal);
const TO_RESOLVER = track(ART.toResolver);
const TO_CLIENT = track([...[...ART.toResolver].reverse(), ART.clientTray]);
const LEG: Partial<Record<Query["phase"], { tier: Tier; back: boolean }>> = {
  "to-root": { tier: "root", back: false },
  "from-root": { tier: "root", back: true },
  "to-tld": { tier: "tld", back: false },
  "from-tld": { tier: "tld", back: true },
  "to-auth": { tier: "auth", back: false },
  "from-auth": { tier: "auth", back: true },
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const cardExtent = (n: Plane) => (C.w / 2) * Math.abs(n[0]) + (C.d / 2) * Math.abs(n[1]) + (C.h / 2) * Math.abs(n[2]);
function cardBox(point: Vec3) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const dx of [-C.w / 2, C.w / 2]) for (const dy of [-C.d / 2, C.d / 2]) for (const dz of [0, C.h]) {
    const [sx, sy] = iso([point[0] + dx, point[1] + dy, point[2] + dz], P);
    x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
  }
  return [x0, y0, x1, y1];
}

interface Card {
  el: SVGGElement;
  faces: Record<Face, SVGGElement>;
  slot: number;
  used: boolean;
}

export class DnsDrawer {
  private svg: SVGSVGElement;
  private layer: SVGGElement;
  private items: SVGGElement[];
  private cards: Card[] = [];

  constructor(host: HTMLElement) {
    host.innerHTML = `<svg class="iso-svg lb-svg dns-svg" viewBox="0 0 ${ART.width} ${ART.height}" role="img" focusable="false">${ART.svg}</svg>`;
    this.svg = host.querySelector("svg")!;
    this.layer = this.svg.querySelector(".lb-items")!;
    this.items = Array.from(this.layer.children) as SVGGElement[];
    for (let i = 0; i < POOL; i++) {
      const el = document.createElementNS("http://www.w3.org/2000/svg", "g");
      el.setAttribute("class", "lb-token dns-card-g");
      el.innerHTML = FACES.map((face) => `<g data-v="${face}">${C[face]}</g>`).join("");
      el.style.display = "none";
      this.layer.appendChild(el);
      const faces = Object.fromEntries(Array.from(el.children).map((child) => [(child as SVGGElement).dataset.v, child])) as Record<Face, SVGGElement>;
      this.cards.push({ el, faces, slot: -1, used: false });
    }
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

  draw(sim: DnsSim, _dt: number, { reduced }: { paused: boolean; reduced: boolean }) {
    const t = sim.t;
    for (const card of this.cards) card.used = false;
    let next = 0;
    const place = (point: Vec3 | number[], face: Face, opacity = 1) => {
      const card = this.cards[next++];
      if (!card) return;
      const p = point as Vec3;
      card.used = true;
      card.el.style.display = "";
      card.el.setAttribute("transform", translateAlong(P, p));
      card.el.style.opacity = opacity >= 0.999 ? "" : String(Math.max(0, opacity));
      for (const f of FACES) card.faces[f].style.display = f === face ? "" : "none";
      this.slot(card, slotFor(ITEMS, V, [p[0], p[1], p[2] + C.h / 2], cardExtent, undefined, cardBox(p)));
    };
    const answerFace = (version: number | null): Face => (version === 1 ? "ans1" : "ans0");

    // the official record on the authoritative bureau, and the notes kept in the two caches
    place(ART.zone, answerFace(sim.zone));
    const note = (entry: CacheEntry | null, tray: number[]) => {
      if (!entry) return;
      const left = entry.expiresAt - t;
      place(tray, answerFace(entry.version), reduced ? 1 : 0.35 + 0.65 * clamp01(left / 1.2));
    };
    note(sim.local, ART.localTray);
    note(sim.resolver, ART.resolverTray);

    // cards in flight
    const lamps = new Set<string>();
    for (const query of sim.queries) {
      const share = clamp01((t - query.phaseAt) / Math.max(1e-6, query.phaseEnd - query.phaseAt));
      const s = reduced ? 1 : share;
      switch (query.phase) {
        case "local-check":
          place(TO_LOCAL.frac(s), "query");
          break;
        case "to-resolver":
          place(TO_RESOLVER.frac(s), "query");
          break;
        case "resolver-check":
          place(ART.inbox, "query");
          lamps.add("resolver");
          break;
        case "to-client":
          place(TO_CLIENT.frac(s), answerFace(query.version));
          break;
        case "done": {
          const age = t - (query.doneAt ?? t);
          place(ART.clientTray, answerFace(query.version), 1 - clamp01((age - 1.6) / 0.8));
          if (age < 0.5) lamps.add("client");
          break;
        }
        default: {
          const leg = LEG[query.phase];
          if (!leg) break;
          const route = ROUTES[leg.tier];
          const face: Face = leg.back ? (leg.tier === "auth" ? answerFace(query.version) : "referral") : "query";
          place(route.frac(leg.back ? 1 - s : s), face);
          if (leg.back && t - query.phaseAt < 0.5) lamps.add(leg.tier);
        }
      }
    }
    for (const card of this.cards) if (!card.used) card.el.style.display = "none";
    for (const el of Array.from(this.svg.querySelectorAll<SVGGElement>('[data-live="lamp"]'))) el.toggleAttribute("data-on", lamps.has(el.dataset.at ?? ""));

    // TTL dials: the needle sweeps back to zero as the note's time runs out
    this.needle("local", ART.localDial, sim.local, t, sim.params.ttl);
    this.needle("resolver", ART.resolverDial, sim.resolver, t, sim.params.ttl);
  }

  private needle(cache: "local" | "resolver", [x, y, z, r]: number[], entry: CacheEntry | null, t: number, scale: number) {
    const el = this.svg.querySelector(`[data-live="ttl"][data-cache="${cache}"]`);
    if (!el) return;
    // a full turn stands for the TTL the server gives, so both dials read on the same scale
    const share = entry ? clamp01((entry.expiresAt - t) / scale) : 0;
    const a = share * Math.PI * 2;
    el.setAttribute("d", lineOnTop([x, y], [x + Math.sin(a) * r, y - Math.cos(a) * r], z, P));
  }

  private slot(entry: { el: SVGElement; slot: number }, slot: number) {
    if (entry.slot === slot && entry.el.parentNode === this.layer) return;
    entry.slot = slot;
    this.layer.insertBefore(entry.el, this.items[slot] ?? null);
  }
}
