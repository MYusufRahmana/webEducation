import type { FigureStageProps } from "../types";
import { addressBar, DOMAIN, progressOf, SAMPLE_FORM, type HttpsSim, type Msg } from "./model";
import { along, block, edge, esc, floor, laptop, makeFrame, pill, token, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * The browser is the centre of the story; a small ticket page above it stays visible in every step.
 *
 *                                   PENGELOLA (from step 3)
 *        [halaman tiket]   [kartu info]   |
 *          LAPTOP  ════ jalur jaringan ════  SERVER  [sertifikat]
 *                           |
 *                       PENGAMAT
 *
 * Two lanes between browser and server: towards the server (top) and back to the browser (bottom).
 */
const LAP: [number, number] = [0, 6];
const SRV = { x: 13, y: 6, w: 2.8, d: 2.8, h: 2.1 };
const OBS: [number, number] = [6.9, 11.6];
const OWNER: [number, number] = [13.3, 0.2];
const CERT: [number, number] = [18, 3.4];
const Z = 0.3;
const GO = 6.75; // browser → server
const BACK = 7.75; // server → browser
const START = LAP[0] + 2.75;

const LANES = {
  go: [[START, GO, Z], [SRV.x, GO, Z]] as Vec3[],
  back: [[SRV.x, BACK, Z], [START, BACK, Z]] as Vec3[],
  owner: [[OWNER[0] + 1.1, OWNER[1] + 2.2, Z], [OWNER[0] + 1.1, SRV.y, Z]] as Vec3[],
};
const MIDX = (START + SRV.x) / 2;
const LOOK: Vec3[] = [[OBS[0] + 1.1, OBS[1], Z], [OBS[0] + 1.1, BACK + 0.5, Z]];

const EXTENT: Vec3[] = [
  [LAP[0] - 2.6, LAP[1] + 3.6, 0],
  [LAP[0] - 1, LAP[1] - 3.4, 7.6],
  [MIDX + 4, -1, 6.8],
  [OWNER[0], OWNER[1], 3.4],
  [CERT[0] + 3, CERT[1] - 1, 0],
  [SRV.x + SRV.w + 4, SRV.y + SRV.d + 2.6, 0],
  [OBS[0] - 1, OBS[1] + 3.6, 0],
];
const F = makeFrame(EXTENT, 21);

function anchor() {
  const pts = EXTENT.map(([x, y, z]) => F.p(x, y, z));
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts.map((p) => p.join(",")).join(" ")}"/></g>`;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const pillWidth = (text: string) => Math.max(28, text.length * 11 * 0.56 + 18);
const LOCK = '<rect x="-4.5" y="-1" width="9" height="7" rx="1.2"/><path d="M-2.6-1v-2.2a2.6 2.6 0 0 1 5.2 0V-1"/>';
const WARN = '<path d="M0-5.5L5.5 4.5H-5.5Z"/><path d="M0-1.5v3M0 3v.2"/>';

/** A small flat card in screen space (the ticket page, the info card). */
function card(key: string, x: number, y: number, w: number, h: number, body: string, part: string, v: Visual, focus = false) {
  const hl = v.highlight.has(part) ? " data-hl" : "";
  return `<g class="sys-pill sys-card" data-key="${key}" data-part="${part}"${hl}${focus ? " data-focus" : ""} transform="translate(${r1(x - w / 2)} ${r1(y - h)})"><rect class="sys-pill-drop" x="2" y="3" width="${w}" height="${h}" rx="9"/><rect class="sys-card-bg" width="${w}" height="${h}" rx="9"/>${body}</g>`;
}
const line = (x: number, y: number, text: string, cls = "") => `<text class="sys-card-text${cls ? ` ${cls}` : ""}" x="${x}" y="${y}">${esc(text)}</text>`;

/** The ticket page as the browser shows it: address bar first. */
function ticketPage(sim: HttpsSim, v: Visual, scene: number) {
  const bar = addressBar(sim);
  const w = 290;
  const h = 128;
  const [x, y] = F.p(LAP[0] + 1.2, LAP[1] + 0.45, 4.1);
  const icon = bar.tone === "ok" ? LOCK : WARN;
  const ring = v.highlight.has("address") ? `<rect class="sys-card-ring" x="5" y="5" width="${w - 10}" height="26" rx="7"/>` : "";
  let body = `<rect class="sys-card-bar" x="8" y="8" width="${w - 16}" height="20" rx="6"/>${ring}<g class="sys-card-icon" data-tone="${bar.tone}" transform="translate(20 18)">${icon}</g>${line(32, 22, bar.url)}<g transform="translate(${w - 14} 18)"><text class="sys-card-chip" data-tone="${bar.tone}" text-anchor="end" y="4">${esc(bar.status)}</text></g>`;
  if (sim.warning) {
    body += line(14, 52, "⚠ Koneksi belum dapat dipercaya", "strong bad") + line(14, 70, `Sertifikat untuk ${sim.certDomain},`) + line(14, 84, `bukan ${sim.target}.`) + `<rect class="sys-card-button ok" x="14" y="${h - 26}" width="170" height="18" rx="5"/>` + line(22, h - 13, "Kembali ke halaman aman", "button");
  } else {
    const reply = sim.shown && /Pesanan/.test(sim.shown.text) ? sim.shown.text : null;
    body +=
      line(14, 50, "Konser Senja · Pemesanan", "strong") +
      line(14, 68, "Nama  : Rina Contoh") +
      line(14, 84, "Email : rina@contoh.test") +
      (reply ? line(14, 110, `✓ ${reply}`, "ok") : `<rect class="sys-card-button" x="14" y="98" width="112" height="18" rx="5"/>${line(22, 111, "Kirim pesanan", "button")}`);
  }
  const out = [card("ticket-page", x, y, w, h, body, "browser", v)];
  if (scene >= 3 && bar.tone === "ok") out.push(`<g class="sys-card-note" data-key="lock-note"><text x="${r1(x)}" y="${r1(y + 14)}" text-anchor="middle">ikon kunci = ilustrasi; tiap browser berbeda</text></g>`);
  return out.join("");
}

/** The info card above the path: before/after, the certificate check, or the trust checklist. */
function infoCard(sim: HttpsSim, v: Visual, scene: number) {
  const [px0, y] = F.p(MIDX + 0.6, 2.6, 4.6);
  const x = px0 + 96; // right of the ticket page, never on it
  if (scene === 2 && sim.https) {
    const body = line(14, 22, "Pengaturan pemilik website", "strong") + line(14, 44, "Sebelum: http://tiket.example", "bad") + line(14, 62, "         Tidak aman") + line(14, 84, "Sesudah: https://tiket.example", "ok") + line(14, 102, "         sertifikat + TLS aktif");
    return card("info", x, y, 250, 114, body, "certificate", v);
  }
  // the certificate check shows whenever a check is running or failed (also in free exploration)
  if (scene === 3 || sim.warning || sim.check === "checking" || (sim.check === "fail" && scene !== 2)) {
    if (sim.check === "none") return "";
    const ok = sim.check === "ok";
    const fail = sim.check === "fail";
    const body =
      line(14, 22, `Pemeriksaan sertifikat ${DOMAIN}`, "strong") +
      (sim.check === "checking" ? line(14, 44, "… menunggu sertifikat", "warn") : "") +
      `<g class="sys-card-option"${ok ? " data-on" : ""}>${line(14, sim.check === "checking" ? 66 : 48, "✓ Pemeriksaan berhasil", "ok")}</g>` +
      `<g class="sys-card-option"${fail ? " data-on" : ""}>${line(14, sim.check === "checking" ? 86 : 70, "✕ Koneksi belum dapat dipercaya", "bad")}</g>` +
      (sim.check !== "checking" ? line(14, 94, ok ? (sim.conn === "secure" ? "→ handshake selesai, koneksi terlindungi" : "→ handshake: menyiapkan kunci bersama") : fail ? (sim.warning ? "→ pilihan aman: kembali, jangan lanjutkan" : "→ pengguna memilih kembali") : "") : "");
    return card("info", x, y, 272, 106, body, "check", v);
  }
  if (scene === 5) {
    const body =
      line(14, 22, "Apa yang dijamin HTTPS?", "strong") +
      line(14, 44, "✓ Koneksi terlindungi (enkripsi)", "ok") +
      line(14, 62, "? Nama domain benar — periksa sendiri", "warn") +
      line(14, 80, "? Penjual jujur, tiket asli — tidak dijamin", "warn") +
      line(14, 98, "✕ Pembayaran — belum diproses", "bad");
    return card("info", x, y, 292, 110, body, "trust", v);
  }
  return "";
}

function msgText(msg: Msg, k: number, A: boolean) {
  const content = msg.kind === "data" || msg.kind === "page" || msg.kind === "reply";
  const short = msg.text === SAMPLE_FORM ? "Nama dan email" : msg.text;
  if (msg.kind === "certificate") return { text: A ? "kartu identitas server" : msg.text, tone: "warn" as const, kind: "old" as const };
  if (msg.kind === "setup") return { text: `handshake: ${msg.text}`, tone: "info" as const, kind: "response" as const };
  if (msg.kind === "install") return { text: msg.text, tone: "info" as const, kind: "answer" as const };
  if (!content) return { text: short, tone: "plain" as const, kind: "request" as const };
  if (msg.tampered) return { text: "data diubah di perjalanan", tone: "bad" as const, kind: "fail" as const };
  // readable at both ends, unreadable in between when the connection is protected
  if (msg.encrypted && k > 0.15 && k < 0.85) return { text: A ? "amplop tersegel ▒▒▒" : "▒▒▒ terenkripsi", tone: "info" as const, kind: "referral" as const };
  return { text: msg.encrypted ? `🔒 ${short}` : short, tone: "plain" as const, kind: "request" as const };
}

function render(sim: HttpsSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const out: string[] = [anchor()];
  const toks: string[] = [];
  const labels: string[] = [];
  const showOwner = scene >= 2;

  const busy = new Set<string>();
  for (const m of sim.msgs) if (m.result === "pending") busy.add(m.from === "owner" ? "owner" : m.from === "browser" ? "go" : "back");
  out.push(edge(F, LANES.go, { part: "path", arrow: true, faded: !busy.has("go") }, v));
  out.push(edge(F, LANES.back, { part: "path", arrow: true, faded: !busy.has("back") }, v));
  out.push(edge(F, LOOK, { part: "observer", dashed: true }, v));
  if (showOwner) out.push(edge(F, LANES.owner, { part: "owner", arrow: true, faded: !busy.has("owner") }, v));

  for (const msg of sim.msgs) {
    if (msg.result !== "pending") continue;
    const k = v.reduced ? 1 : progressOf(msg, sim.t);
    const lane = msg.from === "owner" ? LANES.owner : msg.from === "browser" ? LANES.go : LANES.back;
    const at = along(lane, k);
    const info = msgText(msg, k, A);
    toks.push(token(F, at, info.kind));
    const [x, y] = F.p(at[0], at[1], 0.6);
    const w = pillWidth(info.text);
    const pos: [number, number] = msg.from === "owner" ? [x - w / 2 - 14, y] : msg.from === "browser" ? [x, y - 20] : [x, y + 24];
    labels.push(pill(pos[0], pos[1], info.text, { small: true, tone: info.tone, part: "message" }, v));
  }

  // components, back to front
  if (showOwner) out.push(block(F, OWNER[0], OWNER[1], { tone: "grey", label: A ? "Pemilik" : "Pengelola", sub: A ? "toko" : "website", icon: "gear", part: "owner", w: 2.2, d: 2.2, h: 1.5 }, v));
  out.push(block(F, SRV.x, SRV.y, A ? { tone: "green", label: "Penerima", sub: "toko tiket", icon: "booth", part: "server", w: SRV.w, d: SRV.d, h: SRV.h } : { tone: "blue", label: "Server", sub: DOMAIN, icon: "server", part: "server", w: SRV.w, d: SRV.d, h: SRV.h }, v));
  if (sim.https) out.push(block(F, CERT[0], CERT[1], { tone: "yellow", label: A ? "Identitas" : "Sertifikat", sub: A ? "penerima" : sim.certDomain, icon: A ? "card" : "cert", part: "certificate", w: 1.9, d: 1.9, h: 1.2 }, v));
  out.push(block(F, OBS[0], OBS[1], { tone: "grey", label: A ? "Orang di" : "Pengamat", sub: A ? "perjalanan" : "jaringan", icon: "eye", part: "observer", w: 2.2, d: 2.2, h: 1.6 }, v));
  out.push(laptop(F, LAP[0], LAP[1], "browser", v));

  // what each end and the observer see
  const [ox, oy] = F.p(OBS[0] + 1.1, OBS[1] + 2.2, 0);
  const seen = sim.observed;
  labels.push(pill(ox, oy + 22, seen ? (seen.readable ? `melihat: ${seen.text === SAMPLE_FORM ? "Nama dan email (terbaca)" : seen.text}` : A ? "melihat amplop, isinya tidak" : "melihat ada komunikasi · isi ▒▒▒") : A ? "mengamati perjalanan" : "mengamati jalur", { small: true, tone: seen ? (seen.readable ? "bad" : "info") : "plain", part: "observer" }, v));
  if (sim.received && sim.t - sim.received.at < 4) {
    const [sx, sy] = F.p(SRV.x + SRV.w, SRV.y + SRV.d, 0);
    const text = sim.received.ok ? `server menerima: ${sim.received.text === SAMPLE_FORM ? "Nama dan email" : sim.received.text}` : sim.received.text;
    labels.push(pill(sx + pillWidth(text) / 2 - 30, sy + 22, text, { small: true, tone: sim.received.ok ? "ok" : "bad", part: "server" }, v));
  }
  const [lx, ly] = F.p(LAP[0] + 1.2, LAP[1] + 3, 0);
  labels.push(pill(lx - 30, ly + 18, A ? "Kamu (pengirim)" : "Browser kamu", { small: true, part: "browser" }, v));

  return out.join("") + toks.join("") + labels.join("") + infoCard(sim, v, scene) + ticketPage(sim, v, scene);
}

const SPEC: SystemSpec<HttpsSim> = {
  frame: F,
  floor: floor(F, [-4, -2, 23, 17]),
  render,
  cameraPad: [28, 24],
  analogyLabel: "Analogi sehari-hari: kamu mengirim formulir pemesanan sebagai kartu pos atau amplop tersegel; pemilik toko memasang kotak surat bergembok, identitas penerima diperiksa, dan orang di perjalanan mengamati.",
  label: "Sistem sebenarnya: browser membuka halaman tiket; tanpa HTTPS data terbaca pengamat jaringan; setelah pengelola mengaktifkan HTTPS, browser memeriksa sertifikat, menyiapkan koneksi TLS, dan data dikirim terenkripsi.",
};

export default function HttpsSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
