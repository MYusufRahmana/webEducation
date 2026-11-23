import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, clearCopy, copyLeft, load, validCopy, type CdnLog, type CdnSim } from "./model";
import { CDN_STEPS } from "./scenarios";
import { CDN_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  cdn: { term: same("CDN (Content Delivery Network)"), definition: same("Jaringan server distribusi di banyak lokasi yang menyimpan salinan file website, seperti gambar, supaya bisa dikirim dari tempat yang lebih dekat ke pengunjung.") },
  miss: { term: same("Cache miss"), definition: same("Salinan belum tersedia (atau sudah tidak berlaku), jadi CDN harus mengambilnya dari server asal dulu.") },
  hit: { term: same("Cache hit"), definition: same("Salinan tersedia dan masih berlaku, jadi CDN langsung mengirimkannya tanpa menghubungi server asal.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  andi: { name: same("Laptop Andi"), role: same("Browser Andi di Jakarta. Ia meminta poster lalu menampilkannya. Andi tidak berpindah kota; yang bergerak hanya permintaan dan data.") },
  users: { name: same("Pengunjung lain"), role: same("Budi dan Citra di Jakarta, yang membuka poster yang sama.") },
  origin: { name: same("Server asal (Singapura)"), role: same("Tempat file asli website disimpan. CDN tidak menggantikannya; CDN mengambil dari sini saat belum punya salinan.") },
  cdn: { name: same("CDN Jakarta"), role: same("Server distribusi yang menyimpan salinan poster selama masih berlaku, lalu mengirimkannya ke pengunjung di sekitarnya.") },
  copy: { name: same("Salinan poster"), role: same("Poster yang disimpan CDN. Hanya dipakai selama masih berlaku, bukan selamanya.") },
  routes: { name: same("Jalur perjalanan"), role: same("Amplop = permintaan “Minta poster”. Kartu poster = data gambar yang dikirim kembali. Keduanya punya lajur sendiri.") },
  buy: { name: same("Aplikasi pembelian"), role: same("Memproses ketersediaan kursi dan pembayaran. Permintaan “Beli tiket” selalu diteruskan ke sini, tidak dijawab dari salinan CDN.") },
  compare: { name: same("Perbandingan"), role: same("Jalur, waktu simulasi sampai poster tampil, dan jumlah pengambilan dari server asal untuk setiap cara.") },
};

const VIEW_PARTS: ViewParts = {
  andi: { analogy: "Pelanggan Andi di Jakarta", system: "Browser Andi", role: PARTS.andi.role.id },
  origin: { analogy: "Gudang poster pusat (Singapura)", system: "Server asal", role: PARTS.origin.role.id },
  cdn: { analogy: "Cabang distribusi Jakarta", system: "CDN Jakarta", role: PARTS.cdn.role.id },
  copy: { analogy: "Poster di cabang", system: "Salinan di cache CDN", role: PARTS.copy.role.id },
  routes: { analogy: "Pesanan dan kiriman poster", system: "Permintaan dan data gambar", role: PARTS.routes.role.id },
  buy: { analogy: "Kasir pembelian", system: "Aplikasi pembelian", role: PARTS.buy.role.id },
};

function stateTitle(sim: CdnSim) {
  const trip = sim.trips.find((t) => t.doneAt === null);
  if (trip) {
    if (trip.kind === "buy") return "Beli tiket diteruskan ke aplikasi pembelian";
    if (trip.stage === "to-j") return sim.cdnOn && trip.via === "cdn" ? `${trip.who} meminta poster ke CDN Jakarta` : `${trip.who} meminta poster`;
    if (trip.stage === "j-origin" || trip.stage === "origin-j") return trip.result === "miss" ? "Cache miss: CDN mengambil poster dari server asal" : "Mengambil poster dari server asal di Singapura";
    if (trip.stage === "j-user") return trip.result === "hit" ? "Cache hit: poster dikirim dari CDN Jakarta" : "Poster dikirim ke pengunjung";
  }
  if (!sim.cdnOn) return sim.screens.Andi.state === "empty" ? "Poster belum tampil" : `Pengambilan dari server asal: ${sim.originFetches}`;
  return validCopy(sim) ? "CDN Jakarta punya salinan poster" : "CDN Jakarta belum punya salinan poster";
}

const readout = (sim: CdnSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk (simulasi) · ${sim.originFetches} dari server asal · ${sim.hits} hit · ${sim.misses} miss`;

function Details({ sim, runtime }: DetailsProps<CdnSim>) {
  return (
    <div className="explore">
      <div className="control">
        <span className="control-label">Andi</span>
        <button type="button" className="button" onClick={() => runtime.act((s: CdnSim) => load(s, "Andi"))}>
          Muat poster
        </button>
        <button type="button" className="button" disabled={!sim.cdnOn} onClick={() => runtime.act((s: CdnSim) => load(s, "Andi", "direct"))}>
          Tanpa CDN
        </button>
        <button type="button" className="button" disabled={!sim.cdnOn} onClick={() => runtime.act((s: CdnSim) => load(s, "Andi", "cdn"))}>
          Dengan CDN
        </button>
        <button type="button" className="button" disabled={!sim.copy} onClick={() => runtime.act((s: CdnSim) => clearCopy(s))}>
          Kosongkan salinan CDN
        </button>
      </div>
      <p className="muted small">Salinan CDN: {validCopy(sim) ? `tersedia, berlaku ${Math.ceil(copyLeft(sim))} detik lagi` : "belum tersedia"}.</p>
    </div>
  );
}

export const cdn: TopicModule<CdnSim> = {
  slug: "cdn",
  fig: "Fig 10",
  aspect: 640 / 420,
  meta: {
    category: same("Jaringan"),
    title: same("Mengapa Gambar Bisa Dimuat Lebih Cepat?"),
    summary: same("Andi di Jakarta membuka website tiket konser yang servernya di Singapura. Ikuti perjalanan poster dan lihat bagaimana CDN menyimpan salinan di dekat pengunjung."),
    level: same("Dasar"),
    minutes: 8,
    outcomes: { id: CDN_LESSON.outcomes, en: CDN_LESSON.outcomes },
  },
  stepContent: CDN_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: CDN_LESSON.summary, en: CDN_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: CDN_LESSON.simplifications, en: CDN_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["andi", "users", "origin", "cdn", "copy", "routes", "buy", "compare"],
  legend: [],
  dualView: true,
  systemViewLabel: "Cara kerja website",
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "amplop: Minta poster" },
    { swatch: "response", text: "kartu: Poster konser" },
    { swatch: "dash", text: "Beli tiket (tahap 8)" },
  ],
  steps: CDN_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as CdnLog;
    if (e.kind === "miss") return same("Cache miss: CDN belum punya salinan poster.");
    if (e.kind === "hit") return same("Cache hit: poster dikirim dari CDN Jakarta.");
    if (e.kind === "origin") return same("Server asal di Singapura mengirim poster.");
    if (e.kind === "stored") return same("CDN Jakarta menyimpan salinan poster.");
    if (e.kind === "shown") return same(`Poster tampil di layar ${e.who}.`);
    if (e.kind === "bought") return same("Pesanan diproses aplikasi pembelian.");
    if (e.kind === "cleared") return same("Salinan CDN dikosongkan.");
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}cdn-${theme}.png`,
  lesson: CDN_LESSON,
  metrics: (sim): Metric[] => [
    { label: "Dari server asal", value: String(sim.originFetches), unit: "kali" },
    { label: "Salinan CDN", value: sim.cdnOn ? (validCopy(sim) ? "tersedia" : "belum ada") : null, warn: sim.cdnOn && !validCopy(sim) },
    { label: "Cache hit / miss", value: sim.cdnOn ? `${sim.hits} / ${sim.misses}` : null },
    { label: "Waktu poster tampil", value: sim.screens.Andi.took !== null ? formatNumber("id", sim.screens.Andi.took, 1) : null, unit: "dtk (simulasi)" },
  ],
  docTitle: same("CDN · Alur"),
  shortName: "CDN",
  scrollHint: same(""),
};
