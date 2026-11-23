import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, ask, book, clear, isStale, KEYS, lookup, update, type CacheLog, type CacheSim, type Key } from "./model";
import { CACHE_STEPS } from "./scenarios";
import { CACHE_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  miss: { term: same("Cache miss"), definition: same("Data yang diminta tidak ada di cache, atau salinannya sudah kedaluwarsa. Server harus mengambilnya dari database.") },
  hit: { term: same("Cache hit"), definition: same("Data yang diminta ada di cache dan masih berlaku, sehingga server menjawab tanpa membaca database.") },
  invalidasi: { term: same("Invalidasi cache"), definition: same("Menghapus atau menandai salinan di cache sebagai tidak berlaku, biasanya setelah data resmi berubah, agar permintaan berikutnya mengambil data terbaru.") },
  ttl: { term: same("TTL (time to live)"), definition: same("Batas lama sebuah salinan boleh dipakai. Setelah TTL habis, salinan dianggap tidak ada. TTL membatasi umur jawaban lama, tetapi tidak membuat perubahan langsung terlihat.") },
  transaksi: { term: same("Transaksi"), definition: same("Sekumpulan perubahan di database yang berhasil semuanya atau tidak sama sekali. Memeriksa dan mencatat kursi dalam satu transaksi mencegah satu kursi terjual dua kali.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  client: { name: same("Client (pengunjung)"), role: same("Browser pengunjung yang mengirim request: melihat jadwal, denah, atau memesan kursi.") },
  server: { name: same("Server aplikasi"), role: same("Memutuskan alurnya: memeriksa cache, membaca database bila perlu, menyimpan salinan, lalu menjawab.") },
  cache: { name: same("Cache di memori"), role: same("Menyimpan salinan data yang sering dibaca beserta TTL-nya. Bukan gerbang ke database dan bukan penyimpanan permanen.") },
  db: { name: same("Database"), role: same("Sumber data resmi: jadwal acara dan reservasi kursi. Memutuskan pemesanan lewat transaksi.") },
  admin: { name: same("Panitia"), role: same("Mengubah data resmi acara melalui server, misalnya jadwal konser.") },
  lanes: { name: same("Jalur permintaan dan jawaban"), role: same("Setiap hubungan punya dua lajur: lajur permintaan dan lajur jawaban, masing-masing dengan panah arah.") },
};

const VIEW_PARTS: ViewParts = {
  client: { analogy: "Pengunjung bertanya", system: "Client mengirim request", role: PARTS.client.role.id },
  server: { analogy: "Petugas informasi", system: "Server aplikasi", role: PARTS.server.role.id },
  cache: { analogy: "Salinan jadwal di meja petugas", system: "Cache di memori", role: PARTS.cache.role.id },
  db: { analogy: "Arsip resmi acara", system: "Database", role: PARTS.db.role.id },
  admin: { analogy: "Panitia mengganti jadwal", system: "Admin acara", role: PARTS.admin.role.id },
  lanes: { analogy: "Bertanya dan menjawab", system: "Request dan response", role: PARTS.lanes.role.id },
};

function stateTitle(sim: CacheSim) {
  const moving = sim.reqs.filter((r) => r.doneAt === null);
  const r = moving.slice(-1)[0];
  if (r) {
    if (r.lane === "k-s" && r.op === "check") return r.hit ? "Cache hit: salinan dipakai" : "Cache miss: salinan belum ada";
    if (r.op === "store" && r.lane === "s-k") return "Server menyimpan salinan ke cache";
    if (r.op === "delete" && r.lane === "s-k") return "Server menghapus salinan lama";
    if (r.kind === "book" && (r.lane === "s-d" || r.lane === "d-s")) return "Reservasi diputuskan oleh database";
    if (r.kind === "update" && (r.lane === "s-d" || r.lane === "a-s")) return "Panitia mengubah data resmi";
    if (r.lane === "s-d" || r.lane === "d-s") return "Server membaca database";
    if (r.lane === "s-k") return "Server memeriksa cache";
  }
  if (isStale(sim, "info") && lookup(sim, "info")) return "Cache masih menyimpan jadwal lama";
  if (!sim.cacheOn) return "Tanpa cache: setiap pertanyaan membaca database";
  return Object.keys(sim.cache).length ? "Salinan tersedia di cache" : "Cache kosong";
}

const readout = (sim: CacheSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · ${sim.hits} hit · ${sim.misses} miss · ${sim.dbReads} pembacaan database`;

let nextId = 20;
function Details({ sim, runtime, mode }: DetailsProps<CacheSim>) {
  const keys: Key[] = ["info", "seatmap"];
  return (
    <>
      {mode === "explore" ? (
        <div className="explore">
          <div className="control">
            <span className="control-label">Pengunjung</span>
            <button type="button" className="button" onClick={() => runtime.act((s: CacheSim) => ask(s, `P${++nextId}`, "info"))}>
              Tanya jadwal
            </button>
            <button type="button" className="button" onClick={() => runtime.act((s: CacheSim) => ask(s, `P${++nextId}`, "seatmap"))}>
              Lihat denah
            </button>
            <button type="button" className="button" onClick={() => runtime.act((s: CacheSim) => book(s, `P${++nextId}`))}>
              Pesan A12
            </button>
          </div>
          <div className="control">
            <span className="control-label">Panitia</span>
            <button type="button" className="button" onClick={() => runtime.act((s: CacheSim) => update(s, s.db.time === "20.00" ? "21.00" : "20.00", true))}>
              Ubah jadwal + hapus salinan
            </button>
            <button type="button" className="button" onClick={() => runtime.act((s: CacheSim) => update(s, s.db.time === "20.00" ? "21.00" : "20.00", false))}>
              Ubah jadwal saja
            </button>
            <button type="button" className="button" disabled={!sim.cache.info} onClick={() => runtime.act((s: CacheSim) => clear(s, "info"))}>
              Hapus salinan jadwal
            </button>
          </div>
          <p className="muted small">Coba “Ubah jadwal saja”, lalu tanya jadwal: cache masih menjawab jadwal lama sampai salinannya dihapus atau TTL habis.</p>
        </div>
      ) : null}
      <div className="table-wrap">
        <table className="servers">
          <caption>Isi cache</caption>
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Salinan</th>
              <th scope="col" className="num">
                Sisa TTL
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const entry = lookup(sim, key);
              return (
                <tr key={key}>
                  <th scope="row">
                    <code>{KEYS[key]}</code>
                  </th>
                  <td>{entry ? `${entry.value}${isStale(sim, key) ? " (lama)" : ""}` : "—"}</td>
                  <td className="num">{entry ? `${Math.max(0, Math.ceil(entry.expiresAt - sim.t))} dtk` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const cache: TopicModule<CacheSim> = {
  slug: "cache",
  fig: "Fig 7",
  aspect: 640 / 420,
  meta: {
    category: same("Data dan Penyimpanan"),
    title: same("Cache: Jawaban Cepat Saat Tiket Diburu"),
    summary: same("Banyak pengunjung menanyakan jadwal konser yang sama. Lihat bagaimana salinan di memori mengurangi pembacaan database, kapan salinan perlu diperbarui, dan mengapa pembelian kursi tetap diputuskan database."),
    level: same("Dasar"),
    minutes: 10,
    outcomes: { id: CACHE_LESSON.outcomes, en: CACHE_LESSON.outcomes },
  },
  stepContent: CACHE_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: CACHE_LESSON.summary, en: CACHE_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: CACHE_LESSON.simplifications, en: CACHE_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["client", "server", "cache", "db", "admin", "lanes"],
  legend: [],
  dualView: true,
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "permintaan" },
    { swatch: "response", text: "jawaban / cache hit" },
    { swatch: "probe", text: "cache miss" },
    { swatch: "referral", text: "simpan salinan" },
    { swatch: "fail", text: "hapus salinan / ditolak" },
  ],
  steps: CACHE_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as CacheLog;
    if (e.kind === "hit") return same(e.stale ? "Cache hit, tetapi salinannya sudah lama." : "Cache hit: dijawab dari salinan.");
    if (e.kind === "miss") return same("Cache miss: salinan belum ada.");
    if (e.kind === "stored") return same("Salinan disimpan ke cache.");
    if (e.kind === "deleted") return same("Salinan lama dihapus dari cache.");
    if (e.kind === "updated") return same(`Jadwal resmi diubah menjadi ${e.time}.`);
    if (e.kind === "reserved") return same(`Kursi ${e.seat} dicatat untuk ${e.id}.`);
    if (e.kind === "taken") return same(`Kursi ${e.seat} sudah dipesan; ${e.id} ditolak.`);
    if (e.kind === "answer") return same(`${e.id} menerima: ${e.text}.`);
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}cache-${theme}.png`,
  lesson: CACHE_LESSON,
  metrics: (sim): Metric[] => {
    const copy = lookup(sim, "info");
    return [
      { label: "Pembacaan database", value: String(sim.dbReads), unit: "kali" },
      { label: "Cache hit", value: sim.cacheOn ? String(sim.hits) : null },
      { label: "Cache miss", value: sim.cacheOn ? String(sim.misses) : null },
      { label: "Jadwal resmi / salinan", value: `${sim.db.time} / ${copy ? copy.value : "—"}`, warn: Boolean(copy && isStale(sim, "info")) },
    ];
  },
  docTitle: same("Cache · Alur"),
  shortName: "Cache",
  scrollHint: same(""),
};
