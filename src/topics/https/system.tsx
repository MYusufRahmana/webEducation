import type { FigureStageProps } from "../types";
import { progressOf, type HttpsSim, type Msg } from "./model";
import { along, block, edge, floor, laptop, makeFrame, pill, token, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/** One browser–server path in two readings (kartu pos dan amplop / sistem sebenarnya). Positions never change. */

const LAP: [number, number] = [0, 6];
const SRV: [number, number] = [13, 6];
const OBS: [number, number] = [7, 10.8];
const CERT: [number, number] = [14.8, 0.6];
const F = makeFrame([[-1.2, 6, 3.4], [-0.6, 10, 0], [SRV[0] + 2.8, SRV[1], 3.4], [SRV[0] + 2.8, SRV[1] + 2.8, 0], [CERT[0] + 1.8, CERT[1], 2.6], [CERT[0] + 1.8, CERT[1] + 1.8, 0], [OBS[0], OBS[1] + 3.4, 0], [16.6, 12.6, 0], [1, 2, 4]], 21);

const PATH: Vec3[] = [[LAP[0] + 3, 7.4, 0.3], [SRV[0], 7.4, 0.3]];
const MID: Vec3 = along(PATH, 0.5);
const LOOK: Vec3[] = [[OBS[0] + 1.1, OBS[1], 0.3], [MID[0], MID[1] + 0.6, 0.3]];
const CERT_PATH: Vec3[] = [[CERT[0] + 0.9, CERT[1] + 1.8, 0.3], [CERT[0] + 0.9, SRV[1], 0.3]];

/** A small lock drawn next to a pill. */
function lockBadge(x: number, y: number, label: string) {
  const width = Math.max(28, label.length * 11 * 0.56 + 18);
  return `${pill(x + 12, y, label, { tone: "ok", small: true })}<g class="sys-lock" transform="translate(${Math.round(x + 12 - width / 2 - 13)} ${y})"><circle r="10"/><g class="sys-icon">${'<rect x="-5" y="-1" width="10" height="7.5" rx="1.2"/><path d="M-3-1v-2.6a3 3 0 0 1 6 0V-1"/>'}</g></g>`;
}

function render(sim: HttpsSim, v: Visual) {
  const t = sim.t;
  const A = v.analogy;
  const scene = v.step ?? 99;
  const out: string[] = [];
  const labels: string[] = [];
  const secure = sim.conn === "secure";

  out.push(edge(F, PATH, { part: "path", arrow: true }, v));
  out.push(edge(F, LOOK, { part: "observer", dashed: true }, v));
  if (scene >= 1) out.push(edge(F, CERT_PATH, { part: "certificate", dashed: true }, v));

  // what travels
  for (const msg of sim.msgs) {
    const k = v.reduced ? 1 : progressOf(msg, t);
    if (msg.result !== "pending" && msg.kind !== "data") continue;
    const at = travelPoint(msg, k);
    if (msg.kind === "certificate") {
      const p = along([...PATH].reverse(), k);
      out.push(token(F, p, "old"));
      const [x, y] = F.p(p[0], p[1], 0.8);
      labels.push(pill(x, y - 14, A ? "kartu identitas penerima" : `Sertifikat ${sim.cert.domain}`, { small: true, tone: "warn", part: "certificate" }, v));
      continue;
    }
    if (msg.kind === "setup") {
      out.push(token(F, at, "response"));
      const [x, y] = F.p(at[0], at[1], 0.8);
      labels.push(pill(x, y - 14, A ? `menyiapkan amplop: ${msg.text.toLowerCase()}` : msg.text, { small: true, tone: "info", part: "lock" }, v));
      continue;
    }
    // data
    if (msg.result !== "pending") continue;
    const changed = msg.tampered;
    out.push(token(F, at, changed ? "fail" : msg.encrypted ? "referral" : "request"));
    const [x, y] = F.p(at[0], at[1], 0.8);
    const text = changed ? (A ? "segel rusak" : "data diubah di perjalanan") : msg.encrypted ? (A ? "amplop terkunci & tersegel" : "▒▒▒ ilustrasi data terenkripsi") : A ? `kartu pos: ${msg.text}` : msg.text;
    labels.push(pill(x, y - 14, text, { small: true, tone: changed ? "bad" : msg.encrypted ? "info" : "plain", part: "message" }, v));
  }

  // fixed objects
  if (scene >= 1) out.push(block(F, CERT[0], CERT[1], { tone: "yellow", label: A ? "Identitas" : "Sertifikat", sub: A ? "penerima" : sim.cert.domain, icon: A ? "card" : "cert", part: "certificate", w: 1.8, d: 1.8, h: 1.2 }, v));
  out.push(block(F, SRV[0], SRV[1], A ? { tone: "green", label: "Penerima", icon: "booth", part: "server" } : { tone: "blue", label: "Server", sub: sim.target, icon: "server", part: "server" }, v));
  out.push(block(F, OBS[0], OBS[1], { tone: "grey", label: A ? "Orang di" : "Pengamat", sub: A ? "perjalanan" : "jaringan", icon: "eye", part: "observer", w: 2.2, d: 2.2, h: 1.6 }, v));
  out.push(A ? block(F, LAP[0], LAP[1], { tone: "violet", label: "Pengirim", icon: "person", part: "browser" }, v) : laptop(F, LAP[0], LAP[1], "browser", v));

  // status on the path
  const [mx, my] = F.p(MID[0] - 0.6, MID[1] - 4.2, 0.3);
  const status = secure ? (A ? "Amplop terkunci dan bersegel" : "Koneksi terlindungi · HTTPS (TLS)") : sim.conn === "setup" ? (A ? "Menyiapkan amplop dan gembok…" : "Menyiapkan koneksi…") : A ? "Kartu pos · isi terbuka" : "HTTP · tanpa TLS";
  labels.push(pill(mx, my - 6, status, { tone: secure ? "ok" : sim.conn === "setup" ? "warn" : "bad", part: secure || sim.conn === "setup" ? "lock" : "path" }, v));

  // what each end and the observer know
  const sending = sim.msgs.find((m) => m.kind === "data");
  const [bx, by] = F.p(LAP[0] + 1.2, LAP[1] + 1.2, 3.2);
  if (sending) labels.push(pill(bx, by - 8, A ? `menulis: ${sending.text}` : `browser: ${sending.text}`, { small: true, part: "browser" }, v));
  if (secure) {
    const [lx, ly] = F.p(LAP[0] + 0.4, LAP[1] + 3, 0);
    labels.push(lockBadge(lx - 4, ly + 22, A ? "gembok siap" : "kunci siap"));
    const [sx, sy] = F.p(SRV[0] + 2.8, SRV[1] + 1.6, 0);
    labels.push(lockBadge(sx + 46, sy + 2, A ? "gembok siap" : "kunci siap"));
  }
  const [ox, oy] = F.p(OBS[0] + 1.1, OBS[1] + 2.2, 0);
  const seen = sim.observed;
  labels.push(pill(ox, oy + 20, seen ? (seen.readable ? `melihat: ${seen.text}` : A ? "melihat amplop, isinya tidak" : "melihat ada komunikasi · isi ▒▒▒") : A ? "mengamati perjalanan" : "mengamati jalur", { small: true, tone: seen ? (seen.readable ? "bad" : "info") : "plain", part: "observer" }, v));
  const [rx, ry] = F.p(SRV[0] + 1.4, SRV[1] + 2.8, 0);
  if (sim.received) labels.push(pill(rx + 40, ry + 22, sim.received.ok ? `diterima: ${sim.received.text}` : sim.received.text, { small: true, tone: sim.received.ok ? "ok" : "bad", part: "server" }, v));
  if (scene >= 1 && sim.cert.checked) {
    const [cx, cy] = F.p(CERT[0] + 0.9, CERT[1] + 0.9, 1.4);
    void cx;
    labels.push(pill(F.p(CERT[0] + 0.9, CERT[1] + 0.9, 1.4)[0] - 70, cy - 22, sim.cert.valid ? (A ? "Identitas cocok dengan alamat" : "Sertifikat valid untuk domain ini") : "Sertifikat tidak cocok", { small: true, tone: sim.cert.valid ? "ok" : "bad", part: "certificate" }, v));
  }
  return out.join("") + labels.join("");
}

function travelPoint(msg: Msg, k: number): Vec3 {
  return msg.from === "browser" ? along(PATH, k) : along([...PATH].reverse(), k);
}

const SPEC: SystemSpec<HttpsSim> = {
  frame: F,
  floor: floor(F, [-2, -1, 18, 15]),
  render,
  analogyLabel: "Analogi sehari-hari: pengirim mengirim kartu pos atau amplop terkunci bersegel kepada penerima yang identitasnya diperiksa; orang di perjalanan mengamati.",
  label: "Sistem sebenarnya: browser mengirim data ke server lewat jaringan; dengan HTTPS, sertifikat diperiksa, koneksi disiapkan, dan data dikirim terenkripsi sementara pengamat jaringan hanya melihat data terenkripsi.",
};

export default function HttpsSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
