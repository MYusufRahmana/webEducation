import type { Lesson } from "../types";

/**
 * HTTPS lesson (Indonesian), told as buying a concert ticket. Technical reference: MDN Web Docs,
 * "Transport Layer Security (TLS)" and "HTTPS". The figure is an educational simulation, not a
 * cryptographic implementation. All sample data is invented; no real personal data or passwords.
 */
export const HTTPS_LESSON: Lesson = {
  category: "keamanan",
  legacy: {
    "tanpa-perlindungan": "mengapa-peringatan",
    "periksa-penerima": "periksa-server",
    "siapkan-koneksi": "periksa-server",
    terlindungi: "data-terlindungi",
    "perubahan-terdeteksi": "data-terlindungi",
    "manfaat-batas": "terpercaya",
  },
  outcomes: [
    "Membaca indikator “Tidak aman” dan memahami mengapa data transaksi perlu HTTPS.",
    "Menjelaskan langkah HTTPS: pemilik website mengaktifkannya, browser memeriksa sertifikat, lalu data dikirim terenkripsi.",
    "Membedakan koneksi yang terlindungi dari website yang terpercaya.",
  ],
  steps: [
    {
      key: "beli-tiket",
      short: "Beli tiket",
      title: "Kamu ingin membeli tiket",
      kind: "Masalah",
      body: [
        "Kamu membuka website tiket konser, memilih acara, lalu menuju halaman pemesanan. Website meminta nama, email, dan informasi lain untuk transaksi.",
        "Sebelum mengisinya, kamu melihat {{address|kolom alamat}}: http://tiket.example, dan browser menampilkan tulisan “Tidak aman”.",
      ],
      observe: "Halaman pemesanan datang dari server ke laptop. Di tampilan kecil halaman, kolom alamat disorot dengan label merah “Tidak aman”.",
      changes: ["Alamat: http://tiket.example", "Indikator: Tidak aman"],
      idea: "Sebelum mengirim informasi pribadi, perhatikan koneksi website yang kamu gunakan.",
      more: ["Data pada demonstrasi ini contoh semua (Rina Contoh, rina@contoh.test). Jangan memasukkan data pribadi atau password asli ke latihan apa pun."],
    },
    {
      key: "mengapa-peringatan",
      short: "Mengapa peringatan?",
      title: "Mengapa ada peringatan?",
      kind: "Masalah",
      body: [
        "Website pada contoh ini memakai [[http|HTTP]] tanpa perlindungan [[tls|TLS]]. Data yang dikirim belum terlindungi, sehingga {{observer|pihak di jalur jaringan}} berpotensi membaca atau mengubahnya.",
        "Tampilan website bisa terlihat profesional, tetapi itu tidak membuktikan koneksinya terlindungi.",
      ],
      analogy: "Seperti mengirim data lewat kartu pos: siapa pun yang memegangnya di perjalanan bisa membaca isinya.",
      observe: "Token “Nama dan email” bergerak dari laptop ke server. Saat lewat di tengah, label pengamat menampilkan isi yang sama persis.",
      changes: ["Pengamat membaca: Nama dan email", "Terbaca pengamat: 1 pesan"],
      idea: "Tampilan bagus tidak sama dengan koneksi aman.",
    },
    {
      key: "aktifkan-https",
      short: "Aktifkan HTTPS",
      title: "Pemilik website mengaktifkan HTTPS",
      kind: "Proses",
      body: [
        "Untuk melindungi koneksi, {{owner|pengelola website}} memasang {{certificate|sertifikat}} dan mengaktifkan HTTPS dengan TLS. Pengaturan ini dilakukan di sisi server, bukan dengan menekan tombol kunci di browser.",
        "Istilah “SSL” masih sering dipakai, tetapi teknologi modern yang digunakan adalah TLS.",
      ],
      observe: "Pengelola mengirim “Pasang sertifikat · aktifkan HTTPS” ke server, lalu sertifikat muncul di samping server. Kartu “Sebelum / Sesudah” menunjukkan alamat berubah dari http:// ke https://.",
      changes: ["Server: sertifikat terpasang, HTTPS aktif", "Alamat baru: https://tiket.example"],
      idea: "HTTPS memakai TLS untuk melindungi komunikasi browser dan server.",
      more: ["Alamat http:// tidak otomatis menjadi terlindungi. Website harus mengaktifkan HTTPS, dan browser harus membuka versi https://-nya."],
    },
    {
      key: "periksa-server",
      short: "Periksa server",
      title: "Browser memeriksa server",
      kind: "Proses",
      body: [
        "Saat kamu membuka versi HTTPS, server menunjukkan sertifikatnya. Browser {{check|memeriksa}} apakah sertifikat itu sah untuk tiket.example, lalu browser dan server menyiapkan perlindungan lewat [[handshake|handshake]].",
        "Jika pemeriksaan gagal, browser menampilkan peringatan. Pilihan yang aman adalah kembali, bukan melewati peringatan.",
      ],
      observe: "Sertifikat bergerak dari server ke laptop. Panel pemeriksaan menyalakan “Pemeriksaan berhasil”; kemungkinan lainnya, “Koneksi belum dapat dipercaya”, tetap terlihat redup. Setelah handshake, ikon kunci muncul di kolom alamat.",
      changes: ["Sertifikat cocok untuk tiket.example", "Koneksi: terlindungi (HTTPS)"],
      idea: "Browser memeriksa tujuan sebelum melanjutkan koneksi terlindungi.",
      more: ["Di mode eksplorasi, coba “Sertifikat tidak cocok”: browser menampilkan peringatan dan pengguna memilih kembali ke halaman aman."],
    },
    {
      key: "data-terlindungi",
      short: "Data terlindungi",
      title: "Informasi transaksi dikirim dengan perlindungan",
      kind: "Proses",
      body: [
        "Sekarang, saat kamu mengirim data pemesanan, browser meng[[enkripsi|enkripsi]]nya sebelum masuk jaringan. Server dapat membacanya kembali, sedangkan pengamat di tengah hanya melihat data terenkripsi.",
        "TLS juga membantu mendeteksi jika data diubah selama perjalanan.",
      ],
      analogy: "Kartu pos berganti menjadi amplop tersegel: isinya tidak terlihat, dan segel yang rusak langsung ketahuan.",
      observe: "Di dekat laptop label pesan masih terbaca, di tengah jalur berubah menjadi “▒▒▒ terenkripsi”, lalu terbaca lagi saat tiba di server. Jalurnya sama dengan langkah 2.",
      changes: ["Pengamat melihat: ▒▒▒", "Server menerima: Nama dan email"],
      idea: "Yang dilindungi adalah perjalanan data antara browser dan server.",
      more: ["Di mode eksplorasi, coba “Ubah pesan di perjalanan”: pada HTTPS perubahan terdeteksi dan data ditolak."],
    },
    {
      key: "terpercaya",
      short: "Pasti terpercaya?",
      title: "Apakah website pasti terpercaya?",
      kind: "Ringkasan",
      body: [
        "Belum tentu. Indikator koneksi terlindungi berarti komunikasi memakai HTTPS; indikator itu tidak menjamin penjual jujur atau tiketnya asli.",
        "Tetap periksa nama domain dan reputasi penyedia tiket. Keamanan aplikasi, pembayaran, dan penyimpanan data juga butuh perlindungan tersendiri.",
      ],
      observe: "Pesanan terkirim dan server menjawab “Pesanan diterima · pembayaran belum diproses”. Kartu periksa hanya mencentang koneksi; domain, penjual, dan pembayaran tetap perlu dinilai sendiri.",
      changes: ["Koneksi terlindungi ✓", "Penjual dan pembayaran: tidak dijamin HTTPS"],
      idea: "HTTPS melindungi koneksi, bukan menjamin seluruh isi dan kegiatan website.",
      more: ["Situs penipuan juga bisa memakai HTTPS. Perhatikan ejaan domain (tiket.example berbeda dengan tiket-example.co) dan sumber tautannya."],
    },
  ],
  analogy: {
    title: "Kartu pos dan amplop tersegel",
    mapping: [
      ["Kartu pos", "Data lewat HTTP"],
      ["Amplop terkunci dan bersegel", "Data lewat HTTPS (TLS)"],
      ["Kartu identitas penerima", "Sertifikat untuk domain"],
      ["Orang di perjalanan", "Pengamat di jaringan"],
      ["Pemilik toko memasang kotak surat bergembok", "Pengelola mengaktifkan HTTPS di server"],
    ],
    limits: [
      "Amplop bisa disobek; enkripsi TLS sungguhan dibuka dengan kunci, bukan dengan merobek.",
      "Kartu identitas membuktikan siapa penerimanya, bukan apakah ia jujur.",
    ],
  },
  summary: [
    "“Tidak aman” berarti koneksi tidak memakai HTTPS; data bisa terbaca atau diubah di perjalanan.",
    "HTTPS diaktifkan pemilik website di server, dengan sertifikat dan TLS.",
    "Browser memeriksa sertifikat terhadap domain tujuan, lalu menyiapkan koneksi terlindungi; jika gagal, pilih kembali.",
    "Data dienkripsi di perjalanan dan perubahan terdeteksi.",
    "HTTPS tidak menjamin penjual jujur, tiket asli, atau pembayaran aman.",
  ],
  simplifications: [
    "Enkripsi digambarkan sebagai label ▒▒▒; tidak ada kriptografi sungguhan di simulasi ini.",
    "Handshake TLS diringkas menjadi dua pesan; aslinya beberapa pesan dengan pertukaran kunci.",
    "Ikon dan kata pada kolom alamat berbeda di tiap browser; yang digambar hanya ilustrasi.",
    "Semua data contoh (Rina Contoh, rina@contoh.test, tiket.example); pembayaran tidak disimulasikan.",
  ],
};
