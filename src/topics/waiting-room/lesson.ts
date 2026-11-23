import type { Lesson } from "../types";

/**
 * Waiting room lesson (Indonesian) for readers who have never heard of servers. Concept reference: the
 * waiting room people meet on ticket websites; the illustrations, numbers and release rule are this
 * demo's own simplifications. All numbers come from model.ts and scenarios.ts.
 */
export const WAIT_LESSON: Lesson = {
  category: "keamanan",
  outcomes: [
    "Menjelaskan mengapa website bisa kewalahan saat penjualan tiket dibuka.",
    "Menjelaskan cara waiting room mengatur giliran masuk ke halaman pembelian.",
    "Menjelaskan bahwa mendapat giliran masuk belum berarti mendapatkan tiket.",
  ],
  steps: [
    {
      key: "dibuka",
      short: "Penjualan dibuka",
      title: "Penjualan tiket dibuka",
      kind: "Masalah",
      body: [
        "Pukul 10.00 penjualan tiket konser dibuka. {{andi|Andi}} dan banyak pengunjung lain membuka website pada saat yang sama.",
        "Semua ingin segera memilih tiket. Dalam simulasi ini ada sepuluh pengunjung, tetapi di dunia nyata bisa ribuan.",
      ],
      analogy: "Seperti pintu ruang pelayanan tiket yang tiba-tiba didatangi banyak orang sekaligus.",
      observe: "Sepuluh pengunjung berjalan menuju website, dan penghitung “Pengunjung” naik dari 0 ke 10 dalam waktu singkat. Andi ditandai bintang dan garis tepi.",
      changes: ["Pengunjung: 0 → 10"],
      idea: "Saat penjualan dibuka, banyak orang datang pada waktu yang sama.",
    },
    {
      key: "bersamaan",
      short: "Masuk bersamaan",
      title: "Semua mencoba masuk bersamaan",
      kind: "Masalah",
      body: [
        "Tanpa pengaturan, kesepuluh pengunjung langsung masuk ke {{area|area pembelian}}. Setiap orang meminta data kursi ke {{server|server}}.",
        "Server mengerjakan permintaan satu per satu, jadi permintaan lain menumpuk. Pelayanan untuk semua orang ikut melambat.",
      ],
      analogy: "Sepuluh orang berdesakan di depan tiga meja pelayanan; petugas loket kewalahan menjawab semuanya.",
      observe: "Paket permintaan (bentuk belah ketupat) menumpuk di depan server, dan label beban berubah menjadi “tinggi · respons melambat”.",
      changes: ["Di area pembelian: 10", "Permintaan menumpuk di server"],
      idea: "Terlalu banyak pengguna aktif sekaligus dapat membuat pelayanan melambat.",
      more: ["Ini tidak berarti server pasti rusak pada angka tertentu. Kemampuan setiap website berbeda-beda."],
    },
    {
      key: "ruang-tunggu",
      short: "Ruang tunggu",
      title: "Tambahkan ruang tunggu",
      kind: "Proses",
      body: [
        "Website memasang {{room|waiting room}}: halaman tunggu yang mengatur giliran masuk. Dalam simulasi ini ada tiga tempat aktif di area pembelian.",
        "Tiga orang pertama masuk lewat {{gate|gerbang}}. Tujuh lainnya menunggu sesuai urutan kedatangan. Andi berada di urutan kedua.",
      ],
      analogy: "Petugas mempersilakan tiga orang masuk ke ruang pelayanan. Yang lain menunggu di ruang tunggu dengan nomor antrean.",
      observe: "Ruang tunggu dan gerbang muncul. Tiga orang mengisi tiga tempat, tujuh lainnya berbaris bernomor 1–7. Penghitung menunjukkan “Sedang membeli: 3/3” dan “Menunggu: 7”.",
      changes: ["Sedang membeli: 3/3", "Menunggu: 7 · Andi urutan 2"],
      idea: "Waiting room mengatur berapa banyak orang yang masuk ke halaman pembelian.",
      more: ["Tiga tempat aktif bukan tiga tiket. Itu jumlah orang yang boleh berada di halaman pembelian pada saat yang sama, dalam simulasi ini."],
    },
    {
      key: "satu-tempat",
      short: "Satu tempat kosong",
      title: "Satu tempat tersedia",
      kind: "Proses",
      body: [
        "Seorang pembeli selesai, dan dalam simulasi ini tempat aktifnya dilepas. Pengunjung paling depan di antrean dipersilakan masuk.",
        "Semua yang menunggu maju satu langkah. Kini Andi berada paling depan.",
      ],
      analogy: "Satu meja pelayanan kosong, petugas memanggil nomor antrean berikutnya.",
      observe: "Satu orang keluar dan penghitung sempat menjadi 2/3. Gerbang terbuka untuk satu orang, penghitung kembali 3/3, dan “Menunggu” turun menjadi 6.",
      changes: ["Sedang membeli: 3/3 → 2/3 → 3/3", "Menunggu: 7 → 6 · Andi urutan 1"],
      idea: "Hanya satu pengunjung masuk untuk mengisi satu tempat yang tersedia.",
      more: ["Aturan “selesai membeli melepaskan satu tempat” hanya aturan simulasi ini. Setiap website bisa memakai cara yang berbeda."],
    },
    {
      key: "giliran-andi",
      short: "Giliran Andi",
      title: "Giliran Andi tiba",
      kind: "Proses",
      body: [
        "Satu tempat lagi tersedia. Kali ini sistem mengizinkan Andi masuk.",
        "Halaman Andi berubah dari “Menunggu” menjadi “Silakan masuk”, lalu ia diarahkan ke area pembelian. Posisi antrean bukan nomor kursi dan bukan pesanan tiket.",
      ],
      analogy: "Nomor Andi dipanggil, dan petugas di gerbang mempersilakannya masuk.",
      observe: "Satu orang keluar, gerbang terbuka untuk Andi, dan kartu Andi berubah menjadi “Silakan masuk”. Penghitung kembali 3/3, dan “Menunggu” menjadi 5.",
      changes: ["Kartu Andi: Menunggu → Silakan masuk", "Menunggu: 6 → 5"],
      idea: "Saat tempat tersedia, pengunjung berikutnya mendapat izin masuk.",
    },
    {
      key: "pilih-tiket",
      short: "Pilih tiket",
      title: "Andi mulai memilih tiket",
      kind: "Ringkasan",
      body: [
        "Di area pembelian, Andi memilih kategori tiket. Setiap pilihan dikirim sebagai permintaan data ke server, yang memeriksa ketersediaan di {{db|database}}.",
        "Giliran masuk memberi kesempatan membeli. Tiket baru didapat setelah pesanan berhasil sesuai ketentuan.",
      ],
      analogy: "Di loket, petugas memeriksa catatan ketersediaan tiket sebelum mencatat pesanan Andi.",
      observe: "Paket data bergerak dari area pembelian ke server, ke database, lalu kembali dengan jawaban. Jawaban terakhir: “Pesanan dibuat · selesaikan pembayaran”, belum “tiket didapat”.",
      changes: ["Kategori B: masih tersedia", "Pesanan dibuat, pembayaran belum"],
      idea: "Giliran masuk memberi kesempatan membeli. Tiket baru didapat setelah pesanan berhasil sesuai ketentuan.",
      more: [
        "Waiting room berbeda dari rate limiting: waiting room mengatur giliran masuk, rate limiting membatasi seberapa sering seseorang mengirim permintaan.",
        "Waiting room membantu mengatur arus, tetapi tidak menjamin semua bot atau serangan dapat dihentikan.",
      ],
    },
  ],
  analogy: {
    title: "Ruang pelayanan tiket konser",
    mapping: [
      ["Pengunjung", "Pengguna website"],
      ["Ruang tunggu", "Halaman waiting room"],
      ["Nomor antrean", "Posisi antrean"],
      ["Petugas dan gerbang", "Sistem yang memeriksa izin masuk"],
      ["Tiga tempat pelayanan", "Kapasitas aktif dalam simulasi"],
      ["Area pelayanan", "Halaman pemilihan tiket dan checkout"],
      ["Petugas loket", "Server aplikasi"],
      ["Catatan ketersediaan tiket", "Database"],
    ],
    limits: [
      "Tempat pelayanan bukan kursi konser: tiga tempat aktif tidak berarti hanya ada tiga tiket.",
      "Pengunjung yang menunggu tetap terhubung ke layanan waiting room; mereka hanya belum menjalankan proses pembelian.",
    ],
  },
  summary: [
    "Waiting room mengatur giliran masuk agar halaman pembelian tidak menerima terlalu banyak pengunjung sekaligus.",
    "Pengunjung yang menunggu memegang posisi antrean, bukan nomor kursi dan bukan reservasi tiket.",
    "Saat satu tempat tersedia, satu pengunjung berikutnya masuk.",
    "Masuk ke halaman pembelian memberi kesempatan membeli; tiket baru didapat setelah pesanan berhasil.",
  ],
  check: {
    question: "Andi sudah mendapat giliran masuk. Apakah tiket pasti menjadi miliknya?",
    answer: "Belum. Andi masih perlu memilih tiket yang tersedia dan menyelesaikan transaksi.",
  },
  simplifications: [
    "Sepuluh pengunjung dan tiga tempat aktif hanya penyederhanaan untuk pembelajaran, bukan aturan teknis website tiket mana pun.",
    "Antrean memakai urutan kedatangan. Tidak semua waiting room memakai aturan yang sama.",
    "“Selesai membeli melepaskan satu tempat” adalah aturan simulasi ini; sistem nyata bisa memakai cara lain, misalnya batas waktu.",
    "Perkiraan waktu tunggu hanya perkiraan dan bisa berubah. Waktu dalam demonstrasi diperlambat; kamu tidak perlu menunggu sungguhan.",
  ],
};
