import type { FigureStageProps } from "../types";
import { activeLink, DRIVES, latest, STATUS_TEXT, type DriveId, type Op, type OsSim } from "./model";
import { along, block, edge, floor, laptop, makeFrame, pill, token, zone, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/** Object storage in two readings (penitipan barang / sistem sebenarnya), driven by the same model. */

const APP: [number, number] = [0, 5.8];
const BR: [number, number] = [0.6, 10.8];
const API: [number, number] = [5.2, 3.6];
const BUCKET = { x: 10.4, y: 7.4, w: 11.2, d: 3.6 };
const DX: Record<DriveId, number> = { D1: 10, D2: 14, D3: 18, D4: 22 };
const DY = -2.6;
const F = makeFrame([[-1.6, 9, 0], [0, 5.8, 3.2], [BR[0], BR[1] + 3, 0], [DX.D1, DY, 3.4], [DX.D4 + 2.2, DY, 3], [DX.D4 + 2.2, DY + 2.2, 0], [BUCKET.x + BUCKET.w, BUCKET.y + BUCKET.d, 0], [BUCKET.x, BUCKET.y + BUCKET.d + 1.4, 0], [4, 14.4, 0]], 19);

const APP_API: Vec3[] = [[APP[0] + 2.8, 7.2, 0.3], [4.2, 7.2, 0.3], [4.2, 5.0, 0.3], [API[0], 5.0, 0.3]];
const BR_API: Vec3[] = [[BR[0] + 2.8, 12.2, 0.3], [6.6, 12.2, 0.3], [6.6, API[1] + 2.8, 0.3]];
const API_D: Record<DriveId, Vec3[]> = Object.fromEntries(
  DRIVES.map((id) => [id, [[API[0] + 2.8, 4.4, 0.3], [DX[id] + 1.1, 4.4, 0.3], [DX[id] + 1.1, DY + 2.2, 0.3]]]),
) as Record<DriveId, Vec3[]>;
const short = (key: string) => key.split("/").pop() ?? key;

function render(sim: OsSim, v: Visual) {
  const t = sim.t;
  const A = v.analogy;
  const out: string[] = [];
  const labels: string[] = [];

  out.push(zone(F, BUCKET.x, BUCKET.y, BUCKET.w, BUCKET.d, A ? `L E M A R I   ${sim.bucket}` : `B U C K E T   ${sim.bucket}`, "bucket", v));
  out.push(edge(F, APP_API, { part: "app", arrow: true }, v));
  out.push(edge(F, BR_API, { part: "link", arrow: true, dashed: !activeLink(sim) }, v));
  for (const id of DRIVES) out.push(edge(F, API_D[id], { part: "shards", arrow: true, faded: !sim.drives[id] }, v));

  // objects in the bucket: one box per key, stacked by version
  const keys = Object.keys(sim.objects).slice(0, 4);
  keys.forEach((key, i) => {
    const versions = sim.objects[key];
    const x = BUCKET.x + 1.2 + i * 2.7;
    const y = BUCKET.y + 1.3;
    // older versions stand behind the newest one
    versions.forEach((_, k) => {
      const back = versions.length - 1 - k;
      out.push(block(F, x - back * 1.0, y + back * 0.15, { tone: back === 0 ? "yellow" : "cream", label: "", part: versions.length > 1 ? "versions" : "objects", w: 1.3, d: 1.3, h: 0.8 }, v));
    });
    const [px, py] = F.p(x + 0.65, y + 0.65, 1.0);
    const tag = versions.length > 1 ? `${short(key)} · ${versions.map((ver) => `v${ver.v}`).join(" ")}` : short(key);
    labels.push(pill(px, py - 12, tag, { small: true, part: versions.length > 1 ? "versions" : "objects", tone: versions.length > 1 ? "info" : "plain" }, v));
  });

  // requests in flight
  for (const op of sim.ops) {
    const k = v.reduced ? 1 : Math.min(1, op.phaseEnd > op.phaseAt ? (t - op.phaseAt) / (op.phaseEnd - op.phaseAt) : 1);
    const lane = op.from === "browser" ? BR_API : APP_API;
    const verb = op.kind === "put" ? (A ? "titip" : "PUT") : op.kind === "presign" ? (A ? "minta tiket" : "minta link") : A ? "ambil" : "GET";
    if (op.phase === "to-api") {
      const at = along(lane, k);
      out.push(token(F, at, "request"));
      const [x, y] = F.p(at[0], at[1], at[2] + 0.4);
      labels.push(pill(x, y - 16, `${verb} ${short(op.key)}`, { small: true }));
    } else if (op.phase === "lookup") {
      const [x, y] = F.p(API[0] + 1.4, API[1] + 1.4, 2.6);
      labels.push(pill(x, y - 30, A ? `cari label ${short(op.key)}…` : `cari key ${short(op.key)}…`, { small: true, tone: "info" }));
    } else if (op.phase === "write" || op.phase === "read") {
      for (const id of op.drives) out.push(token(F, along(API_D[id], op.phase === "write" ? k : 1 - k), "message"));
    } else if (op.phase === "to-client") {
      const at = along(lane, 1 - k);
      const ok = op.status === 200;
      out.push(token(F, at, !ok ? "fail" : op.kind === "presign" ? "referral" : "response"));
      const [x, y] = F.p(at[0], at[1], at[2] + 0.4);
      labels.push(pill(x, y - 16, op.kind === "presign" && ok ? (A ? "tiket 6 dtk" : "link 6 dtk") : STATUS_TEXT[op.status!], { small: true, tone: ok ? (op.kind === "presign" ? "info" : "ok") : "bad" }));
    }
  }

  // components, back to front
  for (const id of DRIVES) {
    const n = Object.values(sim.objects).reduce((sum, versions) => sum + versions.filter((ver) => ver.drives.includes(id)).length, 0);
    out.push(block(F, DX[id], DY, { tone: "blue", label: A ? `Gudang ${id.slice(1)}` : `Drive ${id.slice(1)}`, icon: A ? "booth" : "server", part: "drives", down: !sim.drives[id], w: 2.2, d: 2.2, h: 1.6 }, v));
    const [x, y] = F.p(DX[id] + 1.1, DY + 1.1, 2.3);
    labels.push(pill(x, y - 8, sim.drives[id] ? `${n} bagian` : A ? "TUTUP" : "MATI", { small: true, tone: sim.drives[id] ? "plain" : "bad", part: "drives" }, v));
  }
  out.push(block(F, API[0], API[1], A ? { tone: "orange", label: "Loket", sub: "penitipan", icon: "inbox", part: "api" } : { tone: "orange", label: "Object storage", sub: "API S3", icon: "inbox", part: "api" }, v));
  out.push(block(F, APP[0], APP[1], { tone: "violet", label: A ? "Toko online" : "Aplikasi", sub: A ? undefined : "server", icon: A ? "booth" : "server", part: "app" }, v));
  out.push(laptop(F, BR[0], BR[1], "browser", v));

  // what each place knows
  const [bx, by] = F.p(BR[0] + 1.2, BR[1] + 2.8, 0);
  const link = activeLink(sim);
  const left = link ? link.expiresAt - t : 0;
  labels.push(pill(bx, by + 20, link ? (left > 0 ? `${A ? "tiket" : "link"} · sisa ${left.toFixed(1).replace(".", ",")} dtk` : `${A ? "tiket" : "link"} kedaluwarsa`) : A ? "Pembeli" : "Browser pengguna", { small: true, tone: link ? (left > 0 ? "info" : "warn") : "plain", part: link ? "link" : "browser" }, v));
  const [ax, ay] = F.p(API[0] + 1.4, API[1] + 1.4, 2.6);
  if (sim.lastStatus) labels.push(pill(ax + 50, ay - 2, `terakhir: ${STATUS_TEXT[sim.lastStatus]}`, { small: true, tone: sim.lastStatus === 200 ? "ok" : "bad", part: "api" }, v));
  const [zx, zy] = F.p(BUCKET.x + BUCKET.w, BUCKET.y + BUCKET.d, 0);
  const count = Object.keys(sim.objects).length;
  labels.push(pill(zx - 40, zy + 22, `${count} ${A ? "kotak" : "objek"}${count ? ` · ${short(Object.keys(sim.objects)[count - 1])} v${latest(sim, Object.keys(sim.objects)[count - 1])!.v}` : ""}`, { small: true, part: "bucket" }, v));
  return out.join("") + labels.join("");
}

const SPEC: SystemSpec<OsSim> = {
  frame: F,
  floor: floor(F, [-2, -5, 26, 16]),
  render,
  analogyLabel: "Analogi sehari-hari: toko online menitipkan kotak berlabel di loket penitipan; kotak disimpan di lemari milik toko, dipecah dengan cadangan ke empat gudang, dan pembeli bisa mengambil langsung dengan tiket berbatas waktu.",
  label: "Sistem sebenarnya: aplikasi mengirim file ke layanan object storage lewat API S3; objek disimpan di bucket dengan key, dipecah ke empat drive, dan browser bisa mengunduh langsung dengan link sementara.",
};

export default function OsSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}

export type { Op };
