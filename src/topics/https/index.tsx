import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, send, tamper, type HttpsLog, type HttpsSim } from "./model";
import { HTTPS_STEPS } from "./scenarios";
import { HTTPS_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  http: { term: same("HTTP"), definition: same("Aturan yang dipakai browser dan server untuk meminta dan mengirim halaman serta data. Tanpa TLS, isinya berjalan terbuka di jaringan.") },
  tls: { term: same("TLS"), definition: same("Transport Layer Security: protokol yang melindungi koneksi. HTTPS adalah HTTP yang dilindungi TLS. SSL adalah istilah lama untuk pendahulunya; versi SSL lama tidak lagi aman dipakai.") },
  handshake: { term: same("Handshake"), definition: same("Pertukaran pesan di awal koneksi TLS untuk menyepakati cara perlindungan, memeriksa sertifikat, dan membentuk kunci bersama tanpa mengirim kunci rahasia secara terbuka.") },
  enkripsi: { term: same("Enkripsi"), definition: same("Mengubah data dengan kunci memakai kriptografi sehingga hanya pemegang kunci yang bisa membukanya. Bukan sekadar mengacak huruf atau mengubah bentuk tulisan seperti Base64.") },
  integritas: { term: same("Integritas"), definition: same("Kepastian bahwa data tidak diubah di perjalanan. TLS memeriksanya; data yang diubah gagal diperiksa dan ditolak.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  browser: { name: same("Browser"), role: same("Menulis pesan, memeriksa sertifikat, dan menyiapkan koneksi bersama server.") },
  path: { name: same("Jalur jaringan"), role: same("Jalan yang dilalui data antara browser dan server; banyak pihak bisa berada di sepanjang jalur ini.") },
  server: { name: same("Server"), role: same("Tujuan pesan untuk domain toko-contoh.id; membuka data yang dilindungi dan memeriksa integritasnya.") },
  observer: { name: same("Pengamat jaringan"), role: same("Pihak di jalur yang bisa melihat data yang lewat. Ia tetap tahu ada komunikasi, tetapi tidak bisa membaca isi yang dilindungi TLS.") },
  certificate: { name: same("Sertifikat"), role: same("Bukti identitas server untuk domain tujuan, diperiksa browser sebelum data pribadi dikirim. Tidak membuktikan pemilik website jujur.") },
  message: { name: same("Pesan"), role: same("Data yang dikirim: terbuka pada HTTP, terenkripsi pada HTTPS.") },
  lock: { name: same("Koneksi terlindungi"), role: same("Hasil handshake: kedua ujung punya kunci untuk melindungi data. Kunci rahasia tidak pernah dikirim terbuka.") },
};

const VIEW_PARTS: ViewParts = {
  browser: { analogy: "Pengirim", system: "Browser", role: PARTS.browser.role.id },
  path: { analogy: "Perjalanan surat", system: "Jalur jaringan", role: PARTS.path.role.id },
  server: { analogy: "Penerima", system: "Server", role: PARTS.server.role.id },
  observer: { analogy: "Orang di perjalanan", system: "Pengamat jaringan", role: PARTS.observer.role.id },
  certificate: { analogy: "Kartu identitas penerima", system: "Sertifikat untuk domain", role: PARTS.certificate.role.id },
  message: { analogy: "Kartu pos / amplop", system: "Data HTTP / data terenkripsi TLS", role: PARTS.message.role.id },
  lock: { analogy: "Amplop terkunci dan segel", system: "Koneksi TLS", role: PARTS.lock.role.id },
};

function stateTitle(sim: HttpsSim) {
  const moving = sim.msgs.find((m) => m.result === "pending");
  if (moving?.kind === "certificate") return "Server menunjukkan sertifikat";
  if (moving?.kind === "setup" || sim.conn === "setup") return "Menyiapkan koneksi terlindungi";
  if (moving?.kind === "data") return moving.tampered ? "Data diubah di perjalanan" : moving.encrypted ? "Pesan terenkripsi di perjalanan" : "Pesan terbuka di perjalanan";
  if (sim.received && !sim.received.ok) return "Pemeriksaan gagal — data ditolak";
  if (sim.conn === "secure") return "Koneksi terlindungi";
  return sim.cert.checked ? "Sertifikat valid untuk domain ini" : "Koneksi HTTP tanpa TLS";
}

const readout = (sim: HttpsSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · simulasi pendidikan, waktu diperlambat`;

function Details({ sim, runtime, mode }: DetailsProps<HttpsSim>) {
  const travelling = sim.msgs.some((m) => m.kind === "data" && m.result === "pending" && !m.tampered);
  return mode === "explore" ? (
    <div className="explore">
      <div className="control">
        <span className="control-label">Browser</span>
        <button type="button" className="button" onClick={() => runtime.act((s: HttpsSim) => send(s, "Pesan rahasia"))}>
          Kirim pesan contoh
        </button>
      </div>
      <div className="control">
        <span className="control-label">Pengamat</span>
        <button type="button" className="button" disabled={!travelling} onClick={() => runtime.act((s: HttpsSim) => tamper(s))}>
          Ubah pesan di perjalanan
        </button>
      </div>
      <p className="muted small">Gunakan teks contoh. Jangan memasukkan password atau data pribadi asli; simulasi ini tidak mengenkripsi apa pun.</p>
    </div>
  ) : (
    <p className="muted small">Mulai eksplorasi bebas untuk mengirim pesan contoh atau mencoba mengubahnya di perjalanan.</p>
  );
}

export const https: TopicModule<HttpsSim> = {
  slug: "https",
  fig: "Fig 5",
  aspect: 640 / 420,
  meta: {
    category: same("Keamanan"),
    title: same("HTTPS: Mengapa Data Perlu Dilindungi?"),
    summary: same("Lihat apa yang terjadi pada pesan di perjalanan, dan bagaimana TLS menyembunyikan isinya, memeriksa identitas server, serta mendeteksi perubahan."),
    level: same("Dasar"),
    minutes: 8,
    outcomes: { id: HTTPS_LESSON.outcomes, en: HTTPS_LESSON.outcomes },
  },
  stepContent: HTTPS_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: HTTPS_LESSON.summary, en: HTTPS_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: HTTPS_LESSON.simplifications, en: HTTPS_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["browser", "path", "server", "observer", "certificate", "message", "lock"],
  legend: [],
  dualView: true,
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "pesan terbuka" },
    { swatch: "referral", text: "ilustrasi data terenkripsi" },
    { swatch: "response", text: "pesan persiapan koneksi" },
    { swatch: "retry", text: "sertifikat" },
    { swatch: "fail", text: "data diubah / ditolak" },
  ],
  steps: HTTPS_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const entry = raw as HttpsLog;
    if (entry.kind === "certificate") return same(entry.valid ? `Sertifikat valid untuk ${entry.domain}.` : "Sertifikat tidak cocok dengan domain tujuan.");
    if (entry.kind === "secure") return same("Koneksi terlindungi.");
    if (entry.kind === "rejected") return same("Pemeriksaan gagal, data ditolak.");
    if (entry.kind === "accepted") return same(`Server menerima: ${entry.text}.`);
    if (entry.kind === "seen") return same(entry.readable ? "Pengamat dapat membaca isi pesan." : "Pengamat hanya melihat data terenkripsi.");
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}https-${theme}.png`,
  lesson: HTTPS_LESSON,
  metrics: (sim): Metric[] => [
    { label: "Koneksi", value: sim.conn === "secure" ? "HTTPS" : sim.conn === "setup" ? "disiapkan" : "HTTP" },
    { label: "Terbaca pengamat", value: String(sim.readableOnPath), unit: "pesan", warn: sim.readableOnPath > 0 },
    { label: "Pesan persiapan", value: String(sim.setupMsgs) },
    { label: "Ditolak", value: String(sim.rejected), unit: "pesan", warn: sim.rejected > 0 },
  ],
  docTitle: same("HTTPS · Alur"),
  shortName: "HTTPS",
  scrollHint: same(""),
};
