import type { Lesson } from "../types";

/**
 * Message queue lesson (Indonesian). Numbers come from model.ts and scenarios.ts: a message every
 * 2.5 s, 0.7 s delivery + 0.5 s processing, ack timeout 2 s, capacity 12, a burst of 6 at 3 s
 * (peak depth 5), C1 stops at 5 s (depth 0 → 4 by 14 s), C1 dies with #2 at 4.5 s, C2 joins at 8 s.
 */
export const MQ_LESSON: Lesson = {
  category: "komunikasi",
  outcomes: [
    "Menjelaskan bagaimana antrean memisahkan pengirim pesan dari pemrosesnya.",
    "Membaca kedalaman antrean saat terjadi lonjakan dan saat consumer berhenti.",
    "Menjelaskan acknowledgment dan pengiriman ulang, serta mengapa pesan bisa diproses lebih dari sekali.",
  ],
  steps: [
    {
      key: "mengapa-antrean",
      changes: ["Pengirim menitipkan pesan sebelum diproses."],
      short: "Mengapa antrean",
      title: "Pengirim tidak perlu menunggu pemroses",
      kind: "Masalah",
      body: [
        "Tanpa antrean, pengirim harus menunggu penerima siap. Jika penerima sibuk atau mati, pengirim ikut tertahan atau pekerjaannya hilang. Keduanya harus hidup dan sama cepat.",
        "[[message-queue|Message queue]] menaruh tempat penyimpanan di antara keduanya. {{producer|Producer}} menitipkan setiap [[message|pesan]] ke {{queue|antrean}}, lalu langsung kembali bekerja. [[broker|Broker]] menyerahkan pesan dari kepala antrean ke [[consumer|consumer]] ketika consumer siap.",
              ],
      analogy: "Seperti kertas pesanan di dapur restoran: kasir menjepit pesanan di rel, juru masak mengambilnya dari ujung saat siap.",
      observe: "Satu pesan keluar dari producer setiap 2,5 detik, singgah di antrean, lalu diserahkan ke C1. Antrean hampir selalu kosong.",
      idea: "Antrean memisahkan saat pesan dikirim dari saat pesan diproses.",
    },
    {
      key: "lonjakan",
      changes: ["Pesan menunggu ketika laju masuk meningkat."],
      short: "Lonjakan",
      title: "Enam pesan datang sekaligus",
      kind: "Proses",
      body: [
        "Pada detik 3 producer mengirim enam pesan sekaligus. Consumer tetap memproses satu pesan setiap 1,2 detik, jadi pesan yang belum terlayani menunggu di {{queue|antrean}}.",
        "Jumlah pesan yang menunggu disebut [[depth|kedalaman antrean]]. Kedalaman naik selama lonjakan, lalu turun perlahan karena consumer lebih cepat daripada laju kirim normal.",
        "Antrean ini [[fifo|FIFO]]: pesan yang masuk lebih dulu diproses lebih dulu, sehingga urutan selesai tetap #1, #2, #3, dan seterusnya.",
      ],
      observe: "Kedalaman antrean naik hingga lima pesan, lalu berkurang satu per satu. Tidak ada pesan yang ditolak.",
      idea: "Antrean menampung lonjakan sehingga pemroses bisa bekerja pada kecepatannya sendiri.",
    },
    {
      key: "consumer-berhenti",
      changes: ["Consumer berhenti; antrean tetap menyimpan pesan."],
      short: "Consumer berhenti",
      title: "Consumer berhenti, pesan menumpuk tanpa hilang",
      kind: "Percobaan",
      body: [
        "Pada detik 5 {{consumer1|consumer C1}} berhenti. Lampu dayanya padam. Saat itu C1 sedang tidak memegang pesan.",
        "Producer tidak terpengaruh. Pesan baru tetap dikirim setiap 2,5 detik dan menunggu di antrean, karena broker tidak punya consumer yang siap menerima.",
        "Tidak ada pesan yang hilang. Begitu consumer kembali, pesan diproses mulai dari yang paling lama. Antrean punya kapasitas, di sini 12 pesan; pesan berikutnya ditolak bila antrean penuh.",
      ],
      observe: "Kedalaman antrean naik dari 0 ke 4, sementara jumlah pesan yang dikirim producer terus bertambah.",
      idea: "Saat pemroses berhenti, pesan menunggu di antrean selama kapasitasnya masih cukup.",
    },
    {
      key: "ack",
      changes: ["Pekerjaan belum diakui dapat dikirim ulang."],
      short: "Ack",
      title: "Consumer mati sebelum mengirim ack",
      kind: "Proses",
      body: [
        "Broker tidak langsung menghapus pesan yang diserahkan. Salinannya disimpan sebagai {{unacked|pesan belum di-ack}} sampai consumer mengirim [[ack|acknowledgment]] ({{ackLines|ack}}).",
        "Pada detik 4,5 C1 mati saat memproses pesan #2. Pesan yang sedang diproses hilang, tetapi broker masih memegang salinannya dan menunggu sampai [[ack-timeout|batas waktu ack]], di sini 2 detik.",
        "Karena ack tidak datang, broker mengembalikan #2 ke kepala antrean dan mengirimnya lagi sebagai percobaan ke-2. Inilah pengiriman [[at-least-once|setidaknya sekali]]: pesan yang sama bisa diproses lebih dari sekali.",
      ],
      observe: "Tanda silang merah muncul di C1 dan label broker “belum di-ack” tetap 1. Setelah 2 detik, #2 kembali ke antrean (kuning: dikirim ulang) dan dikirim lagi.",
      idea: "Pesan baru dihapus setelah ack; tanpa ack, pesan dikirim ulang dan bisa diproses dua kali.",
    },
    {
      key: "tambah-consumer",
      changes: ["Consumer kedua membantu memproses antrean."],
      short: "Tambah consumer",
      title: "Consumer kedua ikut mengambil pesan",
      kind: "Proses",
      body: [
        "Sekarang producer mengirim satu pesan setiap 0,7 detik, lebih cepat dari kemampuan satu consumer. Antrean terus memanjang.",
        "Pada detik 8 {{consumer2|consumer C2}} dihubungkan ke antrean lewat {{lanes|jalurnya}}. Kedua consumer mengambil dari antrean yang sama, dan setiap pesan hanya diserahkan ke satu consumer. Pola ini disebut [[competing-consumers|competing consumers]].",
        "Dengan dua consumer, pesan selesai lebih cepat daripada datangnya, sehingga antrean menyusut. Urutan selesai tidak lagi dijamin persis berurutan.",
      ],
      observe: "Sebelum detik 8 kedalaman antrean naik. Setelah C2 terhubung, kedua consumer memproses pesan dan kedalaman turun.",
      idea: "Menambah consumer pada antrean yang sama membagi pekerjaan, dengan urutan selesai yang tidak lagi ketat.",
    },
  ],
  legacy: { why: "mengapa-antrean", buffer: "lonjakan", "consumer-down": "consumer-berhenti", ack: "ack", scale: "tambah-consumer" },
  analogy: {
    title: "Rel pesanan di dapur restoran",
    mapping: [
      ["Kasir yang menulis pesanan", "Producer"],
      ["Rel tempat kertas pesanan dijepit", "Antrean"],
      ["Kepala dapur yang membagi pesanan", "Broker"],
      ["Juru masak", "Consumer"],
      ["Pesanan dicoret setelah selesai", "Ack"],
    ],
    limits: [
      "Di dapur, pesanan jarang dimasak dua kali. Pada antrean, pesan yang dikirim ulang bisa benar-benar diproses dua kali; antrean tidak menjamin exactly-once.",
      "Rel pesanan bisa ditambah panjang seenaknya; antrean punya kapasitas, dan pesan berikutnya ditolak saat penuh.",
    ],
  },
  summary: [
    "Producer menitipkan pesan ke antrean dan tidak menunggu consumer; keduanya bekerja pada kecepatan berbeda.",
    "Antrean menampung lonjakan dan pesan saat consumer berhenti, sampai batas kapasitasnya.",
    "Broker menghapus pesan hanya setelah menerima ack; tanpa ack sebelum batas waktu, pesan dikirim ulang.",
    "Karena bisa dikirim ulang, pemrosesan sebaiknya aman bila diulang (idempoten).",
  ],
  simplifications: [
    "Angka waktu (kirim setiap 2,5 detik, proses 1,2 detik, batas ack 2 detik, kapasitas 12) dipilih agar mudah diamati.",
    "Pengembalian setelah batas waktu meniru visibility timeout; broker lain bisa mengembalikan pesan segera saat koneksi putus.",
    "Prefetch 1 per consumer; batas percobaan, dead-letter queue, prioritas, dan penyimpanan ke disk tidak disimulasikan.",
  ],
};
