/**
 * The error catalog of the example application, as given by its own error list. `code` is the
 * application's code, not an HTTP status. `http` is the HTTP status the list assigns to it.
 * The demo always sends the same status on the HTTP status line as in the JSON body, except in the
 * one scene that shows a server where the two disagree.
 */

export type Stage = "identitas" | "verifier" | "token" | "akses" | "data" | "proses" | "db" | "file" | "search" | "json";
export type Group = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";

export interface ErrorDef {
  code: number;
  name: string;
  http: 400 | 401 | 403 | 500;
  group: Group;
  /** Where in the request's path the error is raised. */
  stage: Stage;
  /** Short chip label. */
  short: string;
  message: string;
  details: string;
  /** What to check, in order. */
  check: string[];
  /** A caution that belongs to this error. */
  note?: string;
}

export const GROUPS: Record<Group, { title: string; question: string; reminder?: string }> = {
  A: { title: "Identitas", question: "Apakah bukti masuknya dapat diterima?", reminder: "header → format → token → tanda tangan" },
  B: { title: "Hak akses", question: "Apakah pengguna boleh melakukan tindakan ini?", reminder: "identitas diterima belum berarti semua pintu terbuka" },
  C: { title: "Keycloak & verifikasi token", question: "Apakah fasilitas pemeriksaan identitas siap?" },
  D: { title: "Data permintaan", question: "Apakah formulirnya lengkap dan benar?", reminder: "ada dulu, baru benar" },
  E: { title: "Penyimpanan file", question: "Apakah tempat penitipan file siap?" },
  F: { title: "Database", question: "Apakah catatan bisa diakses dan dikelola?", reminder: "siap → tersambung → tersedia → digunakan → ditutup" },
  G: { title: "Elasticsearch", question: "Apakah fasilitas pencarian siap bekerja?" },
  H: { title: "Penyusunan jawaban & error umum", question: "Apakah jawaban berhasil disusun?" },
};

export const HTTP_TEXT: Record<number, string> = { 200: "OK", 201: "Created", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 500: "Internal Server Error" };
export const HTTP_REMINDER: Record<number, string> = {
  400: "Permintaannya perlu diperbaiki.",
  401: "Bukti identitasnya belum bisa diterima.",
  403: "Akses ke layanan ini ditolak.",
  500: "Ada masalah di dalam layanan.",
};

const e = (code: number, name: string, http: ErrorDef["http"], group: Group, stage: Stage, short: string, message: string, details: string, check: string[], note?: string): ErrorDef => ({ code, name, http, group, stage, short, message, details, check, note });

export const ERRORS: ErrorDef[] = [
  // A. identity
  e(2001, "Authentication", 401, "A", "token", "Autentikasi gagal", "Autentikasi gagal", "Proses pembuktian identitas gagal", ["Kredensial atau token sesuai metode login", "Penyebab spesifik di log"]),
  e(2002, "TokenInvalid", 401, "A", "token", "Token tidak valid", "Token tidak valid", "Token otorisasi rusak, expired, atau tidak terdaftar", ["Masa berlaku (exp)", "Penerbit (iss) dan penerima yang dituju (aud)", "Kebijakan aplikasi", "Dapatkan token baru jika perlu"], "Token yang bisa di-decode belum tentu valid."),
  e(2003, "TokenSignatureInvalid", 401, "A", "token", "Tanda tangan salah", "Tanda tangan token tidak valid", "Tanda tangan token gagal diverifikasi", ["Token tidak berubah setelah diterbitkan", "Kunci verifikasi yang dipakai", "Pembaruan kunci sudah terbaca"], "Jangan menonaktifkan verifikasi."),
  e(2004, "TokenMalformed", 401, "A", "identitas", "Token rusak", "Format token tidak dikenali", "Struktur token tidak dapat dibaca", ["Token terpotong atau salah salin", "Format token didukung"]),
  e(2007, "AuthorizationHeaderMissing", 401, "A", "identitas", "Header tidak ada", "Header otorisasi tidak ditemukan", "Header Authorization wajib dikirim", ["Header ada sesuai kontrak API"]),
  e(2008, "AuthorizationHeaderFormat", 401, "A", "identitas", "Format header salah", "Format header otorisasi salah", "Gunakan format: Bearer <token>", ["Skema (Bearer) dan spasi", "Nilai token setelah skema"]),
  // B. access
  e(2006, "AuthorizationError", 403, "B", "akses", "Izin ditolak", "Akses ditolak", "Pemeriksaan izin menolak akses", ["Aturan akses endpoint", "Izin pengguna"]),
  e(2009, "UserRolesNotFound", 403, "B", "akses", "Role tidak ada", "Role pengguna tidak ditemukan", "Role yang dibutuhkan tidak ada pada pengguna", ["Penetapan role", "Pemetaan klaim identitas"], "Jangan langsung memberi role admin."),
  e(2010, "ForbiddenAccess", 403, "B", "akses", "Tidak punya akses", "Tidak memiliki akses", "Pengguna tidak punya akses ke data ini", ["Hak pengguna dibanding tindakan/data yang diminta"]),
  e(2012, "IPAddressNotAllowed", 403, "B", "akses", "IP tidak diizinkan", "Alamat IP tidak diizinkan", "Alamat sumber ditolak kebijakan layanan", ["Daftar IP yang diizinkan", "Cara aplikasi menentukan IP lewat proxy tepercaya"]),
  e(2011, "InvalidRoleFormat", 500, "B", "akses", "Format role internal", "Format role tidak valid", "Bentuk role tidak sesuai harapan internal", ["Struktur role", "Pemetaan token", "Kontrak antarkomponen"]),
  // C. verifier
  e(2013, "KeycloakNotSet", 500, "C", "verifier", "JWKS belum diatur", "Konfigurasi Keycloak belum diatur", "Lokasi kunci verifikasi belum tersedia", ["KEYCLOAK_JWKS_URL di lingkungan tempat aplikasi berjalan"]),
  e(2014, "URLKeycloakNotFound", 500, "C", "verifier", "JWKS gagal diambil", "Gagal mengambil kunci verifikasi", "Kunci dari alamat JWKS tidak berhasil diambil", ["URL", "Koneksi dan DNS", "TLS", "Batas waktu", "Respons layanan"], "Namanya tidak otomatis berarti HTTP 404."),
  e(2015, "KeycloakHeaderInvalid", 500, "C", "verifier", "kid tidak ada", "Header token tidak sesuai", "Token tidak punya kid yang diharapkan aplikasi", ["Header token", "Aturan verifier"], "Jangan melewati pemeriksaan tanda tangan."),
  // D. data
  e(3001, "MissingRequiredField", 400, "D", "data", "Field wajib hilang", "Field wajib tidak ditemukan", "Field jumlah wajib diisi", ["Body dan parameter", "Nama field", "Beda tidak ada, null, dan kosong menurut kontrak"]),
  e(3002, "InvalidFieldFormat", 400, "D", "data", "Format field salah", "Format field tidak valid", "Field jumlah harus bilangan bulat", ["Tipe data", "Pola dan rentang nilai", "Aturan validasi"]),
  // E. file storage
  e(4001, "StorageInitialization", 500, "E", "file", "Storage belum siap", "Penyimpanan belum siap", "Komponen penyimpanan gagal disiapkan", ["Konfigurasi dan kredensial", "Endpoint storage", "Proses inisialisasi"]),
  e(4002, "FileAlreadyExists", 400, "E", "file", "File sudah ada", "File sudah ada", "Checksum file sudah tercatat", ["Aturan duplikasi berdasarkan isi file"], "Nama berbeda belum tentu isi berbeda. Jangan otomatis menyarankan menghapus file lama."),
  // F. database
  e(7001, "DatabaseConnection", 500, "F", "db", "Koneksi gagal", "Gagal terhubung ke database", "Koneksi ke database gagal", ["Layanan database", "Alamat dan port", "Kredensial dan TLS", "Jaringan", "Kapasitas koneksi"]),
  e(7002, "DatabaseInitialization", 500, "F", "db", "Inisialisasi gagal", "Database gagal disiapkan", "Komponen koneksi belum berhasil disiapkan", ["Urutan startup", "Konfigurasi", "Penanganan hasil inisialisasi"]),
  e(7003, "DatabaseInstanceNotFound", 500, "F", "db", "Instance tidak ada", "Instance database tidak ditemukan", "Referensi koneksi tidak tersedia", ["Registrasi koneksi", "Pemilihan instance"], "Bukan berarti baris data tidak ditemukan."),
  e(7004, "DatabaseClose", 500, "F", "db", "Gagal menutup", "Gagal menutup koneksi database", "Penutupan sumber daya database gagal", ["Siklus hidup koneksi", "Log"], "Jangan menganggap operasi sebelumnya pasti batal."),
  e(7005, "DatabaseMigration", 500, "F", "db", "Migrasi gagal", "Migrasi database gagal", "Pembaruan struktur database gagal", ["Versi migrasi", "Izin dan SQL", "Lock", "Kesesuaian skema"], "Hindari mengulang tanpa memeriksa keadaan terakhir."),
  e(7013, "QueryData", 500, "F", "db", "Baca gagal", "Gagal membaca data", "Query data gagal diproses", ["Query dan parameter", "Skema", "Timeout", "Koneksi"], "Hasil kosong tidak otomatis berarti error ini."),
  e(7014, "InsertData", 500, "F", "db", "Tambah gagal", "Gagal menambah data", "Penambahan data gagal diproses", ["Constraint", "Tipe data", "Izin", "Transaksi"], "Pastikan apakah data sempat tersimpan sebelum mencoba ulang."),
  e(7015, "UpdateData", 500, "F", "db", "Ubah gagal", "Gagal mengubah data", "Perubahan data gagal diproses", ["Kondisi pencarian", "Constraint", "Konflik transaksi", "Jumlah baris yang berubah"]),
  e(7016, "DeleteData", 500, "F", "db", "Hapus gagal", "Gagal menghapus data", "Penghapusan data gagal diproses", ["Relasi", "Izin", "Transaksi", "Kondisi penghapusan"], "Nol baris terhapus belum tentu kegagalan."),
  // G. search
  e(7006, "ElasticConnection", 500, "G", "search", "Koneksi gagal", "Gagal terhubung ke Elasticsearch", "Koneksi ke layanan pencarian gagal", ["Alamat dan layanan", "Autentikasi dan TLS", "Jaringan", "Timeout"]),
  e(7007, "ElasticNotInitialized", 500, "G", "search", "Klien belum siap", "Elasticsearch belum diinisialisasi", "Klien pencarian belum siap", ["Konfigurasi", "Urutan startup"]),
  e(7008, "ElasticClose", 500, "G", "search", "Gagal menutup", "Gagal menutup klien Elasticsearch", "Penutupan sumber daya pencarian gagal", ["Proses shutdown", "Pengelolaan sumber daya klien"]),
  e(7010, "ElasticIndexing", 500, "G", "search", "Indexing gagal", "Gagal memasukkan dokumen", "Dokumen gagal dimasukkan ke indeks pencarian", ["Mapping dan tipe field", "Izin", "Rincian kegagalan; pada bulk, hasil tiap item"], "Indexing di sini = memasukkan dokumen ke indeks pencarian, bukan membuat indeks kolom database."),
  e(7011, "QueriesElastic", 500, "G", "search", "Pencarian gagal", "Pencarian gagal", "Permintaan pencarian ke Elasticsearch gagal", ["Sintaks", "Nama indeks", "Izin", "Timeout dan respons layanan"]),
  e(7012, "InvalidQueryType", 500, "G", "search", "Tipe query", "Tipe query tidak didukung", "Jenis query tidak didukung implementasi ini", ["Pilihan query dan pembentuk query", "Berasal dari input pengguna atau kesalahan internal?"]),
  // H. response and general
  e(7009, "FailedMarshalJSON", 500, "H", "json", "Gagal susun JSON", "Gagal mengubah data menjadi JSON", "Data internal gagal diubah menjadi JSON", ["Tipe atau nilai yang tidak didukung", "Kode serializer"], "Bukan otomatis masalah JSON dari pengguna. Marshal: data internal → JSON."),
  e(1000, "InternalServer", 500, "H", "proses", "Error internal", "Terjadi kesalahan pada server", "Kegagalan internal yang belum diklasifikasikan", ["Log dengan request ID dan waktu kejadian"]),
];

export const errorBy = (code: number) => ERRORS.find((x) => x.code === code)!;
export const ofGroup = (g: Group) => ERRORS.filter((x) => x.group === g);
