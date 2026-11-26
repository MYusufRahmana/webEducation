import type { Lesson } from "../types";

/**
 * Database index lesson (Indonesian) for readers who have never used a database. Technical reference:
 * PostgreSQL documentation, chapter “Indexes” (CREATE INDEX, EXPLAIN). The figure is a local simulation,
 * not PostgreSQL. Numbers come from model.ts and scenarios.ts.
 */

const CREATE_TABLE = `CREATE TABLE pesanan (
    id INTEGER PRIMARY KEY,
    kode_pesanan VARCHAR(20),
    nama_pembeli VARCHAR(100)
);

INSERT INTO pesanan (id, kode_pesanan, nama_pembeli)
VALUES
    (1, 'TKT-103', 'Sinta'),
    (2, 'TKT-101', 'Budi'),
    (3, 'TKT-104', 'Andi'),
    (4, 'TKT-102', 'Rina');`;

const SELECT = `SELECT nama_pembeli
FROM pesanan
WHERE kode_pesanan = 'TKT-104';`;

const CREATE_INDEX = `CREATE INDEX idx_pesanan_kode
ON pesanan (kode_pesanan);`;

const EXPLAIN = `EXPLAIN
SELECT nama_pembeli
FROM pesanan
WHERE kode_pesanan = 'TKT-104';`;

export const IDX_LESSON: Lesson = {
  category: "data",
  outcomes: [
    "Menjelaskan mengapa mencari tanpa indeks berarti memeriksa catatan satu per satu.",
    "Menjelaskan indeks sebagai struktur penunjuk tambahan, serta manfaat dan biayanya.",
    "Membuat indeks sederhana dengan PostgreSQL dan memeriksa rencana pencarian dengan EXPLAIN.",
  ],
  steps: [
    {
      key: "andi-mencari",
      short: "Andi mencari",
      title: "Andi mencari pesanannya",
      kind: "Masalah",
      body: [
        "Andi membuka halaman “Pesanan saya” dan mengetik kode TKT-104. Website lalu meminta {{table|database}} menemukan catatan pesanan dengan kode itu.",
        "Di database ada banyak catatan pesanan, tersusun tidak berurutan. Bagaimana database menemukan yang cocok?",
      ],
      analogy: "Andi datang ke loket. Petugas punya lemari berisi berkas pesanan yang tersimpan tanpa urutan.",
      observe: "Kartu “Cari TKT-104” ada di kiri, dan delapan kartu pesanan ada di kanan. Kodenya tidak berurutan. Tekan “Cari pesanan”.",
      changes: ["Pencarian: TKT-104", "8 catatan pesanan"],
      idea: "Website perlu menemukan satu catatan yang cocok dengan kode yang dicari.",
    },
    {
      key: "satu-per-satu",
      short: "Satu per satu",
      title: "Periksa catatan satu per satu",
      kind: "Proses",
      body: [
        "Tanpa petunjuk apa pun, database memeriksa {{rows|setiap catatan}} dari awal sampai akhir. Kode TKT-104 bisa saja ada lebih dari sekali, jadi pemeriksaan berlanjut sampai catatan terakhir.",
        "Hasilnya pesanan Andi, tetapi semua catatan sudah diperiksa.",
      ],
      analogy: "Petugas membuka berkas satu per satu dan membaca nomornya, sampai lemari habis diperiksa.",
      observe: "Sorotan berpindah dari kartu ke kartu. Penghitung “Kartu data diperiksa” naik sampai 8, dan kartu milik Andi diberi tanda ✓.",
      changes: ["Kartu data diperiksa: 8", "Hasil: Andi"],
      idea: "Tanpa indeks, mencari berarti memeriksa catatan satu per satu.",
    },
    {
      key: "semakin-banyak",
      short: "Makin banyak",
      title: "Bagaimana jika catatannya semakin banyak?",
      kind: "Masalah",
      body: [
        "Penjualan tiket terus berjalan. Di belakang delapan kartu ini kini ada {{pile|992 catatan lain}}.",
        "Mencari dengan cara yang sama berarti memeriksa seribu catatan untuk satu pencarian. Jika banyak orang mencari bersamaan, pekerjaan database ikut menumpuk.",
      ],
      analogy: "Lemari berkas bertambah menjadi deretan lemari panjang. Petugas harus membuka semuanya.",
      observe: "Setelah delapan kartu, tumpukan “992 catatan lain” ikut disorot. Penghitung melompat ke 1.000 kartu diperiksa.",
      changes: ["Kartu data diperiksa: 1.000"],
      idea: "Semakin banyak catatan, semakin banyak pekerjaan untuk pencarian satu per satu.",
    },
    {
      key: "buat-katalog",
      short: "Buat indeks",
      title: "Tambahkan katalog penunjuk",
      kind: "Proses",
      body: [
        "Database bisa menyiapkan struktur tambahan: [[indeks|indeks]]. Database membaca {{column|kode pesanan}} dari setiap catatan, menyusunnya berurutan, lalu mencatat {{pointer|penunjuk}} ke lokasi catatan aslinya.",
        "Catatan di tabel tidak dipindahkan. Yang tersusun rapi hanya indeksnya.",
      ],
      analogy: "Petugas membuat katalog nomor pesanan: setiap nomor ditulis berurutan beserta letak berkasnya di lemari.",
      observe: "Satu per satu kode dibaca dari kartu dan masuk ke indeks di tengah, langsung di posisi urutnya. Kartu-kartu di tabel tetap di tempatnya.",
      changes: ["Indeks: 8 penunjuk, kode berurutan", "Tabel: tidak berubah urutan"],
      idea: "Indeks adalah struktur tambahan berisi kode yang terurut dan penunjuk ke data aslinya.",
      more: ["Di PostgreSQL, indeks bawaan berbentuk pohon (B-tree), bukan daftar datar. Gambaran daftar di sini adalah penyederhanaan."],
    },
    {
      key: "cari-lewat-indeks",
      short: "Cari lewat indeks",
      title: "Cari melalui indeks",
      kind: "Proses",
      body: [
        "Sekarang database mencari TKT-104 di indeks. Karena kodenya berurutan, database bisa mulai dari tengah lalu memilih separuh yang mungkin berisi kode itu.",
        "Setelah kodenya ketemu, database mengikuti penunjuk dan mengambil satu kartu data: pesanan Andi.",
      ],
      analogy: "Petugas membuka katalog di tengah, membandingkan nomor, membalik ke depan atau belakang, lalu langsung mengambil berkas dari lemari.",
      observe: "Langkah berlabel “Penelusuran indeks” menyorot beberapa kode di indeks. Lalu garis penunjuk menuju kartu Andi, berlabel “Kartu data diambil”.",
      changes: ["Penelusuran indeks: 3 langkah", "Kartu data diambil: 1"],
      idea: "Dengan indeks, database menelusuri penunjuk lalu mengambil data yang cocok, bukan memeriksa semuanya.",
    },
    {
      key: "bandingkan",
      short: "Bandingkan",
      title: "Bandingkan sendiri",
      kind: "Percobaan",
      body: [
        "Cari kode yang sama dengan dua cara: tanpa indeks dan dengan indeks. Hasilnya harus sama.",
        "Coba juga kode lain dengan tombol di diagram, termasuk TKT-110 yang tidak ada. Angkanya menghitung langkah dalam simulasi ini, bukan hasil uji kecepatan database sungguhan.",
      ],
      observe: "Kartu perbandingan mencatat, untuk setiap pencarian, jumlah kartu data diperiksa, langkah indeks, kartu diambil, dan hasilnya.",
      changes: ["Tanpa indeks: 8 kartu diperiksa", "Dengan indeks: 3 langkah indeks + 1 kartu diambil"],
      idea: "Hasilnya sama; yang berbeda adalah cara dan jumlah pekerjaannya.",
    },
    {
      key: "pelihara-indeks",
      short: "Indeks dipelihara",
      title: "Indeks perlu dipelihara",
      kind: "Proses",
      body: [
        "Lala membeli tiket, dan pesanan TKT-109 masuk. Kartunya ditambahkan ke tabel, lalu indeks juga harus diperbarui dengan penunjuk baru di posisi urutnya.",
        "Indeks memakan ruang dan menambah pekerjaan setiap kali data berubah. Jadi indeks dibuat untuk pencarian yang memang sering dilakukan.",
      ],
      analogy: "Setiap berkas baru disimpan di lemari, dan petugas juga harus menulis nomornya di katalog.",
      observe: "Tombol “Tambah pesanan” menambah kartu TKT-109 di tempat kosong berikutnya di tabel. Sesaat kemudian penunjuk baru muncul di indeks di antara TKT-108 dan akhir daftar.",
      changes: ["Tabel: 9 catatan", "Indeks: 9 penunjuk"],
      idea: "Pilih indeks sesuai kebutuhan pencarian; setiap indeks punya biaya ruang dan perawatan.",
      more: ["Indeks tidak otomatis mempercepat semua query. Database sendiri yang menilai apakah indeks layak dipakai untuk sebuah pencarian."],
    },
    {
      key: "latihan-sql",
      short: "Latihan SQL",
      title: "Coba membuat indeks",
      kind: "Percobaan",
      body: ["Latihan ini memakai PostgreSQL. Salin setiap langkah ke database latihanmu sendiri. Diagram di sini hanya simulasi lokal untuk membantu membayangkan prosesnya."],
      observe: "Klik bagian perintah di langkah C untuk menyorot tabel atau kolom di diagram. Tombol simulasi menjalankan proses di demo lokal, bukan di PostgreSQL.",
      idea: "Query pencarian tidak perlu diubah setelah indeks dibuat; database yang memutuskan memakai indeks atau tidak.",
      practice: [
        {
          id: "A",
          title: "Buat tabel dan data",
          explain: ["Buat tabel pesanan berisi empat baris contoh."],
          code: CREATE_TABLE,
          note: "PRIMARY KEY pada id umumnya sudah punya indeks sendiri. Latihan ini menambahkan indeks pada kolom lain: kode_pesanan.",
        },
        {
          id: "B",
          title: "Cari pesanan",
          explain: ["Cari nama pembeli dengan kode TKT-104."],
          code: SELECT,
          expect: "Hasil yang diharapkan: satu baris dengan nama_pembeli = Andi.",
          run: { action: "search-scan", label: "Jalankan simulasi di demo lokal (bukan PostgreSQL)" },
        },
        {
          id: "C",
          title: "Buat indeks",
          code: CREATE_INDEX,
          pieces: [
            { code: "CREATE INDEX", text: "membuat indeks." },
            { code: "idx_pesanan_kode", text: "nama indeks, bebas tetapi sebaiknya jelas." },
            { code: "pesanan", text: "tabel yang diberi indeks.", part: "table" },
            { code: "kode_pesanan", text: "kolom yang diindeks.", part: "column" },
          ],
          note: "Indeks biasa tidak membuat kode_pesanan menjadi unik. Untuk itu ada UNIQUE.",
          run: { action: "build", label: "Simulasikan pembuatan indeks di demo lokal" },
        },
        {
          id: "D",
          title: "Gunakan query yang sama",
          explain: ["Jalankan lagi query dari langkah B tanpa perubahan apa pun. Kamu tidak perlu menyebut nama indeks di query."],
          code: SELECT,
          run: { action: "search-index", label: "Simulasikan pencarian lewat indeks di demo lokal" },
        },
        {
          id: "E",
          title: "Periksa rencana pencarian",
          explain: ["EXPLAIN menunjukkan rencana pencarian yang dipilih database."],
          code: EXPLAIN,
          note: "Karena tabel latihan hanya berisi empat baris, database mungkin tetap memilih membaca tabel langsung (Seq Scan). Ini wajar dan bukan berarti indeks gagal dibuat. Hasil EXPLAIN di komputermu bisa berbeda.",
        },
      ],
    },
  ],
  analogy: {
    title: "Lemari berkas dan katalog",
    mapping: [
      ["Lemari berkas", "Tabel pesanan"],
      ["Satu berkas", "Satu baris data"],
      ["Nomor pesanan", "Kolom kode_pesanan"],
      ["Katalog penunjuk", "Indeks"],
      ["Permintaan Andi", "Query pencarian"],
    ],
    limits: [
      "Katalog di sini digambar sebagai daftar datar; indeks database sungguhan biasanya berbentuk pohon (B-tree).",
      "Petugas bisa salah baca; database selalu memeriksa nilai yang ditemukan sebelum mengembalikan hasil.",
    ],
  },
  summary: [
    "Indeks membantu database menemukan data melalui penunjuk, sehingga tidak selalu perlu memeriksa seluruh catatan.",
    "Indeks adalah struktur tambahan; tabel tidak diurutkan ulang dan indeks bukan cache hasil pencarian.",
    "Indeks butuh ruang dan ikut diperbarui saat data berubah, jadi buat indeks sesuai kebutuhan pencarian.",
    "Database sendiri yang memutuskan apakah indeks dipakai untuk sebuah query.",
  ],
  check: {
    question: "Setelah membuat indeks pada kode_pesanan, apakah semua jenis pencarian otomatis menjadi lebih cepat?",
    answer: "Tidak. Manfaat indeks bergantung pada kolom, bentuk pencarian, dan rencana yang dipilih database.",
  },
  simplifications: [
    "Jumlah langkah dan tempo animasi adalah simulasi konsep, bukan benchmark database sungguhan.",
    "Indeks digambar sebagai daftar kode yang terurut; PostgreSQL memakai pohon B-tree secara bawaan.",
    "Pencarian tanpa indeks dibuat memeriksa semua catatan untuk menemukan semua kecocokan.",
  ],
};
