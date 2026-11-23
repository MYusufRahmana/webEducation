import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, check, secondsLeft, type RateLog, type RateSim } from "./model";
import { RATE_STEPS } from "./scenarios";
import { RATE_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  request: { term: same("Permintaan (request)"), definition: same("Pesan dari browser ke server, misalnya “tolong kirim daftar kursi”. Satu klik pada tombol biasanya mengirim satu permintaan.") },
  "429": { term: same("429 Too Many Requests"), definition: same("Kode jawaban yang berarti “terlalu banyak permintaan”. Website memintamu menunggu sebentar, lalu mencoba lagi.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  users: { name: same("Andi dan Budi (pengguna)"), role: same("Menekan tombol “Cek kursi”. Setiap tekanan mengirim satu permintaan ke website.") },
  limiter: { name: same("Rate limiter (pemeriksa batas)"), role: same("Berdiri sebelum server. Menghitung permintaan setiap akun dan meneruskan paling banyak 5 dalam satu periode 10 detik.") },
  counters: { name: same("Penghitung per akun"), role: same("Catatan berapa kali setiap akun sudah mengecek dalam periode ini. Andi dan Budi punya penghitung sendiri.") },
  window: { name: same("Periode 10 detik"), role: same("Jangka waktu penghitungan. Di awal periode berikutnya semua penghitung kembali ke 0.") },
  server: { name: same("Server aplikasi"), role: same("Mengerjakan permintaan satu per satu: mengambil data kursi lalu mengirim jawaban.") },
  db: { name: same("Database"), role: same("Tempat data kursi disimpan.") },
};

const VIEW_PARTS: ViewParts = {
  users: { analogy: "Pengunjung Andi dan Budi", system: "Pengguna website", role: PARTS.users.role.id },
  limiter: { analogy: "Petugas pemeriksa di depan loket", system: "Rate limiter", role: PARTS.limiter.role.id },
  counters: { analogy: "Kartu catatan pertanyaan", system: "Penghitung permintaan per akun", role: PARTS.counters.role.id },
  window: { analogy: "Jam di meja pemeriksa", system: "Periode 10 detik", role: PARTS.window.role.id },
  server: { analogy: "Petugas loket", system: "Server aplikasi", role: PARTS.server.role.id },
  db: { analogy: "Papan informasi kursi", system: "Database", role: PARTS.db.role.id },
};

function stateTitle(sim: RateSim) {
  const live = sim.reqs.filter((r) => r.doneAt === null);
  const back = live.find((r) => r.result === "limited");
  if (back) return `${back.who} diminta menunggu (429)`;
  if (sim.line.length > 2) return `Server sibuk: ${sim.line.length - 1} permintaan antre`;
  if (live.some((r) => r.stage === "to-server")) return sim.limiterOn ? "Permintaan diteruskan ke server" : "Permintaan masuk ke server";
  if (live.some((r) => r.stage === "to-gate")) return sim.limiterOn ? "Permintaan menuju pemeriksa batas" : "Permintaan menuju website";
  if (live.length) return "Server mengerjakan permintaan";
  return sim.limiterOn ? `Andi ${sim.counts.Andi}/5 · Budi ${sim.counts.Budi}/5` : "Belum ada pemeriksa batas";
}

const readout = (sim: RateSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · ${sim.forwarded} diteruskan · ${sim.limited} diminta menunggu · ${sim.served} dijawab`;

function Details({ sim, runtime, mode }: DetailsProps<RateSim>) {
  return mode === "explore" ? (
    <div className="explore">
      <div className="control">
        <span className="control-label">Cek kursi</span>
        <button type="button" className="button" onClick={() => runtime.act((s: RateSim) => check(s, "Andi"))}>
          A · Andi
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: RateSim) => check(s, "Budi"))}>
          B · Budi
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: RateSim) => (s.limiterOn = !s.limiterOn))}>
          {sim.limiterOn ? "Lepas pemeriksa" : "Pasang pemeriksa"}
        </button>
      </div>
      <p className="muted small">Tekan “A · Andi” enam kali dengan cepat, lalu tunggu periode baru ({Math.ceil(secondsLeft(sim))} detik lagi).</p>
    </div>
  ) : (
    <p className="muted small">Mulai eksplorasi bebas untuk menekan “Cek kursi” sebagai Andi atau Budi.</p>
  );
}

export const rateLimit: TopicModule<RateSim> = {
  slug: "rate-limiting",
  fig: "Fig 8",
  aspect: 640 / 420,
  meta: {
    category: same("Keamanan"),
    title: same("Mengapa Website Meminta Kita Menunggu?"),
    summary: same("Andi dan Budi mengecek kursi konser. Lihat mengapa website membatasi seberapa sering kita boleh meminta, dan apa arti pesan “Terlalu banyak permintaan”."),
    level: same("Dasar"),
    minutes: 7,
    outcomes: { id: RATE_LESSON.outcomes, en: RATE_LESSON.outcomes },
  },
  stepContent: RATE_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: RATE_LESSON.summary, en: RATE_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: RATE_LESSON.simplifications, en: RATE_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["users", "limiter", "counters", "window", "server", "db"],
  legend: [],
  dualView: true,
  systemViewLabel: "Cara kerja website",
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "permintaan" },
    { swatch: "response", text: "jawaban" },
    { swatch: "fail", text: "Tunggu (429)" },
  ],
  steps: RATE_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as RateLog;
    if (e.kind === "forwarded") return same(`Permintaan ${e.who} diteruskan (${e.count}/5).`);
    if (e.kind === "limited") return same(`${e.who} diminta menunggu: coba lagi dalam ${e.retryIn} detik.`);
    if (e.kind === "served") return same(`${e.who} menerima daftar kursi.`);
    if (e.kind === "reset") return same("Periode baru dimulai: semua penghitung kembali 0.");
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}rate-limiting-${theme}.png`,
  lesson: RATE_LESSON,
  metrics: (sim): Metric[] => [
    { label: "Andi", value: sim.limiterOn ? `${sim.counts.Andi} / 5` : null, warn: sim.counts.Andi >= 5 },
    { label: "Budi", value: sim.limiterOn ? `${sim.counts.Budi} / 5` : null, warn: sim.counts.Budi >= 5 },
    { label: "Sisa periode", value: sim.limiterOn ? String(Math.ceil(secondsLeft(sim) - 1e-9)) : null, unit: "detik" },
    { label: "Antre di server", value: String(Math.max(0, sim.line.length - 1)), unit: "permintaan", warn: sim.line.length > 3 },
  ],
  docTitle: same("Rate Limiting · Alur"),
  shortName: "Rate Limiting",
  scrollHint: same(""),
};
