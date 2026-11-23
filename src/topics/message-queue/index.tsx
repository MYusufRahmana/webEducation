import { formatNumber } from "../../content/ui";
import type { Lang } from "../../content/topic";
import type { DetailsProps, Metric, TopicModule } from "../types";
import { MQ_VIEW_PARTS } from "../view-parts";
import { MQ_LESSON } from "./lesson";
import {
  advance,
  burstNow,
  consumerRate,
  CONSUMERS,
  MQ_RATES,
  mqRateKeyOf,
  oldestWait,
  queuedMessages,
  recentAcks,
  setAttached,
  setConsumerPower,
  setProduceInterval,
  type MqLog,
  type MqSim,
} from "./model";
import { MQ_STEPS } from "./scenarios";
import { MQ_CLOSING, MQ_GLOSSARY, MQ_META, MQ_PARTS, MQ_STEP_CONTENT, MQ_UI } from "./content";

export function mqStateTitle(sim: MqSim, lang: Lang) {
  const s = MQ_UI[lang].states;
  const depth = sim.queue.length;
  if (depth >= sim.params.capacity) return s.full;
  if (!sim.consumers.C1.up && !(sim.consumers.C2.up && sim.consumers.C2.attached)) return s.down(depth);
  // a copy waiting for an ack whose consumer no longer holds it will be delivered again
  if (sim.unacked.some((record) => sim.consumers[record.consumer].current !== record.id)) return s.redelivery;
  return depth === 0 ? s.idle : s.flowing(depth);
}

export function mqReadout(sim: MqSim, lang: Lang) {
  return MQ_UI[lang].readout(formatNumber(lang, sim.t, 1), sim.queue.length, sim.acked, sim.redelivered);
}

function Details({ sim, lang, runtime, mode }: DetailsProps<MqSim>) {
  const ui = MQ_UI[lang];
  const rate = mqRateKeyOf(sim);
  const queued = queuedMessages(sim);
  const acks = recentAcks(sim, 9);
  const c = ui.counts;
  return (
    <>
      {mode === "explore" ? (
        <div className="explore">
          <fieldset className="control">
            <legend className="control-label">{ui.explore.rate}</legend>
            <div className="segmented">
              {MQ_RATES.map((option) => (
                <button key={option.key} type="button" aria-pressed={rate === option.key} onClick={() => runtime.act((s: MqSim) => setProduceInterval(s, option.interval))}>
                  {ui.explore.rates[option.key]}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="control">
            <span className="control-label">{ui.explore.producer}</span>
            <button type="button" className="button" onClick={() => runtime.act((s: MqSim) => burstNow(s))}>
              {ui.explore.burst}
            </button>
          </div>
          <div className="control">
            <span className="control-label">{ui.explore.consumers}</span>
            {CONSUMERS.map((id) => (
              <button key={id} type="button" className="button" aria-pressed={!sim.consumers[id].up} onClick={() => runtime.act((s: MqSim) => setConsumerPower(s, id, !s.consumers[id].up))}>
                <span className="status-mark" aria-hidden="true">
                  {sim.consumers[id].up ? "●" : "○"}
                </span>
                {ui.explore.power(id, sim.consumers[id].up)}
              </button>
            ))}
            <button type="button" className="button" aria-pressed={sim.consumers.C2.attached} onClick={() => runtime.act((s: MqSim) => setAttached(s, "C2", !s.consumers.C2.attached))}>
              {ui.explore.attach(sim.consumers.C2.attached)}
            </button>
          </div>
        </div>
      ) : null}

      <div className="order">
        <span className="order-label" id="mq-queue-label">
          {ui.queueStrip}
        </span>
        {queued.length ? (
          <ol className="order-list" aria-labelledby="mq-queue-label">
            {queued.map((message) => (
              <li key={message.id} className="order-item" data-outcome={message.attempt > 0 ? "retry" : "pending"}>
                #{message.seq}
                {message.attempt > 0 ? (
                  <span className="order-mark" title={ui.attempt(message.attempt + 1)}>
                    ↻<span className="sr-only">{ui.attempt(message.attempt + 1)}</span>
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="order-empty">{ui.queueEmpty}</p>
        )}
      </div>

      <div className="order">
        <span className="order-label" id="mq-done-label">
          {ui.doneStrip}
        </span>
        {acks.length ? (
          <ol className="order-list" aria-labelledby="mq-done-label">
            {acks.map((entry) => (
              <li key={`${entry.seq}-${entry.at}`} className="order-item" data-outcome={entry.attempt > 1 ? "retry" : "ok"}>
                #{entry.seq}
                <span className="order-mark">{entry.consumer}</span>
                {entry.attempt > 1 ? <span className="sr-only">{ui.attempt(entry.attempt)}</span> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="order-empty">{ui.doneEmpty}</p>
        )}
      </div>

      <dl className="counts" aria-label={c.caption}>
        <div>
          <dt>{c.produced}</dt>
          <dd>{sim.produced}</dd>
        </div>
        <div>
          <dt>{c.depth}</dt>
          <dd>
            {sim.queue.length}
            <span className="muted"> / {sim.params.capacity}</span>
          </dd>
        </div>
        <div>
          <dt>{c.unacked}</dt>
          <dd>{sim.unacked.length}</dd>
        </div>
        <div>
          <dt>{c.acked}</dt>
          <dd>{sim.acked}</dd>
        </div>
        <div>
          <dt>{c.redelivered}</dt>
          <dd data-warn={sim.redelivered > 0 || undefined}>{sim.redelivered}</dd>
        </div>
        <div>
          <dt>{c.rejected}</dt>
          <dd data-bad={sim.rejected > 0 || undefined}>{sim.rejected}</dd>
        </div>
        <div>
          <dt>{c.oldest}</dt>
          <dd>{c.seconds(formatNumber(lang, oldestWait(sim), 1))}</dd>
        </div>
      </dl>

      <div className="table-wrap">
        <table className="servers">
          <caption>{ui.table.caption}</caption>
          <thead>
            <tr>
              <th scope="col">{ui.table.consumer}</th>
              <th scope="col">{ui.table.state}</th>
              <th scope="col">{ui.table.holding}</th>
              <th scope="col" className="num">
                {ui.table.done}
              </th>
              <th scope="col" className="num">
                <abbr title={ui.table.rateNote}>{ui.table.rate}</abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {CONSUMERS.map((id) => {
              const consumer = sim.consumers[id];
              const holding = consumer.current === null ? null : sim.messages.find((message) => message.id === consumer.current);
              const r = consumerRate(sim, id);
              const ok = consumer.up && consumer.attached;
              return (
                <tr key={id}>
                  <th scope="row">{id}</th>
                  <td>
                    <span className="status" data-ok={ok || undefined}>
                      <span className="status-mark" aria-hidden="true">
                        {ok ? "●" : "○"}
                      </span>
                      {!consumer.attached ? ui.table.detached : consumer.up ? ui.table.up : ui.table.down}
                    </span>
                  </td>
                  <td>{holding ? `#${holding.seq}${holding.attempt > 1 ? ` · ${ui.attempt(holding.attempt)}` : ""}` : ui.table.none}</td>
                  <td className="num">{consumer.done}</td>
                  <td className="num">{r === null ? <span className="muted">{ui.table.notYet}</span> : `${formatNumber(lang, r, 2)}/s`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

const both = <A extends unknown[]>(pick: (ui: (typeof MQ_UI)["id"]) => (...args: A) => string, ...args: A) => ({ id: pick(MQ_UI.id)(...args), en: pick(MQ_UI.en as unknown as (typeof MQ_UI)["id"])(...args) });

export const messageQueue: TopicModule<MqSim> = {
  slug: "message-queue",
  fig: "Fig 2",
  aspect: 640 / 420,
  meta: MQ_META,
  stepContent: MQ_STEP_CONTENT,
  closing: MQ_CLOSING,
  glossary: MQ_GLOSSARY,
  parts: MQ_PARTS,
  partOrder: ["producer", "conveyor", "queue", "broker", "unacked", "lanes", "consumer1", "consumer2", "ackLines"],
  legend: [
    { swatch: "lit", text: { id: MQ_UI.id.legendLit, en: MQ_UI.en.legendLit } },
    { swatch: "token", text: { id: MQ_UI.id.legendTile, en: MQ_UI.en.legendTile } },
    { swatch: "ghost", text: { id: MQ_UI.id.legendGhost, en: MQ_UI.en.legendGhost } },
    { swatch: "pulse", text: { id: MQ_UI.id.legendPulse, en: MQ_UI.en.legendPulse } },
  ],
  steps: MQ_STEPS,
  advance: (sim, dt) => {
    advance(sim, dt);
  },
  announce: (raw) => {
    const entry = raw as MqLog;
    if (entry.kind === "power") return both((ui) => ui.announce.power, entry.consumer, entry.up);
    if (entry.kind === "attach") return both((ui) => ui.announce.attach, entry.consumer, entry.attached);
    if (entry.kind === "redeliver") return both((ui) => ui.announce.redeliver, entry.seq, entry.attempt);
    if (entry.kind === "reject") return both((ui) => ui.announce.reject, entry.seq);
    return null;
  },
  stateTitle: mqStateTitle,
  readout: mqReadout,
  heldNote: { id: MQ_UI.id.heldNote, en: MQ_UI.en.heldNote },
  Details,
  dualView: true,
  loadFigure: () => import("./FigureStage"),
  loadSystem: () => import("./system"),
  viewParts: MQ_VIEW_PARTS,
  viewLegend: [
    { swatch: "request", text: "pesan" },
    { swatch: "retry", text: "pesan dikirim ulang" },
    { swatch: "response", text: "ack" },
    { swatch: "fail", text: "salinan hilang / ditolak" },
  ],
  fallbackImage: (theme) => `${import.meta.env.BASE_URL}previews/message-queue-${theme}.svg`,
  scrollHint: { id: "Scroll untuk mengikuti perjalanan pesan", en: "Scroll to follow the messages" },
  shortName: "Message Queue",
  lesson: MQ_LESSON,
  metrics: (sim): Metric[] => [
    { label: "Menunggu di antrean", value: `${sim.queue.length} / ${sim.params.capacity}`, unit: "pesan", warn: sim.queue.length >= sim.params.capacity },
    { label: "Belum di-ack", value: String(sim.unacked.length), unit: "pesan" },
    { label: "Selesai", value: String(sim.acked), unit: "pesan" },
    { label: "Dikirim ulang", value: String(sim.redelivered), unit: "pesan", warn: sim.redelivered > 0 },
  ],
  docTitle: { id: "Message Queue · Alur", en: "Message Queue · Alur" },
};
