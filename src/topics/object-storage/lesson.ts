import type { Lesson } from "../types";

/**
 * Object storage lesson (Indonesian). Numbers come from model.ts and scenarios.ts: 4 drives,
 * each object written as 4 shards (2 data + 2 parity), a write needs 3 drives, a read needs 2,
 * a temporary link lasts 6 s in the demonstration.
 */
export const OS_LESSON: Lesson = {
  category: "data",
  outcomes: [
    "Membedakan kapan data disimpan di database dan kapan file disimpan di object storage.",
    "Menjelaskan bucket, key, dan objek, serta mengapa “folder” hanya awalan nama.",
    "Menjelaskan mengapa file tetap aman saat satu drive mati, dan cara link sementara bekerja.",
  ],
  steps: [
    {
      key: "mengapa",
      short: "Mengapa",
      title: "File besar tidak cocok di tabel database",
      kind: "Masalah",
      body: [
        "Database cocok untuk data kecil yang sering dicari dan diubah: nama pengguna, harga, status pesanan. Foto, video, dan PDF berbeda: ukurannya besar, jarang diubah, dan biasanya hanya perlu disimpan lalu diambil utuh.",
        "Untuk file seperti itu dipakai [[object-storage|object storage]]. {{app|Aplikasi}} mengirim file ke {{api|layanan penyimpanan}} lewat [[api-s3|API S3]], lalu file disimpan di {{bucket|bucket}}. Database cukup menyimpan alamat filenya.",
        "Amazon S3, Cloudflare R2, dan MinIO memakai cara yang sama. MinIO bisa kamu jalankan di server sendiri; R2 dan S3 adalah layanan cloud.",
      ],
      analogy: "Seperti loket penitipan barang: toko tidak menaruh kardus besar di meja kasir, tetapi menitipkannya dan cukup mencatat nomor labelnya.",
      observe: "Aplikasi mengirim foto/kucing.jpg ke layanan penyimpanan, lalu menerima balasan 200 OK. Jumlah objek di bucket menjadi 1.",
      idea: "Database menyimpan data kecil yang dicari; object storage menyimpan file utuh yang besar.",
    },
    {
      key: "bucket-key",
      short: "Bucket & key",
      title: "Setiap file punya nama lengkap di dalam bucket",
      kind: "Proses",
      body: [
        "[[bucket|Bucket]] adalah wadah milik satu aplikasi, misalnya foto-toko. Setiap file di dalamnya disebut [[object|objek]]: isi file, ditambah [[metadata|metadata]] seperti tipe dan ukurannya.",
        "Objek ditemukan lewat [[key|key]], nama lengkapnya: foto/kucing.jpg. Garis miring hanya bagian dari nama. Tidak ada folder sungguhan; “foto/” adalah awalan yang memudahkan pengelompokan.",
        "Untuk mengambil file, aplikasi cukup menyebut bucket dan key-nya. Layanan mencari key itu lalu mengirim isinya.",
      ],
      observe: "Tiga objek masuk ke bucket dengan tiga key berbeda. Lalu aplikasi meminta foto/anjing.jpg, dan hanya objek itu yang dikirim kembali.",
      idea: "Bucket adalah wadahnya, key adalah nama lengkap objek; “folder” hanyalah awalan nama.",
    },
    {
      key: "tersebar",
      short: "Disimpan tersebar",
      title: "Satu drive mati, video tetap utuh",
      kind: "Percobaan",
      body: [
        "Video 40 MB tidak disimpan di satu tempat. Layanan memecahnya menjadi 4 bagian di 4 {{drives|drive}}: 2 bagian data dan 2 bagian cadangan hitungan. Cara ini disebut [[erasure-coding|erasure coding]], seperti yang dipakai MinIO.",
        "Pada detik 3,4 drive 2 berhenti. Untuk membaca, cukup 2 dari 4 {{shards|bagian}} mana pun, jadi video tetap bisa dibangun ulang dan dikirim.",
        "Menulis lebih ketat: perlu minimal 3 drive aktif. Layanan cloud seperti R2 dan S3 melakukan hal serupa di banyak server, dan kamu tidak perlu mengurusnya.",
      ],
      observe: "Empat bagian berjalan ke empat drive. Setelah drive 2 bertanda silang, permintaan baca tetap mendapat 200 OK dari dua drive lain.",
      idea: "Satu file dipecah ke beberapa drive, jadi satu drive mati tidak menghilangkan file.",
    },
    {
      key: "link-sementara",
      short: "Link sementara",
      title: "Browser mengunduh langsung dengan link sementara",
      kind: "Proses",
      body: [
        "Bucket biasanya tertutup untuk umum. Agar pengguna bisa mengunduh tanpa membuka akses, aplikasi meminta [[presigned-url|link sementara]] untuk satu key, berlaku beberapa saat. Di demonstrasi ini 6 detik.",
        "{{browser|Browser}} memakai link itu untuk mengunduh langsung dari layanan penyimpanan. File tidak lewat server aplikasi, sehingga server tidak terbebani.",
        "Setelah waktunya habis, link yang sama ditolak dengan 403. Orang yang menyalin link tidak bisa memakainya selamanya.",
      ],
      analogy: "Seperti tiket pengambilan barang yang hanya berlaku sampai jam tertentu.",
      observe: "Aplikasi menerima link berwarna ungu dan meneruskannya ke browser. Unduhan pertama mendapat 200 OK; unduhan kedua setelah link habis mendapat 403.",
      idea: "Link sementara memberi akses ke satu objek, untuk waktu terbatas, tanpa membuka bucket.",
    },
    {
      key: "versi",
      short: "Versi",
      title: "Menyimpan ulang berarti mengganti seluruh objek",
      kind: "Proses",
      body: [
        "Objek tidak diubah sebagian seperti baris di tabel. Untuk memperbarui foto/kucing.jpg, aplikasi mengirim file baru dengan key yang sama, dan seluruh isinya diganti.",
        "Jika [[versioning|versioning]] aktif, isi lama tidak hilang. Versi 1 tetap disimpan, versi 2 menjadi yang terbaru, dan permintaan baca selalu mendapat versi terbaru.",
        "Versi lama berguna saat file tertimpa tidak sengaja, tetapi setiap versi ikut memakan ruang dan biaya.",
      ],
      observe: "Setelah unggahan kedua, label versi menunjukkan v1 dan v2. Total data naik dari 3 ke 7 MB, dan pembacaan berikutnya mengembalikan v2.",
      idea: "Objek diganti utuh; dengan versioning, versi lama tetap ada.",
    },
  ],
  analogy: {
    title: "Loket penitipan barang",
    mapping: [
      ["Toko yang menitipkan", "Aplikasi"],
      ["Loket penitipan", "Layanan object storage (MinIO, R2, S3)"],
      ["Lemari milik toko", "Bucket"],
      ["Label nomor pada kotak", "Key"],
      ["Kotak barang", "Objek"],
      ["Gudang 1–4", "Drive"],
      ["Tiket ambil berbatas waktu", "Link sementara (presigned URL)"],
    ],
    limits: [
      "Barang di gudang tidak bisa dipecah lalu disusun lagi; file bisa, sehingga 2 dari 4 bagian sudah cukup untuk membangunnya kembali.",
      "Mengambil barang biasanya membuat barang itu keluar dari gudang; mengunduh file tidak menghapus objeknya.",
    ],
  },
  summary: [
    "Database untuk data kecil yang sering dicari dan diubah; object storage untuk file besar yang disimpan dan diambil utuh.",
    "Objek berada di bucket dan ditemukan lewat key; “folder” hanyalah awalan nama.",
    "File dipecah ke beberapa drive, sehingga satu drive mati tidak menghilangkan file.",
    "Link sementara memberi akses langsung ke satu objek untuk waktu terbatas.",
    "MinIO, Cloudflare R2, dan Amazon S3 memakai API S3 yang sama, jadi aplikasi bisa berpindah penyedia dengan sedikit perubahan.",
  ],
  simplifications: [
    "Waktu sengaja diperlambat; permintaan nyata selesai dalam milidetik, dan link sementara biasanya berlaku menit sampai hari.",
    "Erasure coding disederhanakan menjadi 2 bagian data + 2 cadangan di 4 drive. MinIO, R2, dan S3 memakai skema dan jumlah server yang jauh lebih besar.",
    "Hak akses, enkripsi, unggahan bertahap (multipart), dan biaya transfer data (R2 tidak menarik biaya egress, S3 menarik) tidak disimulasikan.",
  ],
};
