import type { Lesson } from "../types";

/**
 * Load balancer lesson (Indonesian). Numbers come from src/sim/model.ts and src/sim/scenarios.ts:
 * one request per second, health checks every 3 s with a 1 s timeout, 2 failures / 2 passes,
 * B stops at 4.2 s and is marked unhealthy at 10.6 s, B restarts at 16 s and is healthy at 19.6 s.
 */
export const LB_LESSON: Lesson = {
  category: "jaringan",
  outcomes: [
    "Menjelaskan load balancer sebagai satu titik penerima yang membagi permintaan ke beberapa server.",
    "Menelusuri urutan round robin dan mengapa giliran yang rata belum tentu beban yang rata.",
    "Membedakan server yang mati dengan server yang sudah diketahui tidak sehat oleh load balancer.",
  ],
  steps: [
    {
      key: "satu-alamat",
      changes: ["Semua permintaan menuju satu server."],
      short: "Satu alamat",
      title: "Satu server kewalahan melayani semua orang",
      kind: "Masalah",
      body: [
        "Semua pengguna mengirim [[request|permintaan]] ke {{serverA|server A}}. Jika server ini melambat atau berhenti, seluruh pengguna ikut terdampak.",
        "Dalam analogi, semua pengunjung menuju satu loket. Belum ada petugas pembagi. Pada langkah berikutnya, kita menambahkan server dan pengatur giliran."
],
      observe: "Semua token menuju A. Ganti ke analogi untuk melihat semua pengunjung menuju satu loket.",
      idea: "Satu server menjadi satu-satunya tempat semua permintaan bergantung.",
    },
    {
      key: "bergiliran",
      changes: ["Petugas pembagi / load balancer ditambahkan.", "Server B dan C menerima giliran."],
      short: "Bergiliran",
      title: "Permintaan dibagi bergiliran ke A, B, C",
      kind: "Proses",
      body: [
        "Sekarang ada tiga server dan satu [[load-balancer|load balancer]]. {{client|Pengguna}} mengirim ke satu alamat; {{lb|pembagi}} memilih tujuan di belakangnya.",
        "[[round-robin|Round robin]] membagi giliran: A, B, C, lalu kembali ke A. Amati token yang keluar lewat jalur berbeda.",
        "Giliran yang rata belum tentu beban yang rata. Satu permintaan bisa membutuhkan waktu lebih lama daripada yang lain."
],
      analogy: "Seperti petugas yang mempersilakan tamu ke loket 1, 2, 3, lalu kembali ke 1, tanpa melihat urusan tiap tamu.",
      observe: "Urutan pengiriman terbaca A, B, C, A, B, C. Selisih jumlah permintaan antarserver tidak pernah lebih dari satu.",
      idea: "Round robin membagi giliran secara rata, bukan beban kerja secara rata.",
    },
    {
      key: "b-berhenti",
      changes: ["B berhenti merespons.", "Pembagi belum mengetahui kegagalannya."],
      short: "B berhenti",
      title: "Server B berhenti, load balancer belum tahu",
      kind: "Percobaan",
      body: [
        "{{serverB|Server B}} berhenti pada detik 4,2. Tanda silang menunjukkan kondisi sebenarnya.",
        "Pembagi belum tahu: B masih mendapat giliran sampai [[health-check|pemeriksaan]] mendeteksi kegagalannya. Karena itu, beberapa permintaan tetap menuju B dan gagal.",
        "Permintaan yang gagal tidak otomatis dipindahkan ke A atau C. Simulasi ini tidak memakai retry."
],
      observe: "B bertanda silang, tetapi masih dipilih. Token yang tiba di B gagal.",
      idea: "Server mati belum tentu diketahui: load balancer hanya tahu dari hasil pemeriksaan.",
    },
    {
      key: "deteksi",
      changes: ["Hasil pemeriksaan memperbarui daftar tujuan.", "Permintaan baru melewati B."],
      short: "Deteksi",
      title: "Dua pemeriksaan gagal, B dilewati",
      kind: "Proses",
      body: [
        "{{hc|Health check}} bertanya secara berkala: apakah setiap server masih merespons? Garis putus-putus menunjukkan jalur pemeriksaannya.",
        "Dalam contoh ini, dua kegagalan berturut-turut membuat B dikeluarkan dari {{pins|daftar tujuan}}. Pembagi kini bergiliran ke A dan C.",
        "Permintaan baru melewati B. Permintaan yang sudah gagal tetap tercatat gagal."
],
      observe: "Setelah dua pemeriksaan gagal, B dilewati. Token baru hanya menuju A dan C.",
      idea: "Setelah kegagalan mencapai ambang, server dilewati dan permintaan baru tidak lagi dikirim ke sana.",
    },
    {
      key: "pulih",
      changes: ["B kembali aktif.", "Dua pemeriksaan berhasil mengembalikan gilirannya."],
      short: "Pulih",
      title: "B hidup lagi, tetapi menunggu dua pemeriksaan",
      kind: "Proses",
      body: [
        "{{serverB|B hidup kembali}} pada detik 16. Namun, aktif belum berarti langsung mendapat giliran.",
        "Setelah dua [[health-check|pemeriksaan]] berhasil, pembagi memasukkan B kembali. Token baru menuju A, B, dan C.",
        "Jeda ini menunjukkan perbedaan kondisi server dengan pengetahuan pembagi."
],
      observe: "B kembali aktif lebih dahulu; aliran baru menuju B setelah pemeriksaan berhasil.",
      idea: "Server yang hidup kembali baru dipakai setelah pemeriksaan membuktikan ia sehat.",
    },
  ],
  legacy: { why: "satu-alamat", "round-robin": "bergiliran", "server-down": "b-berhenti", "health-check": "deteksi", recovery: "pulih" },
  analogy: {
    title: "Petugas pengarah di depan tiga loket",
    mapping: [
      ["Petugas pengarah", "Load balancer"],
      ["Pengunjung", "Pengguna yang mengirim request"],
      ["Loket A, B, C", "Server A, B, C"],
      ["Daftar loket yang dianggap siap", "Daftar backend yang dianggap sehat"],
      ["Petugas menengok loket berkala", "Health check"],
    ],
    limits: [
      "Dalam analogi ini petugas pembagi menunggu laporan pemeriksa, meskipun loket sudah berhenti. Ini menggambarkan keterlambatan deteksi health check.",
      "Tamu yang salah diarahkan bisa pindah loket sendiri; permintaan yang gagal tidak otomatis dipindahkan bila retry tidak ada.",
    ],
  },
  summary: [
    "Klien mengirim semua permintaan ke satu alamat; load balancer meneruskannya ke salah satu server.",
    "Round robin memilih bergiliran di antara server yang dianggap layak.",
    "Kondisi server dan pengetahuan load balancer terpisah: sebelum terdeteksi, permintaan ke server mati bisa gagal.",
    "Health check menandai server tidak sehat setelah dua kegagalan, dan sehat lagi setelah dua keberhasilan.",
  ],
  simplifications: [
    "Angka waktu (1 permintaan per detik, pemeriksaan setiap 3 detik, ambang 2) adalah parameter demonstrasi, bukan konfigurasi produksi.",
    "Tidak ada retry: permintaan yang gagal tidak dipindahkan ke server lain.",
    "Semua permintaan dianggap sama berat; pembagian berdasarkan beban atau koneksi tidak disimulasikan.",
  ],
};
