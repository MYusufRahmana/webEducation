import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, DOMAIN, goBack, presentCertificate, SAMPLE_FORM, send, tamper, type HttpsLog, type HttpsSim } from "./model";
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
  browser: { name: same("Browser"), role: same("Menampilkan halaman tiket dan kolom alamat, memeriksa sertifikat, lalu mengirim data pemesanan.") },
  address: { name: same("Kolom alamat"), role: same("Menunjukkan http:// atau https:// dan indikator koneksi. Ikon dan katanya berbeda di tiap browser.") },
  path: { name: same("Jalur jaringan"), role: same("Jalan yang dilalui data antara browser dan server; banyak pihak bisa berada di sepanjang jalur ini.") },
  server: { name: same("Server website"), role: same("Server tiket.example: mengirim halaman, menerima pesanan, dan (setelah HTTPS aktif) membuka data terenkripsi.") },
  observer: { name: same("Pengamat jaringan"), role: same("Pihak di jalur yang bisa melihat data yang lewat. Pada HTTPS ia tetap tahu ada komunikasi, tetapi tidak bisa membaca isinya.") },
  owner: { name: same("Pengelola website"), role: same("Memasang sertifikat dan mengaktifkan HTTPS di server. Pengguna tidak bisa menyalakannya dari browser.") },
  certificate: { name: same("Sertifikat"), role: same("Bukti identitas server untuk sebuah domain. Tidak membuktikan pemilik website jujur.") },
  check: { name: same("Pemeriksaan sertifikat"), role: same("Browser mencocokkan sertifikat dengan domain tujuan. Hasilnya berhasil, atau peringatan “belum dapat dipercaya”.") },
  message: { name: same("Data pemesanan"), role: same("Data contoh yang dikirim: terbuka pada HTTP, terenkripsi di perjalanan pada HTTPS.") },
  trust: { name: same("Batas jaminan HTTPS"), role: same("HTTPS menjamin koneksi; domain, kejujuran penjual, dan pembayaran tetap perlu dinilai sendiri.") },
};

const VIEW_PARTS: ViewParts = {
  browser: { analogy: "Kamu (pengirim)", system: "Browser", role: PARTS.browser.role.id },
  address: { analogy: "Alamat di amplop", system: "Kolom alamat", role: PARTS.address.role.id },
  path: { analogy: "Perjalanan surat", system: "Jalur jaringan", role: PARTS.path.role.id },
  server: { analogy: "Penerima (toko tiket)", system: "Server website", role: PARTS.server.role.id },
  observer: { analogy: "Orang di perjalanan", system: "Pengamat jaringan", role: PARTS.observer.role.id },
  owner: { analogy: "Pemilik toko", system: "Pengelola website", role: PARTS.owner.role.id },
  certificate: { analogy: "Kartu identitas penerima", system: "Sertifikat untuk domain", role: PARTS.certificate.role.id },
  message: { analogy: "Kartu pos / amplop tersegel", system: "Data HTTP / data terenkripsi TLS", role: PARTS.message.role.id },
};

function stateTitle(sim: HttpsSim) {
  if (sim.warning) return "Peringatan: koneksi belum dapat dipercaya";
  const moving = sim.msgs.find((m) => m.result === "pending");
  if (moving?.kind === "install") return "Pengelola mengaktifkan HTTPS di server";
  if (moving?.kind === "certificate") return "Server menunjukkan sertifikat";
  if (moving?.kind === "setup") return "Handshake: menyiapkan koneksi terlindungi";
  if (moving && moving.tampered) return "Data diubah di perjalanan";
  if (moving?.kind === "data") return moving.encrypted ? "Data pemesanan terenkripsi di perjalanan" : "Data pemesanan terbuka di perjalanan";
  if (moving?.kind === "page") return "Halaman pemesanan dimuat lewat HTTP";
  if (moving?.kind === "reply") return "Server menjawab pesanan";
  if (sim.received && !sim.received.ok) return "Pemeriksaan gagal — data ditolak";
  if (sim.conn === "secure") return "Koneksi terlindungi (HTTPS)";
  return sim.https ? "HTTPS aktif di server · buka versi https://" : "Koneksi HTTP: Tidak aman";
}

const readout = (sim: HttpsSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · simulasi pendidikan, waktu diperlambat`;

function Details({ sim, runtime, mode }: DetailsProps<HttpsSim>) {
  const travelling = sim.msgs.some((m) => m.kind === "data" && m.result === "pending" && !m.tampered);
  return mode === "explore" ? (
    <div className="explore">
      <div className="control">
        <span className="control-label">Browser</span>
        <button type="button" className="button" disabled={sim.warning} onClick={() => runtime.act((s: HttpsSim) => send(s, SAMPLE_FORM))}>
          Kirim data contoh
        </button>
        <button type="button" className="button" disabled={!sim.warning} onClick={() => runtime.act((s: HttpsSim) => goBack(s))}>
          Kembali ke halaman aman
        </button>
      </div>
      <div className="control">
        <span className="control-label">Server</span>
        <button type="button" className="button" disabled={!sim.https || sim.conn === "setup"} onClick={() => runtime.act((s: HttpsSim) => ((s.certDomain = DOMAIN), (s.conn = "plain"), presentCertificate(s)))}>
          Periksa sertifikat yang benar
        </button>
        <button type="button" className="button" disabled={!sim.https} onClick={() => runtime.act((s: HttpsSim) => ((s.certDomain = "tiket-lain.example"), (s.conn = "plain"), presentCertificate(s)))}>
          Sertifikat tidak cocok
        </button>
      </div>
      <div className="control">
        <span className="control-label">Pengamat</span>
        <button type="button" className="button" disabled={!travelling} onClick={() => runtime.act((s: HttpsSim) => tamper(s))}>
          Ubah pesan di perjalanan
        </button>
      </div>
      <p className="muted small">Gunakan data contoh saja. Jangan memasukkan password atau data pribadi asli; simulasi ini tidak mengenkripsi apa pun.</p>
    </div>
  ) : (
    <p className="muted small">Mulai eksplorasi bebas untuk mengirim data contoh, mencoba sertifikat yang tidak cocok, atau mengubah pesan di perjalanan.</p>
  );
}

export const https: TopicModule<HttpsSim> = {
  slug: "https",
  fig: "Fig 5",
  aspect: 640 / 420,
  meta: {
    category: same("Keamanan"),
    title: same("Mengapa Website Transaksi Membutuhkan HTTPS?"),
    summary: same("Kamu akan membeli tiket konser dan browser menulis “Tidak aman”. Lihat apa artinya, bagaimana pemilik website mengaktifkan HTTPS, dan apa yang tidak dijamin ikon kunci."),
    level: same("Dasar"),
    minutes: 9,
    outcomes: { id: HTTPS_LESSON.outcomes, en: HTTPS_LESSON.outcomes },
  },
  stepContent: HTTPS_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: HTTPS_LESSON.summary, en: HTTPS_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: HTTPS_LESSON.simplifications, en: HTTPS_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["browser", "address", "path", "observer", "server", "owner", "certificate", "check", "message", "trust"],
  legend: [],
  dualView: true,
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "data terbuka" },
    { swatch: "referral", text: "ilustrasi data terenkripsi" },
    { swatch: "response", text: "handshake TLS" },
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
    if (entry.kind === "installed") return same("HTTPS aktif di server.");
    if (entry.kind === "certificate") return same(entry.valid ? `Sertifikat valid untuk ${entry.domain}.` : "Sertifikat tidak cocok dengan domain tujuan.");
    if (entry.kind === "warning") return same("Browser menampilkan peringatan: koneksi belum dapat dipercaya.");
    if (entry.kind === "back") return same("Pengguna kembali ke halaman aman.");
    if (entry.kind === "secure") return same("Koneksi terlindungi.");
    if (entry.kind === "rejected") return same("Pemeriksaan gagal, data ditolak.");
    if (entry.kind === "accepted") return same(entry.by === "server" ? "Server menerima data pemesanan." : `Browser menerima: ${entry.text}.`);
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
    { label: "Koneksi", value: sim.conn === "secure" ? "HTTPS" : sim.conn === "setup" ? "handshake" : sim.conn === "untrusted" ? "tidak dipercaya" : "HTTP", warn: sim.conn !== "secure" },
    { label: "HTTPS di server", value: sim.https ? "aktif" : "belum" },
    { label: "Terbaca pengamat", value: String(sim.readableOnPath), unit: "pesan", warn: sim.readableOnPath > 0 },
    { label: "Ditolak", value: String(sim.rejected), unit: "pesan", warn: sim.rejected > 0 },
  ],
  docTitle: same("HTTPS · Alur"),
  shortName: "HTTPS",
  scrollHint: same(""),
};
