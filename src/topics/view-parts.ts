/** Part names for the two figure views ("Analogi sehari-hari" / "Sistem sebenarnya") and what the part does. */
export type ViewParts = Record<string, { analogy: string; system: string; role: string }>;

export const LB_VIEW_PARTS: ViewParts = {
  client: { analogy: "Pengunjung", system: "Pengguna", role: "Mengirim permintaan ke satu alamat." },
  feed: { analogy: "Pintu masuk", system: "Jalur masuk", role: "Semua permintaan masuk lewat satu pintu." },
  lb: { analogy: "Petugas pembagi", system: "Load balancer", role: "Menerima semua permintaan lalu memilih server tujuan." },
  selector: { analogy: "Aturan bergiliran", system: "Round robin", role: "Memilih server berikutnya secara bergiliran: A, B, C, lalu A lagi." },
  pins: { analogy: "Catatan loket yang buka", system: "Status sehat menurut LB", role: "Yang dicatat load balancer, bukan kondisi server sebenarnya. Hanya berubah oleh hasil health check." },
  lanes: { analogy: "Lorong ke loket", system: "Koneksi ke server", role: "Membawa permintaan ke server terpilih." },
  serverA: { analogy: "Loket A", system: "Server A", role: "Backend yang melayani permintaan." },
  serverB: { analogy: "Loket B", system: "Server B", role: "Backend yang dimatikan dalam demonstrasi." },
  serverC: { analogy: "Loket C", system: "Server C", role: "Backend yang melayani permintaan." },
  hc: { analogy: "Pemeriksa", system: "Health check", role: "Memeriksa setiap server tiap 3 detik; dua kegagalan berturut membuat server dilewati." },
  probes: { analogy: "Jalur pemeriksaan", system: "Probe health check", role: "Pemeriksaan yang dikirim ke tiap server beserta balasannya." },
};

export const MQ_VIEW_PARTS: ViewParts = {
  producer: { analogy: "Kasir", system: "Producer", role: "Mengirim pesan ke antrean tanpa menunggu pemrosesnya." },
  conveyor: { analogy: "Jalur ke rel", system: "Jalur ke antrean", role: "Membawa pesan baru ke ekor antrean." },
  queue: { analogy: "Rel pesanan", system: "Antrean", role: "Tempat pesan menunggu; yang paling lama di depan (FIFO). Kapasitas 12." },
  broker: { analogy: "Kepala dapur", system: "Broker", role: "Menyerahkan pesan dari kepala antrean ke consumer yang siap." },
  unacked: { analogy: "Salinan belum dicoret", system: "Pesan belum di-ack", role: "Salinan pesan yang sudah diserahkan tetapi belum dikonfirmasi; dikirim ulang bila ack tidak datang dalam 2 detik." },
  lanes: { analogy: "Jalur ke juru masak", system: "Jalur ke consumer", role: "Membawa pesan ke consumer." },
  consumer1: { analogy: "Juru masak 1", system: "Consumer C1", role: "Memproses satu pesan sekaligus, lalu mengirim ack." },
  consumer2: { analogy: "Juru masak 2", system: "Consumer C2", role: "Consumer kedua; hanya menerima pesan saat terhubung." },
  ackLines: { analogy: "Tanda selesai", system: "Ack", role: "Konfirmasi dari consumer bahwa pesan selesai, sehingga broker boleh menghapusnya." },
};

export const DNS_VIEW_PARTS: ViewParts = {
  client: { analogy: "Kamu", system: "Perangkat", role: "Ingin membuka contoh.id dan perlu alamat IP-nya." },
  localCache: { analogy: "Catatanmu", system: "Cache perangkat", role: "Jawaban yang disimpan di perangkat, paling lama 5 detik." },
  track: { analogy: "Jalan ke petugas", system: "Jalur ke resolver", role: "Pertanyaan dan jawaban antara perangkat dan resolver." },
  resolver: { analogy: "Petugas informasi", system: "Resolver", role: "Mencarikan alamat atas nama perangkat." },
  resolverCache: { analogy: "Catatan petugas", system: "Cache resolver", role: "Jawaban yang disimpan resolver selama TTL 12 detik." },
  ramps: { analogy: "Jalur ke meja-meja", system: "Pertanyaan resolver", role: "Resolver bertanya ke tiap tingkat; setiap jawaban kembali ke resolver." },
  root: { analogy: "Pusat informasi", system: "Server root", role: "Menunjuk ke server yang mengurus nama berakhiran .id." },
  tld: { analogy: "Direktori wilayah .id", system: "Server TLD .id", role: "Menunjuk ke server yang memegang catatan contoh.id." },
  auth: { analogy: "Pengelola toko", system: "Server authoritative", role: "Memegang alamat resmi contoh.id." },
};
