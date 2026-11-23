/**
 * Shared helpers for building anatomy figures with the kit: every drawn item is recorded with
 * its true shape (for A.settle and the audit) and exported with convex planes so the page can
 * slot moving tokens into the settled painter's order.
 */
import * as k from "../../src/figure/kit/iso-kit.mjs";
import * as G from "../../src/figure/kit/lathe.mjs";
import * as A from "../../src/figure/kit/audit.mjs";
import { tubePieces, tubeSvg } from "../../src/figure/kit/tube.mjs";

export function createBuilder(P) {
  const R = A.recorder(P);
  const record = R.solid;
  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const D = (points, style) => k.dotsSvg(points, style);
  const r2 = (v) => Math.round(v * 100) / 100;

  function put(part, ref, svg, shapes, { bias = 0, name, contain = false, cable, under = false } = {}) {
    return R.put({ piece: part, at: ref, bias, svg, shapes, name: name ?? R.nameFor(`${part}.item`), contain, cable, under });
  }
  /** A straight inclined prism from `a` to `b` (world points on its top centreline), cross-section [u0, u1] × [v0, v1]. */
  function ramp(part, a, b, [u0, u1], [v0, v1], style = {}, { name, extra = "", under = true } = {}) {
    const d = G.sub3(b, a);
    const len = G.len3(d);
    const axis = G.unit3(d);
    const u = G.unit3(G.cross3([0, 0, 1], axis));
    const v = G.unit3(G.cross3(axis, u));
    const F = G.frameOf(a, axis, u, v);
    const polygon = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const id = name ?? R.nameFor(`${part}.ramp`);
    const shape = record(A.prism(F, polygon, 0, len, { name: id }));
    put(part, G.add3(a, G.mul3(d, 0.5)), S(G.prismOf(F, polygon, 0, len, P), { tone: "mid", ...style }) + extra, [shape], { name: id, under });
    return { F, len };
  }
  function slab(part, plan, z, h, style = {}, { steps = 4, bevel = 0.6, inner = "", extra = "", name, bias, contain, meta = {}, wrap = "" } = {}) {
    const id = name ?? R.nameFor(`${part}.slab`);
    const shape = record(A.slab(plan, z, h, { name: id, ...meta }, steps));
    const body = S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "mid", ...style, inner }) + extra;
    put(part, [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2], wrap ? wrap.replace("$", body) : body, [shape], { name: id, bias, contain });
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
  const boxOf = (points, r) => [0, 1, 2].map((i) => [Math.min(...points.map((p) => p[i])) - r - 0.5, Math.max(...points.map((p) => p[i])) + r + 0.5].map(r2));
  function cable(part, name, points, r, { bend = 3.2, gaps = [], tone = "mid", maxLength = 18, touch, bundle } = {}) {
    const route = G.fillet(points, bend, 10, { P, tube: r });
    R.route(name, route, r, { piece: part, gaps, limp: true, touch, bundle });
    tubePieces(route, r, P, { maxLength, spacing: 1.4, gaps }).forEach((piece, index) =>
      put(part, piece.mid, tubeSvg(piece, { tone }), [A.tube(piece.points, piece.radii)], { name: `${name}:${index}`, bias: 0.05, cable: { name, box: boxOf(piece.points, r) } }),
    );
    return route;
  }

  /** Closed rounded slots (vents) on vertical faces. */
  function slotRing(point) {
    return (a0, a1, b0, b1, z, h) => {
      const r = h / 2;
      const ring = [];
      for (let i = 0; i <= 8; i++) {
        const t = -Math.PI / 2 + (i / 8) * Math.PI;
        ring.push(point(b1 - r + Math.cos(t) * r, z + Math.sin(t) * r));
      }
      for (let i = 0; i <= 8; i++) {
        const t = Math.PI / 2 + (i / 8) * Math.PI;
        ring.push(point(b0 + r + Math.cos(t) * r, z + Math.sin(t) * r));
      }
      return k.pathOf(ring.map(at), true);
    };
  }
  const slotOnX = (x, y0, y1, z, h) => slotRing((along, zz) => [x, along, zz])(0, 0, y0, y1, z, h);
  const slotOnY = (y, x0, x1, z, h) => slotRing((along, zz) => [along, y, zz])(0, 0, x0, x1, z, h);
  const rectOnY = (y, x0, x1, z0, z1) => k.pathOf([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]].map(at), true);
  const rectOnX = (x, y0, y1, z0, z1) => k.pathOf([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]].map(at), true);
  const quadAlong = (a, b, o0, o1) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    return [
      [a[0] + nx * o0, a[1] + ny * o0],
      [b[0] + nx * o0, b[1] + ny * o0],
      [b[0] + nx * o1, b[1] + ny * o1],
      [a[0] + nx * o1, a[1] + ny * o1],
    ];
  };

  /** Base plate on feet with a groove, corner screws and a seam (not part of the sorted items). */
  function basePlate(PLATE, PLATE_H, FOOT_H) {
    const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
    for (const [x, y] of k.corners(PLATE, 24).sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P))) {
      out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
      record(A.cylinder(x, y, 8, -PLATE_H - FOOT_H, FOOT_H, { name: "stand.foot", ground: true }));
    }
    out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -3.5, P, 8), { tone: "faint" }) }));
    record(A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate", ground: true }));
    out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
    const screws = k.corners(PLATE, 11);
    out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.4, 0, P, 16)).join(""), { tone: "lo" }));
    out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.55 }));
    return out.join("");
  }

  /** Convex planes [nx, ny, nz, d] (inside when n·p ≤ d) of an item's main shape, for live slotting. */
  function planesOf(item) {
    const shapes = item.shapes.filter((shape) => shape.kind !== "tube");
    if (!shapes.length) return null;
    const round = (list) => list.map((p) => p.map((v) => Math.round(v * 1000) / 1000));
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
      return round(planes);
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
        planes.push([Math.cos(a), Math.sin(a), 0, Math.cos(a) * cx + Math.sin(a) * cy + r]);
      }
      return round(planes);
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
    return round([[1, 0, 0, hi[0]], [-1, 0, 0, -lo[0]], [0, 1, 0, hi[1]], [0, -1, 0, -lo[1]], [0, 0, 1, hi[2]], [0, 0, -1, -lo[2]]]);
  }

  /** The item's screen bounding box [x0, y0, x1, y1] from its recorded shapes. */
  function screenBox(item) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const shape of item.shapes) {
      const b = A.boundsOf(shape);
      for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
        const [sx, sy] = at([x, y, z]);
        x0 = Math.min(x0, sx); y0 = Math.min(y0, sy); x1 = Math.max(x1, sx); y1 = Math.max(y1, sy);
      }
    }
    return Number.isFinite(x0) ? [x0, y0, x1, y1].map((v) => Math.round(v * 10) / 10) : null;
  }
  /** The convex hull of the item's projected shape corners: a tight screen silhouette for overlap tests. */
  function screenHull(item) {
    const points = [];
    for (const shape of item.shapes) {
      if (shape.kind === "prism") {
        // the true outline of a prism: its polygon at both ends
        for (const [pu, pv] of shape.poly) for (const s of [shape.s0, shape.s1]) {
          const F = shape.F;
          points.push(at([0, 1, 2].map((i) => F.o[i] + F.a[i] * s + F.u[i] * pu + F.v[i] * pv)));
        }
        continue;
      }
      const b = A.boundsOf(shape);
      for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) points.push(at([x, y, z]));
    }
    if (points.length < 3) return null;
    return G.hullOf(points).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }

  /** Settle the painter's keys and return the sorted item markup and slotting data. */
  function finish() {
    A.settle(R, P);
    R.items.sort((a, b) => a.key - b.key);
    return {
      groups: R.items.map((item, index) => `<g class="it" data-i="${index}" data-part="${item.piece}">${item.svg}</g>`).join(""),
      items: R.items.map((item) => ({ part: item.piece, planes: item.cable ? null : planesOf(item), contain: Boolean(item.contain), cable: item.cable ?? null, box: screenBox(item), hull: screenHull(item), under: Boolean(item.under) })),
    };
  }

  return { R, A, k, G, P, record, at, S, L, D, put, ramp, slab, prism, cyl, disc, cable, slotOnX, slotOnY, rectOnX, rectOnY, quadAlong, basePlate, finish, r2 };
}
