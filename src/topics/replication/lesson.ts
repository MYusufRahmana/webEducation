import type { Lesson } from "../types";

/**
 * Database replication lesson (Indonesian). Technical reference: PostgreSQL documentation,
 * chapters "High Availability, Load Balancing, and Replication" (streaming replication, failover)
 * and "Transactions". All numbers come from model.ts and scenarios.ts.
 */
export const REPL_LESSON: Lesson = {
  category: "data",
  outcomes: [
    "Menjelaskan mengapa banyak server aplikasi tetap mencatat pada satu database utama.",
    "Menjelaskan cara replika menerima salinan perubahan, termasuk keterlambatan salinan.",
    "Menjelaskan apa yang terjadi saat database utama gagal dan bagaimana failover mengambil alih.",
  ],
  steps: [
    {
      key: "satu-catatan",
      short: "Satu catatan stok",
      title: "Banyak pengunjung, satu catatan stok",
      kind: "Masalah",
      body: [
        "Penjualan konser dibuka pukul 10.00. Pengunjung dibagi ke tiga {{apps|server aplikasi}}, tetapi semuanya mencatat pesanan pada {{primary|database utama}} yang sama.",
        "Jadi, pengguna mendapat layanan dari server berbeda tanpa memiliki stok tiket yang terpisah. Stok sengaja dibuat 12 tiket agar perubahannya mudah dihitung.",
      ],
      observe: "Pesanan P-101, P-102, dan P-103 lewat loket A, B, dan C, tetapi ketiganya tercatat di database utama yang sama: stok 12 → 9.",
      changes: ["Tiga server aplikasi menulis ke satu database", "Stok: 12 → 9 · transaksi #1–#3"],
      idea: "Banyak server aplikasi tetap bisa memakai satu sumber pencatatan.",
      more: ["Server aplikasi menjalankan logika website; database menyimpan data. Menambah server aplikasi menambah kapasitas melayani, bukan menambah stok."],
    },
    {
      key: "tiket-terakhir",
      short: "Tiket terakhir",
      title: "Dua orang berebut tiket terakhir",
      kind: "Percobaan",
      body: [
        "Kita lompat ke akhir penjualan: tersisa 1 tiket. Dua orang dapat menekan Beli hampir bersamaan.",
        "Database harus memeriksa dan mengurangi stok dalam satu [[transaksi|transaksi]] yang aman, sehingga satu tiket tidak diberikan kepada dua pesanan. Yang kalah cepat mendapat informasi tiket habis.",
      ],
      observe: "P-211 dan P-212 tiba hampir bersamaan. Hanya P-211 mendapat “Reservasi berhasil”; P-212 mendapat “Tiket habis”, dan stok berhenti di 0.",
      changes: ["Satu reservasi berhasil, satu habis", "Stok tidak pernah negatif"],
      idea: "Replikasi bukan pengganti aturan transaksi yang mencegah penjualan berlebih.",
      more: ["Pemeriksaan stok dan pengurangannya dilakukan sebagai satu langkah tak terpisahkan (atomik), misalnya satu perintah UPDATE dengan syarat stok > 0. Membaca stok lalu menguranginya dalam dua perintah terpisah dapat menjual tiket yang sama dua kali.", "Reservasi berhasil belum berarti pembayaran berhasil; pembayaran tidak disimulasikan di pelajaran ini."],
    },
    {
      key: "siapkan-salinan",
      short: "Siapkan salinan",
      title: "Siapkan buku salinan",
      kind: "Proses",
      body: [
        "Kembali ke penjualan yang masih berjalan, stok 9. Jika database utama berhenti, semua loket kehilangan tempat mencatat.",
        "Karena itu, {{replica|database salinan (replica)}} disiapkan di lokasi lain selagi database utama masih sehat. Replika menyalin seluruh data dulu, baru dinyatakan siap.",
      ],
      analogy: "Seperti menyalin buku stok resmi ke kantor lain, sebelum ada masalah.",
      observe: "Database salinan muncul di lokasi terpisah, progres salinan awal naik sampai 100%, lalu labelnya berubah menjadi “Salinan siap”.",
      changes: ["Database salinan muncul", "Salinan awal selesai: transaksi #3 di kedua database"],
      idea: "Cadangan yang siap mengambil alih perlu disiapkan sebelum kegagalan.",
      more: ["Di PostgreSQL, salinan awal biasanya dibuat dengan base backup, lalu replika terus menerima catatan perubahan (WAL) lewat streaming replication."],
    },
    {
      key: "perubahan-disalin",
      short: "Perubahan disalin",
      title: "Setiap perubahan ikut disalin",
      kind: "Proses",
      body: [
        "Satu tiket berhasil dipesan. Database utama mencatat perubahan, lalu replika menerima salinannya lewat {{stream|aliran replikasi}}.",
        "Untuk contoh ini, penyalinan berlangsung [[asinkron|asinkron]]: pesanan dikonfirmasi lebih dulu, salinan menyusul. Selama itu replika tertinggal; inilah [[lag|keterlambatan salinan (replication lag)]].",
      ],
      observe: "P-104 menjadi transaksi #4 di database utama (stok 8). Sesaat replika masih di #3 dan label “tertinggal 1 transaksi” muncul, lalu catatan hijau tiba dan replika menyusul ke #4.",
      changes: ["Utama: #4 · stok 8", "Replika: #3 → #4 setelah jeda"],
      idea: "Replika mengikuti perubahan; belum tentu selalu sama pada setiap saat.",
      more: ["Replikasi sinkron menunggu replika menerima perubahan sebelum pesanan dikonfirmasi: lebih aman dari kehilangan data, tetapi setiap pesanan menunggu lebih lama."],
    },
    {
      key: "baca-dan-tulis",
      short: "Lihat vs pesan",
      title: "Ramai melihat, pembelian tetap terpusat",
      kind: "Proses",
      body: [
        "Replika yang mendukung pembacaan dapat membantu melayani sebagian informasi, seperti halaman acara.",
        "Namun, keputusan menerima pesanan dan mengurangi stok tetap menuju database utama. Informasi dari replika dapat sedikit tertinggal.",
      ],
      observe: "“Lihat acara” dilayani replika lewat jalur putus-putus. Pembacaan pertama menampilkan stok 8 padahal utama sudah 7 (tertinggal); pembacaan berikutnya menampilkan 7.",
      changes: ["Jalur baca → replika, jalur pesan → utama", "Satu pembacaan tertinggal satu transaksi"],
      idea: "Salinan dapat membantu pembacaan, tetapi tidak otomatis membagi seluruh beban pembelian.",
      more: ["Karena itu halaman acara sebaiknya menulis “stok perkiraan”, dan jumlah pastinya diperiksa lagi oleh database utama saat pesanan dibuat."],
    },
    {
      key: "utama-gagal",
      short: "Utama gagal",
      title: "Database utama gagal",
      kind: "Masalah",
      body: [
        "Database utama tidak merespons. Website dapat mengalami jeda atau menampilkan pesan untuk mencoba lagi.",
        "Pesanan yang belum dikonfirmasi tidak boleh ditampilkan sebagai berhasil. Menambah server aplikasi tidak menyelesaikan masalah database yang gagal.",
      ],
      observe: "Database utama bertanda silang merah. P-106 menunggu lalu mendapat “Belum terkonfirmasi — coba lagi”; jumlah reservasi tidak bertambah.",
      changes: ["Utama: GAGAL", "P-106: belum terkonfirmasi"],
      idea: "Banyak server aplikasi tidak menghilangkan titik kegagalan pada database.",
      more: ["Replika yang sudah ada belum menerima penulisan dengan sendirinya. Ia hanya salinan sampai ada keputusan untuk mempromosikannya."],
    },
    {
      key: "ambil-alih",
      short: "Ambil alih",
      title: "Salinan mengambil alih",
      kind: "Proses",
      body: [
        "{{manager|Pengelola failover}} memeriksa replika, memastikan utama lama tidak lagi menerima penulisan, lalu menetapkan replika sebagai utama baru.",
        "Koneksi aplikasi diarahkan ke tujuan baru dan pesanan dapat dilanjutkan. Selama pergantian, ada jeda: pesanan diminta mencoba lagi.",
      ],
      observe: "Status bergerak: deteksi → isolasi utama lama → periksa salinan → promosi → arahkan ulang. P-107 di tengah jeda diminta mencoba lagi; P-106 yang diulang berhasil sekali, ulangan keduanya tidak memotong stok lagi.",
      changes: ["Utama lama: DIISOLASI", "Salinan → Utama baru (menerima penulisan)", "Stok 7 → 6, hanya sekali untuk P-106"],
      idea: "Replikasi menyediakan salinan; failover mengatur pengambilalihan.",
      more: ["Di demonstrasi ini replika sudah menerima semua transaksi yang dikonfirmasi sebelum kegagalan (#5). Pada replikasi asinkron yang tertinggal, transaksi terbaru yang belum tersalin dapat hilang saat failover.", "Mengisolasi utama lama (fencing) mencegah dua database sama-sama menerima penulisan (split-brain)."],
    },
    {
      key: "pulihkan",
      short: "Pulihkan",
      title: "Pulihkan perlindungan",
      kind: "Proses",
      body: [
        "Database lama yang kembali hidup tidak langsung menjadi utama lagi. Datanya perlu diselaraskan dengan utama baru, lalu perannya ditetapkan sebagai salinan.",
        "Setelah salinan kembali siap, sistem memiliki perlindungan terhadap kegagalan berikutnya.",
      ],
      observe: "Database lama berlabel “Menyelaraskan”, lalu menjadi salinan di #6. Pesanan P-108 tercatat di utama baru dan ikut tersalin ke database lama. Hanya satu database berlabel “Menerima penulisan”.",
      changes: ["Database lama: diselaraskan → salinan", "Arah salinan: utama baru → database lama"],
      idea: "Setelah failover, siapkan salinan baru agar sistem terlindungi lagi.",
      more: ["Replikasi berbeda dari backup: perintah yang keliru, misalnya menghapus semua pesanan, juga ikut tersalin. Backup berkala tetap dibutuhkan."],
    },
  ],
  analogy: {
    title: "Loket tiket dan buku stok",
    mapping: [
      ["Pengunjung membeli tiket", "Pengguna website"],
      ["Petugas pengatur antrean", "Load balancer"],
      ["Loket A, B, C", "Server aplikasi A, B, C"],
      ["Buku stok dan pesanan resmi", "Database utama"],
      ["Buku salinan di kantor lain", "Database replika"],
      ["Salinan catatan perubahan", "Aliran replikasi"],
      ["Koordinator operasional", "Pengelola failover"],
    ],
    limits: [
      "Database tidak mengirim buku fisik; yang disalin adalah catatan perubahan data.",
      "Buku salinan bisa dibaca kapan saja; replika sebenarnya bisa tertinggal beberapa transaksi dari utama.",
    ],
  },
  summary: [
    "Server aplikasi melayani permintaan; database utama menjadi tempat pencatatan.",
    "Pengurangan stok dilakukan dalam transaksi atomik, sehingga satu tiket tidak terjual dua kali.",
    "Replika menerima salinan perubahan, bisa tertinggal sebentar, dan dapat membantu pembacaan.",
    "Failover mengalihkan peran saat utama gagal: isolasi utama lama, promosikan replika, arahkan ulang aplikasi.",
    "Replikasi berbeda dari backup dan tidak otomatis mencegah semua kehilangan data.",
  ],
  simplifications: [
    "Stok diperkecil menjadi 12 tiket dan waktu diperlambat untuk demonstrasi; tidak ada database sungguhan.",
    "Langkah 2 sengaja melompat ke tiket terakhir; langkah 3–8 melanjutkan penjualan dari stok 9.",
    "Pembayaran tidak disimulasikan: “reservasi berhasil” berarti tiket ditahan untuk pesanan itu.",
    "Rujukan teknis: dokumentasi PostgreSQL tentang streaming replication, failover, dan transaksi.",
  ],
};
