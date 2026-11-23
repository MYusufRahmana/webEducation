import type { Lesson } from "../types";

/**
 * Object storage lesson (Indonesian), told with a concert ticket website: a poster, a teaser video and
 * an e-ticket. Numbers come from model.ts and scenarios.ts: 4 drives, each file stored as 4 pieces of
 * which any 2 rebuild it, a temporary link lasts 6 s in the demonstration.
 */
export const OS_LESSON: Lesson = {
  category: "data",
  legacy: { mengapa: "dua-jenis-data" },
  outcomes: [
    "Membedakan data kecil yang disimpan di database dan file besar yang disimpan di object storage.",
    "Menjelaskan bucket dan key, serta cara aplikasi menemukan file lewat key yang dicatat di database.",
    "Menjelaskan mengapa file tetap aman saat satu drive mati, cara kerja link sementara, dan versi file.",
  ],
  steps: [
    {
      key: "dua-jenis-data",
      short: "Dua jenis data",
      title: "Data kecil dan file besar disimpan berbeda",
      kind: "Masalah",
      body: [
        "Website tiket konser menyimpan dua jenis data. Data kecil seperti nama konser, harga, dan pesanan dicatat di {{db|database}}. File besar seperti poster disimpan di {{api|object storage}}.",
        "Database tidak menyimpan posternya. Database cukup mencatat nama file poster, yaitu key-nya.",
      ],
      analogy: "Seperti toko yang menitipkan kardus besar di loket penitipan, lalu cukup mencatat nomor labelnya di buku kasir.",
      observe: "Aplikasi mengirim poster ke object storage dan mendapat jawaban “berhasil”. Setelah itu, database mencatat satu baris: Konser Senja → poster/senja.jpg.",
      changes: ["Object storage: 1 file (3 MB)", "Database: 1 baris berisi key poster"],
      idea: "Database menyimpan catatan kecil; object storage menyimpan file besar.",
      more: ["Amazon S3, Cloudflare R2, dan MinIO adalah contoh object storage. Ketiganya dipakai dengan cara yang sama, lewat aturan yang disebut [[api-s3|API S3]]."],
    },
    {
      key: "bucket-key",
      short: "Bucket & key",
      title: "Setiap file punya nama lengkap di dalam bucket",
      kind: "Proses",
      body: [
        "File disimpan di dalam [[bucket|bucket]], wadah milik satu aplikasi. Bucket ini bernama konser-senja.",
        "Setiap file punya [[key|key]], yaitu nama lengkapnya, misalnya poster/senja.jpg. Kata “poster/” hanyalah awal nama untuk mengelompokkan file, bukan folder sungguhan.",
      ],
      analogy: "Bucket seperti lemari milik toko; key seperti label pada setiap kotak di lemari itu.",
      observe: "Tiga file masuk satu per satu: poster, video teaser, dan e-tiket. Daftar isi bucket bertambah sampai tiga key.",
      changes: ["Isi bucket: 3 file", "Setiap file punya key sendiri"],
      idea: "Bucket adalah wadahnya; key adalah nama lengkap setiap file.",
    },
    {
      key: "ambil-lewat-key",
      short: "Ambil lewat key",
      title: "Membuka halaman konser: cari key, lalu ambil file",
      kind: "Proses",
      body: [
        "Saat halaman Konser Senja dibuka, aplikasi bertanya dulu ke database: “Apa key poster konser ini?” Database menjawab poster/senja.jpg.",
        "Dengan key itu, aplikasi meminta file ke object storage. Object storage langsung mengirim poster yang tepat.",
      ],
      analogy: "Kasir melihat nomor label di bukunya, lalu mengambil kotak dengan label itu di loket penitipan.",
      observe: "Perjalanan pertama menuju database dan kembali membawa key. Perjalanan kedua menuju object storage dan kembali membawa poster.",
      changes: ["Database → key poster/senja.jpg", "Object storage → file poster"],
      idea: "Database memberi tahu key; object storage memberikan filenya.",
    },
    {
      key: "tersebar",
      short: "Disimpan tersebar",
      title: "Satu drive rusak, video tetap bisa diputar",
      kind: "Percobaan",
      body: [
        "Video teaser 40 MB tidak disimpan di satu tempat. Object storage membaginya menjadi 4 {{shards|bagian}} di 4 {{drives|drive}}. Dua bagian saja sudah cukup untuk menyusun video kembali.",
        "Di tengah percobaan, drive 2 rusak. Video tetap bisa diambil dari drive lain.",
      ],
      analogy: "Seperti menyimpan salinan dokumen penting di beberapa lemari; satu lemari terkunci, dokumennya masih bisa didapat.",
      observe: "Empat bagian berjalan ke empat drive. Drive 2 mendapat tanda silang, lalu permintaan video tetap dijawab “berhasil” lewat dua drive lain.",
      changes: ["Drive aktif: 4 → 3", "Video tetap terkirim"],
      idea: "File dibagi ke beberapa drive, jadi satu drive rusak tidak menghilangkan file.",
      more: [
        "Cara ini disebut [[erasure-coding|erasure coding]]. Dalam contoh ini ada 2 bagian data dan 2 bagian cadangan hasil hitungan.",
        "Menyimpan file baru butuh minimal 3 drive aktif; membaca cukup 2. Layanan cloud seperti R2 dan S3 mengurus ini di banyak server.",
      ],
    },
    {
      key: "link-sementara",
      short: "Link sementara",
      title: "Pembeli mengunduh e-tiket dengan link sementara",
      kind: "Proses",
      body: [
        "Bucket tertutup untuk umum. Agar pembeli bisa mengunduh e-tiketnya, aplikasi meminta [[presigned-url|link sementara]] untuk satu file. Link ini berlaku 6 detik di demonstrasi.",
        "{{browser|Browser}} memakai link itu untuk mengunduh langsung dari object storage. Setelah waktunya habis, link yang sama ditolak.",
      ],
      analogy: "Seperti tiket pengambilan barang yang hanya berlaku sampai jam tertentu.",
      observe: "Aplikasi meneruskan link ungu ke browser. Unduhan pertama berhasil; unduhan kedua, setelah link habis, ditolak.",
      changes: ["Unduhan 1: berhasil", "Unduhan 2: link kedaluwarsa, ditolak"],
      idea: "Link sementara memberi akses ke satu file, untuk waktu terbatas, tanpa membuka bucket.",
      more: ["File diunduh langsung dari object storage, tidak lewat server aplikasi, sehingga server aplikasi tidak terbebani. Kode penolakannya adalah 403."],
    },
    {
      key: "versi",
      short: "Ganti file",
      title: "Mengganti poster berarti menyimpan file baru utuh",
      kind: "Proses",
      body: [
        "Poster diperbarui. File tidak diubah sebagian; aplikasi mengirim poster baru dengan key yang sama, dan isinya diganti utuh.",
        "Jika [[versioning|versioning]] aktif, poster lama tetap disimpan sebagai versi 1. Pengunjung selalu mendapat versi terbaru.",
      ],
      analogy: "Kotak lama tidak dibuang; kotak baru ditaruh di depannya dengan label yang sama.",
      observe: "Setelah unggahan kedua, label file menunjukkan v1 dan v2. Permintaan berikutnya mendapat v2.",
      changes: ["poster/senja.jpg: v1 → v2", "Data tersimpan: 3 → 7 MB"],
      idea: "File diganti utuh; dengan versioning, versi lama tetap ada.",
      more: ["Versi lama berguna saat file tertimpa tanpa sengaja, tetapi setiap versi ikut memakan ruang dan biaya."],
    },
  ],
  analogy: {
    title: "Buku kasir dan loket penitipan",
    mapping: [
      ["Kasir toko", "Aplikasi"],
      ["Buku kasir", "Database (catatan kecil + key)"],
      ["Loket penitipan", "Layanan object storage (S3, R2, MinIO)"],
      ["Lemari milik toko", "Bucket"],
      ["Label pada kotak", "Key"],
      ["Kotak barang", "File (objek)"],
      ["Gudang 1–4", "Drive 1–4"],
      ["Tiket ambil berbatas waktu", "Link sementara"],
    ],
    limits: [
      "Barang di gudang tidak bisa dipecah lalu disusun lagi; file bisa, sehingga 2 dari 4 bagian sudah cukup.",
      "Mengambil barang membuatnya keluar dari gudang; mengunduh file tidak menghapus file dari storage.",
    ],
  },
  summary: [
    "Database menyimpan catatan kecil, termasuk key file; object storage menyimpan file besarnya.",
    "File berada di bucket dan ditemukan lewat key; “folder” hanyalah awal nama.",
    "File dibagi ke beberapa drive, sehingga satu drive rusak tidak menghilangkan file.",
    "Link sementara memberi akses langsung ke satu file untuk waktu terbatas.",
    "Mengganti file berarti menyimpan file baru utuh; versioning menyimpan versi lama.",
  ],
  check: {
    question: "Halaman konser perlu menampilkan poster. Di mana aplikasi menemukan nama file poster, dan dari mana posternya diambil?",
    answer: "Nama file (key) dicatat di database; posternya sendiri diambil dari object storage dengan key itu.",
  },
  simplifications: [
    "Waktu diperlambat; permintaan nyata selesai dalam milidetik, dan link sementara biasanya berlaku menit sampai hari.",
    "Pembagian file disederhanakan menjadi 4 bagian di 4 drive. Layanan sungguhan memakai skema dan jumlah server yang jauh lebih besar.",
    "Hak akses, enkripsi, unggahan bertahap, dan biaya penyimpanan tidak disimulasikan.",
  ],
};
