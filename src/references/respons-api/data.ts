/**
 * Notes for "Respons API: Arti Kode dan Cara Menanganinya". HTTP status meanings follow MDN's HTTP status
 * reference; examples use a fictional concert-ticket site. Application codes come unchanged from the
 * application's own error list (internal.ts): code, name and HTTP status are never remapped here.
 */
import { ERRORS, GROUPS } from "./internal";

export type Filter = "berhasil" | "pengalihan" | "permintaan" | "gangguan" | "internal";

export const FILTERS: { id: Filter | "semua" | "favorit"; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "berhasil", label: "Berhasil" },
  { id: "pengalihan", label: "Pengalihan & Cache" },
  { id: "permintaan", label: "Permintaan & Akses" },
  { id: "gangguan", label: "Gangguan Layanan" },
  { id: "internal", label: "Kode Internal" },
  { id: "favorit", label: "Favorit" },
];

export interface Example {
  /** Status line and headers, exactly as they would appear. */
  head: string;
  /** JSON body; absent for responses without a body. */
  body?: string;
  note?: string;
}

export interface HttpNote {
  kind: "http";
  id: string;
  code: number;
  name: string;
  filter: Exclude<Filter, "internal">;
  arti: string;
  contoh: string;
  /** "Kapan dipakai" for 2xx/3xx, "Kemungkinan penyebab" for 4xx/5xx. Max three. */
  sebab: string[];
  frontend: string;
  backend: string;
  pengingat: string;
  keywords: string;
  example?: Example;
  note?: string;
}

export interface InternalNote {
  kind: "internal";
  id: string;
  code: number;
  name: string;
  http: number;
  /** The area of the application the error belongs to (identity, access, database…). */
  area: string;
  arti: string;
  periksa: string;
  keywords: string;
  /** Editorial note when the mapping is worth reviewing with the developers. */
  editorial?: string;
}

export type Note = HttpNote | InternalNote;

const h = (code: number, name: string, filter: HttpNote["filter"], o: Omit<HttpNote, "kind" | "id" | "code" | "name" | "filter">): HttpNote => ({ kind: "http", id: `http-${code}`, code, name, filter, ...o });

export const HTTP_NOTES: HttpNote[] = [
  h(200, "OK", "berhasil", {
    arti: "Permintaan berhasil. Baca isi respons sesuai kontrak endpoint.",
    contoh: "Andi membuka detail pesanan TKT-001 dan menerima datanya.",
    sebab: ["Membaca data: detail konser, daftar pesanan.", "Tindakan yang selesai dan mengembalikan hasilnya."],
    frontend: "Baca body sesuai kontrak. Isi body tetap perlu diperiksa, misalnya status pesanan masih menunggu_pembayaran.",
    backend: "Pastikan isi jawaban benar, bukan hanya statusnya 200. Daftar tanpa hasil biasanya tetap 200 dengan array kosong.",
    pengingat: "Berhasil — tetap baca isinya.",
    keywords: "berhasil sukses ok data",
    example: { head: "HTTP/1.1 200 OK\nContent-Type: application/json", body: '{\n  "data": {\n    "kode_pesanan": "TKT-001",\n    "status": "menunggu_pembayaran"\n  }\n}', note: "Permintaan membaca pesanan berhasil. Isi status pesanan menunjukkan pembayaran belum selesai." },
  }),
  h(201, "Created", "berhasil", {
    arti: "Resource baru berhasil dibuat, misalnya pesanan.",
    contoh: "Andi membuat pesanan dua tiket dan menerima kode TKT-001 berstatus menunggu_pembayaran.",
    sebab: ["POST yang membuat data baru: pesanan, akun, unggahan."],
    frontend: "Tampilkan resource yang baru dibuat. 201 bukan berarti pembayaran lunas; baca status di body.",
    backend: "Pastikan resource tersimpan tepat satu kali. Periksa header Location bila kontrak memakainya.",
    pengingat: "Berhasil membuat.",
    keywords: "dibuat buat pesanan baru created post",
  }),
  h(202, "Accepted", "berhasil", {
    arti: "Permintaan diterima untuk diproses, tetapi hasil akhirnya belum selesai.",
    contoh: "Permintaan membuat e-tiket PDF masuk antrean; file baru siap beberapa saat kemudian.",
    sebab: ["Pekerjaan yang diproses di belakang: antrean, laporan, pengiriman email."],
    frontend: "Tampilkan “sedang diproses”, lalu cek hasilnya lewat mekanisme yang disediakan (cek status atau notifikasi). Jangan menampilkannya sebagai transaksi selesai.",
    backend: "Pastikan pekerjaan benar-benar selesai kemudian dan statusnya bisa dipantau, termasuk bila gagal.",
    pengingat: "Diterima, belum selesai.",
    keywords: "diterima antrean proses async belum selesai",
  }),
  h(204, "No Content", "berhasil", {
    arti: "Permintaan berhasil tanpa isi respons.",
    contoh: "Andi menghapus konser dari daftar favoritnya. Berhasil, dan tidak ada body.",
    sebab: ["Menghapus atau mengubah data tanpa perlu mengirim balik isinya."],
    frontend: "Jangan selalu memanggil parsing JSON: body kosong akan gagal di-parse. Periksa status atau panjang body dulu.",
    backend: "Pastikan body benar-benar kosong dan perubahannya terjadi.",
    pengingat: "Berhasil, tanpa isi.",
    keywords: "kosong tanpa isi hapus delete no content",
    example: { head: "HTTP/1.1 204 No Content", note: "Tidak ada body JSON. Pemanggilan response.json() pada respons ini akan gagal." },
  }),
  h(301, "Moved Permanently", "pengalihan", {
    arti: "Resource dipindahkan secara permanen ke alamat lain (header Location).",
    contoh: "Alamat /api/v1/konser dipindah permanen ke /api/v2/konser.",
    sebab: ["Alamat lama diganti selamanya."],
    frontend: "Perbarui alamat yang dipakai aplikasi. Browser umumnya mengikuti pengalihan otomatis.",
    backend: "Periksa header Location berisi alamat tujuan yang benar.",
    pengingat: "Pindah permanen.",
    keywords: "pindah redirect alamat baru location",
    note: "Pada 301 dan 302, klien dapat mengubah method non-GET menjadi GET. Jika method harus tetap sama, API biasanya memakai 308 atau 307.",
  }),
  h(302, "Found", "pengalihan", {
    arti: "Resource sementara diarahkan ke alamat lain.",
    contoh: "Halaman promo sementara diarahkan ke halaman Konser Senja.",
    sebab: ["Pengalihan sementara, misalnya setelah login atau selama promo."],
    frontend: "Ikuti pengalihan; jangan menyimpan alamat tujuan sebagai alamat tetap.",
    backend: "Periksa header Location dan bahwa pengalihan memang sementara.",
    pengingat: "Dialihkan sementara.",
    keywords: "redirect sementara alihkan location",
  }),
  h(304, "Not Modified", "pengalihan", {
    arti: "Representasi belum berubah menurut pemeriksaan cache; klien dapat memakai salinan yang sesuai.",
    contoh: "Browser meminta poster konser dengan If-None-Match; poster belum berubah, jadi salinan cache dipakai.",
    sebab: ["Permintaan bersyarat dengan ETag atau Last-Modified."],
    frontend: "Biasanya ditangani browser atau HTTP client. Pakai salinan cache yang sesuai.",
    backend: "Periksa validator ETag atau Last-Modified bekerja dan respons 304 tidak membawa body.",
    pengingat: "Belum berubah, pakai salinan.",
    keywords: "cache etag tidak berubah salinan",
  }),
  h(400, "Bad Request", "permintaan", {
    arti: "Permintaan tidak dapat diproses karena masalah pada permintaan itu sendiri.",
    contoh: "Body pembuatan pesanan tidak menyertakan jumlah tiket (kode internal 3001).",
    sebab: ["Field wajib hilang atau bentuknya salah.", "JSON rusak atau parameter tidak sesuai kontrak.", "Kode frontend membentuk permintaan dengan salah."],
    frontend: "Tampilkan kesalahan input yang bisa diperbaiki, dekat kolomnya. Jika permintaan dibentuk salah oleh kode, perbaiki kodenya.",
    backend: "Pastikan tidak ada data yang berubah dan pesan error menunjuk masalah dengan jelas.",
    pengingat: "Periksa permintaan.",
    keywords: "validasi input field form salah request",
    example: { head: "HTTP/1.1 400 Bad Request\nContent-Type: application/json", body: '{\n  "code": 3001,\n  "name": "MissingRequiredField",\n  "message": "Jumlah tiket wajib diisi"\n}' },
  }),
  h(401, "Unauthorized", "permintaan", {
    arti: "Backend belum menerima bukti autentikasi yang valid untuk mengakses layanan ini.",
    contoh: "Andi membuka riwayat pesanan setelah sesi loginnya kedaluwarsa.",
    sebab: ["Header atau token autentikasi tidak dikirim.", "Token kedaluwarsa, rusak, atau tanda tangannya salah.", "Format header tidak sesuai kontrak."],
    frontend: "Periksa mekanisme pembaruan sesi yang disepakati. Jika tidak berhasil, minta pengguna login kembali.",
    backend: "Pastikan kredensial yang tidak valid ditolak dan data pesanan tidak diberikan.",
    pengingat: "Periksa bukti identitas.",
    keywords: "login sesi token autentikasi masuk kedaluwarsa expired",
  }),
  h(403, "Forbidden", "permintaan", {
    arti: "Server memahami siapa penggunanya, tetapi menolak memberikan akses.",
    contoh: "Andi membuka halaman pengelolaan tiket seluruh pembeli yang hanya untuk admin.",
    sebab: ["Role atau izin pengguna tidak mencukupi.", "Data milik pengguna lain.", "Kebijakan lain, misalnya alamat IP tidak diizinkan."],
    frontend: "Tampilkan bahwa akses tidak diizinkan. Login ulang dengan akun yang sama tidak otomatis menambah izin.",
    backend: "Uji akses terhadap data, bukan hanya tombol. Menyembunyikan tombol di frontend tidak menggantikan pemeriksaan izin.",
    pengingat: "Periksa izin akses.",
    keywords: "izin akses role admin dilarang forbidden",
  }),
  h(404, "Not Found", "permintaan", {
    arti: "Resource tujuan tidak ditemukan, atau server tidak mengungkapkan keberadaannya.",
    contoh: "Andi membuka /api/pesanan/TKT-999 yang tidak ada.",
    sebab: ["ID atau alamat salah.", "Resource sudah dihapus.", "Server sengaja tidak mengungkap data milik orang lain."],
    frontend: "Tampilkan keadaan “tidak ditemukan” dan jalan kembali.",
    backend: "Bedakan dengan daftar kosong: pencarian tanpa hasil dapat menjawab 200 dengan array kosong.",
    pengingat: "Periksa resource.",
    keywords: "tidak ditemukan hilang alamat salah not found",
  }),
  h(405, "Method Not Allowed", "permintaan", {
    arti: "Endpoint tidak mendukung method yang digunakan.",
    contoh: "Aplikasi mengirim GET ke /api/pesanan yang hanya menerima POST.",
    sebab: ["Method salah di kode atau di alat uji."],
    frontend: "Perbaiki method di kode sesuai kontrak.",
    backend: "Periksa header Allow berisi method yang didukung.",
    pengingat: "Periksa method.",
    keywords: "method get post salah",
  }),
  h(409, "Conflict", "permintaan", {
    arti: "Permintaan bertentangan dengan keadaan resource saat ini.",
    contoh: "Kursi A1 sudah diambil pembeli lain ketika Andi menyimpan pilihannya.",
    sebab: ["Data sudah berubah sejak terakhir dimuat.", "Duplikasi yang dianggap konflik oleh kontrak."],
    frontend: "Tampilkan konflik dan muat ulang keadaan terbaru sebelum pengguna mencoba lagi.",
    backend: "Pastikan tidak ada data ganda dan keadaan akhir konsisten.",
    pengingat: "Periksa konflik.",
    keywords: "konflik bentrok kursi sudah diambil duplikat",
  }),
  h(413, "Content Too Large", "permintaan", {
    arti: "Isi permintaan terlalu besar.",
    contoh: "Andi mengunggah bukti bayar 30 MB padahal batasnya 5 MB.",
    sebab: ["File atau body melebihi batas server atau proxy."],
    frontend: "Periksa ukuran sebelum mengunggah dan tampilkan batasnya.",
    backend: "Pastikan batasnya sesuai kontrak di server maupun proxy, dan pesannya jelas.",
    pengingat: "Kecilkan isinya.",
    keywords: "file besar ukuran unggah upload terlalu besar",
  }),
  h(415, "Unsupported Media Type", "permintaan", {
    arti: "Format isi permintaan tidak didukung.",
    contoh: "Pesanan dikirim tanpa header Content-Type: application/json.",
    sebab: ["Header Content-Type hilang atau salah.", "Format file unggahan tidak didukung."],
    frontend: "Kirim Content-Type yang sesuai dengan body.",
    backend: "Periksa daftar format yang diterima dan pesan errornya.",
    pengingat: "Periksa format isi.",
    keywords: "content-type format json header media",
  }),
  h(422, "Unprocessable Content", "permintaan", {
    arti: "Format isi dipahami, tetapi instruksinya tidak dapat diproses, misalnya validasi nilai.",
    contoh: "Jumlah tiket 0: JSON-nya valid, tetapi aturan pembelian menolak nilainya.",
    sebab: ["Nilai melanggar aturan bisnis atau validasi."],
    frontend: "Tampilkan kesalahan input yang bisa diperbaiki.",
    backend: "Pastikan pemakaian 400 dan 422 untuk validasi konsisten di seluruh API.",
    pengingat: "Periksa nilai isian.",
    keywords: "validasi nilai input aturan tidak bisa diproses",
    note: "Penggunaan 400 atau 422 untuk validasi mengikuti kontrak API yang dipilih, dan dipakai secara konsisten.",
  }),
  h(429, "Too Many Requests", "permintaan", {
    arti: "Batas frekuensi permintaan terlampaui.",
    contoh: "Andi menekan “Cek ketersediaan” berkali-kali dalam beberapa detik.",
    sebab: ["Permintaan terlalu sering dari satu pengguna atau alamat.", "Retry otomatis yang tidak dibatasi."],
    frontend: "Ikuti header Retry-After jika tersedia. Jangan mengirim ulang terus-menerus.",
    backend: "Periksa batas sesuai kebijakan dan keberadaan Retry-After.",
    pengingat: "Kurangi frekuensi.",
    keywords: "terlalu sering rate limit batas tunggu",
  }),
  h(500, "Internal Server Error", "gangguan", {
    arti: "Terjadi kegagalan internal yang tidak diharapkan.",
    contoh: "Koneksi database gagal saat Andi membuat pesanan (kode internal 7001).",
    sebab: ["Kegagalan database, storage, atau layanan pendukung.", "Kesalahan kode atau konfigurasi.", "Data yang tidak terduga."],
    frontend: "Tampilkan pesan aman dan langkah pemulihan. Jangan mengulang pembuatan pesanan tanpa memeriksa statusnya dulu.",
    backend: "Telusuri log dengan request ID. Pastikan stack trace dan detail internal tidak terkirim ke pengguna.",
    pengingat: "Telusuri kegagalan internal.",
    keywords: "server error internal gangguan database",
    example: { head: "HTTP/1.1 500 Internal Server Error\nContent-Type: application/json", body: '{\n  "code": 7001,\n  "message": "Layanan sedang mengalami gangguan",\n  "request_id": "req-demo-001"\n}' },
  }),
  h(502, "Bad Gateway", "gangguan", {
    arti: "Gateway atau proxy menerima respons tidak valid dari layanan di belakangnya.",
    contoh: "Gateway menerima jawaban rusak dari layanan pembayaran.",
    sebab: ["Layanan di belakang gateway crash atau menjawab tidak sesuai protokol."],
    frontend: "Tampilkan pesan aman; sediakan “coba lagi nanti” untuk permintaan baca.",
    backend: "Periksa log gateway dan layanan upstream.",
    pengingat: "Periksa layanan di belakang gateway.",
    keywords: "gateway proxy upstream rusak",
  }),
  h(503, "Service Unavailable", "gangguan", {
    arti: "Layanan sementara tidak tersedia, misalnya karena kelebihan beban atau pemeliharaan.",
    contoh: "Layanan tiket sedang dalam pemeliharaan tepat saat penjualan dibuka.",
    sebab: ["Pemeliharaan terjadwal.", "Kelebihan beban."],
    frontend: "Ikuti Retry-After jika ada, dan tampilkan informasi pemeliharaan.",
    backend: "Periksa kapasitas, status pemeliharaan, dan header Retry-After.",
    pengingat: "Layanan sementara tidak tersedia.",
    keywords: "pemeliharaan maintenance down penuh tidak tersedia",
  }),
  h(504, "Gateway Timeout", "gangguan", {
    arti: "Gateway atau proxy tidak menerima jawaban tepat waktu dari layanan di belakangnya.",
    contoh: "Gateway menunggu layanan pembuatan pesanan terlalu lama.",
    sebab: ["Layanan di belakang lambat atau macet.", "Batas waktu gateway terlalu pendek."],
    frontend: "Jangan menganggap operasi pasti gagal. Untuk pembuatan pesanan, periksa statusnya sebelum mengulang.",
    backend: "Periksa batas waktu di setiap lapisan dan apakah operasi sempat selesai.",
    pengingat: "Upstream terlambat menjawab.",
    keywords: "timeout lama lambat gateway",
  }),
];

/* ---------------------------------------------------------------- application codes */
const AREA_WORDS: Record<string, string> = {
  A: "login token autentikasi identitas",
  B: "izin akses role",
  C: "keycloak jwks kunci verifikasi token",
  D: "validasi input field data permintaan",
  E: "file unggah upload storage penyimpanan",
  F: "database db koneksi query",
  G: "elasticsearch pencarian search indeks",
  H: "json internal server",
};
const EDITORIAL: Partial<Record<number, string>> = {
  2002: "Terlalu umum; token kedaluwarsa dapat diberi subkategori agar tindakannya lebih jelas.",
  2014: "Nama “URL tidak ditemukan” terlalu sempit untuk seluruh kegagalan pengambilan JWKS, dan tidak otomatis berarti HTTP 404.",
  2015: "kid tidak wajib untuk semua token JWS. Jika verifier mewajibkannya, dokumentasikan. Status sebaiknya mengikuti sumber kesalahannya.",
  4002: "Status 400 mengikuti daftar. 409 dapat dipertimbangkan jika duplikasi diperlakukan sebagai konflik.",
  7009: "Perbaiki istilah: marshal berarti data internal → JSON, jangan tertukar dengan parsing input.",
  7012: "Jika tipe query berasal dari input klien, 4xx mungkin lebih tepat; jika dari kode internal, 500 dapat sesuai.",
  7013: "Bedakan kegagalan internal dengan kondisi bisnis seperti data tidak ditemukan.",
  7014: "Bedakan kegagalan internal dengan konflik duplikasi.",
  7015: "Bedakan kegagalan internal dengan kondisi bisnis seperti data tidak ditemukan.",
  7016: "Bedakan kegagalan internal dengan kondisi bisnis; nol baris terhapus belum tentu kegagalan.",
};

export const INTERNAL_NOTES: InternalNote[] = ERRORS.map((e) => ({
  kind: "internal",
  id: `app-${e.code}`,
  code: e.code,
  name: e.name,
  http: e.http,
  area: GROUPS[e.group].title,
  arti: `${e.details}.`,
  periksa: e.check.slice(0, 2).join("; ") + ".",
  keywords: `${AREA_WORDS[e.group]} ${e.message} ${e.short}`,
  editorial: EDITORIAL[e.code],
}));

export const NOTES: Note[] = [...HTTP_NOTES, ...INTERNAL_NOTES];
export const noteById = (id: string) => NOTES.find((n) => n.id === id) ?? null;
export const filterOf = (n: Note): Filter => (n.kind === "internal" ? "internal" : n.filter);

/* ---------------------------------------------------------------- search */
export const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
export const searchText = (n: Note) => normalise(`${n.code} ${n.name} ${n.keywords} ${n.arti} ${n.kind === "http" ? `${n.contoh} ${n.pengingat}` : `${n.area} http ${n.http}`}`);

/** Notes matching every word of the query; exact code matches first, then name matches. */
export function findNotes(query: string, list: Note[] = NOTES): Note[] {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list
    .filter((n) => words.every((w) => searchText(n).includes(w)))
    .map((n) => ({ n, score: (words.includes(String(n.code)) ? 10 : 0) + (words.some((w) => normalise(n.name).includes(w)) ? 3 : 0) + (n.kind === "http" ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .map(({ n }) => n);
}

/* ---------------------------------------------------------------- the other sections */
export const STATUS_GROUPS = [
  { range: "1xx", arti: "Informasi sementara selama proses komunikasi.", pengingat: "Proses komunikasi berlanjut.", extra: true },
  { range: "2xx", arti: "Permintaan berhasil ditangani sesuai statusnya.", pengingat: "Berhasil." },
  { range: "3xx", arti: "Pengalihan atau mekanisme terkait cache.", pengingat: "Ikuti aturan respons.", extra: true },
  { range: "4xx", arti: "Ada masalah pada permintaan atau syarat aksesnya.", pengingat: "Periksa permintaan dan akses." },
  { range: "5xx", arti: "Server atau layanan pendukung gagal memenuhi permintaan.", pengingat: "Periksa sisi layanan." },
];

export const CONFUSED: { pair: string; text: string }[] = [
  { pair: "200 vs 201", text: "Berhasil (misalnya menerima informasi) dibanding berhasil membuat resource baru." },
  { pair: "201 vs 202", text: "Resource sudah dibuat dibanding pekerjaan baru diterima untuk diproses. 202 bukan transaksi selesai, dan 201 bukan pembayaran lunas." },
  { pair: "401 vs 403", text: "Kredensial autentikasi belum ada atau tidak valid, dibanding identitas diterima tetapi akses ditolak." },
  { pair: "400 vs 422", text: "Keduanya bisa berkaitan dengan input. Pembedaannya mengikuti kontrak API, dan dipakai konsisten." },
  { pair: "404 vs hasil kosong", text: "Endpoint detail yang tidak menemukan resource dapat menjawab 404; daftar tanpa hasil dapat menjawab 200 dengan array kosong." },
  { pair: "500 vs 502 vs 503 vs 504", text: "Kegagalan internal, respons upstream tidak valid, layanan sementara tidak tersedia, dan upstream melewati batas waktu." },
];

export const FRONTEND_ACTIONS: [string, string][] = [
  ["2xx", "Tangani hasil sesuai status dan body."],
  ["400 / 422", "Tampilkan kesalahan input yang dapat diperbaiki."],
  ["401", "Tangani sesi atau autentikasi sesuai kontrak."],
  ["403", "Beri pesan bahwa akses tidak diizinkan."],
  ["404", "Tampilkan keadaan resource tidak ditemukan."],
  ["409", "Tampilkan konflik dan perbarui keadaan data."],
  ["429", "Ikuti Retry-After jika tersedia; jangan mengirim ulang terus-menerus."],
  ["5xx", "Tampilkan pesan aman dan sediakan langkah pemulihan yang sesuai."],
];

export const DEV_QA_NOTES = [
  "Periksa status HTTP aktual di tab Network atau alat API, bukan hanya angka di JSON.",
  "Status 200 tidak otomatis membuktikan isi jawaban benar.",
  "Network error, DNS gagal, atau browser memblokir respons karena CORS tidak sama dengan HTTP 500 — sering kali tidak ada status HTTP yang bisa dibaca kode frontend.",
  "Jangan menampilkan stack trace, password, token, atau alamat internal kepada pengguna.",
  "Gunakan request ID untuk membantu penelusuran di log.",
  "Arti status tidak menggantikan dokumentasi kontrak API.",
];

export const REMINDERS: [string, string][] = [
  ["200", "berhasil"],
  ["201", "berhasil membuat"],
  ["202", "diterima, belum selesai"],
  ["400", "periksa permintaan"],
  ["401", "periksa autentikasi"],
  ["403", "periksa izin"],
  ["404", "periksa resource"],
  ["409", "periksa konflik"],
  ["429", "kurangi frekuensi"],
  ["500", "telusuri kegagalan internal"],
];

export const INTERNAL_EXAMPLE = {
  head: "HTTP/1.1 401 Unauthorized\nContent-Type: application/json",
  body: '{\n  "code": 2002,\n  "name": "TokenInvalid",\n  "message": "Token tidak valid"\n}',
};
