import type { Bilingual } from "../../content/topic";
import type { TopicStepContent } from "../types";
import type { MqPartKey } from "./scenarios";

/**
 * Inline markup: [[term|label]] opens a glossary entry, {{part|label}} selects a part of the figure.
 */

export const MQ_META = {
  category: { id: "Arsitektur", en: "Architecture" } as Bilingual,
  title: { id: "Message Queue", en: "Message Queue" } as Bilingual,
  summary: {
    id: "Lihat bagaimana pesan menunggu di antrean sampai siap diproses, dan apa yang terjadi ketika pemrosesnya berhenti.",
    en: "See how messages wait in a queue until they can be processed, and what happens when the worker stops.",
  } as Bilingual,
  level: { id: "Dasar", en: "Beginner" } as Bilingual,
  minutes: 9,
  outcomes: {
    id: [
      "Menjelaskan bagaimana antrean memisahkan pengirim pesan dari pemrosesnya.",
      "Membaca kedalaman antrean saat terjadi lonjakan dan saat consumer berhenti.",
      "Menjelaskan acknowledgment, pengiriman ulang, dan mengapa pesan bisa diproses lebih dari sekali.",
    ],
    en: [
      "Explain how a queue separates the sender of messages from the worker that processes them.",
      "Read the queue depth during a burst and while a consumer is stopped.",
      "Explain acknowledgements, redelivery, and why a message can be processed more than once.",
    ],
  } as Bilingual<string[]>,
};

export const MQ_STEP_CONTENT: TopicStepContent[] = [
  {
    key: "why",
    title: { id: "Mengapa perlu antrean", en: "Why use a queue" },
    body: {
      id: [
        "Tanpa antrean, pengirim harus menunggu penerima siap. Jika penerima sedang sibuk atau mati, pengirim ikut tertahan, atau pekerjaannya hilang.",
        "[[message-queue|Message queue]] menaruh tempat penyimpanan di antara keduanya. {{producer|Producer}} menitipkan setiap [[message|pesan]] ke {{queue|antrean}}, lalu langsung kembali bekerja. [[broker|Broker]] menyerahkan pesan dari kepala antrean ke [[consumer|consumer]] ketika consumer siap.",
        "Pengirim dan pemroses tidak perlu berjalan pada kecepatan yang sama, dan tidak perlu hidup pada waktu yang sama.",
      ],
      en: [
        "Without a queue, the sender has to wait until the receiver is ready. If the receiver is busy or down, the sender is held up too, or the work is lost.",
        "A [[message-queue|message queue]] puts storage between the two. The {{producer|producer}} hands every [[message|message]] to the {{queue|queue}} and goes straight back to work. The [[broker|broker]] gives messages from the head of the queue to a [[consumer|consumer]] when the consumer is ready.",
        "Sender and worker do not have to run at the same speed, or even at the same time.",
      ],
    },
    observe: {
      id: ["Satu kartu keluar dari pencetak setiap 2,5 detik, meluncur di rak, lalu diserahkan ke C1. Consumer lebih cepat dari producer, jadi antrean hampir selalu kosong."],
      en: ["One card leaves the press every 2.5 seconds, slides along the rack, then goes to C1. The consumer is faster than the producer, so the queue is almost always empty."],
    },
  },
  {
    key: "buffer",
    title: { id: "Antrean menampung lonjakan", en: "The queue absorbs a burst" },
    body: {
      id: [
        "Pada detik 3 producer mengirim enam pesan sekaligus. Consumer tetap memproses satu pesan setiap 1,2 detik, jadi pesan yang belum terlayani menunggu di {{queue|rak antrean}}.",
        "Jumlah pesan yang menunggu disebut [[depth|kedalaman antrean]]. Kedalaman naik selama lonjakan, lalu turun perlahan karena consumer lebih cepat daripada laju kirim normal.",
        "Antrean ini [[fifo|FIFO]]: pesan yang masuk lebih dulu diproses lebih dulu. Urutan selesai pada pita di bawah figur tetap #1, #2, #3, dan seterusnya.",
      ],
      en: [
        "At 3 seconds the producer sends six messages at once. The consumer still processes one message every 1.2 seconds, so the messages it has not reached yet wait on the {{queue|queue rack}}.",
        "The number of waiting messages is the [[depth|queue depth]]. It rises during the burst, then falls slowly because the consumer is faster than the normal sending rate.",
        "This queue is [[fifo|FIFO]]: the message that arrived first is processed first. The completion order on the strip under the figure stays #1, #2, #3 and so on.",
      ],
    },
    observe: {
      id: ["Kedalaman antrean naik hingga lima kartu, lalu berkurang satu per satu. Tidak ada pesan yang ditolak."],
      en: ["The queue depth rises to five cards, then drops one at a time. No message is rejected."],
    },
  },
  {
    key: "consumer-down",
    title: { id: "Consumer berhenti", en: "The consumer stops" },
    body: {
      id: [
        "Pada detik 5 {{consumer1|consumer C1}} berhenti. Lampu dayanya padam dan dial progresnya diam. Saat itu C1 sedang tidak memegang pesan.",
        "Producer tidak terpengaruh. Pesan baru tetap dikirim setiap 2,5 detik dan menunggu di antrean, karena broker tidak punya consumer yang siap menerima.",
        "Tidak ada pesan yang hilang. Begitu consumer kembali, pesan yang menunggu diproses mulai dari yang paling lama. Antrean punya batas kapasitas; di demonstrasi ini 12 pesan, dan pesan berikutnya akan ditolak bila rak penuh.",
      ],
      en: [
        "At 5 seconds {{consumer1|consumer C1}} stops. Its power lamp goes dark and its progress dial stands still. C1 is not holding a message at that moment.",
        "The producer is not affected. New messages are still sent every 2.5 seconds and wait in the queue, because the broker has no consumer ready to take them.",
        "No message is lost. Once a consumer is back, the waiting messages are processed starting with the oldest. A queue has a capacity; in this demonstration it is 12 messages, and the next message would be rejected if the rack were full.",
      ],
    },
    observe: {
      id: [
        "Kedalaman antrean naik dari 0 ke 4, sedangkan jumlah pesan yang dikirim producer terus bertambah.",
        "Demonstrasi berhenti pada detik 14 agar penumpukan terlihat jelas.",
      ],
      en: ["The queue depth rises from 0 to 4 while the producer's sent count keeps growing.", "The demonstration holds at 14 seconds so the backlog stays visible."],
    },
  },
  {
    key: "ack",
    title: { id: "Acknowledgment dan pengiriman ulang", en: "Acknowledgements and redelivery" },
    body: {
      id: [
        "Ketika broker menyerahkan pesan, ia tidak langsung menghapusnya. Salinannya disimpan di {{unacked|rak belum di-ack}} sampai consumer mengirim [[ack|acknowledgment]] (ack) lewat {{ackLines|kabel ack}} setelah selesai memproses.",
        "Pada detik 4,5 consumer C1 mati saat sedang memproses pesan #2. Kartu di landasan hilang, tetapi broker masih memegang salinannya. Dial timer menghitung [[ack-timeout|batas waktu ack]], di sini 2 detik sejak pesan dikirim.",
        "Karena ack tidak datang tepat waktu, broker mengembalikan #2 ke kepala antrean dan mengirimkannya lagi sebagai percobaan ke-2. Inilah sebabnya banyak antrean menjanjikan pengiriman [[at-least-once|setidaknya sekali]]: consumer harus siap menerima pesan yang sama lebih dari sekali.",
      ],
      en: [
        "When the broker hands over a message it does not delete it yet. It keeps a copy on the {{unacked|unacknowledged shelf}} until the consumer sends an [[ack|acknowledgement]] (ack) along the {{ackLines|ack cable}} once it has finished.",
        "At 4.5 seconds consumer C1 dies while it is processing message #2. The card on the anvil is lost, but the broker still holds its copy. The timer dial counts the [[ack-timeout|ack timeout]], here 2 seconds from delivery.",
        "Because no ack arrives in time, the broker puts #2 back at the head of the queue and delivers it again as attempt 2. This is why many queues promise [[at-least-once|at-least-once]] delivery: a consumer must be ready to receive the same message more than once.",
      ],
    },
    observe: {
      id: ["Kartu bertanda silang muncul di landasan C1. Salinan #2 tetap di rak atas broker sampai jarum timer penuh, lalu #2 dikirim lagi dengan satu titik di permukaannya."],
      en: ["A crossed card appears on C1's anvil. The copy of #2 stays on the broker's roof shelf until the timer needle completes its sweep, then #2 is delivered again with a dot on its face."],
    },
  },
  {
    key: "scale",
    title: { id: "Menambah consumer", en: "Adding a consumer" },
    body: {
      id: [
        "Sekarang producer mengirim satu pesan setiap 0,7 detik, lebih cepat dari kemampuan satu consumer. Antrean terus memanjang.",
        "Pada detik 8 {{consumer2|consumer C2}} dihubungkan: gerbang ke {{lanes|lajurnya}} terbuka. Kedua consumer mengambil pesan dari antrean yang sama, dan setiap pesan hanya diserahkan ke satu consumer. Pola ini disebut [[competing-consumers|competing consumers]].",
        "Dengan dua consumer, pesan selesai lebih cepat daripada datangnya, sehingga antrean menyusut. Urutan selesai antar-consumer tidak lagi dijamin persis berurutan, karena dua pesan dapat diproses bersamaan.",
      ],
      en: [
        "Now the producer sends one message every 0.7 seconds, faster than one consumer can handle. The queue keeps growing.",
        "At 8 seconds {{consumer2|consumer C2}} is attached: the gate to its {{lanes|lane}} opens. Both consumers take messages from the same queue, and each message goes to one consumer only. This pattern is called [[competing-consumers|competing consumers]].",
        "With two consumers, messages finish faster than they arrive, so the queue shrinks. The completion order across consumers is no longer strictly sequential, because two messages can be processed at the same time.",
      ],
    },
    observe: {
      id: ["Sebelum detik 8 kedalaman antrean naik. Setelah gerbang C2 terbuka, kedua dial progres berputar dan kedalaman turun."],
      en: ["Before 8 seconds the queue depth rises. After C2's gate opens, both progress dials turn and the depth falls."],
    },
  },
];

export const MQ_CLOSING = {
  title: { id: "Ringkasan mekanisme", en: "How it works, in short" } as Bilingual,
  points: {
    id: [
      "Producer menitipkan pesan ke antrean dan tidak menunggu consumer; keduanya dapat bekerja pada kecepatan berbeda.",
      "Antrean menampung lonjakan dan pesan saat consumer berhenti, sampai batas kapasitasnya.",
      "Broker menghapus pesan hanya setelah menerima ack. Tanpa ack sebelum batas waktu, pesan dikirim ulang.",
      "Pengiriman ulang berarti pesan bisa diproses lebih dari sekali, jadi pemrosesan sebaiknya aman bila diulang (idempoten).",
      "Menambah consumer pada antrean yang sama membagi pekerjaan, dengan konsekuensi urutan selesai tidak lagi ketat.",
    ],
    en: [
      "The producer hands messages to the queue and does not wait for a consumer; both can run at different speeds.",
      "The queue absorbs bursts and holds messages while a consumer is stopped, up to its capacity.",
      "The broker deletes a message only after an ack. Without an ack before the timeout, the message is delivered again.",
      "Redelivery means a message may be processed more than once, so processing should be safe to repeat (idempotent).",
      "Adding consumers to the same queue shares the work, at the cost of a strict completion order.",
    ],
  } as Bilingual<string[]>,
  limitsTitle: { id: "Batas penyederhanaan", en: "What this simulation leaves out" } as Bilingual,
  limits: {
    id: [
      "Angka waktu (kirim setiap 2,5 detik, proses 1,2 detik, batas ack 2 detik, kapasitas 12) dipilih agar mudah diamati, bukan konfigurasi produksi.",
      "Pengembalian setelah batas waktu meniru visibility timeout seperti pada Amazon SQS. Broker lain, misalnya RabbitMQ, mengembalikan pesan segera ketika koneksi consumer terputus.",
      "Pesan yang dikembalikan ditaruh di kepala antrean. Produk nyata berbeda-beda dalam menempatkan pesan yang dikirim ulang.",
      "Setiap consumer mengambil satu pesan sekaligus (prefetch 1). Batas jumlah percobaan, dead-letter queue, prioritas, dan penyimpanan ke disk tidak disimulasikan.",
      "Hanya satu antrean dengan pola point-to-point. Pola publish/subscribe ke banyak penerima tidak dibahas di sini.",
    ],
    en: [
      "The timings (a message every 2.5 seconds, 1.2 seconds of processing, a 2 second ack timeout, capacity 12) are chosen to be easy to watch, not production settings.",
      "Returning a message after a timeout mimics a visibility timeout such as Amazon SQS uses. Other brokers, RabbitMQ for example, return a message as soon as the consumer's connection drops.",
      "A returned message goes to the head of the queue. Real products differ in where they place redelivered messages.",
      "Each consumer takes one message at a time (prefetch 1). Retry limits, dead-letter queues, priorities and persistence to disk are not simulated.",
      "There is one queue with point-to-point delivery. Publish/subscribe to many receivers is not covered here.",
    ],
  } as Bilingual<string[]>,
};

export const MQ_GLOSSARY: Record<string, { term: Bilingual; definition: Bilingual }> = {
  "message-queue": {
    term: { id: "Message queue", en: "Message queue" },
    definition: {
      id: "Layanan yang menyimpan pesan dari pengirim sampai penerima siap mengambil dan memprosesnya.",
      en: "A service that stores messages from a sender until a receiver is ready to take and process them.",
    },
  },
  message: {
    term: { id: "Pesan (message)", en: "Message" },
    definition: {
      id: "Satu unit data yang dikirim lewat antrean, misalnya permintaan mengirim email. Di figur, setiap kartu adalah satu pesan.",
      en: "One unit of data sent through the queue, such as a request to send an email. In the figure each card is one message.",
    },
  },
  broker: {
    term: { id: "Broker", en: "Broker" },
    definition: {
      id: "Server yang mengelola antrean: menerima pesan, menyimpannya, menyerahkannya ke consumer, dan mencatat ack.",
      en: "The server that runs the queue: it accepts messages, stores them, hands them to consumers and records acks.",
    },
  },
  consumer: {
    term: { id: "Consumer", en: "Consumer" },
    definition: {
      id: "Program yang mengambil pesan dari antrean dan memprosesnya.",
      en: "A program that takes messages from the queue and processes them.",
    },
  },
  depth: {
    term: { id: "Kedalaman antrean", en: "Queue depth" },
    definition: {
      id: "Jumlah pesan yang sedang menunggu di antrean. Kedalaman yang terus naik berarti consumer tidak sanggup mengikuti producer.",
      en: "The number of messages waiting in the queue. A depth that keeps rising means the consumers cannot keep up with the producer.",
    },
  },
  fifo: {
    term: { id: "FIFO", en: "FIFO" },
    definition: {
      id: "First in, first out: pesan yang masuk lebih dulu keluar lebih dulu.",
      en: "First in, first out: the message that arrives first leaves first.",
    },
  },
  ack: {
    term: { id: "Acknowledgment (ack)", en: "Acknowledgement (ack)" },
    definition: {
      id: "Tanda dari consumer ke broker bahwa sebuah pesan sudah selesai diproses, sehingga broker boleh menghapusnya.",
      en: "A signal from the consumer to the broker that a message is done, so the broker may delete it.",
    },
  },
  "ack-timeout": {
    term: { id: "Batas waktu ack", en: "Ack timeout" },
    definition: {
      id: "Berapa lama broker menunggu ack sebelum menganggap consumer gagal dan mengirim pesan itu lagi. Pada Amazon SQS disebut visibility timeout.",
      en: "How long the broker waits for an ack before it treats the consumer as failed and sends the message again. Amazon SQS calls it the visibility timeout.",
    },
  },
  "at-least-once": {
    term: { id: "Setidaknya sekali (at-least-once)", en: "At-least-once" },
    definition: {
      id: "Jaminan bahwa setiap pesan sampai minimal satu kali, dengan kemungkinan sampai lebih dari sekali.",
      en: "A guarantee that every message arrives at least once, with the possibility that it arrives more than once.",
    },
  },
  "competing-consumers": {
    term: { id: "Competing consumers", en: "Competing consumers" },
    definition: {
      id: "Beberapa consumer membaca dari antrean yang sama; setiap pesan hanya diproses oleh salah satunya.",
      en: "Several consumers read from the same queue; each message is processed by only one of them.",
    },
  },
};

export const MQ_PARTS: Record<MqPartKey, { name: Bilingual; role: Bilingual }> = {
  producer: {
    name: { id: "Producer", en: "Producer" },
    role: {
      id: "Pencetak kartu yang mengirim pesan. Magazin berisi kartu kosong; kenop di depan menunjukkan laju kirim; lampu berkedip setiap pesan keluar.",
      en: "The card press that sends messages. The magazine holds blank cards; the knob on the front shows the sending rate; the lamp blinks for every message.",
    },
  },
  conveyor: {
    name: { id: "Saluran masuk", en: "Inlet chute" },
    role: { id: "Membawa pesan dari producer ke ekor antrean.", en: "Carries messages from the producer to the tail of the queue." },
  },
  queue: {
    name: { id: "Antrean", en: "Queue" },
    role: {
      id: "Rak rol berisi 12 slot. Pesan masuk di ekor (kiri) dan keluar dari kepala (kanan, di depan broker). Tanda pada sisi rak menandai setiap slot.",
      en: "A roller rack with 12 slots. Messages enter at the tail (left) and leave from the head (right, at the broker). Marks on the rack's side show each slot.",
    },
  },
  broker: {
    name: { id: "Broker", en: "Broker" },
    role: {
      id: "Lemari yang mengambil pesan dari kepala antrean dan menyerahkannya ke consumer yang siap, bergiliran.",
      en: "The cabinet that takes messages from the head of the queue and hands them to ready consumers, taking turns.",
    },
  },
  unacked: {
    name: { id: "Rak belum di-ack", en: "Unacknowledged shelf" },
    role: {
      id: "Di atap broker: salinan setiap pesan yang sudah dikirim tetapi belum di-ack. Dial timer di sampingnya menghitung batas waktu ack.",
      en: "On the broker's roof: a copy of every message that was delivered but not yet acknowledged. The timer dial beside it counts the ack timeout.",
    },
  },
  lanes: {
    name: { id: "Gerbang dan lajur", en: "Gates and lanes" },
    role: {
      id: "Gerbang terbuka berarti consumer terhubung ke antrean. Lajur membawa pesan ke landasan consumer.",
      en: "An open gate means the consumer is attached to the queue. The lane carries messages to the consumer's anvil.",
    },
  },
  consumer1: {
    name: { id: "Consumer C1", en: "Consumer C1" },
    role: {
      id: "Memproses satu pesan sekaligus di landasan. Dial di atap menunjukkan progres; lampu samping menyala selama hidup; lampu atap berkedip saat ack dikirim.",
      en: "Processes one message at a time on its anvil. The roof dial shows progress; the side lamp is lit while it runs; the roof lamp blinks when an ack is sent.",
    },
  },
  consumer2: {
    name: { id: "Consumer C2", en: "Consumer C2" },
    role: {
      id: "Consumer kedua. Hanya menerima pesan ketika gerbangnya terbuka (terhubung ke antrean).",
      en: "The second consumer. It only receives messages while its gate is open (attached to the queue).",
    },
  },
  ackLines: {
    name: { id: "Kabel ack", en: "Ack cables" },
    role: {
      id: "Membawa ack dari consumer ke broker. Pulsa yang berjalan ke broker berarti satu pesan selesai dan salinannya dihapus.",
      en: "Carry acks from the consumers to the broker. A pulse travelling to the broker means a message is done and its copy is deleted.",
    },
  },
};

export const MQ_UI = {
  id: {
    heldNote: "Demonstrasi berhenti di sini agar penumpukan antrean terlihat. Lanjut ke langkah 4, atau pilih Ulangi langkah.",
    states: {
      idle: "Antrean kosong · consumer siap",
      flowing: (n: number) => `${n} pesan menunggu · consumer bekerja`,
      down: (n: number) => `C1 berhenti · ${n} pesan menunggu`,
      redelivery: "Menunggu ack · pesan akan dikirim ulang bila batas waktu habis",
      full: "Antrean penuh · pesan baru ditolak",
    },
    readout: (t: string, depth: number, done: number, again: number) => `t = ${t} dtk · antrean ${depth} · selesai ${done} · dikirim ulang ${again}`,
    explore: {
      rate: "Laju producer",
      rates: { slow: "Lambat · 1 per 4 dtk", normal: "Sedang · 1 per 2,5 dtk", fast: "Cepat · 1 per 0,8 dtk" },
      burst: "Kirim 5 pesan sekaligus",
      power: (id: string, up: boolean) => (up ? `Matikan ${id}` : `Hidupkan ${id}`),
      attach: (attached: boolean) => (attached ? "Lepas C2 dari antrean" : "Hubungkan C2 ke antrean"),
      consumers: "Consumer",
      producer: "Producer",
    },
    queueStrip: "Isi antrean (kepala di kiri)",
    queueEmpty: "Antrean kosong.",
    doneStrip: "Urutan selesai terakhir",
    doneEmpty: "Belum ada pesan yang selesai.",
    attempt: (n: number) => `percobaan ke-${n}`,
    counts: {
      caption: "Hitungan sejak awal demonstrasi langkah ini",
      produced: "Dikirim producer",
      depth: "Menunggu di antrean",
      unacked: "Belum di-ack",
      acked: "Selesai (ack)",
      redelivered: "Dikirim ulang",
      rejected: "Ditolak (penuh)",
      oldest: "Pesan tertua menunggu",
      seconds: (s: string) => `${s} dtk`,
    },
    table: {
      caption: "Keadaan consumer",
      consumer: "Consumer",
      state: "Kondisi",
      holding: "Sedang memegang",
      done: "Selesai",
      rate: "Laju terukur",
      rateNote: "pesan selesai per detik dalam 10 detik terakhir",
      up: "Hidup",
      down: "Mati",
      detached: "Tidak terhubung",
      none: "—",
      notYet: "belum ada",
    },
    announce: {
      power: (id: string, up: boolean) => (up ? `Consumer ${id} hidup kembali.` : `Consumer ${id} berhenti.`),
      attach: (id: string, attached: boolean) => (attached ? `Consumer ${id} terhubung ke antrean.` : `Consumer ${id} dilepas dari antrean.`),
      redeliver: (seq: number, attempt: number) => `Pesan #${seq} dikirim ulang, percobaan ke-${attempt}.`,
      reject: (seq: number) => `Antrean penuh, pesan #${seq} ditolak.`,
    },
    legendTile: "Kartu: satu pesan; titik berarti dikirim ulang; tanda silang berarti salinan hilang atau ditolak",
    legendGhost: "Kartu pucat di atap broker: salinan yang menunggu ack",
    legendPulse: "Titik pada kabel: ack menuju broker",
    legendLit: "Disorot: bagian yang dijelaskan langkah ini",
  },
  en: {
    heldNote: "The demonstration holds here so the backlog stays visible. Go on to step 4, or choose Replay step.",
    states: {
      idle: "Queue empty · consumer ready",
      flowing: (n: number) => `${n} waiting · consumers working`,
      down: (n: number) => `C1 stopped · ${n} waiting`,
      redelivery: "Waiting for an ack · the message is sent again if the timeout runs out",
      full: "Queue full · new messages are rejected",
    },
    readout: (t: string, depth: number, done: number, again: number) => `t = ${t} s · queue ${depth} · done ${done} · redelivered ${again}`,
    explore: {
      rate: "Producer rate",
      rates: { slow: "Slow · 1 per 4 s", normal: "Medium · 1 per 2.5 s", fast: "Fast · 1 per 0.8 s" },
      burst: "Send 5 messages at once",
      power: (id: string, up: boolean) => (up ? `Stop ${id}` : `Start ${id}`),
      attach: (attached: boolean) => (attached ? "Detach C2 from the queue" : "Attach C2 to the queue"),
      consumers: "Consumers",
      producer: "Producer",
    },
    queueStrip: "Queue contents (head on the left)",
    queueEmpty: "The queue is empty.",
    doneStrip: "Most recent completions",
    doneEmpty: "No message has finished yet.",
    attempt: (n: number) => `attempt ${n}`,
    counts: {
      caption: "Counted from the start of this step's demonstration",
      produced: "Sent by producer",
      depth: "Waiting in queue",
      unacked: "Unacknowledged",
      acked: "Done (acked)",
      redelivered: "Redelivered",
      rejected: "Rejected (full)",
      oldest: "Oldest message waiting",
      seconds: (s: string) => `${s} s`,
    },
    table: {
      caption: "Consumer state",
      consumer: "Consumer",
      state: "State",
      holding: "Holding",
      done: "Done",
      rate: "Measured rate",
      rateNote: "messages done per second over the last 10 seconds",
      up: "Running",
      down: "Stopped",
      detached: "Not attached",
      none: "—",
      notYet: "not yet",
    },
    announce: {
      power: (id: string, up: boolean) => (up ? `Consumer ${id} is running again.` : `Consumer ${id} stopped.`),
      attach: (id: string, attached: boolean) => (attached ? `Consumer ${id} is attached to the queue.` : `Consumer ${id} is detached from the queue.`),
      redeliver: (seq: number, attempt: number) => `Message #${seq} is delivered again, attempt ${attempt}.`,
      reject: (seq: number) => `The queue is full; message #${seq} was rejected.`,
    },
    legendTile: "Card: one message; a dot means redelivered; a cross means the copy was lost or rejected",
    legendGhost: "Pale card on the broker's roof: a copy waiting for an ack",
    legendPulse: "Dot on a cable: an ack on its way to the broker",
    legendLit: "Highlighted: the part this step explains",
  },
};
