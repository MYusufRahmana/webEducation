import type { FigureStageProps } from "../types";
import { activeLink, DRIVES, latest, STATUS_TEXT, type DbOp, type DriveId, type Op, type OsSim } from "./model";
import { along, block, edge, esc, floor, laptop, makeFrame, partAttrs, pill, token, zone, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * The application is the hub. Small records go one way, big files the other:
 *
 *                              ┌ bucket konser-senja ─────────────┐
 *                              │ drive 1  drive 2  drive 3  drive 4 │
 *                              └────┬───────┬───────┬───────┬───┘
 *   DATABASE ══ APLIKASI ══ OBJECT STORAGE ──┘ (one branch per drive)
 *                  ║            ▲
 *              BROWSER ─────────┘ (link)
 *
 * Every link has a lane out and a lane back; the browser's direct download is an L that passes no
 * other lane. The bucket is drawn as the frame around the drives that actually hold its files.
 */
const APP = { x: 0, y: 0, w: 2.8, d: 2.8, h: 2.1 };
const DB: [number, number] = [-6.4, 1.4];
const RD = 1.4;
const STORE = { x: 8.2, y: 0, w: 2.8, d: 2.8, h: 2.1 };
// the drives stand in one row behind the storage service, far enough apart never to overlap
const DRV = { y: -4.6, w: 1.6, d: 1.6, h: 1.3 };
const driveX = (i: number) => STORE.x + 0.4 + i * 3.6;
const SPINE_Y = -1.6;
const BUCKET = { x: STORE.x - 0.2, y: DRV.y - 0.8, w: 3 * 3.6 + 2.8, d: 3.2 };
const BR: [number, number] = [0.2, 7.8];
const Z = 0.3;
const A1 = 0.9;
const A2 = 1.9;
const dbEdge = (y: number) => DB[0] + Math.sqrt(RD * RD - (y - DB[1]) ** 2);

const LANES = {
  dbGo: [[APP.x, A1, Z], [dbEdge(A1), A1, Z]] as Vec3[],
  dbBack: [[dbEdge(A2), A2, Z], [APP.x, A2, Z]] as Vec3[],
  stGo: [[APP.x + APP.w, A1, Z], [STORE.x, A1, Z]] as Vec3[],
  stBack: [[STORE.x, A2, Z], [APP.x + APP.w, A2, Z]] as Vec3[],
  toBrowser: [[A2, APP.y + APP.d, Z], [A2, BR[1] - 0.3, Z]] as Vec3[],
  brGo: [[BR[0] + 2.75, 9.0, Z], [9.1, 9.0, Z], [9.1, STORE.y + STORE.d, Z]] as Vec3[],
  brBack: [[10.1, STORE.y + STORE.d, Z], [10.1, 9.9, Z], [BR[0] + 2.75, 9.9, Z]] as Vec3[],
};
const branchX = (i: number) => driveX(i) + DRV.w / 2;
const TRUNK: Vec3[] = [[branchX(0), STORE.y, Z], [branchX(0), SPINE_Y, Z]];
const SPINE_LINE: Vec3[] = [[branchX(0), SPINE_Y, Z], [branchX(3), SPINE_Y, Z]];
const DRIVE_PATH: Record<DriveId, Vec3[]> = Object.fromEntries(
  DRIVES.map((id, i) => [id, [[branchX(0), STORE.y, Z], [branchX(0), SPINE_Y, Z], [branchX(i), SPINE_Y, Z], [branchX(i), DRV.y + DRV.d, Z]]]),
) as Record<DriveId, Vec3[]>;

const EXTENT: Vec3[] = [
  [DB[0] - RD - 4, DB[1], 4.6],
  [DB[0] - RD - 1, DB[1] + RD + 1.2, 0],
  [APP.x, APP.y - 2, 4.2],
  [BR[0] - 4.4, BR[1] + 4.2, 0],
  [BR[0] + 3, BR[1] + 4, 0],
  [BUCKET.x, BUCKET.y, 3.6],
  [BUCKET.x + BUCKET.w + 6, BUCKET.y - 6, 0],
  [BUCKET.x + BUCKET.w + 4.4, BUCKET.y + BUCKET.d + 4.4, 0],
];
const F = makeFrame(EXTENT, 21);
function anchor() {
  const pts = EXTENT.map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pillWidth = (text: string) => Math.max(28, text.length * 11 * 0.56 + 18);
const short = (key: string) => key.split("/").pop() ?? key;

/** The database: a cylinder with its label. */
function cylinder(A: boolean, v: Visual) {
  const [cx, cy] = DB;
  const h = 2.1;
  const rx = RD * 1.2247 * F.unit;
  const ry = RD * 0.7071 * F.unit;
  const [bx, by] = F.p(cx, cy, 0);
  const [tx, ty] = F.p(cx, cy, h);
  const body = `M${r1(tx - rx)} ${r1(ty)}L${r1(bx - rx)} ${r1(by)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(bx + rx)} ${r1(by)}L${r1(tx + rx)} ${r1(ty)}Z`;
  const halo = v.highlight.has("db") ? `<ellipse class="sys-halo" cx="${r1(bx)}" cy="${r1(by)}" rx="${r1(rx * 1.5)}" ry="${r1(ry * 1.6)}"/>` : "";
  return `<g class="sys-node sys-component sys-db" data-key="db"${partAttrs("db", v)}>${halo}<g class="sys-box" data-tone="violet"><path class="f-left" d="${body}"/><ellipse class="f-top" cx="${r1(tx)}" cy="${r1(ty)}" rx="${r1(rx)}" ry="${r1(ry)}"/></g><g class="sys-label" transform="translate(${r1(bx)} ${r1(by - (by - ty) * 0.4)})"><text y="2">${esc(A ? "Buku kasir" : "Database")}</text><text class="sys-sub" y="15">${esc(A ? "catatan kecil" : "data kecil")}</text></g></g>`;
}

type Corridor = "above" | "below" | "left" | "right";
function laneLabel(lane: Vec3[], share: number, side: Corridor, text: string, tone: "plain" | "ok" | "warn" | "bad" | "info", part: string, v: Visual) {
  const mid = along(lane, share);
  const [x, y] = F.p(mid[0], mid[1], Z);
  const w = pillWidth(text);
  const [px, py] = side === "above" ? [x + w / 2 + 2, y - 18] : side === "below" ? [x - w / 2 - 2, y + 20] : side === "left" ? [x - w / 2 - 14, y - 4] : [x + w / 2 + 14, y];
  return pill(px, py, text, { small: true, tone, part }, v);
}

function render(sim: OsSim, v: Visual) {
  const t = sim.t;
  const A = v.analogy;
  const out: string[] = [anchor()];
  const toks: string[] = [];
  const labels: string[] = [];

  // the bucket is the frame around the drives that hold its files
  out.push(zone(F, BUCKET.x, BUCKET.y, BUCKET.w, BUCKET.d, "", "bucket", v));

  // which lanes are in use
  const busy = new Set<string>();
  for (const op of sim.ops) {
    if (op.phase === "to-api") busy.add(op.from === "browser" ? "brGo" : "stGo");
    if (op.phase === "to-client") busy.add(op.from === "browser" ? "brBack" : "stBack");
    if (op.phase === "write" || op.phase === "read") busy.add("drives");
  }
  for (const op of sim.dbOps) busy.add(op.phase === "to-db" ? "dbGo" : op.phase === "to-app" ? "dbBack" : "");
  const link = activeLink(sim);
  const handing = link && link.givenAt !== null && t - link.givenAt < 0.8;
  if (handing) busy.add("toBrowser");
  const lane = (key: keyof typeof LANES, part: string, dashed = false) => out.push(edge(F, LANES[key], { part, arrow: true, dashed, faded: !busy.has(key) }, v));
  lane("dbGo", "db");
  lane("dbBack", "db");
  lane("stGo", "api");
  lane("stBack", "api");
  lane("toBrowser", "link");
  lane("brGo", "link", !link);
  lane("brBack", "link", !link);
  out.push(edge(F, TRUNK, { part: "shards", faded: !busy.has("drives") }, v));
  out.push(edge(F, SPINE_LINE, { part: "shards", faded: !busy.has("drives") }, v));
  DRIVES.forEach((id, i) => out.push(edge(F, [[branchX(i), SPINE_Y, Z], [branchX(i), DRV.y + DRV.d, Z]], { part: "shards", arrow: true, faded: !busy.has("drives") || !sim.drives[id] }, v)));

  // database trips
  for (const op of sim.dbOps as DbOp[]) {
    if (op.phase === "done") continue;
    const k = v.reduced ? 1 : Math.min(1, (t - op.phaseAt) / (op.phaseEnd - op.phaseAt));
    const go = op.phase === "to-db";
    toks.push(token(F, along(go ? LANES.dbGo : LANES.dbBack, k), go ? "request" : "response"));
    const text = go ? (op.kind === "write" ? `catat: ${op.label} → ${op.key}` : `key poster ${op.label}?`) : op.kind === "write" ? "tercatat" : op.key ? `key: ${op.key}` : "tidak ada";
    labels.push(laneLabel(go ? LANES.dbGo : LANES.dbBack, 0.5, go ? "above" : "below", text, go ? "plain" : "ok", "db", v));
  }

  // storage trips
  for (const op of sim.ops as Op[]) {
    const k = v.reduced ? 1 : Math.min(1, op.phaseEnd > op.phaseAt ? (t - op.phaseAt) / (op.phaseEnd - op.phaseAt) : 1);
    const browser = op.from === "browser";
    const verb = op.kind === "put" ? (A ? "titip" : "simpan") : op.kind === "presign" ? (A ? "minta tiket ambil" : "minta link") : A ? "ambil" : "ambil";
    if (op.phase === "to-api") {
      const l = browser ? LANES.brGo : LANES.stGo;
      toks.push(token(F, along(l, k), "request"));
      labels.push(laneLabel(l, browser ? 0.35 : 0.5, "above", browser ? `${A ? "pakai tiket" : "pakai link"} · ${short(op.key)}` : `${verb} ${op.key}${op.sizeMb ? ` · ${op.sizeMb} MB` : ""}`, "plain", browser ? "link" : "api", v));
    } else if (op.phase === "write" || op.phase === "read") {
      for (const id of op.drives) toks.push(token(F, along(DRIVE_PATH[id], op.phase === "write" ? k : 1 - k), "message"));
      const [x, y] = F.p(branchX(1), SPINE_Y, Z);
      labels.push(pill(x + 90, y + 22, op.phase === "write" ? `${op.drives.length} bagian → ${op.drives.length} drive` : "2 bagian cukup untuk menyusun file", { small: true, tone: "info", part: "shards" }, v));
    } else if (op.phase === "lookup") {
      const [x, y] = F.p(STORE.x + STORE.w / 2, STORE.y + STORE.d / 2, STORE.h);
      labels.push(pill(x, y - 52, A ? `cari label ${op.key}…` : `cari key ${op.key}…`, { small: true, tone: "info", part: "api" }, v));
    } else if (op.phase === "to-client") {
      const l = browser ? LANES.brBack : LANES.stBack;
      const ok = op.status === 200;
      toks.push(token(F, along(l, k), !ok ? "fail" : op.kind === "presign" ? "referral" : "response"));
      const text = op.kind === "presign" && ok ? (A ? "tiket ambil · 6 dtk" : "link sementara · 6 dtk") : ok && op.kind === "get" ? `${short(op.key)}${op.version && op.version > 1 ? ` v${op.version}` : ""} · ${STATUS_TEXT[200]}` : browser && op.status === 403 ? "link kedaluwarsa · ditolak" : STATUS_TEXT[op.status!];
      labels.push(laneLabel(l, browser ? 0.7 : 0.5, "below", text, ok ? (op.kind === "presign" ? "info" : "ok") : "bad", browser ? "link" : "api", v));
    }
  }
  if (handing) {
    const k = v.reduced ? 1 : Math.min(1, (t - link!.givenAt!) / 0.8);
    toks.push(token(F, along(LANES.toBrowser, k), "referral"));
    labels.push(laneLabel(LANES.toBrowser, 0.5, "right", A ? "tiket untuk pembeli" : "link untuk browser", "info", "link", v));
  }

  // components, back to front
  DRIVES.forEach((id, i) => {
    out.push(block(F, driveX(i), DRV.y, { tone: "blue", label: A ? `Gudang ${i + 1}` : `Drive ${i + 1}`, part: "drives", down: !sim.drives[id], w: DRV.w, d: DRV.d, h: DRV.h }, v));
  });
  out.push(cylinder(A, v));
  out.push(block(F, APP.x, APP.y, { tone: "green", label: A ? "Kasir toko" : "Aplikasi", sub: A ? "website tiket" : "server", icon: A ? "booth" : "server", part: "app", w: APP.w, d: APP.d, h: APP.h }, v));
  out.push(block(F, STORE.x, STORE.y, { tone: "orange", label: A ? "Loket" : "Object storage", sub: A ? "penitipan" : "layanan S3", icon: "inbox", part: "api", w: STORE.w, d: STORE.d, h: STORE.h }, v));
  out.push(laptop(F, BR[0], BR[1], "browser", v));

  // drive contents, beside each drive
  DRIVES.forEach((id, i) => {
    const n = Object.values(sim.objects).reduce((sum, versions) => sum + versions.filter((ver) => ver.drives.includes(id)).length, 0);
    const [x, y] = F.p(driveX(i) + DRV.w / 2, DRV.y + DRV.d / 2, DRV.h);
    const text = sim.drives[id] ? `${n} bagian` : A ? "TUTUP" : "RUSAK";
    labels.push(pill(x, y - 30, text, { small: true, tone: sim.drives[id] ? "plain" : "bad", part: "drives" }, v));
  });

  // what the database and the bucket hold
  const [dx, dy] = F.p(DB[0], DB[1], 2.1);
  const rows = sim.rows.length ? sim.rows.map((r) => `${r.label} → ${r.key}`) : [A ? "buku masih kosong" : "tabel masih kosong"];
  rows.forEach((text, i) => labels.push(pill(dx, dy - 30 - i * 22, text, { small: true, tone: sim.rows.length ? "info" : "plain", part: "db" }, v)));
  // the bucket's name and its file list, to the right of the row of drives
  const [bx, by] = F.p(BUCKET.x + BUCKET.w, BUCKET.y + BUCKET.d / 2, 0);
  const title = `${A ? "Lemari" : "Bucket"} ${sim.bucket}`;
  labels.push(pill(bx + pillWidth(title) / 2 + 10, by - 6, title, { part: "bucket" }, v));
  const files = Object.keys(sim.objects);
  (files.length ? files : [""]).forEach((key, i) => {
    const versions = sim.objects[key] ?? [];
    const text = key ? `${key} · ${latest(sim, key)!.sizeMb} MB${versions.length > 1 ? ` · ${versions.map((ver) => `v${ver.v}`).join(" ")}` : ""}` : A ? "lemari masih kosong" : "bucket masih kosong";
    labels.push(pill(bx + pillWidth(text) / 2 + 22, by + 20 + i * 22, text, { small: true, tone: versions.length > 1 ? "info" : "plain", part: versions.length > 1 ? "versions" : "objects" }, v));
  });

  // the browser and its link
  const [lx, ly] = F.p(BR[0] + 1.2, BR[1] + 2.8, 0);
  labels.push(pill(lx - 40, ly + 20, A ? "Pembeli" : "Browser pembeli", { small: true, part: "browser" }, v));
  if (link && link.givenAt !== null) {
    const left = link.expiresAt - t;
    const text = left > 0 ? `${A ? "tiket ambil" : "link"} · sisa ${left.toFixed(1).replace(".", ",")} dtk` : `${A ? "tiket" : "link"} kedaluwarsa`;
    labels.push(pill(lx - 40, ly + 44, text, { small: true, tone: left > 0 ? "info" : "warn", part: "link" }, v));
  }
  return out.join("") + toks.join("") + labels.join("");
}

const SPEC: SystemSpec<OsSim> = {
  frame: F,
  floor: floor(F, [-12, -10, 28, 14]),
  render,
  cameraPad: [28, 24],
  analogyLabel: "Analogi sehari-hari: kasir toko menitipkan kotak besar di loket penitipan dan hanya mencatat nomor labelnya di buku kasir; kotak disimpan di lemari, dibagi ke empat gudang, dan pembeli bisa mengambil langsung dengan tiket berbatas waktu.",
  label: "Sistem sebenarnya: aplikasi menyimpan catatan kecil dan key file di database, sedangkan filenya di object storage; file berada di bucket, dibagi ke empat drive, dan browser bisa mengunduh langsung dengan link sementara.",
};

export default function OsSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}

export type { Op };
