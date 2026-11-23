/**
 * Builds the DNS figure with the anatomy kit: a tiered address-lookup desk.
 *
 *   node scripts/build-figure-dns.mjs           writes src/topics/dns/art.generated.json and shots/dns-figure*.html
 *   node scripts/build-figure-dns.mjs --audit   also runs the kit's geometry audit
 *
 * Front left: the client terminal with its own card box (the local cache) and a TTL dial.
 * Front centre: the resolver's desk, with an inbox, its own cache tray and TTL dial.
 * Back: three podiums of rising height, joined to the desk by ramps: the authoritative bureau for
 * contoh.id (lowest), the .id TLD bureau, and the root bureau (highest). Question, referral and
 * answer cards travel along the track and ramps; cached answers sit in the trays.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createBuilder } from "./lib/builder.mjs";
import * as k from "../src/figure/kit/iso-kit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 640;
const H = 460;

/* ------------------------------------------------------------------ layout (world units, z up) */
const PLATE = { x: -186, y: -98, w: 280, d: 176, r: 10 };
const PLATE_H = 10;
const FOOT_H = 5;
const TRACK = 2.6;
const CARD = { w: 8, d: 10, h: 2.2 };

const CLIENT = { x: -170, y: 18, w: 36, d: 32, r: 2.5 };
const CLIENT_TOP = 24;
const LOCAL = { x: -131.5, y: 20, w: 26, d: 28, r: 2 };
const LOCAL_TOP = 14;
const DESK = { x: -62, y: 12, w: 114, d: 34, r: 2.5 };
const DESK_TOP = 20;
const TRACK_Y = 30;

const PODIUM = {
  root: { x: -78, h: 34, bureau: 16 },
  tld: { x: -28, h: 22, bureau: 16 },
  auth: { x: 22, h: 10, bureau: 16 },
};
const POD_Y = -94;
const POD_D = 42;
const POD_W = 46;
const POD_FRONT = POD_Y + POD_D;
const BUREAU_INSET = 5;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [PODIUM.root.x, POD_Y, PODIUM.root.h + PODIUM.root.bureau + 14], [PODIUM.root.x + POD_W, POD_Y, PODIUM.root.h + PODIUM.root.bureau + 14]],
  W,
  H,
  { pad: 14, azimuth: 40, elevation: 30 },
);
const B = createBuilder(P);
const { R, G, at, S, L, D, put, ramp, slab, cyl, disc, slotOnX, slotOnY, rectOnX, rectOnY, r2 } = B;

const BASE_SVG = B.basePlate(PLATE, PLATE_H, FOOT_H);

/* ------------------------------------------------------------------ base details */
{
  const strip = { x: -100, y: PLATE.y + PLATE.d - 12, w: 140, d: 6, r: 1 };
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.6, 0.6, [1.8, 3.4], P);
  slab("base", strip, 0, 0.6, { tone: "lo", crease: "none" }, { steps: 3, bevel: 0, name: "base.ruler", extra: L(ticks.minor, { tone: "lo" }) + L(ticks.major, { tone: "mid" }) + D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }) });
  const lp = { x: 56, y: 52, w: 34, d: 16, r: 1.5 };
  const z = 0.9;
  const rules = [k.lineOnTop([lp.x + 5, lp.y + 4.5], [lp.x + 28, lp.y + 4.5], z, P), k.lineOnTop([lp.x + 5, lp.y + 8], [lp.x + 23, lp.y + 8], z, P), k.lineOnTop([lp.x + 5, lp.y + 11.5], [lp.x + 16, lp.y + 11.5], z, P)].join("");
  slab("base", lp, 0, z, { tone: "lo" }, { steps: 3, bevel: 0.3, name: "base.label", extra: L(k.planOutline(k.insetPlan(lp, 1.6), z, P, 4), { tone: "faint" }) + L(rules, { tone: "lo", free: true }) + D([at([lp.x + 32, lp.y + 4, z]), at([lp.x + 32, lp.y + 12, z])], { size: 0.45 }) });
}

/* ------------------------------------------------------------------ client terminal, keyboard and local cache box */
const CLIENT_TRAY = [CLIENT.x + 13, CLIENT.y + 14, CLIENT_TOP + 0.8];
{
  const front = CLIENT.y + CLIENT.d;
  const screen = rectOnY(front, CLIENT.x + 5, CLIENT.x + 29, 8, 19);
  const frame = rectOnY(front, CLIENT.x + 3.5, CLIENT.x + 30.5, 6.5, 20.5);
  slab("client", k.insetPlan(CLIENT, -2), 0, 2.4, { tone: "lo" }, { bevel: 0.4, name: "client.plinth" });
  slab("client", CLIENT, 2.4, CLIENT_TOP - 2.4, { tone: "mid" }, {
    bevel: 0.8,
    name: "client.body",
    contain: true,
    inner: L(k.sideSeam(CLIENT, 4.5, P, 4), { tone: "faint" }),
    extra: `<path class="lb-void dns-screen" d="${screen}"/>` + L(frame, { tone: "lo" }) + L([7, 10, 13].map((z) => slotOnX(CLIENT.x + CLIENT.w, CLIENT.y + 4, CLIENT.y + 14, z, 1.6)).join(""), { tone: "lo" }),
  });
  const tray = { x: CLIENT_TRAY[0] - 7, y: CLIENT_TRAY[1] - 8, w: 14, d: 16, r: 1 };
  slab("client", tray, CLIENT_TOP, 0.8, { tone: "hi", crease: "lo" }, { steps: 3, bevel: 0.3, name: "client.tray", extra: L(k.planOutline(k.insetPlan(tray, 1.4), CLIENT_TOP + 0.8, P, 3), { tone: "faint" }) });
  disc("client", [CLIENT.x + 30, front, 22], [0, 1, 0], 0, 1, 1.6, { tone: "mid" }, { name: "client.lamp", wrap: `<g data-live="lamp" data-at="client">$</g>` });
  const keyboard = { x: CLIENT.x + 2, y: front + 6, w: 32, d: 11, r: 1.2 };
  const keys = k.dotGrid(keyboard.x + 3, keyboard.y + 2.5, 10, 3, 2.9, 1.8, P);
  slab("client", keyboard, 0, 1.8, { tone: "mid" }, { steps: 3, bevel: 0.4, name: "client.keyboard", extra: D(keys, { size: 0.55, tone: "mid" }) + L(k.planOutline(k.insetPlan(keyboard, 1.2), 1.8, P, 3), { tone: "faint" }) });
}
const LOCAL_TRAY = [LOCAL.x + 9, LOCAL.y + 15, LOCAL_TOP + 0.8];
const LOCAL_CHECK = [LOCAL.x + 9, LOCAL.y + 15, LOCAL_TOP + 0.8 + CARD.h];
const LOCAL_DIAL = [LOCAL.x + 19.5, LOCAL.y + 8, LOCAL_TOP + 1.6, 3.4];
{
  // the local cache is a card box with a tray on top and a TTL dial
  const vents = [5, 8].map((z) => slotOnY(LOCAL.y + LOCAL.d, LOCAL.x + 5, LOCAL.x + 21, z, 1.6)).join("");
  slab("localCache", LOCAL, 0, LOCAL_TOP, { tone: "mid" }, { bevel: 0.6, name: "localCache.box", contain: true, inner: L(k.sideSeam(LOCAL, 11, P, 4), { tone: "faint" }), extra: L(vents, { tone: "lo" }) + D([[LOCAL.x + 3, LOCAL.y + 3], [LOCAL.x + LOCAL.w - 3, LOCAL.y + LOCAL.d - 3]].map(([x, y]) => at([x, y, LOCAL_TOP])), { size: 0.45 }) });
  const tray = { x: LOCAL_TRAY[0] - 6.5, y: LOCAL_TRAY[1] - 7.5, w: 13, d: 15, r: 1 };
  slab("localCache", tray, LOCAL_TOP, 0.8, { tone: "hi", crease: "lo" }, { steps: 3, bevel: 0.3, name: "localCache.tray", extra: L(k.planOutline(k.insetPlan(tray, 1.3), LOCAL_TOP + 0.8, P, 3), { tone: "faint" }) });
  const [x, y, z, r] = LOCAL_DIAL;
  const t = k.radialTicks(x, y, r + 0.2, 12, 3, z, [0.7, 1.3], P);
  cyl("localCache", x, y, r + 1, LOCAL_TOP, z - LOCAL_TOP, { tone: "hi", crease: "lo" }, { steps: 32, bevel: 0.4, name: "localCache.dial", extra: L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + `<path class="iso-line" data-tone="lit" data-live="ttl" data-cache="local" data-free="end" d="" style="stroke-width:1"/>` + D([at([x, y, z])], { size: 0.55, tone: "hi" }) });
}

/* ------------------------------------------------------------------ floor track: local cache → resolver desk */
{
  const strip = { x: LOCAL.x + LOCAL.w, y: TRACK_Y - 6, w: DESK.x - LOCAL.x - LOCAL.w, d: 12, r: 0.6 };
  slab("track", strip, 0, 1, { tone: "lo" }, { steps: 2, bevel: 0, name: "track.strip" });
  for (const dy of [-4.6, 3]) slab("track", { x: strip.x, y: TRACK_Y + dy, w: strip.w, d: 1.6, r: 0.4 }, 1, TRACK - 1, { tone: "mid" }, { steps: 2, bevel: 0.3, name: R.nameFor("track.rail") });
}

/* ------------------------------------------------------------------ resolver desk */
const INBOX = [DESK.x + 14, DESK.y + 22, DESK_TOP + 0.8];
const RES_TRAY = [DESK.x + 76, DESK.y + 22, DESK_TOP + 0.8];
const RES_DIAL = [DESK.x + 94, DESK.y + 22, DESK_TOP + 1.8, 4.4];
{
  const front = DESK.y + DESK.d;
  const drawerXs = [6, 24, 42, 60, 78, 96].map((dx) => DESK.x + dx);
  const drawers = drawerXs.map((x) => rectOnY(front, x, x + 12, 5, 15)).join("");
  slab("resolver", DESK, 0, DESK_TOP, { tone: "mid" }, {
    bevel: 0.8,
    name: "resolver.desk",
    contain: true,
    inner: L(k.sideSeam(DESK, 17, P, 4), { tone: "faint" }),
    extra: L(drawers, { tone: "lo" }) + D(drawerXs.map((x) => at([x + 6, front, 10])), { size: 0.6, tone: "mid" }) + L([5, 8.5, 12].map((z) => slotOnX(DESK.x + DESK.w, DESK.y + 6, DESK.y + 20, z, 1.6)).join(""), { tone: "lo" }),
  });
  const inbox = { x: INBOX[0] - 7, y: INBOX[1] - 8, w: 14, d: 16, r: 1 };
  slab("resolver", inbox, DESK_TOP, 0.8, { tone: "hi", crease: "lo" }, { steps: 3, bevel: 0.3, name: "resolver.inbox", extra: L(k.planOutline(k.insetPlan(inbox, 1.4), DESK_TOP + 0.8, P, 3), { tone: "faint" }) });
  disc("resolver", [DESK.x + 4, front, 17], [0, 1, 0], 0, 1, 1.6, { tone: "mid" }, { name: "resolver.lamp", wrap: `<g data-live="lamp" data-at="resolver">$</g>` });
  // the resolver's own cache: a tray with a cover rail and a TTL dial
  const tray = { x: RES_TRAY[0] - 7, y: RES_TRAY[1] - 8, w: 14, d: 16, r: 1 };
  slab("resolverCache", tray, DESK_TOP, 0.8, { tone: "hi", crease: "lo" }, { steps: 3, bevel: 0.3, name: "resolverCache.tray", extra: L(k.planOutline(k.insetPlan(tray, 1.4), DESK_TOP + 0.8, P, 3), { tone: "faint" }) });
  const [x, y, z, r] = RES_DIAL;
  const t = k.radialTicks(x, y, r + 0.2, 12, 3, z, [0.8, 1.5], P);
  cyl("resolverCache", x, y, r + 1.1, DESK_TOP, z - DESK_TOP, { tone: "hi", crease: "lo" }, { steps: 36, bevel: 0.4, name: "resolverCache.dial", extra: L(t.minor, { tone: "lo" }) + L(t.major, { tone: "mid" }) + `<path class="iso-line" data-tone="lit" data-live="ttl" data-cache="resolver" data-free="end" d="" style="stroke-width:1"/>` + D([at([x, y, z])], { size: 0.55, tone: "hi" }) });
}

/* ------------------------------------------------------------------ podiums, bureaus and ramps */
const ROUTE = {};
const BUREAU_AT = {};
for (const [id, pod] of Object.entries(PODIUM)) {
  const part = id;
  const plan = { x: pod.x, y: POD_Y, w: POD_W, d: POD_D, r: 2 };
  // the podium is a stepped stand: its height is its rank in the hierarchy
  const steps = Array.from({ length: Math.floor(pod.h / 4) }, (_, i) => k.sideSeam(plan, 4 * (i + 1), P, 4)).join("");
  slab(part, plan, 0, pod.h, { tone: "lo" }, { bevel: 0.6, name: `${part}.podium`, inner: L(steps, { tone: "faint" }), extra: D(k.corners(plan, 3).map(([x, y]) => at([x, y, pod.h])), { size: 0.45 }) });
  const bureau = { x: pod.x + BUREAU_INSET, y: POD_Y + 4, w: POD_W - BUREAU_INSET * 2, d: POD_D - 14, r: 2 };
  const top = pod.h + pod.bureau;
  const front = bureau.y + bureau.d;
  const cx = bureau.x + bureau.w / 2;
  const port = rectOnY(front, cx - 6, cx + 6, pod.h, pod.h + 6);
  slab(part, bureau, pod.h, pod.bureau, { tone: "mid" }, {
    bevel: 0.8,
    name: `${part}.bureau`,
    contain: true,
    inner: L(k.sideSeam(bureau, top - 3, P, 4), { tone: "faint" }),
    extra: `<path class="lb-void" d="${port}"/>` + L(port, { tone: "lo" }) + L([pod.h + 5, pod.h + 8.5].map((z) => slotOnX(bureau.x + bureau.w, bureau.y + 4, bureau.y + 16, z, 1.6)).join(""), { tone: "lo" }),
  });
  disc(part, [bureau.x + bureau.w - 5, front, top - 6], [0, 1, 0], 0, 1, 1.8, { tone: "mid" }, { name: `${part}.lamp`, wrap: `<g data-live="lamp" data-at="${id}">$</g>` });
  BUREAU_AT[id] = [cx, front, pod.h];
  // what sits on each bureau's roof tells its rank: a mast for the root, a sign for the TLD, a record tray for the zone
  if (id === "root") {
    cyl(part, cx, bureau.y + 10, 3, top, 2, { tone: "mid" }, { steps: 24, bevel: 0.3, name: "root.mastBase" });
    cyl(part, cx, bureau.y + 10, 1.2, top + 2, 12, { tone: "mid", crease: "none" }, { steps: 16, name: "root.mast", inner: L(k.sideArc(cx, bureau.y + 10, 1.2, top + 8, P, 12), { tone: "faint" }) });
    cyl(part, cx, bureau.y + 10, 4, top + 14, 1.2, { tone: "hi", crease: "lo" }, { steps: 32, bevel: 0.3, name: "root.ring", extra: D([at([cx, bureau.y + 10, top + 15.2])], { size: 0.6, tone: "hi" }) });
  } else if (id === "tld") {
    for (const dx of [-8, 8]) cyl(part, cx + dx, bureau.y + 8, 0.9, top, 6, { tone: "mid", crease: "none" }, { steps: 12, name: R.nameFor("tld.post") });
    slab(part, { x: cx - 11, y: bureau.y + 7, w: 22, d: 2, r: 0.4 }, top + 6, 5, { tone: "hi", crease: "lo" }, { steps: 2, bevel: 0.3, name: "tld.sign", extra: L([top + 8, top + 9.5].map((z) => k.pathOf([at([cx - 8, bureau.y + 9, z]), at([cx + 8, bureau.y + 9, z])])).join(""), { tone: "lo", free: true }) });
  } else {
    const tray = { x: cx - 7, y: bureau.y + 6, w: 14, d: 16, r: 1 };
    slab(part, tray, top, 0.8, { tone: "hi", crease: "lo" }, { steps: 3, bevel: 0.3, name: "auth.zoneTray", extra: L(k.planOutline(k.insetPlan(tray, 1.4), top + 0.8, P, 3), { tone: "faint" }) });
    BUREAU_AT.zone = [cx, bureau.y + 14, top + 0.8];
  }
  // ramp from the back edge of the desk up (or down) to the podium's top front edge
  const startX = cx;
  // a small gap at each end keeps the tilted end faces clear of the desk and the podium
  const a0 = [startX, DESK.y, DESK_TOP];
  const b0 = [cx, POD_FRONT, pod.h];
  const flat = G.unit3([b0[0] - a0[0], b0[1] - a0[1], 0]);
  const a = G.add3(a0, G.mul3(flat, 1.6));
  const b = G.add3(b0, G.mul3(flat, -1.6));
  // slats across the deck run rail to rail, so they end on the rails
  const along = G.unit3(G.sub3(b, a));
  const side = G.unit3(G.cross3([0, 0, 1], along));
  const total = G.len3(G.sub3(b, a));
  const slats = [];
  for (let s0 = 2.5; s0 < total - 1; s0 += 4) {
    const c = G.add3(a, G.mul3(along, s0));
    slats.push(k.pathOf([at(G.add3(c, G.mul3(side, -4.6))), at(G.add3(c, G.mul3(side, 4.6)))]));
  }
  const { len } = ramp("ramps", a, b, [-6, 6], [-2, 0], { tone: "mid" }, { name: `ramps.deck${id}`, extra: L(slats.join(""), { tone: "lo" }) });
  ramp("ramps", a, b, [-6, -4.6], [0, 1.6], { tone: "mid" }, { name: `ramps.railL${id}` });
  ramp("ramps", a, b, [4.6, 6], [0, 1.6], { tone: "mid" }, { name: `ramps.railR${id}` });
  // a post under the middle of each long ramp
  const mid = G.lerp3(a, b, 0.5);
  if (len > 30) cyl("ramps", mid[0], mid[1], 2, 0, mid[2] - 2.05, { tone: "mid", crease: "none" }, { steps: 16, name: `ramps.post${id}`, inner: L(k.sideArc(mid[0], mid[1], 2, 3, P, 12), { tone: "faint" }) });
  ROUTE[id] = [INBOX, [startX, DESK.y + 4, DESK_TOP + 0.8], [startX, DESK.y, DESK_TOP + 0.8], [cx, POD_FRONT, pod.h + 0.8], [cx, front - 6, pod.h + 0.8]].map((p) => p.map(r2));
}

/* ------------------------------------------------------------------ settle, export */
const { groups, items } = B.finish();

const card = (cls, marks = "") => {
  const plan = { x: -CARD.w / 2, y: -CARD.d / 2, w: CARD.w, d: CARD.d, r: 0.6 };
  return S(k.slabOf(plan, 0, CARD.h, P, 2, 0.4), { tone: "hi", crease: "lo", className: cls }) + marks;
};
const across = (y, tone = "lo") => L(k.lineOnTop([-CARD.w / 2, y], [CARD.w / 2, y], CARD.h, P), { tone });
const CARDS = {
  // a question: a ring with a dot in it
  query: card("dns-card dns-query", L(k.ring(0, 0, 2.2, CARD.h, P, 16), { tone: "hi" }) + D([at([0, 0, CARD.h])], { size: 0.6, tone: "hi" })),
  // a referral: an arrow pointing to the next tier
  referral: card("dns-card dns-referral", L(k.pathOf([[0, 3], [0, -3]].map(([x, y]) => at([x, y, CARD.h]))) + k.pathOf([[-2, -1], [0, -3], [2, -1]].map(([x, y]) => at([x, y, CARD.h]))), { tone: "hi" })),
  // answers: one bar for the first address, two bars for the new one
  ans0: card("dns-card dns-answer", across(0, "hi")),
  ans1: card("dns-card dns-answer dns-new", across(-1.6, "hi") + across(1.6, "hi")),
};

const LABEL = {
  id: "Meja pencarian alamat bertingkat: di depan kiri ada terminal klien dengan kotak kartu cache lokal dan dial TTL. Di tengah, meja resolver dengan baki masuk, baki cache, dan dial TTL. Di belakang, tiga podium bertingkat dihubungkan tanjakan ke meja: biro root di podium tertinggi, biro TLD .id, dan biro authoritative contoh.id yang menyimpan kartu alamat.",
  en: "A tiered address-lookup desk: at front left the client terminal with a local cache card box and a TTL dial. In the middle, the resolver's desk with an inbox, a cache tray and a TTL dial. At the back, three podiums of rising height joined to the desk by ramps: the root bureau on the highest, the .id TLD bureau, and the authoritative bureau for contoh.id, which holds the address card.",
};

const DATA = {
  width: W,
  height: H,
  P,
  V: G.viewOf(P),
  label: LABEL,
  svg: `${BASE_SVG}<g class="lb-items">${groups}</g>`,
  items,
  card: { ...CARD, ...CARDS },
  clientTray: CLIENT_TRAY.map(r2),
  localTray: LOCAL_TRAY.map(r2),
  localCheck: LOCAL_CHECK.map(r2),
  inbox: INBOX.map(r2),
  resolverTray: RES_TRAY.map(r2),
  zone: BUREAU_AT.zone.map(r2),
  localDial: LOCAL_DIAL,
  resolverDial: RES_DIAL,
  // client ↔ resolver: down from the local cache box, along the track, into the desk, up to the inbox
  toResolver: [LOCAL_TRAY, [LOCAL.x + LOCAL.w + 1, TRACK_Y, TRACK], [DESK.x - 1, TRACK_Y, TRACK], [DESK.x + 6, TRACK_Y, TRACK], INBOX].map((p) => p.map(r2)),
  toLocal: [CLIENT_TRAY, LOCAL_TRAY].map((p) => p.map(r2)),
  routes: ROUTE,
};

mkdirSync(join(ROOT, "src/topics/dns"), { recursive: true });
writeFileSync(join(ROOT, "src/topics/dns/art.generated.json"), JSON.stringify(DATA));
console.log(`dns figure: ${R.items.length} items · ${R.solids.length} solids · ${(DATA.svg.length / 1024).toFixed(0)} KB svg`);

// standalone check pages and fallback images (rest pose: needles at zero)
const needle = ([x, y, z, r]) => k.lineOnTop([x, y], [x, y - r], z, P);
let staticSvg = DATA.svg;
staticSvg = staticSvg.replace('data-live="ttl" data-cache="local" data-free="end" d=""', `data-live="ttl" data-cache="local" data-free="end" d="${needle(LOCAL_DIAL)}"`);
staticSvg = staticSvg.replace('data-live="ttl" data-cache="resolver" data-free="end" d=""', `data-live="ttl" data-cache="resolver" data-free="end" d="${needle(RES_DIAL)}"`);
const CSS = `.lb-void{fill:var(--anatomy-shade-0)}`;
mkdirSync(join(ROOT, "shots"), { recursive: true });
mkdirSync(join(ROOT, "public"), { recursive: true });
for (const theme of ["light", "dark"]) {
  const svg = k.figureSvg({ width: W, height: H, label: LABEL.en, body: `<style>${CSS}</style>` + staticSvg });
  const body = k.plateHtml({ fig: "Fig 3", title: "DNS lookup desk", hint: "check page", readout: "rest pose", body: `<div class="iso-stage">${svg}</div>` });
  writeFileSync(join(ROOT, `shots/dns-figure${theme === "light" ? "-light" : ""}.html`), k.pageHtml({ title: "DNS figure", theme, body, width: 900 }));
  writeFileSync(join(ROOT, `public/dns-figure-${theme}.svg`), k.figureSvg({ width: W, height: H, label: LABEL.en, body: `<style>${CSS}</style>` + staticSvg, standalone: theme }));
}

B.A.auditOrExit(R, P, {});
