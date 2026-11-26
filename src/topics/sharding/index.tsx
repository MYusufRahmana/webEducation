import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, busyOf, focusTrip, history, nameOf, order, ordersIn, parityOf, report, storesOf, type ShardLog, type ShardSim } from "./model";
import { SHARD_STEPS } from "./scenarios";
import { SHARD_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  shard: { term: same("Shard"), definition: same("Satu bagian dari data yang dibagi. Setiap shard punya struktur tabel yang sama, tetapi isinya berbeda.") },
  shardkey: { term: same("Shard key"), definition: same("Nilai yang dipakai untuk menentukan di shard mana sebuah data disimpan, misalnya id_pengguna.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  users: { name: same("Pembeli"), role: same("Pengguna dengan ID masing-masing. ID inilah yang menjadi shard key.") },
  app: { name: same("Aplikasi tiket"), role: same("Menerima permintaan, membaca id_pengguna, dan memilih shard dengan aturan pembagian.") },
  rule: { name: same("Aturan pembagian"), role: same("Contoh belajar: id genap → Shard A, id ganjil → Shard B. Bukan aturan produksi.") },
  single: { name: same("Database tunggal"), role: same("Satu tempat untuk semua pesanan, sebelum dibagi.") },
  shardA: { name: same("Shard A"), role: same("Menyimpan pesanan pengguna ber-ID genap.") },
  shardB: { name: same("Shard B"), role: same("Menyimpan pesanan pengguna ber-ID ganjil.") },
  cards: { name: same("Daftar isi"), role: same("Pesanan yang benar-benar tersimpan di tempat itu: kode, nama, dan ID pengguna.") },
  gauges: { name: same("Dua penunjuk"), role: same("Tersimpan = jumlah pesanan. Diproses = permintaan yang sedang dikerjakan (biru) dan menunggu (kuning). Garis tegak = batas dua sekaligus.") },
  report: { name: same("Laporan gabungan"), role: same("Menanyai semua shard, lalu menjumlahkan hasilnya.") },
  stock: { name: same("Layanan stok"), role: same("Satu-satunya tempat yang memutuskan apakah kursi masih tersedia, sehingga kursi tidak terjual dua kali.") },
  sql: { name: same("Latihan MySQL"), role: same("Perintah untuk dicoba di MySQL latihanmu sendiri.") },
};

const VIEW_PARTS: ViewParts = {
  single: { analogy: "Ruang arsip", system: "Database pesanan", role: PARTS.single.role.id },
  shardA: { analogy: "Arsip A · ID genap", system: "Shard A", role: PARTS.shardA.role.id },
  shardB: { analogy: "Arsip B · ID ganjil", system: "Shard B", role: PARTS.shardB.role.id },
  app: { analogy: "Petugas pengarah", system: "Logika pengarah aplikasi", role: PARTS.app.role.id },
  rule: { analogy: "Papan aturan", system: "Aturan pembagian (shard key)", role: PARTS.rule.role.id },
  cards: { analogy: "Berkas pesanan", system: "Baris data pesanan", role: PARTS.cards.role.id },
  stock: { analogy: "Meja stok kursi", system: "Layanan stok", role: PARTS.stock.role.id },
};

function stateTitle(sim: ShardSim) {
  const f = focusTrip(sim);
  if (f && f.doneAt === null) {
    if (f.stage === "deciding") return sim.mode === "single" ? "Aplikasi mengirim ke satu database" : `ID ${f.userId} ${parityOf(f.userId!)} → Shard ${f.store ?? (f.userId! % 2 === 0 ? "A" : "B")}`;
    if (f.stage === "to-stock" || f.stage === "checking") return `Layanan stok memeriksa kursi ${f.seat}`;
    if (f.kind === "part") return "Laporan menanyai semua shard";
    if (f.kind === "read") return `Mencari riwayat ${nameOf(sim, f.userId!)}`;
    if (f.failed) return `Ditolak: ${f.failed}`;
    if (f.kind === "write") return f.stage === "to-user" || f.stage === "to-app-back" ? `Pesanan ${f.code} tersimpan` : `Pesanan ${nameOf(sim, f.userId!)} dikirim`;
  }
  const rep = sim.trips.find((t) => t.kind === "report" && t.doneAt === null);
  if (rep) return "Menggabungkan hasil laporan";
  if (sim.lastReport) return `Laporan: ${sim.lastReport.total} pesanan`;
  const waiting = storesOf(sim.mode).reduce((n, s) => n + sim.stores[s].queue.length, 0);
  if (waiting) return `${waiting} permintaan menunggu`;
  return sim.mode === "single" ? "Semua pesanan di satu database" : "Pesanan dibagi ke Shard A dan B";
}

const readout = (sim: ShardSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · simulasi konsep, bukan benchmark`;

function Details({ runtime }: DetailsProps<ShardSim>) {
  return (
    <div className="explore">
      <div className="control">
        <span className="control-label">Pesan</span>
        {[101, 102, 103, 104].map((id) => (
          <button key={id} type="button" className="button" onClick={() => runtime.act((s: ShardSim) => order(s, id))}>
            ID {id}
          </button>
        ))}
      </div>
      <div className="control">
        <span className="control-label">Cari</span>
        <button type="button" className="button" onClick={() => runtime.act((s: ShardSim) => history(s, 101))}>
          Riwayat Andi
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: ShardSim) => report(s))}>
          Semua pesanan
        </button>
      </div>
      <p className="muted small">Semua tombol berjalan di demo lokal, bukan di database sungguhan.</p>
    </div>
  );
}

export const sharding: TopicModule<ShardSim> = {
  slug: "sharding",
  fig: "Fig 13",
  aspect: 640 / 420,
  meta: {
    category: same("Data dan Penyimpanan"),
    title: same("Pesanan Tiket Semakin Banyak, Di Mana Harus Disimpan?"),
    summary: same("Sharding membagi data ke beberapa bagian agar penyimpanan dan pekerjaan database tidak ditanggung satu server. Ikuti pesanan Andi dan Budi ke lemari yang berbeda, lalu coba sendiri dengan MySQL."),
    level: same("Menengah"),
    minutes: 15,
    outcomes: { id: SHARD_LESSON.outcomes, en: SHARD_LESSON.outcomes },
  },
  stepContent: SHARD_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: SHARD_LESSON.summary, en: SHARD_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: SHARD_LESSON.simplifications, en: SHARD_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["users", "app", "rule", "single", "shardA", "shardB", "cards", "gauges", "report", "stock", "sql"],
  legend: [],
  dualView: true,
  analogyViewLabel: "Analogi arsip",
  systemViewLabel: "Cara kerja database",
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "pesanan / permintaan pergi" },
    { swatch: "response", text: "jawaban kembali" },
    { swatch: "referral", text: "pencarian & laporan" },
    { swatch: "fail", text: "ditolak" },
  ],
  steps: SHARD_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  practiceAction: (action, runtime) => {
    if (action === "insert")
      runtime.act((s: ShardSim) => {
        if (!s.orders.some((o) => o.userId === 101)) order(s, 101);
        s.script.push({ at: s.t + 0.5, kind: "order", user: 102 });
      });
    else if (action === "select") runtime.act((s: ShardSim) => history(s, 101));
    else if (action === "report") runtime.act((s: ShardSim) => report(s));
  },
  announce: (raw) => {
    const e = raw as ShardLog;
    if (e.kind === "decide") return e.parity ? same(`ID ${e.user} ${e.parity}: dikirim ke Shard ${e.store}.`) : null;
    if (e.kind === "stored") return same(`Pesanan ${e.code} tersimpan di ${e.store === "S" ? "database" : `Shard ${e.store}`}.`);
    if (e.kind === "history") return same(`Riwayat pengguna ${e.user} ditemukan di Shard ${e.store}: ${e.codes.length} pesanan.`);
    if (e.kind === "report") return same(`Laporan menanyai ${e.stores} tempat: total ${e.total} pesanan.`);
    if (e.kind === "seat") return same(e.ok ? `Kursi ${e.seat} diberikan.` : `Kursi ${e.seat} sudah terjual; permintaan ditolak.`);
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}sharding-${theme}.png`,
  lesson: SHARD_LESSON,
  metrics: (sim): Metric[] => {
    const stores = storesOf(sim.mode);
    const f = focusTrip(sim);
    const asked = f && f.kind === "part" ? sim.trips.filter((t) => t.parent === f.parent).length : f && f.store ? 1 : null;
    return [
      { label: "Tempat penyimpanan", value: sim.mode === "single" ? "1 database" : "2 shard" },
      { label: "Pesanan tersimpan", value: stores.map((s) => (s === "S" ? String(ordersIn(sim, s).length) : `${s} ${ordersIn(sim, s).length}`)).join(" · ") },
      { label: "Sedang diproses", value: stores.map((s) => (s === "S" ? String(busyOf(sim, s)) : `${s} ${busyOf(sim, s)}`)).join(" · "), warn: stores.some((s) => sim.stores[s].queue.length > 0) },
      { label: "Shard ditanya", value: sim.mode === "single" ? null : asked !== null ? String(asked) : null },
    ];
  },
  docTitle: same("Sharding · Alur"),
  shortName: "Sharding",
  scrollHint: same(""),
};
