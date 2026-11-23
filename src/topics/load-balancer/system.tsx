import type { FigureStageProps } from "../types";
import { SERVERS, type ServerId, type Sim } from "../../sim/model";
import { along, block, clamp01, crowd, edge, floor, makeFrame, pill, token, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/** "Sistem sebenarnya" for the load balancer: the same requests and probes as the machine, drawn as real components. */

const SX: Record<ServerId, number> = { A: 8.6, B: 14.2, C: 19.8 };
const SY = -1.4;
const LB: Vec3 = [7.4, 6.2, 0];
const HC: [number, number] = [19.6, 7.6];
const F = makeFrame([[-0.4, 7.4, 0], [3.6, 11.6, 0], [SX.A, SY, 3.4], [SX.C + 2.4, SY, 3.4], [SX.C + 2.4, SY + 2.4, 0], [HC[0] + 2.2, HC[1] + 2.2, 0], [0, 12.6, 0], [-2.4, 12.4, 0]], 21);

const IN: Vec3[] = [[6.4, 13.8, 0.3], [8.6, 13.8, 0.3], [8.6, LB[1] + 2.4, 0.3]];
const OUT: Record<ServerId, Vec3[]> = Object.fromEntries(
  SERVERS.map((id) => [id, [[LB[0] + 2.4, 7.4, 0.3], [SX[id] + 1.0, 7.4, 0.3], [SX[id] + 1.0, SY + 2.4, 0.3]]]),
) as Record<ServerId, Vec3[]>;
const PROBE: Record<ServerId, Vec3[]> = Object.fromEntries(
  SERVERS.map((id) => [id, [[HC[0] + 1.1, HC[1], 0.3], [HC[0] + 1.1, 3.4, 0.3], [SX[id] + 2.0, 3.4, 0.3], [SX[id] + 2.0, SY + 2.4, 0.3]]]),
) as Record<ServerId, Vec3[]>;

function render(sim: Sim, v: Visual) {
  const t = sim.t;
  const A = v.analogy;
  const scene = v.step ?? 99;
  const single = scene === 0;
  const checks = scene >= 3;
  const shown = single ? (["A"] as ServerId[]) : SERVERS;
  const out: string[] = [];
  const total = SERVERS.reduce((sum, id) => sum + sim.servers[id].sent, 0);

  // edges first (under everything)
  const direct: Vec3[] = [IN[0], [SX.A + 1, 13.8, .3], [SX.A + 1, SY + 2.4, .3]];
  if (single) out.push(edge(F, direct, { part: "feed", arrow: true }, v));
  else out.push(edge(F, IN, { part: "feed", arrow: true }, v));
  if (!single) for (const id of SERVERS) out.push(edge(F, OUT[id], { part: "lanes", arrow: true, faded: !sim.servers[id].healthy }, v));
  if (checks) for (const id of SERVERS) out.push(edge(F, PROBE[id], { part: "probes", dashed: true }, v));

  // tokens on the edges
  for (const r of sim.requests) {
    if (single) {
      const duration = sim.params.toLb + sim.params.toServer;
      if (!r.decided || r.outcome === "pending") out.push(token(F, along(direct, v.reduced ? 1 : (t-r.createdAt)/duration), "request"));
      else if (r.outcome === "ok" && r.resolvedAt !== null && t-r.resolvedAt < .6 && !v.reduced) out.push(token(F, along(direct, 1-(t-r.resolvedAt)/.6), "response"));
      continue;
    }
    if (!r.decided) out.push(token(F, along(IN, v.reduced ? 1 : (t - r.createdAt) / (r.decideAt - r.createdAt)), "request"));
    else if (r.target && r.outcome === "pending" && r.arriveAt !== null) out.push(token(F, along(OUT[r.target], v.reduced ? 1 : (t - r.decideAt) / (r.arriveAt - r.decideAt)), "request"));
    else if (r.target && r.outcome === "fail" && r.resolvedAt !== null && t - r.resolvedAt < 3) out.push(token(F, along(OUT[r.target], 0.93), "fail", 1 - clamp01((t - r.resolvedAt - 2) / 1)));
    else if (r.target && r.outcome === "ok" && r.resolvedAt !== null && t - r.resolvedAt < 0.5 && !v.reduced) out.push(token(F, along(OUT[r.target], 1 - (t - r.resolvedAt) / 0.5), "response"));
  }
  if (checks) for (const p of sim.probes) {
    if (t < p.reachAt) out.push(token(F, along(PROBE[p.server], v.reduced ? 1 : (t - p.sentAt) / (p.reachAt - p.sentAt)), "probe"));
    else if (p.result === "pending" && p.serverUp) out.push(token(F, along(PROBE[p.server], 1 - clamp01((t - p.reachAt) / Math.max(0.01, p.resolveAt - p.reachAt))), "probe"));
    else if (p.result === "fail" && t - p.resolveAt < 1.2) out.push(token(F, along(PROBE[p.server], 0.95), "fail"));
  }

  // nodes, back to front
  if (checks) out.push(block(F, HC[0], HC[1], { tone: "violet", label: A ? "Pemeriksa" : "Health", sub: A ? undefined : "check", icon: A ? "clipboard" : "pulse", part: "hc", w: 2.2, d: 2.2, h: 1.4 }, v));
  for (const id of shown) {
    const s = sim.servers[id];
    out.push(block(F, SX[id], SY, { tone: "blue", label: A ? `Loket ${id}` : `Server ${id}`, icon: A ? "booth" : "server", part: `server${id}`, down: !s.up }, v));
  }
  out.push(crowd(F, 3, 12.6, 3.2, 3.8, 14, "client", v));
  if (!single) out.push(block(F, LB[0], LB[1], A ? { tone: "orange", label: "Petugas", sub: "pembagi", icon: "person", part: "lb" } : { tone: "orange", label: "Load", sub: "Balancer", icon: "split", part: "lb" }, v));

  // pills: the server's real state above, what the load balancer believes below (same words as the lesson)
  for (const id of shown) {
    const s = sim.servers[id];
    const [x, y] = F.p(SX[id] + 1.2, SY + 1.2, 2.9);
    const share = total ? Math.round((s.sent / total) * 100) : 0;
    out.push(pill(x, y - 6, `${s.up ? "Aktif" : "Berhenti"} · ${share}%`, { tone: s.up ? "plain" : "bad", small: true, part: `server${id}` }, v));
    const [bx, by] = F.p(SX[id] + 2.4, SY + 2.4, 0);
    if (!single && (!s.up || !s.healthy)) out.push(pill(bx + 4, by + 14, s.healthy ? "masih dipilih" : "dilewati", { tone: s.healthy ? "warn" : "plain", small: true, part: "pins" }, v));
  }
  const [lx, ly] = F.p(LB[0] + 2.4, LB[1] + 2.4, 0);
  if (!single) out.push(pill(lx + 30, ly + 14, A ? "↻ bergiliran" : "↻ round robin", { part: "selector" }, v));
  const [cx, cy] = F.p(4.6, 16.4, 0);
  out.push(pill(cx, cy + 22, `${A ? "pengunjung" : "pengguna"} · ${Number((1 / sim.params.requestInterval).toFixed(1)).toLocaleString("id-ID")} permintaan/dtk`, { small: true, part: "client" }, v));
  const [hx, hy] = F.p(HC[0] + 1.1, HC[1] + 1.1, 2.6);
  if (checks) out.push(pill(hx, hy - 8, A ? "menengok tiap 3 dtk" : "cek tiap 3 dtk", { small: true, part: "hc" }, v));
  return out.join("");
}

const SPEC: SystemSpec<Sim> = {
  frame: F,
  floor: floor(F, [-2, -3, 25, 19]),
  render,
  analogyLabel: "Analogi sehari-hari: pengunjung diarahkan petugas pembagi ke loket A, B, dan C secara bergiliran. Pemeriksa menengok ketiga loket secara berkala.",
  label: "Sistem sebenarnya: pengguna mengirim permintaan ke load balancer, yang meneruskannya bergiliran ke server A, B, dan C. Unit health check memeriksa ketiga server.",
};

export default function LbSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
