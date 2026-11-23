import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { advance, BLOCKED, flush, inFlight, move, SCREEN_SHORT, SCREEN_TEXT, SITE, TYPO, visit, type DnsLog, type DnsSim } from "./model";
import { DNS_STEPS } from "./scenarios";
import { DNS_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  ip: { term: same("Alamat IP"), definition: same("Nomor yang dipakai komputer untuk menemukan komputer lain di internet, misalnya 203.0.113.10. Mirip nomor telepon.") },
  rujukan: { term: same("Rujukan (referral)"), definition: same("Jawaban yang bukan alamat akhir, melainkan petunjuk server mana yang harus ditanya berikutnya.") },
  ttl: { term: same("TTL (time to live)"), definition: same("Berapa lama sebuah jawaban DNS boleh disimpan dan dipakai ulang. Setelah habis, jawaban harus dicari lagi.") },
  nxdomain: { term: same("NXDOMAIN"), definition: same("Jawaban DNS yang berarti “nama ini tidak ada”. Browser menampilkannya sebagai situs tidak ditemukan.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  device: { name: same("Laptop / browser"), role: same("Tempat kamu mengetik nama situs. Browser bertanya alamat ke resolver, lalu mendatangi alamat itu sendiri.") },
  deviceCache: { name: same("Catatan perangkat"), role: same("Jawaban DNS yang disimpan sebentar di perangkat, sehingga kunjungan berikutnya tidak perlu bertanya lagi.") },
  resolver: { name: same("DNS resolver"), role: same("Mencarikan alamat untuk perangkat. Biasanya milik penyedia internet, kantor, atau sekolah; bisa memegang daftar blokir.") },
  resolverCache: { name: same("Cache resolver"), role: same("Jawaban yang disimpan resolver selama TTL, dipakai untuk semua perangkat yang bertanya nama sama.") },
  root: { name: same("Server root"), role: same("Puncak hierarki DNS. Menunjukkan server mana yang mengurus akhiran seperti .id.") },
  tld: { name: same("Server TLD .id"), role: same("Mencatat nama yang terdaftar di bawah .id dan menunjuk server authoritative-nya, atau menjawab “tidak ada”.") },
  auth: { name: same("Server authoritative"), role: same("Pemegang catatan resmi sebuah nama: alamat IP dan TTL-nya.") },
  site: { name: same("Server situs"), role: same("Komputer yang mengirim halaman konser-tiket.id. Tidak ada hubungannya dengan DNS selain alamatnya.") },
  warning: { name: same("Halaman peringatan"), role: same("Halaman yang alamatnya diberikan resolver sebagai ganti alamat asli situs yang diblokir.") },
};

const VIEW_PARTS: ViewParts = {
  device: { analogy: "Kamu", system: "Laptop / browser", role: PARTS.device.role.id },
  deviceCache: { analogy: "Catatanmu sendiri", system: "Cache perangkat", role: PARTS.deviceCache.role.id },
  resolver: { analogy: "Petugas informasi", system: "DNS resolver", role: PARTS.resolver.role.id },
  resolverCache: { analogy: "Catatan petugas", system: "Cache resolver", role: PARTS.resolverCache.role.id },
  root: { analogy: "Pusat informasi kota", system: "Server root", role: PARTS.root.role.id },
  tld: { analogy: "Kantor wilayah .id", system: "Server TLD .id", role: PARTS.tld.role.id },
  auth: { analogy: "Pengelola toko", system: "Server authoritative", role: PARTS.auth.role.id },
  site: { analogy: "Toko konser", system: "Server situs", role: PARTS.site.role.id },
  warning: { analogy: "Papan “akses ditutup”", system: "Halaman peringatan", role: PARTS.warning.role.id },
};

function stateTitle(sim: DnsSim) {
  const v = inFlight(sim)[0];
  if (v) {
    switch (v.stage) {
      case "device-check":
        return "Browser melihat catatan perangkat";
      case "dns-go":
        return "Browser bertanya alamat ke resolver";
      case "resolver-check":
        return "Resolver memeriksa cache dan daftar blokirnya";
      case "root-go":
      case "root-back":
        return "Resolver bertanya ke server root";
      case "tld-go":
      case "tld-back":
        return v.missing ? "Server .id: nama itu tidak ada" : "Resolver bertanya ke server TLD .id";
      case "auth-go":
      case "auth-back":
        return "Resolver bertanya ke server authoritative";
      case "dns-back":
        return v.missing ? "Resolver: nama tidak ditemukan" : v.source === "blocklist" ? "Resolver memberi alamat halaman peringatan" : "Resolver memberi alamat ke browser";
      case "waiting":
        return v.waitingOn === "dns-go" ? "Menunggu resolver menjawab…" : "Menunggu server menjawab…";
      default:
        return "Browser mendatangi alamat yang diberikan";
    }
  }
  return sim.screen ? SCREEN_TEXT[sim.screen.outcome] : "Siap membuka situs";
}

const readout = (sim: DnsSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · ${sim.asked} kunjungan · ${sim.serverHops} kunjungan server DNS · ${sim.cacheHits} dari cache`;

function Details({ sim, runtime, mode }: DetailsProps<DnsSim>) {
  return mode === "explore" ? (
    <div className="explore">
      <div className="control">
        <span className="control-label">Buka</span>
        {[SITE, TYPO, BLOCKED].map((name) => (
          <button key={name} type="button" className="button" onClick={() => runtime.act((s: DnsSim) => visit(s, name))}>
            {name}
          </button>
        ))}
      </div>
      <div className="control">
        <span className="control-label">Kondisi</span>
        <button type="button" className="button" onClick={() => runtime.act((s: DnsSim) => (s.resolverUp = !s.resolverUp))}>
          {sim.resolverUp ? "Matikan resolver" : "Nyalakan resolver"}
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: DnsSim) => (s.siteUp = !s.siteUp))}>
          {sim.siteUp ? "Matikan server situs" : "Nyalakan server situs"}
        </button>
        <button type="button" className="button" disabled={sim.zone > 0} onClick={() => runtime.act((s: DnsSim) => move(s))}>
          Pindahkan situs
        </button>
        <button type="button" className="button" onClick={() => runtime.act((s: DnsSim) => flush(s))}>
          Kosongkan cache
        </button>
      </div>
      <p className="muted small">Coba buka konser-tiket.id dua kali, lalu pindahkan situs dan buka lagi sebelum TTL habis.</p>
    </div>
  ) : (
    <p className="muted small">Mulai eksplorasi bebas untuk membuka nama lain, memindahkan situs, atau mematikan resolver dan server situs.</p>
  );
}

export const dns: TopicModule<DnsSim> = {
  slug: "dns",
  fig: "Fig 3",
  aspect: 640 / 420,
  meta: {
    category: same("Jaringan"),
    title: same("DNS: Dari Nama Situs ke Halaman"),
    summary: same("Ikuti satu nama situs dari diketik sampai halamannya terbuka: resolver, root, TLD, authoritative, cache, dan TTL. Lalu pahami arti pesan “tidak ditemukan”, “diblokir”, dan “waktu habis”."),
    level: same("Dasar"),
    minutes: 14,
    outcomes: { id: DNS_LESSON.outcomes, en: DNS_LESSON.outcomes },
  },
  stepContent: DNS_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: DNS_LESSON.summary, en: DNS_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: DNS_LESSON.simplifications, en: DNS_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["device", "deviceCache", "resolver", "resolverCache", "root", "tld", "auth", "site", "warning"],
  legend: [],
  dualView: true,
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "pertanyaan / permintaan" },
    { swatch: "referral", text: "rujukan" },
    { swatch: "response", text: "alamat / halaman" },
    { swatch: "retry", text: "alamat lama / peringatan" },
    { swatch: "fail", text: "tidak ada" },
  ],
  steps: DNS_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const e = raw as DnsLog;
    if (e.kind === "cache-hit") return same(`Dijawab dari ${e.where === "device" ? "catatan perangkat" : "cache resolver"}: ${e.address}${e.stale ? ", alamat lama" : ""}.`);
    if (e.kind === "referral") return same(e.from === "root" ? "Root merujuk ke server .id." : "Server .id merujuk ke server authoritative.");
    if (e.kind === "nxdomain") return same(`Server .id: ${e.name} tidak ada.`);
    if (e.kind === "answer") return same(`Server authoritative menjawab ${e.address}, TTL ${e.ttl} detik.`);
    if (e.kind === "blocked") return same(`${e.name} ada di daftar blokir.`);
    if (e.kind === "moved") return same(`Situs pindah ke ${e.address}.`);
    if (e.kind === "outcome") return same(`Layar: ${SCREEN_TEXT[e.outcome]}.`);
    return null;
  },
  stateTitle: (sim) => stateTitle(sim),
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}dns-${theme}.png`,
  lesson: DNS_LESSON,
  metrics: (sim): Metric[] => [
    { label: "Kunjungan", value: String(sim.asked) },
    { label: "Kunjungan server DNS", value: String(sim.serverHops), unit: "kali" },
    { label: "Dijawab cache", value: String(sim.cacheHits), unit: "kali" },
    { label: "Layar browser", value: sim.screen ? SCREEN_SHORT[sim.screen.outcome] : null, warn: Boolean(sim.screen && sim.screen.outcome !== "page") },
  ],
  docTitle: same("DNS · Alur"),
  shortName: "DNS",
  scrollHint: same(""),
};
