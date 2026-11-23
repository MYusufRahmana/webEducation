import type { FigureStageProps } from "../types";
import { ADDRESSES, type CacheEntry, type DnsSim, type Phase } from "./model";
import { along, block, laptop, edge, floor, makeFrame, pill, token, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/** "Sistem sebenarnya" for DNS: device, resolver and the three tiers, driven by the same lookup model. */

type Tier = "root" | "tld" | "auth";
const DEV: [number, number] = [0, 8.4];
const RES: [number, number] = [4.6, 4.2];
const TY = -1.4;
const TX: Record<Tier, number> = { root: 9.6, tld: 15.2, auth: 20.8 };
const F = makeFrame([[-2.6, 11.4, 0], [0, 8.4, 3.4], [TX.root, TY, 3.6], [TX.auth + 2.4, TY, 3.4], [TX.auth + 2.4, TY + 2.4, 0], [TX.auth + 5, TY + 4, 0], [2.4, 12.4, 0]], 21);

const DEV_RES: Vec3[] = [[DEV[0] + 2.4, 9.6, 0.3], [5.8, 9.6, 0.3], [5.8, RES[1] + 2.4, 0.3]];
const TO: Record<Tier, Vec3[]> = Object.fromEntries(
  (["root", "tld", "auth"] as Tier[]).map((id) => [id, [[RES[0] + 2.4, 5.4, 0.3], [TX[id] + 1.2, 5.4, 0.3], [TX[id] + 1.2, TY + 2.4, 0.3]]]),
) as Record<Tier, Vec3[]>;
const LEG: Partial<Record<Phase, { tier: Tier; back: boolean }>> = {
  "to-root": { tier: "root", back: false },
  "from-root": { tier: "root", back: true },
  "to-tld": { tier: "tld", back: false },
  "from-tld": { tier: "tld", back: true },
  "to-auth": { tier: "auth", back: false },
  "from-auth": { tier: "auth", back: true },
};
const ttl = (entry: CacheEntry | null, t: number) => (entry ? `${ADDRESSES[entry.version]} · sisa ${Math.max(0, entry.expiresAt - t).toFixed(1).replace(".", ",")} dtk` : "kosong");

function render(sim: DnsSim, v: Visual) {
  const t = sim.t;
  const A = v.analogy;
  const scene = v.step ?? 99;
  const available: Record<Tier, boolean> = { root: scene >= 2, tld: scene >= 3, auth: scene >= 4 };
  const out: string[] = [];
  if (scene >= 1) out.push(edge(F, DEV_RES, { part: "track", arrow: true }, v));
  for (const id of ["root", "tld", "auth"] as Tier[]) if (available[id]) out.push(edge(F, TO[id], { part: "ramps", arrow: true }, v));

  const labels: string[] = [];
  for (const q of sim.queries) {
    const s = q.phaseEnd > q.phaseAt ? Math.min(1, (t - q.phaseAt) / (q.phaseEnd - q.phaseAt)) : 1;
    const k = v.reduced ? 1 : s;
    const answer = q.version === 1 ? "answer" : "old";
    let at: Vec3 | null = null;
    let kind: "request" | "referral" | "answer" | "old" = "request";
    let text = A ? "di mana contoh.id?" : "contoh.id?";
    if (q.phase === "local-check") at = [DEV[0] + 1.2, DEV[1] + 1.2, 2];
    else if (q.phase === "to-resolver") at = along(DEV_RES, k);
    else if (q.phase === "resolver-check") at = [RES[0] + 1.2, RES[1] + 1.2, 2];
    else if (q.phase === "to-client") {
      at = along(DEV_RES, 1 - k);
      kind = answer;
      text = ADDRESSES[q.version ?? 0];
    } else if (q.phase === "done") {
      if (t - (q.doneAt ?? t) < 1.6) {
        at = [DEV[0] + 1.2, DEV[1] + 1.2, 2];
        kind = answer;
        text = `${ADDRESSES[q.version ?? 0]} ✓`;
      }
    } else {
      const leg = LEG[q.phase];
      if (leg && available[leg.tier]) {
        at = along(TO[leg.tier], leg.back ? 1 - k : k);
        if (leg.back) {
          kind = leg.tier === "auth" ? answer : "referral";
          text = leg.tier === "root" ? (A ? "→ tanya meja .id" : "→ tanya .id") : leg.tier === "tld" ? (A ? "→ tanya pengelola" : "→ tanya contoh.id") : ADDRESSES[q.version ?? 0];
        }
      }
    }
    if (!at) continue;
    out.push(token(F, at, kind));
    const [x, y] = F.p(at[0], at[1], at[2] + 0.2);
    labels.push(pill(x, y - 20, text, { tone: kind === "referral" ? "info" : kind === "request" ? "plain" : kind === "old" ? "warn" : "ok", small: true }));
  }

  if (available.root) out.push(block(F, TX.root, TY, { tone: "orange", label: A ? "Pusat" : "Root", sub: A ? "informasi" : "server", icon: "globe", part: "root", w: 2.4, d: 2.4, h: 1.7 }, v));
  if (available.tld) out.push(block(F, TX.tld, TY, { tone: "yellow", label: A ? "Direktori" : "TLD .id", sub: A ? "wilayah .id" : "server", icon: "search", part: "tld" }, v));
  if (available.auth) out.push(block(F, TX.auth, TY, { tone: "green", label: A ? "Pengelola" : "contoh.id", sub: A ? "toko" : "authoritative", icon: A ? "booth" : "doc", part: "auth" }, v));
  if (scene >= 1) out.push(block(F, RES[0], RES[1], { tone: "violet", label: A ? "Petugas" : "Resolver", sub: A ? "informasi" : undefined, icon: A ? "person" : "search", part: "resolver" }, v));
  out.push(laptop(F, DEV[0], DEV[1], "client", v));
  const deviceName = F.p(DEV[0]+1.2, DEV[1]+3.2);
  out.push(pill(deviceName[0], deviceName[1]+14, A ? "Kamu mencari alamat toko" : "Browser / pengguna", {part:"client"}, v));

  // what each place knows
  const [dx, dy] = F.p(DEV[0] + 1.2, DEV[1] + 1.2, 2.9);
  out.push(pill(dx, dy - 8, `${A ? "catatanmu" : "catatan perangkat"}: ${ttl(sim.local, t)}`, { tone: sim.local ? (sim.local.version !== sim.zone ? "warn" : "ok") : "plain", small: true, part: "localCache" }, v));
  const [rx, ry] = F.p(RES[0] + 1.2, RES[1] + 1.2, 2.9);
  if (scene >= 1) out.push(pill(rx, ry - 8, `${A ? "catatan petugas" : "cache resolver"}: ${ttl(sim.resolver, t)}`, { tone: sim.resolver ? (sim.resolver.version !== sim.zone ? "warn" : "ok") : "plain", small: true, part: "resolverCache" }, v));
  const [ax, ay] = F.p(TX.auth + 1.2, TY + 1.2, 2.9);
  if (available.auth) out.push(pill(ax, ay - 8, `${A ? "alamat resmi" : "catatan resmi"}: ${ADDRESSES[sim.zone]}`, { tone: "ok", small: true, part: "auth" }, v));
  return out.join("") + labels.join("");
}

const SPEC: SystemSpec<DnsSim> = {
  frame: F,
  floor: floor(F, [-3, -3, 25, 13]),
  render,
  analogyLabel: "Analogi sehari-hari: kamu bertanya alamat toko ke petugas informasi; petugas bertanya ke pusat informasi, direktori wilayah .id, lalu pengelola toko, dan setiap jawaban kembali ke petugas.",
  label: "Sistem sebenarnya: perangkat bertanya ke resolver; resolver bertanya ke root, TLD .id, lalu server authoritative contoh.id, dan setiap jawaban kembali ke resolver.",
};

export default function DnsSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
