import { CLOSING, GLOSSARY, PARTS, STEP_CONTENT, TOPIC } from "../../content/topic";
import { UI } from "../../content/ui";
import { advance, probesInFlight, RATE_OPTIONS, rateKeyOf, setPower, setRequestInterval, checkNow, type LogEntry, type Sim } from "../../sim/model";
import { STEPS } from "../../sim/scenarios";
import { cornerReadout, OrderStrip, ServerTable, stateTitle } from "../../components/Readout";
import type { DetailsProps, Metric, TopicModule } from "../types";
import { LB_VIEW_PARTS } from "../view-parts";
import { LB_LESSON } from "./lesson";
import { SERVERS } from "../../sim/model";

function Details({ sim, lang, runtime, mode }: DetailsProps<Sim>) {
  const ui = UI[lang];
  const busy = probesInFlight(sim);
  const rateKey = rateKeyOf(sim);
  return (
    <>
      {mode === "explore" ? (
        <div className="explore">
          <div className="control">
            <span className="control-label">{ui.serverBPower}</span>
            <button type="button" className="button" onClick={() => runtime.act((s: Sim) => setPower(s, "B", !s.servers.B.up))} aria-pressed={!sim.servers.B.up}>
              <span className="status-mark" aria-hidden="true">
                {sim.servers.B.up ? "●" : "○"}
              </span>
              {sim.servers.B.up ? ui.powerOff : ui.powerOn}
            </button>
          </div>
          <fieldset className="control">
            <legend className="control-label">{ui.rate}</legend>
            <div className="segmented">
              {RATE_OPTIONS.map((option) => (
                <button key={option.key} type="button" aria-pressed={rateKey === option.key} onClick={() => runtime.act((s: Sim) => setRequestInterval(s, option.interval))}>
                  {ui.rates[option.key]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="control">
            <span className="control-label">Health check</span>
            <button type="button" className="button" onClick={() => runtime.act((s: Sim) => checkNow(s))} disabled={busy} aria-describedby={busy ? "check-busy" : undefined}>
              {ui.checkNow}
            </button>
            {busy ? (
              <span id="check-busy" className="muted small">
                {ui.checkBusy}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      <OrderStrip sim={sim} lang={lang} />
      <ServerTable sim={sim} lang={lang} />
    </>
  );
}

export const loadBalancer: TopicModule<Sim> = {
  slug: "load-balancer",
  dualView: true,
  fig: "Fig 1",
  aspect: 800 / 600,
  meta: TOPIC,
  stepContent: STEP_CONTENT,
  closing: CLOSING,
  glossary: GLOSSARY,
  parts: {
    ...PARTS,
    client: { name: { id: "Pengunjung / pengguna", en: "Visitor / user" }, role: { id: "Pengunjung mewakili pengguna. Setiap token pada jalur mewakili satu permintaan, bukan jumlah orang yang sedang berdiri.", en: "Visitors represent users. Each token represents one request." } },
    lb: { name: { id: "Petugas pembagi / load balancer", en: "Dispatcher / load balancer" }, role: { id: "Petugas mengarahkan pengunjung ke loket; load balancer meneruskan request ke backend. Keduanya memilih tujuan dari daftar yang dianggap siap.", en: "The dispatcher directs visitors to counters, as the load balancer routes requests to eligible backends." } },
    selector: { name: { id: "Pemilih tujuan", en: "Destination selector" }, role: { id: "Memilih A, B, C secara bergiliran di antara tujuan yang dianggap sehat. Giliran merata tidak menjamin beban kerja merata.", en: "Selects eligible destinations in round-robin order." } },
    pins: { name: { id: "Daftar tujuan yang dianggap sehat", en: "Eligible destinations" }, role: { id: "Label Masih mendapat giliran menunjukkan keputusan pembagi. Daftar ini diperbarui setelah pemeriksaan, sehingga dapat berbeda dari kondisi Aktif atau Berhenti.", en: "Eligibility is updated by health checks and can differ from physical availability." } },
    lanes: { name: { id: "Jalur menuju loket / server", en: "Paths to counters / servers" }, role: { id: "Menghubungkan pembagi dengan A, B, dan C. Token menunjukkan permintaan yang benar-benar dikirim oleh model simulasi.", en: "Connects the dispatcher to destinations A, B and C." } },
    hc: { name: { id: "Pemeriksa / health check", en: "Inspector / health check" }, role: { id: "Pemeriksa mengunjungi loket secara berkala. Health check memeriksa server dan memperbarui daftar tujuan setelah ambang keberhasilan atau kegagalan tercapai.", en: "Checks destinations periodically and updates eligibility after the configured threshold." } },
    probes: { name: { id: "Jalur pemeriksaan", en: "Health-check paths" }, role: { id: "Garis putus-putus menunjukkan pemeriksaan berkala. Titik hijau yang kembali berarti tujuan merespons.", en: "Dashed paths carry checks; a returning green dot means the destination responded." } },
    ...Object.fromEntries((["A", "B", "C"] as const).map(id => [`server${id}`, { name: { id: `Loket ${id} / server ${id}`, en: `Counter ${id} / server ${id}` }, role: { id: `Loket ${id} mewakili backend ${id}. Aktif atau Berhenti menunjukkan kondisi sebenarnya; label giliran menunjukkan pengetahuan pembagi. Angka menunjukkan total permintaan yang diteruskan ke sini.`, en: `Counter ${id} represents backend ${id}. Power and eligibility are separate; the number counts forwarded requests.` } }])),
  },
  partOrder: ["client", "feed", "lb", "selector", "pins", "lanes", "serverA", "serverB", "serverC", "hc", "probes"],
  legend: [
    { swatch: "lit", text: { id: UI.id.legendLit, en: UI.en.legendLit } },
    { swatch: "token", text: { id: UI.id.legendToken, en: UI.en.legendToken } },
    { swatch: "pulse", text: { id: UI.id.legendPulse, en: UI.en.legendPulse } },
  ],
  steps: STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  announce: (raw) => {
    const entry = raw as LogEntry;
    if (entry.kind === "power") return { id: UI.id.announce.power(entry.server, entry.up), en: UI.en.announce.power(entry.server, entry.up) };
    if (entry.kind === "health") return { id: UI.id.announce.health(entry.server, entry.healthy), en: UI.en.announce.health(entry.server, entry.healthy) };
    return null;
  },
  stateTitle: (sim, lang) => sim.nextRoundAt === Infinity ? (lang === "id" ? "Satu server menerima semua permintaan" : "One server handles every request") : stateTitle(sim, lang),
  readout: cornerReadout,
  heldNote: { id: UI.id.heldNote, en: UI.en.heldNote },
  Details,
  loadFigure: () => import("../../figure/FigureStage") as never,
  loadSystem: () => import("./system"),
  viewParts: LB_VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "permintaan" },
    { swatch: "response", text: "balasan berhasil" },
    { swatch: "fail", text: "permintaan gagal" },
    { swatch: "dash", text: "probe health check" },
  ],
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}previews/load-balancer-${theme}.svg`,
  scrollHint: { id: UI.id.scrollHint, en: UI.en.scrollHint },
  shortName: "Load Balancer",
  lesson: LB_LESSON,
  metrics: (sim): Metric[] => {
    const sum = (key: "sent" | "ok" | "failed") => SERVERS.reduce((total, id) => total + sim.servers[id][key], 0);
    const eligible = SERVERS.filter((id) => sim.servers[id].healthy).length;
    return [
      { label: "Diteruskan", value: String(sum("sent")), unit: "permintaan" },
      { label: "Berhasil", value: String(sum("ok")), unit: "permintaan" },
      { label: "Gagal", value: String(sum("failed")), unit: "permintaan", warn: sum("failed") > 0 },
      { label: "Dianggap sehat", value: sim.nextRoundAt === Infinity ? "1" : `${eligible} dari 3`, unit: "server", warn: eligible < 3 },
    ];
  },
  docTitle: { id: "Load Balancer · Alur", en: "Load Balancer · Alur" },
};
