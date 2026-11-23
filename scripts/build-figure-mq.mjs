/**
 * Builds the message queue figure with the anatomy kit.
 *
 *   node scripts/build-figure-mq.mjs           writes src/topics/message-queue/art.generated.json and shots/mq-figure*.html
 *   node scripts/build-figure-mq.mjs --audit   also runs the kit's geometry audit
 *
 * The object: a message-queue machine on a test bench.
 *   producer (a card press with a magazine and a rate knob) → inlet chute → queue (a roller rack with
 *   twelve marked slots, head at the right) → broker cabinet (holds delivered cards as "unacknowledged"
 *   in two bays on its roof, each with a timer dial) → gates and lanes → consumers C1 and C2 (an anvil
 *   where the card is worked on, a progress dial, power and ack lamps) → ack cables back to the broker.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/builder.mjs";
import * as k from "../src/figure/kit/iso-kit.mjs";
import * as G from "../src/figure/kit/lathe.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 640;
const H = 420;

/* ------------------------------------------------------------------ layout (world units, z up) */
const PLATE = { x: -192, y: -76, w: 348, d: 144, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const TRACK = 2.6;
const RACK_Z = 10;
const TILE = { w: 8, d: 10, h: 3 };

const PROD = { x: -180, y: -22, w: 42, d: 44, r: 2.5 };
const PROD_TOP = 32;
const MAG = [-161, 0];

const RACK = { x: -114, y: -8, w: 134, d: 16, r: 0.8 };
const SLOT = 11;
const SLOTS = 12;
const HEAD_X = 14;
const BRIDGE = { x: 20, y: -7, w: 22, d: 14, r: 0.5 };

const BROKER = { x: 42, y: -46, w: 36, d: 92, r: 2.5 };
const BROKER_TOP = 24;
const SHELF_Z = BROKER_TOP + 1.5;
const BAY = { C1: [56, -20], C2: [56, 20] };
const TIMER = { C1: [69, -20], C2: [69, 20] };

const CONSUMER = {
  C1: { body: { x: 106, y: -64, w: 30, d: 24, r: 2 }, lane: -31 },
  C2: { body: { x: 106, y: 6, w: 30, d: 24, r: 2 }, lane: 38 },
};
const C_TOP = 28;
const ANVIL_X = 110;
const ANVIL_W = 18;
const PORT_HALF = 5;
const PORT_TOP = 10;
const GATE_TRAVEL = 8;
const ACK_Y = { C1: -44, C2: 12 };
const ACK_Z = 15;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [MAG[0], MAG[1], 53], [BROKER.x, BROKER.y, BROKER_TOP + 4], [BROKER.x + BROKER.w, BROKER.y + BROKER.d, BROKER_TOP + 4]],
  W,
  H,
  { pad: 14, azimuth: 38, elevation: 30 },
);
const B = createBuilder(P);
const { R, A, at, S, L, D, put, slab, prism, cyl, disc, cable, slotOnX, slotOnY, rectOnX, rectOnY, r2 } = B;
const V = G.viewOf(P);

const BASE_SVG = B.basePlate(PLATE, PLATE_H, FOOT_H);

/* ------------------------------------------------------------------ base details */
{
  const strip = { x: -172, y: PLATE.y + PLATE.d - 13, w: 200, d: 6, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  slab("base", strip, 0, 0.6, { tone: "lo", crease: "none" }, { steps: 3, bevel: 0, extra: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }), name: "base.ruler" });
  const lp = { x: -88, y: 28, w: 36, d: 16, r: 1.5 };
  const z = 0.9;
  const rules = [k.lineOnTop([lp.x + 5, lp.y + 4.5], [lp.x + 28, lp.y + 4.5], z, P), k.lineOnTop([lp.x + 5, lp.y + 8], [lp.x + 23, lp.y + 8], z, P), k.lineOnTop([lp.x + 5, lp.y + 11.5], [lp.x + 16, lp.y + 11.5], z, P)].join("");
  slab("base", lp, 0, z, { tone: "lo" }, { steps: 3, bevel: 0.3, name: "base.label", extra: L(k.planOutline(k.insetPlan(lp, 1.6), z, P, 4), { tone: "faint" }) + L(rules, { tone: "lo", free: true }) + D([at([lp.x + 32, lp.y + 4, z]), at([lp.x + 32, lp.y + 12, z])], { size: 0.45 }) });
}

/* ------------------------------------------------------------------ producer: a card press with a magazine */
{
  const plinth = k.insetPlan(PROD, -2);
  slab("producer", plinth, 0, 3, { tone: "lo" }, { bevel: 0.4, name: "producer.plinth", extra: D(k.corners(plinth, 3).map(([x, y]) => at([x, y, 3])), { size: 0.45 }) });
  const front = PROD.y + PROD.d;
  const right = PROD.x + PROD.w;
  const port = rectOnX(right, -6, 6, RACK_Z, RACK_Z + 4.4);
  const vents = [8, 11.5, 15].map((z) => slotOnY(front, PROD.x + 6, PROD.x + 22, z, 1.8)).join("");
  slab("producer", PROD, 3, PROD_TOP - 3, { tone: "mid" }, {
    bevel: 0.8,
    name: "producer.body",
    contain: true,
    inner: L(k.sideSeam(PROD, 27.5, P, 4), { tone: "faint" }),
    extra: `<path class="lb-void" d="${port}"/>` + L(port + vents, { tone: "lo" }) + L(k.planOutline({ x: PROD.x + 28, y: PROD.y + 6, w: 10, d: 32, r: 1.5 }, PROD_TOP, P, 3), { tone: "faint" }),
  });
  // magazine: a stack of blank cards between four posts
  const stack = { x: MAG[0] - TILE.w / 2 - 1, y: MAG[1] - TILE.d / 2 - 1, w: TILE.w + 2, d: TILE.d + 2, r: 0.6 };
  slab("producer", k.insetPlan(stack, -2), PROD_TOP, 1.5, { tone: "mid" }, { steps: 3, bevel: 0.4, name: "producer.magbase" });
  const lines = [];
  for (let z = PROD_TOP + 1.5 + TILE.h; z < PROD_TOP + 16; z += TILE.h) lines.push(k.sideSeam(k.insetPlan(stack, 1), z, P, 2));
  slab("producer", k.insetPlan(stack, 1), PROD_TOP + 1.5, 15, { tone: "hi", crease: "lo" }, { steps: 2, bevel: 0, name: "producer.stack", inner: L(lines.join(""), { tone: "lo" }) });
  for (const [x, y] of k.corners(k.insetPlan(stack, -0.6), 0)) cyl("producer", x, y, 1.1, PROD_TOP + 1.5, 18, { tone: "mid", crease: "none" }, { steps: 14, name: R.nameFor("producer.post") });
  slab("producer", k.insetPlan(stack, -2), PROD_TOP + 19.5, 1.6, { tone: "mid" }, { steps: 3, bevel: 0.4, name: "producer.cap", extra: D(k.corners(k.insetPlan(stack, -0.6), 0).map(([x, y]) => at([x, y, PROD_TOP + 21.1])), { size: 0.5 }) });
  // send lamp and rate knob on the front face
  disc("producer", [PROD.x + 32, front, 24], [0, 1, 0], 0, 1.1, 2.2, { tone: "mid" }, { name: "producer.lamp", wrap: `<g data-live="send">$</g>` });
  const knob = [PROD.x + 32, front, 13];
  const F = G.frameAlong(knob, [0, 1, 0]);
  disc("producer", knob, [0, 1, 0], 0, 1.2, 6.4, { tone: "lo" }, { name: "producer.knobbase" });
  const ribs = G.ribsOf(G.frameAlong(G.add3(knob, [0, 1.2, 0]), [0, 1, 0]), 0, 3, 5.1, 28, P, { fade: [0.1, 0.55], seams: true });
  const pointers = ["slow", "normal", "fast"].map((key, i) => {
    const angle = (-0.7 + i * 0.7) * Math.PI;
    const c = G.add3(knob, [0, 4.2, 0]);
    const d = k.pathOf([at(c), at(G.add3(c, [Math.sin(angle) * 4.1, 0, Math.cos(angle) * 4.1]))]);
    return `<g data-live="knob" data-rate="${key}"${key === "normal" ? "" : ' style="display:none"'}>${L(d, { tone: "hi", free: "end" })}${D([at(c)], { size: 0.6, tone: "hi" })}</g>`;
  });
  const scale = [-0.7, 0, 0.7].map((t) => at(G.add3(knob, [Math.sin(t * Math.PI) * 7.6, 0, Math.cos(t * Math.PI) * 7.6])));
  const shape = R.solid(A.disc(F, 1.2, 4.2, 5.1, { name: "producer.knob" }));
  put("producer", G.add3(knob, [0, 2.7, 0]), D(scale, { size: 0.55, tone: "mid" }) + S(G.disc(1.2, 4.2, 5.1, F, P), { tone: "mid" }) + k.fadedSvg(ribs, { tone: "lo" }) + pointers.join(""), [shape], { name: "producer.knob" });
}

/* ------------------------------------------------------------------ inlet chute and queue rack */
{
  const chute = { x: PROD.x + PROD.w, y: -7, w: RACK.x - PROD.x - PROD.w, d: 14, r: 0.5 };
  slab("conveyor", chute, RACK_Z - 3, 3, { tone: "mid" }, { steps: 2, bevel: 0.4, name: "conveyor.floor" });
  for (const y of [-7, 5.6]) slab("conveyor", { x: chute.x, y, w: chute.w, d: 1.4, r: 0.3 }, RACK_Z, 2.5, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor("conveyor.wall") });
  cyl("conveyor", chute.x + chute.w / 2, 0, 2.4, 0, RACK_Z - 3, { tone: "mid", crease: "none" }, { steps: 18, name: "conveyor.leg", inner: L(k.sideArc(chute.x + chute.w / 2, 0, 2.4, 3, P, 12), { tone: "faint" }) });

  // rollers run wall to wall across the floor of the rack
  const rollers = [];
  for (let x = RACK.x + 2.75; x < RACK.x + RACK.w - 1; x += 5.5) rollers.push(k.lineOnTop([x, RACK.y + 1.5], [x, RACK.y + RACK.d - 1.5], RACK_Z, P));
  slab("queue", RACK, RACK_Z - 3, 3, { tone: "mid" }, { steps: 2, bevel: 0.4, name: "queue.floor", extra: L(rollers.join(""), { tone: "lo" }) });
  const ticks = k.sideTicks(RACK.x + 1.5, HEAD_X + SLOT / 2, SLOT / 2, 2, RACK.y + RACK.d, RACK_Z + 3.5, [1.1, 2.2], P, "x");
  slab("queue", { x: RACK.x, y: RACK.y, w: RACK.w, d: 1.5, r: 0.3 }, RACK_Z, 3.5, { tone: "mid" }, { steps: 2, bevel: 0.3, name: "queue.wallBack" });
  slab("queue", { x: RACK.x, y: RACK.y + RACK.d - 1.5, w: RACK.w, d: 1.5, r: 0.3 }, RACK_Z, 3.5, { tone: "mid" }, { steps: 2, bevel: 0.3, name: "queue.wallFront", extra: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) });
  for (const x of [-92, -42, 3]) cyl("queue", x, 0, 2.6, 0, RACK_Z - 3, { tone: "mid", crease: "none" }, { steps: 18, name: R.nameFor("queue.leg"), inner: L(k.sideArc(x, 0, 2.6, 3, P, 12), { tone: "faint" }) });
}

/* ------------------------------------------------------------------ transfer bridge: queue head → broker */
{
  slab("broker", BRIDGE, RACK_Z - 3, 3, { tone: "mid" }, { steps: 2, bevel: 0.4, name: "broker.bridge" });
  for (const y of [-7, 5.6]) slab("broker", { x: BRIDGE.x, y, w: BRIDGE.w, d: 1.4, r: 0.3 }, RACK_Z, 2.5, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor("broker.bridgeWall") });
  cyl("broker", BRIDGE.x + BRIDGE.w / 2, 0, 2.4, 0, RACK_Z - 3, { tone: "mid", crease: "none" }, { steps: 18, name: "broker.bridgeLeg", inner: L(k.sideArc(BRIDGE.x + BRIDGE.w / 2, 0, 2.4, 3, P, 12), { tone: "faint" }) });
}

/* ------------------------------------------------------------------ broker cabinet */
{
  const right = BROKER.x + BROKER.w;
  const front = BROKER.y + BROKER.d;
  const voids = ["C1", "C2"].map((id) => rectOnX(right, CONSUMER[id].lane - PORT_HALF, CONSUMER[id].lane + PORT_HALF, TRACK, PORT_TOP)).join("");
  const vents = [7, 10.5, 14].map((z) => slotOnY(front, BROKER.x + 5, BROKER.x + 17, z, 1.8)).join("");
  const door = rectOnY(front, BROKER.x + 20, BROKER.x + 33, 3.5, 19);
  slab("broker", BROKER, 0, BROKER_TOP, { tone: "mid" }, {
    bevel: 0.8,
    name: "broker.body",
    contain: true,
    inner: L(k.sideSeam(BROKER, 20.5, P, 4), { tone: "faint" }),
    extra: `<path class="lb-void" d="${voids}"/>` + L(voids + vents, { tone: "lo" }) + L(door, { tone: "faint" }) + D([[BROKER.x + 21.2, front, 6], [BROKER.x + 21.2, front, 16.5]].map((p) => at(p)), { size: 0.55, tone: "mid" }) + D([[right - 3, BROKER.y + 3], [right - 3, front - 3], [BROKER.x + 3, front - 3]].map(([x, y]) => at([x, y, BROKER_TOP])), { size: 0.45 }),
  });
  slab("broker", { x: BROKER.x + 29.5, y: front, w: 1.6, d: 1.6, r: 0.5 }, 8, 6, { tone: "hi", crease: "lo" }, { steps: 2, bevel: 0, name: "broker.handle" });
  // the unacknowledged shelf on the roof: one bay and one timer dial per consumer
  const shelf = { x: BROKER.x + 4, y: -32, w: BROKER.w - 8, d: 64, r: 1.5 };
  const bays = ["C1", "C2"].map((id) => k.planOutline({ x: BAY[id][0] - 6, y: BAY[id][1] - 7, w: 12, d: 14, r: 1 }, SHELF_Z, P, 3)).join("");
  slab("unacked", shelf, BROKER_TOP, SHELF_Z - BROKER_TOP, { tone: "mid" }, { steps: 3, bevel: 0.4, name: "unacked.shelf", extra: L(bays, { tone: "lo" }) });
  for (const id of ["C1", "C2"]) {
    const [x, y] = TIMER[id];
    const t = k.radialTicks(x, y, 4.6, 20, 5, SHELF_Z + 2, [0.9, 1.7], P);
    cyl("unacked", x, y, 5.4, SHELF_Z, 2, { tone: "hi", crease: "lo" }, { steps: 40, bevel: 0.5, name: `unacked.timer${id}`, extra: L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + `<path class="iso-line" data-tone="lit" data-live="timer" data-consumer="${id}" data-free="end" d="" style="stroke-width:1"/>` + D([at([x, y, SHELF_Z + 2])], { size: 0.6, tone: "hi" }) });
  }
  // gates on the two outlets: down = this consumer is not attached to the queue
  for (const id of ["C1", "C2"]) {
    const y = CONSUMER[id].lane;
    const gate = { x: right, y: y - PORT_HALF - 0.6, w: 1.4, d: PORT_HALF * 2 + 1.2, r: 0.3 };
    const sh = R.solid(A.slab(gate, TRACK, PORT_TOP - TRACK, { name: `lanes.gate${id}` }, 2));
    put("lanes", [right + 0.7, y, 6], `<g data-live="gate" data-consumer="${id}">${S(k.slabOf(gate, TRACK, PORT_TOP - TRACK, P, 2, 0.3), { tone: "hi", crease: "lo" })}</g>`, [sh], { name: `lanes.gate${id}` });
    slab("lanes", { x: right, y: y - PORT_HALF - 1.5, w: 3.4, d: PORT_HALF * 2 + 3, r: 0.6 }, PORT_TOP, GATE_TRAVEL + 1.4, { tone: "mid" }, { steps: 3, bevel: 0.4, name: `lanes.housing${id}`, extra: D([at([right + 3.4, y - PORT_HALF, PORT_TOP + GATE_TRAVEL]), at([right + 3.4, y + PORT_HALF, PORT_TOP + GATE_TRAVEL])], { size: 0.45 }) });
  }
  for (const id of ["C1", "C2"]) disc("ackLines", [right, ACK_Y[id], ACK_Z], [1, 0, 0], 0, 1.8, 1.9, { tone: "mid" }, { name: `ackLines.brokerPort${id}` });
}

/* ------------------------------------------------------------------ lanes and consumers */
const ANVIL = {};
for (const id of ["C1", "C2"]) {
  const { body, lane } = CONSUMER[id];
  const part = id === "C1" ? "consumer1" : "consumer2";
  const right = BROKER.x + BROKER.w;
  // lane: strip and two rails from the outlet to the anvil
  const strip = { x: right + 3.4, y: lane - 6, w: ANVIL_X - right - 3.4, d: 12, r: 0.6 };
  slab("lanes", strip, 0, 1, { tone: "lo" }, { steps: 2, bevel: 0, name: `lanes.strip${id}` });
  for (const dy of [-4.6, 3]) slab("lanes", { x: strip.x, y: lane + dy, w: strip.w, d: 1.6, r: 0.4 }, 1, TRACK - 1, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor(`lanes.rail${id}`) });

  const sled = { x: body.x - 1.5, y: body.y - 1.5, w: body.w + 3, d: body.d + 1.5, r: 1.5 };
  slab(part, sled, 0, TRACK, { tone: "lo" }, { steps: 3, bevel: 0.4, name: `${part}.sled` });
  const front = body.y + body.d;
  const bodyRight = body.x + body.w;
  const dial = [body.x + 17, body.y + 11];
  const vents = [8, 11.5, 15].map((z) => slotOnX(bodyRight, body.y + 4, body.y + 14, z, 1.8)).join("");
  const mouth = rectOnY(front, ANVIL_X + 3, ANVIL_X + ANVIL_W - 3, TRACK, TRACK + 4.6);
  slab(part, body, TRACK, C_TOP - TRACK, { tone: "mid" }, {
    bevel: 0.8,
    name: `${part}.body`,
    contain: true,
    inner: L(k.sideSeam(body, 24, P, 4), { tone: "faint" }),
    extra: `<path class="lb-void" d="${mouth}"/>` + L(mouth + vents, { tone: "lo" }) + D([[body.x + 3, body.y + 3], [bodyRight - 3, front - 3]].map(([x, y]) => at([x, y, C_TOP])), { size: 0.45 }),
  });
  // anvil in front of the body, where the card is worked on
  const anvil = { x: ANVIL_X, y: front, w: ANVIL_W, d: 14, r: 1 };
  slab(part, anvil, 0, TRACK, { tone: "hi", crease: "lo" }, { steps: 3, bevel: 0.4, name: `${part}.anvil`, extra: L(k.planOutline(k.insetPlan(anvil, 2), TRACK, P, 3), { tone: "faint" }) });
  ANVIL[id] = [ANVIL_X + ANVIL_W / 2, lane, TRACK];
  // progress dial on the roof
  const t = k.radialTicks(dial[0], dial[1], 6.6, 30, 5, C_TOP + 2.4, [1, 2], P);
  cyl(part, dial[0], dial[1], 7.4, C_TOP, 2.4, { tone: "hi", crease: "lo" }, { steps: 48, bevel: 0.6, name: `${part}.dial`, extra: L(k.ring(dial[0], dial[1], 7.4 - 1.2, C_TOP + 2.4, P, 48), { tone: "faint" }) + L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + `<path class="iso-line" data-tone="lit" data-live="progress" data-consumer="${id}" data-free="end" d="" style="stroke-width:1.1"/>` + D([at([dial[0], dial[1], C_TOP + 2.4])], { size: 0.6, tone: "hi" }) });
  // power lamp on the side, ack lamp on the roof
  disc(part, [bodyRight, body.y + 19, 20], [1, 0, 0], 0, 1.1, 2.3, { tone: "mid" }, { name: `${part}.power`, wrap: `<g data-live="power" data-consumer="${id}" data-on="">$</g>` });
  cyl(part, body.x + 5, front - 5, 2, C_TOP, 1.2, { tone: "mid" }, { steps: 18, name: `${part}.acklamp`, wrap: `<g data-live="ack" data-consumer="${id}">$</g>` });
  disc("ackLines", [body.x, ACK_Y[id], ACK_Z], [-1, 0, 0], 0, 1.8, 1.9, { tone: "mid" }, { name: `ackLines.consumerPort${id}` });
}

const ACK_ROUTES = {};
for (const id of ["C1", "C2"]) {
  const from = [CONSUMER[id].body.x - 1.8, ACK_Y[id], ACK_Z];
  const to = [BROKER.x + BROKER.w + 1.8, ACK_Y[id], ACK_Z];
  ACK_ROUTES[id] = cable("ackLines", `ackLines.cable${id}`, [from, to], 0.9, { tone: "mid" });
}

/* ------------------------------------------------------------------ settle, export */
const { groups, items } = B.finish();

const tileSlab = (cls) => {
  const plan = { x: -TILE.w / 2, y: -TILE.d / 2, w: TILE.w, d: TILE.d, r: 0.6 };
  return S(k.slabOf(plan, 0, TILE.h, P, 2, 0.4), { tone: "hi", crease: "lo", className: cls });
};
const across = (y) => k.lineOnTop([-TILE.w / 2, y], [TILE.w / 2, y], TILE.h, P);
const TILES = {
  up: tileSlab("mq-tile") + L(across(-1.6) + across(1.6), { tone: "lo" }),
  retry: tileSlab("mq-tile mq-retry") + L(across(-1.6) + across(1.6), { tone: "lo" }) + D([at([0, 3.4, TILE.h])], { size: 0.8, tone: "hi" }),
  fail: tileSlab("mq-tile mq-fail") + L(k.lineOnTop([-TILE.w / 2, -TILE.d / 2], [TILE.w / 2, TILE.d / 2], TILE.h, P) + k.lineOnTop([-TILE.w / 2, TILE.d / 2], [TILE.w / 2, -TILE.d / 2], TILE.h, P), { tone: "hi" }),
  ghost: tileSlab("mq-tile mq-ghost") + L(across(0), { tone: "lo" }),
};

const LABEL = {
  id: "Mesin antrean pesan di atas meja uji: pencetak kartu (producer) di kiri mengeluarkan kartu pesan ke rak rol berisi dua belas slot (antrean, kepala di kanan). Lemari broker mengambil kartu dari kepala antrean, menyimpan salinannya di rak belum di-ack di atas lemari dengan dial timer, lalu mengirim kartu lewat gerbang dan lajur ke consumer C1 atau C2. Consumer memproses kartu di landasan, lalu mengirim ack lewat kabel ke broker.",
  en: "A message queue machine on a test bench: a card press (the producer) on the left puts message cards on a roller rack with twelve slots (the queue, head on the right). The broker cabinet takes cards from the head, keeps a copy on its roof shelf of unacknowledged messages with timer dials, and sends each card through a gate and a lane to consumer C1 or C2. A consumer works on the card on its anvil, then sends an ack along a cable to the broker.",
};

const DATA = {
  width: W,
  height: H,
  P,
  V,
  label: LABEL,
  svg: `${BASE_SVG}<g class="lb-items">${groups}</g>`,
  items,
  tile: { ...TILE, z: RACK_Z, ...TILES },
  produce: [[MAG[0], 0, RACK_Z], [PROD.x + PROD.w, 0, RACK_Z], [RACK.x + 2, 0, RACK_Z]],
  slot: { head: HEAD_X, pitch: SLOT, count: SLOTS, z: RACK_Z, entry: RACK.x + 4 },
  deliver: Object.fromEntries(
    ["C1", "C2"].map((id) => {
      const y = CONSUMER[id].lane;
      return [id, [[HEAD_X, 0, RACK_Z], [BRIDGE.x + BRIDGE.w, 0, RACK_Z], [BROKER.x + 8, 0, RACK_Z], [BROKER.x + BROKER.w - 10, y, TRACK], [BROKER.x + BROKER.w, y, TRACK], ANVIL[id]].map((p) => p.map(r2))];
    }),
  ),
  anvil: ANVIL,
  intoBody: Object.fromEntries(["C1", "C2"].map((id) => [id, [ANVIL[id][0], CONSUMER[id].body.y + CONSUMER[id].body.d - 8, TRACK]])),
  bay: Object.fromEntries(["C1", "C2"].map((id) => [id, [BAY[id][0], BAY[id][1], SHELF_Z]])),
  timer: Object.fromEntries(["C1", "C2"].map((id) => [id, [TIMER[id][0], TIMER[id][1], SHELF_Z + 2, 4.2]])),
  progress: Object.fromEntries(["C1", "C2"].map((id) => [id, [CONSUMER[id].body.x + 17, CONSUMER[id].body.y + 11, C_TOP + 2.4, 5.8]])),
  ack: Object.fromEntries(Object.entries(ACK_ROUTES).map(([id, route]) => [id, route.map((p) => p.map(r2))])),
  gateTravel: GATE_TRAVEL,
};

mkdirSync(join(ROOT, "src/topics/message-queue"), { recursive: true });
writeFileSync(join(ROOT, "src/topics/message-queue/art.generated.json"), JSON.stringify(DATA));
console.log(`mq figure: ${R.items.length} items · ${R.solids.length} solids · ${R.tubes.length} tube runs · ${(DATA.svg.length / 1024).toFixed(0)} KB svg`);

// standalone check pages and fallback images (rest pose: needles at zero)
const needle = ([x, y, z, r], turn) => k.lineOnTop([x, y], [x + Math.sin(turn * Math.PI * 2) * r, y - Math.cos(turn * Math.PI * 2) * r], z, P);
let staticSvg = DATA.svg;
for (const id of ["C1", "C2"]) {
  staticSvg = staticSvg.replace(`data-live="timer" data-consumer="${id}" data-free="end" d=""`, `data-live="timer" data-consumer="${id}" data-free="end" d="${needle(DATA.timer[id], 0)}"`);
  staticSvg = staticSvg.replace(`data-live="progress" data-consumer="${id}" data-free="end" d=""`, `data-live="progress" data-consumer="${id}" data-free="end" d="${needle(DATA.progress[id], 0)}"`);
}
const CSS = `.lb-void{fill:var(--anatomy-shade-0)}`;
mkdirSync(join(ROOT, "shots"), { recursive: true });
mkdirSync(join(ROOT, "public"), { recursive: true });
for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: W, height: H, label: LABEL.en, body: `<style>${CSS}</style>` + staticSvg });
  const body = k.plateHtml({ fig: "Fig 2", title: "Message queue", hint: "check page", readout: "rest pose", body: `<div class="iso-stage">${svg}</div>` });
  writeFileSync(join(ROOT, `shots/mq-figure${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "Message queue figure", theme, body, width: 900 }));
  writeFileSync(join(ROOT, `public/mq-figure-${theme}.svg`), k.figureSvg({ width: W, height: H, label: LABEL.en, body: `<style>${CSS}</style>` + staticSvg, standalone: theme }));
}

A.auditOrExit(R, P, {});
