import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, cut, focusPacket, open, type RouteLog, type RouteSim } from "./model";
import { ROUTE_STEPS } from "./scenarios";
import { ROUTE_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  ip: { term: same("Alamat IP"), definition: same("Alamat yang dipakai jaringan untuk mengirim data ke perangkat atau layanan, misalnya 192.0.2.50. Satu layanan besar bisa punya banyak alamat.") },
  paket: { term: same("Paket data"), definition: same("Potongan kecil data yang diberi label alamat asal dan tujuan. Satu halaman website terdiri dari banyak paket.") },
  gateway: { term: same("Default gateway"), definition: same("Pintu keluar menuju jaringan lain. Di rumah biasanya router rumah.") },
  hop: { term: same("Hop"), definition: same("Satu langkah perpindahan paket dari satu titik jaringan ke titik berikutnya.") },
  ttl: { term: same("TTL (time to live)"), definition: same("Batas jumlah hop sebuah paket IPv4. Setiap router mengurangi satu; saat habis, paket berhenti dan sebuah kabar balik bisa dikirim.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  laptop: { name: same("Laptop Andi"), role: same("Tempat browser berjalan. Andi tetap di rumah; yang bergerak hanya paket.") },
  dns: { name: same("DNS"), role: same("Membantu menemukan alamat IP dari nama website. Bukan perantara wajib untuk semua lalu lintas website.") },
  home: { name: same("Router rumah"), role: same("Default gateway: pintu keluar dari jaringan rumah. Sering satu kotak dengan Wi-Fi dan modem/ONT.") },
  isp: { name: same("Router ISP"), role: same("Router milik penyedia internet. Membaca alamat tujuan dan memilih langkah berikutnya dari tabel rutenya.") },
  transit: { name: same("Router perantara"), role: same("Router di jaringan lain yang meneruskan paket. Router A dan Router B adalah dua jalur alternatif.") },
  google: { name: same("Jaringan & layanan Google"), role: same("Router di tepi jaringan Google dan layanan tujuan (ilustrasi). Lokasi dan alamat sungguhan bisa berbeda.") },
  facebook: { name: same("Jaringan & layanan Facebook"), role: same("Tujuan lain dengan jaringan sendiri (ilustrasi).") },
  table: { name: same("Tabel rute"), role: same("Petunjuk di router: untuk jaringan tujuan tertentu, teruskan ke router berikutnya yang mana. Disederhanakan.") },
  packet: { name: same("Paket yang diikuti"), role: same("Satu paket sebagai wakil. Kartunya menunjukkan asal, tujuan, dan jumlah hop.") },
  terminal: { name: same("Terminal tracert"), role: same("Ilustrasi Command Prompt. Browser ini tidak menjalankan perintah apa pun.") },
  ttl: { name: same("Batas langkah"), role: same("Setiap paket pemeriksaan tracert membawa batas hop yang lebih besar dari sebelumnya.") },
};

const VIEW_PARTS: ViewParts = {
  laptop: { analogy: "Pengirim (Andi)", system: "Laptop Andi", role: PARTS.laptop.role.id },
  dns: { analogy: "Buku alamat", system: "DNS", role: PARTS.dns.role.id },
  home: { analogy: "Kantor pos rumah", system: "Router rumah (default gateway)", role: PARTS.home.role.id },
  isp: { analogy: "Pusat sortir perusahaan pengiriman", system: "Router ISP", role: PARTS.isp.role.id },
  transit: { analogy: "Pusat sortir perantara", system: "Router perantara", role: PARTS.transit.role.id },
  table: { analogy: "Petunjuk pengiriman", system: "Tabel rute", role: PARTS.table.role.id },
  packet: { analogy: "Kiriman kecil berlabel alamat", system: "Paket data", role: PARTS.packet.role.id },
  google: { analogy: "Penerima", system: "Layanan tujuan", role: PARTS.google.role.id },
};

function stateTitle(sim: RouteSim) {
  const p = focusPacket(sim);
  if (sim.routeUpdateAt !== null) return "Memperbarui rute…";
  if (p && p.doneAt === null) {
    const here = p.trail[p.trail.length - 1];
    if (p.kind === "dns-q" || p.kind === "dns-a") return "Mencari alamat lewat DNS";
    if (p.kind === "probe") return `Paket pemeriksaan · batas ${p.ttl} langkah`;
    if (p.state === "deciding") return `${here === "I" ? "Router ISP" : "Router"} membaca tabel rute`;
    return `Paket menuju ${p.dest === "google" ? "Google" : "Facebook"} · hop ${p.hops}`;
  }
  if (sim.https && sim.screen !== "shown") return sim.https.phase;
  if (sim.screen === "shown") return "Halaman tampil";
  return sim.known[sim.dest] ? "Alamat tujuan tersedia" : "Alamat tujuan belum diketahui";
}

const readout = (sim: RouteSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · simulasi ilustrasi, bukan jaringan nyata`;

function Details({ runtime }: DetailsProps<RouteSim>) {
  return (
    <div className="explore">
      <div className="control">
        <span className="control-label">Buka</span>
        <button type="button" className="button" onClick={() => runtime.act((s: RouteSim) => open(s, "google"))}>
          Google
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: RouteSim) => open(s, "facebook"))}>
          Facebook
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: RouteSim) => cut(s))}>
          Putuskan Router A → Google
        </button>
      </div>
      <p className="muted small">Semua berjalan di simulasi lokal. Tidak ada koneksi jaringan atau perintah yang dijalankan.</p>
    </div>
  );
}

export const routing: TopicModule<RouteSim> = {
  slug: "routing",
  fig: "Fig 12",
  aspect: 640 / 420,
  meta: {
    category: same("Jaringan"),
    title: same("Bagaimana Data Menemukan Jalan ke Google?"),
    summary: same("Andi mengetik google.com. Ikuti satu paket keluar dari rumah, dipilihkan jalan oleh router demi router, lalu pulang membawa jawaban. Di akhir, coba tracert di komputermu sendiri."),
    level: same("Dasar"),
    minutes: 15,
    outcomes: { id: ROUTE_LESSON.outcomes, en: ROUTE_LESSON.outcomes },
  },
  stepContent: ROUTE_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: ROUTE_LESSON.summary, en: ROUTE_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: ROUTE_LESSON.simplifications, en: ROUTE_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["laptop", "dns", "home", "isp", "transit", "google", "facebook", "table", "packet", "terminal", "ttl"],
  legend: [],
  dualView: true,
  analogyViewLabel: "Analogi pengiriman",
  systemViewLabel: "Cara kerja jaringan",
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "paket pergi" },
    { swatch: "response", text: "paket balasan" },
    { swatch: "referral", text: "paket pemeriksaan (tracert)" },
    { swatch: "fail", text: "paket gagal" },
  ],
  steps: ROUTE_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as RouteLog;
    if (e.kind === "dns") return same("Alamat tujuan tersedia.");
    if (e.kind === "decide" && e.node === "I") return same(`Router ISP meneruskan ke ${e.next === "X1" ? "Router A" : "Router B"}.`);
    if (e.kind === "lost") return same(`Paket gagal: ${e.reason}.`);
    if (e.kind === "cut") return same("Sambungan Router A ke jaringan Google terputus.");
    if (e.kind === "route-updated") return same("Tabel rute ISP diperbarui: Google lewat Router B.");
    if (e.kind === "page") return same("Halaman tampil di layar Andi.");
    if (e.kind === "probe-line") return same(e.node ? `Batas ${e.ttl}: titik membalas.` : `Batas ${e.ttl}: tidak ada balasan.`);
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}routing-${theme}.png`,
  lesson: ROUTE_LESSON,
  metrics: (sim): Metric[] => {
    const p = focusPacket(sim);
    return [
      { label: "Tujuan", value: sim.dest === "google" ? "Google" : "Facebook" },
      { label: "Alamat IP", value: sim.known[sim.dest] ? "tersedia" : null },
      { label: "Hop paket", value: p && (p.kind === "req" || p.kind === "probe") ? String(p.hops) : null },
      { label: "Sambungan putus", value: String(sim.down.length), warn: sim.down.length > 0 },
    ];
  },
  docTitle: same("Routing · Alur"),
  shortName: "Routing",
  scrollHint: same(""),
};
