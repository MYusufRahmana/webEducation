/**
 * Printable sheet spec for the DNS topic. Numbers come from src/topics/dns: 3 tiers, a full lookup
 * takes 6 s, a local cache answer 0.3 s, a resolver cache answer 1.8 s, TTL 12 s, the client keeps
 * an answer at most 5 s; the record changes at 15 s and question 5 still gets the old address.
 */
import { iso } from "../../src/figure/kit/iso-kit.mjs";
import ART from "../../src/topics/dns/art.generated.json" with { type: "json" };
/** A pin position from a world point, projected with the figure's own camera (viewBox units). */
const pin = (point) => iso(point, ART.P).map((v) => Math.round(v * 10) / 10);
const go = (key) => ["eval", `localStorage.setItem('webedukasi.theme','light'); location.href = location.pathname + '?topik=dns&langkah=${key}&tampilan=mesin'; 'go'`];
const part = (id) => `.it[data-part="${id}"]`;
const until = (selector, text) => ["until", `(document.querySelector(${JSON.stringify(selector)})||{textContent:''}).textContent.includes(${JSON.stringify(text)})`, 20000];

export default {
  layers: ".figure-host svg.iso-svg",
  reduced: false,
  width: 1440,
  height: 1000,
  settle: 2500,
  views: {
    tiers: { actions: [go("tld"), until(".state-title", "server TLD"), ["wait", 350]] },
    cache: { actions: [go("cache"), until(".state-readout", "2 pertanyaan"), ["wait", 500]] },
    stale: { actions: [go("ttl"), until(".state-readout", "5 pertanyaan"), ["wait", 600]] },
    fresh: { actions: [go("ttl"), until(".state-title", "Jawaban menuju klien"), ["wait", 900]] },
  },
  number: "WE-03",
  parts: [
    { id: "client", select: part("client") },
    { id: "localCache", select: part("localCache") },
    { id: "track", select: part("track") },
    { id: "resolver", select: part("resolver"), at: pin([-5, 46, 10]) },
    { id: "resolverCache", select: part("resolverCache"), at: pin([14, 34, 21]) },
    { id: "ramps", select: part("ramps") },
    { id: "root", select: part("root") },
    { id: "tld", select: part("tld") },
    { id: "auth", select: part("auth") },
  ],
  main: { view: "stale" },
  inset: { view: "tiers" },
  steps: [
    { view: "tiers", focus: ["client", "resolver", "track"] },
    { view: "tiers", focus: ["root", "tld", "auth", "ramps"] },
    { view: "cache", focus: ["localCache", "resolverCache"] },
    { view: "stale", focus: ["resolverCache", "resolver"] },
    { view: "fresh", focus: ["auth", "localCache", "resolverCache"] },
  ],
  details: [
    { view: "stale", around: ["localCache", "client"], focus: ["localCache"] },
    { view: "stale", around: ["resolverCache"], focus: ["resolverCache"] },
    { view: "stale", around: ["auth"], focus: ["auth"] },
  ],
  text: {
    id: {
      name: "DNS",
      title: "Anatomi DNS",
      tagline: "Meja pencarian alamat bertingkat",
      question: "Bagaimana nama contoh.id menjadi alamat yang bisa dihubungi?",
      lead: "Klien memeriksa catatannya sendiri dulu. Bila kosong, resolver mencarikan: root merujuk ke kantor .id, kantor .id merujuk ke server authoritative, dan server itu menjawab alamatnya. Jawaban disimpan selama TTL, jadi pertanyaan berikutnya jauh lebih cepat, tetapi bisa memberi alamat lama.",
      quote: "Catatan berlaku selama TTL",
      numbers: [
        ["3", "tingkat", "root, TLD, authoritative"],
        ["6", "dtk", "pencarian penuh"],
        ["0,3", "dtk", "dari cache lokal"],
        ["12", "dtk", "TTL jawaban"],
      ],
      spec: [
        ["Nama", "contoh.id"],
        ["Cache klien", "Paling lama 5 dtk"],
        ["Cache resolver", "Mengikuti TTL 12 dtk"],
        ["Dari cache resolver", "1,8 dtk"],
        ["Catatan", "Angka demonstrasi"],
      ],
      why: { title: "Mengapa ada TTL?", text: "TTL panjang membuat pencarian jarang dan cepat, tetapi perubahan alamat lambat terlihat. TTL pendek membuat perubahan cepat terlihat, dengan lebih banyak pencarian penuh." },
      parts: {
        client: { name: "Klien", say: "Bertanya dan menerima jawaban di bakinya." },
        localCache: { name: "Cache lokal", say: "Catatan milik klien, dengan dial TTL." },
        track: { name: "Rel ke resolver", say: "Jalur pertanyaan dan jawaban." },
        resolver: { name: "Resolver", say: "Petugas meja yang mencarikan alamat." },
        resolverCache: { name: "Cache resolver", say: "Catatan bersama milik resolver." },
        ramps: { name: "Tanjakan", say: "Jalur dari meja ke tiap tingkat." },
        root: { name: "Server root", say: "Tingkat tertinggi; merujuk ke .id." },
        tld: { name: "Server TLD .id", say: "Merujuk ke server contoh.id." },
        auth: { name: "Server authoritative", say: "Memegang alamat resmi contoh.id." },
      },
      inset: "Pencarian",
      steps: [
        { title: "Dari nama ke alamat", text: "Klien bertanya; resolver mencarikan jawaban untuknya." },
        { title: "Pencarian bertingkat", text: "Root merujuk ke .id, .id merujuk ke contoh.id, lalu alamat dijawab." },
        { title: "Jawaban disimpan", text: "Pertanyaan berikutnya dijawab cache lokal dalam 0,3 dtk." },
        { title: "Cache resolver", text: "Catatan klien habis; resolver menjawab dalam 1,8 dtk." },
        { title: "TTL dan alamat baru", text: "Cache masih memberi alamat lama sampai TTL habis, lalu dicari ulang." },
      ],
      details: [
        { title: "Cache lokal", text: "Kartu bergaris satu: alamat lama." },
        { title: "Cache resolver", text: "Dial TTL menghitung mundur." },
        { title: "Catatan resmi", text: "Kartu bergaris dua: alamat baru." },
      ],
    },
    en: {
      name: "DNS",
      title: "DNS Anatomy",
      tagline: "A tiered address-lookup desk",
      question: "How does the name contoh.id become an address you can reach?",
      lead: "The client checks its own notes first. If they are empty, the resolver looks it up: the root refers to the .id office, the .id office refers to the authoritative server, and that server answers with the address. Answers are kept for the TTL, so later questions are much faster, but may return an old address.",
      quote: "A note is valid for its TTL",
      numbers: [
        ["3", "tiers", "root, TLD, authoritative"],
        ["6", "s", "for a full lookup"],
        ["0.3", "s", "from the local cache"],
        ["12", "s", "answer TTL"],
      ],
      spec: [
        ["Name", "contoh.id"],
        ["Client cache", "At most 5 s"],
        ["Resolver cache", "Follows the 12 s TTL"],
        ["From resolver cache", "1.8 s"],
        ["Note", "Demonstration values"],
      ],
      why: { title: "Why a TTL?", text: "A long TTL makes lookups rare and fast, but a changed address shows up late. A short TTL shows changes sooner, at the cost of more full lookups." },
      parts: {
        client: { name: "Client", say: "Asks and receives the answer in its tray." },
        localCache: { name: "Local cache", say: "The client's own notes, with a TTL dial." },
        track: { name: "Track to resolver", say: "The path for questions and answers." },
        resolver: { name: "Resolver", say: "The desk clerk who looks up addresses." },
        resolverCache: { name: "Resolver cache", say: "The resolver's shared notes." },
        ramps: { name: "Ramps", say: "Paths from the desk to each tier." },
        root: { name: "Root server", say: "The highest tier; refers to .id." },
        tld: { name: ".id TLD server", say: "Refers to the server for contoh.id." },
        auth: { name: "Authoritative server", say: "Holds the official address of contoh.id." },
      },
      inset: "Lookup",
      steps: [
        { title: "From name to address", text: "The client asks; the resolver looks up the answer for it." },
        { title: "The tiered lookup", text: "The root refers to .id, .id refers to contoh.id, then the address comes back." },
        { title: "The answer is kept", text: "The next question is answered by the local cache in 0.3 s." },
        { title: "The resolver's cache", text: "The client's note runs out; the resolver answers in 1.8 s." },
        { title: "TTL and a new address", text: "Caches still give the old address until the TTL ends, then it is looked up again." },
      ],
      details: [
        { title: "Local cache", text: "One-bar card: the old address." },
        { title: "Resolver cache", text: "The TTL dial counts down." },
        { title: "Official record", text: "Two-bar card: the new address." },
      ],
    },
  },
};
