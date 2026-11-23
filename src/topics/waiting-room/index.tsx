import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { activeCount, advance, ANDI_ID, insideCount, positionOf, waitingCount, type WaitLog, type WaitSim } from "./model";
import { WAIT_STEPS } from "./scenarios";
import { WAIT_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  visitors: { name: same("Pengunjung"), role: same("Orang yang membuka website saat penjualan dibuka. Dalam simulasi ada sepuluh.") },
  andi: { name: same("Andi"), role: same("Pengunjung yang kita ikuti. Ditandai bintang, garis tepi, dan namanya.") },
  room: { name: same("Waiting room"), role: same("Halaman tunggu. Pengunjung di sini masih terhubung ke layanan waiting room, tetapi belum menjalankan proses pembelian.") },
  gate: { name: same("Gerbang / izin akses"), role: same("Memeriksa apakah ada tempat aktif yang kosong, lalu mempersilakan pengunjung paling depan masuk.") },
  area: { name: same("Area pembelian"), role: same("Halaman pemilihan tiket dan checkout. Dalam simulasi hanya ada tiga tempat aktif sekaligus.") },
  counters: { name: same("Penghitung"), role: same("“Sedang membeli” dan “Menunggu” selalu sama dengan jumlah orang di gambar.") },
  server: { name: same("Server aplikasi"), role: same("Mengerjakan permintaan dari halaman pembelian, satu per satu.") },
  db: { name: same("Database"), role: same("Catatan ketersediaan tiket dan pesanan.") },
};

const VIEW_PARTS: ViewParts = {
  visitors: { analogy: "Pengunjung", system: "Pengguna website", role: PARTS.visitors.role.id },
  room: { analogy: "Ruang tunggu", system: "Halaman waiting room", role: PARTS.room.role.id },
  gate: { analogy: "Petugas dan gerbang", system: "Layanan izin akses", role: PARTS.gate.role.id },
  area: { analogy: "Ruang pelayanan (3 meja)", system: "Aplikasi pembelian (3 tempat aktif)", role: PARTS.area.role.id },
  server: { analogy: "Petugas loket", system: "Server aplikasi", role: PARTS.server.role.id },
  db: { analogy: "Catatan ketersediaan tiket", system: "Database", role: PARTS.db.role.id },
};

function stateTitle(sim: WaitSim) {
  const pos = positionOf(sim, ANDI_ID);
  if (!sim.roomOn) return insideCount(sim) > 3 ? `Tanpa ruang tunggu: ${insideCount(sim)} orang di area pembelian` : "Penjualan tiket dibuka";
  if (sim.t < sim.gateOpenUntil) return "Gerbang terbuka: satu pengunjung masuk";
  if (pos !== null) return `Andi menunggu · urutan ${pos}`;
  const andi = sim.visitors[ANDI_ID - 1];
  if (andi.place.kind === "slot") return sim.packets.some((p) => p.doneAt === null) ? "Andi memilih tiket · data diperiksa server" : "Andi di area pembelian";
  return `Sedang membeli ${activeCount(sim)}/3 · menunggu ${waitingCount(sim)}`;
}

const readout = (sim: WaitSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · simulasi dipercepat, tidak perlu menunggu sungguhan`;

function Details({ mode }: DetailsProps<WaitSim>) {
  return <p className="muted small">{mode === "explore" ? "Eksplorasi bebas tidak menambah kejadian baru pada materi ini." : "Gunakan Berikutnya, Sebelumnya, dan Ulangi untuk mengikuti tahapannya."}</p>;
}

export const waitingRoom: TopicModule<WaitSim> = {
  slug: "waiting-room",
  fig: "Fig 9",
  aspect: 640 / 420,
  meta: {
    category: same("Keamanan"),
    title: same("Mengapa Harus Antre Sebelum Membeli Tiket?"),
    summary: same("Saat penjualan tiket konser dibuka, banyak orang datang bersamaan. Lihat bagaimana ruang tunggu mengatur giliran masuk, dan mengapa mendapat giliran belum berarti mendapat tiket."),
    level: same("Dasar"),
    minutes: 7,
    outcomes: { id: WAIT_LESSON.outcomes, en: WAIT_LESSON.outcomes },
  },
  stepContent: WAIT_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: WAIT_LESSON.summary, en: WAIT_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: WAIT_LESSON.simplifications, en: WAIT_LESSON.simplifications } },
  glossary: {},
  parts: PARTS,
  partOrder: ["visitors", "andi", "room", "gate", "area", "counters", "server", "db"],
  legend: [],
  dualView: true,
  systemViewLabel: "Cara kerja website",
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "permintaan data (paket)" },
    { swatch: "response", text: "jawaban data" },
    { swatch: "dash", text: "jalur orang: datang, masuk, keluar" },
  ],
  steps: WAIT_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as WaitLog;
    if (e.kind === "arrived") return same(`${e.count} pengunjung membuka website.`);
    if (e.kind === "admitted") return same(`${e.name} dipersilakan masuk ke area pembelian.`);
    if (e.kind === "released") return same("Satu tempat di area pembelian tersedia.");
    if (e.kind === "answer") return same(`Halaman Andi: ${e.text}.`);
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}waiting-room-${theme}.png`,
  lesson: WAIT_LESSON,
  metrics: (sim): Metric[] => {
    const pos = positionOf(sim, ANDI_ID);
    return [
      { label: "Sedang membeli", value: sim.roomOn ? `${activeCount(sim)} / 3` : `${insideCount(sim)} (tanpa batas)`, warn: !sim.roomOn && insideCount(sim) > 3 },
      { label: "Menunggu", value: sim.roomOn ? String(waitingCount(sim)) : null, unit: "orang" },
      { label: "Posisi Andi", value: pos !== null ? `urutan ${pos}` : sim.visitors[ANDI_ID - 1].place.kind === "slot" ? "di dalam" : null },
      { label: "Antre di server", value: String(sim.serverLine.length), unit: "permintaan", warn: sim.serverLine.length >= 3 },
    ];
  },
  docTitle: same("Waiting Room · Alur"),
  shortName: "Waiting Room",
  scrollHint: same(""),
};
