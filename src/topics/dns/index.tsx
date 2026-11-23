import { formatNumber } from "../../content/ui";
import type { Bilingual, Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import { DNS_VIEW_PARTS } from "../view-parts";
import { DNS_LESSON } from "./lesson";
import { ADDRESSES, advance, answers, ask, changeRecord, flush, inFlight, ttlLeft, type DnsLog, type DnsSim, type Phase } from "./model";
import { DNS_STEPS } from "./scenarios";
import { DNS_CLOSING, DNS_GLOSSARY, DNS_META, DNS_PARTS, DNS_STEP_CONTENT, DNS_UI } from "./content";

type Ui = (typeof DNS_UI)["id"];
const uiOf = (lang: Lang) => DNS_UI[lang] as unknown as Ui;

const WHERE: Partial<Record<Phase, "root" | "tld" | "auth">> = { "to-root": "root", "from-root": "root", "to-tld": "tld", "from-tld": "tld", "to-auth": "auth", "from-auth": "auth" };

export function dnsStateTitle(sim: DnsSim, lang: Lang) {
  const s = uiOf(lang).states;
  const active = sim.queries.find((query) => query.phase !== "done");
  if (!active) return s.idle;
  if (active.phase === "local-check") return s.local;
  if (active.phase === "to-resolver" || active.phase === "resolver-check") return s.resolver;
  if (active.phase === "to-client") return s.back;
  const where = WHERE[active.phase];
  return where ? s.tiers(uiOf(lang).where[where]) : s.idle;
}

export const dnsReadout = (sim: DnsSim, lang: Lang) => uiOf(lang).readout(formatNumber(lang, sim.t, 1), sim.asked, sim.serverHops);

function Details({ sim, lang, runtime, mode }: DetailsProps<DnsSim>) {
  const ui = uiOf(lang);
  const busy = inFlight(sim);
  const recent = answers(sim).slice(-6);
  const c = ui.counts;
  const t = ui.cacheTable;
  const entry = (holds: number | null, left: number | null) => (
    <>
      <td>{holds === null ? <span className="muted">{t.empty}</span> : `${ADDRESSES[holds]} · ${holds === sim.zone ? ui.fresh : ui.old}`}</td>
      <td className="num">{left === null ? t.na : ui.took(formatNumber(lang, left, 1))}</td>
    </>
  );
  return (
    <>
      {mode === "explore" ? (
        <div className="explore">
          <div className="control">
            <span className="control-label">{ui.explore.actions}</span>
            <button type="button" className="button" disabled={busy} onClick={() => runtime.act((s: DnsSim) => ask(s))} aria-describedby={busy ? "dns-busy" : undefined}>
              {ui.explore.ask}
            </button>
            {busy ? (
              <span id="dns-busy" className="muted small">
                {ui.explore.asking}
              </span>
            ) : null}
          </div>
          <div className="control">
            <span className="control-label" aria-hidden="true" />
            <button type="button" className="button" onClick={() => runtime.act((s: DnsSim) => changeRecord(s))}>
              {ui.explore.change}
            </button>
          </div>
          <div className="control">
            <span className="control-label" aria-hidden="true" />
            <button type="button" className="button" disabled={!sim.local} onClick={() => runtime.act((s: DnsSim) => flush(s, "local"))}>
              {ui.explore.flushLocal}
            </button>
            <button type="button" className="button" disabled={!sim.resolver} onClick={() => runtime.act((s: DnsSim) => flush(s, "resolver"))}>
              {ui.explore.flushResolver}
            </button>
          </div>
        </div>
      ) : null}

      <div className="order">
        <span className="order-label" id="dns-answers">
          {ui.answersTitle}
        </span>
        {recent.length ? (
          <ol className="order-list dns-answers" aria-labelledby="dns-answers">
            {recent.map((answer) => (
              <li key={answer.seq} className="order-item" data-outcome={answer.stale ? "retry" : "ok"}>
                #{answer.seq}
                <span className="order-mark">
                  {ui.source[answer.source]} · {ui.took(formatNumber(lang, answer.took, 1))}
                  {answer.stale ? ` · ${ui.old}` : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="order-empty">{ui.answersEmpty}</p>
        )}
      </div>

      <div className="table-wrap">
        <table className="servers">
          <caption>{t.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.where}</th>
              <th scope="col">{t.holds}</th>
              <th scope="col" className="num">
                {t.left}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t.local}</th>
              {entry(sim.local?.version ?? null, sim.local ? ttlLeft(sim.local, sim.t) : null)}
            </tr>
            <tr>
              <th scope="row">{t.resolver}</th>
              {entry(sim.resolver?.version ?? null, sim.resolver ? ttlLeft(sim.resolver, sim.t) : null)}
            </tr>
            <tr>
              <th scope="row">{t.zone}</th>
              <td>{ADDRESSES[sim.zone]}</td>
              <td className="num">{ui.took(formatNumber(lang, sim.params.ttl, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <dl className="counts" aria-label={c.caption}>
        <div>
          <dt>{c.asked}</dt>
          <dd>{sim.asked}</dd>
        </div>
        <div>
          <dt>{c.localHits}</dt>
          <dd>{sim.localHits}</dd>
        </div>
        <div>
          <dt>{c.resolverHits}</dt>
          <dd>{sim.resolverHits}</dd>
        </div>
        <div>
          <dt>{c.full}</dt>
          <dd>{sim.fullLookups}</dd>
        </div>
        <div>
          <dt>{c.hops}</dt>
          <dd>{sim.serverHops}</dd>
        </div>
        <div>
          <dt>{c.stale}</dt>
          <dd data-warn={sim.staleAnswers > 0 || undefined}>{sim.staleAnswers}</dd>
        </div>
      </dl>
    </>
  );
}

const both = (make: (ui: Ui) => string): Bilingual => ({ id: make(uiOf("id")), en: make(uiOf("en")) });

export const dns: TopicModule<DnsSim> = {
  slug: "dns",
  fig: "Fig 3",
  aspect: 640 / 460,
  meta: DNS_META,
  stepContent: DNS_STEP_CONTENT,
  closing: DNS_CLOSING,
  glossary: DNS_GLOSSARY,
  parts: DNS_PARTS,
  partOrder: ["client", "localCache", "track", "resolver", "resolverCache", "ramps", "root", "tld", "auth"],
  legend: [
    { swatch: "lit", text: { id: DNS_UI.id.legendLit, en: DNS_UI.en.legendLit } },
    { swatch: "token", text: { id: DNS_UI.id.legendCards, en: DNS_UI.en.legendCards } },
    { swatch: "pulse", text: { id: DNS_UI.id.legendDial, en: DNS_UI.en.legendDial } },
  ],
  steps: DNS_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  // in free exploration only the reader asks questions or changes the record
  onExplore: (sim) => {
    sim.script = [];
  },
  announce: (raw) => {
    const entry = raw as DnsLog;
    if (entry.kind === "answer") return both((ui) => ui.announce.answer(entry.seq, ui.source[entry.source], entry.stale));
    if (entry.kind === "change") return both((ui) => ui.announce.change);
    if (entry.kind === "expire") return both((ui) => ui.announce.expire(entry.cache === "local" ? ui.cacheTable.local.toLowerCase() : ui.cacheTable.resolver.toLowerCase()));
    return null;
  },
  stateTitle: dnsStateTitle,
  readout: dnsReadout,
  heldNote: { id: DNS_UI.id.heldNote, en: DNS_UI.en.heldNote },
  Details,
  dualView: true,
  loadFigure: () => import("./FigureStage"),
  loadSystem: () => import("./system"),
  viewParts: DNS_VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "pertanyaan" },
    { swatch: "referral", text: "rujukan" },
    { swatch: "response", text: "alamat terbaru" },
    { swatch: "retry", text: "alamat lama" },
  ],
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}previews/dns-${theme}.svg`,
  scrollHint: { id: DNS_UI.id.scrollHint, en: DNS_UI.en.scrollHint },
  shortName: "DNS",
  lesson: DNS_LESSON,
  metrics: (sim): Metric[] => [
    { label: "Pertanyaan", value: String(sim.asked) },
    { label: "Kunjungan server", value: String(sim.serverHops), unit: "kali" },
    { label: "Dijawab cache", value: String(sim.localHits + sim.resolverHits), unit: "kali" },
    { label: "Alamat lama", value: String(sim.staleAnswers), unit: "jawaban", warn: sim.staleAnswers > 0 },
  ],
  docTitle: { id: "DNS · Alur", en: "DNS · Alur" },
};
