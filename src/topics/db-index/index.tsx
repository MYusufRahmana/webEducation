import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { addRow, advance, buildIndex, indexReady, search, TARGET, type IdxLog, type IdxSim } from "./model";
import { IDX_STEPS } from "./scenarios";
import { IDX_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  indeks: { term: same("Indeks"), definition: same("Struktur tambahan di database yang menyimpan nilai sebuah kolom secara terurut beserta penunjuk ke baris aslinya. Bukan cache hasil pencarian, dan tidak mengurutkan ulang tabel.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  andi: { name: same("Andi"), role: same("Pembeli yang mencari pesanannya lewat website.") },
  query: { name: same("Query pencarian"), role: same("Permintaan ke database: cari baris dengan kode_pesanan = TKT-104. Kartu penghitung di bawahnya mencatat pekerjaannya.") },
  table: { name: same("Tabel pesanan"), role: same("Tempat semua baris pesanan disimpan. Urutannya tidak berubah saat indeks dibuat.") },
  column: { name: same("Kolom kode_pesanan"), role: same("Kolom yang diindeks: nilainya disalin ke indeks dalam keadaan terurut.") },
  rows: { name: same("Baris data"), role: same("Satu pesanan: kode dan nama pembeli. Tanpa indeks, baris diperiksa satu per satu.") },
  index: { name: same("Indeks kode_pesanan"), role: same("Kode terurut beserta penunjuk ke baris. Database menelusurinya, lalu mengambil baris yang cocok.") },
  pointer: { name: same("Penunjuk"), role: same("Catatan di indeks tentang letak baris aslinya di tabel, ditulis “→ baris n”.") },
  pile: { name: same("Catatan lain"), role: same("Gambaran 992 catatan tambahan di belakang delapan kartu, untuk membayangkan tabel yang lebih besar.") },
  compare: { name: same("Perbandingan"), role: same("Hasil setiap pencarian: kartu diperiksa, langkah indeks, kartu diambil, dan hasilnya. Simulasi konsep, bukan benchmark.") },
  sql: { name: same("Latihan SQL"), role: same("Perintah PostgreSQL untuk dicoba di database latihanmu sendiri.") },
};

const VIEW_PARTS: ViewParts = {
  table: { analogy: "Lemari berkas", system: "Tabel pesanan", role: PARTS.table.role.id },
  rows: { analogy: "Satu berkas", system: "Satu baris data", role: PARTS.rows.role.id },
  column: { analogy: "Nomor pesanan", system: "Kolom kode_pesanan", role: PARTS.column.role.id },
  index: { analogy: "Katalog penunjuk", system: "Indeks", role: PARTS.index.role.id },
  query: { analogy: "Permintaan Andi", system: "Query pencarian", role: PARTS.query.role.id },
};

function stateTitle(sim: IdxSim) {
  if (sim.building.length) return "Membuat indeks: membaca kode dari setiap baris";
  const s = sim.search;
  if (s && s.finishedAt === null) return s.mode === "scan" ? `Memeriksa baris satu per satu · ${s.rowsChecked} diperiksa` : s.fetched ? "Mengambil kartu data lewat penunjuk" : `Penelusuran indeks · langkah ${s.indexSteps}`;
  if (s) return s.found.length ? `Ditemukan: ${sim.rows.find((r) => r.id === s.found[0])!.name} (${s.code})` : `${s.code} tidak ditemukan`;
  if (sim.pendingEntry) return "Baris baru masuk; indeks akan diperbarui";
  return indexReady(sim) ? "Indeks kode_pesanan siap" : "Belum ada indeks";
}

const readout = (sim: IdxSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · simulasi konsep, bukan benchmark`;

function Details({ runtime }: DetailsProps<IdxSim>) {
  return (
    <div className="explore">
      <div className="control">
        <span className="control-label">Cari</span>
        {["TKT-104", "TKT-107", "TKT-110"].map((code) => (
          <button key={code} type="button" className="button" onClick={() => runtime.act((s: IdxSim) => search(s, code, s.index ? "index" : "scan"))}>
            {code}
          </button>
        ))}
      </div>
      <div className="control">
        <span className="control-label">Data</span>
        <button type="button" className="button" onClick={() => runtime.act((s: IdxSim) => buildIndex(s))}>
          Buat indeks
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: IdxSim) => addRow(s, `TKT-${109 + Math.max(0, s.rows.length - 8)}`, "Pembeli baru"))}>
          Tambah pesanan
        </button>
      </div>
      <p className="muted small">Semua tombol berjalan di demo lokal, bukan di database PostgreSQL sungguhan.</p>
    </div>
  );
}

export const dbIndex: TopicModule<IdxSim> = {
  slug: "database-index",
  fig: "Fig 11",
  aspect: 640 / 420,
  meta: {
    category: same("Data dan Penyimpanan"),
    title: same("Bagaimana Database Menemukan Pesananmu?"),
    summary: same("Andi mencari pesanan TKT-104 di antara banyak pesanan. Lihat beda mencari satu per satu dan mencari lewat indeks, lalu coba membuat indeks sendiri di PostgreSQL."),
    level: same("Dasar"),
    minutes: 12,
    outcomes: { id: IDX_LESSON.outcomes, en: IDX_LESSON.outcomes },
  },
  stepContent: IDX_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: IDX_LESSON.summary, en: IDX_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: IDX_LESSON.simplifications, en: IDX_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["andi", "query", "table", "column", "rows", "index", "pointer", "pile", "compare", "sql"],
  legend: [],
  dualView: true,
  analogyViewLabel: "Analogi berkas",
  systemViewLabel: "Cara kerja database",
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "kartu sedang diperiksa" },
    { swatch: "referral", text: "penelusuran indeks" },
    { swatch: "response", text: "kartu data diambil / cocok" },
  ],
  steps: IDX_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  practiceAction: (action, runtime) => {
    if (action === "search-scan") runtime.act((s: IdxSim) => search(s, TARGET, "scan"));
    else if (action === "build") runtime.act((s: IdxSim) => buildIndex(s));
    else if (action === "search-index") runtime.act((s: IdxSim) => (s.index ? search(s, TARGET, "index") : (buildIndex(s), null)));
  },
  announce: (raw) => {
    const e = raw as IdxLog;
    if (e.kind === "result") return same(e.found ? `Ditemukan ${e.found}. ${e.mode === "scan" ? `${e.rowsChecked} kartu diperiksa.` : `${e.indexSteps} langkah indeks, ${e.fetched} kartu diambil.`}` : `${e.code} tidak ditemukan.`);
    if (e.kind === "index-ready") return same(`Indeks siap dengan ${e.entries} penunjuk.`);
    if (e.kind === "row-added") return same(`Pesanan ${e.code} ditambahkan ke tabel.`);
    if (e.kind === "indexed") return null;
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}database-index-${theme}.png`,
  lesson: IDX_LESSON,
  metrics: (sim): Metric[] => [
    { label: "Kartu data diperiksa", value: String(sim.search?.rowsChecked ?? 0) },
    { label: "Langkah indeks", value: sim.index ? String(sim.search?.indexSteps ?? 0) : null },
    { label: "Kartu data diambil", value: sim.index ? String(sim.search?.fetched ?? 0) : null },
    { label: "Indeks", value: sim.index ? (sim.building.length ? "dibuat…" : `${sim.index.length} penunjuk`) : "belum ada" },
  ],
  docTitle: same("Database Index · Alur"),
  shortName: "Database Index",
  scrollHint: same(""),
};
