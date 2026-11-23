import type { Lesson } from "../types";

/**
 * DNS lesson (Indonesian), eight windows on one story (see scenarios.ts). Numbers come from
 * model.ts: a full lookup takes 6 s, a local-cache answer 0.3 s, a resolver-cache answer 1.8 s,
 * TTL 12 s, the device keeps an answer at most 5 s, the record changes at 15 s.
 */
export const DNS_LESSON: Lesson = {
  category: "jaringan",
  outcomes: [
    "Memahami nama website sebagai nama toko, dan alamat IP sebagai alamat tujuannya.",
    "Mengikuti petugas pencari alamat (resolver) dari root, TLD, sampai jawaban resmi.",
    "Menjelaskan mengapa catatan sementara (cache) mempercepat pencarian, tetapi bisa masih berisi alamat lama.",
  ],
  steps: [
    {
      key: "butuh-alamat",
      changes: ["Mulai dari perangkat yang membutuhkan alamat."],
      short: "Butuh alamat",
      title: "Kamu tahu nama tokonya, belum alamatnya",
      kind: "Masalah",
      body: [
        "Bayangkan kamu ingin ke sebuah toko. Kamu ingat namanya, tetapi belum tahu alamat jalannya. Nama website seperti contoh.id itu seperti nama toko; [[ip-address|alamat IP]], misalnya 203.0.113.10, adalah alamat tujuannya.",
        "[[dns|DNS]] membantu mencari alamat itu. {{client|Klien}} adalah perangkatmu. Ia memeriksa {{localCache|catatan alamat di perangkat}} lebih dulu. Karena belum ada, pertanyaan harus dibawa keluar.",
        "Setelah IP ditemukan, browser baru menghubungi server website. DNS hanya mencari alamat; isi halaman diambil pada proses berikutnya.",
      ],
      observe: "Pertanyaan “contoh.id?” muncul di perangkat. Label catatan perangkat masih kosong, jadi pertanyaan harus dibawa keluar.",
      idea: "DNS menukar nama yang mudah diingat menjadi alamat IP yang dibutuhkan komputer.",
    },
    {
      key: "resolver",
      changes: ["Resolver membantu mencarikan alamat."],
      short: "Resolver",
      title: "Pertanyaan dibawa ke petugas pencari alamat",
      kind: "Analogi",
      body: [
        "Perangkatmu meminta bantuan {{resolver|petugas pencari alamat, yaitu resolver}}: “Tolong carikan alamat contoh.id.” Resolver biasanya disediakan penyedia internet atau jaringan kantormu.",
        "Resolver memeriksa {{resolverCache|catatannya sendiri}} lebih dulu. Catatannya juga kosong, jadi ia harus mencari jawaban ke luar.",
        "Mulai sekarang resolver yang bekerja. Perangkatmu cukup menunggu sampai jawaban dibawa kembali.",
      ],
      analogy: "Resolver seperti petugas meja informasi: kamu cukup bertanya sekali, petugas yang mendatangi meja-meja lain.",
      observe: "Pertanyaan berjalan ke resolver. Label cache resolver juga kosong, lalu pertanyaan berangkat ke root.",
      idea: "Perangkatmu hanya bertanya ke resolver; resolver yang mencarikan jawabannya.",
    },
    {
      key: "root",
      changes: ["Root memberi petunjuk pengelola .id."],
      short: "Root",
      title: "Root menunjuk ke meja .id",
      kind: "Proses",
      body: [
        "Resolver bertanya ke {{root|root}}, tingkat tertinggi, seperti pusat informasi. Root tidak tahu alamat contoh.id.",
        "Root tahu siapa yang mengurus nama berakhiran .id, jadi jawabannya: “Tanyakan ke meja .id.” Jawaban seperti ini disebut [[referral|rujukan]]: petunjuk harus bertanya ke mana, belum alamat IP.",
        "Rujukan itu kembali ke resolver. Root tidak meneruskan pertanyaan ke meja lain.",
      ],
      observe: "Pertanyaan menuju root dan kembali ke resolver sebagai rujukan ungu: “→ tanya .id”, bukan alamat IP.",
      idea: "Root memberi petunjuk, bukan alamat akhir.",
    },
    {
      key: "tld",
      changes: ["TLD menunjukkan pengelola contoh.id."],
      short: "TLD .id",
      title: "Meja .id menunjuk ke pengelola contoh.id",
      kind: "Proses",
      body: [
        "Berbekal rujukan, resolver bertanya ke {{tld|server TLD .id}}, seperti direktori wilayah yang mengurus semua nama berakhiran .id.",
        "Jawabannya: “Untuk contoh.id, tanyakan ke pengelola domain ini.” Sekali lagi resolver mendapat rujukan, bukan alamat akhir.",
        "Kartu panah kembali ke resolver. Setiap meja membalas resolver; tidak ada meja yang meneruskan pertanyaan secara berantai.",
      ],
      observe: "Pertanyaan menuju TLD .id dan kembali ke resolver sebagai rujukan ungu: “→ tanya contoh.id”.",
      idea: "TLD mempersempit pencarian ke server yang memegang catatan resmi.",
    },
    {
      key: "authoritative",
      changes: ["Catatan resmi memberikan alamat IP."],
      short: "Authoritative",
      title: "Pengelola contoh.id memberi alamat resmi",
      kind: "Proses",
      body: [
        "Resolver bertanya ke {{auth|server authoritative}} untuk contoh.id. Server inilah yang memegang catatan resmi.",
        "Jawabannya: “Alamat IP-nya 203.0.113.10”, beserta [[ttl|TTL]], yaitu berapa lama jawaban itu boleh dipakai ulang. Di sini TTL-nya 12 detik.",
        "Resolver membawa jawaban kembali ke perangkatmu. Seluruh perjalanan pertama ini memakan 6 detik dalam demonstrasi; pencarian nyata biasanya hanya milidetik.",
      ],
      observe: "Dari server authoritative kembali jawaban hijau berisi 203.0.113.10, lalu jawaban itu dibawa resolver ke perangkat.",
      idea: "Hanya server authoritative yang memberi alamat resmi; root dan TLD memberi rujukan.",
    },
    {
      key: "simpan-jawaban",
      changes: ["Salinan jawaban disimpan untuk pencarian berikutnya."],
      short: "Simpan jawaban",
      title: "Jawaban disimpan agar tidak bertanya dari awal",
      kind: "Proses",
      body: [
        "Setelah alamat ditemukan, kamu menuliskannya agar besok tidak perlu bertanya lagi. DNS juga begitu: jawaban disalin ke {{resolverCache|catatan resolver}} dan {{localCache|catatan perangkat}}. Simpanan sementara ini disebut [[cache|cache]].",
        "Ketika perangkat menanyakan contoh.id lagi dan catatannya masih berlaku, ia langsung memakai alamat tersimpan. Pertanyaan #2 dan #3 dijawab dalam 0,3 detik tanpa menghubungi siapa pun.",
        "Catatan di perangkat dalam demonstrasi ini disimpan paling lama 5 detik.",
      ],
      observe: "Label catatan perangkat dan cache resolver kini berisi alamat dengan sisa waktunya. Pertanyaan #2 dan #3 tidak meninggalkan perangkat; kunjungan server tetap 3.",
      idea: "Cache menjawab pertanyaan yang sama tanpa pencarian ulang.",
    },
    {
      key: "cache-resolver",
      changes: ["Catatan resolver menjawab tanpa pencarian lengkap."],
      short: "Cache resolver",
      title: "Catatanmu habis, resolver masih punya salinan",
      kind: "Proses",
      body: [
        "Pada detik 11,5 catatan di perangkatmu kedaluwarsa. Pertanyaan #4 tidak menemukan jawaban di perangkat, jadi dibawa ke resolver.",
        "{{resolverCache|Catatan resolver}} masih berlaku, jadi resolver menjawab sendiri tanpa bertanya ke root, TLD, atau authoritative. Jawaban datang dalam 1,8 detik: lebih lambat dari catatan perangkat, tetapi jauh lebih cepat dari pencarian penuh.",
        "Satu resolver melayani banyak perangkat. Jawaban yang disimpannya ikut mempercepat pencarian orang lain untuk nama yang sama.",
      ],
      observe: "Pertanyaan #4 berhenti di resolver lalu kembali sebagai jawaban. Tidak ada pertanyaan yang menuju root, TLD, atau authoritative.",
      idea: "Cache resolver adalah jalan pintas kedua yang dipakai bersama banyak perangkat.",
    },
    {
      key: "ttl",
      changes: ["Alamat resmi berubah; cache lama menunggu kedaluwarsa."],
      short: "TTL",
      title: "Toko pindah, catatan lama belum habis",
      kind: "Percobaan",
      body: [
        "Pada detik 15 pemilik contoh.id memindahkan situsnya. {{auth|Server authoritative}} kini memberi IP baru, 203.0.113.20, tetapi catatan lama masih tersimpan.",
        "Pertanyaan #5 dijawab dari cache perangkat dengan alamat lama, karena TTL-nya belum habis. Jawaban seperti ini disebut [[stale|basi (stale)]].",
        "Setelah kedua catatan kedaluwarsa, pertanyaan #6 mencari dari awal dan mendapat IP baru. TTL bukan waktu tunggu membuka website, melainkan batas penggunaan ulang jawaban.",
      ],
      observe: "Catatan resmi berganti ke 203.0.113.20, sementara perangkat masih menerima 203.0.113.10 (kuning: alamat lama). Setelah kedua catatan habis, jawaban berikutnya berisi alamat baru.",
      idea: "Selama TTL belum habis, cache bisa memberi alamat lama walau catatan resmi sudah berubah.",
    },
  ],
  legacy: { why: "butuh-alamat", tiers: "root", cache: "simpan-jawaban", "resolver-cache": "cache-resolver", ttl: "ttl" },
  analogy: {
    title: "Mencari alamat toko lewat meja informasi",
    mapping: [
      ["Nama toko", "Nama domain (contoh.id)"],
      ["Alamat jalan", "Alamat IP"],
      ["Petugas meja informasi", "Resolver"],
      ["Pusat informasi dan direktori wilayah", "Root dan TLD"],
      ["Pengelola toko", "Server authoritative"],
      ["Catatan di saku dengan tanggal berlaku", "Cache dan TTL"],
    ],
    limits: [
      "Petugas sungguhan bisa diantar dari meja ke meja; dalam DNS setiap meja membalas resolver, lalu resolver yang bertanya lagi.",
      "Menemukan alamat belum berarti sampai di toko: setelah DNS selesai, browser masih harus menghubungi server website.",
    ],
  },
  summary: [
    "Perangkat memeriksa catatannya sendiri; bila kosong, ia bertanya ke resolver.",
    "Resolver mencari bertingkat: root merujuk ke TLD, TLD merujuk ke server authoritative, dan authoritative memberi IP resmi.",
    "Jawaban disimpan di cache resolver dan perangkat selama TTL, sehingga pertanyaan berikutnya jauh lebih cepat.",
    "Selama TTL belum habis, cache bisa memberi alamat lama walau catatan resmi sudah berubah.",
  ],
  simplifications: [
    "Angka waktu (6 detik untuk pencarian penuh, TTL 12 detik, simpanan perangkat 5 detik) dipilih agar mudah diamati; pencarian nyata biasanya milidetik dan TTL menit sampai jam.",
    "Resolver nyata juga menyimpan rujukan root dan TLD; hal ini tidak disimulasikan.",
    "Hanya satu nama dan satu jenis catatan (A); cache browser dan router digabung menjadi satu catatan perangkat.",
  ],
};
