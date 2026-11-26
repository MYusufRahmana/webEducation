import type { Lesson } from "../types";

/**
 * Sharding lesson (Indonesian) for readers new to databases. References: Microsoft Azure Architecture
 * Center, "Sharding pattern"; MongoDB manual, "Choose a shard key". The figure is a local simulation of
 * the concept, not a database. The even/odd rule is a learning example, not production advice.
 */

const CREATE = `CREATE DATABASE latihan_tiket_a;
CREATE DATABASE latihan_tiket_b;

CREATE TABLE latihan_tiket_a.pesanan (
    kode_pesanan VARCHAR(20) PRIMARY KEY,
    id_pengguna INT NOT NULL,
    nama_konser VARCHAR(100) NOT NULL,
    INDEX idx_pengguna (id_pengguna)
);

CREATE TABLE latihan_tiket_b.pesanan
LIKE latihan_tiket_a.pesanan;`;

const INSERT = `-- Andi: ID 101, ganjil → B
INSERT INTO latihan_tiket_b.pesanan
VALUES ('TKT-001', 101, 'Konser Senja');

-- Budi: ID 102, genap → A
INSERT INTO latihan_tiket_a.pesanan
VALUES ('TKT-002', 102, 'Konser Senja');`;

const SELECT = `SELECT *
FROM latihan_tiket_b.pesanan
WHERE id_pengguna = 101;`;

const PHP = `function pilihDatabase(int $idPengguna): string
{
    return $idPengguna % 2 === 0
        ? 'latihan_tiket_a'
        : 'latihan_tiket_b';
}

echo pilihDatabase(101); // latihan_tiket_b
echo pilihDatabase(102); // latihan_tiket_a`;

const REPORT = `SELECT 'A' AS shard, COUNT(*) AS jumlah FROM latihan_tiket_a.pesanan
UNION ALL
SELECT 'B', COUNT(*) FROM latihan_tiket_b.pesanan;`;

export const SHARD_LESSON: Lesson = {
  category: "data",
  outcomes: [
    "Menjelaskan sharding sebagai pembagian data ke beberapa bagian (shard) dengan aturan yang jelas.",
    "Menjelaskan peran shard key dalam menyimpan dan mencari data, serta biaya laporan lintas shard.",
    "Membedakan jumlah data tersimpan dengan beban kerja, dan mengenali kapan sharding belum perlu.",
  ],
  steps: [
    {
      key: "satu-tempat",
      short: "Satu tempat",
      title: "Semua pesanan masuk ke satu tempat",
      kind: "Masalah",
      body: [
        "Website menjual tiket dari banyak konser. Setiap pembelian menghasilkan satu catatan pesanan, dan semuanya disimpan di {{single|satu database}}.",
        "Andi, Budi, Sinta, dan Rina membeli tiket. {{app|Aplikasi tiket}} menerima pesanan mereka lalu menulis semuanya ke tempat yang sama.",
        "Di samping database ada {{cards|daftar isinya}}: kode pesanan, nama, dan ID pengguna.",
      ],
      analogy: "Setiap pembelian menghasilkan satu berkas. Semua berkas disimpan di satu ruang arsip dan dilayani satu petugas.",
      observe: "Empat kartu “ID …” bergerak dari pembeli ke aplikasi, lalu ke database. Daftar isi bertambah dari 0 menjadi 4 pesanan. Tekan “Buat pesanan” untuk menambah lagi.",
      changes: ["Tempat penyimpanan: 1", "Pesanan tersimpan: 4"],
      idea: "Awalnya satu database menanggung semua penyimpanan dan semua pekerjaan.",
    },
    {
      key: "mulai-penuh",
      short: "Mulai penuh",
      title: "Pekerjaan satu database terus bertambah",
      kind: "Masalah",
      body: [
        "Database tidak hanya menyimpan. Ia juga melayani pembuatan pesanan, pencarian riwayat, dan pembaruan status, semuanya bersamaan.",
        "Di simulasi ini satu database mengerjakan paling banyak dua permintaan sekaligus. Saat permintaan datang lebih cepat dari itu, sisanya {{gauges|menunggu}}.",
        "Jika kapasitas satu server mulai menjadi batas, salah satu pendekatannya adalah membagi data dan pekerjaan ke beberapa server. Cara ini disebut sharding.",
      ],
      analogy: "Antrean di depan satu petugas arsip memanjang. Petugas sudah bekerja secepat yang ia bisa.",
      observe: "Penunjuk “Diproses” terisi penuh sampai garis batas, dan kotak kuning “menunggu” bertambah. Lampu di atas lemari terus menyala dan laci atasnya terus terbuka.",
      changes: ["Diproses: 2 (batas)", "Menunggu: bertambah"],
      idea: "Ketika satu server menjadi batas, data dan pekerjaannya bisa dibagi.",
    },
    {
      key: "aturan",
      short: "Aturan",
      title: "Bagi pesanan dengan aturan yang jelas",
      kind: "Analogi",
      body: [
        "Pengelola menyiapkan dua tempat penyimpanan. Setiap bagian disebut {{shardA|shard}}: {{shardA|Shard A}} untuk pengguna ber-ID genap, dan {{shardB|Shard B}} untuk ID ganjil.",
        "Nilai yang dipakai untuk menentukan lokasi data disebut {{rule|shard key}}. Di contoh ini shard key-nya adalah id_pengguna.",
        "Pemilihan shard key perlu mempertimbangkan pemerataan beban dan cara aplikasi mencari data. Aturan genap–ganjil hanya contoh belajar, bukan aturan yang selalu tepat untuk produksi.",
      ],
      analogy: "Ada dua ruang arsip. Di depannya, petugas pengarah membaca ID pembeli lalu menunjuk ruang yang sesuai.",
      observe: "Papan aturan menyorot satu per satu: Andi 101 → B, Budi 102 → A, Sinta 103 → B, Rina 104 → A. Klik nama pembeli untuk mencoba sendiri.",
      changes: ["Shard: A dan B", "Shard key: id_pengguna"],
      idea: "Shard key menentukan di shard mana sebuah data disimpan.",
      more: [
        "Pembagian lain yang sering dipakai: rentang nilai (misalnya ID 1–1.000 di A), hash dari shard key, atau tabel pemetaan (directory) yang mencatat lokasi tiap kelompok data.",
      ],
    },
    {
      key: "pesanan-andi",
      short: "Pesanan Andi",
      title: "Pesanan Andi disimpan di Shard B",
      kind: "Proses",
      body: [
        "Andi membeli tiket. Setelah pesanan boleh dicatat, {{app|aplikasi}} memeriksa ID Andi: 101.",
        "101 adalah bilangan ganjil, jadi menurut {{rule|aturan}} pesanan ini ditulis ke {{shardB|Shard B}}. Shard A tidak ikut bekerja.",
      ],
      analogy: "Petugas membaca angka 101 di berkas Andi, melihat papan aturan, lalu menyimpan berkasnya di Arsip B.",
      observe: "Kartu “ID 101” berhenti sebentar di aplikasi, lalu muncul tanda “ID 101 ganjil → Shard B”. Kartu bergerak ke B, dan TKT-005 muncul sebagai baris baru di daftar isi B.",
      changes: ["Shard B: +1 pesanan", "Shard A: tidak berubah"],
      idea: "Aplikasi memakai shard key untuk memilih satu shard tujuan.",
    },
    {
      key: "pesanan-budi",
      short: "Pesanan Budi",
      title: "Pesanan Budi disimpan di Shard A",
      kind: "Proses",
      body: [
        "Budi membeli tiket untuk konser yang sama. ID Budi 102, bilangan genap, jadi pesanannya ditulis ke {{shardA|Shard A}}.",
        "Kedua shard memakai struktur tabel yang sama. Yang berbeda hanya isinya: Shard A menyimpan pesanan pengguna ber-ID genap, Shard B yang ber-ID ganjil.",
      ],
      analogy: "Bentuk berkasnya sama. Hanya lemari penyimpanannya yang berbeda.",
      observe: "Kali ini kartu bergerak ke atas, ke A. TKT-006 muncul di daftar isi A, sedangkan daftar isi B tetap.",
      changes: ["Shard A: +1 pesanan"],
      idea: "Setiap shard berisi sebagian data, dengan struktur yang sama.",
    },
    {
      key: "riwayat-andi",
      short: "Cari kembali",
      title: "Riwayat Andi hanya dicari di Shard B",
      kind: "Proses",
      body: [
        "Andi membuka riwayat pembelian. {{app|Aplikasi}} memakai aturan yang sama: ID 101 ganjil, jadi riwayatnya pasti ada di {{shardB|Shard B}}.",
        "Aplikasi tidak perlu mencari di semua shard karena sudah tahu lokasi yang sesuai. Shard A tetap bebas melayani pengguna lain.",
      ],
      analogy: "Petugas langsung menuju Arsip B dan mengambil dua berkas Andi. Arsip A tidak dibuka.",
      observe: "Permintaan “cari 101” hanya menuju B. Dua baris Andi (TKT-001 dan TKT-005) diberi tanda ✓, lalu kartu “Riwayat Andi” muncul di atas aplikasi.",
      changes: ["Shard yang ditanya: 1", "Ditemukan: 2 pesanan"],
      idea: "Pencarian yang memakai shard key cukup menanyai satu shard.",
    },
    {
      key: "laporan",
      short: "Laporan",
      title: "Laporan seluruh penjualan menanyai semua shard",
      kind: "Proses",
      body: [
        "Pengelola meminta laporan “seluruh penjualan hari ini”. Laporan ini tidak memakai satu ID pengguna, jadi data yang dibutuhkan tersebar di semua shard.",
        "Aplikasi menanyai {{shardA|Shard A}} dan {{shardB|Shard B}}, menunggu keduanya menjawab, lalu {{report|menggabungkan hasilnya}}.",
        "Inilah salah satu tambahan pekerjaan dalam sistem sharding: query lintas shard perlu dikumpulkan dan digabungkan oleh aplikasi atau lapisan perantara.",
      ],
      analogy: "Untuk rekap harian, petugas harus mendatangi kedua ruang arsip lalu menjumlahkan hasilnya.",
      observe: "Dua kartu “hitung” berangkat bersamaan ke A dan B. Keduanya kembali membawa “A: 3” dan “B: 3”, lalu kartu laporan menulis 3 + 3 = 6 pesanan.",
      changes: ["Shard yang ditanya: 2", "Total: 6 pesanan"],
      idea: "Query tanpa shard key harus menanyai banyak shard lalu menggabungkan hasilnya.",
    },
    {
      key: "tidak-seimbang",
      short: "Tidak seimbang",
      title: "Data sama banyak, beban belum tentu sama",
      kind: "Percobaan",
      body: [
        "Kedua shard menyimpan jumlah pesanan yang sama: masing-masing 3. Lalu banyak permintaan datang dari pengguna ber-ID ganjil: Andi, Sinta, Dodi, dan Eka.",
        "Semua permintaan itu menuju {{shardB|Shard B}}. B menjadi sibuk dan antre, sementara {{shardA|Shard A}} hampir menganggur.",
        "Karena itu setiap shard punya {{gauges|dua penunjuk}}: jumlah pesanan tersimpan dan permintaan yang sedang diproses. Jumlah data yang hampir sama belum tentu berarti beban kerjanya sama.",
      ],
      analogy: "Isi kedua lemari sama tebal, tetapi hampir semua pembeli yang datang ber-ID ganjil. Petugas Arsip B kewalahan, sedangkan petugas Arsip A menganggur.",
      observe: "Bandingkan dua penunjuk di setiap daftar isi. “Tersimpan” A dan B hampir sama, tetapi “Diproses” B penuh dan B punya antrean. Coba tombol “Banyak dari ID genap”.",
      changes: ["Diproses B: penuh + antre", "Diproses A: 0"],
      idea: "Shard key yang baik membagi beban kerja, bukan hanya jumlah data.",
      more: [
        "Shard yang jauh lebih sibuk dari shard lain sering disebut hot shard. Penyebabnya bisa shard key dengan sedikit nilai berbeda, atau sekelompok kecil data yang sangat sering diakses.",
      ],
    },
    {
      key: "stok-terpisah",
      short: "Stok kursi",
      title: "Jangan sampai stok kursi ikut digandakan",
      kind: "Masalah",
      body: [
        "Di contoh ini yang dibagi adalah data pesanan berdasarkan pengguna. Stok kursi konser tidak ikut dibagi.",
        "Jika Shard A dan Shard B masing-masing punya stok sendiri untuk kursi yang sama, keduanya bisa menganggap kursi A1 masih tersedia, dan kursi itu terjual dua kali.",
        "Karena itu ketersediaan kursi diatur oleh satu {{stock|layanan stok}} terpisah. Andi dan Budi memilih kursi A1 hampir bersamaan. Layanan stok memberikan A1 kepada Andi, lalu menolak Budi.",
      ],
      analogy: "Hanya ada satu papan kursi. Petugas di meja stok mencoret A1 begitu kursi itu diambil, jadi petugas arsip tidak perlu menebak.",
      observe: "Kartu Andi dan Budi singgah di layanan stok. Kursi A1 berubah menjadi “terjual ke Andi”. Kartu Budi kembali dengan tanda “✗ A1”, dan tidak ada pesanan Budi yang tersimpan.",
      changes: ["Kursi A1: terjual ke Andi", "Budi: ditolak"],
      idea: "Sharding pesanan tidak otomatis menyelesaikan perebutan kursi.",
    },
    {
      key: "latihan-mysql",
      short: "Latihan MySQL",
      title: "Coba sendiri dengan MySQL",
      kind: "Percobaan",
      body: [
        "Latihan berikut membuat dua database dalam satu MySQL untuk memahami pembagian dan pengarahannya.",
        "Karena masih memakai satu server, latihan ini belum membagi kapasitas komputasi ke beberapa mesin. Untuk itu A dan B perlu ditempatkan di instance/server database yang berbeda, lalu aplikasi memilih koneksi masing-masing.",
      ],
      observe: "Ikuti langkah A–E di bawah. Tombol simulasi menjalankan langkah yang sama di demo lokal, bukan di MySQL.",
      idea: "Sharding = struktur tabel yang sama di beberapa tempat, ditambah aturan pengarah di aplikasi.",
      practice: [
        {
          id: "A",
          title: "Buat dua tempat penyimpanan",
          explain: ["Buat dua database dengan struktur tabel yang sama."],
          code: CREATE,
          pieces: [
            { code: "latihan_tiket_a", text: "tempat pesanan pengguna ber-ID genap.", part: "shardA" },
            { code: "latihan_tiket_b", text: "tempat pesanan pengguna ber-ID ganjil.", part: "shardB" },
            { code: "INDEX idx_pengguna", text: "indeks untuk mencari pesanan seorang pengguna." },
            { code: "LIKE", text: "menyalin struktur tabel A ke B." },
          ],
        },
        {
          id: "B",
          title: "Simpan pesanan sesuai aturan",
          code: INSERT,
          expect: "Hasil yang diharapkan: satu baris di latihan_tiket_b dan satu baris di latihan_tiket_a.",
          run: { action: "insert", label: "Simulasikan di demo lokal (bukan MySQL)" },
        },
        {
          id: "C",
          title: "Cari pesanan Andi di tempat yang tepat",
          code: SELECT,
          expect: "Hasil yang diharapkan: satu baris, TKT-001 milik ID 101.",
          run: { action: "select", label: "Simulasikan pencarian di demo lokal" },
        },
        {
          id: "D",
          title: "Aturan pemilihan di aplikasi (PHP)",
          code: PHP,
          note: "Fungsi ini hanya memilih nama database. Aplikasi tetap perlu membuka koneksi yang sesuai dan menjalankan query berparameter.",
        },
        {
          id: "E",
          title: "Laporan lintas shard",
          explain: ["Untuk menghitung semua pesanan, kedua tempat harus ditanya lalu hasilnya digabung."],
          code: REPORT,
          note: "Di sini UNION ALL bisa dipakai karena kedua database ada di server yang sama. Jika shard berada di server berbeda, aplikasi menanyai setiap server lalu menggabungkan hasilnya sendiri.",
          run: { action: "report", label: "Simulasikan laporan di demo lokal" },
        },
      ],
      more: [
        "PRIMARY KEY di setiap tabel hanya menjaga keunikan di dalam tabel itu. Keunikan kode pesanan lintas shard perlu dirancang tersendiri, misalnya dengan awalan per shard atau ID global.",
        "Membuat database baru tidak otomatis memindahkan data lama. Data yang sudah ada perlu dipindahkan dengan rencana migrasi.",
        "Menambah shard ketiga memerlukan perencanaan pemetaan dan pemindahan data. Jangan langsung mengganti % 2 menjadi % 3: hasil perhitungan berubah untuk banyak ID, sehingga aplikasi mencari di tempat yang salah.",
      ],
    },
    {
      key: "kapan-perlu",
      short: "Kapan perlu?",
      title: "Kapan perlu mempertimbangkan sharding?",
      kind: "Ringkasan",
      body: [
        "Pertimbangkan sharding ketika hasil pemantauan menunjukkan kapasitas penyimpanan atau kemampuan baca/tulis satu server menjadi batas, pertumbuhan diperkirakan berlanjut, dan query, indeks, serta konfigurasi sudah diperbaiki.",
        "Data juga perlu bisa dibagi dengan aturan yang sesuai pola akses, dan tim harus siap mengelola migrasi, backup, pemantauan, serta kegagalan beberapa shard.",
        "Tidak ada patokan universal seperti “satu juta baris pasti harus sharding”. Ukuran baris, jenis query, indeks, perangkat keras, dan aktivitas pengguna ikut menentukan.",
      ],
      observe: "Daftar periksa di diagram berisi langkah yang lebih sederhana untuk dicoba lebih dulu. Buka “Pelajari lebih lanjut” untuk melihat kapan sharding belum perlu.",
      idea: "Sharding menambah kerumitan; pakai jika langkah yang lebih sederhana tidak lagi cukup.",
      more: [
        "Pencarian lambat karena belum ada indeks yang sesuai → perbaiki query dan indeks.",
        "Banyak permintaan membaca informasi konser yang sama → evaluasi cache.",
        "Kekhawatiran utama adalah database utama rusak → rancang replikasi, failover, dan backup.",
        "Server masih punya kapasitas cukup → pertahankan arsitektur sederhana dan pantau pertumbuhannya.",
        "Sebagian besar transaksi harus mengubah data di banyak shard → evaluasi ulang pembagian, karena koordinasinya lebih rumit.",
        "Beban terbesar hanya dari satu konser yang viral → cari titik hambatnya; membagi berdasarkan konser belum tentu mengurangi beban konser tersebut.",
      ],
    },
  ],
  analogy: {
    title: "Ruang arsip dan petugas pengarah",
    mapping: [
      ["Berkas pesanan", "Baris data pesanan"],
      ["Ruang arsip / lemari", "Database / shard"],
      ["Arsip A (ID genap), Arsip B (ID ganjil)", "Shard A dan Shard B"],
      ["Nomor ID di berkas", "Shard key (id_pengguna)"],
      ["Petugas pengarah dan papan aturannya", "Logika pengarah di aplikasi"],
      ["Meja stok kursi", "Layanan stok yang terpisah"],
    ],
    limits: [
      "Petugas bisa ragu atau salah baca; logika pengarah di aplikasi selalu menghitung hal yang sama untuk ID yang sama.",
      "Lemari arsip tidak punya batas kecepatan yang pasti; batas “dua permintaan sekaligus” di simulasi hanya untuk memperlihatkan antrean.",
    ],
  },
  summary: [
    "Sharding membagi catatan ke beberapa tempat (shard); setiap shard berisi sebagian data dengan struktur yang sama.",
    "Aturan pembagian dan shard key membantu aplikasi mengetahui tempat menyimpan dan mencari data.",
    "Pencarian dengan shard key cukup menanyai satu shard; laporan menyeluruh harus menanyai semua shard lalu menggabungkan hasil.",
    "Manfaatnya bergantung pada pembagian yang tepat, bukan sekadar menambah jumlah database.",
  ],
  check: {
    question: "Shard A dan Shard B masing-masing menyimpan 1.000 pesanan. Apakah beban kerja keduanya pasti sama?",
    answer: "Tidak. Jumlah data yang sama belum tentu berarti beban kerja sama; jika kebanyakan permintaan datang dari pengguna yang datanya ada di satu shard, shard itu jauh lebih sibuk.",
  },
  simplifications: [
    "Kecepatan, batas dua permintaan sekaligus, dan antrean adalah simulasi konsep, bukan benchmark database.",
    "Aturan genap–ganjil hanya contoh belajar; sistem nyata sering memakai hash, rentang, atau tabel pemetaan.",
    "Replikasi, failover, dan pemindahan data antar shard tidak digambarkan.",
  ],
};
