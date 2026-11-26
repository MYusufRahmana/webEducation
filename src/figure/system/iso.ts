/**
 * "Sistem sebenarnya" figures: pastel isometric blocks with ink outlines, crowds, pill labels,
 * an isometric floor grid and tokens moving along edges. Every frame the topic renders an SVG
 * string from the simulation, so the picture can never disagree with the model.
 */

export type Vec3 = [number, number, number];
export type Tone = "blue" | "orange" | "green" | "violet" | "yellow" | "grey" | "cream" | "red" | "teal";

export interface Frame {
  /** World (x right-down, y left-down, z up) to viewBox pixels. */
  p: (x: number, y: number, z?: number) => [number, number];
  viewBox: [number, number, number, number];
  unit: number;
}

const COS = Math.cos(Math.PI / 6);

/** A projection that fits the given world points into a viewBox with padding. */
export function makeFrame(points: Vec3[], unit = 22, pad = [36, 52, 36, 30]): Frame {
  const raw = (x: number, y: number, z = 0): [number, number] => [(x - y) * COS * unit, (x + y) * 0.5 * unit - z * unit];
  const xs = points.map(([x, y, z]) => raw(x, y, z)[0]);
  const ys = points.map(([x, y, z]) => raw(x, y, z)[1]);
  const [top, right, bottom, left] = pad;
  const minX = Math.min(...xs) - left;
  const minY = Math.min(...ys) - top;
  const width = Math.max(...xs) - minX + right;
  const height = Math.max(...ys) - minY + bottom;
  return {
    p: (x, y, z = 0) => {
      const [sx, sy] = raw(x, y, z);
      return [round(sx - minX), round(sy - minY)];
    },
    viewBox: [0, 0, Math.ceil(width), Math.ceil(height)],
    unit,
  };
}

const round = (v: number) => Math.round(v * 10) / 10;
const pts = (list: [number, number][]) => list.map(([x, y]) => `${x},${y}`).join(" ");
export const esc = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export interface Visual {
  step?: number;
  /** true: the everyday analogy; false: the real system. Same positions, same simulation. */
  analogy: boolean;
  highlight: Set<string>;
  selected: string | null;
  reduced: boolean;
}

/** Attributes that make an element selectable and let CSS light or dim it. */
export const partAttrs = (part: string | undefined, visual: Visual) =>
  part ? ` data-part="${part}"${visual.highlight.has(part) ? " data-hl" : ""}${visual.selected === part ? " data-sel" : ""}` : "";

/** The floor: a faint isometric grid. */
export function floor(f: Frame, [x0, y0, x1, y1]: [number, number, number, number]) {
  const lines: string[] = [];
  for (let x = x0; x <= x1; x++) {
    const [a, b] = [f.p(x, y0), f.p(x, y1)];
    lines.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
  }
  for (let y = y0; y <= y1; y++) {
    const [a, b] = [f.p(x0, y), f.p(x1, y)];
    lines.push(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`);
  }
  return `<path class="sys-grid" d="${lines.join("")}"/>`;
}

function roundedFace(points: [number,number][], radius = 5) {
  const near=(a:[number,number],b:[number,number])=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1]);const k=Math.min(radius/l,.22);return [round(a[0]+(b[0]-a[0])*k),round(a[1]+(b[1]-a[1])*k)];};
  return points.map((p,i)=>{const a=near(p,points[(i+points.length-1)%points.length]),b=near(p,points[(i+1)%points.length]);return `${i?'L':'M'}${a.join(' ')}Q${p.join(' ')} ${b.join(' ')}`;}).join('')+'Z';
}

/** A box seen from the front corner: top, left (y+d) and right (x+w) faces. */
export function box(f: Frame, x: number, y: number, w: number, d: number, h: number, tone: Tone, extra = "") {
  const top = [f.p(x, y, h), f.p(x + w, y, h), f.p(x + w, y + d, h), f.p(x, y + d, h)];
  const left = [f.p(x, y + d, 0), f.p(x + w, y + d, 0), f.p(x + w, y + d, h), f.p(x, y + d, h)];
  const right = [f.p(x + w, y, 0), f.p(x + w, y + d, 0), f.p(x + w, y + d, h), f.p(x + w, y, h)];
  return `<g class="sys-box" data-tone="${tone}"${extra}><path class="f-left" d="${roundedFace(left)}"/><path class="f-right" d="${roundedFace(right)}"/><path class="f-top" d="${roundedFace(top)}"/></g>`;
}

const ICONS: Record<string, string> = {
  lock: '<rect x="-6" y="-1" width="12" height="9" rx="1.5"/><path d="M-3.5-1v-3a3.5 3.5 0 0 1 7 0v3"/><circle cx="0" cy="3.5" r="1"/>',
  cert: '<rect x="-7" y="-7" width="14" height="10" rx="1"/><path d="M-4-3.5h8M-4-1h5"/><circle cx="2" cy="5" r="2.6"/><path d="M0.8 7l-.8 3 2-1.2 2 1.2-.8-3"/>',
  eye: '<path d="M-8 0c2.5-4 5-5.5 8-5.5S5.5-4 8 0c-2.5 4-5 5.5-8 5.5S-5.5 4-8 0z"/><circle r="2.4"/>',
  mail: '<rect x="-7" y="-5" width="14" height="10" rx="1"/><path d="M-7-4l7 5 7-5"/>',
  server: '<rect x="-7" y="-7" width="14" height="5.5" rx="1.5"/><rect x="-7" y="1.5" width="14" height="5.5" rx="1.5"/><circle cx="-4" cy="-4.2" r=".9"/><circle cx="-4" cy="4.3" r=".9"/>',
  split: '<path d="M-7 0h5M-2 0l6-5M-2 0h9M-2 0l6 5"/><circle cx="-2" cy="0" r="1.6"/>',
  pulse: '<path d="M-8 0h4l2-5 3 10 2-5h5"/>',
  globe: '<circle r="7"/><path d="M-7 0h14M0-7c-3 3-3 11 0 14M0-7c3 3 3 11 0 14"/>',
  laptop: '<rect x="-6" y="-6" width="12" height="8" rx="1"/><path d="M-8 4h16"/>',
  search: '<circle cx="-1.5" cy="-1.5" r="5"/><path d="M2 2l5 5"/>',
  doc: '<path d="M-5-7h7l4 4v10h-11z"/><path d="M-2 0h5M-2 3h5"/>',
  inbox: '<path d="M-7-2l3-5h8l3 5v7h-14z"/><path d="M-7-2h4l1 2h4l1-2h4"/>',
  gear: '<circle r="3"/><path d="M0-7v3M0 4v3M-7 0h3M4 0h3M-5-5l2 2M3 3l2 2M5-5l-2 2M-3 3l-2 2"/>',
  person: '<circle cy="-4" r="3.6"/><path d="M-6 7c0-5 3-7 6-7s6 2 6 7"/>',
  booth: '<path d="M-8-4h16l-2-4h-12z"/><path d="M-7-4v10h14V-4M-3 6V1h6v5"/>',
  clipboard: '<rect x="-6" y="-6" width="12" height="14" rx="1.5"/><path d="M-2-7h4v2h-4zM-3 0l2 2 4-4"/>',
  pan: '<circle cx="-2" cy="1" r="5"/><path d="M3 1h6"/><path d="M-4-7c0 2 2 2 2 4M0-7c0 2 2 2 2 4"/>',
  router: '<rect x="-8" y="-2" width="16" height="7" rx="1.5"/><path d="M-4-2v-5M4-2v-5"/><circle cx="-4" cy="1.5" r=".9"/><circle cx="0" cy="1.5" r=".9"/><path d="M3 1.5h3"/>',
  bolt: '<path d="M1.5-8l-6.5 9.5h5L-1 8l6.5-9.5h-5z"/>',
  card: '<rect x="-7" y="-5" width="14" height="10" rx="1.5"/><path d="M-4-1h8M-4 2h5"/>',
};

export interface BlockOptions {
  tone: Tone;
  label: string;
  sub?: string;
  icon?: keyof typeof ICONS;
  part?: string;
  down?: boolean;
  faded?: boolean;
  w?: number;
  d?: number;
  h?: number;
}

/** A labelled component block (the pastel cubes of the reference). */
export function block(f: Frame, x: number, y: number, o: BlockOptions, visual: Visual) {
  const w = o.w ?? 2.8;
  const d = o.d ?? 2.8;
  const h = o.h ?? 2.1;
  const [cx, cy] = f.p(x + w / 2, y + d / 2, h);
  const [fx, fy] = f.p(x + w, y + d, h / 2);
  const tone = o.down ? "grey" : o.tone;
  const label = `<g class="sys-label" transform="translate(${round((cx + fx) / 2)} ${round(cy + (fy - cy) * 0.55 + 10)})">${o.icon ? `<g class="sys-icon" transform="translate(0 -15)">${ICONS[o.icon]}</g>` : ""}<text y="2">${esc(o.label)}</text>${o.sub ? `<text class="sys-sub" y="15">${esc(o.sub)}</text>` : ""}</g>`;
  const cross = o.down ? `<path class="sys-x" d="M${cx - 9} ${cy - 9}l18 18M${cx + 9} ${cy - 9}l-18 18"/>` : "";
  const [sx, sy] = f.p(x + w / 2, y + d / 2, 0);
  const halo = visual.highlight.has(o.part ?? "") ? `<ellipse class="sys-halo" cx="${sx}" cy="${sy}" rx="${round(w * f.unit * 1.05)}" ry="${round(d * f.unit * 0.6)}"/>` : "";
  const silhouette = [f.p(x,y,h),f.p(x+w,y,h),f.p(x+w,y,0),f.p(x+w,y+d,0),f.p(x,y+d,0),f.p(x,y+d,h)];
  return `<g class="sys-node sys-component"${partAttrs(o.part, visual)}${o.faded ? " data-faded" : ""}>${halo}${box(f, x, y, w, d, h, tone)}<path class="sys-block-outline" d="${roundedFace(silhouette,8)}"/>${label}${cross}</g>`;
}

/** A browser on a real laptop, on the same isometric plane as the services. */
export function laptop(f: Frame, x: number, y: number, part: string, visual: Visual) {
  const screen=[f.p(x+.2,y+.45,2.9),f.p(x+2.2,y+.45,2.9),f.p(x+2.2,y+.45,.6),f.p(x+.2,y+.45,.6)];
  const inset=[f.p(x+.34,y+.45,2.7),f.p(x+2.06,y+.45,2.7),f.p(x+2.06,y+.45,.85),f.p(x+.34,y+.45,.85)];
  const lines=[1.4,1.8,2.2].map(z=>{const a=f.p(x+.55,y+.46,z),b=f.p(x+1.8,y+.46,z);return `<path d="M${a.join(' ')}L${b.join(' ')}"/>`;}).join('');
  return `<g class="sys-node sys-laptop"${partAttrs(part,visual)}>${box(f,x-.35,y-.3,3.1,3,.35,'cream')}${box(f,x+.05,y+.4,2.4,2.05,.52,'grey')}<polygon class="laptop-case" points="${pts(screen)}"/><polygon class="laptop-display" points="${pts(inset)}"/><g class="laptop-lines">${lines}</g></g>`;
}

/** A low platform carrying a crowd of people (users, creators…). */
export function crowd(f: Frame, x: number, y: number, w: number, d: number, count: number, part: string | undefined, visual: Visual) {
  const people: string[] = [];
  const cols = Math.ceil(Math.sqrt(count * (w / d)));
  const rows = Math.ceil(count / cols);
  const tones = ["blue", "orange", "green", "violet", "yellow"];
  const spots: { s: [number, number]; tone: string }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols && spots.length < count; c++) {
      const px = x + ((c + 0.5) / cols) * w;
      const py = y + ((r + 0.5) / rows) * d;
      spots.push({ s: f.p(px, py, 0.35), tone: tones[(r * 3 + c) % tones.length] });
    }
  spots.sort((a, b) => a.s[1] - b.s[1]);
  for (const { s, tone } of spots) {
    const [px, py] = s;
    people.push(`<g class="sys-person" data-tone="${tone}"><rect x="${px - 4}" y="${py - 14}" width="8" height="13" rx="4"/><circle cx="${px}" cy="${py - 18}" r="3.6"/></g>`);
  }
  return `<g class="sys-node"${partAttrs(part, visual)}>${box(f, x - 0.3, y - 0.3, w + 0.6, d + 0.6, 0.35, "cream")}${people.join("")}</g>`;
}

/** An edge between world points (polyline), with an optional arrowhead at the end. */
export function edge(f: Frame, points: Vec3[], o: { part?: string; dashed?: boolean; arrow?: boolean; faded?: boolean }, visual: Visual) {
  const s = points.map(([x, y, z]) => f.p(x, y, z));
  const d = s.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("");
  let head = "";
  if (o.arrow && s.length > 1) {
    const [ax, ay] = s[s.length - 2];
    const [bx, by] = s[s.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / len;
    const uy = (by - ay) / len;
    head = `<path class="sys-arrow" d="M${round(bx - ux * 8 - uy * 4.5)} ${round(by - uy * 8 + ux * 4.5)}L${bx} ${by}L${round(bx - ux * 8 + uy * 4.5)} ${round(by - uy * 8 - ux * 4.5)}"/>`;
  }
  return `<g class="sys-edge"${partAttrs(o.part, visual)}${o.dashed ? " data-dashed" : ""}${o.faded ? " data-faded" : ""}><path class="sys-hit" d="${d}"/><path d="${d}"/>${head}</g>`;
}

/** Point along a polyline of world points at share t (0…1), by length. */
export function along(points: Vec3[], t: number): Vec3 {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1], points[i][2] - points[i - 1][2]));
  const total = lengths[lengths.length - 1] || 1;
  const target = clamp01(t) * total;
  let i = 1;
  while (i < points.length - 1 && lengths[i] < target) i++;
  const span = lengths[i] - lengths[i - 1] || 1;
  const k = (target - lengths[i - 1]) / span;
  const [a, b] = [points[i - 1], points[i]];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export type TokenKind = "request" | "response" | "probe" | "fail" | "message" | "retry" | "referral" | "answer" | "old";

/** A small token: an isometric tile, or a cross for a failure. */
export function token(f: Frame, at: Vec3, kind: TokenKind, opacity = 1) {
  const [x, y] = f.p(at[0], at[1], at[2] + 0.15);
  const o = opacity < 0.999 ? ` opacity="${round(opacity)}"` : "";
  if (kind === "fail") return `<g class="sys-token" data-kind="fail"${o}><circle cx="${x}" cy="${y}" r="6.5"/><path d="M${x - 3} ${y - 3}l6 6M${x + 3} ${y - 3}l-6 6"/></g>`;
  if (kind === "probe" || kind === "response") return `<circle class="sys-token" data-kind="${kind}" cx="${x}" cy="${y}" r="4.6"${o}/>`;
  return `<path class="sys-token" data-kind="${kind}" d="M${x} ${y - 5.5}L${x + 7} ${y}L${x} ${y + 5.5}L${x - 7} ${y}Z"${o}/>`;
}

/** A pill label in screen space, centred on (x, y). */
export function pill(x: number, y: number, text: string, o: { tone?: "plain" | "ok" | "warn" | "bad" | "info"; part?: string; small?: boolean } = {}, visual?: Visual) {
  const size = o.small ? 11 : 12.5;
  const width = Math.max(28, text.length * size * 0.56 + 18);
  const height = o.small ? 18 : 22;
  return `<g class="sys-pill" data-tone="${o.tone ?? "plain"}"${visual ? partAttrs(o.part, visual) : ""} transform="translate(${round(x - width / 2)} ${round(y - height / 2)})"><rect class="sys-pill-drop" x="1.5" y="2.5" width="${round(width)}" height="${height}" rx="${height / 2}"/><rect x="0" y="0" width="${round(width)}" height="${height}" rx="${height / 2}"/><text x="${round(width / 2)}" y="${round(height / 2 + size * 0.36)}" font-size="${size}">${esc(text)}</text></g>`;
}

/** A dashed zone on the floor (the queue area), with its label along the front edge. */
export function zone(f: Frame, x: number, y: number, w: number, d: number, label: string, part: string | undefined, visual: Visual) {
  const corners = [f.p(x, y), f.p(x + w, y), f.p(x + w, y + d), f.p(x, y + d)];
  const [lx, ly] = f.p(x + w / 2, y + d, 0);
  const [ax, ay] = f.p(x, y + d);
  const [bx, by] = f.p(x + w, y + d);
  const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
  return `<g class="sys-zone"${partAttrs(part, visual)}><polygon points="${pts(corners)}"/><text transform="translate(${lx} ${ly + 13}) rotate(${round(angle)})">${esc(label)}</text></g>`;
}
