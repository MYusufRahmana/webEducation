/**
 * Builds the load balancer figure with the anatomy kit.
 *
 *   node scripts/build-figure.mjs           writes src/figure/art.generated.json and shots/figure*.html
 *   node scripts/build-figure.mjs --audit   also runs the kit's geometry audit and exits non-zero on problems
 *
 * The object: a request-distributing machine on a test bench.
 *   client (feeder with a token magazine and a rate knob) → feed track → distributor drum (the load balancer:
 *   a turning selector arm and three eligibility pins) → three lanes → servers A, B, C (each with a shutter
 *   that closes when the server is stopped). A separate health-check unit sends probes along three cables to
 *   connectors on the servers, and a status cable carries its verdict to the drum's pins.
 *
 * Static parts are drawn here once. The page moves only tokens, pulses, shutters, pins, lamps and the arm.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../src/figure/kit/iso-kit.mjs";
import * as G from "../src/figure/kit/lathe.mjs";
import * as A from "../src/figure/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../src/figure/kit/tube.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 640;
const H = 440;

/* ------------------------------------------------------------------ layout (world units, z up) */
const PLATE = { x: -138, y: -138, w: 236, d: 276, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const TRACK = 2.6; // top of rails, pedestal and sleds: tokens ride here
const TOKEN_R = 4;
const TOKEN_H = 2.4;

const CLIENT = { x: -24, y: 80, w: 48, d: 36, r: 3 };
const CLIENT_Z = 3;
const CLIENT_TOP = 30;
const MAG = [-10, 94];

const DRUM_R = 22;
const PED_R = 30;
const TOP_Z = 26;
const PLATE_TOP = 28.4;
const PIN_R = 16;

const SERVER_X = { A: -58, B: 0, C: 58 };
const S_FRONT = -78;
const S_BACK = -118;
const S_TOP = 34;
const PORT_W = 12;
const PORT_TOP = 12;
const SHUTTER_TRAVEL = 9.4;

const HC = { x: -128, y: -128, w: 32, d: 30, r: 2 };
const HC_TOP = 62;
const BACK = { x: -96, y: -126, w: 180, d: 6, r: 0.8 };
const BACK_TOP = 58;
const CABLE_Y = -114;
const CABLE_Z = { A: 44, B: 48, C: 52 };
const CABLE_R = 0.9;
const DROP_X = { A: -66, B: -8, C: 50 };
const BOSS_TOP = 37;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [HC.x, HC.y, HC_TOP], [BACK.x + BACK.w, BACK.y, BACK_TOP], [MAG[0], MAG[1], 57]],
  W,
  H,
  { pad: 16, azimuth: 34, elevation: 30 },
);
const V = G.viewOf(P);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);

/* ------------------------------------------------------------------ recorder */
const R = A.recorder(P);
const record = R.solid;
const items = R.items;

function put(part, ref, svg, shapes, { bias = 0, name, contain = false, live, cable } = {}) {
  return R.put({ piece: part, at: ref, bias, svg, shapes, name: name ?? R.nameFor(`${part}.item`), contain, live, cable });
}
function slab(part, plan, z, h, style = {}, { steps = 4, bevel = 0.6, inner = "", extra = "", name, bias, contain, meta = {} } = {}) {
  const id = name ?? R.nameFor(`${part}.slab`);
  const shape = record(A.slab(plan, z, h, { name: id, ...meta }, steps));
  put(part, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra, [shape], { name: id, bias, contain });
  return shape;
}
function prism(part, ring, z, h, style = {}, { inner = "", extra = "", name, bias } = {}) {
  const id = name ?? R.nameFor(`${part}.prism`);
  const shape = record(A.extruded(ring, z, h, { name: id }));
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  put(part, [cx, cy, z + h / 2], S(k.extrude(ring, z, h, P, { convex: true }), { tone: "mid", ...style, inner }) + extra, [shape], { name: id, bias });
  return shape;
}
function cyl(part, cx, cy, r, z, h, style = {}, { steps = 32, bevel = 0, inner = "", extra = "", name, bias, contain, wrap = "" } = {}) {
  const id = name ?? R.nameFor(`${part}.cyl`);
  const shape = record(A.cylinder(cx, cy, r, z, h, { name: id }));
  const body = S(k.cylinder(cx, cy, r, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra;
  put(part, [cx, cy, z + h / 2], wrap ? wrap.replace("$", body) : body, [shape], { name: id, bias, contain });
  return shape;
}
function disc(part, centre, axis, s0, s1, r, style = {}, { extra = "", name, bias, wrap = "" } = {}) {
  const F = G.frameAlong(centre, axis);
  const id = name ?? R.nameFor(`${part}.disc`);
  const shape = record(A.disc(F, s0, s1, r, { name: id }));
  const body = S(G.disc(s0, s1, r, F, P), { tone: "mid", ...style }) + extra;
  put(part, G.add3(centre, G.mul3(axis, (s0 + s1) / 2)), wrap ? wrap.replace("$", body) : body, [shape], { name: id, bias });
  return { F, shape };
}
function cable(part, name, points, r, { bend = 3.2, gaps = [], tone = "mid", maxLength = 18, touch, bundle } = {}) {
  const route = G.fillet(points, bend, 10, { P, tube: r });
  R.route(name, route, r, { piece: part, gaps, limp: true, touch, bundle });
  tubePieces(route, r, P, { maxLength, spacing: 1.4, gaps }).forEach((piece, index) =>
    put(part, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { name: `${name}:${index}`, bias: 0.05, cable: { name, box: boxOf(piece.points, r) } }),
  );
  return route;
}
const boxOf = (points, r) => [0, 1, 2].map((i) => [Math.min(...points.map((p) => p[i])) - r - 0.5, Math.max(...points.map((p) => p[i])) + r + 0.5].map((v) => Math.round(v * 100) / 100));
/** A closed slot (vent) on a vertical face at x = const, spanning y0..y1 at height z. */
function slotOnX(x, y0, y1, z, h) {
  const r = h / 2;
  const ring = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    ring.push([x, y1 - r + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * Math.PI;
    ring.push([x, y0 + r + Math.cos(a) * r, z + Math.sin(a) * r]);
  }
  return k.pathOf(ring.map(at), true);
}
/** The same on a face at y = const, spanning x0..x1. */
function slotOnY(y, x0, x1, z, h) {
  const r = h / 2;
  const ring = [];
  for (let i = 0; i <= 8; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    ring.push([x1 - r + Math.cos(a) * r, y, z + Math.sin(a) * r]);
  }
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI / 2 + (i / 8) * Math.PI;
    ring.push([x0 + r + Math.cos(a) * r, y, z + Math.sin(a) * r]);
  }
  return k.pathOf(ring.map(at), true);
}
const rectOnY = (y, x0, x1, z0, z1) => k.pathOf([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]].map(at), true);
const quadAlong = (a, b, half, ...extra) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const [o0, o1] = extra.length ? extra : [-half, half];
  return [
    [a[0] + nx * o0, a[1] + ny * o0],
    [b[0] + nx * o0, b[1] + ny * o0],
    [b[0] + nx * o1, b[1] + ny * o1],
    [a[0] + nx * o1, a[1] + ny * o1],
  ];
};

/* ------------------------------------------------------------------ base: plate, feet, ruler, label plate */
const base = [];
base.push(`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`);
for (const [x, y] of k.corners(PLATE, 24).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
  base.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
  base.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  record(A.cylinder(x, y, 8, -PLATE_H - FOOT_H, FOOT_H, { name: "stand.foot", ground: true }));
}
const plateSeam = k.sideSeam(PLATE, -3.5, P, 8);
base.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(plateSeam, { tone: "faint" }) }));
record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }));
base.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
const screws = k.corners(PLATE, 11);
base.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
base.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
const BASE_SVG = base.join("");

// ruler strip along the front edge, with ticks rooted on its edge
{
  const strip = { x: -104, y: 124, w: 176, d: 6, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  slab("base", strip, 0, 0.6, { tone: "lo", crease: "none" }, { steps: 3, bevel: 0, extra: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }), name: "base.ruler" });
}
// label plate with three rule lines standing for engraved text
{
  const lp = { x: 44, y: 92, w: 36, d: 18, r: 1.5 };
  const z = 0.9;
  const rules = [
    k.lineOnTop([lp.x + 5, lp.y + 5], [lp.x + 28, lp.y + 5], z, P),
    k.lineOnTop([lp.x + 5, lp.y + 9], [lp.x + 24, lp.y + 9], z, P),
    k.lineOnTop([lp.x + 5, lp.y + 13], [lp.x + 17, lp.y + 13], z, P),
  ].join("");
  const extra = L(k.planOutline(k.insetPlan(lp, 1.6), z, P, 4), { tone: "faint" }) + L(rules, { tone: "lo", free: true }) + D([at([lp.x + 32, lp.y + 4, z]), at([lp.x + 32, lp.y + 14, z])], { size: 0.45 });
  slab("base", lp, 0, z, { tone: "lo" }, { steps: 3, bevel: 0.3, extra, name: "base.label" });
}

/* ------------------------------------------------------------------ client: feeder with a magazine and a rate knob */
{
  const plinth = { x: CLIENT.x - 2, y: CLIENT.y - 2, w: CLIENT.w + 4, d: CLIENT.d + 4, r: 3 };
  slab("client", plinth, 0, CLIENT_Z, { tone: "lo" }, { bevel: 0.4, name: "client.plinth", extra: D(k.corners(plinth, 3.2).map(([x, y]) => at([x, y, CLIENT_Z])), { size: 0.45 }) });
  const front = CLIENT.y + CLIENT.d;
  const right = CLIENT.x + CLIENT.w;
  const vents = [9, 13, 17].map((z) => slotOnX(right, CLIENT.y + 6, CLIENT.y + 22, z, 2)).join("");
  const faceVents = [8, 11].map((z) => slotOnY(front, -20, -4, z, 1.8)).join("");
  slab("client", CLIENT, CLIENT_Z, CLIENT_TOP - CLIENT_Z, { tone: "mid" }, {
    steps: 4,
    bevel: 0.8,
    inner: L(k.sideSeam(CLIENT, 25.5, P, 4), { tone: "faint" }),
    extra: L(vents + faceVents, { tone: "lo" }) + L(k.planOutline({ x: 6, y: 84, w: 14, d: 26, r: 1.5 }, CLIENT_TOP, P, 3), { tone: "faint" }) + D([[8.5, 87], [17.5, 87], [8.5, 107], [17.5, 107]].map(([x, y]) => at([x, y, CLIENT_TOP])), { size: 0.45 }),
    name: "client.body",
    contain: true,
  });
  // magazine of request tokens
  cyl("client", MAG[0], MAG[1], 8, CLIENT_TOP, 2, { tone: "mid" }, { name: "client.collar", bevel: 0.4 });
  const stack = [];
  for (let z = CLIENT_TOP + 4.4; z < 53; z += TOKEN_H) stack.push(k.sideArc(MAG[0], MAG[1], 6.5, z, P, 24));
  cyl("client", MAG[0], MAG[1], 6.5, CLIENT_TOP + 2, 52.5 - CLIENT_TOP, { tone: "hi", crease: "none" }, { name: "client.magazine", inner: L(stack.join(""), { tone: "lo" }) });
  cyl("client", MAG[0], MAG[1], 7.4, 54.5, 2.4, { tone: "mid" }, { name: "client.cap", bevel: 0.5, extra: L(k.ring(MAG[0], MAG[1], 3, 56.9, P, 20), { tone: "lo" }) + D([at([MAG[0], MAG[1], 56.9])], { size: 0.5, tone: "hi" }) });
  // send lamp and rate knob on the front face
  disc("client", [-12, front, 21], [0, 1, 0], 0, 1.2, 2.2, { tone: "mid" }, { name: "client.lamp", wrap: `<g data-live="send">$</g>` });
  const knob = [10, front, 15];
  const F = G.frameAlong(knob, [0, 1, 0]);
  disc("client", knob, [0, 1, 0], 0, 1.2, 6.5, { tone: "lo" }, { name: "client.knobbase" });
  const ribs = G.ribsOf(G.frameAlong(G.add3(knob, [0, 1.2, 0]), [0, 1, 0]), 0, 3, 5.2, 28, P, { fade: [0.1, 0.55], seams: true });
  const pointers = ["slow", "normal", "fast"].map((key, i) => {
    const angle = (-0.7 + i * 0.7) * Math.PI;
    const u = [Math.sin(angle), 0, Math.cos(angle)];
    const c = G.add3(knob, [0, 4.2, 0]);
    const d = k.pathOf([at(c), at(G.add3(c, G.mul3(u, 4.2)))]);
    return `<g data-live="knob" data-rate="${key}"${key === "normal" ? "" : ' style="display:none"'}>${L(d, { tone: "hi", free: "end" })}${D([at(c)], { size: 0.6, tone: "hi" })}</g>`;
  });
  const scale = [-0.7, 0, 0.7].map((t) => {
    const a = t * Math.PI;
    const p = G.add3(knob, [Math.sin(a) * 7.6, 0, Math.cos(a) * 7.6]);
    return at(p);
  });
  const knobBody = D(scale, { size: 0.55, tone: "mid" }) + S(G.disc(1.2, 4.2, 5.2, F, P), { tone: "mid" }) + k.fadedSvg(ribs, { tone: "lo" }) + pointers.join("");
  const kshape = record(A.disc(F, 1.2, 4.2, 5.2, { name: "client.knob" }));
  put("client", G.add3(knob, [0, 2.7, 0]), knobBody, [kshape], { name: "client.knob" });
}

/* ------------------------------------------------------------------ feed track */
const FEED_FROM = CLIENT.y - 2;
{
  const strip = { x: -6, y: PED_R - 0.4, w: 12, d: FEED_FROM - PED_R + 0.4, r: 0.6 };
  slab("feed", strip, 0, 1, { tone: "lo" }, { steps: 2, bevel: 0, name: "feed.strip" });
  for (const x of [-4.6, 3]) slab("feed", { x, y: strip.y, w: 1.6, d: strip.d, r: 0.4 }, 1, TRACK - 1, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor("feed.rail") });
}

/* ------------------------------------------------------------------ distributor drum (the load balancer) */
const dirTo = (id) => {
  const x = SERVER_X[id];
  const y = S_FRONT;
  const l = Math.hypot(x, y);
  return [x / l, y / l];
};
const ANGLE = Object.fromEntries(["A", "B", "C"].map((id) => [id, Math.atan2(dirTo(id)[1], dirTo(id)[0])]));
{
  const bolts = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    return at([Math.cos(a) * 26.5, Math.sin(a) * 26.5, TRACK]);
  });
  cyl("lb", 0, 0, PED_R, 0, TRACK, { tone: "lo" }, { steps: 72, bevel: 0.6, name: "lb.pedestal", extra: D(bolts, { size: 0.5 }) });
  cyl("lb", 0, 0, DRUM_R, TRACK, 12 - TRACK, { tone: "mid", crease: "none" }, { steps: 72, name: "lb.drum.low", contain: true, inner: L(k.sideArc(0, 0, DRUM_R, 7, P, 48), { tone: "faint" }) });
  const ribs = k.knurl(0, 0, 23.2, 12, 15, 72, P, 0.4);
  cyl("lb", 0, 0, 23.2, 12, 3, { tone: "mid" }, { steps: 72, name: "lb.collar", inner: L(ribs, { tone: "lo" }) });
  cyl("lb", 0, 0, DRUM_R, 15, TOP_Z - 15, { tone: "mid", crease: "none" }, { steps: 72, name: "lb.drum.high", contain: true, inner: L(k.sideArc(0, 0, DRUM_R, 22, P, 48), { tone: "faint" }) });
  // top plate: index ring with ticks at the three lane angles, rooted on the ring
  const ticks = ["A", "B", "C"].map((id) => k.lineOnTop([Math.cos(ANGLE[id]) * 20.4, Math.sin(ANGLE[id]) * 20.4], [Math.cos(ANGLE[id]) * 22.6, Math.sin(ANGLE[id]) * 22.6], PLATE_TOP, P)).join("");
  cyl("lb", 0, 0, 23.6, TOP_Z, PLATE_TOP - TOP_Z, { tone: "hi", crease: "lo" }, {
    steps: 72,
    bevel: 0.8,
    name: "lb.top",
    extra: L(k.ring(0, 0, 20.4, PLATE_TOP, P, 64), { tone: "lo" }) + L(ticks, { tone: "mid" }) + D(Array.from({ length: 6 }, (_, i) => at([Math.cos(i + 0.8) * 9.5, Math.sin(i + 0.8) * 9.5, PLATE_TOP])), { size: 0.42, tone: "lo" }),
  });
  // eligibility pins: up = the load balancer counts this server as healthy
  for (const id of ["A", "B", "C"]) {
    const [cx, cy] = [Math.cos(ANGLE[id]) * PIN_R, Math.sin(ANGLE[id]) * PIN_R];
    cyl("pins", cx, cy, 2.8, PLATE_TOP, 1, { tone: "mid" }, { steps: 24, name: `pins.boss${id}`, extra: L(k.ring(cx, cy, 1.6, PLATE_TOP + 1, P, 16), { tone: "lo" }) });
    const up = S(k.cylinder(cx, cy, 1.5, PLATE_TOP + 1, 6, P, 18), { tone: "hi", crease: "none" }) + S(k.cylinder(cx, cy, 2.1, PLATE_TOP + 7, 1.2, P, 20), { tone: "hi", crease: "lo" });
    const down = S(k.cylinder(cx, cy, 1.5, PLATE_TOP + 1, 0.8, P, 18), { tone: "lo", crease: "none" });
    const shape = record(A.cylinder(cx, cy, 2.1, PLATE_TOP + 1, 7.2, { name: `pins.pin${id}` }));
    put("pins", [cx, cy, PLATE_TOP + 4], `<g data-live="pin" data-server="${id}" data-state="up"><g data-show="up">${up}</g><g data-show="down">${down}</g></g>`, [shape], { name: `pins.pin${id}` });
  }
  // selector arm: rebuilt every frame by the page, recorded here by the disc it sweeps
  const armShape = record(A.cylinder(0, 0, 13.6, PLATE_TOP, 2.2, { name: "selector.arm" }));
  const slots = `<g data-live="arm"><g class="iso-solid" data-lit=""><path class="iso-fill"/><path class="iso-shade" data-shade="0"/><path class="iso-shade" data-shade="1"/><path class="iso-shade" data-shade="2"/><path class="iso-shade" data-shade="3"/><path class="iso-top"/><path class="iso-line iso-crease" data-tone="lo"/><path class="iso-line iso-edge" data-tone="hi"/></g></g>`;
  put("selector", [0, 0, PLATE_TOP + 1.1], slots, [armShape], { name: "selector.arm" });
  cyl("selector", 0, 0, 4.6, PLATE_TOP + 2.2, 2.6, { tone: "hi", crease: "lo" }, { steps: 32, bevel: 0.5, name: "selector.hub", extra: L(k.ring(0, 0, 2.2, PLATE_TOP + 4.8, P, 20), { tone: "lo" }) + D([at([0, 0, PLATE_TOP + 4.8])], { size: 0.55, tone: "hi" }) });
  // inlet arch where the feed track enters the drum
  for (const x of [-8, 5.5]) slab("lb", { x, y: 23.4, w: 2.5, d: 5.2, r: 0.5 }, TRACK, 15.2 - TRACK, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor("lb.cheek") });
  slab("lb", { x: -8.6, y: 21.6, w: 17.2, d: 7, r: 0.8 }, 15.2, 2.6, { tone: "mid" }, { steps: 3, bevel: 0.4, name: "lb.arch", extra: D([at([-6.6, 26.6, 17.8]), at([6.6, 26.6, 17.8])], { size: 0.45 }) });
  // terminal block on the pedestal edge, where the status cable lands
  slab("lb", { x: -36.6, y: -5, w: 6.9, d: 10, r: 1 }, 0, 7, { tone: "mid" }, { steps: 3, bevel: 0.4, name: "lb.terminal", extra: D([at([-33, -2.5, 7]), at([-33, 2.5, 7])], { size: 0.5 }) });
}

/* ------------------------------------------------------------------ lanes */
const LANE_FROM = 29.6;
const LANES = {};
for (const id of ["A", "B", "C"]) {
  const [dx, dy] = dirTo(id);
  const a = [dx * LANE_FROM, dy * LANE_FROM];
  const b = [SERVER_X[id] - (dx * 6 * Math.abs(dx)) / Math.abs(dy), S_FRONT + 1.5 + 6 * Math.abs(dx) + 0.1];
  prism("lanes", quadAlong(a, b, 6), 0, 1, { tone: "lo" }, { name: `lanes.strip${id}` });
  prism("lanes", quadAlong(a, b, 0, -4.6, -3), 1, TRACK - 1, { tone: "mid" }, { name: `lanes.railL${id}` });
  prism("lanes", quadAlong(a, b, 0, 3, 4.6), 1, TRACK - 1, { tone: "mid" }, { name: `lanes.railR${id}` });
  LANES[id] = { from: a, to: b };
}

/* ------------------------------------------------------------------ servers */
for (const id of ["A", "B", "C"]) {
  const xs = SERVER_X[id];
  const part = `server${id}`;
  const sled = { x: xs - 18.5, y: S_BACK - 1.5, w: 37, d: S_FRONT + 1.5 - (S_BACK - 1.5), r: 1.5 };
  slab(part, sled, 0, TRACK, { tone: "lo" }, { steps: 3, bevel: 0.4, name: `${part}.sled` });
  const body = { x: xs - 17, y: S_BACK, w: 34, d: S_FRONT - S_BACK, r: 2 };
  const right = xs + 17;
  const sideVents = [8, 11.5, 15, 18.5].map((z) => slotOnX(right, -112, -94, z, 1.8)).join("");
  const topVents = [-88, -84.5, -81].map((y) => k.planOutline({ x: xs - 12, y, w: 24, d: 1.8, r: 0.9 }, S_TOP, P, 3)).join("");
  const voidD = rectOnY(S_FRONT, xs - PORT_W / 2, xs + PORT_W / 2, TRACK, PORT_TOP);
  const frame = rectOnY(S_FRONT, xs - PORT_W / 2 - 1.2, xs + PORT_W / 2 + 1.2, TRACK, PORT_TOP);
  slab(part, body, TRACK, S_TOP - TRACK, { tone: "mid" }, {
    steps: 4,
    bevel: 0.8,
    inner: L(k.sideSeam(body, 30, P, 4), { tone: "faint" }),
    extra: `<path class="lb-void" d="${voidD}"/>` + L(frame, { tone: "lo" }) + L(sideVents + topVents, { tone: "lo" }) + D([[xs - 13, -114], [xs + 13, -114], [xs + 13, -82]].map(([x, y]) => at([x, y, S_TOP])), { size: 0.45 }),
    name: `${part}.body`,
    contain: true,
  });
  // shutter: closes the port when the server is stopped; slides up into its housing when running
  const shutter = { x: xs - PORT_W / 2 - 0.6, y: S_FRONT, w: PORT_W + 1.2, d: 1.4, r: 0.3 };
  const sh = record(A.slab(shutter, TRACK, PORT_TOP - TRACK, { name: `${part}.shutter` }, 2));
  const shSvg = S(k.slabOf(shutter, TRACK, PORT_TOP - TRACK, P, 2, 0.3), { tone: "hi", crease: "lo" }) + L([4.6, 7].map((z) => k.pathOf([at([shutter.x + 1.2, S_FRONT + 1.4, z]), at([shutter.x + shutter.w - 1.2, S_FRONT + 1.4, z])])).join(""), { tone: "lo", free: true });
  put(part, [xs, S_FRONT + 0.7, 7], `<g data-live="shutter" data-server="${id}">${shSvg}</g>`, [sh], { name: `${part}.shutter` });
  const housing = { x: xs - 9, y: S_FRONT, w: 18, d: 3.5, r: 0.6 };
  slab(part, housing, PORT_TOP, 11, { tone: "mid" }, { steps: 3, bevel: 0.4, name: `${part}.housing`, extra: D([at([xs - 7, S_FRONT + 3.5, PORT_TOP + 9]), at([xs + 7, S_FRONT + 3.5, PORT_TOP + 9])], { size: 0.45 }) });
  // power lamp on the side, activity lamp on the front
  disc(part, [right, -86, 27], [1, 0, 0], 0, 1.1, 2.3, { tone: "mid" }, { name: `${part}.power`, wrap: `<g data-live="power" data-server="${id}" data-on="">$</g>` });
  disc(part, [xs + 12, S_FRONT, 28], [0, 1, 0], 0, 1.1, 1.8, { tone: "mid" }, { name: `${part}.activity`, wrap: `<g data-live="act" data-server="${id}">$</g>` });
  // probe connector on the top
  cyl(part, DROP_X[id], CABLE_Y, 2.4, S_TOP, BOSS_TOP - S_TOP, { tone: "mid" }, { steps: 24, bevel: 0.3, name: `${part}.boss` });
}

/* ------------------------------------------------------------------ backplane and health-check unit */
{
  const dots = [];
  for (let x = BACK.x + 8; x < BACK.x + BACK.w - 4; x += 22) dots.push(at([x, BACK.y + BACK.d, BACK_TOP - 3]));
  slab("hc", BACK, 0, BACK_TOP, { tone: "lo" }, { steps: 2, bevel: 0.5, name: "hc.backplane", extra: D(dots, { size: 0.45 }) + L(k.lineOnTop([BACK.x, BACK.y + 3], [BACK.x + BACK.w, BACK.y + 3], BACK_TOP, P), { tone: "faint" }) });
  for (const x of [-90, 77]) slab("hc", { x, y: BACK.y + BACK.d, w: 5, d: 6, r: 0.6 }, 0, 9, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor("hc.bracket"), extra: D([at([x + 2.5, BACK.y + BACK.d + 3, 9])], { size: 0.45 }) });
  // combs that hold the probe cables to the backplane
  for (const x of [-30, 28]) slab("probes", { x, y: BACK.y + BACK.d, w: 2, d: 9.5, r: 0.5 }, 40, 15, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor("probes.comb"), meta: { fitting: true, bundle: "probes" } });

  const front = HC.y + HC.d;
  const faceVents = [10, 13.5, 17, 20.5].map((z) => slotOnY(front, -125, -100, z, 1.8)).join("");
  slab("hc", HC, 0, HC_TOP, { tone: "mid" }, {
    steps: 4,
    bevel: 0.8,
    inner: L(k.sideSeam(HC, 57, P, 4), { tone: "faint" }),
    extra: L(faceVents, { tone: "lo" }) + L(k.planOutline(k.insetPlan(HC, 4), HC_TOP, P, 3), { tone: "faint" }) + D(k.corners(HC, 2.4).map(([x, y]) => at([x, y, HC_TOP])), { size: 0.45 }),
    name: "hc.body",
  });
  // per server: a result lamp (lit = last probe answered) and two streak pips
  ["A", "B", "C"].forEach((id, i) => {
    const x = -121 + i * 9;
    disc("hc", [x, front, 47], [0, 1, 0], 0, 1.1, 2.4, { tone: "mid" }, { name: `hc.lamp${id}`, wrap: `<g data-live="hcl" data-server="${id}" data-on="">$</g>` });
    [-1.9, 1.9].forEach((dx, n) => disc("hc", [x + dx, front, 40.5], [0, 1, 0], 0, 0.8, 1.05, { tone: "mid" }, { name: `hc.pip${id}${n}`, wrap: `<g data-live="pip" data-server="${id}" data-n="${n}">$</g>` }));
  });
  disc("hc", [-112, front, 3.2], [0, 1, 0], 0, 2, 2.2, { tone: "mid" }, { name: "hc.statusport" });
  for (const id of ["A", "B", "C"]) disc("probes", [HC.x + HC.w, CABLE_Y, CABLE_Z[id]], [1, 0, 0], 0, 2.2, 1.9, { tone: "mid" }, { name: `probes.port${id}` });
}

/* ------------------------------------------------------------------ cables */
const PROBE_ROUTES = {};
const COMB_GAP = (x) => [x - 0.05, x + 2.05];
for (const id of ["A", "B", "C"]) {
  const start = [HC.x + HC.w + 2.2, CABLE_Y, CABLE_Z[id]];
  const points = [start, [DROP_X[id], CABLE_Y, CABLE_Z[id]], [DROP_X[id], CABLE_Y, BOSS_TOP]];
  const route = G.fillet(points, 3.2, 10, { P, tube: CABLE_R });
  const gaps = [];
  for (const cx of [-30, 28]) {
    if (DROP_X[id] > cx + 2) {
      const s0 = cx - start[0];
      gaps.push(COMB_GAP(s0));
    }
  }
  cable("probes", `probes.cable${id}`, points, CABLE_R, { gaps, tone: "mid", touch: ["probes.comb*"], bundle: "probes" });
  PROBE_ROUTES[id] = route;
}
const STATUS_POINTS = [[-112, HC.y + HC.d + 2, 3.2], [-112, 0, 3.2], [-36.6, 0, 3.2]];
const STATUS_ROUTE = G.fillet(STATUS_POINTS, 5, 10, { P, tube: 1 });
cable("hc", "hc.status", STATUS_POINTS, 1, { bend: 5, tone: "mid", maxLength: 24 });

/* ------------------------------------------------------------------ settle, order, export */
A.settle(R, P);
items.sort((a, b) => a.key - b.key);

// convex planes for placing live tokens and pulses in the settled order
function planesOf(item) {
  const shapes = item.shapes.filter((shape) => shape.kind !== "tube");
  if (!shapes.length) return null;
  if (shapes.length === 1 && shapes[0].kind === "prism" && shapes[0].F.a[2] === 1) {
    const { poly, s0, s1 } = shapes[0];
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      area += ax * by - bx * ay;
    }
    const planes = [[0, 0, 1, s1], [0, 0, -1, -s0]];
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx, by] = poly[(i + 1) % poly.length];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 1e-6) continue;
      const n = area > 0 ? [(by - ay) / len, -(bx - ax) / len] : [-(by - ay) / len, (bx - ax) / len];
      planes.push([n[0], n[1], 0, n[0] * ax + n[1] * ay]);
    }
    return planes.map((p) => p.map((v) => Math.round(v * 1000) / 1000));
  }
  if (shapes.length === 1 && shapes[0].kind === "body" && shapes[0].F.a[2] === 1) {
    const s = shapes[0];
    const r = Math.max(...s.poly.map(([, rr]) => rr));
    const z0 = Math.min(...s.poly.map(([ss]) => ss));
    const z1 = Math.max(...s.poly.map(([ss]) => ss));
    const [cx, cy] = s.F.o;
    const planes = [[0, 0, 1, z1], [0, 0, -1, -z0]];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const n = [Math.cos(a), Math.sin(a)];
      planes.push([n[0], n[1], 0, n[0] * cx + n[1] * cy + r]);
    }
    return planes.map((p) => p.map((v) => Math.round(v * 1000) / 1000));
  }
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const shape of shapes) {
    const b = A.boundsOf(shape);
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], b.min[i]);
      hi[i] = Math.max(hi[i], b.max[i]);
    }
  }
  return [[1, 0, 0, hi[0]], [-1, 0, 0, -lo[0]], [0, 1, 0, hi[1]], [0, -1, 0, -lo[1]], [0, 0, 1, hi[2]], [0, 0, -1, -lo[2]]].map((p) => p.map((v) => Math.round(v * 1000) / 1000));
}

const groups = items.map((item, index) => `<g class="it" data-i="${index}" data-part="${item.piece}">${item.svg}</g>`).join("");
const LABEL = {
  id: "Mesin pembagi permintaan di atas meja uji: klien di depan kiri mengirim token request lewat rel ke drum distributor (load balancer) dengan lengan pemilih dan tiga pin kelayakan. Tiga lajur membawa token ke server A, B, dan C di belakang. Unit health check di kiri belakang mengirim probe lewat tiga kabel ke tiap server dan meneruskan hasilnya ke pin drum.",
  en: "A request-dividing machine on a test bench: the client at front left sends request tokens along a rail to a distributor drum (the load balancer) with a selector arm and three eligibility pins. Three lanes carry tokens to servers A, B and C at the back. A health-check unit at the back left sends probes along three cables to each server and passes the result to the drum's pins.",
};

const tokenUp = S(k.cylinder(0, 0, TOKEN_R, TRACK, TOKEN_H, P, 28, 0.4), { tone: "hi", crease: "lo" }) + L(k.ring(0, 0, 1.8, TRACK + TOKEN_H, P, 16), { tone: "lo" });
const failMark = L(k.lineOnTop([-1.9, -1.9], [1.9, 1.9], TRACK + TOKEN_H, P) + k.lineOnTop([-1.9, 1.9], [1.9, -1.9], TRACK + TOKEN_H, P), { tone: "hi" });
const tokenFail = S(k.cylinder(0, 0, TOKEN_R, TRACK, TOKEN_H, P, 28, 0.4), { tone: "hi", crease: "lo" }) + failMark;

const r3 = (p) => p.map((v) => Math.round(v * 100) / 100);
const DATA = {
  width: W,
  height: H,
  P,
  V,
  label: LABEL,
  svg: `<path class="lb-backdrop" d="M0 0H${W}V${H}H0Z" fill="none"/>${BASE_SVG}<g class="lb-items">${groups}</g>`,
  items: items.map((item) => ({ part: item.piece, planes: item.cable ? null : planesOf(item), contain: Boolean(item.contain), cable: item.cable ?? null })),
  token: { r: TOKEN_R, h: TOKEN_H, z: TRACK, up: tokenUp, fail: tokenFail },
  feed: [r3([0, FEED_FROM + 10, TRACK]), r3([0, 0, TRACK])],
  lanes: Object.fromEntries(
    ["A", "B", "C"].map((id) => [
      id,
      {
        path: [[0, 0, TRACK], r3([SERVER_X[id], S_FRONT + 0.2, TRACK]), r3([SERVER_X[id], S_FRONT - 14, TRACK])],
        stop: r3([...(() => {
          const [dx, dy] = dirTo(id);
          const t = (S_FRONT + 1.4 + TOKEN_R + 0.2) / dy;
          return [dx * t, dy * t];
        })(), TRACK]),
      },
    ]),
  ),
  probes: Object.fromEntries(Object.entries(PROBE_ROUTES).map(([id, route]) => [id, route.map(r3)])),
  status: STATUS_ROUTE.map(r3),
  arm: { z: PLATE_TOP, h: 2.2, from: -3, to: 13.6, half: 1.9, tip: 1.2 },
  angles: ANGLE,
  shutterTravel: SHUTTER_TRAVEL,
};

mkdirSync(join(ROOT, "src/figure"), { recursive: true });
writeFileSync(join(ROOT, "src/figure/art.generated.json"), JSON.stringify(DATA));
console.log(`figure: ${items.length} items · ${R.solids.length} solids · ${R.tubes.length} tube runs · ${(DATA.svg.length / 1024).toFixed(0)} KB svg`);

// standalone pages for the kit's line-end check and screenshots (rest pose: shutters open, pins up, arm on A)
mkdirSync(join(ROOT, "shots"), { recursive: true });
const armPaths = (angle) => {
  const { z, h, from, to, half, tip } = DATA.arm;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const pt = (along, across) => [c * along - s * across, s * along + c * across];
  const ring = [pt(from, -half), pt(to - tip, -half), pt(to, 0), pt(to - tip, half), pt(from, half)];
  return k.extrude(ring, z, h, P, { convex: true });
};
const staticSvg = DATA.svg.replace('<g data-live="arm">', `<g data-live="arm" data-static="">${S(armPaths(ANGLE.A), { tone: "hi", crease: "lo", lit: true })}</g><g hidden="">`);
const CHECK_CSS = `.lb-void{fill:var(--anatomy-shade-0)}`;
for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: W, height: H, label: LABEL.en, body: staticSvg });
  const body = k.plateHtml({ fig: "Fig 1", title: "Load balancer", hint: "check page", readout: "rest pose", body: `<style>${CHECK_CSS}</style><div class="iso-stage">${svg}</div>` });
  writeFileSync(join(ROOT, `shots/figure${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "Load balancer figure", theme, body, width: 900 }));
}

mkdirSync(join(ROOT, "public"), { recursive: true });
for (const theme of ["light", "dark"]) {
  const css = `<style>.lb-void{fill:var(--anatomy-shade-0)}</style>`;
  writeFileSync(join(ROOT, `public/figure-${theme}.svg`), k.figureSvg({ width: W, height: H, label: LABEL.en, body: css + staticSvg, standalone: theme }));
}

A.auditOrExit(R, P, {});
