/**
 * Places small live objects (tokens, cards, pulses) in a figure's settled painter's order.
 *
 * Every static item exported by a build script carries the convex planes of its main shape. A live
 * object separated from an item by one of those planes is in front of it when the plane faces the
 * viewer and behind it otherwise; a "container" item (a cabinet the object travels through) hides it.
 * The object is inserted right after the last item it is in front of.
 */

export type Vec3 = [number, number, number];
export type Plane = [number, number, number, number];
export interface SlotItem {
  part: string;
  planes: Plane[] | null;
  contain: boolean;
  cable: { name: string; box: [number, number][] } | null;
  /** Screen bounding box [x0, y0, x1, y1]; when present, only items overlapping the object constrain it. */
  box?: number[] | null;
  /** A surface things ride on (a ramp): an overlapping object that is not clearly behind it is drawn on top. */
  under?: boolean;
  /** Convex screen silhouette; tighter than `box` for deciding which items overlap an object. */
  hull?: number[][] | null;
}

function inside(hull: number[][], x: number, y: number) {
  let sign = 0;
  for (let i = 0; i < hull.length; i++) {
    const [ax, ay] = hull[i];
    const [bx, by] = hull[(i + 1) % hull.length];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (Math.abs(cross) < 1e-9) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

export function slotFor(items: SlotItem[], V: number[], p: Vec3, extent: (n: Plane) => number, cable?: string, screen?: number[]): number {
  let front = -1;
  let behind = Infinity;
  const overlaps = (box?: number[] | null, hull?: number[][] | null) => {
    if (!screen || !box) return true;
    if (!(box[0] <= screen[2] && box[2] >= screen[0] && box[1] <= screen[3] && box[3] >= screen[1])) return false;
    if (!hull) return true;
    const [x0, y0, x1, y1] = screen;
    const probes = [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [(x0 + x1) / 2, (y0 + y1) / 2]];
    if (probes.some(([x, y]) => inside(hull, x, y))) return true;
    return hull.some(([x, y]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
  };
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.cable) {
      if (cable && item.cable.name === cable) {
        const b = item.cable.box;
        if (p[0] >= b[0][0] && p[0] <= b[0][1] && p[1] >= b[1][0] && p[1] <= b[1][1] && p[2] >= b[2][0] && p[2] <= b[2][1]) front = Math.max(front, i);
      }
      continue;
    }
    if (!item.planes || !overlaps(item.box, item.hull)) continue;
    let separated = false;
    for (const n of item.planes) {
      const out = n[0] * p[0] + n[1] * p[1] + n[2] * p[2] - n[3];
      if (out >= extent(n) - 0.02) {
        separated = true;
        if (n[0] * V[0] + n[1] * V[1] + n[2] * V[2] > 0) front = Math.max(front, i);
        else behind = Math.min(behind, i);
        break;
      }
    }
    if (!separated && item.contain) behind = Math.min(behind, i);
    if (!separated && item.under) front = Math.max(front, i);
  }
  // in front of everything it is in front of, unless that would put it over something it is behind
  return Math.min(front + 1, behind);
}

/** Arc-length lookup on a 3D polyline. */
export function track(points: number[][]) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]));
  const total = lengths[lengths.length - 1];
  const at = (distance: number): Vec3 => {
    const d = Math.max(0, Math.min(total, distance));
    let i = 1;
    while (i < points.length - 1 && lengths[i] < d) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    const t = (d - lengths[i - 1]) / span;
    const a = points[i - 1];
    const b = points[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  };
  return { total, lengths, at, frac: (t: number) => at(Math.max(0, Math.min(1, t)) * total) };
}
