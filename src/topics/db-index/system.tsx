import type { FigureStageProps } from "../types";
import { addRow, buildIndex, currentProbe, search, TARGET, type IdxSim, type Mode } from "./model";
import { esc, floor, makeFrame, partAttrs, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * Three areas, left to right: Andi and his search, the index (from step 4), the table. Codes must be easy
 * to read, so cards are drawn flat on an isometric floor. The table never changes order; the index keeps
 * the codes in order and writes each pointer as “→ baris n”. Only the pointer in use is drawn as a line,
 * so lines never pile up over text.
 */
const W = 900;
const H = 470;
const F = makeFrame([[0, 0, 0], [24, 0, 0], [0, 24, 0], [24, 24, 0]], 21);
const [OX, OY] = (() => {
  const [vx, vy, vw, vh] = F.viewBox;
  return [vx + (vw - W) / 2, vy + (vh - H) / 2];
})();
const r1 = (n: number) => Math.round(n * 10) / 10;
const X = (x: number) => r1(OX + x);
const Y = (y: number) => r1(OY + y);

const ANDI = { x: 0, y: 30, w: 210 };
const IDX = { x: 300, y: 20, w: 200, row: 30 };
const TAB = { x: 590, y: 20, w: 310, row: 32 };
const rowY = (slot: number) => TAB.y + 68 + slot * TAB.row;
const entryY = (pos: number) => IDX.y + 68 + pos * IDX.row;

function anchor() {
  return `<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${X(-10)},${Y(-10)} ${X(W + 10)},${Y(-10)} ${X(W + 10)},${Y(H + 10)} ${X(-10)},${Y(H + 10)}"/></g>`;
}

const text = (x: number, y: number, t: string, cls = "sys-card-text") => `<text class="${cls}" x="${r1(x)}" y="${r1(y)}">${esc(t)}</text>`;
function panel(key: string, part: string, x: number, y: number, w: number, h: number, body: string, v: Visual, extra = "") {
  const sel = v.selected === part ? " idx-selected" : "";
  return `<g class="sys-pill sys-card idx-panel${sel}" data-key="${key}"${partAttrs(part, v)}${extra} transform="translate(${X(x)} ${Y(y)})"><rect class="sys-pill-drop" x="2" y="3" width="${w}" height="${h}" rx="10"/><rect class="sys-card-bg" width="${w}" height="${h}" rx="10"/>${body}</g>`;
}
function button(key: string, action: string, x: number, y: number, label: string, pressed = false) {
  const w = Math.max(60, label.length * 7.2 + 26);
  return `<g class="sys-pill fig-button${pressed ? " primary" : ""}" data-key="${key}" data-action="${action}" role="button" tabindex="0" aria-label="${esc(label)}" aria-pressed="${pressed}" transform="translate(${X(x)} ${Y(y)})"><rect class="sys-pill-drop" x="1.5" y="2.5" width="${r1(w)}" height="26" rx="13"/><rect class="fig-button-bg" width="${r1(w)}" height="26" rx="13"/><text x="${r1(w / 2)}" y="17.5">${esc(label)}</text></g>`;
}
/** A bent arrow (polyline); the label sits on its longest straight piece. */
function route(key: string, pts: [number, number][], label: string, kind: "scan") {
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${X(x)} ${Y(y)}`).join("");
  const [x1, y1] = pts[pts.length - 2];
  const [x2, y2] = pts[pts.length - 1];
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const head = `M${X(x2 - ux * 9 - uy * 5)} ${Y(y2 - uy * 9 + ux * 5)}L${X(x2)} ${Y(y2)}L${X(x2 - ux * 9 + uy * 5)} ${Y(y2 - uy * 9 - ux * 5)}`;
  let best = 0;
  for (let i = 1; i < pts.length; i++) if (Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]) > Math.hypot(pts[best + 1][0] - pts[best][0], pts[best + 1][1] - pts[best][1])) best = i - 1;
  const mx = (pts[best][0] + pts[best + 1][0]) / 2;
  const my = (pts[best][1] + pts[best + 1][1]) / 2;
  const w = label.length * 6.2 + 16;
  return `<g class="idx-arrow" data-kind="${kind}" data-key="${key}"><path d="${d}"/><path class="head" d="${head}"/><g transform="translate(${X(mx - w / 2)} ${Y(my - 26)})"><rect width="${r1(w)}" height="18" rx="9"/><text x="${r1(w / 2)}" y="12.5">${esc(label)}</text></g></g>`;
}

/** A straight arrow with a label that sits above the line, never on text. */
function arrow(key: string, x1: number, y1: number, x2: number, y2: number, label: string, kind: "scan" | "index" | "fetch" | "build") {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const head = `M${X(x2 - ux * 9 - uy * 5)} ${Y(y2 - uy * 9 + ux * 5)}L${X(x2)} ${Y(y2)}L${X(x2 - ux * 9 + uy * 5)} ${Y(y2 - uy * 9 - ux * 5)}`;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const w = label.length * 6.2 + 16;
  return `<g class="idx-arrow" data-kind="${kind}" data-key="${key}"><path d="M${X(x1)} ${Y(y1)}L${X(x2)} ${Y(y2)}"/><path class="head" d="${head}"/><g transform="translate(${X(mx - w / 2)} ${Y(my - 26)})"><rect width="${r1(w)}" height="18" rx="9"/><text x="${r1(w / 2)}" y="12.5">${esc(label)}</text></g></g>`;
}

function render(sim: IdxSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const out: string[] = [anchor()];
  const probe = currentProbe(sim);
  const s = sim.search;
  const searching = s && s.finishedAt === null;
  const shownIndex = sim.index;
  const lastIndexed = [...sim.log].reverse().find((e) => e.kind === "indexed") as { kind: "indexed"; rowId: number; pos: number; at: number } | undefined;
  const freshEntry = lastIndexed && sim.t - lastIndexed.at < 1.1 ? lastIndexed : null;

  // ---------------------------------------------------------------- left: Andi and the search
  const query = s ? s.code : TARGET;
  const andiBody =
    `<g class="idx-person" transform="translate(28 34)"><circle cy="-10" r="9"/><path d="M-14 16c0-12 6-17 14-17s14 5 14 17z"/></g>` +
    text(54, 26, A ? "Andi di loket" : "Andi · website", "sys-card-text strong") +
    text(54, 44, A ? "“Tolong carikan pesanan.”" : "Halaman “Pesanan saya”") +
    `<g class="idx-query" transform="translate(12 62)"><rect width="${ANDI.w - 24}" height="40" rx="8"/><text class="idx-query-label" x="12" y="17">${A ? "Cari berkas" : "Cari kode_pesanan"}</text><text class="idx-query-code" x="12" y="33">${esc(query)}</text></g>`;
  out.push(panel("andi", "query", ANDI.x, ANDI.y, ANDI.w, 116, andiBody, v));

  // counters: three kinds of work, counted separately
  const rowsChecked = s ? s.rowsChecked : 0;
  const steps = s ? s.indexSteps : 0;
  const fetched = s ? s.fetched : 0;
  const result = s && s.finishedAt !== null ? (s.found.length ? `${sim.rows.find((r) => r.id === s.found[0])!.name} (${s.code})` : "tidak ditemukan") : searching ? "mencari…" : "—";
  const counters =
    text(14, 22, "Pekerjaan pencarian", "sys-card-text strong") +
    text(14, 44, `${A ? "Berkas dibuka" : "Kartu data diperiksa"}: ${rowsChecked}`) +
    text(14, 64, `${A ? "Langkah di katalog" : "Langkah penelusuran indeks"}: ${steps}`) +
    text(14, 84, `${A ? "Berkas diambil" : "Kartu data diambil"}: ${fetched}`) +
    text(14, 108, `Hasil: ${result}`, `sys-card-text strong${s && s.finishedAt !== null ? (s.found.length ? " ok" : " bad") : ""}`);
  out.push(panel("counters", "query", ANDI.x, ANDI.y + 130, ANDI.w, 122, counters, v));

  // ---------------------------------------------------------------- middle: the index
  if (shownIndex) {
    const n = Math.max(shownIndex.length, 1);
    const h = 78 + n * IDX.row;
    let body = text(14, 22, A ? "Katalog nomor pesanan" : "Indeks · kode_pesanan", "sys-card-text strong") + text(14, 38, A ? "nomor berurutan → letak berkas" : "kode terurut → penunjuk baris", "sys-card-text small");
    shownIndex.forEach((e, pos) => {
      const row = sim.rows.find((r) => r.id === e.rowId)!;
      const isProbe = probe && probe.kind === "entry" && probe.pos === pos && s?.mode === "index";
      const isFetch = probe && probe.kind === "fetch" && probe.rowId === e.rowId;
      const isNew = freshEntry && freshEntry.rowId === e.rowId;
      const state = isProbe ? "probe" : isFetch ? "fetch" : isNew ? "new" : "";
      const y = entryY(pos) - IDX.y - 18;
      body += `<g class="idx-entry" data-state="${state}" transform="translate(10 ${y})"><rect width="${IDX.w - 20}" height="24" rx="6"/><text class="idx-code" x="10" y="16.5">${esc(e.code)}</text><text class="idx-ptr" x="${IDX.w - 30}" y="16.5" text-anchor="end">→ ${A ? "berkas" : "baris"} ${row.slot + 1}</text></g>`;
    });
    if (!shownIndex.length) body += text(14, 66, "membaca kode…", "sys-card-text small");
    out.push(panel("index", "index", IDX.x, IDX.y, IDX.w, h, body, v));
    // what the walk decided at this probe
    if (probe && probe.kind === "entry" && searching) {
      const msg = probe.cmp === "=" ? `${probe.code} cocok` : probe.cmp === "<" ? `${s!.code} < ${probe.code} → lihat ke atas` : `${s!.code} > ${probe.code} → lihat ke bawah`;
      out.push(panel("idx-note", "index", IDX.x, IDX.y + h + 10, IDX.w, 32, text(12, 21, msg, "sys-card-text strong"), v));
    }
  } else if (scene >= 3) {
    out.push(panel("index", "index", IDX.x, IDX.y, IDX.w, 64, text(14, 26, A ? "Katalog belum dibuat" : "Indeks belum dibuat", "sys-card-text strong") + text(14, 46, "CREATE INDEX …", "sys-card-text small"), v));
  }

  // ---------------------------------------------------------------- right: the table, never re-sorted
  const slotsShown = Math.max(8, sim.rows.length);
  const tabH = 76 + slotsShown * TAB.row + (sim.extra ? 56 : 0);
  let tab = text(14, 22, A ? "Lemari berkas pesanan" : "Tabel pesanan", "sys-card-text strong");
  const colSel = v.selected === "column" || v.highlight.has("column");
  tab += `<g class="idx-col${colSel ? " on" : ""}" data-part="column"><rect x="8" y="30" width="${A ? 118 : 128}" height="18" rx="5"/>${text(14, 43, A ? "nomor pesanan" : "kode_pesanan", "sys-card-text small strong")}</g>${text(150, 43, A ? "nama" : "nama_pembeli", "sys-card-text small strong")}`;
  for (const row of [...sim.rows].sort((a, b) => a.slot - b.slot)) {
    const checking = probe && probe.kind === "row" && probe.rowId === row.id && searching;
    const checked = s && s.mode === "scan" && s.probes.slice(0, s.done).some((p) => p.kind === "row" && p.rowId === row.id);
    const fetchedRow = probe && probe.kind === "fetch" && probe.rowId === row.id;
    const match = s && s.found.includes(row.id) && (s.mode === "index" ? fetchedRow || s.finishedAt !== null : true);
    const added = sim.log.some((e) => e.kind === "row-added" && e.rowId === row.id && sim.t - e.at < 2.5);
    const read = freshEntry && freshEntry.rowId === row.id && scene === 3;
    const state = checking ? "checking" : fetchedRow ? "fetched" : match ? "match" : read ? "read" : added ? "new" : checked ? "checked" : "";
    const tag = checking ? (row.code === s!.code ? "✓ cocok" : "diperiksa") : fetchedRow ? (A ? "diambil" : "kartu diambil") : match ? "✓" : read ? "dibaca" : added ? "baru" : checked ? "·" : "";
    const y = rowY(row.slot) - TAB.y - 18;
    tab += `<g class="idx-row" data-state="${state}" data-part="rows" transform="translate(8 ${y})"><rect width="${TAB.w - 16}" height="${TAB.row - 6}" rx="6"/>${A ? `<path class="idx-folder" d="M8 6h10l3 3h9v12H8z"/>` : text(8, 17, `${row.slot + 1}`, "sys-card-text small")}<text class="idx-code" x="40" y="18">${esc(row.code)}</text><text class="sys-card-text" x="142" y="18">${esc(row.name)}</text><text class="idx-tag" x="${TAB.w - 28}" y="18" text-anchor="end">${esc(tag)}</text></g>`;
  }
  if (sim.extra) {
    const y = rowY(slotsShown) - TAB.y - 14;
    const pileOn = probe && probe.kind === "pile";
    tab += `<g class="idx-pile" data-state="${pileOn ? "checking" : ""}" data-part="pile" transform="translate(8 ${y})"><rect x="6" y="6" width="${TAB.w - 22}" height="40" rx="6"/><rect x="3" y="3" width="${TAB.w - 22}" height="40" rx="6"/><rect width="${TAB.w - 22}" height="40" rx="6"/><text class="sys-card-text strong" x="14" y="25">+ ${sim.extra} ${A ? "berkas lain" : "catatan lain"}${pileOn ? " · diperiksa" : ""}</text></g>`;
  }
  out.push(panel("table", "table", TAB.x, TAB.y, TAB.w, tabH, tab, v));

  // ---------------------------------------------------------------- the one path in use
  const qx = ANDI.x + ANDI.w;
  const qy = ANDI.y + 82;
  if (s && s.mode === "scan") {
    const label = A ? "buka satu per satu" : "periksa satu per satu";
    if (!shownIndex) out.push(arrow("path-scan", qx, qy, TAB.x, qy, label, "scan"));
    else {
      // the index stands in between: go round below it, straight into the table's first row
      const below = IDX.y + 78 + shownIndex.length * IDX.row + 18;
      out.push(route("path-scan", [[qx, qy], [qx + 30, qy], [qx + 30, below], [TAB.x - 24, below], [TAB.x - 24, rowY(0)], [TAB.x, rowY(0)]], label, "scan"));
    }
  }
  if (s && s.mode === "index" && shownIndex) {
    out.push(arrow("path-index", qx, qy, IDX.x, qy, A ? "Penelusuran katalog" : "Penelusuran indeks", "index"));
    const f = s.probes.find((p) => p.kind === "fetch");
    const done = probe && (probe.kind === "fetch" || s.finishedAt !== null);
    if (f && f.kind === "fetch" && done) {
      const pos = shownIndex.findIndex((e) => e.rowId === f.rowId);
      const row = sim.rows.find((r) => r.id === f.rowId)!;
      out.push(arrow("path-fetch", IDX.x + IDX.w, entryY(pos), TAB.x, rowY(row.slot), A ? "Berkas diambil" : "Kartu data diambil", "fetch"));
    }
  }
  if (freshEntry && scene !== 4 && sim.index) {
    const row = sim.rows.find((r) => r.id === freshEntry.rowId)!;
    out.push(arrow("path-build", TAB.x, rowY(row.slot), IDX.x + IDX.w, entryY(freshEntry.pos), A ? "nomor dicatat" : "penunjuk dibuat", "build"));
  }

  // ---------------------------------------------------------------- controls inside the figure
  const by = ANDI.y + 270;
  if (scene === 0) out.push(button("btn-search", "search", ANDI.x, by, "Cari pesanan", true));
  if (scene === 5) {
    const codes = ["TKT-104", "TKT-107", "TKT-110"];
    const active = s?.code ?? TARGET;
    codes.forEach((code, i) => out.push(button(`btn-code-${code}`, `code:${code}`, ANDI.x + i * 72, by, code === "TKT-110" ? "TKT-110" : code, code === active)));
    out.push(button("btn-scan", "scan", ANDI.x, by + 34, "Tanpa indeks", s?.mode === "scan"));
    out.push(button("btn-index", "index", ANDI.x + 110, by + 34, "Dengan indeks", s?.mode === "index"));
    const rows = sim.results.slice(-3);
    const body = text(10, 18, "Perbandingan (simulasi konsep)", "sys-card-text strong") + rows.map((r, i) => text(10, 38 + i * 18, `${r.code} · ${r.mode === "scan" ? "tanpa" : "dengan"} indeks: ${r.mode === "scan" ? `${r.rowsChecked} kartu` : `${r.indexSteps} langkah + ${r.fetched} kartu`} → ${r.found ?? "tidak ada"}`, "sys-card-text small")).join("");
    out.push(panel("compare", "compare", IDX.x - 50, H - 62, TAB.x + TAB.w - IDX.x + 50, 28 + Math.max(1, rows.length) * 18, body, v));
  }
  if (scene === 6) out.push(button("btn-add", "add", ANDI.x, by, "Tambah pesanan", true));
  return out.join("");
}

let pickedCode = TARGET;
const SPEC: SystemSpec<IdxSim> = {
  frame: F,
  floor: floor(F, [0, 0, 24, 24]),
  render,
  cameraPad: [20, 16],
  onAction: (action, runtime) => {
    const run = (code: string, mode: Mode) => runtime.act((sim: IdxSim) => search(sim, code, mode));
    if (action === "search") run(TARGET, "scan");
    else if (action.startsWith("code:")) {
      pickedCode = action.slice(5);
      // keep the mode of the last search; only the code changes
      runtime.act((sim: IdxSim) => search(sim, pickedCode, sim.search?.mode ?? "index"));
    } else if (action === "scan") run(pickedCode, "scan");
    else if (action === "index") run(pickedCode, "index");
    else if (action === "add") runtime.act((sim: IdxSim) => addRow(sim, `TKT-${109 + Math.max(0, sim.rows.length - 8)}`, ["Lala", "Tono", "Wati", "Gita"][Math.max(0, sim.rows.length - 8) % 4]));
    else if (action === "build") runtime.act((sim: IdxSim) => buildIndex(sim));
  },
  analogyLabel: "Analogi berkas: Andi meminta petugas mencari berkas TKT-104; tanpa katalog petugas membuka setiap berkas di lemari, dengan katalog nomor ia menelusuri katalog lalu mengambil satu berkas.",
  label: "Cara kerja database: query mencari kode_pesanan TKT-104 di tabel pesanan; tanpa indeks setiap baris diperiksa, dengan indeks database menelusuri kode yang terurut lalu mengikuti penunjuk ke baris yang cocok.",
};


export default function IdxSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
