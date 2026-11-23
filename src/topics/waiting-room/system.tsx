import type { FigureStageProps } from "../types";
import { activeCount, estimateMinutes, insideCount, moveProgress, packetProgress, positionOf, waitingCount, ANDI_ID, type Leg, type Place, type Visitor, type WaitSim } from "./model";
import { along, block, edge, esc, floor, makeFrame, partAttrs, pill, token, zone, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * Pengunjung → Ruang tunggu → Gerbang → Area pembelian (3 tempat aktif); server and database behind.
 *
 *                                         SERVER ── DATABASE
 *                                            ║  (data lanes, solid)
 *   datang ┄┄▶ [ RUANG TUNGGU 7 6 5 4 3 2 1 ] GERBANG ┄┄▶ [ AREA PEMBELIAN · 3 tempat ] ┄┄▶ keluar
 *
 * People walk on dashed paths; data requests are packets on the solid lanes. Positions never change
 * between steps, and the camera keeps one frame for the whole lesson.
 */
const QSTEP = 1.25; // room between two people in the line
const ROOM = { x: 0, y: 0.3, w: 7 * QSTEP + 0.9, d: 3.4 };
const GATE = { x: ROOM.x + ROOM.w + 0.4, y: 0.3, w: 1, d: 3.4 };
const AREA = { x: GATE.x + GATE.w + 0.8, y: -0.8, w: 5.4, d: 6.2 };
const DESK_X = AREA.x + 3.6;
const deskY = (i: number) => -0.1 + i * 1.7;
const SRV = { x: AREA.x + 1.2, y: -6.6, w: 2.4, d: 2.4, h: 2 };
const DB: [number, number] = [SRV.x + SRV.w + 5.2, -5.4];
const R = 1.3;
const Z = 0.3;
const dbEdge = (y: number) => DB[0] - Math.sqrt(R * R - (y - DB[1]) ** 2);
const LANE_GO = SRV.x + 0.7;
const LANE_BACK = SRV.x + 1.7;
const EXIT_X = AREA.x + AREA.w + 1.4;

const ARRIVE: Vec3[] = [[-2.6, 2, Z], [ROOM.x, 2, Z]];
const THROUGH: Vec3[] = [[ROOM.x + ROOM.w, 2, Z], [AREA.x, 2, Z]];
const EXIT: Vec3[] = [[AREA.x + AREA.w, 4.2, Z], [EXIT_X, 4.2, Z], [EXIT_X, 6.8, Z]];
const DATA: Record<Exclude<Leg, "waiting">, Vec3[]> = {
  "to-server": [[LANE_GO, AREA.y, Z], [LANE_GO, SRV.y + SRV.d, Z]],
  "server-back": [[LANE_BACK, SRV.y + SRV.d, Z], [LANE_BACK, AREA.y, Z]],
  "to-db": [[SRV.x + SRV.w, DB[1] - 0.6, Z], [dbEdge(DB[1] - 0.6), DB[1] - 0.6, Z]],
  "db-back": [[dbEdge(DB[1] + 0.6), DB[1] + 0.6, Z], [SRV.x + SRV.w, DB[1] + 0.6, Z]],
};

/** Where each place is on the floor. */
function spot(p: Place): [number, number] | null {
  switch (p.kind) {
    case "outside":
      return [-4.6 + (p.i % 2) * 1.1, 0.3 + Math.floor(p.i / 2) * 0.75];
    case "front":
      return [1 + (p.i % 5) * 1.7, 1.2 + Math.floor(p.i / 5) * 1.6];
    case "crowd":
      return [AREA.x + 0.5 + (p.i % 4) * 0.8, -0.3 + Math.floor(p.i / 4) * 1.7];
    case "queue":
      return [ROOM.x + ROOM.w - 0.7 - p.i * QSTEP, 2];
    case "gate":
      return [GATE.x + 0.5, 2];
    case "slot":
      return [DESK_X - 0.9, deskY(p.i) + 0.5];
    case "exit":
      return [EXIT_X, 6.8];
    case "gone":
      return null;
  }
}

function where(v: Visitor, t: number, reduced: boolean): [number, number] | null {
  const to = spot(v.place);
  if (v.place.kind === "gone") return null;
  const from = spot(v.from) ?? to;
  const k = reduced ? 1 : moveProgress(v, t);
  if (!to || !from) return to;
  return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
}

const EXTENT: Vec3[] = [
  [-5.2, 4.4, 0],
  [-5.2, 0, 2.4],
  [ROOM.x + 1, ROOM.y - 3.4, 5.4],
  [SRV.x, SRV.y, 4.2],
  [DB[0] + R + 0.4, DB[1], 3],
  [DB[0] + R + 5.5, DB[1] + 5.5, 0],
  [EXIT_X + 1.6, 7.6, 0],
  [ROOM.x + 1, ROOM.y + ROOM.d + 1.8, 0],
];
const F = makeFrame(EXTENT, 21);
function anchor() {
  const pts = EXTENT.map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pillWidth = (text: string) => Math.max(28, text.length * 11 * 0.56 + 18);

/** A person: body and head. Andi gets a dashed ring, a star and a name tag (never colour alone). */
function person(x: number, y: number, v: Visitor, vis: Visual, number: number | null) {
  const [px, py] = F.p(x, y, 0.05);
  const tone = v.andi ? "orange" : ["blue", "green", "violet", "yellow"][v.id % 4];
  const ring = v.andi ? `<ellipse class="wr-ring" cx="${r1(px)}" cy="${r1(py)}" rx="15" ry="8"/>` : "";
  const star = v.andi ? `<text class="wr-star" x="${r1(px)}" y="${r1(py - 30)}">★</text>` : "";
  const badge = number !== null ? `<g class="wr-badge${v.andi ? " andi" : ""}" transform="translate(${r1(px + 11)} ${r1(py + 2)})"><circle r="7.5"/><text y="3.5">${number}</text></g>` : "";
  return `<g class="sys-node wr-person" data-key="p${v.id}"${partAttrs(v.andi ? "andi" : "visitors", vis)}>${ring}<g class="sys-person" data-tone="${tone}"><rect x="${r1(px - 5)}" y="${r1(py - 17)}" width="10" height="16" rx="5"/><circle cx="${r1(px)}" cy="${r1(py - 21)}" r="4.6"/></g>${star}${badge}</g>`;
}

/** Andi's own page: what he sees right now. */
function andiCard(sim: WaitSim, A: boolean) {
  const andi = sim.visitors[ANDI_ID - 1];
  const pos = positionOf(sim, ANDI_ID);
  let title = "Membuka website…";
  let tone = "plain";
  let line2 = "";
  if (pos !== null) ((title = "Menunggu"), (tone = "warn"), (line2 = `Urutan ${pos} · Perkiraan: sekitar ${estimateMinutes(pos)} menit`));
  else if (andi.place.kind === "gate" || (andi.place.kind === "slot" && andi.moveEnd > sim.t)) ((title = "Silakan masuk"), (tone = "ok"), (line2 = A ? "Petugas mempersilakan masuk" : "Izin akses diberikan"));
  else if (andi.place.kind === "slot") ((title = "Memilih tiket"), (tone = "ok"), (line2 = sim.andiScreen ? sim.andiScreen.text : "Pilih kategori tiket"));
  else if (andi.place.kind === "crowd") ((title = "Halaman pembelian · lambat"), (tone = "bad"), (line2 = "Memuat…"));
  const w = 300;
  const h = 62;
  const [x0, y0] = F.p(ROOM.x + 2.4, ROOM.y - 2.6, 3.6);
  const body = `<rect class="sys-pill-drop" x="2" y="3" width="${w}" height="${h}" rx="9"/><rect class="sys-card-bg" width="${w}" height="${h}" rx="9"/><text class="sys-card-text strong" x="14" y="22">★ Halaman Andi</text><text class="sys-card-chip" data-tone="${tone === "plain" ? "warn" : tone}" x="${w - 14}" y="22">${esc(title)}</text><text class="sys-card-text" x="14" y="46">${esc(line2)}</text>`;
  return `<g class="sys-pill sys-card" data-key="andi-card" data-part="andi" transform="translate(${r1(x0 - w / 2)} ${r1(y0 - h)})">${body}</g>`;
}

function render(sim: WaitSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const room = sim.roomOn;
  const out: string[] = [anchor()];
  const people: { y: number; svg: string }[] = [];
  const toks: string[] = [];
  const labels: string[] = [];

  // floor areas: the waiting room and the purchase area look different
  // floor outlines only; their names are upright labels (rotated text along the edge was hard to read)
  if (room) out.push(zone(F, ROOM.x, ROOM.y, ROOM.w, ROOM.d, "", "room", v));
  out.push(zone(F, AREA.x, AREA.y, AREA.w, AREA.d, "", "area", v));

  // people paths (dashed) and data lanes (solid), never on top of each other
  out.push(edge(F, ARRIVE, { part: "visitors", dashed: true, arrow: true }, v));
  out.push(edge(F, THROUGH, { part: "gate", dashed: true, arrow: true, faded: room && sim.t > sim.gateOpenUntil }, v));
  out.push(edge(F, EXIT, { part: "area", dashed: true, arrow: true }, v));
  const busy = new Set(sim.packets.filter((p) => p.doneAt === null).map((p) => p.leg));
  for (const leg of Object.keys(DATA) as (keyof typeof DATA)[]) out.push(edge(F, DATA[leg], { part: leg.includes("db") ? "db" : "server", arrow: true, faded: !busy.has(leg) && !(leg === "to-server" && busy.has("waiting")) }, v));

  // data packets: diamonds on the lanes, waiting ones stacked in front of the server
  const line = sim.serverLine;
  for (const p of sim.packets) {
    if (p.doneAt !== null) continue;
    if (p.leg === "waiting") {
      const i = line.indexOf(p.id);
      toks.push(token(F, [LANE_GO - 0.6, SRV.y + SRV.d + 0.6 + i * 0.5, Z], "request"));
      continue;
    }
    const at = along(DATA[p.leg], v.reduced ? 1 : packetProgress(p, sim.t));
    toks.push(token(F, at, p.leg === "server-back" || p.leg === "db-back" ? "response" : "request"));
    if (scene === 5) {
      const [x, y] = F.p(at[0], at[1], 0.6);
      const text = p.leg === "server-back" ? p.answer : p.leg === "to-server" ? `Andi · ${p.text}` : p.leg === "to-db" ? "cek ketersediaan" : "data tiket";
      const right = p.leg === "to-server" || p.leg === "server-back";
      labels.push(pill(right ? x + pillWidth(text) / 2 + 14 : x, right ? y : y - 18, text, { small: true, tone: p.leg === "server-back" ? "ok" : "plain", part: "server" }, v));
    }
  }

  // components, back to front
  out.push(block(F, SRV.x, SRV.y, { tone: "blue", label: A ? "Petugas loket" : "Server", sub: A ? "menjawab" : "aplikasi", icon: A ? "booth" : "server", part: "server", w: SRV.w, d: SRV.d, h: SRV.h }, v));
  out.push(`<g class="sys-node sys-component" data-key="db"${partAttrs("db", v)}>${dbShape()}</g>`);
  for (let i = 0; i < 3; i++) {
    const taken = sim.slots[i] !== null;
    out.push(block(F, DESK_X, deskY(i), { tone: taken ? "green" : "cream", label: `${i + 1}`, part: "area", w: 1.1, d: 1, h: 0.8 }, v));
  }
  if (room) {
    const open = sim.t < sim.gateOpenUntil;
    out.push(block(F, GATE.x, GATE.y, { tone: open ? "green" : "yellow", label: A ? "Gerbang" : "Izin akses", sub: open ? "terbuka" : "tertutup", icon: A ? "person" : "clipboard", part: "gate", w: GATE.w, d: GATE.d, h: 1.5 }, v));
  }

  // people, nearest last
  for (const vis of sim.visitors) {
    const at = where(vis, sim.t, v.reduced);
    if (!at) continue;
    const pos = positionOf(sim, vis.id);
    people.push({ y: at[0] + at[1], svg: person(at[0], at[1], vis, v, pos) });
  }
  people.sort((a, b) => a.y - b.y);

  // labels: Andi's name tag, counters by the gate, the server's load, the entry
  const andi = sim.visitors[ANDI_ID - 1];
  const andiAt = where(andi, sim.t, v.reduced);
  if (andiAt) {
    const [ax, ay] = F.p(andiAt[0], andiAt[1], 0);
    labels.push(pill(ax - 38, ay + 20, "★ Andi", { part: "andi" }, v));
  }
  const [gx, gy] = F.p(GATE.x + 0.5, GATE.y, 1.5);
  if (room) {
    const act = activeCount(sim);
    labels.push(pill(gx + 20, gy - 58, `Sedang membeli: ${act}/${sim.capacity}`, { tone: act >= sim.capacity ? "info" : "ok", part: "counters" }, v));
    labels.push(pill(gx + 20, gy - 32, `Menunggu: ${waitingCount(sim)}`, { tone: "warn", part: "counters" }, v));
  } else {
    // counted when they actually arrive, so the number climbs as the people come in
    const arrived = sim.visitors.filter((x) => x.place.kind !== "outside" && moveProgress(x, sim.t) >= 1).length;
    const inside = insideCount(sim);
    // above the arrival area, clear of the server's load label
    const [cx, cy] = F.p(ROOM.x + 3, ROOM.y, 2.2);
    labels.push(pill(cx, cy, scene <= 0 ? `Pengunjung: ${arrived}` : `Di area pembelian: ${inside} · tanpa batas`, { tone: inside > 3 ? "bad" : "plain", part: "counters" }, v));
  }
  void gx;
  const waiting = line.length;
  const [tx, ty] = F.p(SRV.x + SRV.w / 2, SRV.y + SRV.d / 2, SRV.h);
  if (scene === 1 || waiting > 0) labels.push(pill(tx, ty - 34, waiting >= 3 ? `Beban: tinggi · ${waiting} permintaan antre · respons melambat` : waiting > 0 ? `Beban: ${waiting} permintaan antre` : "Beban: normal", { small: true, tone: waiting >= 3 ? "bad" : "plain", part: "server" }, v));
  if (room) {
    const [rx, ry] = F.p(ROOM.x + 0.4, ROOM.y + ROOM.d, 0);
    labels.push(pill(rx - 10, ry + 22, A ? "Ruang tunggu" : "Waiting room", { part: "room" }, v));
  }
  const [ax2, ay2] = F.p(AREA.x + 0.4, AREA.y + AREA.d, 0);
  labels.push(pill(ax2 - 70, ay2 + 30, A ? "Ruang pelayanan" : "Aplikasi pembelian", { part: "area" }, v));
  const [dx, dy] = F.p(DESK_X + 1.1, deskY(1) + 0.5, 0.8);
  labels.push(pill(dx + 70, dy, A ? "3 meja pelayanan" : "3 tempat aktif", { small: true, part: "area" }, v));
  const [ex, ey] = F.p(-2.6, 2.8, 0);
  labels.push(pill(ex - 30, ey + 22, A ? "pengunjung datang" : "pengguna datang", { small: true, part: "visitors" }, v));
  const [xx, xy] = F.p(EXIT_X, 6.8, 0);
  labels.push(pill(xx + 10, xy + 18, A ? "selesai, keluar" : "selesai · tempat dilepas", { small: true, part: "area" }, v));
  if (scene === 5 && sim.andiScreen && /Pesanan/.test(sim.andiScreen.text)) {
    const [mx, my] = F.p(AREA.x + AREA.w / 2, AREA.y + AREA.d, 0);
    labels.push(pill(mx + 20, my + 40, "Giliran masuk memberi kesempatan membeli. Tiket baru didapat setelah pesanan berhasil.", { small: true, tone: "info", part: "area" }, v));
  }

  return out.join("") + people.map((p) => p.svg).join("") + toks.join("") + labels.join("") + andiCard(sim, A);
}

/** The database cylinder (drawn without the block helper). */
function dbShape() {
  const [cx, cy] = DB;
  const h = 2;
  const rx = R * 1.2247 * F.unit;
  const ry = R * 0.7071 * F.unit;
  const [bx, by] = F.p(cx, cy, 0);
  const [tx, ty] = F.p(cx, cy, h);
  const body = `M${r1(tx - rx)} ${r1(ty)}L${r1(bx - rx)} ${r1(by)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(bx + rx)} ${r1(by)}L${r1(tx + rx)} ${r1(ty)}Z`;
  return `<g class="sys-box" data-tone="violet"><path class="f-left" d="${body}"/><ellipse class="f-top" cx="${r1(tx)}" cy="${r1(ty)}" rx="${r1(rx)}" ry="${r1(ry)}"/></g><g class="sys-label" transform="translate(${r1(bx)} ${r1(by - (by - ty) * 0.4)})"><text y="2">Database</text><text class="sys-sub" y="15">ketersediaan</text></g>`;
}

const SPEC: SystemSpec<WaitSim> = {
  frame: F,
  floor: floor(F, [-7, -10, 28, 10]),
  render,
  cameraPad: [28, 24],
  analogyLabel: "Analogi sehari-hari: pengunjung datang ke ruang pelayanan tiket dengan tiga meja; petugas di gerbang mempersilakan tiga orang masuk, yang lain menunggu dengan nomor antrean, dan orang berikutnya masuk saat satu meja kosong.",
  label: "Cara kerja website: pengguna masuk ke waiting room; layanan izin akses meneruskan paling banyak tiga pengguna ke aplikasi pembelian, yang meminta data ke server dan database; saat satu tempat dilepas, pengguna berikutnya mendapat izin.",
};

export default function WaitSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
