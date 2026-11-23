import type { Lesson } from "../types";

/**
 * Cache lesson (Indonesian). Pattern: cache-aside on one application server. All numbers and
 * answers come from model.ts and scenarios.ts.
 */
export const CACHE_LESSON: Lesson = {
  category: "data",
  outcomes: [
    "Menjelaskan apa itu cache dan mengapa data yang sering diminta disimpan di memori cepat.",
    "Membedakan cache miss dan cache hit, serta dampaknya pada pembacaan database.",
    "Menjelaskan mengapa cache perlu diperbarui dan mengapa pembelian kursi tetap diputuskan database.",
  ],
  steps: [
    {
      key: "pertanyaan-sama",
      short: "Pertanyaan sama",
      title: "Semua orang menanyakan hal yang sama",
      kind: "Masalah",
      body: [
        "Penjualan tiket konser dibuka. Banyak {{client|pengunjung}} membuka halaman konser dan bertanya hal yang mirip: jadwal, lokasi, harga kategori, dan denah kursi.",
        "Pertanyaannya berbeda, tetapi {{server|server}} sebenarnya membutuhkan data yang sama: informasi acara konser-01.",
      ],
      observe: "P1 menanyakan jadwal, P2 lokasi, P3 harga kategori. Ketiga permintaan membutuhkan data yang sama: info acara.",
      changes: ["Tiga permintaan berbeda, satu data yang sama"],
      idea: "Permintaan yang berbeda bisa membutuhkan data yang sama.",
      more: ["Untuk menjaga penjelasan sederhana, demonstrasi memakai satu server aplikasi. Pola yang sama dipakai pada banyak server; biasanya cache dibagi bersama, misalnya lewat Redis."],
    },
    {
      key: "database-mengulang",
      short: "Database mengulang",
      title: "Database mengulang pekerjaan yang sama",
      kind: "Masalah",
      body: [
        "Tanpa cache, setiap pertanyaan jadwal membuat server membaca {{db|database}} lagi, padahal jawabannya sama.",
        "Saat pengunjung bertambah, pekerjaan berulang ini ikut menumpuk dan menyita waktu database yang juga harus mencatat pemesanan.",
      ],
      observe: "Setiap permintaan menempuh perjalanan penuh: pengunjung → server → database → server → pengunjung. Penghitung “Pembacaan database” naik menjadi 3.",
      changes: ["Pembacaan database: 0 → 3", "Tiga jawaban yang sama"],
      idea: "Pertanyaan berulang dapat menghasilkan pekerjaan database yang berulang.",
    },
    {
      key: "siapkan-cache",
      short: "Siapkan cache",
      title: "Tambahkan tempat salinan cepat",
      kind: "Proses",
      body: [
        "Server menyiapkan {{cache|cache}} di memori: tempat menyimpan salinan data agar dapat diambil kembali dengan cepat.",
        "Cache punya jalurnya sendiri ke server. Server yang memutuskan kapan memeriksa cache dan kapan membaca database. Saat ini cache masih kosong.",
      ],
      analogy: "Seperti petugas informasi yang menyiapkan rak di mejanya untuk salinan jadwal, supaya tidak bolak-balik ke ruang arsip.",
      observe: "Cache muncul di belakang server dengan dua lajur sendiri, dan labelnya “kosong”. Cache tidak berada di antara server dan database.",
      changes: ["Cache muncul · isi: kosong"],
      idea: "Cache menyimpan salinan data untuk mempercepat akses berikutnya.",
      more: ["Pola ini disebut cache-aside: aplikasi memeriksa cache, membaca database bila perlu, lalu mengisi cache sendiri."],
    },
    {
      key: "cache-miss",
      short: "Cache miss",
      title: "Pertama kali: cache miss",
      kind: "Proses",
      body: [
        "P4 menanyakan jadwal. Server memeriksa cache, tetapi salinannya belum ada: inilah [[miss|cache miss]].",
        "Server lalu membaca database, menyimpan salinan ke cache, dan baru menjawab pengunjung. Cache tidak meneruskan permintaan ke database; server yang mengambilnya.",
      ],
      observe: "Urutannya: Cek cache → “belum ada” → Baca database → Simpan salinan → Jawaban. Cache kini berisi jadwal 19.00.",
      changes: ["Cache miss: 1 · Pembacaan database: 1", "Cache: kosong → jadwal 19.00"],
      idea: "Cache miss masih membutuhkan pengambilan dari sumber data.",
    },
    {
      key: "cache-hit",
      short: "Cache hit",
      title: "Berikutnya: cache hit",
      kind: "Proses",
      body: [
        "P5 dan P6 menanyakan jadwal yang sama. Salinannya sudah ada, jadi server menjawab dari cache: inilah [[hit|cache hit]].",
        "Database tetap ada di tempatnya, tetapi tidak ada token yang menuju ke sana. Satu kali pembacaan tadi kini membantu menjawab banyak pertanyaan.",
      ],
      observe: "Token hanya bergerak pengunjung → server → cache → server → pengunjung. Cache hit naik ke 2; pembacaan database tetap 1.",
      changes: ["Cache hit: 0 → 2", "Pembacaan database tetap 1"],
      idea: "Satu salinan dapat membantu menjawab banyak permintaan yang sama.",
    },
    {
      key: "perbarui-salinan",
      short: "Perbarui salinan",
      title: "Jadwal berubah, salinan perlu diperbarui",
      kind: "Proses",
      body: [
        "{{admin|Panitia}} mengubah waktu konser dari 19.00 menjadi 20.00. Catatan resmi di database berubah lebih dulu; salinan di cache tidak ikut berubah dengan sendirinya.",
        "Sampai server menghapus salinan lama ([[invalidasi|invalidasi]]), pengunjung masih bisa mendapat jadwal lama. Setelah dihapus, permintaan berikutnya mengambil jadwal baru.",
      ],
      observe: "Database menjadi 20.00, tetapi P7 masih menerima 19.00 dari cache (jadwal lama). Server menghapus salinan; P8 mengalami miss dan menerima 20.00.",
      changes: ["Database: 19.00 → 20.00", "P7: jadwal lama dari cache", "Salinan dihapus → P8: 20.00"],
      idea: "Data cepat harus tetap dikelola agar tidak terus memberikan jawaban lama.",
      more: ["Setiap salinan juga diberi [[ttl|TTL]]: batas lama salinan boleh dipakai. Setelah TTL habis, salinan dianggap tidak ada dan diambil ulang. TTL membatasi lamanya jawaban lama, tetapi tidak menjamin setiap perubahan langsung terlihat."],
    },
    {
      key: "lihat-vs-beli",
      short: "Lihat vs beli",
      title: "Melihat kursi berbeda dengan membeli kursi",
      kind: "Percobaan",
      body: [
        "Denah kursi boleh diambil dari cache. Namun, saat P10 dan P11 sama-sama memesan A12, server memeriksa dan mencatat reservasi lewat [[transaksi|transaksi]] di database, bukan dari salinan.",
        "Gambar kursi tersedia bukan jaminan kursi masih bisa dibeli.",
      ],
      observe: "P9 melihat denah dari cache: A12 tersedia. P10 berhasil memesan A12, P11 mendapat “sudah dipesan”. Server menghapus salinan denah, sehingga P12 melihat A12 terisi.",
      changes: ["A12: satu reservasi berhasil, satu ditolak", "Salinan denah dihapus → diambil ulang"],
      idea: "Cache mempercepat informasi; transaksi menentukan apakah pembelian diterima.",
      more: ["Data pribadi, seperti isi keranjang atau tiket milik seseorang, tidak boleh disimpan pada satu key publik yang dibaca semua pengunjung."],
    },
  ],
  analogy: {
    title: "Meja informasi konser",
    mapping: [
      ["Pengunjung bertanya", "Client mengirim request"],
      ["Petugas informasi", "Server aplikasi"],
      ["Arsip resmi acara", "Database"],
      ["Salinan jadwal di meja petugas", "Cache di memori"],
      ["Membaca salinan di meja", "Cache hit"],
      ["Salinan belum tersedia", "Cache miss"],
      ["Mengganti salinan lama", "Invalidasi atau pembaruan cache"],
    ],
    limits: [
      "Membaca salinan tidak menghabiskannya; satu salinan bisa dibaca berkali-kali.",
      "Salinan dapat tertinggal ketika informasi resmi berubah.",
      "Cache bukan pengganti database atau backup permanen; isinya boleh hilang kapan saja.",
    ],
  },
  summary: [
    "Cache menyimpan salinan data yang sering dibaca di memori cepat.",
    "Cache miss: server membaca database, menyimpan salinan, lalu menjawab.",
    "Cache hit: server menjawab dari salinan tanpa membaca database, sehingga pembacaan database berkurang.",
    "Perubahan data resmi tidak otomatis memperbarui cache; salinan perlu dihapus atau diperbarui, dan TTL membatasi umurnya.",
    "Pembelian kursi diputuskan oleh transaksi di database, bukan oleh salinan di cache.",
  ],
  simplifications: [
    "Satu server aplikasi dan satu cache; tidak ada Redis atau database sungguhan.",
    "Permintaan dibuat berurutan agar hit dan miss mudah diikuti. Banyak miss serentak saat cache kosong (cache stampede) adalah materi lanjutan.",
    "Waktu diperlambat untuk demonstrasi; tidak ada angka kecepatan nyata yang diklaim.",
    "Cache tidak menghilangkan semua kemacetan dan tidak membuat pembelian otomatis lebih cepat.",
  ],
};
