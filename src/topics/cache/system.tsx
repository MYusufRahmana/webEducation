import type { FigureStageProps } from "../types";
import { KEYS, isStale, lookup, progressOf, SEAT, type CacheSim, type Key, type Lane, type Req } from "./model";
import { along, block, crowd, edge, esc, floor, makeFrame, partAttrs, pill, token, type Frame, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * Layout (fixed in every step and in both readings), seen on screen:
 *
 *      PANITIA                CACHE        (cache: its own two lanes, never a gate to the database)
 *            \              /
 *              ── SERVER ──
 *            /               *   PENGUNJUNG                DATABASE
 *
 * Every link has two parallel lanes: the request lane and the answer lane, each with its own arrow.
 * Each lane has a reserved label corridor on its outer side, so labels never sit on a component.
 */
const SRV = { x: 0, y: 0, w: 2.8, d: 2.8, h: 2.1 };
const CROWD = { x: -0.2, y: 9.2, w: 3.2, d: 2.8 };
const CACHE = { x: 0.2, y: -8.2, w: 2.4, d: 2.4, h: 1.6 };
const ADMIN = { x: -8.6, y: 0.4, w: 2, d: 2, h: 1.4 };
const DB: [number, number] = [12.8, 1.4];
const R = 1.5;
const Z = 0.3;
const A1 = 0.9; // request lane offset
const A2 = 1.9; // answer lane offset
const dbEdge = (y: number) => DB[0] - Math.sqrt(R * R - (y - DB[1]) ** 2);

const LANES: Record<Lane, Vec3[]> = {
  "c-s": [[A1, CROWD.y - 0.4, Z], [A1, SRV.d, Z]],
  "s-c": [[A2, SRV.d, Z], [A2, CROWD.y - 0.4, Z]],
  "s-d": [[SRV.w, A1, Z], [dbEdge(A1), A1, Z]],
  "d-s": [[dbEdge(A2), A2, Z], [SRV.w, A2, Z]],
  "s-k": [[A1, SRV.y, Z], [A1, CACHE.y + CACHE.d, Z]],
  "k-s": [[A2, CACHE.y + CACHE.d, Z], [A2, SRV.y, Z]],
  "a-s": [[ADMIN.x + ADMIN.w, A1, Z], [SRV.x, A1, Z]],
  "s-a": [[SRV.x, A2, Z], [ADMIN.x + ADMIN.w, A2, Z]],
};
/** Label corridor of each lane (screen side) and its first slot: twin lanes never share a slot. */
/** Third value: where along the lane the label waits (0 = start, 1 = end). */
const SIDE: Record<Lane, ["above" | "below" | "left" | "right", number, number]> = {
  "c-s": ["left", 0, 0.5],
  "s-c": ["right", 0, 0.75],
  "s-d": ["above", 0, 0.5],
  "d-s": ["below", 0, 0.3],
  "s-k": ["right", 0, 0.5],
  "k-s": ["right", 1, 0.5],
  "a-s": ["below", 1, 0.5],
  "s-a": ["below", 0, 0.5],
};

/*
 * What the camera frames: the parts shown in the step plus their label corridors. Steps 1–2 frame
 * only visitors, server and database, so they are drawn large; the cache and the organiser widen
 * the frame only from the step they appear in.
 */
const FRAME_BASE: Vec3[] = [
  [CROWD.x - 0.6, CROWD.y + CROWD.d + 2.4, 0],
  [CROWD.x - 6, CROWD.y + 1.2, 0],
  [SRV.x, SRV.y, 2.8],
  [SRV.x + SRV.w + 1, SRV.y - 0.6, 2.4],
  [DB[0] + R, DB[1] + R + 0.4, 0],
  [DB[0] + 6.9, DB[1] - 6.9, 1.2],
];
const FRAME_CACHE: Vec3[] = [[CACHE.x, CACHE.y, CACHE.h + 0.4], [CACHE.x + CACHE.w + 7.4, CACHE.y - 7.4, CACHE.h]];
const FRAME_ADMIN: Vec3[] = [[ADMIN.x - 0.6, ADMIN.y + ADMIN.d + 2.4, 0], [ADMIN.x, ADMIN.y, 2.4]];
const F = makeFrame([...FRAME_BASE, ...FRAME_CACHE, ...FRAME_ADMIN], 21);

function anchor(cache: boolean, admin: boolean) {
  const pts = [...FRAME_BASE, ...(cache ? FRAME_CACHE : []), ...(admin ? FRAME_ADMIN : [])].map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pillWidth = (text: string, small = true) => Math.max(28, text.length * (small ? 11 : 12.5) * 0.56 + 18);

/** The database: a cylinder with a label (official records). */
function cylinder(f: Frame, o: { label: string; sub: string; part: string }, v: Visual) {
  const [cx, cy] = DB;
  const h = 2.3;
  const rx = R * 1.2247 * f.unit;
  const ry = R * 0.7071 * f.unit;
  const [bx, by] = f.p(cx, cy, 0);
  const [tx, ty] = f.p(cx, cy, h);
  const body = `M${r1(tx - rx)} ${r1(ty)}L${r1(bx - rx)} ${r1(by)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(bx + rx)} ${r1(by)}L${r1(tx + rx)} ${r1(ty)}Z`;
  const bands = [0.8, 1.55].map((z) => { const [, y] = f.p(cx, cy, z); return `<path class="sys-band" d="M${r1(bx - rx)} ${r1(y)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(bx + rx)} ${r1(y)}"/>`; }).join("");
  const halo = v.highlight.has(o.part) ? `<ellipse class="sys-halo" cx="${r1(bx)}" cy="${r1(by)}" rx="${r1(rx * 1.5)}" ry="${r1(ry * 1.6)}"/>` : "";
  const label = `<g class="sys-label" transform="translate(${r1(bx)} ${r1(by - (by - ty) * 0.4)})"><text y="2">${esc(o.label)}</text><text class="sys-sub" y="15">${esc(o.sub)}</text></g>`;
  return `<g class="sys-node sys-component sys-db" data-key="db"${partAttrs(o.part, v)}>${halo}<g class="sys-box" data-tone="violet"><path class="f-left" d="${body}"/>${bands}<ellipse class="f-top" cx="${r1(tx)}" cy="${r1(ty)}" rx="${r1(rx)}" ry="${r1(ry)}"/></g>${label}</g>`;
}

/** Token text in the everyday reading. */
function analogyNote(text: string) {
  return text
    .replace("Cek cache", "Lihat rak salinan")
    .replace(/Cache hit: (.*)/, "Ada salinan: $1")
    .replace("Cache miss: belum ada", "Salinan belum ada")
    .replace("Baca database", "Ambil dari arsip")
    .replace("Simpan salinan", "Taruh salinan di rak")
    .replace("Hapus salinan jadwal", "Buang salinan jadwal lama")
    .replace("Hapus salinan denah", "Buang salinan denah lama")
    .replace("(transaksi)", "di buku resmi");
}

function tokenKind(r: Req) {
  if (r.lane === "s-k" && r.op === "store") return "referral" as const;
  if (r.lane === "s-k" && r.op === "delete") return "fail" as const;
  if (r.lane === "k-s" && r.op === "check") return r.hit ? ("response" as const) : ("probe" as const);
  if (r.failed || r.booked === "taken") return r.lane === "d-s" || r.lane === "s-c" ? ("fail" as const) : ("request" as const);
  if (r.lane === "s-c" || r.lane === "d-s" || r.lane === "k-s" || r.lane === "s-a") return "response" as const;
  return "request" as const;
}

function tokenTone(sim: CacheSim, r: Req): "plain" | "ok" | "warn" | "bad" | "info" {
  if (r.failed || r.booked === "taken") return "bad";
  if (r.lane === "k-s" && r.op === "check") return r.hit ? (r.kind === "info" && r.version < sim.db.version ? "warn" : "ok") : "warn";
  if (r.op === "store" && r.lane === "s-k") return "info";
  if (r.op === "delete" && r.lane === "s-k") return "warn";
  if (r.lane === "s-c" || r.lane === "d-s" || r.lane === "s-a" || r.lane === "k-s") return "ok";
  return "plain";
}

function render(sim: CacheSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const out: string[] = [];
  const toks: string[] = [];
  const labels: string[] = [];
  const showCache = sim.cacheOn && scene >= 2;
  const showAdmin = scene >= 5;
  const busy = new Set(sim.reqs.filter((r) => r.doneAt === null).map((r) => r.lane));

  out.push(anchor(scene >= 2, showAdmin));
  // lanes: the one in use is drawn solid, the others stay soft
  const lane = (key: Lane, part: string) => out.push(edge(F, LANES[key], { part, arrow: true, faded: !busy.has(key) }, v));
  lane("c-s", "lanes");
  lane("s-c", "lanes");
  lane("s-d", "lanes");
  lane("d-s", "lanes");
  if (showCache) (lane("s-k", "cache"), lane("k-s", "cache"));
  if (showAdmin) (lane("a-s", "admin"), lane("s-a", "admin"));

  // tokens move exactly on their lanes; their labels wait in the lane's corridor
  const stack: Partial<Record<Lane, number>> = {};
  for (const r of sim.reqs) {
    if (r.doneAt !== null) continue;
    const k = v.reduced ? 1 : progressOf(r, sim.t);
    const at = along(LANES[r.lane], k);
    toks.push(token(F, at, tokenKind(r)));
    const text = A ? analogyNote(r.note) : r.note;
    const [side, first, share] = SIDE[r.lane];
    const mid = along(LANES[r.lane], share);
    const [x, y] = F.p(mid[0], mid[1], 0.3);
    const n = (stack[r.lane] = (stack[r.lane] ?? -1) + 1);
    const slot = first + n;
    const w = pillWidth(text);
    const [px, py] = side === "above" ? [x + w / 2 + 2, y - 18 - slot * 22] : side === "below" ? [x - w / 2 - 2, y + 20 + slot * 22] : side === "left" ? [x - w / 2 - 14, y - 10 - slot * 22] : [x + w / 2 + 14, y + slot * 22];
    labels.push(pill(px, py, text, { small: true, tone: tokenTone(sim, r), part: r.lane === "s-k" || r.lane === "k-s" ? "cache" : r.lane === "s-d" || r.lane === "d-s" ? "db" : "lanes" }, v));
  }

  // components, back to front
  if (showCache) out.push(block(F, CACHE.x, CACHE.y, { tone: "teal", label: A ? "Rak salinan" : "Cache", sub: A ? "jadwal di meja" : "memori", icon: A ? "doc" : "bolt", part: "cache", w: CACHE.w, d: CACHE.d, h: CACHE.h }, v));
  out.push(crowd(F, CROWD.x, CROWD.y, CROWD.w, CROWD.d, 9, "client", v));
  out.push(block(F, SRV.x, SRV.y, { tone: "blue", label: A ? "Petugas" : "Server", sub: A ? "informasi" : "aplikasi", icon: A ? "person" : "server", part: "server", w: SRV.w, d: SRV.d, h: SRV.h }, v));
  if (showAdmin) out.push(block(F, ADMIN.x, ADMIN.y, { tone: "yellow", label: "Panitia", sub: A ? "mengubah jadwal" : "admin acara", icon: "clipboard", part: "admin", w: ADMIN.w, d: ADMIN.d, h: ADMIN.h }, v));
  out.push(cylinder(F, { label: A ? "Lemari arsip" : "Database", sub: A ? "arsip resmi" : "data resmi", part: "db" }, v));

  // what each place holds
  if (showCache) {
    const keys = (Object.keys(sim.cache) as Key[]).filter((key) => lookup(sim, key));
    // to the right of the cache, in free space: the frame stays low and the figure large
    const [cx] = F.p(CACHE.x + CACHE.w, CACHE.y, 0);
    const [, cy] = F.p(CACHE.x + CACHE.w / 2, CACHE.y + CACHE.d / 2, CACHE.h);
    const lines = keys.length
      ? keys.map((key) => {
          const e = sim.cache[key]!;
          const left = Math.max(0, Math.ceil(e.expiresAt - sim.t));
          const stale = isStale(sim, key);
          const what = key === "info" ? (A ? `salinan jadwal: ${e.value}` : `${KEYS.info.replace("event:", "")} → ${e.value}`) : A ? `salinan denah: ${e.value}` : `${KEYS.seatmap.replace("event:", "")} → ${e.value}`;
          return { text: `${what}${stale ? " · lama" : ""} · TTL ${left} dtk`, tone: stale ? ("warn" as const) : ("info" as const) };
        })
      : [{ text: A ? "rak masih kosong" : "kosong", tone: "plain" as const }];
    lines.forEach((line, i) => labels.push(pill(cx + 12 + pillWidth(line.text) / 2, cy + (i - (lines.length - 1) / 2) * 22, line.text, { small: true, tone: line.tone, part: "cache" }, v)));
  }
  const [dx, dy] = F.p(DB[0], DB[1], 1.2);
  const right = dx + R * 1.2247 * F.unit + 12;
  const dbLines = [{ text: A ? `Jadwal resmi: ${sim.db.time}` : `jadwal resmi ${sim.db.time} · versi ${sim.db.version}`, tone: "plain" as const }];
  if (scene >= 6) dbLines.push({ text: sim.db.seats[SEAT] ? `Kursi ${SEAT}: dipesan ${sim.db.seats[SEAT]}` : `Kursi ${SEAT}: tersedia`, tone: "plain" as const });
  dbLines.forEach((line, i) => labels.push(pill(right + pillWidth(line.text) / 2, dy + (i - (dbLines.length - 1) / 2) * 22, line.text, { small: true, tone: line.tone, part: "db" }, v)));

  const [lx, ly] = F.p(CROWD.x + CROWD.w / 2, CROWD.y + CROWD.d, 0);
  labels.push(pill(lx, ly + 26, A ? "pengunjung bertanya" : "pengunjung (client)", { small: true, part: "client" }, v));
  const last = sim.answers.slice(-1)[0];
  if (last && sim.t - last.at < 3.2) {
    const from = last.source === "cache" ? (A ? "dari rak" : "dari cache") : last.source === "database" ? (A ? "dari arsip" : "dari database") : "";
    const text = `${last.id} ← ${last.text}${from ? ` · ${from}` : ""}${last.stale ? " · salinan lama" : ""}`;
    const w = pillWidth(text);
    labels.push(pill(lx - 70 + w / 2, ly + 50, text, { small: true, tone: !last.ok ? "bad" : last.stale ? "warn" : "ok", part: "client" }, v));
  }
  return out.join("") + toks.join("") + labels.join("");
}

const SPEC: SystemSpec<CacheSim> = {
  frame: F,
  floor: floor(F, [-11, -11, 17, 13]),
  render,
  // the framed parts already include every label corridor, so the camera can sit close
  cameraPad: [28, 24],
  analogyLabel: "Analogi sehari-hari: pengunjung bertanya kepada petugas informasi; petugas melihat rak salinan jadwal di mejanya, dan hanya ke lemari arsip resmi bila salinannya belum ada atau sudah dibuang.",
  label: "Sistem sebenarnya: client mengirim request ke server aplikasi; server memeriksa cache di memori, membaca database bila cache miss, menyimpan salinan, lalu menjawab. Reservasi kursi selalu diputuskan oleh transaksi di database.",
};

export default function CacheSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
