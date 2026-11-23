import type { Bilingual } from "../../content/topic";
import type { TopicStepContent } from "../types";
import type { DnsPartKey } from "./scenarios";

/** Inline markup: [[term|label]] opens a glossary entry, {{part|label}} selects a part of the figure. */

export const DNS_META = {
  category: { id: "Jaringan", en: "Networking" } as Bilingual,
  title: { id: "DNS", en: "DNS" } as Bilingual,
  summary: {
    id: "Tahu nama tokonya, tetapi belum tahu alamatnya? Begitulah browser memakai DNS: mencari alamat IP dari nama website, lalu menghubungi servernya.",
    en: "Know the shop's name, but not its address? That is how a browser uses DNS: find a website's IP address, then connect to its server.",
  } as Bilingual,
  level: { id: "Dasar", en: "Beginner" } as Bilingual,
  minutes: 9,
  outcomes: {
    id: [
      "Memahami nama website sebagai nama toko, dan alamat IP sebagai alamat tujuannya.",
      "Mengikuti petugas pencari alamat (resolver) sampai mendapat jawaban resmi.",
      "Memahami mengapa catatan sementara (cache) mempercepat pencarian, tetapi bisa masih berisi alamat lama.",
    ],
    en: [
      "Understand a website name as a shop's name, and its IP as the destination address.",
      "Follow the address-finding clerk (resolver) until it gets an official answer.",
      "Understand why temporary notes (caches) speed up lookups but can still hold an old address.",
    ],
  } as Bilingual<string[]>,
};

export const DNS_STEP_CONTENT: TopicStepContent[] = [
  {
    key: "why",
    title: { id: "Tahu nama tokonya, belum tahu alamatnya", en: "You know the shop's name, but not its address" },
    body: {
      id: [
        "Bayangkan kamu ingin pergi ke sebuah toko. Kamu ingat nama tokonya, tetapi belum tahu alamat jalannya. Nama website seperti contoh.id itu seperti nama toko; [[ip-address|alamat IP]], misalnya 203.0.113.10, itu seperti alamat yang dibutuhkan untuk menuju ke sana.",
        "[[dns|DNS]] membantu mencari alamat tersebut. Dalam figur ini, {{client|klien}} adalah perangkatmu. Ia memeriksa {{localCache|catatan alamat di perangkat}} terlebih dahulu. Karena belum ada, ia meminta bantuan {{resolver|petugas pencari alamat, yaitu resolver}}: “Tolong carikan alamat contoh.id.”",
        "Ikuti satu pertanyaan ini sampai jawabannya kembali. Setelah memperoleh IP, browser baru dapat mulai menghubungi server website. DNS mencari alamat; pengambilan isi website adalah proses berikutnya dan tidak diperlihatkan pada mesin ini.",
      ],
      en: [
        "Imagine visiting a shop whose name you remember, but whose street address you do not know. A website name such as contoh.id is like the shop's name; its [[ip-address|IP address]], such as 203.0.113.10, is like the address needed to reach it.",
        "[[dns|DNS]] helps find that address. The {{client|client}} in this figure is your device. It first checks its {{localCache|saved address notes}}. With no answer there, it asks the {{resolver|address-finding clerk, the resolver}}: “Please find the address for contoh.id.”",
        "Follow this one question until the answer comes back. Once it has the IP address, the browser can start connecting to the website's server. DNS finds the address; fetching the website comes next and is not shown by this machine.",
      ],
    },
    observe: {
      id: ["Perhatikan perjalanan pergi dan pulang: kartu lingkaran membawa pertanyaan dari perangkat, sedangkan kartu bergaris membawa alamat IP kembali. Anggap rel sebagai jalur pesan, bukan perjalanan pengguna ke website."],
      en: ["Watch the outward and return journeys: a ringed card carries the device's question, and a barred card carries the IP address back. The tracks carry messages, not the user's visit to the website."],
    },
  },
  {
    key: "tiers",
    title: { id: "Petugas bertanya: pusat, wilayah, pengelola toko", en: "The clerk asks: central desk, regional desk, shop manager" },
    body: {
      id: [
        "Petugas resolver belum punya alamatnya. Ia harus mencari petunjuk. Bayangkan tiga meja: pusat informasi, direktori wilayah, dan pengelola yang memegang alamat resmi toko.",
        "Pertama, resolver bertanya ke {{root|root, seperti pusat informasi}}. Jawabannya: “Untuk nama berakhiran .id, tanyakan ke meja .id.” Ini [[referral|rujukan]]: petunjuk harus bertanya ke mana, belum berupa alamat IP website.",
        "Kedua, resolver bertanya ke {{tld|TLD .id, seperti direktori wilayah}}. Jawabannya: “Untuk contoh.id, tanyakan ke pengelola domain ini.” Sekali lagi, resolver mendapat petunjuk, bukan alamat akhir.",
        "Ketiga, resolver bertanya ke {{auth|authoritative, pemegang catatan resmi contoh.id}}. Barulah ia mendapat jawaban: “Alamat IP-nya 203.0.113.10.” Resolver membawa jawaban itu kembali ke perangkatmu.",
        "Yang mendatangi ketiga meja adalah resolver. Browser cukup meminta bantuan dan menerima hasilnya. Meja-meja itu tidak saling meneruskan pertanyaan secara berantai; masing-masing membalas resolver.",
      ],
      en: [
        "The resolver has no address saved, so it needs directions. Imagine three desks: central information, a regional directory, and the manager holding the shop's official address.",
        "First it asks the {{root|root, like central information}}. The reply is: “For names ending in .id, ask the .id desk.” This is a [[referral|referral]]: where to ask next, not the website's IP address yet.",
        "Next it asks the {{tld|.id TLD, like the regional directory}}. The reply is: “For contoh.id, ask this domain's manager.” Again, this is a direction, not the final address.",
        "Finally it asks the {{auth|authoritative server, holder of contoh.id's official record}}. Now it gets an answer: “The IP address is 203.0.113.10.” The resolver brings that answer back to your device.",
        "The resolver visits all three desks. The browser asks for help and receives the result. The desks do not pass the question along a chain; each replies to the resolver.",
      ],
    },
    observe: {
      id: ["Lihat kartu selalu kembali ke resolver setelah mengunjungi satu meja. Root dan TLD mengembalikan kartu panah (petunjuk). Authoritative mengembalikan kartu bergaris (alamat IP)."],
      en: ["Notice how the card returns to the resolver after each desk. Root and TLD return arrow cards (directions). The authoritative server returns a barred card (the IP address)."],
    },
  },
  {
    key: "cache",
    title: { id: "Simpan alamat agar tidak bertanya dari awal", en: "Save the address instead of asking all over again" },
    body: {
      id: [
        "Setelah alamat toko ditemukan, kamu menuliskannya di catatan agar besok tidak perlu bertanya lagi. DNS juga begitu: jawaban disalin ke {{resolverCache|catatan resolver}} dan {{localCache|catatan perangkat}}. Penyimpanan sementara ini disebut [[cache|cache]].",
        "Ketika perangkat menanyakan contoh.id lagi dan catatannya masih berlaku, ia langsung memakai alamat yang tersimpan. Resolver, root, TLD, dan authoritative tidak perlu ditanya. Inilah mengapa pencarian berikutnya bisa lebih cepat.",
        "Setiap catatan punya batas waktu penggunaan, yaitu [[ttl|TTL]]. Anggap seperti pesan: “Boleh pakai alamat ini selama waktu yang tertera; setelah itu cari jawaban lagi.” Dial pada figur menunjukkan waktu yang tersisa. Angka detik di sini sengaja dipendekkan untuk demonstrasi, bukan patokan DNS nyata.",
      ],
      en: [
        "Once you find the shop's address, you write it down so you do not have to ask again tomorrow. DNS does the same: it saves copies in the {{resolverCache|resolver's notes}} and the {{localCache|device's notes}}. This temporary store is called a [[cache|cache]].",
        "When the device asks for contoh.id again and its note is still valid, it uses the saved address. No need to ask the resolver, root, TLD or authoritative server. That is why repeat lookups can be faster.",
        "Each note has a time limit, its [[ttl|TTL]]. Think of a message saying: “You may reuse this address for this long; then look it up again.” The dial shows the time left. The seconds here are deliberately shortened for the demonstration, not real-world DNS timings.",
      ],
    },
    observe: {
      id: ["Kartu jawaban muncul di kedua baki. Pertanyaan #2 dan #3 hanya bergerak dari klien ke kotak cache dan kembali. Jumlah kunjungan ke server tetap 3."],
      en: ["An answer card appears in both trays. Questions #2 and #3 only move from the client to the cache box and back. Server visits stay at 3."],
    },
  },
  {
    key: "resolver-cache",
    title: { id: "Catatanmu habis, petugas masih punya salinannya", en: "Your note expires, but the clerk still has a copy" },
    body: {
      id: [
        "Sekarang bayangkan catatan alamat di perangkatmu sudah habis masa berlakunya. Kamu perlu bertanya lagi kepada petugas resolver. Apakah ia harus mengunjungi ketiga meja dari awal? Belum tentu.",
        "{{resolverCache|Catatan milik resolver}} ternyata masih berlaku. Petugas cukup membaca salinannya dan mengirim alamat kembali. Pertanyaan keluar dari perangkat, tetapi tidak sampai ke root, TLD, atau authoritative.",
        "Ada dua jalan pintas: catatan di perangkat bisa menjawab sendiri; jika kosong, catatan resolver masih bisa membantu. Satu resolver dapat melayani banyak perangkat, sehingga jawaban yang disimpannya juga bisa mempercepat pencarian pengguna lain untuk catatan yang sama.",
      ],
      en: [
        "Now imagine the address note on your device has expired. You ask the resolver again. Does the clerk have to visit all three desks from the start? Not necessarily.",
        "The {{resolverCache|resolver's own note}} is still valid. The clerk reads its copy and sends the address back. The question leaves your device, but never reaches root, TLD or the authoritative server.",
        "There are two shortcuts: the device's note can answer locally; if it has none, the resolver's note can still help. One resolver may serve many devices, so its saved answer can also speed up other users' lookups for the same record.",
      ],
    },
    observe: {
      id: ["Kartu pertanyaan #4 berhenti di baki masuk meja resolver lalu kembali sebagai jawaban. Tidak ada kartu yang naik ke tanjakan."],
      en: ["Question #4's card stops at the resolver's inbox and goes back as an answer. No card climbs a ramp."],
    },
  },
  {
    key: "ttl",
    title: { id: "Toko pindah, tetapi catatan lama belum habis", en: "The shop moves, but the old note has not expired" },
    body: {
      id: [
        "Bayangkan toko pindah dari alamat A ke alamat B. Pengelola sudah memperbarui catatan resminya, tetapi kertas yang kamu simpan masih bertuliskan alamat A. Memperbarui catatan resmi tidak otomatis mengganti semua salinannya.",
        "Pada figur, {{auth|authoritative}} mulai memberikan IP baru: 203.0.113.20, ditandai kartu dua garis. Namun cache perangkat masih menyimpan 203.0.113.10, kartu satu garis. Karena TTL-nya belum habis, pencarian berikutnya masih memakai alamat lama tanpa mengecek ulang ke pengelola.",
        "Setelah catatan perangkat dan resolver kedaluwarsa, pertanyaan baru mencari lagi dan memperoleh IP baru. Dalam demonstrasi ini pencarian penuh diulang; resolver nyata bisa masih menyimpan petunjuk root atau TLD sehingga tidak selalu mengulang semua tahap.",
        "Jadi, TTL bukan waktu tunggu wajib sampai website bisa dibuka. TTL adalah batas penggunaan ulang sebuah jawaban. TTL panjang mengurangi pencarian ulang, sedangkan TTL pendek memberi kesempatan lebih cepat untuk menemukan perubahan saat ada pertanyaan baru.",
      ],
      en: [
        "Imagine the shop moves from address A to address B. Its manager updates the official record, but your saved piece of paper still says A. Updating the official record does not automatically replace every copy.",
        "In the figure, the {{auth|authoritative server}} starts giving out 203.0.113.20, a two-bar card. The device's cache still holds 203.0.113.10, a one-bar card. Since its TTL has not expired, the next lookup still uses that old address without checking with the manager again.",
        "After the device's and resolver's notes expire, a new question looks up the address again and gets the new IP. This demonstration repeats the full lookup; real resolvers may still have root or TLD referrals saved and need fewer steps.",
        "TTL is not a mandatory wait before a website can open. It limits how long an answer may be reused. A longer TTL reduces repeat lookups; a shorter TTL allows changes to be discovered sooner when a new question is asked.",
      ],
    },
    observe: {
      id: ["Kartu di baki server authoritative berganti menjadi dua garis, sementara klien masih menerima kartu satu garis. Setelah kedua dial TTL habis, jawaban berikutnya bergaris dua."],
      en: ["The card on the authoritative server's tray changes to two bars while the client still receives a one-bar card. After both TTL dials run out, the next answer has two bars."],
    },
  },
];

export const DNS_CLOSING = {
  title: { id: "Ringkasan mekanisme", en: "How it works, in short" } as Bilingual,
  points: {
    id: [
      "Nama domain seperti nama toko; IP seperti alamat tujuannya. DNS membantu mencari alamat, lalu browser menghubungi server website.",
      "Perangkat memeriksa catatannya sendiri. Jika tidak ada, ia meminta bantuan petugas resolver.",
      "Jika resolver juga belum punya jawaban: root menunjukkan pengelola .id, TLD menunjukkan pengelola contoh.id, lalu authoritative memberi IP resmi.",
      "Cache adalah catatan sementara. Jawaban bisa datang dari catatan perangkat atau resolver tanpa pencarian lengkap.",
      "TTL membatasi lama penggunaan catatan. Catatan lama tidak langsung berubah ketika pemilik domain memperbarui alamat resminya.",
    ],
    en: [
      "A domain is like a shop's name; its IP is like the destination address. DNS finds the address, then the browser connects to the website's server.",
      "The device checks its own notes. If it has none, it asks the resolver clerk for help.",
      "If the resolver has no answer either: root points to the .id directory, TLD points to contoh.id's manager, and the authoritative server gives the official IP.",
      "A cache is a temporary note. The device or resolver can answer from its notes without a full lookup.",
      "TTL limits how long a note may be reused. Old copies do not change immediately when the domain owner updates the official address.",
    ],
  } as Bilingual<string[]>,
  limitsTitle: { id: "Batas penyederhanaan", en: "What this simulation leaves out" } as Bilingual,
  limits: {
    id: [
      "Angka waktu (6 detik untuk pencarian penuh, TTL 12 detik, simpanan klien 5 detik) dipilih agar mudah diamati. Pencarian nyata biasanya selesai dalam milidetik, dan TTL umumnya menit sampai jam.",
      "Resolver nyata juga menyimpan rujukan root dan TLD, sehingga pencarian berikutnya untuk nama .id lain bisa melompati root. Hal ini tidak disimulasikan.",
      "Hanya satu nama dan satu jenis catatan alamat (A). CNAME, IPv6 (AAAA), jawaban negatif, dan DNSSEC tidak dibahas.",
      "Di antara klien dan resolver bisa ada cache lain, misalnya di browser dan di router rumah. Semuanya digabung sebagai satu cache lokal di sini.",
      "Satu server untuk setiap tingkat. Di dunia nyata setiap tingkat dilayani banyak server yang tersebar dan saling menggantikan.",
    ],
    en: [
      "The timings (6 seconds for a full lookup, a 12 second TTL, 5 seconds at the client) are chosen to be easy to watch. Real lookups usually finish in milliseconds, and TTLs are typically minutes to hours.",
      "Real resolvers also cache the root and TLD referrals, so a later lookup for another .id name can skip the root. That is not simulated.",
      "There is one name and one kind of address record (A). CNAMEs, IPv6 (AAAA), negative answers and DNSSEC are not covered.",
      "There can be more caches between the client and the resolver, for example in the browser and the home router. They are merged into one local cache here.",
      "One server per tier. In real life every tier is served by many servers spread out and standing in for one another.",
    ],
  } as Bilingual<string[]>,
};

export const DNS_GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  dns: {
    term: { id: "DNS", en: "DNS" },
    definition: { id: "Domain Name System. Dalam contoh ini, layanan pencarian alamat IP berdasarkan nama website. Seperti mencari alamat toko dari namanya. DNS juga menyimpan jenis catatan lain di luar contoh ini.", en: "Domain Name System. Here, it finds a website's IP from its name, like looking up a shop's address. DNS also holds other kinds of records beyond this example." },
  },
  "ip-address": {
    term: { id: "Alamat IP", en: "IP address" },
    definition: { id: "Nomor yang dipakai komputer untuk menemukan perangkat lain di jaringan, misalnya 203.0.113.10.", en: "The number computers use to find another device on a network, such as 203.0.113.10." },
  },
  referral: {
    term: { id: "Rujukan (referral)", en: "Referral" },
    definition: { id: "Jawaban yang tidak berisi alamat, tetapi memberi tahu server mana yang sebaiknya ditanya berikutnya.", en: "An answer that does not contain the address, but says which server to ask next." },
  },
  ttl: {
    term: { id: "TTL", en: "TTL" },
    definition: { id: "Time to live: batas waktu penggunaan ulang jawaban DNS. Seperti masa berlaku catatan alamat. Setelah habis, pertanyaan berikutnya perlu mencari jawaban lagi; TTL bukan waktu tunggu membuka website.", en: "Time to live: how long a DNS answer may be reused, like an address note's validity period. Once it expires, the next question needs a new lookup; it is not a wait before opening a website." },
  },
  cache: {
    term: { id: "Cache", en: "Cache" },
    definition: { id: "Tempat menyimpan jawaban yang baru didapat supaya pertanyaan yang sama bisa dijawab cepat tanpa mencari ulang.", en: "A store for recent answers, so the same question can be answered quickly without searching again." },
  },
  stale: {
    term: { id: "Alamat lama di cache", en: "Old cached address" },
    definition: { id: "Salinan alamat yang belum mengikuti perubahan catatan resmi. Dalam demonstrasi ini TTL salinan belum habis, sehingga masih boleh dipakai. Ini berbeda dari fitur serve-stale yang memakai jawaban setelah TTL habis.", en: "A saved address that does not yet reflect an official update. Its TTL has not expired in this demonstration, so it may still be reused. This differs from serve-stale, which uses answers after their TTL expires." },
  },
};

export const DNS_PARTS: Record<DnsPartKey, { name: Bilingual; role: Bilingual }> = {
  client: {
    name: { id: "Klien", en: "Client" },
    role: { id: "Perangkat yang ingin membuka contoh.id. Ia menulis pertanyaan dan menerima jawaban di baki atasnya.", en: "The device that wants to open contoh.id. It writes the question and receives the answer in its top tray." },
  },
  localCache: {
    name: { id: "Cache lokal", en: "Local cache" },
    role: { id: "Catatan milik klien sendiri. Kartu di baki berarti ada jawaban tersimpan; dial menunjukkan sisa TTL.", en: "The client's own notes. A card in the tray means an answer is stored; the dial shows the TTL left." },
  },
  track: {
    name: { id: "Rel ke resolver", en: "Track to the resolver" },
    role: { id: "Jalur pertanyaan dan jawaban antara klien dan resolver.", en: "The path questions and answers take between the client and the resolver." },
  },
  resolver: {
    name: { id: "Resolver", en: "Resolver" },
    role: { id: "Petugas pencari alamat. Kamu cukup bertanya kepadanya; ia memeriksa catatannya lalu, jika perlu, bertanya ke root, TLD, dan authoritative. Ia mengirim hasilnya kembali ke perangkat.", en: "The address-finding clerk. You ask it for help; it checks its notes and, if needed, asks root, TLD and the authoritative server. It returns the result to your device." },
  },
  resolverCache: {
    name: { id: "Cache resolver", en: "Resolver cache" },
    role: { id: "Catatan resolver, dipakai bersama oleh semua kliennya. Dial menunjukkan sisa TTL.", en: "The resolver's notes, shared by all its clients. The dial shows the TTL left." },
  },
  ramps: {
    name: { id: "Tanjakan", en: "Ramps" },
    role: { id: "Jalur dari meja resolver ke tiap tingkat. Kartu pertanyaan naik, kartu rujukan atau jawaban turun.", en: "Paths from the resolver's desk to each tier. Question cards go up, referral or answer cards come back." },
  },
  root: {
    name: { id: "Server root", en: "Root server" },
    role: { id: "Seperti pusat informasi: memberi petunjuk “Untuk akhiran .id, tanyakan ke meja .id.” Dalam pencarian ini ia memberi rujukan, bukan IP website.", en: "Like central information: “For names ending in .id, ask the .id desk.” In this lookup it gives directions, not the website's IP." },
  },
  tld: {
    name: { id: "Server TLD .id", en: ".id TLD server" },
    role: { id: "Seperti direktori wilayah .id: menunjukkan pengelola catatan resmi contoh.id. Resolver harus bertanya lagi kepada pengelola itu untuk mendapatkan IP.", en: "Like the .id regional directory: it points to the holder of contoh.id's official records. The resolver asks that holder next to get the IP." },
  },
  auth: {
    name: { id: "Server authoritative", en: "Authoritative server" },
    role: { id: "Seperti pengelola yang memegang alamat resmi toko. Untuk contoh.id, server ini memberi IP yang tercatat saat ditanya. Memperbaruinya tidak otomatis mengubah catatan cache di tempat lain.", en: "Like the manager holding the shop's official address. It gives the recorded IP for contoh.id when asked. Updating it does not automatically change cached copies elsewhere." },
  },
};

export const DNS_UI = {
  id: {
    heldNote: "Demonstrasi berhenti di sini. Lanjut ke langkah berikutnya, atau pilih Ulangi langkah.",
    scrollHint: "Scroll untuk mengikuti perjalanan pertanyaan",
    states: {
      idle: "Tidak ada pertanyaan yang sedang dicari",
      local: "Mencari di cache lokal",
      resolver: "Resolver memeriksa cache-nya",
      tiers: (where: string) => `Resolver bertanya ke ${where}`,
      back: "Jawaban menuju klien",
    },
    where: { root: "server root", tld: "server TLD .id", auth: "server authoritative" },
    readout: (t: string, asked: number, hops: number) => `t = ${t} dtk · ${asked} pertanyaan · ${hops} kunjungan server`,
    explore: {
      ask: "Tanyakan alamat contoh.id",
      asking: "Pertanyaan sedang dicari",
      change: "Ubah alamat di server authoritative",
      flushLocal: "Kosongkan cache lokal",
      flushResolver: "Kosongkan cache resolver",
      actions: "Aksi",
    },
    answersTitle: "Jawaban terakhir",
    answersEmpty: "Belum ada jawaban.",
    source: { local: "cache lokal", resolver: "cache resolver", authoritative: "pencarian penuh" },
    old: "alamat lama",
    fresh: "alamat terbaru",
    took: (s: string) => `${s} dtk`,
    cacheTable: {
      caption: "Isi cache saat ini",
      where: "Tempat",
      holds: "Isi",
      left: "Sisa TTL",
      local: "Cache lokal",
      resolver: "Cache resolver",
      zone: "Catatan resmi",
      empty: "kosong",
      na: "—",
    },
    counts: {
      caption: "Hitungan sejak awal cerita",
      asked: "Pertanyaan",
      localHits: "Dijawab cache lokal",
      resolverHits: "Dijawab cache resolver",
      full: "Pencarian penuh",
      hops: "Kunjungan server",
      stale: "Jawaban alamat lama",
    },
    announce: {
      answer: (seq: number, source: string, stale: boolean) => `Pertanyaan #${seq} dijawab dari ${source}${stale ? ", dengan alamat lama" : ""}.`,
      change: "Server authoritative memakai alamat baru.",
      expire: (where: string) => `Catatan di ${where} kedaluwarsa.`,
    },
    legendCards: "Kartu lingkaran: pertanyaan · kartu panah: rujukan · kartu bergaris: jawaban (satu garis alamat lama, dua garis alamat baru)",
    legendDial: "Dial di samping baki: sisa TTL catatan",
    legendLit: "Disorot: bagian yang dijelaskan langkah ini",
  },
  en: {
    heldNote: "The demonstration holds here. Go on to the next step, or choose Replay step.",
    scrollHint: "Scroll to follow the question",
    states: {
      idle: "No question being looked up",
      local: "Checking the local cache",
      resolver: "The resolver checks its cache",
      tiers: (where: string) => `The resolver asks the ${where}`,
      back: "The answer heads to the client",
    },
    where: { root: "root server", tld: ".id TLD server", auth: "authoritative server" },
    readout: (t: string, asked: number, hops: number) => `t = ${t} s · ${asked} questions · ${hops} server visits`,
    explore: {
      ask: "Ask for contoh.id",
      asking: "A question is being looked up",
      change: "Change the address on the authoritative server",
      flushLocal: "Clear the local cache",
      flushResolver: "Clear the resolver cache",
      actions: "Actions",
    },
    answersTitle: "Latest answers",
    answersEmpty: "No answer yet.",
    source: { local: "local cache", resolver: "resolver cache", authoritative: "full lookup" },
    old: "old address",
    fresh: "current address",
    took: (s: string) => `${s} s`,
    cacheTable: {
      caption: "What the caches hold now",
      where: "Where",
      holds: "Holds",
      left: "TTL left",
      local: "Local cache",
      resolver: "Resolver cache",
      zone: "Official record",
      empty: "empty",
      na: "—",
    },
    counts: {
      caption: "Counted from the start of the story",
      asked: "Questions",
      localHits: "Answered by local cache",
      resolverHits: "Answered by resolver cache",
      full: "Full lookups",
      hops: "Server visits",
      stale: "Old-address answers",
    },
    announce: {
      answer: (seq: number, source: string, stale: boolean) => `Question #${seq} answered from the ${source}${stale ? ", with the old address" : ""}.`,
      change: "The authoritative server now uses a new address.",
      expire: (where: string) => `The note in the ${where} expired.`,
    },
    legendCards: "Ringed card: question · arrow card: referral · barred card: answer (one bar old address, two bars new address)",
    legendDial: "Dial beside a tray: TTL left on the note",
    legendLit: "Highlighted: the part this step explains",
  },
};
