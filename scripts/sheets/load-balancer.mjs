/**
 * Printable sheet spec for the load balancer topic. Numbers come from src/sim/model.ts and
 * src/sim/scenarios.ts: health checks every 3 s, 2 failures to mark a server unhealthy, B stops at
 * 4.2 s and is marked unhealthy at 10.6 s after 2 failed requests, B restarts at 16 s.
 */
import { iso } from "../../src/figure/kit/iso-kit.mjs";
import ART from "../../src/figure/art.generated.json" with { type: "json" };
/** A pin position from a world point, projected with the figure's own camera (viewBox units). */
const pin = (point) => iso(point, ART.P).map((v) => Math.round(v * 10) / 10);
const go = (key) => ["eval", `localStorage.setItem('webedukasi.theme','light'); location.href = location.pathname + '?topik=load-balancer&langkah=${key}&tampilan=mesin'; 'go'`];
const part = (id) => `.it[data-part="${id}"]`;
const note = (text) => ["until", `(document.querySelector('.figure-note')||{textContent:''}).textContent.includes(${JSON.stringify(text)})`, 20000];
const title = (text) => ["until", `(document.querySelector('.state-title')||{textContent:''}).textContent.includes(${JSON.stringify(text)})`, 20000];

export default {
  layers: ".figure-host svg.iso-svg",
  reduced: false,
  width: 1440,
  height: 1000,
  settle: 2500,
  views: {
    normal: { actions: [go("round-robin"), ["wait", 4600]] },
    down: { actions: [go("server-down"), note("Demonstrasi selesai"), ["wait", 300]] },
    detected: { actions: [go("health-check"), ["wait", 3600]] },
    recovered: { actions: [go("recovery"), title("Tiga server sehat"), ["wait", 1500]] },
  },
  number: "WE-01",
  parts: [
    { id: "client", select: part("client") },
    { id: "lb", select: part("lb"), at: pin([16, 16, 14]) },
    { id: "selector", select: part("selector"), at: pin([0, 0, 33]) },
    { id: "pins", select: part("pins"), at: pin([0, -16, 36]) },
    { id: "lanes", select: part("lanes"), at: pin([30, -44, 2.6]) },
    { id: "serverA", select: part("serverA") },
    { id: "serverB", select: part("serverB") },
    { id: "serverC", select: part("serverC") },
    { id: "hc", select: part("hc") },
    { id: "probes", select: part("probes") },
  ],
  main: { view: "detected" },
  inset: { view: "normal" },
  steps: [
    { view: "normal", focus: ["client", "lb"] },
    { view: "normal", focus: ["selector", "lanes"] },
    { view: "down", focus: ["serverB"] },
    { view: "detected", focus: ["hc", "probes", "pins"] },
    { view: "recovered", focus: ["serverB", "pins"] },
  ],
  details: [
    { view: "detected", around: ["pins", "selector"], focus: ["pins"] },
    { view: "down", around: ["serverB"], focus: ["serverB"] },
    // the "hc" part also spans the backplane and the status cable, so frame the unit itself
    { view: "detected", around: ["hc"], focus: ["hc"], crop: [316, 11, 150, 150], mark: [391, 86] },
  ],
  text: {
    id: {
      name: "Load Balancer",
      title: "Anatomi Load Balancer",
      tagline: "Satu alamat, beberapa server",
      question: "Bagaimana satu alamat melayani banyak server?",
      lead: "Klien mengirim semua permintaan ke satu titik. Load balancer meneruskannya bergiliran ke server A, B dan C, tetapi hanya ke server yang ia anggap sehat. Health check memeriksa server secara berkala; sampai pemeriksaan gagal dua kali, server yang mati masih menerima giliran.",
      quote: "Mati belum tentu diketahui",
      numbers: [
        ["3", "server", "di belakang satu alamat"],
        ["3", "dtk", "jarak antar health check"],
        ["2", "kali", "gagal berturut sebelum dilewati"],
        ["6,4", "dtk", "dari B mati sampai ditandai"],
      ],
      spec: [
        ["Pembagian", "Round robin A → B → C"],
        ["Health check", "Setiap 3 dtk, batas 1 dtk"],
        ["Ambang", "2 gagal / 2 lolos"],
        ["Gagal sebelum deteksi", "2 permintaan"],
        ["Catatan", "Angka demonstrasi"],
      ],
      why: { title: "Mengapa menunggu dua kali?", text: "Satu pemeriksaan bisa gagal karena gangguan sesaat. Menunggu dua kegagalan berturut mencegah server sehat dikeluarkan tanpa alasan, dengan harga: beberapa permintaan sempat gagal lebih dulu." },
      parts: {
        client: { name: "Klien", say: "Mengirim permintaan ke satu alamat." },
        lb: { name: "Drum distributor", say: "Load balancer: titik penerima semua permintaan." },
        selector: { name: "Lengan pemilih", say: "Menunjuk lajur berikutnya menurut round robin." },
        pins: { name: "Pin kelayakan", say: "Berdiri = dianggap sehat oleh load balancer." },
        lanes: { name: "Lajur", say: "Membawa permintaan ke tiap server." },
        serverA: { name: "Server A", say: "Backend; rana terbuka selama hidup." },
        serverB: { name: "Server B", say: "Backend yang dimatikan dalam demonstrasi." },
        serverC: { name: "Server C", say: "Backend; rana terbuka selama hidup." },
        hc: { name: "Unit health check", say: "Memeriksa server dan menurunkan pin." },
        probes: { name: "Kabel probe", say: "Membawa pemeriksaan ke tiap server." },
      },
      inset: "Normal",
      steps: [
        { title: "Satu titik penerima", text: "Klien hanya mengenal satu alamat. Setiap permintaan masuk ke drum distributor." },
        { title: "Membagi bergiliran", text: "Round robin mengirim ke A, B, C, lalu kembali ke A. Jumlah sama belum tentu beban sama." },
        { title: "Server B berhenti", text: "Rana B tertutup, tetapi pin B masih berdiri. Dua permintaan ke B gagal." },
        { title: "Health check mendeteksi", text: "Dua pemeriksaan gagal berturut, pin B turun. Giliran kini A lalu C." },
        { title: "Server B pulih", text: "B hidup lagi, tetapi baru dipakai setelah dua pemeriksaan lolos." },
      ],
      details: [
        { title: "Catatan load balancer", text: "Pin B turun: B dilewati giliran." },
        { title: "Rana tertutup", text: "Kondisi fisik B: permintaan tertahan dan gagal." },
        { title: "Lampu pemeriksaan", text: "Hasil terakhir dan hitungan menuju ambang." },
      ],
    },
    en: {
      name: "Load Balancer",
      title: "Load Balancer Anatomy",
      tagline: "One address, several servers",
      question: "How can one address serve many servers?",
      lead: "The client sends every request to one point. The load balancer passes them in turn to servers A, B and C, but only to servers it believes are healthy. Health checks probe the servers regularly; until a check has failed twice, a stopped server still gets its turn.",
      quote: "Down is not the same as known",
      numbers: [
        ["3", "servers", "behind one address"],
        ["3", "s", "between health checks"],
        ["2", "×", "failures before it is skipped"],
        ["6.4", "s", "from B stopping to being marked"],
      ],
      spec: [
        ["Sharing", "Round robin A → B → C"],
        ["Health check", "Every 3 s, 1 s timeout"],
        ["Threshold", "2 fails / 2 passes"],
        ["Failed before detection", "2 requests"],
        ["Note", "Demonstration values"],
      ],
      why: { title: "Why wait for two?", text: "One check can fail because of a brief glitch. Waiting for two failures in a row keeps a healthy server from being dropped for nothing, at a price: a few requests fail first." },
      parts: {
        client: { name: "Client", say: "Sends requests to one address." },
        lb: { name: "Distributor drum", say: "The load balancer: where every request arrives." },
        selector: { name: "Selector arm", say: "Points at the next lane by round robin." },
        pins: { name: "Eligibility pins", say: "Standing = believed healthy by the load balancer." },
        lanes: { name: "Lanes", say: "Carry requests to each server." },
        serverA: { name: "Server A", say: "A backend; the shutter is open while it runs." },
        serverB: { name: "Server B", say: "The backend that is stopped in the demonstration." },
        serverC: { name: "Server C", say: "A backend; the shutter is open while it runs." },
        hc: { name: "Health-check unit", say: "Checks the servers and lowers a pin." },
        probes: { name: "Probe cables", say: "Carry checks to each server." },
      },
      inset: "Normal",
      steps: [
        { title: "One entry point", text: "The client knows one address only. Every request enters the distributor drum." },
        { title: "Sharing in turn", text: "Round robin sends to A, B, C, then A again. Equal counts are not always equal load." },
        { title: "Server B stops", text: "B's shutter closes, but pin B still stands. Two requests to B fail." },
        { title: "Checks detect it", text: "Two checks fail in a row and pin B drops. Turns now go A, then C." },
        { title: "Server B recovers", text: "B runs again, but is used only after two checks pass." },
      ],
      details: [
        { title: "The balancer's record", text: "Pin B down: B is skipped." },
        { title: "Shutter closed", text: "B's physical state: requests stop and fail." },
        { title: "Check lamps", text: "Last result and the count toward the threshold." },
      ],
    },
  },
};
