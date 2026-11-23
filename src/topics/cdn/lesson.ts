import type { Lesson } from "../types";

/**
 * CDN lesson (Indonesian) for readers who have never heard of servers. Jakarta and Singapore are
 * illustrative places; times in the figure are simulated, never measurements. Numbers come from
 * model.ts and scenarios.ts.
 */
export const CDN_LESSON: Lesson = {
  category: "jaringan",
  outcomes: [
    "Menjelaskan dari mana gambar website dikirim dan mengapa jarak perjalanan memengaruhi waktu tampil.",
    "Menjelaskan fungsi CDN serta perbedaan cache miss dan cache hit.",
    "Menjelaskan mengapa CDN mengurangi permintaan ke server asal, tetapi tidak memproses pembelian.",
  ],
  steps: [
    {
      key: "buka-website",
      short: "Buka website",
      title: "Kamu membuka website",
      kind: "Masalah",
      body: [
        "{{andi|Andi}} membuka website tiket konser dari Jakarta. Untuk menampilkan poster, browser perlu meminta gambar ke tempat penyimpanannya.",
        "Tempat itu adalah {{origin|server asal}} website, di Singapura.",
      ],
      observe: "Poster belum ada di layar. Browser perlu mengambilnya terlebih dahulu. Klik “Muat poster”, lalu ikuti perjalanannya.",
      changes: ["Layar Andi: poster belum tampil"],
      idea: "Gambar di website harus diambil dulu dari tempat penyimpanannya.",
    },
    {
      key: "dari-singapura",
      short: "Dari Singapura",
      title: "Poster datang dari Singapura",
      kind: "Proses",
      body: [
        "Permintaan Andi berjalan ke server asal di Singapura. Server lalu mengirim poster kembali ke Jakarta.",
        "Semakin panjang perjalanannya, semakin lama poster sampai di layar.",
      ],
      observe: "Ikuti permintaan yang pergi (amplop “Minta poster”) dan gambar yang kembali (kartu “Poster konser”). Status layar berganti: Meminta poster → Mengambil dari server asal → Poster tampil.",
      changes: ["Pengambilan dari server asal: 1", "Layar Andi: poster tampil"],
      idea: "Permintaan pergi, gambar kembali; jarak perjalanan memengaruhi waktu tampil.",
    },
    {
      key: "banyak-orang",
      short: "Banyak pengunjung",
      title: "Banyak orang meminta poster yang sama",
      kind: "Masalah",
      body: [
        "Andi bukan satu-satunya pengunjung. Budi dan Citra di Jakarta juga membuka poster yang sama.",
        "Tanpa salinan di dekat mereka, server asal mengirim poster yang sama berulang kali ke Jakarta.",
      ],
      observe: "Gambarnya sama, tetapi pengiriman dari server asal terjadi berulang kali. Penghitung “Pengambilan dari server asal” naik menjadi 3.",
      changes: ["Pengambilan dari server asal: 1 → 3"],
      idea: "Gambar yang sama bisa dikirim berulang kali dari tempat yang jauh.",
    },
    {
      key: "tambah-cdn",
      short: "Tambah CDN",
      title: "Tambahkan CDN di Jakarta",
      kind: "Proses",
      body: [
        "[[cdn|CDN]] menyediakan server distribusi di berbagai lokasi. Dalam contoh ini, ada {{cdn|CDN Jakarta}} yang dapat menyimpan salinan poster.",
        "Mulai sekarang, permintaan poster dari browser menuju CDN Jakarta terlebih dahulu. Server asal tetap ada di Singapura.",
      ],
      analogy: "Seperti gudang pusat di Singapura yang membuka cabang distribusi di Jakarta.",
      observe: "CDN Jakarta muncul di titik yang tadinya hanya jalur jaringan. Labelnya: “Salinan poster: belum tersedia”.",
      changes: ["CDN Jakarta aktif", "Salinan poster: belum tersedia"],
      idea: "CDN menaruh server distribusi lebih dekat ke pengunjung.",
      more: ["CDN tidak selalu memilih server yang paling dekat secara peta. Pemilihannya juga bergantung pada kondisi jaringan dan kebijakan penyedia."],
    },
    {
      key: "cache-miss",
      short: "Cache miss",
      title: "CDN belum mempunyai posternya",
      kind: "Proses",
      body: [
        "CDN Jakarta belum menyimpan poster yang diminta Andi. CDN mengambilnya dari server asal di Singapura, mengirimkannya ke Andi, lalu menyimpan salinannya sesuai aturan cache.",
        "Kondisi ini disebut [[miss|cache miss]]: salinan belum tersedia.",
      ],
      analogy: "Cabang belum punya poster, jadi cabang memesannya dari gudang pusat dulu.",
      observe: "Pada permintaan ini, CDN masih perlu menghubungi Singapura. Setelah poster tiba, gambar kecil poster muncul di CDN dan labelnya berubah menjadi “Salinan poster: tersedia”.",
      changes: ["Cache miss: 1", "Salinan poster: tersedia · berlaku 60 dtk"],
      idea: "Permintaan pertama ke CDN belum tentu lebih cepat, karena CDN mungkin harus mengambil dari server asal.",
    },
    {
      key: "cache-hit",
      short: "Cache hit",
      title: "Pengunjung berikutnya dilayani dari Jakarta",
      kind: "Proses",
      body: [
        "Budi membuka poster yang sama. Salinannya sudah ada dan masih berlaku di CDN Jakarta, jadi poster langsung dikirim dari sana.",
        "Kondisi ini disebut [[hit|cache hit]]: salinan tersedia dan bisa digunakan.",
      ],
      analogy: "Cabang sudah punya poster, jadi pelanggan langsung dilayani tanpa menunggu kiriman dari pusat.",
      observe: "Perjalanan gambar sekarang cukup melalui CDN di Jakarta. Jalur ke Singapura redup dengan label “Server asal tidak dihubungi untuk gambar ini”.",
      changes: ["Cache hit: 1", "Pengambilan dari server asal tetap 1"],
      idea: "Satu salinan di dekat pengunjung bisa melayani banyak permintaan.",
      more: ["Salinan hanya dipakai selama masih berlaku. Setelah masa berlakunya habis, CDN mengambil ulang dari server asal."],
    },
    {
      key: "bandingkan",
      short: "Bandingkan",
      title: "Bandingkan sendiri",
      kind: "Percobaan",
      body: [
        "Andi memuat poster yang sama dua kali: sekali tanpa CDN, sekali dengan CDN yang sudah punya salinan.",
        "Coba sendiri dengan tombol di diagram. “Kosongkan salinan CDN” membuat permintaan berikutnya menjadi cache miss lagi.",
      ],
      observe: "Kartu perbandingan menunjukkan jalur, waktu simulasi sampai poster tampil, dan jumlah pengambilan dari server asal untuk setiap cara.",
      changes: ["Tanpa CDN: Jakarta → Singapura → Jakarta", "Dengan CDN: Jakarta → CDN Jakarta → Jakarta"],
      idea: "Dengan salinan yang tersedia, perjalanan gambar lebih pendek dan server asal tidak perlu dihubungi.",
      more: ["Waktu di demonstrasi ini adalah simulasi yang diperlambat, bukan hasil pengukuran jaringan Jakarta–Singapura."],
    },
    {
      key: "lihat-vs-beli",
      short: "Lihat vs beli",
      title: "Apa yang sebenarnya dipercepat?",
      kind: "Ringkasan",
      body: [
        "CDN membantu mengirimkan gambar dan file website. Ketersediaan kursi dan pembayaran tetap diproses oleh {{buy|aplikasi pembelian}}.",
        "“Lihat poster” bisa dilayani CDN; “Beli tiket” diteruskan ke aplikasi pembelian.",
      ],
      observe: "Poster yang cepat tampil belum berarti transaksi sudah diproses. Permintaan “Beli tiket” melewati CDN tanpa memakai salinan dan diproses di Singapura.",
      changes: ["Lihat poster: dari CDN", "Beli tiket: diproses aplikasi pembelian"],
      idea: "CDN mempercepat pengiriman konten, bukan memproses transaksi.",
      more: ["Data pribadi dan pembayaran tidak disimpan sebagai salinan bersama di CDN."],
    },
  ],
  analogy: {
    title: "Gudang pusat dan cabang",
    mapping: [
      ["Pelanggan di Jakarta", "Browser pengguna"],
      ["Gudang poster pusat di Singapura", "Server asal"],
      ["Cabang distribusi di Jakarta", "CDN Jakarta"],
      ["Poster yang dikirim", "Data gambar"],
      ["Cabang belum punya poster", "Cache miss"],
      ["Cabang sudah punya poster", "Cache hit"],
    ],
    limits: [
      "Data digital disalin, bukan dipindahkan: gudang pusat tetap memegang posternya.",
      "Mengirim data tidak memakan waktu berhari-hari seperti barang; perbedaannya dalam hitungan milidetik.",
    ],
  },
  summary: [
    "CDN menyimpan salinan konten di berbagai lokasi. Ketika salinan tersedia dan masih berlaku, pengguna bisa mendapatkannya tanpa selalu mengambil dari server asal.",
    "Cache miss: CDN belum punya salinan dan mengambil dari server asal. Cache hit: salinan tersedia dan langsung dikirim.",
    "CDN bukan pengganti server asal, dan tidak memproses pembelian.",
  ],
  check: {
    question: "CDN Jakarta sudah mempunyai salinan poster yang masih berlaku. Apakah setiap pengunjung berikutnya harus mengambil poster dari Singapura?",
    answer: "Tidak. CDN dapat mengirim salinan tersebut langsung kepada pengguna.",
  },
  simplifications: [
    "Peta dan jalur merupakan ilustrasi. Lokasi dan jalur CDN sesungguhnya bergantung pada penyedia dan kondisi jaringan.",
    "Waktu adalah simulasi yang diperlambat, bukan pengukuran nyata.",
    "Masa berlaku salinan dibuat 60 detik untuk demonstrasi; aturan cache sungguhan diatur pengelola website.",
  ],
};
