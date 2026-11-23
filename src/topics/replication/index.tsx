import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, lagTx, order, read, replicaOf, RESULT_TEXT, writerDb, type ReplLog, type ReplSim } from "./model";
import { REPL_STEPS } from "./scenarios";
import { REPL_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  transaksi: { term: same("Transaksi"), definition: same("Sekumpulan perubahan yang dijalankan database sebagai satu kesatuan: semuanya berhasil atau tidak ada yang terjadi. Memeriksa dan mengurangi stok dalam satu transaksi mencegah satu tiket terjual dua kali.") },
  asinkron: { term: same("Replikasi asinkron"), definition: same("Database utama mengonfirmasi perubahan tanpa menunggu replika. Lebih cepat, tetapi replika bisa tertinggal dan transaksi terbaru dapat hilang jika utama gagal sebelum tersalin.") },
  lag: { term: same("Keterlambatan salinan (replication lag)"), definition: same("Selisih antara perubahan terakhir di database utama dan yang sudah diterima replika, dihitung dalam transaksi atau waktu.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  visitors: { name: same("Pengguna website"), role: same("Banyak orang membuka halaman dan menekan Beli hampir bersamaan.") },
  lb: { name: same("Load balancer"), role: same("Membagi permintaan ke server aplikasi A, B, dan C.") },
  apps: { name: same("Server aplikasi A, B, C"), role: same("Menjalankan logika website. Tidak menyimpan stok sendiri; semua menulis ke database yang sedang menerima penulisan.") },
  primary: { name: same("Database utama (primary)"), role: same("Satu-satunya tempat yang menerima penulisan: memeriksa dan mengurangi stok dalam satu transaksi.") },
  replica: { name: same("Database salinan (replica)"), role: same("Menerima salinan perubahan dari utama, bisa tertinggal sebentar, dan bisa melayani pembacaan. Tidak menerima pembelian sebelum dipromosikan.") },
  stream: { name: same("Aliran replikasi"), role: same("Catatan perubahan yang dikirim dari utama ke salinan, satu per transaksi, berurutan.") },
  manager: { name: same("Pengelola failover"), role: same("Mendeteksi kegagalan, mengisolasi utama lama, mempromosikan salinan, lalu mengarahkan aplikasi ke utama baru.") },
  reads: { name: same("Jalur baca"), role: same("Permintaan “Lihat acara” yang boleh dilayani salinan; hasilnya bisa sedikit tertinggal.") },
};

const VIEW_PARTS: ViewParts = {
  visitors: { analogy: "Pengunjung membeli tiket", system: "Pengguna website", role: PARTS.visitors.role.id },
  lb: { analogy: "Petugas pengatur antrean", system: "Load balancer", role: PARTS.lb.role.id },
  apps: { analogy: "Loket A, B, C", system: "Server aplikasi A, B, C", role: PARTS.apps.role.id },
  primary: { analogy: "Buku stok dan pesanan resmi", system: "Database utama", role: PARTS.primary.role.id },
  replica: { analogy: "Buku salinan di kantor lain", system: "Database replika", role: PARTS.replica.role.id },
  stream: { analogy: "Salinan catatan perubahan", system: "Aliran replikasi", role: PARTS.stream.role.id },
  manager: { analogy: "Koordinator operasional", system: "Pengelola failover", role: PARTS.manager.role.id },
  reads: { analogy: "Bertanya sisa tiket", system: "Jalur baca ke replika", role: PARTS.reads.role.id },
};

function stateTitle(sim: ReplSim) {
  const phase = sim.failover.phase;
  if (phase !== "idle" && phase !== "done") return "Pergantian database sedang berlangsung";
  if (Object.values(sim.dbs).some((d) => d.role === "down")) return "Database utama gagal";
  if (Object.values(sim.dbs).some((d) => d.role === "copying")) return "Menyiapkan database salinan";
  if (Object.values(sim.dbs).some((d) => d.role === "syncing")) return "Database lama diselaraskan";
  const lag = lagTx(sim);
  if (lag) return `Salinan tertinggal ${lag} transaksi`;
  const w = writerDb(sim);
  return w ? `Stok ${sim.dbs[w].stock} dari 12 · semua loket menulis ke satu database` : "Belum ada database yang menerima penulisan";
}

const readout = (sim: ReplSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · ${sim.reserved} reservasi · ${sim.soldOut} habis · ${sim.duplicates} ulangan tidak dipotong`;

let nextId = 900;
function Details({ sim, runtime, mode }: DetailsProps<ReplSim>) {
  const last = sim.log.filter((e): e is Extract<ReplLog, { kind: "answer" }> => e.kind === "answer").slice(-1)[0];
  return (
    <>
      {mode === "explore" ? (
        <div className="explore">
          <div className="control">
            <span className="control-label">Pembeli</span>
            <button type="button" className="button" onClick={() => runtime.act((s: ReplSim) => order(s, `P-${++nextId}`, "B"))}>
              Pesan tiket baru
            </button>
            <button type="button" className="button" disabled={!last} onClick={() => runtime.act((s: ReplSim) => last && order(s, last.id, "C"))}>
              Ulangi pesanan {last?.id ?? ""}
            </button>
            <button type="button" className="button" disabled={!replicaOf(sim) && !writerDb(sim)} onClick={() => runtime.act((s: ReplSim) => read(s, "C"))}>
              Lihat acara
            </button>
          </div>
          <p className="muted small">Pengulangan dengan ID yang sama dijawab “sudah tercatat” dan tidak memotong stok lagi.</p>
        </div>
      ) : null}
      <div className="table-wrap">
        <table className="servers">
          <caption>Keadaan kedua database</caption>
          <thead>
            <tr>
              <th scope="col">Database</th>
              <th scope="col">Peran</th>
              <th scope="col" className="num">
                Stok
              </th>
              <th scope="col" className="num">
                Transaksi terakhir
              </th>
            </tr>
          </thead>
          <tbody>
            {(["D1", "D2"] as const).map((db) => (
              <tr key={db}>
                <th scope="row">{db === "D1" ? "Database 1" : "Database 2"}</th>
                <td>{{ absent: "belum ada", copying: "menyalin data awal", replica: "salinan", primary: writerDb(sim) === db ? "utama · menerima penulisan" : "utama", down: "gagal", isolated: "diisolasi", syncing: "menyelaraskan" }[sim.dbs[db].role]}</td>
                <td className="num">{sim.dbs[db].role === "absent" ? "—" : sim.dbs[db].stock}</td>
                <td className="num">{sim.dbs[db].role === "absent" ? "—" : `#${sim.dbs[db].applied}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {last ? <p className="small">Jawaban terakhir untuk {last.id}: {RESULT_TEXT[last.result]}</p> : null}
    </>
  );
}

export const replication: TopicModule<ReplSim> = {
  slug: "replikasi-database",
  fig: "Fig 6",
  aspect: 640 / 420,
  meta: {
    category: same("Data dan Penyimpanan"),
    title: same("Replikasi Database: Tiket Tetap Bisa Dipesan"),
    summary: same("Penjualan tiket konser dibuka. Lihat mengapa semua server mencatat di satu database, bagaimana salinannya dibuat, dan apa yang terjadi saat database utama gagal."),
    level: same("Menengah"),
    minutes: 12,
    outcomes: { id: REPL_LESSON.outcomes, en: REPL_LESSON.outcomes },
  },
  stepContent: REPL_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: REPL_LESSON.summary, en: REPL_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: REPL_LESSON.simplifications, en: REPL_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["visitors", "lb", "apps", "primary", "replica", "stream", "reads", "manager"],
  legend: [],
  dualView: true,
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "pesanan (nomor P-…)" },
    { swatch: "response", text: "berhasil / perubahan tersalin" },
    { swatch: "fail", text: "gagal / habis / coba lagi" },
    { swatch: "dash", text: "jalur baca & pengelola failover" },
  ],
  steps: REPL_STEPS,
  // Half speed: one order takes about 5 s from the load balancer to the database and back, easy to follow.
  pace: 0.5,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as ReplLog;
    if (e.kind === "answer") return same(`${e.id}: ${RESULT_TEXT[e.result]}.`);
    if (e.kind === "role" && e.role === "down") return same("Database utama gagal.");
    if (e.kind === "role" && e.role === "isolated") return same("Utama lama diisolasi dan tidak menerima penulisan.");
    if (e.kind === "role" && e.role === "primary") return same("Database salinan menjadi utama baru.");
    if (e.kind === "role" && e.role === "replica") return same("Database salinan siap.");
    if (e.kind === "applied") return same(`Perubahan #${e.tx} tersalin.`);
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}replikasi-${theme}.png`,
  lesson: REPL_LESSON,
  metrics: (sim): Metric[] => {
    const w = writerDb(sim);
    const r = replicaOf(sim);
    return [
      { label: "Stok di penulis", value: w ? `${sim.dbs[w].stock} / 12` : null },
      { label: "Transaksi utama / salinan", value: r && w ? `#${sim.dbs[w].applied} / #${sim.dbs[r].applied}` : w ? `#${sim.dbs[w].applied} / —` : null },
      { label: "Salinan tertinggal", value: r ? String(lagTx(sim)) : null, unit: "transaksi", warn: lagTx(sim) > 0 },
      { label: "Reservasi berhasil", value: String(sim.reserved), unit: "pesanan" },
    ];
  },
  docTitle: same("Replikasi Database · Alur"),
  shortName: "Replikasi Database",
  scrollHint: same(""),
};
