/**
 * Printable sheet spec for the message queue topic. Numbers come from src/topics/message-queue:
 * capacity 12, 0.7 s delivery + 0.5 s processing = 1.2 s per message, ack timeout 2 s, a burst of
 * 6 messages peaks at a depth of 5, C2 joins at 8 s.
 */
import { iso } from "../../src/figure/kit/iso-kit.mjs";
import ART from "../../src/topics/message-queue/art.generated.json" with { type: "json" };
/** A pin position from a world point, projected with the figure's own camera (viewBox units). */
const pin = (point) => iso(point, ART.P).map((v) => Math.round(v * 10) / 10);
const go = (key) => ["eval", `localStorage.setItem('webedukasi.theme','light'); location.href = location.pathname + '?topik=message-queue&langkah=${key}&tampilan=mesin'; 'go'`];
const part = (id) => `.it[data-part="${id}"]`;
const until = (selector, text) => ["until", `(document.querySelector(${JSON.stringify(selector)})||{textContent:''}).textContent.includes(${JSON.stringify(text)})`, 20000];

export default {
  layers: ".figure-host svg.iso-svg",
  reduced: false,
  width: 1440,
  height: 1000,
  settle: 2500,
  views: {
    burst: { actions: [go("buffer"), until(".state-readout", "antrean 5"), ["wait", 200]] },
    down: { actions: [go("consumer-down"), until(".figure-note", "Demonstrasi selesai"), ["wait", 300]] },
    ack: { actions: [go("ack"), until(".state-title", "Menunggu ack"), ["wait", 400]] },
    scale: { actions: [go("scale"), ["wait", 11000]] },
  },
  number: "WE-02",
  parts: [
    { id: "producer", select: part("producer") },
    { id: "conveyor", select: part("conveyor") },
    { id: "queue", select: part("queue") },
    { id: "broker", select: part("broker"), at: pin([60, 46, 12]) },
    { id: "unacked", select: part("unacked"), at: pin([60, 0, 25.5]) },
    { id: "lanes", select: part("lanes"), at: pin([95, 38, 2.6]) },
    { id: "consumer1", select: part("consumer1"), at: pin([136, -52, 14]) },
    { id: "consumer2", select: part("consumer2"), at: pin([136, 18, 14]) },
    { id: "ackLines", select: part("ackLines"), at: pin([92, -44, 15]) },
  ],
  main: { view: "burst" },
  inset: { view: "scale" },
  steps: [
    { view: "burst", focus: ["producer", "queue", "consumer1"] },
    { view: "burst", focus: ["queue", "conveyor"] },
    { view: "down", focus: ["consumer1", "queue"] },
    { view: "ack", focus: ["unacked", "ackLines", "consumer1"] },
    { view: "scale", focus: ["consumer2", "lanes"] },
  ],
  details: [
    { view: "burst", around: ["queue"], focus: ["queue"] },
    { view: "ack", around: ["unacked"], focus: ["unacked"] },
    { view: "ack", around: ["consumer1"], focus: ["consumer1"] },
  ],
  text: {
    id: {
      name: "Message Queue",
      title: "Anatomi Message Queue",
      tagline: "Pesan menunggu giliran",
      question: "Bagaimana pesan tidak hilang saat pemrosesnya sibuk atau mati?",
      lead: "Producer menitipkan pesan ke antrean lalu kembali bekerja. Broker menyerahkan pesan dari kepala antrean ke consumer yang siap, tetapi menyimpan salinannya sampai consumer mengirim ack. Tanpa ack sebelum batas waktu, pesan dikirim ulang.",
      quote: "Hapus hanya setelah ack",
      numbers: [
        ["12", "slot", "kapasitas antrean"],
        ["1,2", "dtk", "kirim dan proses per pesan"],
        ["2", "dtk", "batas waktu ack"],
        ["5", "pesan", "puncak antrean saat lonjakan"],
      ],
      spec: [
        ["Urutan", "FIFO, kepala di kanan"],
        ["Pengambilan", "Prefetch 1 per consumer"],
        ["Batas ack", "2 dtk, lalu dikirim ulang"],
        ["Kapasitas", "12 pesan, lalu ditolak"],
        ["Catatan", "Angka demonstrasi"],
      ],
      why: { title: "Mengapa salinan disimpan?", text: "Consumer bisa mati saat memproses. Karena broker baru menghapus pesan setelah ack, pesan itu bisa dikirim lagi. Akibatnya pesan bisa diproses lebih dari sekali, jadi pemrosesan sebaiknya aman bila diulang." },
      parts: {
        producer: { name: "Producer", say: "Pencetak kartu yang mengirim pesan." },
        conveyor: { name: "Saluran masuk", say: "Membawa pesan ke ekor antrean." },
        queue: { name: "Antrean", say: "Rak 12 slot; kepala di kanan." },
        broker: { name: "Broker", say: "Mengambil pesan dari kepala antrean." },
        unacked: { name: "Rak belum di-ack", say: "Salinan yang menunggu ack, dengan timer." },
        lanes: { name: "Gerbang dan lajur", say: "Gerbang terbuka = consumer terhubung." },
        consumer1: { name: "Consumer C1", say: "Memproses satu pesan sekaligus." },
        consumer2: { name: "Consumer C2", say: "Consumer kedua, dihubungkan di langkah 5." },
        ackLines: { name: "Kabel ack", say: "Membawa ack kembali ke broker." },
      },
      inset: "Dua consumer",
      steps: [
        { title: "Mengapa perlu antrean", text: "Producer tidak menunggu consumer. Pesan dititipkan di antrean." },
        { title: "Menampung lonjakan", text: "Enam pesan sekaligus menunggu di rak, lalu diproses berurutan." },
        { title: "Consumer berhenti", text: "Pesan menumpuk dari 0 ke 4, tidak ada yang hilang." },
        { title: "Ack dan kirim ulang", text: "C1 mati saat memproses #2. Tanpa ack, #2 dikirim lagi." },
        { title: "Menambah consumer", text: "C2 terhubung, keduanya berbagi pesan dan antrean menyusut." },
      ],
      details: [
        { title: "Rak antrean", text: "Lima pesan menunggu di slot kepala." },
        { title: "Salinan menunggu ack", text: "Timer menghitung batas waktu 2 dtk." },
        { title: "Kartu hilang di C1", text: "Tanda silang: salinan di consumer hilang." },
      ],
    },
    en: {
      name: "Message Queue",
      title: "Message Queue Anatomy",
      tagline: "Messages wait their turn",
      question: "How are messages kept safe while the worker is busy or down?",
      lead: "The producer hands messages to the queue and goes back to work. The broker gives messages from the head of the queue to a ready consumer, but keeps a copy until the consumer sends an ack. Without an ack before the timeout, the message is delivered again.",
      quote: "Delete only after the ack",
      numbers: [
        ["12", "slots", "queue capacity"],
        ["1.2", "s", "delivery and processing per message"],
        ["2", "s", "ack timeout"],
        ["5", "msgs", "peak queue during the burst"],
      ],
      spec: [
        ["Order", "FIFO, head on the right"],
        ["Taking", "Prefetch 1 per consumer"],
        ["Ack timeout", "2 s, then redelivered"],
        ["Capacity", "12 messages, then rejected"],
        ["Note", "Demonstration values"],
      ],
      why: { title: "Why keep a copy?", text: "A consumer can die while processing. Because the broker deletes a message only after the ack, it can send it again. So a message may be processed more than once, and processing should be safe to repeat." },
      parts: {
        producer: { name: "Producer", say: "The card press that sends messages." },
        conveyor: { name: "Inlet chute", say: "Carries messages to the tail of the queue." },
        queue: { name: "Queue", say: "A 12-slot rack; head on the right." },
        broker: { name: "Broker", say: "Takes messages from the head of the queue." },
        unacked: { name: "Unacked shelf", say: "Copies waiting for an ack, with a timer." },
        lanes: { name: "Gates and lanes", say: "Gate open = consumer attached." },
        consumer1: { name: "Consumer C1", say: "Processes one message at a time." },
        consumer2: { name: "Consumer C2", say: "The second consumer, attached in step 5." },
        ackLines: { name: "Ack cables", say: "Carry acks back to the broker." },
      },
      inset: "Two consumers",
      steps: [
        { title: "Why a queue", text: "The producer does not wait for a consumer. Messages are left in the queue." },
        { title: "Absorbing a burst", text: "Six messages at once wait on the rack, then are processed in order." },
        { title: "The consumer stops", text: "Messages pile up from 0 to 4 and none are lost." },
        { title: "Ack and redelivery", text: "C1 dies while processing #2. With no ack, #2 is sent again." },
        { title: "Adding a consumer", text: "C2 is attached, both share the messages and the queue shrinks." },
      ],
      details: [
        { title: "The queue rack", text: "Five messages wait in the head slots." },
        { title: "Copy awaiting ack", text: "The timer counts the 2 s timeout." },
        { title: "Card lost at C1", text: "A cross: the consumer's copy is lost." },
      ],
    },
  },
};
