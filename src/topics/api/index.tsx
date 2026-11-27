import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, current, PHASE_LABEL, placeOrder, resetDemo, view, type ApiLog, type ApiSim } from "./model";
import { API_STEPS } from "./scenarios";
import { API_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  api: { term: same("API"), definition: same("Application Programming Interface: antarmuka dengan aturan yang disepakati agar satu perangkat lunak bisa meminta data atau tindakan dari perangkat lunak lain.") },
  endpoint: { term: same("Endpoint"), definition: same("Alamat layanan tertentu yang disediakan backend, misalnya /api/konser/101.") },
  json: { term: same("JSON"), definition: same("Format data berbentuk teks, misalnya {\"nama\": \"Konser Senja\"}. Salah satu format; bukan satu-satunya.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  user: { name: same("Andi"), role: same("Pengguna. Ia hanya melihat tombol dan formulir.") },
  frontend: { name: same("Frontend"), role: same("Website atau aplikasi HP: mengirim request dan mengubah response menjadi tampilan.") },
  endpoint: { name: same("Endpoint API"), role: same("Pintu yang disediakan backend untuk satu jenis permintaan. Bagian dari backend, bukan server terpisah.") },
  check: { name: same("Pemeriksaan"), role: same("Memeriksa method, format, dan isi request sebelum diproses. Request yang ditolak tidak mengubah data.") },
  process: { name: same("Proses aplikasi"), role: same("Aturan aplikasi: siapa penggunanya (dari sesi login), berapa harganya (dari data tepercaya), apa yang dicatat.") },
  db: { name: same("Database"), role: same("Tempat data konser dan pesanan. Hanya diakses backend, dan hanya bila perlu.") },
  request: { name: same("Request"), role: same("Permintaan: method, endpoint, header, dan body bila perlu.") },
  response: { name: same("Response"), role: same("Jawaban: status code dan body (JSON dalam contoh ini).") },
  strip: { name: same("Status"), role: same("Tahap yang sedang berjalan, dari menyiapkan permintaan sampai memperbarui tampilan.") },
  client: { name: same("API client"), role: same("Alat untuk mengirim request langsung tanpa tampilan website, seperti Postman, Bruno, atau Hoppscotch.") },
  parts: { name: same("Bagian request"), role: same("Method, URL, path parameter, query parameter, header, body.") },
};

const VIEW_PARTS: ViewParts = {
  frontend: { analogy: "Papan layanan & formulir", system: "Frontend", role: PARTS.frontend.role.id },
  endpoint: { analogy: "Loket layanan", system: "Endpoint API", role: PARTS.endpoint.role.id },
  check: { analogy: "Petugas memeriksa formulir", system: "Pemeriksaan request", role: PARTS.check.role.id },
  process: { analogy: "Petugas di balik loket", system: "Proses aplikasi (backend)", role: PARTS.process.role.id },
  db: { analogy: "Buku catatan", system: "Database", role: PARTS.db.role.id },
  request: { analogy: "Formulir", system: "Request", role: PARTS.request.role.id },
  response: { analogy: "Jawaban / bukti pesanan", system: "Response", role: PARTS.response.role.id },
  client: { analogy: "Menyerahkan formulir langsung", system: "API client (Postman)", role: PARTS.client.role.id },
};

function stateTitle(sim: ApiSim) {
  const x = current(sim);
  if (!x) return "Menunggu Andi menekan tombol";
  if (x.phase === "done") return x.res ? `Selesai: ${x.res.status} ${x.res.text}` : "Selesai";
  return PHASE_LABEL[x.phase];
}
const readout = (sim: ApiSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · simulasi lokal, tanpa server sungguhan`;

function Details({ runtime }: DetailsProps<ApiSim>) {
  return (
    <div className="explore">
      <div className="control">
        <span className="control-label">Kirim</span>
        <button type="button" className="button" onClick={() => runtime.act((s: ApiSim) => view(s))}>
          GET /api/konser/101
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: ApiSim) => placeOrder(s, 2))}>
          POST jumlah 2
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: ApiSim) => placeOrder(s, 0))}>
          POST jumlah 0
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: ApiSim) => resetDemo(s))}>
          Reset demo
        </button>
      </div>
      <p className="muted small">Simulasi lokal — tidak menghubungi server sungguhan.</p>
    </div>
  );
}

export const api: TopicModule<ApiSim> = {
  slug: "api",
  fig: "Fig 14",
  aspect: 640 / 420,
  meta: {
    category: same("Komunikasi"),
    title: same("Di Balik Tombol Beli: Bagaimana Aplikasi Berbicara lewat API?"),
    summary: same("Andi menekan tombol di website konser. Ikuti request dan response antara frontend, backend, dan database, coba kirim request sendiri, lalu uji API sungguhan dengan Postman Echo."),
    level: same("Dasar"),
    minutes: 15,
    outcomes: { id: API_LESSON.outcomes, en: API_LESSON.outcomes },
  },
  stepContent: API_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: API_LESSON.summary, en: API_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: API_LESSON.simplifications, en: API_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["user", "frontend", "endpoint", "check", "process", "db", "request", "response", "strip", "client", "parts"],
  legend: [],
  dualView: true,
  analogyViewLabel: "Analogi loket",
  systemViewLabel: "Cara kerja aplikasi",
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "request (jalur atas)" },
    { swatch: "response", text: "response berhasil (jalur bawah)" },
    { swatch: "fail", text: "response error" },
  ],
  steps: API_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as ApiLog;
    if (e.kind === "sent") return same(`Request dikirim: ${e.method} ${e.url}.`);
    if (e.kind === "rejected") return same(`Ditolak saat pemeriksaan: status ${e.status}.`);
    if (e.kind === "db") return same(e.access === "write" ? "Database mencatat pesanan." : "Database dibaca.");
    if (e.kind === "response") return same(`Response diterima: status ${e.status}.`);
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}api-${theme}.png`,
  lesson: API_LESSON,
  metrics: (sim): Metric[] => {
    const x = current(sim);
    const res = x && (x.phase === "render" || x.phase === "done") ? x.res : null;
    return [
      { label: "Request", value: x ? `${x.req.method} ${x.req.url.replace("https://postman-echo.com", "").split("?")[0]}` : null },
      { label: "Status", value: res ? `${res.status} ${res.text}` : null, warn: !!res && res.status >= 400 },
      { label: "Database", value: sim.server === "echo" ? "tidak dipakai" : x && x.db ? (x.db === "write" ? "menulis" : "membaca") : x && x.phase !== "done" ? "—" : x ? "tidak diakses" : null },
      { label: "Pesanan tersimpan", value: sim.server === "echo" ? null : String(sim.orders.length) },
    ];
  },
  docTitle: same("API · Alur"),
  shortName: "API",
  scrollHint: same(""),
};
