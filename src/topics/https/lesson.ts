import type { Lesson } from "../types";

/**
 * HTTPS lesson (Indonesian). Technical reference: MDN Web Docs, "Transport Layer Security (TLS)"
 * and "HTTPS" glossary. The figure is an educational simulation, not a cryptographic implementation.
 */
export const HTTPS_LESSON: Lesson = {
  category: "keamanan",
  outcomes: [
    "Menjelaskan perbedaan pesan yang dikirim lewat HTTP dan lewat HTTPS.",
    "Menjelaskan tiga fungsi TLS: menyembunyikan isi, memeriksa identitas server, dan mendeteksi perubahan data.",
    "Menyebutkan hal yang tidak dijamin HTTPS, misalnya kejujuran sebuah website.",
  ],
  steps: [
    {
      key: "tanpa-perlindungan",
      short: "Tanpa perlindungan",
      title: "Pesan tanpa perlindungan",
      kind: "Masalah",
      body: [
        "Bayangkan mengirim informasi pribadi lewat kartu pos. Orang yang melihatnya di perjalanan dapat membaca isinya.",
        "Pada [[http|HTTP]] tanpa [[tls|TLS]], data aplikasi tidak mendapat perlindungan enkripsi dari TLS. {{observer|Pengamat di jaringan}} yang dilewati {{message|pesan}} bisa membaca dan menyalinnya.",
      ],
      observe: "Pesan “Pesan rahasia” berjalan dari laptop ke server dalam bentuk terbuka. Label pengamat menunjukkan isi yang sama.",
      idea: "Data yang tidak dilindungi bisa terbaca di perjalanan.",
      changes: ["Laptop dan server tersambung lewat jalur jaringan", "Pengamat melihat isi pesan"],
    },
    {
      key: "periksa-penerima",
      short: "Periksa penerima",
      title: "Periksa siapa penerimanya",
      kind: "Proses",
      body: [
        "Sebelum bertukar data pribadi, browser memeriksa {{certificate|sertifikat}} server. Pemeriksaan ini membantu memastikan koneksi menuju server yang dapat membuktikan identitas untuk domain tersebut.",
        "Sertifikat hanya membuktikan identitas untuk domain. Ia tidak membuktikan bahwa pemilik website jujur.",
      ],
      analogy: "Seperti memeriksa kartu identitas penerima sebelum menyerahkan surat penting.",
      observe: "Server mengirim sertifikat. Browser mencocokkan nama domain di sertifikat dengan alamat tujuan, lalu muncul “Sertifikat valid untuk domain ini”.",
      idea: "Periksa identitas tujuan sebelum mengirim data.",
      changes: ["Sertifikat untuk toko-contoh.id muncul", "Belum ada data pribadi yang dikirim"],
    },
    {
      key: "siapkan-koneksi",
      short: "Siapkan koneksi",
      title: "Siapkan koneksi terlindungi",
      kind: "Proses",
      body: [
        "Browser dan server melakukan [[handshake|handshake]]: menyepakati cara perlindungan dan membentuk kunci untuk komunikasi.",
        "Kunci rahasia tidak dikirim terbuka lewat jaringan; masing-masing ujung menghitungnya dari bagian yang dipertukarkan. Setelah persiapan selesai, data aplikasi dikirim melalui koneksi terenkripsi.",
      ],
      observe: "Empat pesan persiapan bolak-balik. Status berubah dari “Menyiapkan koneksi” menjadi “Koneksi terlindungi”, dan ikon kunci muncul di kedua ujung.",
      idea: "Kedua ujung menyiapkan perlindungan sebelum bertukar data.",
      changes: ["Pesan persiapan: 4", "Status: Koneksi terlindungi", "Kunci di browser dan server"],
    },
    {
      key: "terlindungi",
      short: "Pesan terlindungi",
      title: "Pesan terlindungi di perjalanan",
      kind: "Proses",
      body: [
        "Pesan yang kamu kirim diubah menjadi data terenkripsi. [[enkripsi|Enkripsi]] memakai kriptografi, bukan sekadar mengacak huruf atau mengubah bentuk tulisan.",
        "Pengamat jaringan dapat melihat ada komunikasi, tetapi tidak dapat membaca isi pesan yang dilindungi. Server membuka datanya dan mendapatkan pesan semula.",
      ],
      analogy: "Seperti surat di dalam amplop terkunci: orang di perjalanan melihat amplopnya, bukan isinya.",
      observe: "Pesan terbaca di browser, berubah menjadi token ungu “ilustrasi data terenkripsi” di jalur, lalu muncul kembali sebagai “Pesan rahasia” di server.",
      idea: "TLS melindungi isi data selama perjalanan.",
      changes: ["Pengamat hanya melihat data terenkripsi", "Server menerima pesan semula"],
    },
    {
      key: "perubahan-terdeteksi",
      short: "Perubahan terdeteksi",
      title: "Perubahan data terdeteksi",
      kind: "Percobaan",
      body: [
        "TLS juga memeriksa [[integritas|integritas]] data. Jika pihak di tengah mengubah data terenkripsi, pemeriksaan dapat gagal dan data tersebut tidak diterima sebagai pesan yang valid.",
        "Pada HTTP tanpa TLS, perubahan seperti ini tidak akan terdeteksi oleh perlindungan TLS.",
      ],
      analogy: "Seperti segel amplop yang rusak: penerima tahu amplop sudah dibuka atau diubah.",
      observe: "Pengamat mengubah token di tengah jalur (tanda silang). Server menampilkan “Pemeriksaan gagal — data ditolak”, dan pesan itu tidak muncul sebagai data sah.",
      idea: "TLS membantu mendeteksi perubahan data di perjalanan.",
      changes: ["Satu pesan diubah di perjalanan", "Server menolak pesan itu"],
    },
    {
      key: "manfaat-batas",
      short: "Manfaat & batas",
      title: "Apa manfaat dan batasnya?",
      kind: "Ringkasan",
      body: [
        "HTTP: isi terbaca di perjalanan, identitas server tidak diperiksa, perubahan tidak terdeteksi. HTTPS: isi terenkripsi, identitas server diperiksa untuk domain tujuan, perubahan dapat terdeteksi.",
        "Batasnya: persiapan koneksi menambah pertukaran pesan; HTTPS tidak menjamin website bebas penipuan; browser dan server tetap membaca data di ujung koneksi.",
      ],
      observe: "Bandingkan label pengamat di langkah 1 (isi terbaca) dengan sekarang (hanya data terenkripsi). Hitungan “Terbaca pengamat” tetap 0.",
      idea: "HTTPS melindungi perjalanan data, bukan menjamin kejujuran tujuannya.",
      changes: ["HTTP: terbuka · HTTPS: terenkripsi", "Kinerja bergantung pada kondisi koneksi"],
    },
  ],
  analogy: {
    title: "Kartu pos, amplop terkunci, dan segel",
    mapping: [
      ["Pengirim", "Browser"],
      ["Kartu pos", "Data HTTP tanpa TLS"],
      ["Amplop terkunci", "Data terenkripsi TLS"],
      ["Segel amplop", "Pemeriksaan integritas"],
      ["Kartu identitas penerima", "Sertifikat untuk domain tujuan"],
      ["Penerima", "Server"],
    ],
    limits: [
      "Amplop hanyalah gambaran enkripsi; proses sebenarnya memakai kriptografi, bukan kertas yang menutupi isi.",
      "Segel menggambarkan deteksi perubahan. Pada TLS, data yang diubah tidak sekadar terlihat rusak, tetapi gagal diperiksa dan ditolak.",
    ],
  },
  summary: [
    "HTTPS adalah HTTP yang dilindungi TLS. SSL adalah istilah lama untuk pendahulunya; HTTPS modern memakai TLS.",
    "TLS menyembunyikan isi data di perjalanan, membantu memeriksa identitas server untuk domain tujuan, dan mendeteksi perubahan data.",
    "Sertifikat dipakai untuk memeriksa identitas; kunci enkripsi data dibentuk saat handshake. Keduanya berperan berbeda.",
    "HTTPS tidak menjamin website jujur, tidak menyembunyikan semua informasi jaringan, dan tidak otomatis mengenkripsi database.",
    "HTTPS tidak selalu lebih cepat atau lebih lambat; kinerjanya bergantung pada kondisi koneksi dan penggunaan ulang koneksi.",
  ],
  simplifications: [
    "Diagram ini simulasi pendidikan, bukan implementasi kriptografi. Simbol “▒▒▒” hanyalah ilustrasi data terenkripsi.",
    "Handshake digambarkan sebagai empat pesan bernama sederhana; urutan dan isi pesan TLS sebenarnya lebih rinci, dan sertifikat biasanya dikirim di dalam handshake itu.",
    "Waktu diperlambat agar mudah diamati; tidak ada angka kinerja yang diukur. Contoh hanya mencakup koneksi langsung browser–server tanpa proxy atau CDN.",
    "Rujukan teknis: MDN Web Docs, “Transport Layer Security (TLS)” dan “HTTPS”.",
  ],
};
