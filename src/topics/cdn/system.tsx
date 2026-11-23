import type { FigureStageProps } from "../types";
import { clearCopy, copyLeft, load, progressOf, validCopy, type CdnSim, type Stage, type Trip, type Who } from "./model";
import { block, edge, esc, floor, laptop, makeFrame, pill, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * An illustrated map: Jakarta lower left, Singapore upper right. Visitors stay in Jakarta; only
 * requests (envelopes) and image data (poster cards) travel. All visitors meet at one Jakarta point:
 * in steps 1–3 it is only the network on the way, from step 4 it is the CDN Jakarta server. One pair of
 * curved routes joins it to the origin; a second pair (step 8) to the purchase application. Routes run
 * side by side in the same order at both ends, so they never cross.
 */
const J = { x: 4, y: 5, w: 2.6, d: 2.6 };
const USERS: Record<Who, [number, number]> = { Andi: [-4.4, 5.2], Budi: [4.3, 11.8], Citra: [10.4, 5.2] };
const ORIGIN = { x: 7.4, y: -13.2, w: 2.8, d: 2.8, h: 2.2 };
const BUY = { x: 12.2, y: -17.2, w: 2.4, d: 2.4, h: 1.8 }; // beside the origin, never in front of it
const Z = 0.3;
const GO = 5.7; // request lane (x-lanes) / x of Budi's request lane
const BACK = 6.8;

const userGo: Record<Who, Vec3[]> = {
  Andi: [[USERS.Andi[0] + 2.75, GO, Z], [J.x, GO, Z]],
  Budi: [[J.x + 0.7, USERS.Budi[1] - 0.3, Z], [J.x + 0.7, J.y + J.d, Z]],
  Citra: [[USERS.Citra[0] - 0.35, GO, Z], [J.x + J.w, GO, Z]],
};
const userBack: Record<Who, Vec3[]> = {
  Andi: [[J.x, BACK, Z], [USERS.Andi[0] + 2.75, BACK, Z]],
  Budi: [[J.x + 1.8, J.y + J.d, Z], [J.x + 1.8, USERS.Budi[1] - 0.3, Z]],
  Citra: [[J.x + J.w, BACK, Z], [USERS.Citra[0] - 0.35, BACK, Z]],
};

/** A gentle curve on the map floor, sampled into points so tokens follow exactly what is drawn. */
function curve(a: [number, number], b: [number, number], bend: number): Vec3[] {
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const c: [number, number] = [mx + (dy / len) * bend, my - (dx / len) * bend];
  return Array.from({ length: 21 }, (_, i) => {
    const t = i / 20;
    const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t ** 2 * b[0];
    const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t ** 2 * b[1];
    return [x, y, Z] as Vec3;
  });
}
// order at Jakarta (x along J's back face) and at Singapore is the same, so the curves never cross
const FAR = {
  go: curve([J.x + 0.4, J.y], [ORIGIN.x + 0.6, ORIGIN.y + ORIGIN.d], 3.2),
  back: curve([ORIGIN.x + 1.6, ORIGIN.y + ORIGIN.d], [J.x + 1.2, J.y], -3.2),
  buyGo: curve([J.x + 1.9, J.y], [BUY.x + 0.5, BUY.y + BUY.d], 3.2),
  buyBack: curve([BUY.x + 1.6, BUY.y + BUY.d], [J.x + 2.4, J.y], -3.2),
};

const pointAt = (pts: Vec3[], k: number): Vec3 => {
  const n = pts.length - 1;
  const f = Math.max(0, Math.min(1, k)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const r = f - i;
  return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r, Z];
};

/** The lane a trip is on, by stage. */
function laneOf(trip: Trip): { pts: Vec3[]; data: boolean } | null {
  const s: Stage = trip.stage;
  if (s === "to-j") return { pts: userGo[trip.who], data: false };
  if (s === "j-user") return { pts: userBack[trip.who], data: trip.kind === "poster" };
  if (s === "j-origin") return { pts: FAR.go, data: false };
  if (s === "origin-j") return { pts: FAR.back, data: true };
  if (s === "j-buy") return { pts: FAR.buyGo, data: false };
  if (s === "buy-j") return { pts: FAR.buyBack, data: false };
  return null;
}

const EXTENT: Vec3[] = [
  [-11, 9, 0],
  [-9, 2, 5.2],
  [USERS.Budi[0] - 4, USERS.Budi[1] + 4.2, 0],
  [ORIGIN.x - 3, ORIGIN.y - 1, 4],
  [BUY.x + 6, BUY.y - 2, 2],
  [BUY.x, BUY.y, 3.4],
  [USERS.Citra[0] + 8, USERS.Citra[1] + 1, 0],
  [USERS.Citra[0] + 4, USERS.Citra[1] + 6, 0],
  [23, -2, 0],
  [21, 3, 0],
  [24.5, 7.5, 0], // room for the full comparison card
];
const F = makeFrame(EXTENT, 21);
function anchor() {
  const pts = EXTENT.map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pillWidth = (text: string) => Math.max(28, text.length * 11 * 0.56 + 18);
const poly = (pts: [number, number][]) => pts.map(([x, y]) => F.p(x, y, 0).join(",")).join(" ");

/** Land: two simple pastel shapes and a city pin each. */
function map(A: boolean) {
  const java: [number, number][] = [[-10, 2], [-3, 0.6], [5, 1.4], [13, 1], [16.5, 3.5], [15.5, 9.5], [9, 15.5], [0, 16], [-7, 14.5], [-11.5, 9]];
  const sg: [number, number][] = [[2, -16.5], [9, -18], [16.5, -16], [17.5, -11], [14, -7.4], [6.5, -6.8], [2.4, -9.5]];
  const pin = (x: number, y: number, name: string, key: string) => {
    const [px, py] = F.p(x, y, 0);
    return `<g class="map-pin" data-key="${key}"><path d="M${r1(px)} ${r1(py)}c-6-9-9-13-9-18a9 9 0 0 1 18 0c0 5-3 9-9 18z"/><circle cx="${r1(px)}" cy="${r1(py - 18)}" r="3.4"/></g>${pill(px + 12 + pillWidth(name) * 0.6, py - 18, name)}`;
  };
  return `<g class="map-land" data-key="map"><polygon points="${poly(java)}"/><polygon points="${poly(sg)}"/></g>${pin(-6.6, 12.6, A ? "JAKARTA · cabang" : "JAKARTA", "pin-jkt")}${pin(3.6, -9.4, A ? "SINGAPURA · pusat" : "SINGAPURA", "pin-sg")}`;
}

/** An envelope: a request. */
function envelope(at: Vec3) {
  const [x, y] = F.p(at[0], at[1], 0.5);
  return `<g class="cdn-envelope" transform="translate(${r1(x)} ${r1(y)})"><rect x="-8" y="-6" width="16" height="12" rx="1.5"/><path d="M-8-5l8 6 8-6"/></g>`;
}
/** A mini poster card: image data. */
function posterCard(at: Vec3) {
  const [x, y] = F.p(at[0], at[1], 0.6);
  return `<g class="cdn-poster" transform="translate(${r1(x)} ${r1(y)})"><rect x="-8" y="-11" width="16" height="22" rx="2"/><rect class="sky" x="-6" y="-9" width="12" height="11"/><circle cx="2" cy="-5" r="2.2"/><path d="M-6 7h12M-6 4h8"/></g>`;
}

/** An in-figure button (mouse, touch, keyboard). */
function button(key: string, action: string, x: number, y: number, label: string, primary = false) {
  const w = pillWidth(label) + 10;
  return `<g class="sys-pill fig-button${primary ? " primary" : ""}" data-key="${key}" data-action="${action}" role="button" tabindex="0" aria-label="${esc(label)}" transform="translate(${r1(x - w / 2)} ${r1(y - 13)})"><rect class="sys-pill-drop" x="1.5" y="2.5" width="${r1(w)}" height="26" rx="13"/><rect class="fig-button-bg" width="${r1(w)}" height="26" rx="13"/><text x="${r1(w / 2)}" y="17.5">${esc(label)}</text></g>`;
}

/** Andi's screen: an empty frame until the poster arrives. */
function andiScreen(sim: CdnSim, A: boolean) {
  const s = sim.screens.Andi;
  const [x, y] = F.p(USERS.Andi[0] + 1.2, USERS.Andi[1] + 0.4, 3.6);
  const w = 210;
  const h = 78;
  const status = s.state === "empty" ? "Poster belum tampil" : s.state === "asking" ? "Meminta poster…" : s.state === "from-origin" ? (A ? "Menunggu kiriman pusat…" : "Mengambil dari server asal…") : s.state === "from-cdn" ? (A ? "Diambil dari cabang…" : "Mengambil dari CDN Jakarta…") : s.state === "bought" ? "Pesanan dikirim ke aplikasi pembelian" : `Poster tampil${s.took ? ` · ${s.took.toFixed(1).replace(".", ",")} dtk (simulasi)` : ""}`;
  const shown = s.state === "shown" || s.state === "bought";
  const frame = shown
    ? `<g transform="translate(12 12)"><rect class="cdn-poster-big" width="40" height="54" rx="3"/><rect class="sky" x="4" y="4" width="32" height="26"/><circle cx="26" cy="14" r="5"/><path d="M4 40h32M4 46h22"/></g>`
    : `<rect class="cdn-poster-empty" x="12" y="12" width="40" height="54" rx="3"/>`;
  return `<g class="sys-pill sys-card" data-key="andi-screen" data-part="andi" transform="translate(${r1(x - w / 2)} ${r1(y - h)})"><rect class="sys-pill-drop" x="2" y="3" width="${w}" height="${h}" rx="9"/><rect class="sys-card-bg" width="${w}" height="${h}" rx="9"/>${frame}<text class="sys-card-text strong" x="62" y="26">${A ? "Pelanggan Andi" : "Layar Andi"}</text><text class="sys-card-text" x="62" y="46">${esc(status.length > 22 ? status.slice(0, 22) : status)}</text><text class="sys-card-text" x="62" y="62">${esc(status.length > 22 ? status.slice(22).trim() : "")}</text></g>`;
}

function render(sim: CdnSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const out: string[] = [anchor(), map(A)];
  const toks: string[] = [];
  const labels: string[] = [];
  const visitors: Who[] = scene >= 2 ? ["Andi", "Budi", "Citra"] : ["Andi"];
  const showBuy = scene >= 7;
  const live = sim.trips.filter((t) => t.doneAt === null);
  const usedLane = (pts: Vec3[]) => live.some((t) => laneOf(t)?.pts === pts);

  // routes: in use solid, the rest soft; requests and images on separate lanes
  for (const who of visitors) {
    out.push(edge(F, userGo[who], { part: "routes", arrow: true, faded: !usedLane(userGo[who]) }, v));
    out.push(edge(F, userBack[who], { part: "routes", arrow: true, faded: !usedLane(userBack[who]) }, v));
  }
  out.push(edge(F, FAR.go, { part: "origin", arrow: true, faded: !usedLane(FAR.go) }, v));
  out.push(edge(F, FAR.back, { part: "origin", arrow: true, faded: !usedLane(FAR.back) }, v));
  if (showBuy) {
    out.push(edge(F, FAR.buyGo, { part: "buy", arrow: true, dashed: true, faded: !usedLane(FAR.buyGo) }, v));
    out.push(edge(F, FAR.buyBack, { part: "buy", arrow: true, dashed: true, faded: !usedLane(FAR.buyBack) }, v));
  }

  // travelling: envelopes (requests) and poster cards (image data), each with its own label
  for (const trip of live) {
    const lane = laneOf(trip);
    if (!lane) continue;
    const k = v.reduced ? 1 : progressOf(trip, sim.t);
    const at = pointAt(lane.pts, k);
    toks.push(lane.data ? posterCard(at) : envelope(at));
    const [x, y] = F.p(at[0], at[1], 0.6);
    const text = trip.kind === "buy" ? (trip.stage === "buy-j" || trip.stage === "j-user" ? "Pesanan diterima · diproses" : `${trip.who} · Beli tiket`) : lane.data ? (A ? "Poster dikirim" : "Poster konser") : `${trip.who} · Minta poster`;
    labels.push(pill(lane.data ? x - pillWidth(text) / 2 - 14 : x + pillWidth(text) / 2 + 14, lane.data ? y + 12 : y - 12, text, { small: true, tone: lane.data ? "ok" : trip.kind === "buy" ? "warn" : "plain", part: trip.kind === "buy" ? "buy" : "routes" }, v));
  }

  // places
  if (showBuy) out.push(block(F, BUY.x, BUY.y, { tone: "yellow", label: A ? "Kasir" : "Aplikasi", sub: A ? "pembelian" : "pembelian", icon: A ? "booth" : "clipboard", part: "buy", w: BUY.w, d: BUY.d, h: BUY.h }, v));
  out.push(block(F, ORIGIN.x, ORIGIN.y, { tone: "violet", label: A ? "Gudang pusat" : "Server asal", sub: A ? "poster asli" : "Singapura", icon: A ? "booth" : "server", part: "origin", w: ORIGIN.w, d: ORIGIN.d, h: ORIGIN.h }, v));
  if (sim.cdnOn) out.push(block(F, J.x, J.y, { tone: "teal", label: A ? "Cabang" : "CDN", sub: "Jakarta", icon: A ? "booth" : "server", part: "cdn", w: J.w, d: J.d, h: 1.9 }, v));
  else out.push(block(F, J.x, J.y, { tone: "grey", label: A ? "Jalan" : "Jaringan", sub: "Jakarta", part: "routes", w: J.w, d: J.d, h: 0.4 }, v));
  for (const who of visitors) out.push(laptop(F, USERS[who][0], USERS[who][1], who === "Andi" ? "andi" : "users", v));

  // the copy at the CDN: a small poster on top while valid, and its label
  if (sim.cdnOn) {
    const [cx, cy] = F.p(J.x + J.w / 2, J.y + J.d / 2, 1.9);
    if (validCopy(sim)) labels.push(posterCard([J.x + J.w / 2, J.y + J.d / 2, 1.6]));
    const text = validCopy(sim) ? `Salinan poster: tersedia · berlaku ${Math.ceil(copyLeft(sim))} dtk` : "Salinan poster: belum tersedia";
    labels.push(pill(cx + 30 + pillWidth(text) / 2, cy - 26, A ? text.replace("Salinan poster", "Poster di cabang") : text, { small: true, tone: validCopy(sim) ? "ok" : "warn", part: "copy" }, v));
  }
  const [ox, oy] = F.p(ORIGIN.x + ORIGIN.w / 2, ORIGIN.y + ORIGIN.d / 2, ORIGIN.h);
  labels.push(pill(ox - 40 - 60, oy - 30, `${A ? "Kiriman dari pusat" : "Pengambilan dari server asal"}: ${sim.originFetches}`, { tone: "info", part: "origin" }, v));
  const hitNow = live.some((t) => t.result === "hit") || (scene === 5 && !live.some((t) => t.stage === "j-origin" || t.stage === "origin-j"));
  if (hitNow && sim.cdnOn) {
    const mid = pointAt(FAR.go, 0.5);
    const [mx, my] = F.p(mid[0], mid[1], 0);
    labels.push(pill(mx - 130, my - 26, A ? "Gudang pusat tidak dihubungi untuk poster ini" : "Server asal tidak dihubungi untuk gambar ini", { small: true, tone: "info", part: "origin" }, v));
  }
  // the other visitors' screens, as one line under each laptop
  for (const who of visitors) {
    if (who === "Andi") continue;
    const s = sim.screens[who];
    const [ux, uy] = F.p(USERS[who][0] + 1.2, USERS[who][1] + 2.7, 0);
    const text = `${who}: ${s.state === "shown" ? "poster tampil" : s.state === "empty" ? "belum membuka" : "menunggu poster…"}`;
    labels.push(pill(ux, uy + 20, text, { small: true, tone: s.state === "shown" ? "ok" : "plain", part: "users" }, v));
  }
  const [ax, ay] = F.p(USERS.Andi[0] + 1.2, USERS.Andi[1] + 2.7, 0);
  labels.push(pill(ax - 10, ay + 20, A ? "Pelanggan Andi" : "Laptop Andi", { small: true, part: "andi" }, v));

  // in-figure controls: step 1 and the comparison step
  const controls: string[] = [];
  const [bx, by] = F.p(USERS.Andi[0] + 1.2, USERS.Andi[1] + 0.4, 3.6);
  if (scene === 0) controls.push(button("btn-load", "load", bx, by - 100, "▶ Muat poster", true), pill(bx, by - 130, "Klik Muat poster, lalu ikuti perjalanannya.", { small: true, tone: "info" }));
  if (scene === 6) {
    // in the free sea to the lower right, clear of the CDN and the visitors
    const [px0, py0] = F.p(19.5, -1.5, 0);
    const [px, py] = [px0 + 40, py0 + 60];
    controls.push(
      button("btn-direct", "direct", px - 40, py - 120, "Tanpa CDN"),
      button("btn-cdn", "cdn", px - 40, py - 88, validCopy(sim) ? "Dengan CDN — salinan tersedia" : "Dengan CDN — salinan belum ada"),
      button("btn-clear", "clear", px - 40, py - 56, "Kosongkan salinan CDN"),
    );
    const rows = sim.results.length ? sim.results : [];
    const w = 330;
    const h = 30 + Math.max(1, rows.length) * 34;
    const body = `<text class="sys-card-text strong" x="14" y="20">Perbandingan (waktu simulasi)</text>${rows.length ? rows.map((r, i) => `<text class="sys-card-text strong" x="14" y="${40 + i * 34}">${esc(r.mode)} · ${r.took.toFixed(1).replace(".", ",")} dtk</text><text class="sys-card-text" x="14" y="${54 + i * 34}">${esc(r.route)} · server asal +${r.originFetches}</text>`).join("") : `<text class="sys-card-text" x="14" y="42">Belum ada percobaan.</text>`}`;
    controls.push(`<g class="sys-pill sys-card" data-key="compare" data-part="compare" transform="translate(${r1(px - 40 - w / 2)} ${r1(py - 60 + 40)})"><rect class="sys-pill-drop" x="2" y="3" width="${w}" height="${h}" rx="9"/><rect class="sys-card-bg" width="${w}" height="${h}" rx="9"/>${body}</g>`);
  }
  const [nx, ny] = F.p(-9, 15.5, 0);
  labels.push(pill(nx + 70, ny + 10, "Peta dan jalur merupakan ilustrasi.", { small: true }));

  return out.join("") + toks.join("") + labels.join("") + andiScreen(sim, A) + controls.join("");
}

const SPEC: SystemSpec<CdnSim> = {
  frame: F,
  floor: floor(F, [-13, -22, 24, 18]),
  render,
  cameraPad: [24, 20],
  onAction: (action, runtime) => {
    if (action === "load") runtime.act((s: CdnSim) => load(s, "Andi"));
    else if (action === "direct") runtime.act((s: CdnSim) => load(s, "Andi", "direct"));
    else if (action === "cdn") runtime.act((s: CdnSim) => load(s, "Andi", "cdn"));
    else if (action === "clear") runtime.act((s: CdnSim) => clearCopy(s));
  },
  analogyLabel: "Analogi sehari-hari: pelanggan di Jakarta meminta poster; tanpa cabang, poster dikirim dari gudang pusat di Singapura; dengan cabang di Jakarta, poster yang sudah ada di cabang langsung diberikan.",
  label: "Cara kerja website: browser di Jakarta meminta gambar poster; tanpa CDN gambar diambil dari server asal di Singapura; dengan CDN Jakarta, salinan yang masih berlaku langsung dikirim, dan saat belum ada CDN mengambilnya dari server asal lalu menyimpannya.",
};

export default function CdnSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
