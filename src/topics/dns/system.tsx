import type { FigureStageProps } from "../types";
import { ADDRESSES, BLOCKED, isStale, progressOf, SCREEN_TEXT, SITE, valid, ttlLeft, WARNING_IP, type CacheEntry, type DnsSim, type Lane, type Visit } from "./model";
import { along, block, edge, floor, laptop, makeFrame, pill, token, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * Two hubs, no crossing lines. The laptop asks the resolver and then visits addresses itself; the
 * resolver walks the hierarchy. Every arm has a question lane and an answer lane side by side.
 *
 *                 ROOT          TLD .id          SERVER SITUS
 *                     \\        /                  /
 *                      RESOLVER ───────── LAPTOP
 *                     /                          \\
 *        AUTHORITATIVE                             HALAMAN PERINGATAN
 */
type Arm = "dns" | "root" | "tld" | "auth" | "site" | "warn";
type Part = "resolver" | "root" | "tld" | "auth" | "site" | "warning";

const ARM_D = 5.4; // laptop ↔ resolver, site, warning page
const ARM_R = 4.6; // resolver ↔ authoritative
const ARM_UP = 6.6; // resolver ↔ root and TLD: further out, leaving room for the resolver's labels between them
const B = 2.6; // website blocks
const T = 2.4; // hierarchy blocks
const RES = { x: -0.35 - ARM_D - 2.8, y: -0.1, w: 2.8, d: 2.8, h: 2 };
const ROOT: [number, number] = [RES.x - ARM_UP - T, 0.1];
const TLD: [number, number] = [RES.x + 0.2, RES.y - ARM_UP - T];
const AUTH: [number, number] = [RES.x + 0.2, RES.y + RES.d + ARM_R];
const SITEB: [number, number] = [-0.1, -0.3 - ARM_D - B];
const WARN: [number, number] = [2.75 + ARM_D, -0.1];
const Z = 0.3;
const A1 = 0.7; // question lane (x-lanes: y; device column: x)
const A2 = 1.7; // answer lane
const R1 = RES.x + 0.9; // resolver column, question lane
const R2 = RES.x + 1.9; // resolver column, answer lane

const LANES: Record<Lane, Vec3[]> = {
  "dns-go": [[-0.35, A1, Z], [RES.x + RES.w, A1, Z]],
  "dns-back": [[RES.x + RES.w, A2, Z], [-0.35, A2, Z]],
  "root-go": [[RES.x, A1, Z], [ROOT[0] + T, A1, Z]],
  "root-back": [[ROOT[0] + T, A2, Z], [RES.x, A2, Z]],
  "tld-go": [[R1, RES.y, Z], [R1, TLD[1] + T, Z]],
  "tld-back": [[R2, TLD[1] + T, Z], [R2, RES.y, Z]],
  "auth-go": [[R1, RES.y + RES.d, Z], [R1, AUTH[1], Z]],
  "auth-back": [[R2, AUTH[1], Z], [R2, RES.y + RES.d, Z]],
  "site-go": [[A1, -0.3, Z], [A1, SITEB[1] + B, Z]],
  "site-back": [[A2, SITEB[1] + B, Z], [A2, -0.3, Z]],
  "warn-go": [[2.75, A1, Z], [WARN[0], A1, Z]],
  "warn-back": [[WARN[0], A2, Z], [2.75, A2, Z]],
};
const ARM_OF = (lane: Lane): Arm => lane.split("-")[0] as Arm;
const PART_OF: Record<Arm, Part> = { dns: "resolver", root: "root", tld: "tld", auth: "auth", site: "site", warn: "warning" };

type Side = "above" | "below" | "left" | "right";
/** Label corridor per lane: [side, first slot, where along the lane]. Twin lanes never share a slot. */
const CORRIDOR: Record<Lane, [Side, number, number]> = {
  "dns-go": ["above", 0, 0.5],
  "dns-back": ["above", 1, 0.5],
  "root-go": ["below", 1, 0.5],
  "root-back": ["below", 0, 0.5],
  "tld-go": ["right", 0, 0.5],
  "tld-back": ["right", 1, 0.5],
  "auth-go": ["left", 0, 0.3],
  "auth-back": ["left", 1, 0.3],
  "site-go": ["right", 0, 0.5],
  "site-back": ["right", 1, 0.5],
  "warn-go": ["above", 0, 0.5],
  "warn-back": ["above", 1, 0.5],
};

/** Which parts each step shows: the hierarchy grows step by step, the warning page arrives with blocking. */
const shows = (scene: number) => ({ root: scene >= 1, tld: scene >= 2, auth: scene >= 3, site: scene >= 4, warn: scene >= 8 });

/* What the camera frames: the parts shown, with their label corridors. */
const FRAME: Record<"base" | Exclude<Arm, "dns">, Vec3[]> = {
  base: [
    [-7.4, 6.4, 0],
    [4.4, 4.4, 0],
    [RES.x - 1, RES.y - 1.4, 3.8],
    [RES.x + RES.w + 3.6, RES.y - 3.6, 3.6],
  ],
  root: [[ROOT[0] - 0.4, ROOT[1] + T + 2.2, 0], [ROOT[0], ROOT[1], 2.4], [RES.x + 1.4, RES.y + 1.4, 8.6]],
  tld: [[TLD[0] - 2, TLD[1] - 2, 3], [TLD[0] + T + 8.8, TLD[1] - 8.8, 1.8]],
  auth: [[AUTH[0] - 4.2, AUTH[1] + T + 1.4, 0], [AUTH[0] + T + 1.4, AUTH[1] + T + 2.4, 0], [AUTH[0] - 6.4, AUTH[1] + 0.6, 0]],
  site: [[SITEB[0] - 1, SITEB[1] - 1, 4.2], [SITEB[0] + B + 4.4, SITEB[1] - 4.4, 1.6]],
  warn: [[WARN[0] + B + 2.8, WARN[1] + B + 2.2, 0], [WARN[0] + B + 1.6, WARN[1] - 1.6, 1.6]],
};
const F = makeFrame(Object.values(FRAME).flat(), 21);

function anchor(scene: number) {
  const s = shows(scene);
  const pts = [...FRAME.base, ...(s.root ? FRAME.root : []), ...(s.tld ? FRAME.tld : []), ...(s.auth ? FRAME.auth : []), ...(s.site ? FRAME.site : []), ...(s.warn ? FRAME.warn : [])].map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

const pillWidth = (text: string) => Math.max(28, text.length * 11 * 0.56 + 18);
const secs = (n: number) => `${n.toFixed(1).replace(".", ",")} dtk`;
type Tone = "plain" | "ok" | "warn" | "bad" | "info";
type Kind = "request" | "referral" | "answer" | "old" | "fail";

function describe(sim: DnsSim, v: Visit, lane: Lane, A: boolean): { text: string; tone: Tone; kind: Kind } {
  const stale = v.version >= 0 && v.version !== sim.zone;
  if (v.stage === "waiting") {
    const left = Math.max(0, Math.ceil(v.stageEnd - sim.t));
    if (lane === "site-go" && stale) return { text: `alamat lama: tak ada yang menjawab… ${left}`, tone: "warn", kind: "old" };
    return { text: `menunggu jawaban… ${left} dtk`, tone: "warn", kind: "request" };
  }
  switch (lane) {
    case "dns-go":
      return { text: `alamat ${v.name}?`, tone: "plain", kind: "request" };
    case "root-go":
    case "tld-go":
    case "auth-go":
      return { text: `${v.name}?`, tone: "plain", kind: "request" };
    case "root-back":
      return { text: A ? "→ tanya kantor .id" : "rujukan: tanya .id", tone: "info", kind: "referral" };
    case "tld-back":
      if (v.missing) return { text: A ? "nama itu tidak ada" : "tidak ada (NXDOMAIN)", tone: "bad", kind: "fail" };
      return { text: A ? "→ tanya pengelola" : `rujukan: tanya ${v.name}`, tone: "info", kind: "referral" };
    case "auth-back":
      return { text: `${v.address} · TTL ${sim.params.ttl} dtk`, tone: "ok", kind: "answer" };
    case "dns-back":
      if (v.missing) return { text: "jawaban: tidak ditemukan", tone: "bad", kind: "fail" };
      if (v.source === "blocklist") return { text: `${WARNING_IP} (peringatan)`, tone: "warn", kind: "old" };
      return { text: `${v.address}${v.source === "resolver" ? " (dari cache)" : ""}`, tone: stale ? "warn" : "ok", kind: stale ? "old" : "answer" };
    case "site-go":
      return { text: `ke ${v.address}${stale ? " (alamat lama)" : ""}`, tone: stale ? "warn" : "plain", kind: "request" };
    case "site-back":
      return { text: `halaman ${SITE}`, tone: "ok", kind: "answer" };
    case "warn-go":
      return { text: `ke ${WARNING_IP}`, tone: "plain", kind: "request" };
    default:
      return { text: "halaman “akses diblokir”", tone: "warn", kind: "old" };
  }
}

function cacheText(sim: DnsSim, entry: CacheEntry | undefined) {
  if (!valid(entry, sim.t)) return { text: "kosong", tone: "plain" as Tone };
  const stale = isStale(sim, entry);
  return { text: `${entry.address}${stale ? " (lama)" : ""} · ${secs(ttlLeft(entry, sim.t))}`, tone: (stale ? "warn" : "ok") as Tone };
}

function render(sim: DnsSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const s = shows(scene);
  const out: string[] = [anchor(scene)];
  const toks: string[] = [];
  const labels: string[] = [];
  const visible = (arm: Arm) => arm === "dns" || s[arm];

  // lanes: in use solid, the rest soft
  const busy = new Set<Lane>();
  for (const vis of sim.visits) {
    if (vis.stage === "waiting" && vis.waitingOn) busy.add(vis.waitingOn);
    else if (vis.stage in LANES) busy.add(vis.stage as Lane);
  }
  for (const lane of Object.keys(LANES) as Lane[]) if (visible(ARM_OF(lane))) out.push(edge(F, LANES[lane], { part: PART_OF[ARM_OF(lane)], arrow: true, faded: !busy.has(lane) }, v));

  // tokens on their lanes; labels in the lane's corridor
  const stack: Partial<Record<Lane, number>> = {};
  for (const vis of sim.visits) {
    if (vis.stage === "done") continue;
    if (vis.stage === "device-check") {
      toks.push(token(F, [1.2, 1.2, 1.3], "request"));
      continue;
    }
    if (vis.stage === "resolver-check") {
      toks.push(token(F, [RES.x + RES.w / 2, RES.y + RES.d / 2, RES.h + 0.2], "request"));
      continue;
    }
    const lane = vis.stage === "waiting" ? vis.waitingOn! : (vis.stage as Lane);
    if (!visible(ARM_OF(lane))) continue;
    const k = vis.stage === "waiting" ? 1 : v.reduced ? 1 : progressOf(vis, sim.t);
    const info = describe(sim, vis, lane, A);
    toks.push(token(F, along(LANES[lane], k), info.kind));
    const [side, first, share] = CORRIDOR[lane];
    const slot = first + (stack[lane] = (stack[lane] ?? -1) + 1);
    const mid = along(LANES[lane], share);
    const [x, y] = F.p(mid[0], mid[1], Z);
    const w = pillWidth(info.text);
    const [px, py] = side === "above" ? [x + w / 2 + 2, y - 18 - slot * 22] : side === "below" ? [x - w / 2 - 2, y + 20 + slot * 22] : side === "left" ? [x - w / 2 - 14, y - 4 - slot * 22] : [x + w / 2 + 14, y + slot * 22];
    labels.push(pill(px, py, info.text, { small: true, tone: info.tone }));
  }

  // components, back to front
  if (s.tld) out.push(block(F, TLD[0], TLD[1], { tone: "yellow", label: A ? "Kantor" : "TLD .id", sub: A ? "wilayah .id" : "server", icon: "search", part: "tld", w: T, d: T, h: 1.8 }, v));
  if (s.site) out.push(block(F, SITEB[0], SITEB[1], { tone: "blue", label: A ? "Toko konser" : "Server situs", sub: A ? "alamat asli" : SITE, icon: A ? "booth" : "server", part: "site", w: B, d: B, h: 1.9, down: !sim.siteUp }, v));
  if (s.root) out.push(block(F, ROOT[0], ROOT[1], { tone: "orange", label: A ? "Pusat" : "Root", sub: A ? "informasi kota" : "server", icon: "globe", part: "root", w: T, d: T, h: 1.8 }, v));
  out.push(block(F, RES.x, RES.y, { tone: "violet", label: A ? "Petugas" : "Resolver", sub: A ? "informasi" : "DNS", icon: A ? "person" : "search", part: "resolver", w: RES.w, d: RES.d, h: RES.h, down: !sim.resolverUp }, v));
  out.push(laptop(F, 0, 0, "device", v));
  if (s.auth) out.push(block(F, AUTH[0], AUTH[1], { tone: "green", label: A ? "Pengelola" : "Authoritative", sub: A ? "toko" : SITE, icon: A ? "booth" : "doc", part: "auth", w: T, d: T, h: 1.8 }, v));
  if (s.warn) out.push(block(F, WARN[0], WARN[1], { tone: "orange", label: A ? "Papan" : "Halaman", sub: A ? "akses ditutup" : "peringatan", icon: "doc", part: "warning", w: B, d: B, h: 1.6 }, v));

  // what each place knows, beside its object
  const [fx, ly] = F.p(1.2, 2.7, 0);
  const lx = fx - 96;
  const current = sim.visits.find((x) => x.stage !== "done")?.name ?? sim.screen?.name ?? SITE;
  labels.push(pill(lx, ly + 22, A ? "Kamu" : "Laptop kamu (browser)", { small: true, part: "device" }, v));
  labels.push(pill(lx, ly + 46, `${A ? "mencari" : "mengetik"}: ${current}`, { small: true, part: "device" }, v));
  const dc = cacheText(sim, sim.device[current]);
  labels.push(pill(lx, ly + 70, `${A ? "catatanmu" : "catatan perangkat"}: ${dc.text}`, { small: true, tone: dc.tone, part: "deviceCache" }, v));
  if (sim.screen && sim.t - sim.screen.at < 4) {
    const o = sim.screen.outcome;
    labels.push(pill(lx, ly + 96, `Layar: ${SCREEN_TEXT[o]}`, { tone: o === "page" ? "ok" : o === "blocked-page" ? "warn" : "bad", part: "device" }, v));
  }
  const [rx, ry] = F.p(RES.x + RES.w / 2, RES.y + RES.d / 2, RES.h);
  const rc = cacheText(sim, sim.resolver[current]);
  const resolverLines: { text: string; tone: Tone; part: string }[] = [];
  if (!sim.resolverUp) resolverLines.push({ text: A ? "petugas tidak ada" : "tidak merespons", tone: "bad", part: "resolver" });
  else {
    if (s.warn) resolverLines.push({ text: `${A ? "dilarang" : "daftar blokir"}: ${BLOCKED}`, tone: "warn", part: "resolver" });
    resolverLines.push({ text: `${A ? "catatan petugas" : "cache resolver"}: ${rc.text}`, tone: rc.tone, part: "resolverCache" });
  }
  const lift = s.root ? 100 : 32; // above the tops of root and TLD once those servers stand beside the resolver
  resolverLines.forEach((line, i) => labels.push(pill(rx, ry - lift - (resolverLines.length - 1 - i) * 22, line.text, { small: true, tone: line.tone, part: line.part }, v)));
  if (s.tld) {
    // to the right of the TLD block, clear of the resolver's labels
    const [tx] = F.p(TLD[0] + T, TLD[1], 0);
    const [, ty] = F.p(TLD[0] + T / 2, TLD[1] + T / 2, 1.8);
    const text = `${A ? "nama terdaftar" : "terdaftar di .id"}: ${SITE}, ${BLOCKED}`;
    labels.push(pill(tx + 12 + pillWidth(text) / 2, ty - 4, text, { small: true, part: "tld" }, v));
  }
  if (s.auth) {
    const [ax, ay] = F.p(AUTH[0] + T, AUTH[1] + T, 0);
    const text = `${A ? "alamat resmi" : "catatan resmi"}: ${ADDRESSES[sim.zone]} · TTL ${sim.params.ttl}`;
    labels.push(pill(ax - pillWidth(text) / 2 + 30, ay + 24, text, { small: true, tone: "ok", part: "auth" }, v));
  }
  if (s.site) {
    const [sx, sy] = F.p(SITEB[0] + B / 2, SITEB[1] + B / 2, 1.9);
    const text = sim.siteUp ? `${A ? "kini di" : "alamat sekarang"}: ${ADDRESSES[sim.zone]}` : "tidak merespons";
    labels.push(pill(sx, sy - 32, text, { small: true, tone: sim.siteUp ? (sim.zone > 0 ? "info" : "plain") : "bad", part: "site" }, v));
  }
  if (s.warn) {
    const [wx, wy] = F.p(WARN[0] + B, WARN[1] + B, 0);
    const text = A ? `${WARNING_IP} · papan “akses ditutup”` : `${WARNING_IP} · halaman peringatan`;
    labels.push(pill(wx + pillWidth(text) / 2 - 40, wy + 24, text, { small: true, tone: "warn", part: "warning" }, v));
  }
  return out.join("") + toks.join("") + labels.join("");
}

const SPEC: SystemSpec<DnsSim> = {
  frame: F,
  floor: floor(F, [-26, -16, 18, 16]),
  render,
  cameraPad: [28, 24],
  analogyLabel: "Analogi sehari-hari: kamu bertanya alamat toko ke petugas informasi; petugas bertanya ke pusat informasi kota, kantor wilayah .id, lalu pengelola toko; dengan alamat itu kamu sendiri yang pergi ke toko.",
  label: "Sistem sebenarnya: browser bertanya ke DNS resolver; resolver bertanya ke root, TLD .id, lalu server authoritative, menyimpan jawabannya selama TTL, dan browser mendatangi alamat IP yang diberikan.",
};

export default function DnsSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
