import type { FigureStageProps } from "../types";
import { CONSUMERS, type ConsumerId, type MqSim } from "./model";
import { along, block, clamp01, crowd, edge, floor, makeFrame, pill, token, zone, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/** "Sistem sebenarnya" for the message queue: producer, queue, broker and workers, driven by the same model. */

const PROD: [number, number] = [0, 6];
const Q = { x: 3.2, y: 6.6, w: 7.6, d: 1.2 };
const BROKER: [number, number] = [11.6, 6];
const CX: Record<ConsumerId, number> = { C1: 16.4, C2: 22 };
const CY = -1;
const F = makeFrame([[-4.6, 9.6, 0], [0, 6, 3.2], [CX.C1, CY, 3.6], [CX.C2 + 2.4, CY, 3.4], [CX.C2 + 2.4, CY + 2.4, 0], [BROKER[0] + 2.4, 8.4, 0], [-2, 12.2, 0], [-7.4, 11.2, 0]], 19);

const TO_Q: Vec3[] = [[PROD[0] + 2.4, 7.2, 0.3], [Q.x, 7.2, 0.3]];
const TO_B: Vec3[] = [[Q.x + Q.w, 7.2, 0.3], [BROKER[0], 7.2, 0.3]];
const TO_C: Record<ConsumerId, Vec3[]> = Object.fromEntries(
  CONSUMERS.map((id) => [id, [[BROKER[0] + 2.4, 7.4, 0.3], [CX[id] + 0.9, 7.4, 0.3], [CX[id] + 0.9, CY + 2.4, 0.3]]]),
) as Record<ConsumerId, Vec3[]>;
const ACK: Record<ConsumerId, Vec3[]> = Object.fromEntries(
  CONSUMERS.map((id) => [id, [[CX[id] + 1.9, CY + 2.4, 0.3], [CX[id] + 1.9, 4.4, 0.3], [BROKER[0] + 1.6, 4.4, 0.3], [BROKER[0] + 1.6, 6, 0.3]]]),
) as Record<ConsumerId, Vec3[]>;
const slot = (index: number): Vec3 => [Q.x + Q.w - 0.35 - index * 0.6, Q.y + Q.d / 2, 0.1];

function render(sim: MqSim, v: Visual) {
  const t = sim.t;
  const A = v.analogy;
  const scene = v.step ?? 99;
  const { toQueue, deliver, process } = sim.params;
  const out: string[] = [];
  out.push(zone(F, Q.x, Q.y, Q.w, Q.d, A ? "R E L   P E S A N A N" : "A N T R E A N", "queue", v));
  out.push(edge(F, TO_Q, { part: "conveyor", arrow: true }, v));
  out.push(edge(F, TO_B, { part: "queue", arrow: true }, v));
  for (const id of CONSUMERS) {
    const c = sim.consumers[id];
    if (id === "C2" && scene < 4 && !c.attached) continue;
    out.push(edge(F, TO_C[id], { part: "lanes", arrow: true, faded: !c.attached }, v));
    if (scene >= 3) out.push(edge(F, ACK[id], { part: "ackLines", dashed: true, arrow: true, faded: !c.attached }, v));
  }

  // queued messages in their slots, head nearest the broker
  sim.queue.forEach((mid, index) => {
    const m = sim.messages.find((message) => message.id === mid);
    if (m) out.push(token(F, slot(index), m.attempt > 0 ? "retry" : "message"));
  });
  for (const m of sim.messages) {
    if (m.state === "toQueue") out.push(token(F, along(TO_Q, v.reduced ? 1 : (t - m.createdAt) / toQueue), "message"));
    else if (m.state === "delivering" && m.consumer && m.deliveredAt !== null) out.push(token(F, along([...TO_B.slice(1), ...TO_C[m.consumer]], v.reduced ? 1 : (t - m.deliveredAt) / deliver), m.attempt > 1 ? "retry" : "message"));
    else if (m.state === "processing" && m.consumer) out.push(token(F, along(TO_C[m.consumer], 1), m.attempt > 1 ? "retry" : "message"));
    else if (m.state === "acked" && m.consumer && m.endedAt !== null && t - m.endedAt < 0.6 && !v.reduced) out.push(token(F, along(ACK[m.consumer], (t - m.endedAt) / 0.6), "response"));
    else if (m.state === "lost" && m.consumer && m.endedAt !== null) out.push(token(F, along(TO_C[m.consumer], 0.97), "fail", 1 - clamp01((t - m.endedAt - 1.4) / 0.8)));
    else if (m.state === "rejected" && m.endedAt !== null) out.push(token(F, along(TO_Q, 0.95), "fail", 1 - clamp01((t - m.endedAt - 1.2) / 0.8)));
  }

  out.push(crowd(F, -4.2, 5.6, 2.8, 3.6, 9, "producer", v) /* pelanggan / pengguna aplikasi */);
  out.push(block(F, PROD[0], PROD[1], { tone: "blue", label: A ? "Kasir" : "Producer", icon: A ? "person" : "card", part: "producer", w: 2.4, d: 2.4, h: 1.6 }, v));
  out.push(block(F, BROKER[0], BROKER[1], { tone: "violet", label: A ? "Kepala" : "Broker", sub: A ? "dapur" : undefined, icon: A ? "person" : "inbox", part: "broker" }, v));
  for (const id of CONSUMERS) {
    const c = sim.consumers[id];
    if (id === "C2" && scene < 4 && !c.attached) continue;
    out.push(block(F, CX[id], CY, { tone: "green", label: A ? `Juru masak ${id.slice(1)}` : `Consumer ${id}`, icon: A ? "pan" : "gear", part: id === "C1" ? "consumer1" : "consumer2", down: !c.up, faded: !c.attached }, v));
  }

  // pills
  const depth = sim.queue.length;
  const [qx, qy] = F.p(Q.x + Q.w / 2, Q.y, 0);
  out.push(pill(qx, qy - 14, `${depth} / ${sim.params.capacity} ${A ? "kertas" : ""} menunggu`.replace("  ", " "), { tone: depth >= sim.params.capacity ? "bad" : depth >= 4 ? "warn" : "plain", part: "queue" }, v));
  const [ux, uy] = F.p(BROKER[0] + 1.2, BROKER[1] + 1.2, 2.9);
  if (scene >= 3) out.push(pill(ux, uy - 6, A ? `belum dicoret: ${sim.unacked.length}` : `belum di-ack: ${sim.unacked.length}`, { tone: sim.unacked.some((r) => sim.consumers[r.consumer].current !== r.id) ? "warn" : "plain", small: true, part: "unacked" }, v));
  for (const id of CONSUMERS) {
    const c = sim.consumers[id];
    if (id === "C2" && scene < 4 && !c.attached) continue;
    const holding = c.current === null ? null : sim.messages.find((m) => m.id === c.current);
    const [x, y] = F.p(CX[id] + 1.2, CY + 1.2, 2.9);
    const text = !c.attached ? (A ? "belum bertugas" : "tidak terhubung") : !c.up ? (A ? "BERHENTI" : "MATI") : holding ? (holding.state === "processing" && holding.doneAt !== null ? `${A ? "memasak" : "memproses"} #${holding.seq} · ${Math.round(clamp01(1 - (holding.doneAt - t) / process) * 100)}%` : `${A ? "menerima" : "menerima"} #${holding.seq}`) : "siap";
    out.push(pill(x, y - 6, text, { tone: !c.up ? "bad" : !c.attached ? "plain" : holding ? "info" : "ok", small: true, part: id === "C1" ? "consumer1" : "consumer2" }, v));
  }
  const [px, py] = F.p(-2.8, 9.4, 0);
  out.push(pill(px, py + 22, `1 ${A ? "pesanan" : "pesan"} / ${String(sim.params.produceInterval).replace(".", ",")} dtk`, { small: true, part: "producer" }, v));
  if (sim.redelivered) {
    const [rx, ry] = F.p(Q.x + Q.w, Q.y + Q.d, 0);
    out.push(pill(rx + 10, ry + 20, `dikirim ulang: ${sim.redelivered}`, { tone: "warn", small: true, part: "unacked" }, v));
  }
  return out.join("");
}

const SPEC: SystemSpec<MqSim> = {
  frame: F,
  floor: floor(F, [-5, -3, 26, 12]),
  render,
  analogyLabel: "Analogi sehari-hari: kasir menjepit kertas pesanan di rel; kepala dapur memberikan pesanan dari ujung rel ke juru masak 1 atau 2 dan memegang salinannya sampai pesanan dicoret.",
  label: "Sistem sebenarnya: producer menitipkan pesan ke antrean; broker menyerahkan pesan dari kepala antrean ke consumer C1 atau C2 dan menyimpan salinan sampai menerima ack.",
};

export default function MqSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
