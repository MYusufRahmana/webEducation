import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import type { ViewParts } from "../view-parts";
import { activeLink, advance, download, DRIVES, get, keys, latest, presign, put, setDrive, STATUS_TEXT, totalMb, type OsLog, type OsSim } from "./model";
import { OS_STEPS } from "./scenarios";
import { OS_LESSON } from "./lesson";

const same = (text: string): Bilingual => ({ id: text, en: text });

const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  "object-storage": { term: same("Object storage"), definition: same("Penyimpanan untuk file utuh (foto, video, dokumen, cadangan). File disimpan sebagai objek di dalam bucket dan diambil lewat key, bukan lewat tabel atau folder.") },
  "api-s3": { term: same("API S3"), definition: same("Cara bicara dengan object storage yang dipopulerkan Amazon S3: PUT untuk menyimpan, GET untuk mengambil, DELETE untuk menghapus. MinIO dan Cloudflare R2 memakai API yang sama.") },
  bucket: { term: same("Bucket"), definition: same("Wadah objek milik satu aplikasi atau proyek, misalnya foto-toko. Namanya dipakai di setiap permintaan.") },
  object: { term: same("Objek"), definition: same("Satu file yang disimpan utuh, beserta metadata-nya.") },
  key: { term: same("Key"), definition: same("Nama lengkap objek di dalam bucket, misalnya foto/kucing.jpg. Garis miring hanya bagian dari nama.") },
  metadata: { term: same("Metadata"), definition: same("Keterangan tentang objek: tipe file, ukuran, waktu diunggah, dan label tambahan.") },
  "erasure-coding": { term: same("Erasure coding"), definition: same("Cara memecah file menjadi bagian data dan bagian cadangan hasil hitungan, lalu menyebarkannya ke beberapa drive. File bisa dibangun ulang walau sebagian drive hilang.") },
  "presigned-url": { term: same("Link sementara (presigned URL)"), definition: same("Link ke satu objek yang ditandatangani layanan dan hanya berlaku sampai waktu tertentu. Siapa pun yang memegangnya bisa mengunduh tanpa akun.") },
  versioning: { term: same("Versioning"), definition: same("Pengaturan bucket yang menyimpan isi lama setiap kali key yang sama ditulis ulang.") },
};

const PARTS: Record<string, { name: Bilingual; role: Bilingual }> = {
  app: { name: same("Aplikasi"), role: same("Server aplikasi yang menyimpan dan mengambil file atas nama pengguna.") },
  browser: { name: same("Browser pengguna"), role: same("Mengunduh langsung dari penyimpanan bila memegang link sementara.") },
  api: { name: same("Layanan object storage"), role: same("Menerima permintaan API S3, mencari key, dan mengatur bagian file di drive.") },
  bucket: { name: same("Bucket"), role: same("Wadah objek milik aplikasi.") },
  objects: { name: same("Objek"), role: same("File yang disimpan, masing-masing dengan key-nya.") },
  drives: { name: same("Drive"), role: same("Tempat bagian-bagian file benar-benar disimpan.") },
  shards: { name: same("Bagian file"), role: same("Potongan data dan cadangan yang dikirim ke tiap drive.") },
  link: { name: same("Link sementara"), role: same("Akses ke satu objek yang berlaku sampai waktu tertentu.") },
  versions: { name: same("Versi objek"), role: same("Isi lama dan baru dari key yang sama.") },
};

const VIEW_PARTS: ViewParts = {
  app: { analogy: "Toko online", system: "Aplikasi", role: PARTS.app.role.id },
  browser: { analogy: "Pembeli", system: "Browser pengguna", role: PARTS.browser.role.id },
  api: { analogy: "Loket penitipan", system: "Layanan object storage (API S3)", role: PARTS.api.role.id },
  bucket: { analogy: "Lemari milik toko", system: "Bucket", role: PARTS.bucket.role.id },
  objects: { analogy: "Kotak berlabel", system: "Objek dan key", role: PARTS.objects.role.id },
  drives: { analogy: "Gudang 1–4", system: "Drive 1–4", role: PARTS.drives.role.id },
  shards: { analogy: "Potongan dan cadangan", system: "Bagian file (shard)", role: PARTS.shards.role.id },
  link: { analogy: "Tiket ambil berbatas waktu", system: "Link sementara (presigned URL)", role: PARTS.link.role.id },
  versions: { analogy: "Kotak lama dan baru", system: "Versi objek", role: PARTS.versions.role.id },
};

export function osStateTitle(sim: OsSim) {
  const active = sim.ops.find((op) => op.phase !== "done");
  const down = DRIVES.filter((id) => !sim.drives[id]).length;
  if (active) {
    const what = active.kind === "put" ? "menyimpan" : active.kind === "presign" ? "membuat link untuk" : "mengambil";
    const who = active.from === "browser" ? "Browser" : "Aplikasi";
    return `${who} ${what} ${active.key}`;
  }
  if (down) return `${down} drive mati · ${4 - down} aktif`;
  return keys(sim).length ? `${keys(sim).length} objek di bucket ${sim.bucket}` : `Bucket ${sim.bucket} masih kosong`;
}

const readout = (sim: OsSim, lang: Lang) => `t = ${formatNumber(lang, sim.t, 1)} dtk · ${sim.requests} permintaan · ${sim.failed} gagal`;

function Details({ sim, runtime, mode }: DetailsProps<OsSim>) {
  const link = activeLink(sim);
  const key = keys(sim)[0] ?? "foto/kucing.jpg";
  return (
    <>
      {mode === "explore" ? (
        <div className="explore">
          <div className="control">
            <span className="control-label">Aplikasi</span>
            <button type="button" className="button" onClick={() => runtime.act((s: OsSim) => put(s, `foto/baru-${s.nextSeq}.jpg`, 2))}>
              Unggah foto baru
            </button>
            <button type="button" className="button" onClick={() => runtime.act((s: OsSim) => put(s, key, (latest(s, key)?.sizeMb ?? 2) + 1))}>
              Simpan ulang {key}
            </button>
            <button type="button" className="button" onClick={() => runtime.act((s: OsSim) => get(s, key))}>
              Ambil {key}
            </button>
            <button type="button" className="button" onClick={() => runtime.act((s: OsSim) => presign(s, key))}>
              Buat link sementara
            </button>
          </div>
          <div className="control">
            <span className="control-label">Browser</span>
            <button type="button" className="button" disabled={!link} onClick={() => runtime.act((s: OsSim) => download(s))}>
              Unduh lewat link
            </button>
          </div>
          <div className="control">
            <span className="control-label">Drive</span>
            {DRIVES.map((id) => (
              <button key={id} type="button" className="button" aria-pressed={!sim.drives[id]} onClick={() => runtime.act((s: OsSim) => setDrive(s, id, !s.drives[id]))}>
                <span className="status-mark" aria-hidden="true">
                  {sim.drives[id] ? "●" : "○"}
                </span>
                {sim.drives[id] ? `Matikan ${id.slice(1)}` : `Hidupkan ${id.slice(1)}`}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="table-wrap">
        <table className="servers">
          <caption>Isi bucket {sim.bucket}</caption>
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col" className="num">
                Versi
              </th>
              <th scope="col" className="num">
                Ukuran
              </th>
            </tr>
          </thead>
          <tbody>
            {keys(sim).length ? (
              keys(sim).map((k) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td className="num">{sim.objects[k].map((v) => `v${v.v}`).join(", ")}</td>
                  <td className="num">{latest(sim, k)!.sizeMb} MB</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="muted">
                  Belum ada objek.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export const objectStorage: TopicModule<OsSim> = {
  slug: "object-storage",
  fig: "Fig 4",
  aspect: 640 / 420,
  meta: {
    category: same("Data dan Penyimpanan"),
    title: same("Object Storage"),
    summary: same("Di mana foto, video, dan dokumen disimpan? Lihat cara kerja object storage seperti MinIO, Cloudflare R2, dan Amazon S3."),
    level: same("Dasar"),
    minutes: 9,
    outcomes: { id: OS_LESSON.outcomes, en: OS_LESSON.outcomes },
  },
  stepContent: OS_LESSON.steps.map((step) => ({ key: step.key, title: same(step.title), body: { id: step.body, en: step.body }, observe: { id: [step.observe], en: [step.observe] } })),
  closing: { title: same("Ringkasan"), points: { id: OS_LESSON.summary, en: OS_LESSON.summary }, limitsTitle: same("Batas penyederhanaan"), limits: { id: OS_LESSON.simplifications, en: OS_LESSON.simplifications } },
  glossary: GLOSSARY,
  parts: PARTS,
  partOrder: ["app", "browser", "api", "bucket", "objects", "drives", "shards", "link", "versions"],
  legend: [],
  dualView: true,
  viewParts: VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "permintaan / bagian file" },
    { swatch: "response", text: "balasan 200 OK" },
    { swatch: "referral", text: "link sementara" },
    { swatch: "fail", text: "ditolak / gagal" },
  ],
  steps: OS_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const entry = raw as OsLog;
    if (entry.kind === "served") return same(`${entry.from === "browser" ? "Browser" : "Aplikasi"} menerima ${STATUS_TEXT[entry.status]} untuk ${entry.key}.`);
    if (entry.kind === "drive") return same(entry.up ? `Drive ${entry.drive.slice(1)} hidup kembali.` : `Drive ${entry.drive.slice(1)} mati.`);
    return null;
  },
  stateTitle: osStateTitle,
  readout,
  heldNote: same("Demonstrasi selesai."),
  Details,
  loadFigure: () => import("./system"),
  loadSystem: () => import("./system"),
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}object-storage-${theme}.png`,
  lesson: OS_LESSON,
  metrics: (sim): Metric[] => {
    const up = DRIVES.filter((id) => sim.drives[id]).length;
    return [
      { label: "Objek", value: String(keys(sim).length), unit: "file" },
      { label: "Data tersimpan", value: formatNumber("id", totalMb(sim), 0), unit: "MB" },
      { label: "Drive aktif", value: `${up} dari 4`, warn: up < 4 },
      { label: "Respons terakhir", value: sim.lastStatus ? STATUS_TEXT[sim.lastStatus] : null, warn: sim.lastStatus !== null && sim.lastStatus !== 200 },
    ];
  },
  docTitle: same("Object Storage · Alur"),
  shortName: "Object Storage",
  scrollHint: same(""),
};
