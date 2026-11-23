import type { PartKey, StepKey } from "../sim/scenarios";

export type Lang = "id" | "en";
export type Bilingual<T = string> = Record<Lang, T>;

/**
 * Inline markup used in paragraphs:
 *   [[term|label]]  a glossary term (opens a popover)
 *   {{part|label}}  a figure component (selects it in the figure)
 */
export interface StepContent {
  key: StepKey;
  title: Bilingual;
  /** What happens, why, and what to watch. Complete without the figure. */
  body: Bilingual<string[]>;
  observe: Bilingual<string[]>;
}

export const TOPIC = {
  slug: "load-balancer",
  category: { id: "Jaringan", en: "Networking" } as Bilingual,
  title: { id: "Load Balancer", en: "Load Balancer" } as Bilingual,
  summary: {
    id: "Lihat bagaimana permintaan dibagi ke beberapa server, dan apa yang terjadi ketika salah satunya berhenti.",
    en: "See how requests are shared across several servers, and what happens when one of them stops.",
  } as Bilingual,
  level: { id: "Dasar", en: "Beginner" } as Bilingual,
  minutes: 8,
  outcomes: {
    id: [
      "Menjelaskan peran load balancer sebagai titik penerima yang membagi permintaan ke beberapa backend.",
      "Menelusuri urutan round robin dan mengapa jumlah permintaan yang sama belum tentu beban yang sama.",
      "Membedakan server yang mati dengan server yang sudah diketahui tidak sehat oleh load balancer.",
    ],
    en: [
      "Explain the load balancer as the single entry point that shares requests across several backends.",
      "Trace the round-robin order and why an equal number of requests is not necessarily an equal load.",
      "Tell a server that has stopped apart from a server the load balancer already knows is unhealthy.",
    ],
  } as Bilingual<string[]>,
};

export const STEP_CONTENT: StepContent[] = [
  {
    key: "why",
    title: { id: "Mengapa perlu pembagi beban", en: "Why share the load" },
    body: {
      id: [
        "Satu server hanya mampu melayani sejumlah [[request|permintaan]] dalam satu waktu. Jika semua pengguna mengarah ke satu mesin, mesin itu menjadi lambat, dan ketika mesin itu berhenti seluruh layanan ikut berhenti.",
        "[[load-balancer|Load balancer]] menyelesaikannya dengan menjadi satu titik penerima. {{client|Klien}} cukup mengenal satu alamat. Setiap permintaan masuk ke {{lb|drum distributor}}, lalu diteruskan ke salah satu dari beberapa [[backend|backend]]: server A, B, dan C.",
        "Klien tidak perlu tahu berapa server yang ada di belakang. Server dapat ditambah atau dirawat tanpa mengubah alamat yang dipakai klien.",
      ],
      en: [
        "A single server can only serve so many [[request|requests]] at once. If every user points at one machine, it slows down, and when it stops the whole service stops with it.",
        "A [[load-balancer|load balancer]] solves this by being the one entry point. The {{client|client}} only knows one address. Every request goes into the {{lb|distributor drum}} and is passed on to one of several [[backend|backends]]: servers A, B and C.",
        "The client does not need to know how many servers sit behind it. Servers can be added or serviced without changing the address the client uses.",
      ],
    },
    observe: {
      id: ["Token keluar dari klien satu per satu, berjalan di rel, masuk ke drum, lalu keluar ke salah satu dari tiga lajur."],
      en: ["Tokens leave the client one at a time, run along the rail into the drum, and leave on one of three lanes."],
    },
  },
  {
    key: "round-robin",
    title: { id: "Membagi secara bergiliran", en: "Sharing in turn" },
    body: {
      id: [
        "Aturan pembagian paling sederhana adalah [[round-robin|round robin]]: permintaan pertama ke A, berikutnya ke B, lalu C, lalu kembali ke A. {{selector|Lengan pemilih}} di atas drum menunjuk lajur yang dipilih untuk setiap token.",
        "Load balancer hanya memilih di antara server yang ia anggap layak. Di sini ketiga {{pins|pin kelayakan}} berdiri, jadi ketiganya masuk giliran dan jumlah permintaan per server naik bersama.",
        "Jumlah permintaan yang sama belum tentu berarti beban yang sama. Satu permintaan bisa membutuhkan CPU atau waktu pemrosesan jauh lebih banyak dari yang lain. Round robin tidak melihat hal itu; ia hanya menghitung giliran.",
      ],
      en: [
        "The simplest sharing rule is [[round-robin|round robin]]: the first request goes to A, the next to B, then C, then back to A. The {{selector|selector arm}} on top of the drum points at the lane chosen for each token.",
        "The load balancer only chooses among servers it considers eligible. Here all three {{pins|eligibility pins}} stand up, so all three take turns and their request counts rise together.",
        "An equal number of requests does not always mean an equal load. One request can need far more CPU or processing time than another. Round robin does not look at that; it only counts turns.",
      ],
    },
    observe: {
      id: ["Pita urutan di bawah figur terus berbunyi A, B, C, A, B, C. Selisih jumlah permintaan antarserver tidak pernah lebih dari satu."],
      en: ["The order strip under the figure keeps reading A, B, C, A, B, C. The request counts never differ by more than one."],
    },
  },
  {
    key: "server-down",
    title: { id: "Server B berhenti", en: "Server B stops" },
    body: {
      id: [
        "Pada detik 4,2 proses di {{serverB|server B}} berhenti. Rana di port masuknya menutup dan lampu dayanya padam. Ini kondisi fisik server.",
        "Load balancer belum tahu. Pin B di drum masih berdiri, karena pin itu hanya berubah oleh hasil [[health-check|health check]], bukan oleh kejadian di server. Round robin tetap mengirim setiap permintaan ketiga ke B.",
        "Permintaan yang sudah dikirim ke B tertahan di rana dan gagal. Load balancer dalam simulasi ini tidak mencoba ulang dan tidak memindahkannya ke A atau C; permintaan itu hilang bagi klien.",
      ],
      en: [
        "At 4.2 seconds the process on {{serverB|server B}} stops. The shutter on its inlet closes and its power lamp goes dark. This is the server's physical state.",
        "The load balancer does not know yet. Pin B on the drum still stands, because the pin only changes on [[health-check|health check]] results, not on what happens inside the server. Round robin keeps sending every third request to B.",
        "Requests already sent to B stop at the shutter and fail. The load balancer in this simulation does not retry them or move them to A or C; for the client they are lost.",
      ],
    },
    observe: {
      id: [
        "Dua token bertanda silang berhenti di depan rana B. Kolom Gagal untuk B naik menjadi 2, sedangkan status B menurut LB masih Sehat.",
        "Demonstrasi berhenti pada detik 9,8, sebelum pemeriksaan kedua selesai, agar jeda deteksi terlihat jelas.",
      ],
      en: [
        "Two tokens marked with a cross stop in front of B's shutter. B's Failed column rises to 2 while the load balancer still lists B as Healthy.",
        "The demonstration holds at 9.8 seconds, before the second check finishes, so the detection gap stays visible.",
      ],
    },
  },
  {
    key: "health-check",
    title: { id: "Health check mendeteksi kegagalan", en: "Health checks detect the failure" },
    body: {
      id: [
        "{{hc|Unit health check}} mengirim probe ke setiap server setiap 3 detik melalui {{probes|kabel probe}}. Server yang hidup membalas; server yang mati tidak membalas, dan probe dinyatakan gagal setelah [[timeout|batas waktu]] 1 detik.",
        "Satu kegagalan belum cukup, karena gangguan sesaat bisa terjadi. Setelah dua kegagalan berturut-turut, yaitu [[threshold|ambang]] dalam demonstrasi ini, B ditandai tidak sehat dan {{pins|pin B}} turun.",
        "Sejak saat itu round robin melewati B: A, lalu C, lalu A lagi. Permintaan baru tidak lagi menuju B, sehingga tidak ada yang gagal karena B. Permintaan yang gagal sebelumnya tetap tercatat gagal.",
      ],
      en: [
        "The {{hc|health-check unit}} sends a probe to every server every 3 seconds along the {{probes|probe cables}}. A running server answers; a stopped server does not, and the probe is declared failed after a 1 second [[timeout|timeout]].",
        "One failure is not enough, because a brief glitch can happen. After two failures in a row, the [[threshold|threshold]] in this demonstration, B is marked unhealthy and {{pins|pin B}} drops.",
        "From then on round robin skips B: A, then C, then A again. New requests no longer go to B, so nothing fails because of B. Requests that failed earlier stay failed.",
      ],
    },
    observe: {
      id: ["Pulsa probe ke B tidak kembali. Setelah kegagalan kedua, pin B turun dan jumlah permintaan B berhenti naik."],
      en: ["The probe pulse to B does not come back. After the second failure pin B drops and B's request count stops rising."],
    },
  },
  {
    key: "recovery",
    title: { id: "Server B pulih", en: "Server B recovers" },
    body: {
      id: [
        "Pada detik 16 {{serverB|server B}} hidup kembali. Rananya terbuka dan lampu dayanya menyala, tetapi load balancer masih menganggapnya tidak sehat, jadi B belum menerima permintaan.",
        "Health check terus memeriksa B. Setelah dua pemeriksaan berhasil berturut-turut, B ditandai sehat kembali dan {{pins|pin B}} berdiri.",
        "Permintaan berikutnya kembali dibagi ke A, B, dan C secara bergiliran. Load balancer tidak mengirim ulang permintaan yang dulu gagal.",
      ],
      en: [
        "At 16 seconds {{serverB|server B}} is running again. Its shutter opens and its power lamp lights, but the load balancer still considers it unhealthy, so B gets no requests yet.",
        "Health checks keep probing B. After two passing checks in a row, B is marked healthy again and {{pins|pin B}} stands up.",
        "The next requests are shared across A, B and C in turn again. The load balancer does not resend the requests that failed earlier.",
      ],
    },
    observe: {
      id: ["Ada jeda beberapa detik antara rana B terbuka dan pin B berdiri. Itulah waktu yang dibutuhkan untuk dua pemeriksaan berhasil."],
      en: ["There is a gap of a few seconds between B's shutter opening and pin B standing up. That is the time two passing checks take."],
    },
  },
];

export const CLOSING = {
  title: { id: "Ringkasan mekanisme", en: "How it works, in short" } as Bilingual,
  points: {
    id: [
      "Klien mengirim ke satu alamat; load balancer memilih backend untuk setiap permintaan.",
      "Round robin memilih bergiliran di antara server yang dianggap sehat, tanpa melihat beban sebenarnya.",
      "Kondisi fisik server dan status menurut load balancer adalah dua hal berbeda. Di antara keduanya ada jeda deteksi.",
      "Health check mengubah status hanya setelah ambang tercapai: beberapa kegagalan untuk menandai tidak sehat, beberapa keberhasilan untuk memulihkan.",
      "Permintaan yang telanjur dikirim ke server mati gagal; dalam simulasi ini tidak ada percobaan ulang.",
    ],
    en: [
      "The client sends to one address; the load balancer chooses a backend for each request.",
      "Round robin takes turns among the servers believed healthy, without looking at their actual load.",
      "A server's physical state and its status in the load balancer are two different things, with a detection gap between them.",
      "Health checks change a status only when a threshold is reached: several failures to mark it unhealthy, several passes to restore it.",
      "Requests already sent to a stopped server fail; this simulation has no retries.",
    ],
  } as Bilingual<string[]>,
  limitsTitle: { id: "Batas penyederhanaan", en: "What this simulation leaves out" } as Bilingual,
  limits: {
    id: [
      "Angka health check (setiap 3 detik, batas waktu 1 detik, ambang 2 kali) dipilih agar mudah diamati. Di produksi nilainya dikonfigurasi sesuai kebutuhan dan berbeda antarproduk.",
      "Waktu tempuh dan pemrosesan dibuat tetap. Server nyata punya latensi yang berubah-ubah, antrean, dan batas kapasitas.",
      "Hanya round robin yang disimulasikan. Banyak load balancer juga menawarkan least connections, bobot per server, atau hash berdasarkan klien.",
      "Balasan dari server ke klien tidak digambar. Percobaan ulang, sesi lengket (sticky session), dan replikasi data tidak disimulasikan.",
      "Health check di sini aktif: load balancer mengirim probe sendiri. Sebagian produk juga menilai kesehatan dari kegagalan lalu lintas biasa (pemeriksaan pasif).",
    ],
    en: [
      "The health-check values (every 3 seconds, 1 second timeout, threshold of 2) are chosen to be easy to watch. In production they are configured to fit the service and differ between products.",
      "Travel and processing times are fixed. Real servers have varying latency, queues and capacity limits.",
      "Only round robin is simulated. Many load balancers also offer least connections, per-server weights, or hashing by client.",
      "Replies from the servers back to the client are not drawn. Retries, sticky sessions and data replication are not simulated.",
      "The health checks here are active: the load balancer sends its own probes. Some products also judge health from failures in normal traffic (passive checks).",
    ],
  } as Bilingual<string[]>,
};

export const GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  "load-balancer": {
    term: { id: "Load balancer", en: "Load balancer" },
    definition: {
      id: "Komponen yang menerima permintaan di satu alamat lalu meneruskannya ke salah satu dari beberapa server di belakangnya.",
      en: "A component that receives requests at one address and forwards each to one of several servers behind it.",
    },
  },
  request: {
    term: { id: "Permintaan (request)", en: "Request" },
    definition: {
      id: "Pesan dari klien yang meminta sesuatu, misalnya membuka halaman. Di figur, setiap token adalah satu permintaan.",
      en: "A message from a client asking for something, such as a page. In the figure each token is one request.",
    },
  },
  backend: {
    term: { id: "Backend", en: "Backend" },
    definition: {
      id: "Server di belakang load balancer yang benar-benar memproses permintaan.",
      en: "A server behind the load balancer that actually processes requests.",
    },
  },
  "round-robin": {
    term: { id: "Round robin", en: "Round robin" },
    definition: {
      id: "Aturan memilih server bergiliran dalam urutan tetap, lalu kembali ke awal.",
      en: "A rule that picks servers in turn, in a fixed order, then starts again.",
    },
  },
  "health-check": {
    term: { id: "Health check", en: "Health check" },
    definition: {
      id: "Pemeriksaan berkala yang dikirim load balancer ke setiap server untuk menentukan apakah server itu layak menerima permintaan.",
      en: "A regular probe the load balancer sends to each server to decide whether it should receive requests.",
    },
  },
  timeout: {
    term: { id: "Batas waktu (timeout)", en: "Timeout" },
    definition: {
      id: "Lama menunggu balasan sebelum sebuah probe atau permintaan dianggap gagal.",
      en: "How long to wait for an answer before a probe or request counts as failed.",
    },
  },
  threshold: {
    term: { id: "Ambang (threshold)", en: "Threshold" },
    definition: {
      id: "Jumlah hasil berturut-turut yang dibutuhkan sebelum status server diubah, agar satu gangguan sesaat tidak langsung mengubah status.",
      en: "How many results in a row are needed before a server's status changes, so one brief glitch does not flip it.",
    },
  },
};

export const PARTS: Record<PartKey, { name: Bilingual; role: Bilingual }> = {
  client: {
    name: { id: "Klien", en: "Client" },
    role: {
      id: "Mengirim permintaan ke satu alamat. Magazin berisi token permintaan; kenop di depan menunjukkan laju kirim.",
      en: "Sends requests to one address. The magazine holds request tokens; the knob on the front shows the sending rate.",
    },
  },
  feed: {
    name: { id: "Rel masuk", en: "Inlet rail" },
    role: { id: "Jalur permintaan dari klien ke load balancer.", en: "The path requests take from the client to the load balancer." },
  },
  lb: {
    name: { id: "Drum distributor (load balancer)", en: "Distributor drum (load balancer)" },
    role: {
      id: "Titik penerima tunggal. Setiap token masuk lewat lengkung depan, lalu dikirim ke lajur yang dipilih.",
      en: "The single entry point. Every token enters through the front arch and leaves on the chosen lane.",
    },
  },
  selector: {
    name: { id: "Lengan pemilih", en: "Selector arm" },
    role: {
      id: "Menunjuk lajur tujuan menurut round robin. Lengan melewati lajur yang pinnya turun.",
      en: "Points at the lane chosen by round robin. It passes over any lane whose pin is down.",
    },
  },
  pins: {
    name: { id: "Pin kelayakan", en: "Eligibility pins" },
    role: {
      id: "Catatan load balancer: pin berdiri berarti server dianggap sehat dan ikut giliran. Pin hanya berubah oleh hasil health check.",
      en: "The load balancer's record: a standing pin means the server is considered healthy and takes turns. Pins only change on health-check results.",
    },
  },
  lanes: {
    name: { id: "Lajur ke server", en: "Lanes to the servers" },
    role: { id: "Membawa permintaan dari drum ke port masuk setiap server.", en: "Carry requests from the drum to each server's inlet." },
  },
  hc: {
    name: { id: "Unit health check", en: "Health-check unit" },
    role: {
      id: "Bagian dari load balancer yang memeriksa server secara berkala. Lampu menunjukkan hasil terakhir, dua titik kecil menghitung hasil berturut-turut menuju ambang. Kabel status meneruskan keputusan ke pin drum.",
      en: "The part of the load balancer that checks servers regularly. Lamps show the last result; two small pips count results in a row toward the threshold. The status cable passes the verdict to the drum's pins.",
    },
  },
  probes: {
    name: { id: "Kabel probe", en: "Probe cables" },
    role: {
      id: "Membawa probe ke konektor di atas setiap server. Pulsa yang kembali berarti server menjawab.",
      en: "Carry probes to the connector on top of each server. A pulse that comes back means the server answered.",
    },
  },
  serverA: {
    name: { id: "Server A", en: "Server A" },
    role: { id: "Backend yang memproses permintaan. Rana terbuka dan lampu samping menyala selama server hidup.", en: "A backend that processes requests. The shutter is open and the side lamp lit while the server runs." },
  },
  serverB: {
    name: { id: "Server B", en: "Server B" },
    role: {
      id: "Backend yang dimatikan dalam demonstrasi. Rana tertutup berarti server mati; token yang tiba di rana gagal.",
      en: "The backend that is stopped in the demonstration. A closed shutter means the server is down; tokens that reach it fail.",
    },
  },
  serverC: {
    name: { id: "Server C", en: "Server C" },
    role: { id: "Backend yang memproses permintaan. Rana terbuka dan lampu samping menyala selama server hidup.", en: "A backend that processes requests. The shutter is open and the side lamp lit while the server runs." },
  },
};
