import type { FigureStageProps } from "../types";
import {
  current,
  ECHO_URL,
  formRequest,
  orderRequest,
  PHASE_LABEL,
  placeOrder,
  pretty,
  progressOf,
  resetDemo,
  sendForm,
  simulatedMs,
  STRIP,
  view,
  viewRequest,
  type ApiSim,
  type Exchange,
  type Phase,
  type Req,
  type Res,
  type Screen,
} from "./model";
import { esc, floor, laptop, makeFrame, partAttrs, type Tone, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * Left to right: Andi, the frontend, the backend (one area holding the API endpoint, the request check and
 * the application logic) and the database. The API is the endpoint the backend offers, not a separate
 * server. Requests travel on the upper lane, responses on the lower lane. Below the map: what the screen
 * shows, the request card and the response card, always built from the same exchange.
 *
 * Design coordinates: u to the right, w downwards, mapped onto the isometric floor.
 */
const toFloor = (u: number, w: number): [number, number] => [u / 2 + w, -u / 2 + w];
const EXT: [number, number][] = [[-2, 1.0], [42.6, 1.0], [42.6, 22.4], [-2, 22.4]];
const F = makeFrame(EXT.map(([u, w]) => [...toFloor(u, w), 0] as Vec3), 21);
const S = (u: number, w: number, z = 0) => F.p(...toFloor(u, w), z);
const P = (x: number, y: number, z = 0) => F.p(x, y, z);
const r1 = (n: number) => Math.round(n * 10) / 10;
const pts = (list: [number, number][]) => list.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");
const poly = (cls: string, list: [number, number][]) => `<polygon class="${cls}" points="${pts(list)}"/>`;
const line = (cls: string, a: [number, number], b: [number, number]) => `<path class="${cls}" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}"/>`;
const dot = (cls: string, [x, y]: [number, number], r = 1.3) => `<circle class="${cls}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`;
const CW = 6.6; // mono 11px advance

/* ---------------------------------------------------------------- layout */
const USER: [number, number] = [0.6, 8];
const FE: [number, number] = [6.6, 8];
const EP: [number, number] = [16.2, 8];
const CK: [number, number] = [22.2, 8];
const PR: [number, number] = [28.2, 8];
const DB: [number, number] = [36.4, 8];
const LANE_REQ = 6.0;
const LANE_RES = 10.2;
const BOTTOM = 12.2;

/* ---------------------------------------------------------------- solids */
function boxAt(x: number, y: number, z: number, w: number, d: number, h: number, tone: Tone, extra = "") {
  const top: [number, number][] = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const left: [number, number][] = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right: [number, number][] = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  return `<g class="sys-box" data-tone="${tone}"${extra}>${poly("f-left", left)}${poly("f-right", right)}${poly("f-top", top)}</g>`;
}
const onY = (y: number, x0: number, x1: number, z0: number, z1: number): [number, number][] => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];
const shadow = (u: number, w: number, rx: number, ry: number) => {
  const [x, y] = S(u, w);
  return `<ellipse class="sh-shadow" cx="${r1(x)}" cy="${r1(y + 4)}" rx="${rx}" ry="${ry}"/>`;
};
/** Text printed on the plane y = const (faces lower left), reading left to right on screen. */
function textOnY(x: number, y: number, z: number, text: string, size: number, cls: string) {
  const [ox, oy] = P(x, y, z);
  return `<text class="${cls}" transform="matrix(0.87 0.5 0 1 ${r1(ox)} ${r1(oy)})" font-size="${size}">${esc(text)}</text>`;
}
function person(u: number, w: number, tone: string, k = 1.15) {
  const [px, py] = S(u, w, 0);
  return `${shadow(u, w, 18, 7)}<g class="sys-person" data-tone="${tone}" transform="translate(${r1(px * (1 - k))} ${r1(py * (1 - k))}) scale(${k})"><path d="M${r1(px - 9)} ${r1(py)}c0-15 4-21 9-21s9 6 9 21z"/><circle cx="${r1(px)}" cy="${r1(py - 27)}" r="6.5"/></g>`;
}
const node = (key: string, part: string, v: Visual, body: string, state = "") => `<g class="sys-node ap-node" data-key="${key}-${v.analogy ? "a" : "s"}"${partAttrs(part, v)}${state ? ` data-state="${state}"` : ""}>${body}</g>`;

/** A phone standing on a small stand, screen facing the reader. */
function phone(u: number, w: number) {
  const [cx, cy] = toFloor(u, w);
  const x0 = cx - 0.55;
  const y0 = cy - 0.1;
  return [shadow(u, w, 26, 10), boxAt(x0 - 0.25, y0 - 0.3, 0, 1.6, 0.9, 0.18, "cream"), boxAt(x0, y0, 0.18, 1.1, 0.16, 2.1, "grey"), poly("ap-screen", onY(y0 + 0.165, x0 + 0.1, x0 + 1.0, 0.42, 2.12)), poly("ap-screen-ui", onY(y0 + 0.17, x0 + 0.2, x0 + 0.9, 1.55, 1.95)), poly("ap-screen-ui", onY(y0 + 0.17, x0 + 0.2, x0 + 0.62, 1.12, 1.36)), line("ap-home", P(x0 + 0.42, y0 + 0.17, 0.3), P(x0 + 0.68, y0 + 0.17, 0.3))].join("");
}

/** The API endpoint: a service window cut into the backend, with its address on the lintel. */
function endpoint(v: Visual, label: string) {
  const [cx, cy] = toFloor(...EP);
  const x0 = cx - 1.4;
  const y0 = cy - 0.9;
  const front = y0 + 1.8;
  return [
    shadow(EP[0], EP[1], 52, 20),
    boxAt(x0, y0, 0, 2.8, 1.8, 1.05, v.analogy ? "cream" : "violet"),
    boxAt(x0, y0, 1.05, 0.32, 1.8, 1.55, v.analogy ? "cream" : "violet"),
    boxAt(x0 + 2.48, y0, 1.05, 0.32, 1.8, 1.55, v.analogy ? "cream" : "violet"),
    poly("ap-opening", onY(front - 0.9, x0 + 0.32, x0 + 2.48, 1.05, 2.6)),
    poly(v.analogy ? "ap-glass" : "ap-port", onY(front - 0.02, x0 + 0.32, x0 + 2.48, 1.6, 2.6)),
    poly("ap-slot", onY(front + 0.002, x0 + 0.7, x0 + 2.1, 1.0, 1.08)),
    boxAt(x0 - 0.1, y0 - 0.05, 2.6, 3.0, 1.9, 0.5, v.analogy ? "yellow" : "violet"),
    textOnY(x0 + 0.25, front + 0.06, 2.72, label, 10, "ap-plaque"),
    boxAt(x0 + 0.5, front, 0.9, 1.8, 0.35, 0.1, "grey"),
  ].join("");
}

/** The check: a desk with a board of rules and a lamp that turns green or red. */
function checkDesk(v: Visual, verdict: "ok" | "bad" | null) {
  const [cx, cy] = toFloor(...CK);
  const x0 = cx - 1.3;
  const y0 = cy - 0.7;
  const out = [shadow(CK[0], CK[1], 50, 20)];
  if (v.analogy) out.push(person(CK[0] + 0.9, CK[1] - 1.5, "green", 1.05));
  out.push(boxAt(x0, y0, 0, 2.6, 1.4, 0.95, "cream"));
  out.push(boxAt(x0 + 0.25, y0 + 0.2, 0.95, 1.4, 0.12, 1.25, "grey"));
  for (let i = 0; i < 3; i++) {
    const z = 1.95 - i * 0.32;
    out.push(`<g class="ap-rule${verdict === "bad" && i === 1 ? " bad" : verdict ? " ok" : ""}">${poly("", onY(y0 + 0.325, x0 + 0.38, x0 + 0.56, z - 0.16, z))}${line("ap-rule-line", P(x0 + 0.66, y0 + 0.326, z - 0.08), P(x0 + 1.5, y0 + 0.326, z - 0.08))}</g>`);
  }
  out.push(`<g class="ap-lamp" data-v="${verdict ?? ""}">${boxAt(x0 + 1.9, y0 + 0.5, 0.95, 0.45, 0.45, 0.16, "grey")}${dot("ap-lamp-glass", P(x0 + 2.12, y0 + 0.72, 1.26), 5)}</g>`);
  out.push(boxAt(x0 + 0.3, y0 + 0.75, 0.95, 0.9, 0.55, 0.05, "cream"));
  return out.join("");
}

/** The application logic: a server unit with gears (system) or the clerk's work desk with a stamp. */
function processUnit(v: Visual, busy: boolean) {
  const [cx, cy] = toFloor(...PR);
  const out = [shadow(PR[0], PR[1], 54, 22)];
  if (v.analogy) {
    const x0 = cx - 1.4;
    const y0 = cy - 0.8;
    out.push(person(PR[0] + 0.9, PR[1] - 1.6, "orange", 1.05));
    out.push(boxAt(x0, y0, 0, 2.8, 1.6, 0.95, "cream"));
    out.push(boxAt(x0 + 0.3, y0 + 0.3, 0.95, 0.9, 1.0, 0.08, "grey"), boxAt(x0 + 0.38, y0 + 0.38, 1.03, 0.74, 0.84, 0.05, "cream"));
    out.push(boxAt(x0 + 1.7, y0 + 0.5, 0.95, 0.42, 0.42, 0.42, "violet"), boxAt(x0 + 1.79, y0 + 0.59, 1.37, 0.24, 0.24, 0.32, "grey"));
  } else {
    const x0 = cx - 1.25;
    const y0 = cy - 1.05;
    out.push(boxAt(x0 + 0.1, y0 + 0.1, 0, 2.3, 1.9, 0.2, "grey"));
    out.push(boxAt(x0, y0, 0.2, 2.5, 2.1, 2.4, "blue"));
    for (let k = 0; k < 3; k++) {
      const z0 = 0.36 + k * 0.72;
      out.push(poly("sh-drawer", onY(y0 + 2.104, x0 + 0.14, x0 + 2.36, z0, z0 + 0.58)));
      out.push(`<g class="sh-led"${busy ? " data-on" : ""}>${dot("", P(x0 + 0.4, y0 + 2.11, z0 + 0.29), 2.2)}</g>`);
      for (let s = 0; s < 4; s++) out.push(line("sh-vent", P(x0 + 1.1 + s * 0.24, y0 + 2.11, z0 + 0.15), P(x0 + 1.1 + s * 0.24, y0 + 2.11, z0 + 0.43)));
    }
    const [gx, gy] = P(x0 + 1.25, y0 + 1.05, 2.6);
    out.push(`<g class="ap-gear${busy ? " on" : ""}" transform="translate(${r1(gx)} ${r1(gy)}) scale(1 0.58)"><circle r="11"/><circle r="4.5"/>${Array.from({ length: 8 }, (_, i) => `<rect x="-2.6" y="-15" width="5.2" height="5" transform="rotate(${i * 45})"/>`).join("")}</g>`);
  }
  return out.join("");
}

/** The database (system) or the record book on a lectern (analogy). */
function store(v: Visual) {
  const [cx, cy] = toFloor(...DB);
  const out = [shadow(DB[0], DB[1], 56, 24)];
  if (v.analogy) {
    const x0 = cx - 1.2;
    const y0 = cy - 0.9;
    out.push(boxAt(x0 + 0.5, y0 + 0.5, 0, 1.4, 0.8, 0.2, "grey"), boxAt(x0 + 0.95, y0 + 0.7, 0.2, 0.5, 0.4, 1.1, "grey"));
    out.push(boxAt(x0, y0, 1.3, 2.4, 1.8, 0.14, "orange"));
    const z = 1.44;
    out.push(poly("ap-page", [P(x0 + 0.12, y0 + 0.12, z), P(x0 + 1.18, y0 + 0.12, z + 0.08), P(x0 + 1.18, y0 + 1.68, z + 0.08), P(x0 + 0.12, y0 + 1.68, z)]));
    out.push(poly("ap-page", [P(x0 + 1.22, y0 + 0.12, z + 0.08), P(x0 + 2.28, y0 + 0.12, z), P(x0 + 2.28, y0 + 1.68, z), P(x0 + 1.22, y0 + 1.68, z + 0.08)]));
    for (let i = 0; i < 5; i++) {
      const yy = y0 + 0.35 + i * 0.27;
      out.push(line("ap-ink", P(x0 + 0.3, yy, z + 0.02), P(x0 + 1.0, yy, z + 0.07)), line("ap-ink", P(x0 + 1.4, yy, z + 0.07), P(x0 + 2.1, yy, z + 0.02)));
    }
  } else {
    out.push(boxAt(cx - 1.55, cy - 1.55, 0, 3.1, 3.1, 0.24, "grey"));
    const R = 1.32;
    const rx = R * F.unit * 1.2247;
    const ry = R * F.unit * 0.7071;
    for (let k = 0; k < 3; k++) {
      const zb = 0.24 + k * 1.05;
      const zt = zb + 0.95;
      const [ox, yb] = P(cx, cy, zb);
      const [, yt] = P(cx, cy, zt);
      out.push(
        `<g class="sys-box sh-disk" data-tone="green"><path class="f-left" d="M${r1(ox - rx)} ${r1(yt)}L${r1(ox - rx)} ${r1(yb)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(ox + rx)} ${r1(yb)}L${r1(ox + rx)} ${r1(yt)}Z"/>` +
          `<path class="f-right sh-disk-shade" d="M${r1(ox + rx * 0.2)} ${r1(yt + ry * 0.98)}L${r1(ox + rx * 0.2)} ${r1(yb + ry * 0.98)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(ox + rx)} ${r1(yb)}L${r1(ox + rx)} ${r1(yt)}A${r1(rx)} ${r1(ry)} 0 0 1 ${r1(ox + rx * 0.2)} ${r1(yt + ry * 0.98)}Z"/>` +
          `<path class="sh-band" d="M${r1(ox - rx)} ${r1((yt + yb) / 2)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(ox + rx)} ${r1((yt + yb) / 2)}"/><ellipse class="f-top" cx="${r1(ox)}" cy="${r1(yt)}" rx="${r1(rx)}" ry="${r1(ry)}"/></g>`,
      );
    }
  }
  return out.join("");
}

/* ---------------------------------------------------------------- labels and cards */
const pillWidth = (text: string, size = 11) => Math.max(28, text.length * size * 0.56 + 18);
function pillAt(x: number, y: number, text: string, o: { tone?: string; part?: string; small?: boolean; key?: string } = {}, v?: Visual) {
  const size = o.small ? 11 : 12.5;
  const width = pillWidth(text, size);
  const height = o.small ? 18 : 22;
  return `<g class="sys-pill" data-tone="${o.tone ?? "plain"}"${o.key ? ` data-key="${o.key}"` : ""}${v ? partAttrs(o.part, v) : ""} transform="translate(${r1(x - width / 2)} ${r1(y - height / 2)})"><rect class="sys-pill-drop" x="1.5" y="2.5" width="${r1(width)}" height="${height}" rx="${height / 2}"/><rect width="${r1(width)}" height="${height}" rx="${height / 2}"/><text x="${r1(width / 2)}" y="${r1(height / 2 + size * 0.36)}" font-size="${size}">${esc(text)}</text></g>`;
}
const tx = (x: number, y: number, t: string, cls = "sys-card-text") => `<text class="${cls}" x="${r1(x)}" y="${r1(y)}" xml:space="preserve">${esc(t)}</text>`;
function card(key: string, part: string, x: number, y: number, w: number, h: number, body: string, v: Visual, cls = "", extra = "") {
  return `<g class="sys-pill sys-card ap-card ${cls}" data-key="${key}"${partAttrs(part, v)}${extra} transform="translate(${r1(x)} ${r1(y)})"><rect class="sys-pill-drop" x="2" y="3" width="${w}" height="${h}" rx="9"/><rect class="sys-card-bg" width="${w}" height="${h}" rx="9"/>${body}</g>`;
}
/** A small clickable chip inside a card. */
function chip(x: number, y: number, label: string, action: string, on: boolean, w = label.length * CW + 16, cls = "") {
  return `<g class="ap-chip ${cls}"${on ? " data-on" : ""} data-action="${action}" role="button" tabindex="0" aria-label="${esc(label)}" aria-pressed="${on}" transform="translate(${r1(x)} ${r1(y)})"><rect width="${r1(w)}" height="20" rx="6"/><text x="${r1(w / 2)}" y="14">${esc(label)}</text></g>`;
}
const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const statusTone = (s: number) => (s >= 400 ? "bad" : s >= 300 ? "warn" : "ok");

/** The lines of a request card, each piece tagged with the request part it belongs to. */
type Piece = { text: string; part?: string };
function requestLines(req: Req): Piece[][] {
  const [path, query] = req.url.split("?");
  const head: Piece[] = [{ text: req.method, part: "method" }, { text: " " }];
  const idMatch = /^(.*\/)(\d+)$/.exec(path);
  if (idMatch) head.push({ text: idMatch[1], part: "url" }, { text: idMatch[2], part: "path" });
  else head.push({ text: path, part: "url" });
  if (query) head.push({ text: "?", part: "query" }, { text: query, part: "query" });
  const lines: Piece[][] = [head];
  for (const [k, val] of Object.entries(req.headers)) lines.push([{ text: `${k}: ${val}`, part: "header" }]);
  if (req.body) {
    lines.push([{ text: "" }]);
    for (const l of req.body.split("\n")) lines.push([{ text: l, part: "body" }]);
  } else lines.push([{ text: "(tanpa body)" }]);
  return lines;
}
function pieces(x: number, y: number, list: Piece[], hl: string | null) {
  const spans = list.map((p) => `<tspan class="${p.part ? `ap-${p.part}` : ""}${p.part && hl === p.part && p.text.trim() ? " ap-hl-text" : ""}">${esc(p.text)}</tspan>`).join("");
  const lit = list.some((p) => p.part && hl === p.part && p.text.trim());
  return `${lit ? `<rect class="ap-hl" x="${x - 4}" y="${y - 11}" width="236" height="15" rx="3"/>` : ""}<text class="sys-card-text ap-mono" x="${x}" y="${y}" xml:space="preserve">${spans}</text>`;
}

function requestCard(req: Req | null, x: number, y: number, w: number, v: Visual, hl: string | null, title: string, zoom: boolean) {
  const A = v.analogy;
  let body = tx(12, 19, title, "sys-card-text strong") + `<path class="sh-rule" d="M10 26H${w - 10}"/>`;
  if (!req) body += tx(12, 46, A ? "(formulir belum diisi)" : "(belum ada request)", "sys-card-text muted");
  else requestLines(req).forEach((l, i) => (body += pieces(12, 44 + i * 15, l, hl)));
  const h = 32 + Math.max(2, req ? requestLines(req).length : 2) * 15 + 8;
  return card("req-card", "request", x, y, w, h, body, v, zoom ? "ap-zoom" : "", ` data-action="zoom:req" role="button" tabindex="0" aria-label="Perbesar kartu request"`);
}
/** Pretty JSON, with an array holding objects opened on the same line to save height. */
const compact = (body: unknown) =>
  pretty(body)
    .replace(/\[\n\s*\{/g, "[{")
    .replace(/\}\n\s*\]/g, "}]");
const MAP: Record<string, string> = { nama: "①", lokasi: "②", harga: "③" };
function responseCard(x: Exchange | null, cx: number, cy: number, w: number, v: Visual, title: string, zoom: boolean, opts: { map?: boolean; fragment?: boolean } = {}) {
  const A = v.analogy;
  const res: Res | null = x && x.res && (x.phase === "reply" || x.phase === "render" || x.phase === "done") ? x.res : null;
  let body = tx(12, 19, title, "sys-card-text strong") + `<path class="sh-rule" d="M10 26H${w - 10}"/>`;
  let lines = 2;
  if (!res) body += tx(12, 46, x && x.phase !== "done" ? (A ? "(menunggu jawaban…)" : "(menunggu response…)") : A ? "(belum ada jawaban)" : "(belum ada response)", "sys-card-text muted");
  else {
    body += `<g class="ap-status" data-tone="${statusTone(res.status)}"><rect x="10" y="33" width="${r1((String(res.status).length + res.text.length + 1) * CW + 12)}" height="17" rx="4"/>${tx(16, 45, `${res.status} ${res.text}`, "sys-card-text strong ap-mono")}</g>`;
    const shown = compact(opts.fragment ? { args: (res.body as { args: unknown }).args } : res.body);
    const all = shown.split("\n");
    lines = all.length + 1;
    all.forEach((l, i) => {
      const key = /"(nama|lokasi|harga)"/.exec(l)?.[1];
      const mark = opts.map && key && !(key === "nama" && /"Reguler"/.test(l)) ? MAP[key] : "";
      if (mark) body += `<rect class="ap-map" x="10" y="${r1(56 + i * 13)}" width="${w - 20}" height="13" rx="3"/>`;
      body += tx(12, 66 + i * 13, l, "sys-card-text ap-mono ap-json") + (mark ? tx(w - 24, 66 + i * 13, mark, "sys-card-text strong ap-mark") : "");
    });
  }
  const h = 60 + lines * 13 + (opts.fragment ? 14 : 0);
  if (opts.fragment && res) body += tx(12, h - 8, "… potongan respons, bukan keseluruhan", "sys-card-text small muted");
  return card("res-card", "response", cx, cy, w, h, body, v, zoom ? "ap-zoom" : "", ` data-action="zoom:res" role="button" tabindex="0" aria-label="Perbesar kartu response"`);
}

/** What Andi's screen shows: built only from responses that arrived. */
function screenCard(key: string, s: Screen, kind: "web" | "hp", x: number, y: number, v: Visual, scene: number, actions: [string, string, boolean?][] = []) {
  const A = v.analogy;
  const w = kind === "web" ? 228 : 150;
  const map = scene === 3 && !!s.concert;
  let body = `<rect class="ap-bar" x="1" y="1" width="${w - 2}" height="20" rx="8"/>${[0, 1, 2].map((i) => `<circle class="ap-bar-dot" cx="${12 + i * 9}" cy="11" r="2.6"/>`).join("")}${tx(kind === "web" ? 44 : 36, 15, kind === "web" ? (A ? "Papan layanan" : "konser.example") : A ? "Formulir HP" : "Aplikasi HP", "sys-card-text small muted")}`;
  let y0 = 42;
  const c = s.concert;
  if (s.loading && !c) body += tx(12, y0, "Memuat…", "sys-card-text muted");
  else if (!c) body += tx(12, y0, "Informasi konser belum dimuat.", "sys-card-text muted");
  else if (kind === "web") {
    body += tx(12, y0, c.nama, "sys-card-text strong ap-title") + (map ? tx(w - 22, y0, "①", "sys-card-text strong ap-mark") : "");
    body += tx(12, y0 + 18, `📍 ${c.lokasi}`) + (map ? tx(w - 22, y0 + 18, "②", "sys-card-text strong ap-mark") : "");
    body += tx(12, y0 + 36, `${c.kategori[0].nama} · ${rupiah(c.kategori[0].harga)}`) + (map ? tx(w - 22, y0 + 36, "③", "sys-card-text strong ap-mark") : "");
    y0 += 36;
  } else {
    body += tx(12, y0, c.nama, "sys-card-text strong ap-title");
    body += tx(12, y0 + 17, c.lokasi, "sys-card-text small");
    body += `<rect class="ap-price" x="10" y="${y0 + 26}" width="${w - 20}" height="20" rx="10"/>` + tx(20, y0 + 40, rupiah(c.kategori[0].harga), "sys-card-text strong ap-price-text");
    y0 += 46;
  }
  if (kind === "web" && c && scene >= 5 && scene <= 7) {
    y0 += 22;
    body += tx(12, y0, "Reguler × 2", "sys-card-text strong");
    if (s.order) body += tx(12, y0 + 18, `✓ ${s.order.kode_pesanan} · ${rupiah(s.order.total)}`, "sys-card-text ok") + tx(12, y0 + 34, "Menunggu pembayaran", "sys-card-text small muted");
    else if (s.loading) body += tx(12, y0 + 18, "Mengirim pesanan…", "sys-card-text muted");
    y0 += s.order ? 34 : 18;
  }
  if (s.error) {
    y0 += 20;
    body += tx(12, y0, `⚠ ${s.error}`, "sys-card-text bad");
  }
  // the page's own buttons: pressing one is what sends a request
  if (actions.length) {
    y0 += 14;
    let ax = 10;
    for (const [label, action, primary] of actions) {
      const cw = label.length * 6.4 + 18;
      if (ax + cw > w - 8) {
        ax = 10;
        y0 += 26;
      }
      body += chip(ax, y0, label, action, !!primary, cw, "ap-ui-button");
      ax += cw + 6;
    }
    y0 += 22;
  }
  const h = y0 + 12;
  return card(key, "frontend", x, y, w, h, body, v, `ap-screen-card${map ? " mapped" : ""}`);
}

/* ---------------------------------------------------------------- the moving message */
type LaneAt = { u0: number; u1: number; lane: number };
function legOf(x: Exchange): LaneAt | null {
  const fromU = FE[0] + 1.6;
  switch (x.phase) {
    case "prepare":
      return { u0: fromU, u1: fromU, lane: LANE_REQ };
    case "send":
      return { u0: fromU, u1: EP[0], lane: LANE_REQ };
    case "check":
      return { u0: EP[0], u1: CK[0], lane: LANE_REQ };
    case "process":
      return { u0: CK[0], u1: PR[0], lane: LANE_REQ };
    case "db":
      return { u0: PR[0], u1: DB[0], lane: LANE_REQ };
    case "db-back":
      return { u0: DB[0], u1: PR[0], lane: LANE_RES };
    case "reply":
      return { u0: x.rejected ? CK[0] : PR[0], u1: fromU, lane: LANE_RES };
    case "render":
      return { u0: fromU, u1: fromU, lane: LANE_RES };
    default:
      return null;
  }
}
function messageToken(x: Exchange, t: number, v: Visual) {
  const leg = legOf(x);
  if (!leg) return "";
  const k = v.reduced ? 1 : progressOf(x, t);
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const u = leg.u0 + (leg.u1 - leg.u0) * e;
  const [px, py] = S(u, leg.lane, 0.3);
  const goingBack = leg.lane === LANE_RES;
  const A = v.analogy;
  const label = goingBack ? (x.res ? `${x.res.status} ${x.res.text}` : "…") : `${x.req.method} ${x.req.url.replace("https://postman-echo.com", "")}`;
  const kind = goingBack ? (x.res && x.res.status >= 400 ? "bad" : "ok") : "req";
  const w = Math.min(230, label.length * 6.2 + (A ? 34 : 18));
  const fade = x.phase === "prepare" || x.phase === "render" ? ` opacity="${r1(0.4 + 0.6 * (x.phase === "prepare" ? k : 1 - k))}"` : "";
  const icon = A ? `<path class="ap-form-icon" d="M${r1(-w / 2 + 8)} -6h9v12h-9zM${r1(-w / 2 + 10)} -2h5M${r1(-w / 2 + 10)} 1h5"/>` : "";
  return `<g class="ap-token" data-key="tok-${x.id}" data-kind="${kind}" data-action="zoom:${goingBack ? "res" : "req"}" role="button" tabindex="0" aria-label="Perbesar ${goingBack ? "response" : "request"}" transform="translate(${r1(px)} ${r1(py - 6)})"${fade}><rect class="ap-token-drop" x="${r1(-w / 2 + 1.5)}" y="-9.5" width="${r1(w)}" height="21" rx="5"/><rect x="${r1(-w / 2)}" y="-11" width="${r1(w)}" height="21" rx="5"/>${icon}<text x="${A ? 8 : 0}" y="3.5">${esc(label)}</text></g>`;
}

/* ---------------------------------------------------------------- render */
const PART_HELP: Record<string, [string, string]> = {
  method: ["Method", "Tindakan yang diminta. GET = membaca, POST = membuat pesanan (di kontrak ini)."],
  url: ["URL / endpoint", "Tujuan layanan: alamat yang disediakan backend untuk satu jenis permintaan."],
  path: ["Path parameter", "Bagian alamat yang menunjuk satu data, misalnya 101 pada /konser/101."],
  query: ["Query parameter", "Pilihan tambahan setelah tanda ?, misalnya ?kota=Jakarta untuk menyaring."],
  header: ["Header", "Informasi tambahan tentang permintaan, misalnya format body (Content-Type)."],
  body: ["Body", "Data yang dikirim. GET di contoh ini tidak membawa body; POST membawa detail pesanan."],
};
const PART_REQ: Record<string, Req> = {
  method: viewRequest(101),
  url: viewRequest(101),
  path: viewRequest(101),
  query: { method: "GET", url: "/api/konser?kota=Jakarta", headers: { Accept: "application/json" }, body: null },
  header: orderRequest(2),
  body: orderRequest(2),
};

function checklist(sim: ApiSim, x: Exchange | null, cx: number, cy: number, v: Visual) {
  const res = x && x.phase === "done" ? x.res : null;
  const seen = new Set(sim.exchanges.filter((e) => e.res && e.phase === "done").map((e) => e.res!.status));
  const sent = x && x.req.body ? JSON.parse(x.req.body) : null;
  const b = res?.body as Record<string, unknown> | undefined;
  const isOrder = !!res && res.status === 201;
  const rows: [string, boolean | null, string][] = [
    ["Status sesuai kontrak?", res ? (x!.req.method === "POST" && res.status < 300 ? res.status === 201 : true) : null, res ? `${res.status} ${res.text}` : "—"],
    ["Field yang dibutuhkan ada?", isOrder ? ["kode_pesanan", "jumlah", "total", "status"].every((k) => b && k in b) : res ? (res.status >= 400 ? !!b && "error" in b : true) : null, isOrder ? "kode_pesanan, jumlah, total, status" : res && res.status >= 400 ? "error" : "—"],
    ["Nilai & tipe data benar?", isOrder ? typeof b!.total === "number" && b!.total === (b!.jumlah as number) * 350000 : null, isOrder ? `total ${b!.total} = ${b!.jumlah} × 350000` : "kirim POST jumlah 2"],
    ["Input tidak valid ditangani?", seen.has(400) ? true : null, seen.has(400) ? "jumlah 0 → 400" : "coba preset POST jumlah 0"],
    ["Respons sesuai permintaan?", isOrder && sent ? b!.jumlah === sent.jumlah : null, isOrder && sent ? `jumlah dikirim ${sent.jumlah}, diterima ${b!.jumlah}` : "—"],
  ];
  let body = tx(12, 19, "Periksa respons, bukan hanya Send", "sys-card-text strong") + `<path class="sh-rule" d="M10 26H262"/>`;
  rows.forEach(([q, ok, note], i) => {
    const y = 34 + i * 29;
    body += `<g class="ap-check" data-ok="${ok === null ? "" : ok}" transform="translate(10 ${y})"><rect width="16" height="16" rx="4"/>${tx(4, 12, ok === null ? "·" : ok ? "✓" : "✗", "sys-card-text strong")}</g>` + tx(34, y + 12, q, "sys-card-text strong") + tx(34, y + 26, note, "sys-card-text small muted");
  });
  body += tx(12, 34 + rows.length * 29 + 14, "Status 200/201 saja belum membuktikan semuanya.", "sys-card-text small");
  return card("checklist", "response", cx, cy, 272, 34 + rows.length * 29 + 24, body, v);
}

function clientPanel(sim: ApiSim, cx: number, cy: number, v: Visual) {
  const f = sim.form;
  const req = formRequest(f);
  let body = tx(12, 19, v.analogy ? "Formulir langsung (API client)" : "Mini API client", "sys-card-text strong") + `<path class="sh-rule" d="M10 26H232"/>`;
  body += tx(12, 44, "Method", "sys-card-text small muted") + chip(70, 31, "GET", "f:method:GET", f.method === "GET") + chip(116, 31, "POST", "f:method:POST", f.method === "POST");
  body += tx(12, 70, "Endpoint", "sys-card-text small muted");
  body += chip(12, 76, "/api/konser/{id}", "f:target:konser", f.target === "konser", 128) + chip(144, 76, "/api/pesanan", "f:target:pesanan", f.target === "pesanan", 90);
  body += chip(12, 100, "/api/konser?kota=Jakarta", "f:target:daftar", f.target === "daftar", 172);
  body += tx(12, 140, "ID konser", "sys-card-text small muted") + chip(80, 127, "101", "f:id:101", f.konserId === 101, 40) + chip(124, 127, "999", "f:id:999", f.konserId === 999, 40);
  body += tx(12, 166, "jumlah", "sys-card-text small muted") + chip(80, 153, "−", "f:jumlah:-1", false, 24) + tx(112, 167, String(f.jumlah), "sys-card-text strong") + chip(128, 153, "+", "f:jumlah:+1", false, 24);
  body += tx(12, 192, "Header", "sys-card-text small muted") + chip(70, 179, f.contentType ? "Content-Type ✓" : "Content-Type ✗", "f:ct", f.contentType, 112);
  body += `<g class="ap-send" data-action="send" role="button" tabindex="0" aria-label="Kirim request" transform="translate(12 208)"><rect width="220" height="26" rx="13"/><text x="110" y="17.5">Kirim  ${esc(req.method)} ${esc(req.url.length > 18 ? req.url.slice(0, 17) + "…" : req.url)}</text></g>`;
  body += tx(12, 254, "Preset", "sys-card-text small muted");
  body += chip(12, 260, "GET 101", "preset:get101", false, 66) + chip(82, 260, "GET 999", "preset:get999", false, 66) + chip(12, 284, "POST jumlah 2", "preset:post2", false, 108) + chip(124, 284, "POST jumlah 0", "preset:post0", false, 108);
  const x = current(sim);
  const ms = x && x.phase === "done" ? `${simulatedMs(x)} ms` : x ? "…" : "—";
  body += tx(12, 324, `Waktu simulasi: ${ms}`, "sys-card-text small strong");
  body += tx(12, 340, "Simulasi lokal — tidak menghubungi", "sys-card-text small muted") + tx(12, 353, "server sungguhan.", "sys-card-text small muted");
  return card("client", "client", cx, cy, 244, 364, body, v);
}

function render(sim: ApiSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const echo = sim.server === "echo";
  const x = current(sim);
  const phase: Phase | null = x ? x.phase : null;
  const anchor = EXT.map(([u, w]) => S(u, w).join(",")).join(" ");
  const out: string[] = [`<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${anchor}"/></g>`];

  // backend area: one zone holding endpoint, check and logic (the API is part of it)
  {
    const c = [S(12.8, 4.4), S(31.6, 4.4), S(31.6, 11.4), S(12.8, 11.4)];
    const [lx, ly] = S(31.3, 11.4);
    const name = echo ? "postman-echo.com · layanan latihan" : A ? "Di balik loket" : "Backend · server aplikasi tiket";
    out.push(`<g class="ap-zone" data-key="zone-backend"${partAttrs("process", v)}><polygon points="${pts(c)}"/><text x="${r1(lx - 6)}" y="${r1(ly - 7)}" text-anchor="end">${esc(name)}</text></g>`);
  }
  // lanes: requests above, responses below
  const laneLine = (lane: number, u0: number, u1: number, cls: string, key: string) => {
    const [a, b] = [S(u0, lane, 0.2), S(u1, lane, 0.2)];
    return `<path class="ap-lane ${cls}" data-key="${key}" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}"/>`;
  };
  const far = echo ? PR[0] : DB[0];
  const activeReq = phase && ["send", "check", "process", "db"].includes(phase);
  const activeRes = phase && ["db-back", "reply"].includes(phase);
  out.push(laneLine(LANE_REQ, FE[0] + 1.6, far, `req${activeReq ? " on" : ""}`, "lane-req"), laneLine(LANE_RES, FE[0] + 1.6, far, `res${activeRes ? " on" : ""}`, "lane-res"));
  // stubs from each stop to both lanes
  const stops: [number, number][] = [FE, EP, CK, PR, ...(echo ? [] : [DB])];
  for (const [u, w] of stops) out.push(`<path class="ap-stub" data-key="stub-${u}" d="M${S(u + (u === FE[0] ? 1.6 : 0), LANE_REQ, 0.2).join(" ")}L${S(u + (u === FE[0] ? 1.6 : 0), w - 1.6, 0.2).join(" ")}M${S(u + (u === FE[0] ? 1.6 : 0), w + 1.6, 0.2).join(" ")}L${S(u + (u === FE[0] ? 1.6 : 0), LANE_RES, 0.2).join(" ")}"/>`);
  {
    const [a] = [S(FE[0] + 2.4, LANE_REQ - 0.9)];
    const [b] = [S(FE[0] + 2.4, LANE_RES + 0.9)];
    out.push(pillAt(a[0] + 40, a[1], A ? "formulir →" : "request →", { small: true, tone: "info", key: "lane-label-req" }));
    out.push(pillAt(b[0] + 44, b[1], A ? "← jawaban" : "← response", { small: true, tone: "ok", key: "lane-label-res" }));
  }

  // solids, back to front (all stand on the same row)
  const verdict = x && x.phase !== "prepare" && x.phase !== "send" && x.phase !== "check" ? (x.rejected ? "bad" : "ok") : null;
  const devices = sim.clients;
  const direct = devices[0] === "client";
  if (!direct) out.push(node("user", "user", v, person(USER[0] - (devices.includes("hp") ? 1.6 : 0), USER[1], "blue")));
  if (devices.includes("hp") && devices.includes("web")) {
    const [lx, ly] = toFloor(FE[0] - 2.8, FE[1] - 0.4);
    out.push(node("fe-web", "frontend", v, laptop(F, lx - 1.2, ly - 1.2, "frontend", v)));
    out.push(node("fe-hp", "frontend", v, phone(FE[0] + 2.0, FE[1] + 0.6)));
  } else if (devices[0] !== "client") {
    const [lx, ly] = toFloor(...FE);
    out.push(node("fe", "frontend", v, `${laptop(F, lx - 1.2, ly - 1.2, devices[0] === "web" ? "frontend" : "client", v)}`));
  }
  out.push(node("endpoint", "endpoint", v, endpoint(v, echo ? "/get" : A ? "LOKET" : "/api"), phase === "send" || phase === "check" ? "active" : ""));
  out.push(node("check", "check", v, checkDesk(v, echo ? (verdict ? "ok" : null) : verdict), phase === "check" ? "active" : ""));
  out.push(node("process", "process", v, processUnit(v, phase === "process" || phase === "db" || phase === "db-back"), phase === "process" ? "active" : ""));
  if (!echo) {
    const dbState = phase === "db" || phase === "db-back" ? "active" : x && x.phase !== "prepare" && x.phase !== "send" && x.phase !== "check" && !x.db && x.phase !== "process" ? "idle" : "";
    out.push(node("db", "db", v, store(v), dbState));
  }

  // names
  const labels: string[] = [];
  const name = (u: number, w: number, text: string, part: string, key: string, dy = 30, tone = "plain") => {
    const [px, py] = S(u, w);
    labels.push(pillAt(px, py + dy, text, { part, key, tone }, v));
  };
  if (!direct) name(USER[0] - (devices.includes("hp") ? 1.6 : 0), USER[1], "Andi", "user", "n-user", 16);
  if (devices.includes("hp") && devices.includes("web")) {
    name(FE[0] - 2.8, FE[1] - 0.4, A ? "Papan layanan" : "Website", "frontend", "n-web", 26);
    name(FE[0] + 2.0, FE[1] + 0.6, A ? "Formulir HP" : "Aplikasi HP", "frontend", "n-hp", 20);
  } else if (!direct) name(FE[0], FE[1], devices[0] === "client" ? (A ? "Formulir langsung" : "API client") : devices[0] === "tool" ? "Postman / Bruno / curl" : A ? "Papan & formulir" : "Frontend (website)", devices[0] === "web" ? "frontend" : "client", "n-fe", 26);
  name(EP[0], EP[1], echo ? "Endpoint /get" : A ? "Loket" : "Endpoint API", "endpoint", "n-ep", 34, phase === "send" || phase === "check" ? "info" : "plain");
  name(CK[0], CK[1], A ? "Pemeriksa" : "Pemeriksaan", "check", "n-ck", 30, phase === "check" ? "info" : "plain");
  name(PR[0], PR[1], echo ? "Mengembalikan isi" : A ? "Petugas proses" : "Proses aplikasi", "process", "n-pr", 34, phase === "process" ? "info" : "plain");
  if (!echo) name(DB[0], DB[1], A ? "Buku catatan" : "Database", "db", "n-db", 34, phase === "db" || phase === "db-back" ? "info" : "plain");
  // database counter and the backend's own note
  if (!echo && (scene === 5 || scene === 6 || scene === 9)) {
    const [px, py] = S(DB[0], DB[1]);
    labels.push(pillAt(px, py - 96, `${A ? "Tercatat" : "Pesanan tersimpan"}: ${sim.orders.length}`, { small: true, part: "db", key: "db-count", tone: "plain" }, v));
  }
  if (x?.note && (x.phase === "process" || x.phase === "db" || x.phase === "db-back")) {
    const [px, py] = S(PR[0] + 2, LANE_REQ - 1.6);
    labels.push(pillAt(px, py, x.note, { small: true, tone: "info", part: "process", key: "be-note" }, v));
  }
  if (x?.rejected && (x.phase === "reply" || x.phase === "render" || x.phase === "done")) {
    const [px, py] = S(CK[0] + 0.4, LANE_REQ - 1.6);
    labels.push(pillAt(px, py, A ? "Formulir ditolak sebelum diproses" : "Ditolak saat pemeriksaan · data tidak diubah", { small: true, tone: "bad", part: "check", key: "rej-note" }, v));
  }

  // status strip
  {
    const active = phase ? (phase === "db" || phase === "db-back" ? "process" : phase) : null;
    const idx = active && active !== "done" ? STRIP.indexOf(active as Phase) : x && x.phase === "done" ? STRIP.length : -1;
    let sx = S(-1, 1.6)[0];
    const sy = S(-1, 1.6)[1] - 11;
    let strip = "";
    STRIP.forEach((p, i) => {
      const t = PHASE_LABEL[p];
      const w = t.length * 6.3 + 22;
      const st = i < idx ? "done" : i === idx ? "on" : "";
      strip += `<g class="ap-step" data-st="${st}" transform="translate(${r1(sx)} ${r1(sy)})"><rect width="${r1(w)}" height="22" rx="11"/><text x="${r1(w / 2)}" y="15">${esc((st === "done" ? "✓ " : "") + t)}</text></g>`;
      sx += w + 14;
      if (i < STRIP.length - 1) strip += `<path class="ap-step-arrow" d="M${r1(sx - 11)} ${r1(sy + 11)}h8m-3 -3l3 3l-3 3"/>`;
    });
    labels.push(`<g class="ap-strip" data-key="strip"${partAttrs("strip", v)}>${strip}</g>`);
  }

  // cards along the bottom: screen | request | response (or the scene's own)
  const cards: string[] = [];
  const [c0x, c0y] = S(-1.6, BOTTOM);
  const [c1x] = S(13.4, BOTTOM);
  const [c2x] = S(27.6, BOTTOM);
  const zoom = sim.zoom;
  const reqShown = x ? x.req : scene === 0 ? null : viewRequest(101);
  const reqTitle = A ? "Formulir (request)" : "Request";
  const resTitle = scene === 10 ? "Response · ilustrasi" : A ? "Jawaban · simulasi lokal" : "Response · simulasi lokal";
  if (scene === 7) {
    const sel = sim.part;
    let body = tx(12, 19, "Bagian sebuah request", "sys-card-text strong") + `<path class="sh-rule" d="M10 26H218"/>`;
    Object.keys(PART_HELP).forEach((k, i) => (body += chip(12 + (i % 2) * 106, 36 + Math.floor(i / 2) * 26, PART_HELP[k][0], `part:${k}`, sel === k, 100)));
    const help = PART_HELP[sel][1];
    const words = help.split(" ");
    const linesOut: string[] = [];
    let cur = "";
    for (const wd of words) {
      if ((cur + " " + wd).trim().length > 32) (linesOut.push(cur.trim()), (cur = ""));
      cur += " " + wd;
    }
    linesOut.push(cur.trim());
    linesOut.forEach((l, i) => (body += tx(12, 128 + i * 15, l)));
    body += tx(12, 128 + linesOut.length * 15 + 12, "Tidak semua bagian wajib ada.", "sys-card-text small muted");
    cards.push(card("parts", "parts", c0x, c0y, 230, 150 + linesOut.length * 15, body, v));
    cards.push(requestCard(PART_REQ[sel], c1x, c0y, 260, v, sel, `${reqTitle} · contoh`, false));
  } else if (scene === 8 || scene === 9) {
    {
      // the client is the panel itself: it sits where the frontend was, its right edge at the lanes
      const [rx] = S(FE[0] + 1.8, 0);
      const [, ty] = S(0, 2.9);
      cards.push(clientPanel(sim, rx - 244, ty, v));
    }
    if (scene === 8) cards.push(requestCard(x ? x.req : formRequest(sim.form), c1x, c0y, 260, v, null, reqTitle, zoom === "req"));
    cards.push(responseCard(x, scene === 9 ? c1x : c2x, c0y, scene === 9 ? 260 : 270, v, resTitle, zoom === "res"));
    if (scene === 9) cards.push(checklist(sim, x, c2x, c0y, v));
  } else if (scene === 10) {
    const steps = ["1  Buka request baru", "2  Pilih GET", "3  Tempel URL", "4  Tekan Send", "5  Periksa status", "6  Cari objek args"];
    let body = tx(12, 19, "Di alatmu (Postman)", "sys-card-text strong") + `<path class="sh-rule" d="M10 26H218"/>`;
    steps.forEach((s, i) => (body += tx(12, 44 + i * 17, s)));
    body += tx(12, 44 + steps.length * 17 + 6, "Ilustrasi — bukan hasil jaringanmu.", "sys-card-text small muted");
    cards.push(card("tool-steps", "client", c0x, c0y, 230, 64 + steps.length * 17, body, v));
    cards.push(requestCard({ method: "GET", url: ECHO_URL.replace("https://postman-echo.com", ""), headers: { Host: "postman-echo.com" }, body: null }, c1x, c0y, 260, v, null, reqTitle, zoom === "req"));
    cards.push(responseCard(x, c2x, c0y, 270, v, resTitle, zoom === "res", { fragment: true }));
  } else {
    const both = devices.includes("hp") && devices.includes("web");
    const acts: [string, string, boolean?][] =
      scene === 0 ? [["Lihat konser", "view", true]] : scene <= 3 ? [["Lihat konser lagi", "view", true]] : scene === 4 ? [["Muat ulang", "view:web", true]] : scene === 5 ? [["Buat pesanan", "order:2", true]] : scene === 6 ? [["Jumlah 2", "order:2"], ["Jumlah 0", "order:0", true], ["Konser 999", "order:2:999"], ["Reset demo", "reset"]] : [];
    cards.push(screenCard("screen-web", sim.screens.web, "web", c0x, c0y, v, scene, acts));
    if (both) cards.push(screenCard("screen-hp", sim.screens.hp, "hp", c0x + 238, c0y, v, scene, [["Muat ulang", "view:hp", true]]));
    if (!both) cards.push(requestCard(reqShown, c1x, c0y, 260, v, scene === 1 ? "method" : null, reqTitle, zoom === "req"));
    cards.push(responseCard(x, c2x, c0y, 270, v, resTitle, zoom === "res", { map: scene === 3 }));
    if (scene === 1 && x) {
      const [px, py] = S(13.4, BOTTOM);
      labels.push(pillAt(px + 130, py - 14, A ? "Loket informasi · konser 101" : "GET = membaca · /api/konser/101 = alamat layanan", { small: true, tone: "info", part: "request", key: "req-hint" }, v));
    }
  }


  const toks = x ? messageToken(x, sim.t, v) : "";
  // a zoomed card is drawn last so it sits on top
  const z = cards.findIndex((c) => c.includes("ap-zoom"));
  if (z >= 0) cards.push(cards.splice(z, 1)[0]);
  return out.join("") + labels.join("") + toks + cards.join("");
}

const SPEC: SystemSpec<ApiSim> = {
  frame: F,
  floor: floor(F, [-12, -24, 42, 34]),
  render,
  cameraPad: [16, 14],
  onAction: (action, runtime) => {
    const parts = action.split(":");
    const act = (fn: (s: ApiSim) => unknown) => runtime.act(fn);
    if (parts[0] === "view") act((s) => view(s, (parts[1] as "web" | "hp") ?? "web"));
    else if (parts[0] === "order") act((s) => placeOrder(s, Number(parts[1]), parts[2] ? Number(parts[2]) : 101));
    else if (parts[0] === "reset") act((s) => resetDemo(s));
    else if (parts[0] === "zoom") act((s) => (s.zoom = s.zoom === parts[1] ? null : (parts[1] as "req" | "res")));
    else if (parts[0] === "part") act((s) => (s.part = parts[1]));
    else if (parts[0] === "send") act((s) => sendForm(s));
    else if (parts[0] === "f")
      act((s) => {
        const f = s.form;
        if (parts[1] === "method") f.method = parts[2] as "GET" | "POST";
        else if (parts[1] === "target") {
          f.target = parts[2] as typeof f.target;
          f.method = f.target === "pesanan" ? "POST" : "GET";
        } else if (parts[1] === "id") f.konserId = Number(parts[2]);
        else if (parts[1] === "jumlah") f.jumlah = Math.max(0, Math.min(9, f.jumlah + Number(parts[2])));
        else if (parts[1] === "ct") f.contentType = !f.contentType;
      });
    else if (parts[0] === "preset")
      act((s) => {
        const p = parts[1];
        s.form = {
          ...s.form,
          ...(p === "get101" ? { method: "GET", target: "konser", konserId: 101 } : p === "get999" ? { method: "GET", target: "konser", konserId: 999 } : { method: "POST", target: "pesanan", konserId: 101, jumlah: p === "post2" ? 2 : 0, contentType: true }),
        } as ApiSim["form"];
        sendForm(s);
      });
  },
  analogyLabel: "Analogi loket: Andi mengisi formulir di papan layanan; formulir dibawa ke loket layanan, diperiksa petugas, diproses petugas lain yang bila perlu membuka buku catatan, lalu jawabannya kembali dan ditampilkan untuk Andi.",
  label: "Cara kerja aplikasi: frontend mengirim request HTTP ke endpoint API milik backend; backend memeriksa request, menjalankan proses aplikasi, mengakses database bila perlu, lalu mengirim response yang diubah frontend menjadi tampilan.",
};

export default function ApiSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
