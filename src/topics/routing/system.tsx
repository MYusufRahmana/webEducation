import type { FigureStageProps } from "../types";
import { cut, DEST_IP, focusPacket, linkKey, open, probe, progressOf, send, type Dest, type NodeId, type Packet, type RouteSim } from "./model";
import { block, edge, esc, floor, laptop, makeFrame, partAttrs, pill, token, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * A network map read from left to right. Design coordinates (u to the right, w downwards) are mapped
 * onto the isometric floor so the networks read as soft upright areas:
 *
 *   rumah Andi │ ISP │ jaringan perantara (Router A atas, Router B bawah) │ Google (atas) / Facebook (bawah)
 *
 * Nodes appear as the lesson introduces them and never move. One packet is in focus: larger, ringed,
 * with its trail lit. Packets going out and coming back use opposite sides of each link.
 */
const toFloor = (u: number, w: number): [number, number] => [u / 2 + w, -u / 2 + w];
const P: Record<NodeId, [number, number]> = {
  L: [2, 10],
  DNS: [13, 3.2],
  H: [8.5, 10],
  I: [15, 10],
  X1: [22.5, 5.6],
  X2: [22.5, 13.4],
  G: [30, 4.8],
  F: [30, 14.2],
  GS: [37, 4],
  FS: [37, 15],
};
const LINKS: [NodeId, NodeId][] = [["L", "H"], ["H", "I"], ["I", "X1"], ["I", "X2"], ["X1", "G"], ["X2", "G"], ["X2", "F"], ["G", "GS"], ["F", "FS"]];
const Z = 0.3;

/** Which nodes each scene shows: they appear as the lesson introduces them. */
function shows(scene: number): Set<NodeId> {
  const s = new Set<NodeId>(["L", "GS"]);
  if (scene >= 1) s.add("DNS");
  if (scene >= 2) s.add("H");
  if (scene >= 3) ["I", "X1", "X2"].forEach((n) => s.add(n as NodeId));
  if (scene >= 4) s.add("G");
  if (scene >= 6) ["F", "FS"].forEach((n) => s.add(n as NodeId));
  return s;
}

const ZONES: { key: string; part: string; u: [number, number]; w: [number, number]; name: string; analogy: string; from: number }[] = [
  { key: "home", part: "home", u: [-1, 11.2], w: [6.4, 13.6], name: "Rumah Andi", analogy: "Rumah Andi", from: 0 },
  { key: "isp", part: "isp", u: [12.6, 17.6], w: [6.4, 13.6], name: "Jaringan ISP", analogy: "Kurir (ISP)", from: 3 },
  { key: "transit", part: "transit", u: [19.6, 25.6], w: [1.8, 17], name: "Jaringan perantara", analogy: "Pusat sortir perantara", from: 3 },
  { key: "google", part: "google", u: [27.4, 40.6], w: [0.6, 8.6], name: "Jaringan Google", analogy: "Wilayah penerima Google", from: 0 },
  { key: "facebook", part: "facebook", u: [27.4, 40.6], w: [11.6, 18.2], name: "Jaringan Facebook", analogy: "Wilayah penerima Facebook", from: 6 },
];

/** The network map the camera always frames; the panel on the left (table, terminal, buttons) widens it when shown. */
const EXT: [number, number][] = [[-1.5, -2.6], [42, -2.6], [42, 18.4], [-1.5, 18.4]];
const F = makeFrame([[-26, -2.6], [42, -2.6], [42, 18.4], [-26, 18.4]].map(([u, w]) => [...toFloor(u, w), 0] as Vec3), 21);
/** Right edge of the left panel, just clear of the laptop. */
const PANEL_U = -2.2;
const r1 = (n: number) => Math.round(n * 10) / 10;
const S = (u: number, w: number, z = 0) => F.p(...toFloor(u, w), z);
const pillWidth = (text: string) => Math.max(28, text.length * 11 * 0.56 + 18);

function anchor() {
  const pts = EXT.map(([u, w]) => S(u, w).join(",")).join(" ");
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${pts}"/></g>`;
}

/** A soft network area with its name, drawn flat. */
function area(z: (typeof ZONES)[number], A: boolean, v: Visual) {
  const [u0, u1] = z.u;
  const [w0, w1] = z.w;
  const pts = [S(u0, w0), S(u1, w0), S(u1, w1), S(u0, w1)].map((p) => p.join(",")).join(" ");
  const [lx, ly] = S(u0 + 0.3, w1);
  return `<g class="rt-zone" data-key="zone-${z.key}" data-net="${z.key}"${partAttrs(z.part, v)}><polygon points="${pts}"/><text x="${r1(lx + 6)}" y="${r1(ly - 7)}">${esc(A ? z.analogy : z.name)}</text></g>`;
}

const NAMES: Record<NodeId, [string, string, string]> = {
  // [system name, everyday name, part]
  L: ["Laptop Andi", "Pengirim (Andi)", "laptop"],
  DNS: ["DNS", "Buku alamat", "dns"],
  H: ["Router rumah", "Pos rumah", "home"],
  I: ["Router ISP", "Sortir ISP", "isp"],
  X1: ["Router A", "Pusat sortir A", "transit"],
  X2: ["Router B", "Pusat sortir B", "transit"],
  G: ["Router Google", "Sortir Google", "google"],
  F: ["Router Facebook", "Sortir Facebook", "facebook"],
  GS: ["Layanan Google", "Penerima Google", "google"],
  FS: ["Layanan Facebook", "Penerima Facebook", "facebook"],
};
/** The traceroute example's addresses (documentation ranges), shown on the map in steps 10–11. */
const EXAMPLE: Partial<Record<NodeId, string>> = { H: "192.168.1.1", I: "10.20.0.1", X1: "198.51.100.1", G: "* tidak membalas pemeriksaan", GS: "contoh.test · 203.0.113.10" };
const HOP_NODE: Record<number, NodeId> = { 1: "H", 2: "I", 3: "X1", 4: "G", 5: "GS" };

function node(id: NodeId, sim: RouteSim, v: Visual, scene: number, dim: boolean, ring: boolean) {
  const A = v.analogy;
  const [u, w] = P[id];
  const [name, everyday, part] = NAMES[id];
  const label = A ? everyday : name;
  const service = id === "GS" || id === "FS";
  const size = service ? 2.4 : id === "DNS" ? 1.7 : 2;
  const [fx, fy] = toFloor(u, w);
  const out: string[] = [];
  if (id === "L") out.push(laptop(F, fx - 1.2, fy - 1.2, "laptop", v));
  else
    out.push(
      block(F, fx - size / 2, fy - size / 2, {
        tone: service ? (id === "GS" ? "green" : "violet") : id === "DNS" ? "yellow" : "blue",
        label: "",
        icon: service ? "server" : id === "DNS" ? "doc" : "router",
        part,
        w: size,
        d: size,
        h: service ? 2.6 : id === "DNS" ? 1.4 : 0.9,
        faded: dim,
      }, v),
    );
  // the name sits below the object, upright and large
  const [nx, ny] = S(u + 0.6, w + 1.6);
  const tracing = scene === 9 && EXAMPLE[id];
  if (service) {
    const dest: Dest = id === "GS" ? "google" : "facebook";
    const addr = tracing ? EXAMPLE[id]! : sim.known[dest] ? `alamat: ${DEST_IP[dest]} (ilustrasi)` : "alamat: belum diketahui";
    const [sx, sy] = S(u, w, 2.6);
    out.push(pill(sx, sy - 52, label, { part, tone: ring ? "info" : "plain" }, v));
    out.push(pill(sx, sy - 28, addr, { small: true, tone: sim.known[dest] || tracing ? "ok" : "warn", part }, v));
  } else {
    out.push(pill(nx, ny + 6, label, { part, tone: ring ? "info" : "plain" }, v));
    if (tracing) out.push(pill(nx, ny + 30, EXAMPLE[id]!, { small: true, tone: id === "G" ? "warn" : "plain", part }, v));
  }
  if (ring) {
    const [cx, cy] = S(u, w);
    out.push(`<ellipse class="rt-ring" data-key="ring-${id}" cx="${r1(cx)}" cy="${r1(cy)}" rx="44" ry="24"/>`);
  }
  return `<g class="rt-node" data-key="node-${id}"${dim ? " data-dim" : ""}>${out.join("")}</g>`;
}

/** Where a packet is: on the link from → to, shifted to the side of its direction. */
function packetAt(p: Packet, t: number, reduced: boolean): Vec3 {
  const here = p.trail[p.trail.length - 1];
  if (!p.to) return [...toFloor(...P[here]), Z] as Vec3;
  const [u0, w0] = P[p.from];
  const [u1, w1] = P[p.to];
  const k = reduced ? 1 : progressOf(p, t);
  const len = Math.hypot(u1 - u0, w1 - w0) || 1;
  const side = p.kind === "reply" || p.kind === "probe-reply" || p.kind === "dns-a" ? -0.45 : 0.45;
  const ou = (-(w1 - w0) / len) * side;
  const ow = ((u1 - u0) / len) * side;
  return [...toFloor(u0 + (u1 - u0) * k + ou, w0 + (w1 - w0) * k + ow), Z] as Vec3;
}

function render(sim: RouteSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const vis = shows(scene);
  const out: string[] = [anchor()];
  const lines: string[] = [];
  const toks: string[] = [];
  const labels: string[] = [];
  const focus = focusPacket(sim);
  const lit = new Set<string>();
  if (focus && focus.kind !== "dns-q" && focus.kind !== "dns-a") for (let i = 1; i < focus.trail.length; i++) lit.add(linkKey(focus.trail[i - 1], focus.trail[i]));
  if (focus?.to) lit.add(linkKey(focus.from, focus.to));

  for (const z of ZONES) if (scene >= z.from) out.push(area(z, A, v));

  // links: lit when the focused packet uses them, soft otherwise; a failed link is crossed out
  for (const [a, b] of LINKS) {
    if (!vis.has(a) || !vis.has(b)) continue;
    const key = linkKey(a, b);
    const down = sim.down.includes(key);
    const pts: Vec3[] = [[...toFloor(...P[a]), Z] as Vec3, [...toFloor(...P[b]), Z] as Vec3];
    lines.push(`<g class="rt-link${lit.has(key) ? " lit" : ""}${down ? " down" : ""}" data-key="link-${key}">${edge(F, pts, { part: "transit", faded: !lit.has(key) && !down }, v)}</g>`);
    if (down) {
      const [mx, my] = S((P[a][0] + P[b][0]) / 2, (P[a][1] + P[b][1]) / 2);
      labels.push(`<g class="rt-cut" data-key="cut"><path d="M${r1(mx - 8)} ${r1(my - 8)}l16 16M${r1(mx + 8)} ${r1(my - 8)}l-16 16"/></g>`, pill(mx, my - 22, A ? "jalan ditutup" : "sambungan terputus", { small: true, tone: "bad" }));
    }
  }
  // DNS: a side trip, drawn dashed, never part of the way to the website
  if (vis.has("DNS")) lines.push(edge(F, [[...toFloor(...P.L), Z] as Vec3, [...toFloor(...P.DNS), Z] as Vec3], { part: "dns", dashed: true, faded: !sim.packets.some((p) => p.kind.startsWith("dns") && p.doneAt === null) }, v));

  // packets
  for (const p of sim.packets) {
    if (p.doneAt !== null && p.state !== "lost" && p.stopAt === null) continue;
    const at = packetAt(p, sim.t, v.reduced);
    const isFocus = p === focus;
    if (p.state === "lost") {
      toks.push(token(F, at, "fail"));
      const [x, y] = F.p(at[0], at[1], 0.6);
      labels.push(pill(x + 70, y - 14, A ? "kiriman gagal" : `paket gagal: ${p.note ?? ""}`, { small: true, tone: "bad" }));
      continue;
    }
    const kind = p.kind === "reply" || p.kind === "dns-a" || p.kind === "probe-reply" ? "response" : p.kind === "probe" ? "referral" : "request";
    if (isFocus) {
      const [x, y] = F.p(at[0], at[1], 0.2);
      toks.push(`<circle class="rt-focus" cx="${r1(x)}" cy="${r1(y)}" r="13"/>`);
    }
    toks.push(token(F, at, kind));
  }

  // nodes, back to front by screen depth
  const order = (Object.keys(P) as NodeId[]).filter((n) => vis.has(n)).sort((a, b) => P[a][1] - P[b][1]);
  const ringed = new Set<NodeId>();
  if (scene === 9 && sim.focusHop) ringed.add(HOP_NODE[sim.focusHop]);
  if (focus && focus.state === "deciding") ringed.add(focus.trail[focus.trail.length - 1]);
  const dimFor = (n: NodeId) => (scene === 0 && n === "GS") || (scene === 6 && sim.dest === "facebook" && (n === "GS" || n === "G" || n === "X1")) || (scene === 6 && sim.dest === "google" && (n === "F" || n === "FS"));
  const nodes = order.map((n) => node(n, sim, v, scene, dimFor(n), ringed.has(n)));

  // the focused packet's card: where it comes from, where it goes, how many hops so far
  if (focus && scene >= 2 && scene !== 9 && (focus.kind === "req" || focus.kind === "probe")) {
    const at = packetAt(focus, sim.t, v.reduced);
    const [x, y] = F.p(at[0], at[1], 0.6);
    const dest = focus.dest === "google" ? (A ? "Penerima Google" : "Layanan Google") : A ? "Penerima Facebook" : "Layanan Facebook";
    const text = focus.kind === "probe" ? `Pemeriksaan · batas ${focus.ttl} langkah` : `${A ? "Dari" : "Asal"}: ${A ? "Andi" : "perangkat Andi"} → ${dest}`;
    labels.push(pill(x, y - 30, text, { small: true, tone: focus.kind === "probe" ? "info" : "plain", part: "packet" }, v));
  }
  const reqHops = focus && focus.kind === "req" ? focus.hops : null;
  const [hx, hy] = S(-0.6, 5.2);
  if (scene >= 2 && scene <= 7 && reqHops !== null) labels.push(pill(hx + 60, hy, `Hop: ${reqHops}`, { tone: "info", part: "packet" }, v));

  // the ISP router's route table, while it decides (and in the steps about choices)
  const deciding = focus && focus.state === "deciding" && focus.trail[focus.trail.length - 1] === "I";
  if (vis.has("I") && (deciding || scene === 3 || scene === 6 || scene === 7)) {
    // in the free corner above the laptop, left of DNS
    const w = 268;
    const [px, ty] = S(9.6, -0.9);
    const tx = px - w / 2;
    const rowG = `${A ? "Wilayah Google" : "Jaringan Google"} → ${sim.ispTable.google === "X1" ? (A ? "Pusat sortir A" : "Router A") : A ? "Pusat sortir B" : "Router B"}${sim.ispTable.google === "X2" ? " (diperbarui)" : ""}`;
    const rowF = `${A ? "Wilayah Facebook" : "Jaringan Facebook"} → ${A ? "Pusat sortir B" : "Router B"}`;
    const on = focus && (deciding || scene === 3 || scene === 6) ? focus.dest : null;
    const body = `<rect class="sys-pill-drop" x="2" y="3" width="${w}" height="76" rx="9"/><rect class="sys-card-bg" width="${w}" height="76" rx="9"/><text class="sys-card-text strong" x="12" y="19">${A ? "Petunjuk pengiriman" : "Tabel rute"} · disederhanakan</text><g class="rt-row${on === "google" ? " on" : ""}"><rect x="8" y="27" width="${w - 16}" height="20" rx="5"/><text class="sys-card-text" x="14" y="41">${esc(rowG)}</text></g><g class="rt-row${on === "facebook" ? " on" : ""}"><rect x="8" y="50" width="${w - 16}" height="20" rx="5"/><text class="sys-card-text" x="14" y="64">${esc(rowF)}</text></g>`;
    labels.push(`<g class="sys-pill sys-card" data-key="route-table"${partAttrs("table", v)} transform="translate(${r1(tx - w / 2)} ${r1(ty)})">${body}</g>`);
    if (sim.routeUpdateAt !== null) labels.push(pill(tx, ty - 14, A ? "Memperbarui petunjuk…" : "Memperbarui rute…", { small: true, tone: "warn", part: "table" }, v));
  }

  // DNS answer and the HTTPS exchange
  const [lx, ly] = S(P.L[0] + 0.6, P.L[1] + 1.6);
  if (scene >= 1 && sim.known[sim.dest]) labels.push(pill(lx, ly + 54, A ? "Alamat penerima ditemukan" : "Alamat tujuan tersedia", { small: true, tone: "ok", part: "dns" }, v));
  if (sim.screen !== "empty") labels.push(pill(lx, ly + 78, sim.screen === "shown" ? "Layar: halaman tampil ✓" : "Layar: memuat…", { small: true, tone: sim.screen === "shown" ? "ok" : "warn", part: "laptop" }, v));
  if (sim.https && (scene === 5 || scene === 11)) {
    const [gx, gy] = S(P.GS[0], P.GS[1], 2.6);
    labels.push(pill(gx - 150, gy - 6, `HTTPS: ${sim.https.phase}`, { small: true, tone: "info", part: "google" }, v));
  }
  if (sim.packets.some((p) => p.kind === "reply" && p.doneAt === null)) {
    const [bx, by] = S(P.X2[0] + 2.6, P.X2[1] - 2.4);
    labels.push(pill(bx + 30, by, A ? "Kiriman pulang bisa lewat jalan lain" : "Jalur pulang dapat berbeda", { small: true, tone: "info", part: "transit" }, v));
  }

  // terminal (steps 9–11)
  const term: string[] = [];
  let termBottom = 0;
  if (scene >= 8 && scene <= 10) {
    const w = 386;
    const [px, y0] = S(PANEL_U, 3);
    const x0 = px - w;
    const rows: { text: string; hop?: number }[] =
      scene === 8
        ? [{ text: "C:\\> tracert google.com" }, { text: "" }, { text: "(ketik perintah ini di komputermu sendiri)" }]
        : scene === 9
          ? [
              { text: "Tracing route to contoh.test [203.0.113.10]" },
              { text: "over a maximum of 30 hops:" },
              { text: "  1     1 ms     2 ms     1 ms    192.168.1.1", hop: 1 },
              { text: "  2     5 ms     6 ms     5 ms    10.20.0.1", hop: 2 },
              { text: "  3    12 ms    11 ms    13 ms    198.51.100.1", hop: 3 },
              { text: "  4      *        *        *     Request timed out.", hop: 4 },
              { text: "  5    25 ms    24 ms    26 ms    203.0.113.10", hop: 5 },
              { text: "Trace complete." },
            ]
          : [{ text: "Hasil pemeriksaan (simulasi):" }, ...sim.probes.map((pr) => ({ text: `  ${pr.ttl}    ${pr.ok ? (pr.node === "GS" ? "tujuan menjawab" : `${NAMES[pr.node!][0]} membalas`) : "*   tidak ada balasan"}` }))];
    const h = 30 + rows.length * 17 + 22;
    let body = `<rect class="rt-term-bg" width="${w}" height="${h}" rx="9"/><text class="rt-term-title" x="12" y="17">${scene === 9 ? "Contoh ilustrasi — bukan hasil jaringan Anda" : scene === 10 ? "Paket pemeriksaan dengan batas langkah" : "Command Prompt (ilustrasi)"}</text>`;
    rows.forEach((row, i) => {
      const y = 36 + i * 17;
      const on = row.hop && sim.focusHop === row.hop;
      body += row.hop
        ? `<g class="rt-term-row${on ? " on" : ""}" data-action="hop:${row.hop}" role="button" tabindex="0" aria-label="Sorot hop ${row.hop}"><rect x="6" y="${y - 12}" width="${w - 12}" height="16" rx="3"/><text class="rt-term-text" x="12" y="${y}">${esc(row.text)}</text></g>`
        : `<text class="rt-term-text" x="12" y="${y}">${esc(row.text)}</text>`;
    });
    if (scene === 9) body += `<text class="rt-term-hint" x="12" y="${h - 8}">Klik baris 1–5 untuk menyorot titiknya di peta.</text>`;
    termBottom = y0 + h;
    term.push(`<g class="sys-pill sys-card rt-term" data-key="terminal"${partAttrs("terminal", v)} transform="translate(${r1(x0)} ${r1(y0)})">${body}</g>`);
  }

  // controls inside the figure
  const controls: string[] = [];
  const btn = (key: string, action: string, x: number, y: number, label: string, primary = false) => {
    const w = pillWidth(label) + 10;
    return `<g class="sys-pill fig-button${primary ? " primary" : ""}" data-key="${key}" data-action="${action}" role="button" tabindex="0" aria-label="${esc(label)}" transform="translate(${r1(x - w / 2)} ${r1(y - 13)})"><rect class="sys-pill-drop" x="1.5" y="2.5" width="${r1(w)}" height="26" rx="13"/><rect class="fig-button-bg" width="${r1(w)}" height="26" rx="13"/><text x="${r1(w / 2)}" y="17.5">${esc(label)}</text></g>`;
  };
  // controls live in the left panel, right-aligned with it, never over a node
  const [pr] = S(PANEL_U, 0);
  const right = (label: string, gap = 0) => pr - gap - (pillWidth(label) + 10) / 2;
  // below the home area: a row of buttons, left-aligned with it
  const [rowX, rowY] = S(-1, 16.7);
  const row = (items: [string, string, string, boolean][]) => {
    let x = rowX;
    for (const [key, action, label, primary] of items) {
      const w = pillWidth(label) + 10;
      controls.push(btn(key, action, x + w / 2, rowY, label, primary));
      x += w + 10;
    }
  };
  if (scene === 0) row([["b-open", "open:google", "▶ Buka Google", true]]);
  if (scene === 6) row([["b-g", "open:google", "Google", sim.dest === "google"], ["b-f", "open:facebook", "Facebook", sim.dest === "facebook"]]);
  if (scene === 7) row([["b-cut", "cut", "Simulasikan jalur terputus", true], ["b-send", "send", "Kirim paket baru", false]]);
  if (scene === 10) controls.push(btn("b-probe", "probe", right("Langkah berikutnya"), termBottom + 26, "Langkah berikutnya", true));
  const [nx, ny] = S(21, -1.9);
  labels.push(pill(nx, ny, A ? "Peta ilustrasi, bukan jalur pengiriman nyata." : "Jalur ilustrasi, bukan hasil pelacakan jaringan nyata.", { small: true }));

  return out.join("") + lines.join("") + nodes.join("") + toks.join("") + labels.join("") + term.join("") + controls.join("");
}

const SPEC: SystemSpec<RouteSim> = {
  frame: F,
  floor: floor(F, [-18, -25, 41, 34]),
  render,
  cameraPad: [16, 14],
  onAction: (action, runtime) => {
    if (action.startsWith("open:")) runtime.act((s: RouteSim) => open(s, action.slice(5) as Dest));
    else if (action === "cut") runtime.act((s: RouteSim) => cut(s));
    else if (action === "send") runtime.act((s: RouteSim) => send(s, "google"));
    else if (action === "probe") runtime.act((s: RouteSim) => (s.nextTtl <= 6 ? probe(s) : null));
    else if (action.startsWith("hop:")) runtime.act((s: RouteSim) => (s.focusHop = Number(action.slice(4))));
  },
  analogyLabel: "Analogi pengiriman: Andi mengirim kiriman kecil berlabel alamat; kiriman dibawa dari pusat sortir ke pusat sortir, setiap petugas memilih tempat berikutnya dari petunjuk pengiriman, dan penerima mengirim kiriman jawaban.",
  label: "Cara kerja jaringan: laptop Andi mengirim paket ke alamat IP tujuan; router rumah, router ISP, router perantara, dan router jaringan tujuan masing-masing memilih langkah berikutnya dari tabel rute sampai paket tiba di layanan, lalu balasan kembali.",
};

export default function RouteSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
