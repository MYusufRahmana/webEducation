import { measuredRate, recentDecisions, SERVERS, type Sim } from "../sim/model";
import type { Lang } from "../content/topic";
import { formatNumber, UI } from "../content/ui";

export function stateTitle(sim: Sim, lang: Lang) {
  const s = UI[lang].states;
  const b = sim.servers.B;
  if (!b.up && b.healthy) return s.bDownUnknown;
  if (!b.up && !b.healthy) return s.bDownKnown;
  if (b.up && !b.healthy) return s.bUpWaiting;
  return SERVERS.every((id) => sim.servers[id].up && sim.servers[id].healthy) ? s.allHealthy : s.bUpButHealthy;
}

/** The short live line for the card's corner: simulated time and cumulative counts. */
export function cornerReadout(sim: Sim, lang: Lang) {
  const sent = SERVERS.reduce((sum, id) => sum + sim.servers[id].sent, 0);
  const ok = SERVERS.reduce((sum, id) => sum + sim.servers[id].ok, 0);
  const failed = SERVERS.reduce((sum, id) => sum + sim.servers[id].failed, 0);
  return `${UI[lang].readoutTime(formatNumber(lang, sim.t, 1))} · ${UI[lang].summaryCounts(sent, ok, failed)}`;
}

export function OrderStrip({ sim, lang }: { sim: Sim; lang: Lang }) {
  const ui = UI[lang];
  const recent = recentDecisions(sim, 9);
  return (
    <div className="order">
      <span className="order-label" id="order-label">
        {ui.orderStrip}
      </span>
      {recent.length ? (
        <ol className="order-list" aria-labelledby="order-label">
          {recent.map((entry) => (
            <li key={entry.id} className="order-item" data-outcome={entry.outcome} data-server={entry.server}>
              <span className="order-server">{entry.server}</span>
              <span className="order-mark" aria-hidden="true">
                {entry.outcome === "ok" ? "✓" : entry.outcome === "fail" ? "✕" : "→"}
              </span>
              <span className="sr-only">{ui.outcome[entry.outcome]}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="order-empty">{ui.orderEmpty}</p>
      )}
    </div>
  );
}

export function ServerTable({ sim, lang }: { sim: Sim; lang: Lang }) {
  const ui = UI[lang].table;
  const { failThreshold, passThreshold } = sim.params;
  return (
    <div className="table-wrap">
      <table className="servers">
        <caption>{ui.caption}</caption>
        <thead>
          <tr>
            <th scope="col">{ui.server}</th>
            <th scope="col">{ui.physical}</th>
            <th scope="col">{ui.lbView}</th>
            <th scope="col" className="num">
              {ui.sent}
            </th>
            <th scope="col" className="num">
              {ui.ok}
            </th>
            <th scope="col" className="num">
              {ui.failed}
            </th>
            <th scope="col" className="num">
              <abbr title={ui.rateNote}>{ui.rate}</abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {SERVERS.map((id) => {
            const server = sim.servers[id];
            const rate = measuredRate(sim, id);
            const streak = server.streak > 0 ? (server.healthy ? ui.streakFail(server.streak, failThreshold) : ui.streakPass(server.streak, passThreshold)) : "";
            return (
              <tr key={id}>
                <th scope="row">{id}</th>
                <td>
                  <span className="status" data-ok={server.up || undefined}>
                    <span className="status-mark" aria-hidden="true">
                      {server.up ? "●" : "○"}
                    </span>
                    {server.up ? ui.up : ui.down}
                  </span>
                </td>
                <td>
                  <span className="status" data-ok={server.healthy || undefined}>
                    <span className="status-mark" aria-hidden="true">
                      {server.healthy ? "✓" : "✕"}
                    </span>
                    {server.healthy ? ui.healthy : ui.unhealthy}
                  </span>
                  {streak ? <span className="streak"> · {streak}</span> : null}
                </td>
                <td className="num">{server.sent}</td>
                <td className="num">{server.ok}</td>
                <td className="num" data-bad={server.failed > 0 || undefined}>
                  {server.failed}
                </td>
                <td className="num">{rate === null ? <span className="muted">{ui.notYet}</span> : `${formatNumber(lang, rate, 2)}/s`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
