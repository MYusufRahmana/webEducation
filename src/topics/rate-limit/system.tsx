import type { FigureStageProps } from "../types";
import { progressOf, secondsLeft, type Account, type RateSim, type Req } from "./model";
import { along, block, edge, esc, floor, laptop, makeFrame, partAttrs, pill, token, type Frame, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * Pengguna → Rate limiter → Server aplikasi → Database, read from left to right:
 *
 *   ANDI ══╗
 *          GERBANG ══ SERVER ══ DATABASE
 *   BUDI ══╝
 *
 * Andi comes in from the upper left, Budi from the lower left; both meet at the gate. The gate stands in
 * the same place in every step: a plain entrance in steps 1–2, the rate limiter from step 3. Every link
 * has a lane out and a lane back; rejected requests turn back at the gate on the account's own lane back.
 * Each account's counter sits on the side of the gate where its lanes arrive.
 */
const GATE = { x: 0, y: 0, w: 2.8, d: 2.8 };
const ARM = 5.6;
const USER: Record<Account, [number, number]> = { Andi: [-ARM - 2.75, 0.2], Budi: [0.2, GATE.d + ARM + 0.3] };
const SRV = { x: GATE.w + ARM, y: 0, w: 2.8, d: 2.8, h: 2.1 };
const DB: [number, number] = [SRV.x + SRV.w + 5 + 1.5, 1.4];
const R = 1.5;
const Z = 0.3;
const A1 = 0.9; // lane out
const A2 = 1.9; // lane back
const dbEdge = (y: number) => DB[0] - Math.sqrt(R * R - (y - DB[1]) ** 2);

const LANES: Record<Account, { go: Vec3[]; back: Vec3[] }> = {
  Andi: { go: [[USER.Andi[0] + 2.75, A1, Z], [GATE.x, A1, Z]], back: [[GATE.x, A2, Z], [USER.Andi[0] + 2.75, A2, Z]] },
  Budi: { go: [[A1, USER.Budi[1] - 0.3, Z], [A1, GATE.d, Z]], back: [[A2, GATE.d, Z], [A2, USER.Budi[1] - 0.3, Z]] },
};
const userLanes = (who: Account) => LANES[who];
const SERVER_GO: Vec3[] = [[GATE.x + GATE.w, A1, Z], [SRV.x, A1, Z]];
const SERVER_BACK: Vec3[] = [[SRV.x, A2, Z], [GATE.x + GATE.w, A2, Z]];
const DB_GO: Vec3[] = [[SRV.x + SRV.w, A1, Z], [dbEdge(A1), A1, Z]];
const DB_BACK: Vec3[] = [[dbEdge(A2), A2, Z], [SRV.x + SRV.w, A2, Z]];

const EXTENT: Vec3[] = [
  [USER.Andi[0] - 9, USER.Andi[1] + 3.6, 0],
  [USER.Andi[0], USER.Andi[1] - 1.4, 5],
  [USER.Andi[0] - 4, USER.Andi[1] + 1, 4.2],
  [GATE.x + 1, GATE.y - 3, 8.6],
  [USER.Budi[0] - 5.2, USER.Budi[1] + 4.6, 0],
  [USER.Budi[0] + 3, USER.Budi[1] + 3.4, 0],
  [SRV.x + 1, SRV.y - 2, 4.6],
  [DB[0] + R + 0.6, DB[1], 3.4],
  [DB[0] + R, DB[1] + R + 0.8, 0],
];
const F = makeFrame(EXTENT, 21);

function anchor() {
  const pts = EXTENT.map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

const pillWidth = (text: string) => Math.max(28, text.length * 11 * 0.56 + 18);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The database: a cylinder. */
function cylinder(f: Frame, label: string, sub: string, v: Visual) {
  const [cx, cy] = DB;
  const h = 2.2;
  const rx = R * 1.2247 * f.unit;
  const ry = R * 0.7071 * f.unit;
  const [bx, by] = f.p(cx, cy, 0);
  const [tx, ty] = f.p(cx, cy, h);
  const body = `M${r1(tx - rx)} ${r1(ty)}L${r1(bx - rx)} ${r1(by)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(bx + rx)} ${r1(by)}L${r1(tx + rx)} ${r1(ty)}Z`;
  const halo = v.highlight.has("db") ? `<ellipse class="sys-halo" cx="${r1(bx)}" cy="${r1(by)}" rx="${r1(rx * 1.5)}" ry="${r1(ry * 1.6)}"/>` : "";
  return `<g class="sys-node sys-component sys-db" data-key="db"${partAttrs("db", v)}>${halo}<g class="sys-box" data-tone="violet"><path class="f-left" d="${body}"/><ellipse class="f-top" cx="${r1(tx)}" cy="${r1(ty)}" rx="${r1(rx)}" ry="${r1(ry)}"/></g><g class="sys-label" transform="translate(${r1(bx)} ${r1(by - (by - ty) * 0.4)})"><text y="2">${esc(label)}</text><text class="sys-sub" y="15">${esc(sub)}</text></g></g>`;
}

type LaneKey = `${Account}-go` | `${Account}-back` | "server-go" | "server-back" | "db-go" | "db-back";
function laneOf(r: Req): { key: LaneKey; pts: Vec3[] } | null {
  switch (r.stage) {
    case "to-gate":
      return { key: `${r.who}-go`, pts: userLanes(r.who).go };
    case "gate-back":
      return { key: `${r.who}-back`, pts: userLanes(r.who).back };
    case "to-server":
      return { key: "server-go", pts: SERVER_GO };
    case "server-back":
      return { key: "server-back", pts: SERVER_BACK };
    case "to-db":
      return { key: "db-go", pts: DB_GO };
    case "db-back":
      return { key: "db-back", pts: DB_BACK };
    default:
      return null;
  }
}

function render(sim: RateSim, v: Visual) {
  const A = v.analogy;
  const on = sim.limiterOn;
  const out: string[] = [anchor()];
  const toks: string[] = [];
  const labels: string[] = [];

  // lanes: the ones in use solid, the rest soft
  const groups = new Map<LaneKey, { pts: Vec3[]; reqs: Req[] }>();
  for (const r of sim.reqs) {
    if (r.doneAt !== null) continue;
    const lane = laneOf(r);
    if (!lane) continue;
    if (!groups.has(lane.key)) groups.set(lane.key, { pts: lane.pts, reqs: [] });
    groups.get(lane.key)!.reqs.push(r);
  }
  const lane = (key: LaneKey, pts: Vec3[], part: string) => out.push(edge(F, pts, { part, arrow: true, faded: !groups.has(key) }, v));
  for (const who of ["Andi", "Budi"] as Account[]) {
    lane(`${who}-go`, userLanes(who).go, "users");
    lane(`${who}-back`, userLanes(who).back, "users");
  }
  lane("server-go", SERVER_GO, "server");
  lane("server-back", SERVER_BACK, "server");
  lane("db-go", DB_GO, "db");
  lane("db-back", DB_BACK, "db");

  // packets on their lanes; one label per lane, in the lane's own corridor
  for (const [key, g] of groups) {
    for (const r of g.reqs) {
      const k = v.reduced ? 1 : progressOf(r, sim.t);
      const bad = r.result === "limited";
      toks.push(token(F, along(g.pts, k), bad ? "fail" : key.endsWith("back") ? "response" : "request"));
    }
    if (key.startsWith("db")) continue;
    const first = g.reqs[0];
    const many = g.reqs.length > 1;
    let text: string;
    let tone: "plain" | "ok" | "warn" | "bad" | "info" = "plain";
    if (key.endsWith("-go") && key !== "server-go") text = many ? `${g.reqs.length} permintaan ${first.who}` : `${first.who} · Cek kursi #${first.seq}`;
    else if (key === "server-go") ((text = many ? `${g.reqs.length} permintaan · ${on ? "Diteruskan" : "masuk"}` : on ? `Diteruskan · ${first.who}` : `${first.who} · Cek kursi`), (tone = on ? "ok" : "plain"));
    else if (key === "server-back") ((text = many ? `${g.reqs.length} jawaban` : `Jawaban untuk ${first.who}`), (tone = "ok"));
    else {
      const limited = g.reqs.filter((r) => r.result === "limited");
      if (limited.length) ((text = `Tunggu · 429 · coba lagi dalam ${limited[0].retryIn} dtk`), (tone = "bad"));
      else ((text = many ? `${g.reqs.length} jawaban` : "Jawaban: daftar kursi"), (tone = "ok"));
    }
    const mid = along(g.pts, 0.5);
    const [x, y] = F.p(mid[0], mid[1], Z);
    const w = pillWidth(text);
    // Andi's labels hang below his lanes and Budi's to the left of his: both in the free wedge between the two arms
    const side = key.startsWith("Budi") ? "left" : key === "server-back" || key.startsWith("Andi") ? "below" : "above";
    const slot = key === "Andi-back" || key === "Budi-back" ? 1 : 0;
    const [px, py] = side === "left" ? [x - w / 2 - 14, y - 6 - slot * 22] : side === "below" ? [x - w / 2 - 2, y + 20 + slot * 22] : [x + w / 2 + 2, y - 18 - slot * 22];
    labels.push(pill(px, py, text, { small: true, tone, part: key.startsWith("server") ? "server" : "users" }, v));
  }

  // the server's line: waiting packets stacked in front of the server
  const waiting = sim.line.slice(1).map((id) => sim.reqs.find((r) => r.id === id)!).filter(Boolean);
  waiting.forEach((_, i) => toks.push(token(F, [SRV.x - 0.5 - i * 0.55, A1 - 0.5, Z], "request")));
  if (sim.line.length) {
    const [qx, qy0] = F.p(SRV.x + SRV.w / 2, SRV.y + SRV.d / 2, SRV.h);
    const qy = qy0 - 18;
    const budiAt = waiting.findIndex((r) => r.who === "Budi");
    const text = `${A ? "antre di loket" : "antre di server"}: ${waiting.length}${budiAt >= 0 ? ` · Budi urutan ${budiAt + 1}` : ""}`;
    // to the upper right of the server, clear of the gate's label
    labels.push(pill(qx + pillWidth(text) / 2 - 30, qy - 16, text, { small: true, tone: waiting.length > 2 ? "warn" : "plain", part: "server" }, v));
  }

  // components, back to front
  const gate = on
    ? block(F, GATE.x, GATE.y, { tone: "yellow", label: A ? "Petugas pemeriksa" : "Pemeriksa batas", sub: A ? "kartu catatan" : "rate limiter", icon: A ? "person" : "clipboard", part: "limiter", w: GATE.w, d: GATE.d, h: 2 }, v)
    : block(F, GATE.x, GATE.y, { tone: "grey", label: "Pintu masuk", sub: "tanpa pemeriksaan", part: "limiter", w: GATE.w, d: GATE.d, h: 1 }, v);
  out.push(gate);
  out.push(block(F, SRV.x, SRV.y, { tone: "blue", label: A ? "Petugas loket" : "Server aplikasi", sub: A ? "menjawab" : "1 pekerja", icon: A ? "booth" : "server", part: "server", w: SRV.w, d: SRV.d, h: SRV.h }, v));
  out.push(cylinder(F, A ? "Papan info" : "Database", A ? "kursi" : "data kursi", v));
  for (const who of ["Andi", "Budi"] as Account[]) out.push(laptop(F, USER[who][0], USER[who][1], "users", v));

  // who is who, and what each browser shows: name below, answer to the left
  for (const who of ["Andi", "Budi"] as Account[]) {
    const [ux, uy] = F.p(USER[who][0] + 1.2, USER[who][1] + 2.7, 0);
    labels.push(pill(ux - 20, uy + 20, `${who === "Andi" ? "A" : "B"} · ${A ? `Pengunjung ${who}` : who}`, { part: "users" }, v));
    const s = sim.screen[who];
    if (s && sim.t - s.at < 4.5) {
      const text = s.ok ? `${who}: ${s.text}` : `${who}: ${s.text}`;
      const [lx, ly] = who === "Andi" ? F.p(USER[who][0] + 1.2, USER[who][1] + 0.4, 3.3) : F.p(USER[who][0] + 1.2, USER[who][1] + 2.7, 0);
      labels.push(pill(who === "Andi" ? lx : lx - 70 + pillWidth(text) / 2, who === "Andi" ? ly - 14 : ly + 44, text, { small: true, tone: s.ok ? "ok" : "bad", part: "users" }, v));
    }
  }

  // the limiter's rule, its window and one counter per account, at that account's end of the gate
  if (on) {
    const [gx, gy] = F.p(GATE.x + GATE.w / 2, GATE.y + GATE.d / 2, 1.7);
    const left = secondsLeft(sim);
    const fresh = sim.log.some((e) => e.kind === "reset" && sim.t - e.at < 2.2);
    ["Andi", "Budi"].forEach((who, i) => {
      const n = sim.counts[who as Account];
      const text = `${who === "Andi" ? "A" : "B"} · ${A ? `Kartu ${who}` : `Penghitung ${who}`}: ${n}/${sim.limit}${n >= sim.limit ? " · penuh" : ""}`;
      labels.push(pill(gx + 120, gy - 60 + i * 24, text, { tone: n >= sim.limit ? "bad" : n > 0 ? "info" : "plain", part: "counters" }, v));
    });
    labels.push(pill(gx + 120, gy - 126, `Aturan: 5 pengecekan / 10 detik / akun`, { small: true, part: "limiter" }, v));
    labels.push(pill(gx + 120, gy - 104, fresh ? `Periode baru dimulai · semua penghitung 0/5` : `Periode ${sim.windowStart}–${sim.windowStart + sim.period} dtk · sisa ${Math.ceil(left - 1e-9)} dtk`, { small: true, tone: fresh ? "ok" : "info", part: "window" }, v));
  }
  return out.join("") + toks.join("") + labels.join("");
}

const SPEC: SystemSpec<RateSim> = {
  frame: F,
  floor: floor(F, [-16, -6, 26, 16]),
  render,
  cameraPad: [28, 24],
  analogyLabel: "Analogi sehari-hari: pengunjung Andi dan Budi bertanya kursi yang tersedia; petugas pemeriksa di depan loket mencatat pertanyaan di kartu masing-masing dan meminta menunggu setelah lima pertanyaan dalam sepuluh detik.",
  label: "Cara kerja website: browser Andi dan Budi mengirim permintaan; rate limiter menghitung permintaan tiap akun dalam periode 10 detik, meneruskan sampai 5 ke server aplikasi yang mengambil data dari database, dan menjawab 429 untuk kelebihannya.",
};

export default function RateSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
