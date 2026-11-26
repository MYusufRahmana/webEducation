import type { FigureStageProps } from "../types";
import { busyOf, CAP, focusTrip, history, nameOf, order, ordersIn, parityOf, point, progressOf, report, SEATS, storeFor, type ShardSim, type Spot, type StoreId, type Trip } from "./model";
import { esc, floor, makeFrame, partAttrs, type Tone, type Vec3, type Visual } from "../../figure/system/iso";
import { SystemStage, type SystemSpec } from "../../figure/system/SystemStage";

/*
 * A records room read from left to right: the buyers, the routing desk (the app and its rule), and the
 * stores. Stores are real objects. In the analogy they are steel filing cabinets: plinth, cap, four
 * drawers with label holders and pulls, a lettered side panel and a lamp that lights while it works;
 * the top drawer slides out with its cards while a request is served. In the system view the same
 * stores are stacked database units with activity lights. Each store's records are listed on a card
 * beside it, with two separate gauges: orders stored and requests in progress.
 *
 * Design coordinates: u to the right, w downwards, mapped onto the isometric floor.
 */
const toFloor = (u: number, w: number): [number, number] => [u / 2 + w, -u / 2 + w];
const EXT: [number, number][] = [[-1.6, -1.6], [43, -1.6], [43, 20.4], [-1.6, 20.4]];
const F = makeFrame(EXT.map(([u, w]) => [...toFloor(u, w), 0] as Vec3), 21);
const S = (u: number, w: number, z = 0) => F.p(...toFloor(u, w), z);
const P = (x: number, y: number, z = 0) => F.p(x, y, z);
const r1 = (n: number) => Math.round(n * 10) / 10;
const COS = Math.cos(Math.PI / 6);
const pts = (list: [number, number][]) => list.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");
const poly = (cls: string, list: [number, number][], extra = "") => `<polygon class="${cls}" points="${pts(list)}"${extra}/>`;
const pillWidth = (text: string, size = 11) => Math.max(28, text.length * size * 0.56 + 18);

/* ---------------------------------------------------------------- layout */
const USER_AT: Record<number, [number, number]> = { 101: [1.4, 2.0], 102: [1.4, 5.3], 103: [1.4, 8.6], 104: [1.4, 11.9], 105: [1.4, 15.2], 107: [1.4, 18.5] };
const APP: [number, number] = [12, 8.4];
const STOCK: [number, number] = [9, 1.4];
const STORE_AT: Record<StoreId, [number, number]> = { S: [24, 8.4], A: [24, 3.4], B: [24, 13.4] };
const STORE_TONE: Record<StoreId, Tone> = { S: "grey", A: "blue", B: "orange" };
const CAB = { w: 2.9, d: 2.4, h: 4.3 };

/** Where a trip's card is drawn when it is at a spot. */
function spotXY(spot: Spot): [number, number] {
  if (spot.startsWith("user:")) {
    const [u, w] = USER_AT[Number(spot.slice(5))];
    return S(u + 1.5, w, 0.9);
  }
  if (spot === "app") return S(APP[0] - 0.6, APP[1], 1.6);
  if (spot === "stock") return S(STOCK[0], STOCK[1] + 0.6, 1.2);
  const [u, w] = STORE_AT[spot as StoreId];
  return S(u - 2.4, w + 0.3, 2.3);
}

/* ---------------------------------------------------------------- solids */
/** A box at any height: right (x+w) and left (y+d) faces, then the top. */
function boxAt(x: number, y: number, z: number, w: number, d: number, h: number, tone: Tone, extra = "") {
  const top: [number, number][] = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const left: [number, number][] = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const right: [number, number][] = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
  return `<g class="sys-box" data-tone="${tone}"${extra}>${poly("f-left", left)}${poly("f-right", right)}${poly("f-top", top)}</g>`;
}
/** A quad on the plane y = const (faces lower left). */
const onY = (y: number, x0: number, x1: number, z0: number, z1: number): [number, number][] => [P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)];
/** A quad on the plane x = const (faces lower right). */
const onX = (x: number, y0: number, y1: number, z0: number, z1: number): [number, number][] => [P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)];
const line = (cls: string, a: [number, number], b: [number, number]) => `<path class="${cls}" d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}"/>`;
const dot = (cls: string, [x, y]: [number, number], r = 1.3) => `<circle class="${cls}" cx="${r1(x)}" cy="${r1(y)}" r="${r}"/>`;
const shadow = (u: number, w: number, rx: number, ry: number) => {
  const [x, y] = S(u, w);
  return `<ellipse class="sh-shadow" cx="${r1(x)}" cy="${r1(y + 4)}" rx="${rx}" ry="${ry}"/>`;
};
/** Text printed on the plane x = const, reading left to right on screen. */
function textOnX(x: number, y: number, z: number, text: string, size: number, cls: string) {
  const [ox, oy] = P(x, y, z);
  return `<text class="${cls}" transform="matrix(${r1(COS * 100) / 100} -0.5 0 1 ${r1(ox)} ${r1(oy)})" font-size="${size}">${esc(text)}</text>`;
}

/** A steel filing cabinet. `open`: the top drawer is pulled out, with its cards. */
function cabinet(id: StoreId, busy: number, v: Visual, part: string) {
  const [u, w] = STORE_AT[id];
  const [cx, cy] = toFloor(u, w);
  const x0 = cx - CAB.w / 2;
  const y0 = cy - CAB.d / 2;
  const { w: W, d: D, h: H } = CAB;
  const tone = STORE_TONE[id];
  const front = y0 + D;
  const out: string[] = [shadow(u, w, 78, 33)];
  // recessed plinth, body, overhanging cap
  out.push(boxAt(x0 + 0.12, y0 + 0.12, 0, W - 0.24, D - 0.24, 0.26, "grey"));
  out.push(boxAt(x0, y0, 0.26, W, D, H - 0.26, tone));
  out.push(boxAt(x0 - 0.06, y0 - 0.06, H, W + 0.12, D + 0.12, 0.12, tone));
  // side panel: a pressed border and the cabinet's letter
  const side = x0 + W + 0.005;
  out.push(poly("sh-press", onX(side, y0 + 0.2, front - 0.2, 0.5, H - 0.25)));
  if (id !== "S") out.push(textOnX(side, front - 0.75, 1.75, id, 38, "sh-letter"));
  else out.push(textOnX(side, front - 0.35, 1.9, "ARSIP", 13, "sh-letter small"));
  // four drawers on the front
  const drawers = 4;
  const zb = 0.42;
  const zt = H - 0.14;
  const gap = 0.1;
  const dh = (zt - zb - gap * (drawers - 1)) / drawers;
  const xa = x0 + 0.16;
  const xb = x0 + W - 0.16;
  const xm = (xa + xb) / 2;
  const open = busy > 0;
  for (let i = 0; i < drawers; i++) {
    const z0 = zb + i * (dh + gap);
    const z1 = z0 + dh;
    const top = i === drawers - 1;
    if (top && open) {
      // the opening, then the drawer pulled out with its cards standing in it
      out.push(poly("sh-recess", onY(front + 0.002, xa, xb, z0, z1)));
      const pull = 0.78;
      out.push(`<g class="sys-box" data-tone="${tone}">${poly("f-right", onX(xb, front, front + pull, z0, z1))}${poly("sh-tray", [P(xa, front, z1), P(xb, front, z1), P(xb, front + pull, z1), P(xa, front + pull, z1)])}</g>`);
      for (let k = 0; k < 4; k++) {
        const y = front + 0.14 + k * 0.15;
        out.push(poly("sh-card", onY(y, xa + 0.1, xb - 0.1, z1 - 0.2, z1 + 0.26 - (k % 2) * 0.06)));
        out.push(poly("sh-card-tab", onY(y, xa + 0.3 + k * 0.32, xa + 0.62 + k * 0.32, z1 + 0.26 - (k % 2) * 0.06, z1 + 0.36 - (k % 2) * 0.06)));
      }
      out.push(`<g class="sys-box" data-tone="${tone}">${poly("f-left", onY(front + pull, xa, xb, z0, z1))}</g>`);
      out.push(...drawerFittings(front + pull, xa, xb, xm, z0, z1));
    } else {
      out.push(poly("sh-drawer", onY(front + 0.004, xa, xb, z0, z1)));
      out.push(...drawerFittings(front + 0.006, xa, xb, xm, z0, z1));
    }
  }
  // the work lamp on the cap
  out.push(`<g class="sh-lamp"${open ? " data-on" : ""}>${dot("sh-lamp-base", P(x0 + W - 0.35, y0 + 0.4, H + 0.12), 4.2)}${dot("sh-lamp-glass", P(x0 + W - 0.35, y0 + 0.4, H + 0.2), 2.8)}</g>`);
  return `<g class="sys-node sh-store" data-key="store-${id}-${v.analogy ? "c" : "d"}" data-store="${id}"${partAttrs(part, v)}>${out.join("")}</g>`;
}
function drawerFittings(y: number, xa: number, xb: number, xm: number, z0: number, z1: number) {
  const zc = z0 + (z1 - z0) * 0.42;
  const zl = z0 + (z1 - z0) * 0.78;
  return [
    // label holder with its card
    poly("sh-holder", onY(y, xm - 0.34, xm + 0.34, zl - 0.13, zl + 0.08)),
    poly("sh-holder-card", onY(y, xm - 0.27, xm + 0.27, zl - 0.09, zl + 0.04)),
    // pull handle on two screws
    line("sh-handle", P(xm - 0.32, y, zc), P(xm + 0.32, y, zc)),
    dot("sh-screw", P(xm - 0.4, y, zc), 1.1),
    dot("sh-screw", P(xm + 0.4, y, zc), 1.1),
    // the lock dot on the left
    dot("sh-screw", P(xa + 0.16, y, z1 - 0.12), 0.9),
    line("sh-seam", P(xa, y, z0), P(xb, y, z0)),
  ];
}

/** A stacked database unit: three platters on a plinth, with activity lights. */
function database(id: StoreId, busy: number, v: Visual, part: string) {
  const [u, w] = STORE_AT[id];
  const [cx, cy] = toFloor(u, w);
  const tone = STORE_TONE[id];
  const out: string[] = [shadow(u, w, 78, 33)];
  out.push(boxAt(cx - 1.7, cy - 1.7, 0, 3.4, 3.4, 0.26, "grey"));
  const R = 1.48;
  const rx = R * F.unit * 1.2247;
  const ry = R * F.unit * 0.7071;
  const disks = 3;
  for (let k = 0; k < disks; k++) {
    const zb = 0.26 + k * 1.3;
    const zt = zb + 1.18;
    const [ox, yb] = P(cx, cy, zb);
    const [, yt] = P(cx, cy, zt);
    const lit = k < busy;
    out.push(
      `<g class="sys-box sh-disk" data-tone="${tone}">` +
        `<path class="f-left" d="M${r1(ox - rx)} ${r1(yt)}L${r1(ox - rx)} ${r1(yb)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(ox + rx)} ${r1(yb)}L${r1(ox + rx)} ${r1(yt)}Z"/>` +
        `<path class="f-right sh-disk-shade" d="M${r1(ox + rx * 0.2)} ${r1(yt + ry * 0.98)}L${r1(ox + rx * 0.2)} ${r1(yb + ry * 0.98)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(ox + rx)} ${r1(yb)}L${r1(ox + rx)} ${r1(yt)}A${r1(rx)} ${r1(ry)} 0 0 1 ${r1(ox + rx * 0.2)} ${r1(yt + ry * 0.98)}Z"/>` +
        `<path class="sh-band" d="M${r1(ox - rx)} ${r1((yt + yb) / 2)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(ox + rx)} ${r1((yt + yb) / 2)}"/>` +
        `<ellipse class="f-top" cx="${r1(ox)}" cy="${r1(yt)}" rx="${r1(rx)}" ry="${r1(ry)}"/>` +
        `<g class="sh-led"${lit ? " data-on" : ""}>${dot("", [ox - rx * 0.62, yb - (yb - yt) * 0.42 + ry * 0.78], 2.4)}${dot("", [ox - rx * 0.4, yb - (yb - yt) * 0.42 + ry * 0.92], 1.6)}</g>` +
        `</g>`,
    );
  }
  const [tx, ty] = P(cx, cy, 0.26 + disks * 1.3 - 0.12);
  out.push(`<ellipse class="sh-cap-ring" cx="${r1(tx)}" cy="${r1(ty)}" rx="${r1(rx * 0.55)}" ry="${r1(ry * 0.55)}"/>`);
  return `<g class="sys-node sh-store" data-key="store-${id}-${v.analogy ? "c" : "d"}" data-store="${id}"${partAttrs(part, v)}>${out.join("")}</g>`;
}

/** The routing desk (analogy) or the app server (system), with the clerk behind the desk. */
function desk(sim: ShardSim, v: Visual, deciding: boolean) {
  const [u, w] = APP;
  const [cx, cy] = toFloor(u, w);
  const out: string[] = [shadow(u, w, 70, 28)];
  if (v.analogy) {
    // the clerk stands behind the desk, so is drawn first
    const [px, py] = S(u + 0.9, w - 1.5, 0);
    out.push(`<g class="sys-person sh-clerk" data-tone="violet"><path d="M${r1(px - 11)} ${r1(py - 2)}c0-17 5-24 11-24s11 7 11 24z"/><circle cx="${r1(px)}" cy="${r1(py - 33)}" r="7.5"/></g>`);
    const x0 = cx - 1.7;
    const y0 = cy - 0.8;
    out.push(boxAt(x0 + 0.1, y0 + 0.1, 0, 1.0, 1.4, 1.0, "cream"), boxAt(x0 + 2.3, y0 + 0.1, 0, 1.0, 1.4, 1.0, "cream"));
    out.push(poly("sh-drawer", onY(y0 + 1.504, x0 + 0.22, x0 + 0.98, 0.55, 0.9)), poly("sh-drawer", onY(y0 + 1.504, x0 + 0.22, x0 + 0.98, 0.12, 0.48)));
    out.push(line("sh-handle thin", P(x0 + 0.45, y0 + 1.51, 0.74), P(x0 + 0.75, y0 + 1.51, 0.74)), line("sh-handle thin", P(x0 + 0.45, y0 + 1.51, 0.32), P(x0 + 0.75, y0 + 1.51, 0.32)));
    out.push(boxAt(x0, y0, 1.0, 3.4, 1.6, 0.14, "cream"));
    // the rule board standing on the desk: two coloured rows, A (genap) and B (ganjil)
    const by = y0 + 0.55;
    out.push(boxAt(x0 + 0.5, by - 0.08, 1.14, 1.7, 0.16, 0.9, "grey"));
    out.push(poly("sh-rule-a" + (deciding && sim.pointing?.store === "A" ? " on" : ""), onY(by + 0.085, x0 + 0.62, x0 + 2.08, 1.62, 1.9)));
    out.push(poly("sh-rule-b" + (deciding && sim.pointing?.store === "B" ? " on" : ""), onY(by + 0.085, x0 + 0.62, x0 + 2.08, 1.24, 1.52)));
    // an in-tray with papers and a stamp
    out.push(boxAt(x0 + 2.45, y0 + 0.35, 1.14, 0.75, 0.95, 0.1, "grey"), boxAt(x0 + 2.53, y0 + 0.43, 1.24, 0.6, 0.78, 0.05, "cream"));
    out.push(boxAt(x0 + 0.08, y0 + 1.0, 1.14, 0.3, 0.3, 0.3, "violet"));
  } else {
    // a 3-unit app server; the routing rule lives in its code
    const x0 = cx - 1.3;
    const y0 = cy - 1.1;
    out.push(boxAt(x0 + 0.1, y0 + 0.1, 0, 2.4, 2.0, 0.2, "grey"));
    out.push(boxAt(x0, y0, 0.2, 2.6, 2.2, 2.3, "violet"));
    for (let k = 0; k < 3; k++) {
      const z0 = 0.36 + k * 0.7;
      out.push(poly("sh-drawer", onY(y0 + 2.204, x0 + 0.14, x0 + 2.46, z0, z0 + 0.56)));
      for (let s = 0; s < 4; s++) out.push(line("sh-vent", P(x0 + 1.15 + s * 0.24, y0 + 2.21, z0 + 0.14), P(x0 + 1.15 + s * 0.24, y0 + 2.21, z0 + 0.42)));
      out.push(`<g class="sh-led"${deciding ? " data-on" : ""}>${dot("", P(x0 + 0.38, y0 + 2.21, z0 + 0.28), 2.2)}</g>`);
      out.push(dot("sh-screw", P(x0 + 0.22, y0 + 2.21, z0 + 0.48), 0.9), dot("sh-screw", P(x0 + 2.38, y0 + 2.21, z0 + 0.48), 0.9));
    }
    out.push(textOnX(x0 + 2.605, y0 + 2.0, 1.2, "APP", 12, "sh-letter small"));
  }
  return `<g class="sys-node sh-desk" data-key="desk-${v.analogy ? "c" : "d"}"${partAttrs("app", v)}>${grow(u, w, 1.32, out.join(""))}</g>`;
}

/** The stock service: one board of seats, the only place seats are sold. */
function stockBoard(sim: ShardSim, v: Visual, checking: string | null) {
  const [u, w] = STOCK;
  const [cx, cy] = toFloor(u, w);
  const out: string[] = [shadow(u, w, 58, 22)];
  const x0 = cx - 1.5;
  const y0 = cy - 1.1;
  out.push(boxAt(x0, y0, 0, 3.0, 2.2, 0.55, v.analogy ? "cream" : "teal"));
  out.push(poly("sh-press", onY(y0 + 2.204, x0 + 0.2, x0 + 2.8, 0.14, 0.42)));
  SEATS.forEach((seat, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx = x0 + 0.35 + col * 0.85;
    const sy = y0 + 0.3 + row * 0.95;
    const owner = sim.seats[seat];
    const tone: Tone = owner === null ? "green" : "grey";
    const lit = checking === seat;
    out.push(`<g class="sh-seat"${lit ? " data-on" : ""}>${boxAt(sx, sy, 0.55, 0.55, 0.55, owner === null ? 0.32 : 0.18, tone)}${boxAt(sx, sy, 0.55 + (owner === null ? 0.32 : 0.18), 0.55, 0.14, 0.34, tone)}</g>`);
  });
  return `<g class="sys-node sh-stock" data-key="stock"${partAttrs("stock", v)}>${grow(u, w, 1.2, out.join(""))}</g>`;
}

/** Draw an object larger about its ground point; strokes keep their width. */
function grow(u: number, w: number, k: number, svg: string) {
  const [x, y] = S(u, w);
  return `<g class="sh-grow" transform="translate(${r1(x * (1 - k))} ${r1(y * (1 - k))}) scale(${k})">${svg}</g>`;
}

/** A buyer with a small base disc. */
function person(id: number, u: number, w: number, tone: string, v: Visual, on: boolean) {
  const [px, py] = S(u, w, 0);
  return `<g class="sys-node sh-user" data-key="user-${id}"${partAttrs("users", v)} data-user="${id}">${shadow(u, w, 18, 7)}${grow(u, w, 1.15, `<g class="sys-person" data-tone="${tone}"${on ? " data-on" : ""}><path d="M${r1(px - 9)} ${r1(py)}c0-15 4-21 9-21s9 6 9 21z"/><circle cx="${r1(px)}" cy="${r1(py - 27)}" r="6.5"/></g>`)}</g>`;
}

/* ---------------------------------------------------------------- labels and cards */
function pillAt(x: number, y: number, text: string, o: { tone?: string; part?: string; small?: boolean; key?: string; anchor?: "middle" | "start" } = {}, v?: Visual) {
  const size = o.small ? 11 : 12.5;
  const width = pillWidth(text, size);
  const height = o.small ? 18 : 22;
  const left = o.anchor === "start" ? x : x - width / 2;
  return `<g class="sys-pill" data-tone="${o.tone ?? "plain"}"${o.key ? ` data-key="${o.key}"` : ""}${v ? partAttrs(o.part, v) : ""} transform="translate(${r1(left)} ${r1(y - height / 2)})"><rect class="sys-pill-drop" x="1.5" y="2.5" width="${r1(width)}" height="${height}" rx="${height / 2}"/><rect width="${r1(width)}" height="${height}" rx="${height / 2}"/><text x="${r1(width / 2)}" y="${r1(height / 2 + size * 0.36)}" font-size="${size}">${esc(text)}</text></g>`;
}
const tx = (x: number, y: number, t: string, cls = "sys-card-text") => `<text class="${cls}" x="${r1(x)}" y="${r1(y)}">${esc(t)}</text>`;
function card(key: string, part: string, x: number, y: number, w: number, h: number, body: string, v: Visual, cls = "") {
  return `<g class="sys-pill sys-card sh-panel ${cls}" data-key="${key}"${partAttrs(part, v)} transform="translate(${r1(x)} ${r1(y)})"><rect class="sys-pill-drop" x="2" y="3" width="${w}" height="${h}" rx="9"/><rect class="sys-card-bg" width="${w}" height="${h}" rx="9"/>${body}</g>`;
}
function button(key: string, action: string, x: number, y: number, label: string, primary = false) {
  const w = pillWidth(label) + 10;
  return `<g class="sys-pill fig-button${primary ? " primary" : ""}" data-key="${key}" data-action="${action}" role="button" tabindex="0" aria-label="${esc(label)}" transform="translate(${r1(x)} ${r1(y - 13)})"><rect class="sys-pill-drop" x="1.5" y="2.5" width="${r1(w)}" height="26" rx="13"/><rect class="fig-button-bg" width="${r1(w)}" height="26" rx="13"/><text x="${r1(w / 2)}" y="17.5">${esc(label)}</text></g>`;
}
/** A row of buttons, left to right from (x, y). */
function buttons(x: number, y: number, items: [string, string, string, boolean?][]) {
  const out: string[] = [];
  for (const [key, action, label, primary] of items) {
    out.push(button(key, action, x, y, label, primary));
    x += pillWidth(label) + 20;
  }
  return out.join("");
}

function storeName(id: StoreId, v: Visual, scene: number) {
  if (v.analogy) return id === "S" ? "Ruang arsip" : id === "A" ? "Arsip A · ID genap" : "Arsip B · ID ganjil";
  if (scene === 9) return id === "A" ? "latihan_tiket_a" : "latihan_tiket_b";
  return id === "S" ? "Database pesanan" : id === "A" ? "Shard A · id genap" : "Shard B · id ganjil";
}

/** The records card beside a store: its orders and two gauges. */
function recordsCard(sim: ShardSim, id: StoreId, v: Visual) {
  const A = v.analogy;
  const [u, w] = STORE_AT[id];
  const [x, y] = S(u + 4.3, w - (id === "S" ? 3.6 : 3.3));
  const W = 246;
  const list = ordersIn(sim, id);
  const show = list.slice(-4);
  const hist = sim.lastHistory && sim.t - sim.lastHistory.at < 6 && sim.lastHistory.store === id ? sim.lastHistory.codes : [];
  let body = tx(12, 19, `${A ? "Isi arsip" : "Isi"} · ${list.length} pesanan`, "sys-card-text strong");
  body += `<path class="sh-rule" d="M10 27H${W - 10}"/>`;
  if (!show.length) body += tx(12, 46, A ? "(lemari masih kosong)" : "(tabel masih kosong)", "sys-card-text small muted");
  show.forEach((o, i) => {
    const fresh = sim.t - o.at < 2.4 && o.at > 0;
    const found = hist.includes(o.code);
    const state = fresh ? "new" : found ? "found" : "";
    const yy = 32 + i * 19;
    body += `<g class="sh-row" data-state="${state}" transform="translate(8 ${yy})"><rect width="${W - 16}" height="17" rx="4"/>${tx(6, 12.5, o.code, "sys-card-text strong")}${tx(66, 12.5, `${o.name} · ${o.userId}`)}${tx(W - 24, 12.5, found ? "✓ dicari" : fresh ? "baru" : o.seat ?? "", "sys-card-text sh-tag")}</g>`;
  });
  const more = list.length - show.length;
  let gy = 32 + Math.max(1, show.length) * 19 + 6;
  if (more > 0) {
    body += tx(12, gy + 6, `+ ${more} pesanan lebih lama`, "sys-card-text small muted");
    gy += 14;
  }
  // gauges: stored and in progress are separate numbers
  const stored = Math.min(list.length, 14);
  const serving = sim.stores[id].serving.length;
  const queued = sim.stores[id].queue.length;
  body += `<g class="sh-gauge" data-part="gauges" transform="translate(12 ${gy + 8})">${tx(0, 9, A ? "Tersimpan" : "Tersimpan", "sys-card-text small")}`;
  for (let i = 0; i < 14; i++) body += `<rect class="sh-cell${i < stored ? " on" : ""}" x="${74 + i * 9}" y="0" width="7" height="11" rx="1.5"/>`;
  body += tx(206, 9, String(list.length), "sys-card-text small strong") + `</g>`;
  const cells = Math.min(serving + queued, 14);
  body += `<g class="sh-gauge" data-part="gauges" transform="translate(12 ${gy + 26})">${tx(0, 9, "Diproses", "sys-card-text small")}`;
  for (let i = 0; i < 14; i++) body += `<rect class="sh-cell${i < Math.min(serving, cells) ? " work" : i < cells ? " wait" : ""}" x="${74 + i * 9}" y="0" width="7" height="11" rx="1.5"/>`;
  body += `<path class="sh-cap" d="M${74 + CAP * 9 - 1} -3V14"/>` + tx(206, 9, queued ? `${serving}+${queued}` : String(serving), `sys-card-text small strong${queued ? " warn" : ""}`) + `</g>`;
  const h = gy + 46;
  return card(`records-${id}`, id === "S" ? "single" : id === "A" ? "shardA" : "shardB", x, y, W, h, body, v);
}

/* ---------------------------------------------------------------- render */
const kindOf = (t: Trip) => (t.failed ? "fail" : t.kind === "read" ? "read" : t.kind === "part" ? "part" : t.stage === "to-app-back" || t.stage === "to-user" ? "done" : "write");

function tokenText(t: Trip) {
  if (t.failed) return `✗ ${t.seat}`;
  if (t.kind === "part") return t.count !== undefined ? `${t.store}: ${t.count}` : "hitung";
  if (t.kind === "read") return t.found ? `✓ ${t.found.length} pesanan` : `cari ${t.userId}`;
  if (t.stage === "to-app-back" || t.stage === "to-user") return `✓ ${t.code}`;
  return `ID ${t.userId}`;
}
function tokenXY(t: Trip, now: number, reduced: boolean): [number, number] {
  const a = spotXY(t.from);
  if (!t.to) return a;
  const b = spotXY(t.to);
  const k = reduced ? 1 : progressOf(t, now);
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const back = t.stage === "to-app-back" || t.stage === "to-user" || t.stage === "from-stock";
  const lane = back ? -9 : 9;
  return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + lane];
}

function render(sim: ShardSim, v: Visual) {
  const A = v.analogy;
  const scene = v.step ?? 99;
  const sharded = sim.mode === "sharded";
  const stores: StoreId[] = sharded ? ["A", "B"] : ["S"];
  const anchorPts = EXT.map(([u, w]) => S(u, w).join(",")).join(" ");
  const out: string[] = [`<g class="sys-zone sys-anchor" data-key="scene-anchor" aria-hidden="true"><polygon points="${anchorPts}"/></g>`];
  const focus = focusTrip(sim);
  const deciding = !!focus && focus.stage === "deciding" && focus.doneAt === null;
  const pointing = sim.pointing && (deciding || (scene === 2 && sim.t - sim.pointing.at < 1.4) || scene === 2) ? sim.pointing : null;
  const users = sim.users.filter((u) => USER_AT[u.id] && (u.id <= 104 || scene === 7));

  // floor zones: the buyers' side and the records room
  const zone = (key: string, u0: number, u1: number, w0: number, w1: number, label: string) => {
    const c = [S(u0, w0), S(u1, w0), S(u1, w1), S(u0, w1)];
    const [lx, ly] = S(u0 + 0.3, w1);
    return `<g class="sh-zone" data-key="zone-${key}"><polygon points="${pts(c)}"/><text x="${r1(lx + 6)}" y="${r1(ly - 7)}">${esc(label)}</text></g>`;
  };
  out.push(zone("room", 20, 28, sharded ? -0.2 : 4.6, sharded ? 17 : 12, A ? "Gedung arsip" : scene === 9 ? "Satu server MySQL (latihan)" : sharded ? "Dua server database" : "Server database"));

  // links: users → desk, desk → stores (and the stock service), lit while the followed request uses them
  const lit = new Set<string>();
  for (const t of sim.trips) if (t.doneAt === null && t.to) lit.add(`${t.from}|${t.to}`), lit.add(`${t.to}|${t.from}`);
  const link = (a: Spot, b: Spot, key: string) => {
    const [x1, y1] = spotXY(a);
    const [x2, y2] = spotXY(b);
    return `<path class="sh-link${lit.has(`${a}|${b}`) ? " on" : ""}" data-key="link-${key}" d="M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}"/>`;
  };
  for (const u of users) out.push(link(`user:${u.id}`, "app", `u${u.id}`));
  for (const s of stores) out.push(link("app", s, s));
  if (sim.stock) out.push(link("app", "stock", "stock"));

  // solids, back to front
  const solids: { depth: number; svg: string }[] = [];
  const tones = ["blue", "orange", "green", "violet", "yellow", "blue"];
  users.forEach((u, i) => {
    const [uu, ww] = USER_AT[u.id];
    solids.push({ depth: ww, svg: person(u.id, uu, ww, tones[i], v, pointing?.user === u.id || focus?.userId === u.id) });
  });
  solids.push({ depth: APP[1], svg: desk(sim, v, deciding || !!pointing) });
  if (sim.stock) {
    const checking = sim.trips.find((t) => t.stage === "checking" && t.doneAt === null)?.seat ?? null;
    solids.push({ depth: STOCK[1], svg: stockBoard(sim, v, checking) });
  }
  for (const s of stores) solids.push({ depth: STORE_AT[s][1], svg: A ? cabinet(s, busyOf(sim, s), v, s === "S" ? "single" : s === "A" ? "shardA" : "shardB") : database(s, Math.min(3, sim.stores[s].serving.length + (sim.stores[s].queue.length ? 1 : 0)), v, s === "S" ? "single" : s === "A" ? "shardA" : "shardB") });
  solids.sort((a, b) => a.depth - b.depth);
  out.push(...solids.map((s) => s.svg));

  // names: buyers, desk, stores, stock
  const labels: string[] = [];
  for (const u of users) {
    const [uu, ww] = USER_AT[u.id];
    const [x, y] = S(uu, ww, 0);
    const on = pointing?.user === u.id;
    labels.push(pillAt(x, y + 14, `${u.name} · ${u.id}`, { small: true, tone: on ? "info" : "plain", part: "users", key: `name-${u.id}` }, v));
  }
  {
    const [x, y] = S(APP[0], APP[1], 0);
    labels.push(pillAt(x + 6, y + 34, A ? "Petugas pengarah" : "Aplikasi tiket", { part: "app", key: "name-app" }, v));
  }
  for (const s of stores) {
    const [u, w] = STORE_AT[s];
    const [x, y] = S(u, w, CAB.h + 0.9);
    labels.push(pillAt(x, y - 4, storeName(s, v, scene), { part: s === "S" ? "single" : s === "A" ? "shardA" : "shardB", key: `name-${s}`, tone: focus?.store === s && focus.doneAt === null ? "info" : "plain" }, v));
    const q = sim.stores[s].queue.length;
    if (q) labels.push(pillAt(x, S(u, w)[1] + 26, `${q} menunggu`, { small: true, tone: "warn", part: "gauges", key: `q-${s}` }, v));
  }
  if (sim.stock) {
    const [x, y] = S(STOCK[0], STOCK[1], 0);
    labels.push(pillAt(x + 58, y - 14, A ? "Meja stok kursi" : "Layanan stok", { part: "stock", key: "name-stock", anchor: "start" }, v));
    const a1 = sim.seats.A1;
    labels.push(pillAt(x + 58, y + 10, a1 === null ? "Kursi A1: tersedia" : `A1: terjual ke ${nameOf(sim, a1)}`, { small: true, tone: a1 === null ? "ok" : "warn", part: "stock", key: "seat-a1", anchor: "start" }, v));
  }

  // the rule card (sharded scenes) or the "before sharding" checklist
  const [rx, ry] = S(5, 12.6);
  if (sharded) {
    const W = 262;
    const pu = pointing?.user ?? null;
    const row = (y: number, store: "A" | "B", text: string) => `<g class="sh-rule-row" data-store="${store}"${pointing?.store === store ? " data-on" : ""} transform="translate(8 ${y})"><rect width="${W - 16}" height="20" rx="5"/>${tx(8, 14, text)}</g>`;
    let body = tx(12, 19, scene === 9 && !A ? "pilihDatabase($idPengguna)" : A ? "Papan aturan petugas" : "Aturan pembagian · shard key", "sys-card-text strong");
    body += row(28, "A", A ? "ID genap  → Arsip A" : scene === 9 ? "id % 2 === 0 → latihan_tiket_a" : "id_pengguna genap  → Shard A");
    body += row(52, "B", A ? "ID ganjil → Arsip B" : scene === 9 ? "selain itu   → latihan_tiket_b" : "id_pengguna ganjil → Shard B");
    const msg = pu !== null ? `${nameOf(sim, pu)} · ${pu} → ${parityOf(pu)} → ${A ? "Arsip" : "Shard"} ${storeFor("sharded", pu)}` : A ? "Petugas membaca ID pembeli" : "Aplikasi membaca id_pengguna";
    body += tx(12, 92, msg, `sys-card-text${pu !== null ? " strong" : ""}`);
    body += tx(12, 108, "Contoh belajar, bukan aturan produksi.", "sys-card-text small muted");
    out.push(card("rule", "rule", rx, ry, W, 118, body, v));
  } else if (scene === 10) {
    const items = ["Query & indeks sudah diperbaiki?", "Cache untuk data yang sering dibaca?", "Replikasi & backup untuk keandalan?", "Data bisa dibagi sesuai pola akses?", "Tim siap mengelola banyak shard?"];
    let body = tx(12, 19, "Sebelum sharding, periksa:", "sys-card-text strong");
    items.forEach((t, i) => (body += `<g transform="translate(12 ${32 + i * 18})"><rect class="sh-box" width="11" height="11" rx="2"/>${tx(18, 9.5, t)}</g>`));
    out.push(card("checklist", "gauges", rx, ry - 4, 278, 128, body, v));
  }

  // the decision while the request waits at the desk
  if (deciding && focus && sharded) {
    const [x, y] = S(APP[0] - 2.4, APP[1] - 3.2, 0);
    labels.push(pillAt(x, y, `ID ${focus.userId} ${parityOf(focus.userId!)} → ${A ? "Arsip" : "Shard"} ${storeFor("sharded", focus.userId!)}`, { tone: "info", part: "rule", key: "decision" }, v));
  }

  // records beside each store
  const cards: string[] = stores.map((s) => recordsCard(sim, s, v));

  // history and report results, shown above the desk
  const [hx, hy] = S(6.4, 0.6);
  if (sim.lastHistory && (scene === 5 || scene > 10)) {
    const h = sim.lastHistory;
    const body = tx(12, 19, `${A ? "Riwayat" : "Riwayat pesanan"} ${nameOf(sim, h.user)} · ${h.user}`, "sys-card-text strong") + tx(12, 38, `Dicari di: ${A ? "Arsip" : "Shard"} ${h.store} saja`) + tx(12, 56, `Ditemukan: ${h.codes.join(", ") || "—"}`, "sys-card-text ok");
    cards.push(card("history", "app", hx, hy, 250, 66, body, v));
  }
  const rep = sim.trips.find((t) => t.kind === "report");
  if (rep) {
    const parts = sim.trips.filter((t) => t.parent === rep.id);
    const asked = parts.map((p) => p.store).join(" + ");
    const r = sim.lastReport;
    const line2 = r ? `${Object.entries(r.counts).map(([k, n]) => `${k}: ${n}`).join(" + ")} = ${r.total} pesanan` : rep.stage === "merging" && Number.isFinite(rep.until) ? "menggabungkan hasil…" : `menunggu ${parts.filter((p) => p.doneAt === null).length} shard…`;
    const body = tx(12, 19, A ? "Rekap semua berkas hari ini" : "Laporan: semua pesanan hari ini", "sys-card-text strong") + tx(12, 38, `${A ? "Arsip" : "Shard"} yang ditanya: ${asked || "A + B"}`) + tx(12, 56, line2, `sys-card-text${r ? " ok" : ""}`);
    cards.push(card("report", "report", hx, hy, 262, 66, body, v));
  }

  // moving cards (tokens): the followed one is larger and ringed
  const toks: string[] = [];
  for (const t of sim.trips) {
    if (t.doneAt !== null || t.kind === "report") continue;
    if (t.stage === "queued" || t.stage === "serving") continue; // inside the store: shown by the drawer, lamp and gauges
    const [x, y] = tokenXY(t, sim.t, v.reduced);
    const label = tokenText(t);
    const w = Math.max(42, label.length * 6.4 + 14);
    const big = t.focus && (scene <= 6 || scene >= 8);
    toks.push(`<g class="sh-token" data-key="tok-${t.id}" data-kind="${kindOf(t)}"${big ? " data-focus" : ""} transform="translate(${r1(x)} ${r1(y)}) scale(${big ? 1.12 : 0.86})"><rect class="sh-token-drop" x="${r1(-w / 2 + 1.5)}" y="-9.5" width="${r1(w)}" height="20" rx="4"/><rect x="${r1(-w / 2)}" y="-11" width="${r1(w)}" height="20" rx="4"/><path class="sh-token-fold" d="M${r1(w / 2 - 7)} -11l7 7"/><text y="3">${esc(label)}</text></g>`);
  }

  // buttons inside the figure
  const [bx, by] = S(5, 19.4);
  let controls = "";
  if (scene === 0) controls = buttons(bx, by, [["b-order", "order:next", "Buat pesanan", true]]);
  if (scene === 1) controls = buttons(bx, by, [["b-rush", "rush:all", "Tambah 10 permintaan", true]]);
  if (scene === 2) controls = buttons(bx, by, [101, 102, 103, 104].map((id) => [`b-pt-${id}`, `point:${id}`, `${nameOf(sim, id)} ${id}`, pointing?.user === id] as [string, string, string, boolean]));
  if (scene === 3) controls = buttons(bx, by, [["b-andi", "order:101", "Pesanan Andi (101)", true]]);
  if (scene === 4) controls = buttons(bx, by, [["b-budi", "order:102", "Pesanan Budi (102)", true]]);
  if (scene === 5) controls = buttons(bx, by, [["b-h101", "history:101", "Riwayat Andi", true], ["b-h102", "history:102", "Riwayat Budi"]]);
  if (scene === 6) controls = buttons(bx, by, [["b-report", "report", "Semua pesanan", true]]);
  if (scene === 7) controls = buttons(bx, by, [["b-odd", "rush:odd", "Banyak dari ID ganjil", true], ["b-even", "rush:even", "Banyak dari ID genap"]]);
  if (scene === 8) controls = buttons(bx, by, [["b-race", "race", "Andi & Budi berebut kursi", true]]);

  const [nx, ny] = S(35.6, 19.6);
  labels.push(pillAt(nx, ny, A ? "Simulasi arsip, bukan sistem sungguhan." : "Simulasi konsep, bukan benchmark database.", { small: true, key: "note" }));

  return out.join("") + labels.join("") + cards.join("") + toks.join("") + controls;
}

const nextUser = (sim: ShardSim) => [101, 102, 103, 104][sim.nextCode % 4];

const SPEC: SystemSpec<ShardSim> = {
  frame: F,
  floor: floor(F, [-12, -22, 42, 32]),
  render,
  cameraPad: [16, 14],
  onAction: (action, runtime) => {
    const [name, arg] = action.split(":");
    if (name === "order") runtime.act((s: ShardSim) => order(s, arg === "next" ? nextUser(s) : Number(arg)));
    else if (name === "history") runtime.act((s: ShardSim) => history(s, Number(arg)));
    else if (name === "report") runtime.act((s: ShardSim) => report(s));
    else if (name === "point") runtime.act((s: ShardSim) => point(s, Number(arg)));
    else if (name === "race")
      runtime.act((s: ShardSim) => {
        s.stock = true;
        const seat = SEATS.find((x) => s.seats[x] === null) ?? "A1";
        order(s, 101, seat);
        order(s, 102, seat);
      });
    else if (name === "rush")
      runtime.act((s: ShardSim) => {
        const ids = arg === "odd" ? [101, 103, 105, 107] : arg === "even" ? [102, 104] : [101, 102, 103, 104];
        for (let i = 0; i < 10; i++) s.script.push(i % 3 === 0 ? { at: s.t + i * 0.3, kind: "order", user: ids[i % ids.length] } : { at: s.t + i * 0.3, kind: "history", user: ids[i % ids.length] });
        s.script.sort((a, b) => a.at - b.at);
      });
  },
  analogyLabel: "Analogi arsip: pembeli membawa berkas pesanan ke petugas pengarah; petugas membaca ID pembeli, lalu menyimpan berkas ID genap di Arsip A dan ID ganjil di Arsip B. Setiap lemari punya daftar isi dan penunjuk kesibukan.",
  label: "Cara kerja database: aplikasi tiket membaca id_pengguna sebagai shard key; pesanan id genap ditulis ke Shard A, id ganjil ke Shard B. Riwayat seorang pengguna hanya ditanyakan ke satu shard; laporan seluruh pesanan menanyai semua shard lalu menggabungkan hasilnya.",
};

export default function ShardSystem(props: FigureStageProps) {
  return <SystemStage {...props} spec={SPEC} />;
}
