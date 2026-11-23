import type { Lesson } from "../types";

/**
 * Rate limiting lesson (Indonesian) for readers who have never heard of servers or APIs.
 * One mechanism only: a fixed 10-second window with a per-account counter (5 checks per window).
 * The numbers are a teaching example, not a recommendation. All numbers come from model.ts.
 */
export const RATE_LESSON: Lesson = {
  category: "keamanan",
  outcomes: [
    "Menjelaskan bahwa satu klik di website mengirim satu permintaan yang harus dikerjakan server.",
    "Menjelaskan cara rate limiting menghitung permintaan setiap akun dalam satu periode.",
    "Menjelaskan apa yang terjadi saat batas tercapai: permintaan ditolak sementara dan boleh dicoba lagi.",
  ],
  steps: [
    {
      key: "cek-kursi",
      short: "Cek kursi",
      title: "Kamu mengecek kursi",
      kind: "Proses",
      body: [
        "Penjualan tiket konser baru dibuka. Andi menekan tombol “Cek kursi”.",
        "Satu klik mengirim satu [[request|permintaan]] dari browser ke {{server|server}}. Server mengambil data kursi dari {{db|database}}, lalu mengirim jawabannya kembali ke Andi.",
      ],
      analogy: "Seperti bertanya ke petugas loket: “Kursi mana yang masih tersedia?” Petugas melihat papan informasi, lalu menjawab.",
      observe: "Satu paket berangkat dari laptop Andi, singgah ke database, lalu kembali di lajur bawah dengan daftar kursi.",
      changes: ["1 klik = 1 permintaan", "Server mengerjakan 1 permintaan"],
      idea: "Satu tindakan di website dapat menghasilkan pekerjaan bagi server.",
    },
    {
      key: "terlalu-cepat",
      short: "Terlalu cepat",
      title: "Permintaan datang terlalu cepat",
      kind: "Masalah",
      body: [
        "Andi penasaran dan menekan “Cek kursi” tujuh kali dalam dua detik. Server hanya bisa mengerjakan satu permintaan pada satu waktu, jadi sisanya antre.",
        "Budi mengecek sekali, tetapi permintaannya ikut menunggu di belakang permintaan Andi. Andi bukan penyerang; ia hanya terlalu sering mengecek.",
      ],
      observe: "Paket Andi menumpuk di depan server dengan label “antre”. Paket Budi baru dikerjakan setelah sebagian besar paket Andi selesai.",
      changes: ["Antrean di server bertambah", "Budi ikut menunggu"],
      idea: "Permintaan berlebihan dapat mengganggu pelayanan untuk semua orang.",
      more: ["Program otomatis (bot) bisa mengirim jauh lebih banyak permintaan daripada manusia. Tanpa batas, website bisa melambat untuk semua pengunjung."],
    },
    {
      key: "pasang-pemeriksa",
      short: "Pasang pemeriksa",
      title: "Website memasang pemeriksa batas",
      kind: "Proses",
      body: [
        "Website memasang {{limiter|rate limiter}} sebelum server. Aturannya: setiap akun boleh mengecek kursi maksimal 5 kali dalam satu {{window|periode 10 detik}}.",
        "Pemeriksa memegang {{counters|penghitung}} untuk setiap akun. Sebelum meneruskan permintaan ke server, ia melihat penghitung akun itu dulu.",
      ],
      analogy: "Di depan loket kini ada petugas pemeriksa yang mencatat pertanyaan setiap pengunjung di kartu masing-masing.",
      observe: "Gerbang “Pemeriksa batas” muncul di tengah. Permintaan Andi lewat dengan label “Diteruskan”, dan penghitung Andi berubah dari 0/5 menjadi 1/5. Penanda periode menghitung mundur.",
      changes: ["Aturan: 5 pengecekan / 10 detik / akun", "Penghitung Andi: 0/5 → 1/5"],
      idea: "Sistem memeriksa batas sebelum meneruskan permintaan.",
      more: ["Angka 5 kali per 10 detik hanya contoh untuk pelajaran ini. Setiap website menentukan batasnya sendiri."],
    },
    {
      key: "jatah-habis",
      short: "Jatah habis",
      title: "Jatah Andi habis",
      kind: "Percobaan",
      body: [
        "Andi mengecek enam kali. Lima permintaan pertama diteruskan dan dikerjakan server.",
        "Permintaan keenam langsung dikembalikan oleh pemeriksa: “Terlalu banyak permintaan. Coba lagi dalam beberapa detik.” Kondisi ini punya kode resmi: [[429|429 Too Many Requests]]. Permintaan itu tidak diteruskan ke server.",
      ],
      analogy: "Petugas pemeriksa berkata: “Kamu sudah mengecek terlalu sering. Tunggu sebentar, lalu coba lagi.”",
      observe: "Penghitung Andi naik sampai 5/5. Paket keenam berbalik di pemeriksa dengan label merah “Tunggu · 429” dan tidak pernah sampai ke server.",
      changes: ["Andi: 5/5", "Permintaan ke-6: ditolak sementara (429)"],
      idea: "Kelebihan permintaan ditolak sementara dan tidak diteruskan ke server aplikasi.",
      more: ["Lima permintaan berarti lima kali pengecekan kursi, bukan lima tiket.", "Permintaan yang ditolak tidak masuk antrean. Andi perlu menekan tombol lagi nanti."],
    },
    {
      key: "budi-tetap-bisa",
      short: "Budi tetap bisa",
      title: "Budi tetap bisa mengecek",
      kind: "Proses",
      body: [
        "Andi mencoba lagi dan masih diminta menunggu. Pada saat yang sama, Budi mengecek kursi untuk pertama kali.",
        "Permintaan Budi diteruskan, karena penghitungnya terpisah dari penghitung Andi. Batas Andi tidak mengurangi jatah Budi.",
      ],
      analogy: "Budi punya kartu catatan sendiri. Catatan Andi yang sudah penuh tidak memengaruhi Budi.",
      observe: "Penghitung Andi tetap 5/5 dan paketnya berbalik dengan label “Tunggu”. Paket Budi lewat dengan label “Diteruskan”, dan penghitungnya menjadi 1/5.",
      changes: ["Andi: tetap 5/5 · Tunggu", "Budi: 0/5 → 1/5 · Diteruskan"],
      idea: "Dalam contoh ini, setiap akun memiliki jatah masing-masing.",
    },
    {
      key: "coba-lagi",
      short: "Coba lagi",
      title: "Boleh mencoba kembali",
      kind: "Proses",
      body: [
        "Andi mencoba sesaat sebelum periode berakhir dan masih diminta menunggu. Begitu periode 10 detik berikutnya dimulai, semua penghitung kembali ke 0/5.",
        "Andi menekan “Cek kursi” lagi, dan kali ini permintaannya diteruskan serta dijawab server.",
      ],
      observe: "Penanda periode mencapai 0 dan berganti ke periode baru. Penghitung Andi dan Budi kembali ke 0/5, lalu permintaan baru Andi lewat dan penghitungnya menjadi 1/5.",
      changes: ["Periode baru: semua penghitung 0/5", "Andi dilayani kembali"],
      idea: "Pembatasan ini sementara; pengguna dapat mencoba kembali setelah waktunya tiba.",
      more: [
        "Lolos pemeriksa hanya berarti permintaan boleh diproses. Itu tidak menjamin kursi masih tersedia atau tiket berhasil dibeli.",
        "Rate limiting membantu mengurangi akses berlebihan, tetapi tidak membuat website kebal terhadap semua serangan atau lonjakan pengunjung.",
      ],
    },
  ],
  analogy: {
    title: "Loket informasi konser",
    mapping: [
      ["Pengunjung", "Pengguna website"],
      ["Pertanyaan “Kursi mana yang masih tersedia?”", "Satu permintaan (request)"],
      ["Petugas pemeriksa di depan loket", "Rate limiter"],
      ["Kartu catatan pertanyaan tiap pengunjung", "Penghitung permintaan tiap akun"],
      ["Petugas loket", "Server aplikasi"],
      ["Papan informasi kursi", "Database"],
    ],
    limits: [
      "Petugas sungguhan bisa memberi kelonggaran; rate limiter mengikuti aturan yang sama untuk setiap akun.",
      "Pemeriksa pada website bekerja dalam sepersekian detik dan melayani sangat banyak pengunjung sekaligus.",
    ],
  },
  summary: [
    "Rate limiting mengatur seberapa sering kita boleh meminta layanan. Ketika batas tercapai, kita diminta menunggu agar layanan tetap bisa digunakan bersama.",
    "Satu klik = satu permintaan dari browser ke server.",
    "Pemeriksa menghitung permintaan setiap akun dalam periode 10 detik; permintaan ke-6 mendapat 429 dan tidak diteruskan.",
    "Setiap akun punya penghitung sendiri, dan semua penghitung kembali ke 0 di awal periode berikutnya.",
  ],
  check: {
    question: "Andi sudah mengecek lima kali dan diminta menunggu. Apakah Budi yang baru mengecek satu kali ikut dibatasi?",
    answer: "Tidak dalam contoh ini, karena batas dihitung terpisah untuk setiap akun.",
  },
  simplifications: [
    "Angka 5 pengecekan per 10 detik per akun hanya contoh pembelajaran, bukan rekomendasi.",
    "Hanya satu cara yang digambarkan: periode tetap 10 detik dengan penghitung yang direset di awal periode berikutnya.",
    "Server digambarkan mengerjakan satu permintaan pada satu waktu agar antrean mudah terlihat.",
    "Waktu diperlambat; website sungguhan menjawab dalam sepersekian detik.",
  ],
};
