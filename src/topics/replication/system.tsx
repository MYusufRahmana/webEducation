import type { FigureStageProps } from "../types";
import { APPS, RESULT_TEXT, lagTx, writerDb, type AppId, type DbId, type Order, type ReplSim, type Role } from "./model";
import { along, block, crowd, edge, esc, floor, makeFrame, partAttrs, pill, token, zone, type Frame, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/** Ticket sale with a replicated database, in two readings (loket & buku stok / sistem sebenarnya). */

/*
 * Layout: a symmetric tree that flows from bottom-left to top-right, with no crossing lines.
 *   users → load balancer (in front of server B) → splits into A / B / C
 *   A / B / C → merge into one write bus → straight up into the database that accepts writes
 *   primary → copy on their own line behind; failover manager behind both; page views on the right.
 */
const AX: Record<AppId, number> = { A: 3, B: 8.6, C: 14.2 };
const AY = 0;
const center = (app: AppId) => AX[app] + 1.2;
const MID = center("B");
const LB: [number, number] = [MID - 1.1, 6.4];
const CROWD = { x: MID - 1.5, y: 10.8, w: 3, d: 3.6 };
const DBP: Record<DbId, [number, number]> = { D1: [MID, -7.6], D2: [MID + 11.6, -7.6] };
const MGR: [number, number] = [(DBP.D1[0] + DBP.D2[0]) / 2 - 1.1, -14.6];
const R = 1.6;
const SPLIT_Y = 3.6;
const BUS_Y = -1.4;
const MGR_Y = DBP.D1[1] - R - 1.4;
const READ_X = DBP.D2[0] + 0.9;
/** Every corner the scene can ever use: the camera frames all of it in every step. */
const EXTENT: Vec3[] = [
  [CROWD.x - 0.4, CROWD.y + CROWD.d + 1.6, 0],
  [CROWD.x, CROWD.y, 3],
  [AX.A - 0.6, AY + 2.4, 0],
  [AX.A, AY, 3.4],
  [READ_X + 1, AY + 1.2, 0],
  [DBP.D2[0] + 2.8, DBP.D2[1] + 2.8, 0],
  [DBP.D2[0] + 2.8, DBP.D2[1] - 2.8, 0],
  [DBP.D2[0] - 1, DBP.D2[1] - 1, 4.6],
  [DBP.D1[0] - 5.2, DBP.D1[1] + 1, 5],
  [DBP.D1[0] - 1.5, DBP.D1[1] - 1.5, 6.4],
  [MGR[0] - 0.5, MGR[1], 6.4],
  [READ_X - 4, AY + 3.6, 0],
  [MGR[0] + 2.2, MGR[1] + 2.2, 0],
];
const F = makeFrame(EXTENT, 19);

/** Drop repeated points so a straight run is drawn as one clean segment. */
const path = (pts: Vec3[]): Vec3[] => pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6);
const IN: Vec3[] = [[MID, CROWD.y, 0.3], [MID, LB[1] + 2.2, 0.3]];
const TO_APP = (app: AppId): Vec3[] => path([[MID, LB[1], 0.3], [MID, SPLIT_Y, 0.3], [center(app), SPLIT_Y, 0.3], [center(app), AY + 2.4, 0.3]]);
const WRITE = (app: AppId, db: DbId): Vec3[] => path([[center(app), AY, 0.3], [center(app), BUS_Y, 0.3], [DBP[db][0], BUS_Y, 0.3], [DBP[db][0], DBP[db][1] + R, 0.3]]);
const READ = (app: AppId, db: DbId): Vec3[] => [[AX[app] + 2.4, AY + 1.2, 0.3], [DBP[db][0] + 0.9, AY + 1.2, 0.3], [DBP[db][0] + 0.9, DBP[db][1] + 1.3, 0.3]];
const STREAM = (from: DbId, to: DbId): Vec3[] => [[DBP[from][0] + (from === "D1" ? R : -R), DBP[from][1], 0.9], [DBP[to][0] + (to === "D1" ? R : -R), DBP[to][1], 0.9]];
const MGR_TO = (db: DbId): Vec3[] => path([[MGR[0] + 1.1, MGR[1] + 2.2, 0.3], [MGR[0] + 1.1, MGR_Y, 0.3], [DBP[db][0], MGR_Y, 0.3], [DBP[db][0], DBP[db][1] - R, 0.3]]);

/** An invisible outline of the whole scene, so the camera frames the same view in every step. */
function anchor() {
  const pts = EXTENT.map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

/** A database drawn as a cylinder: top ellipse, body and a role label. */
function cylinder(f: Frame, db: DbId, o: { label: string; sub: string; tone: "violet" | "grey"; down: boolean; isolated: boolean; part: string }, v: Visual) {
  const [cx, cy] = DBP[db];
  const h = 2.4;
  const rx = R * 1.2247 * f.unit;
  const ry = R * 0.7071 * f.unit;
  const [bx, by] = f.p(cx, cy, 0);
  const [tx, ty] = f.p(cx, cy, h);
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const body = `M${r1(tx - rx)} ${r1(ty)}L${r1(bx - rx)} ${r1(by)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(bx + rx)} ${r1(by)}L${r1(tx + rx)} ${r1(ty)}Z`;
  const bands = [0.8, 1.6].map((z) => { const [, y] = f.p(cx, cy, z); return `<path class="sys-band" d="M${r1(bx - rx)} ${r1(y)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(bx + rx)} ${r1(y)}"/>`; }).join("");
  const top = `<ellipse class="f-top" cx="${r1(tx)}" cy="${r1(ty)}" rx="${r1(rx)}" ry="${r1(ry)}"/>`;
  const cross = o.down ? `<path class="sys-x" d="M${r1(tx - 10)} ${r1(ty + 14)}l20 20M${r1(tx + 10)} ${r1(ty + 14)}l-20 20"/>` : "";
  const halo = v.highlight.has(o.part) ? `<ellipse class="sys-halo" cx="${r1(bx)}" cy="${r1(by)}" rx="${r1(rx * 1.5)}" ry="${r1(ry * 1.6)}"/>` : "";
  const label = `<g class="sys-label" transform="translate(${r1(bx)} ${r1(by - (by - ty) * 0.38)})"><text y="2">${esc(o.label)}</text><text class="sys-sub" y="15">${esc(o.sub)}</text></g>`;
  return `<g class="sys-node sys-component sys-db" data-key="db-${db}"${partAttrs(o.part, v)}${o.isolated ? " data-isolated" : ""}>${halo}<g class="sys-box" data-tone="${o.down || o.isolated ? "grey" : o.tone}"><path class="f-left" d="${body}"/>${bands}${top}</g>${label}${cross}</g>`;
}

const ROLE_NAME = (role: Role, db: DbId, A: boolean) => {
  if (role === "primary") return A ? (db === "D2" ? "Buku resmi baru" : "Buku stok resmi") : db === "D2" ? "Utama baru" : "Database utama";
  if (role === "replica" || role === "copying" || role === "syncing") return A ? "Buku salinan" : "Database salinan";
  return A ? "Buku resmi lama" : "Utama lama";
};

function orderPoint(o: Order, k: number): Vec3 | null {
  if (o.phase === "to-lb") return along(IN, k);
  if (o.phase === "to-app") return along(TO_APP(o.app), k);
  if (o.phase === "to-db" && o.db) return along(WRITE(o.app, o.db), k);
  if (o.phase === "to-client") return o.db ? along(WRITE(o.app, o.db), 1 - k) : along(TO_APP(o.app), 1);
  return null;
}

function render(sim: ReplSim, v: Visual) {
  const t = sim.t;
  const A = v.analogy;
  const scene = v.step ?? 99;
  const out: string[] = [];
  const labels: string[] = [];
  const writer = writerDb(sim);
  const showReplica = scene >= 2 && sim.dbs.D2.role !== "absent";
  const showManager = scene >= 5;
  const replica = (["D1", "D2"] as DbId[]).find((db) => db !== writer && ["replica", "copying", "syncing"].includes(sim.dbs[db].role)) ?? null;

  out.push(anchor());
  // zone for the copy in another location
  if (showReplica) out.push(zone(F, DBP.D2[0] - 2.8, DBP.D2[1] - 2.8, 5.6, 5.6, A ? "K A N T O R   L A I N" : "L O K A S I   L A I N", "replica", v));

  // lanes
  out.push(edge(F, IN, { part: "visitors", arrow: true }, v));
  for (const app of APPS) out.push(edge(F, TO_APP(app), { part: "lb", arrow: true }, v));
  const writeTo: DbId = writer ?? (sim.failover.candidate && sim.failover.phase !== "idle" ? "D1" : "D1");
  for (const app of APPS) out.push(edge(F, WRITE(app, writer ?? writeTo), { part: "apps", arrow: true, faded: !writer }, v));
  if (scene >= 4 && replica === "D2") out.push(edge(F, READ("C", replica), { part: "reads", dashed: true, arrow: true }, v));
  if (showReplica && replica && writer) out.push(edge(F, STREAM(writer, replica), { part: "stream", arrow: true }, v));
  else if (showReplica && sim.dbs.D2.role === "copying") out.push(edge(F, STREAM("D1", "D2"), { part: "stream", arrow: true }, v));
  if (showManager) for (const db of ["D1", "D2"] as DbId[]) out.push(edge(F, MGR_TO(db), { part: "manager", dashed: true }, v));

  // tokens: orders (orange, numbered), copied changes (green), page views (white)
  for (const o of sim.orders) {
    const k = v.reduced ? 1 : Math.min(1, (t - o.phaseAt) / Math.max(1e-6, o.phaseEnd - o.phaseAt));
    const at = o.phase === "done" ? null : orderPoint(o, k);
    if (!at) continue;
    const back = o.phase === "to-client";
    const ok = o.result === "reserved" || o.result === "duplicate";
    out.push(token(F, at, back ? (ok ? "response" : "fail") : "request"));
    const [x, y] = F.p(at[0], at[1], 0.8);
    const text = back ? `${o.id} · ${o.result === "reserved" ? `✓ ${RESULT_TEXT.reserved}` : o.result === "duplicate" ? "= sudah tercatat" : o.result === "sold-out" ? "✕ tiket habis" : "✕ coba lagi"}` : o.phase === "to-db" && o.db && sim.dbs[o.db].role !== "primary" ? `${o.id} · menunggu…` : `${o.id} · Beli`;
    labels.push(pill(x, y - 14, text, { small: true, tone: back ? (ok ? "ok" : "bad") : "plain" }));
  }
  for (const c of sim.changes) {
    const k = v.reduced ? 1 : Math.min(1, (t - c.sentAt) / (c.arriveAt - c.sentAt));
    const at = along(STREAM(c.from, c.to), k);
    out.push(token(F, at, "answer"));
    const [x, y] = F.p(at[0], at[1], 0.8);
    labels.push(pill(x, y + 20, A ? `salinan catatan #${c.tx}` : `perubahan #${c.tx}`, { small: true, tone: "ok", part: "stream" }, v));
  }
  for (const r of sim.reads) {
    if (r.doneAt === null) {
      const k = v.reduced ? 1 : Math.min(1, (t - r.sentAt) / (r.arriveAt - r.sentAt));
      out.push(token(F, along(READ(r.app, r.db), k), "probe"));
    } else if (t - r.doneAt < 2.4) {
      const [x, y] = F.p((AX[r.app] + 2.4 + READ_X) / 2, AY + 1.2, 0.3);
      labels.push(pill(x, y + 16, `lihat acara: stok ${r.shown}${r.stale ? " (tertinggal)" : ""}`, { small: true, tone: r.stale ? "warn" : "info", part: "reads" }, v));
    }
  }

  // components
  for (const app of APPS) out.push(block(F, AX[app], AY, { tone: "blue", label: A ? `Loket ${app}` : `Server ${app}`, sub: A ? undefined : "aplikasi", icon: A ? "booth" : "server", part: "apps", w: 2.4, d: 2.4, h: 1.8 }, v));
  out.push(block(F, LB[0], LB[1], { tone: "yellow", label: A ? "Petugas" : "Load", sub: A ? "antrean" : "balancer", icon: A ? "person" : "split", part: "lb", w: 2.2, d: 2.2, h: 1.5 }, v));
  out.push(crowd(F, CROWD.x, CROWD.y, CROWD.w, CROWD.d, 12, "visitors", v));
  for (const db of ["D1", "D2"] as DbId[]) {
    const d = sim.dbs[db];
    if (d.role === "absent" || (db === "D2" && !showReplica)) continue;
    out.push(cylinder(F, db, { label: ROLE_NAME(d.role, db, A), sub: `stok ${d.stock} · #${d.applied}`, tone: "violet", down: d.role === "down", isolated: d.role === "isolated", part: d.role === "primary" || d.role === "down" ? "primary" : "replica" }, v));
    const [x, y] = F.p(DBP[db][0], DBP[db][1], 2.6);
    const lag = db === replica && d.role === "replica" ? lagTx(sim) : 0;
    const state =
      d.role === "primary" ? (writer === db ? "✎ Menerima penulisan" : "Utama · belum diarahkan")
      : d.role === "down" ? "✕ GAGAL · tidak merespons"
      : d.role === "isolated" ? "⛔ Diisolasi · tidak menerima penulisan"
      : d.role === "copying" ? `Menyalin data awal ${Math.round(d.progress * 100)}%`
      : d.role === "syncing" ? `Menyelaraskan ${Math.round(d.progress * 100)}%`
      : lag > 0 ? `Salinan · tertinggal ${lag} transaksi` : "✓ Salinan siap · sama";
    const tone = d.role === "primary" ? "ok" : d.role === "down" ? "bad" : d.role === "isolated" ? "bad" : lag > 0 || d.role !== "replica" ? "warn" : "info";
    labels.push(pill(x, y - 22, state, { small: true, tone, part: d.role === "primary" || d.role === "down" || d.role === "isolated" ? "primary" : "replica" }, v));
  }
  if (showManager) {
    out.push(block(F, MGR[0], MGR[1], { tone: "grey", label: A ? "Koordinator" : "Pengelola", sub: A ? "operasional" : "failover", icon: "clipboard", part: "manager", w: 2.2, d: 2.2, h: 1.4 }, v));
    const phase = sim.failover.phase;
    const text = { idle: "memantau", detecting: "1 · mendeteksi kegagalan", isolating: "2 · mengisolasi utama lama", checking: "3 · memeriksa salinan", promoting: "4 · mempromosikan salinan", redirecting: "5 · mengarahkan aplikasi", done: "✓ pergantian selesai" }[phase];
    const [x, y] = F.p(MGR[0] + 1.1, MGR[1] + 1.1, 1.6);
    labels.push(pill(x, y - 26, text, { small: true, tone: phase === "done" ? "ok" : phase === "idle" ? "plain" : "warn", part: "manager" }, v));
  }
  if (!writer) {
    const [x, y] = F.p(MID, BUS_Y, 0.3);
    labels.push(pill(x + 60, y + 4, A ? "Loket menunggu buku resmi" : "Penulisan ditahan sementara", { tone: "warn", part: "apps" }, v));
  }
  const [cx, cy] = F.p(CROWD.x + 1.5, CROWD.y + CROWD.d, 0);
  labels.push(pill(cx, cy + 22, A ? "pengunjung loket tiket" : "pengguna website", { small: true, part: "visitors" }, v));
  return out.join("") + labels.join("");
}

const SPEC: SystemSpec<ReplSim> = {
  frame: F,
  floor: floor(F, [0, -16, 26, 16]),
  render,
  analogyLabel: "Analogi sehari-hari: pengunjung diatur petugas antrean ke loket A, B, C; semua loket mencatat di satu buku stok resmi, yang salinannya disimpan di kantor lain; koordinator operasional mengatur pergantian bila buku resmi tidak bisa dipakai.",
  label: "Sistem sebenarnya: pengguna dibagi load balancer ke server aplikasi A, B, C; semua menulis ke satu database utama, yang perubahannya disalin ke database replika; pengelola failover mempromosikan replika bila utama gagal.",
};

export default function ReplSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
