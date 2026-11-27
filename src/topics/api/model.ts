/**
 * Web API simulation for one fictional concert service. Pure and deterministic; nothing leaves the page.
 *
 * A request travels frontend → API endpoint (part of the backend) → request check → application logic →
 * (database, only when needed) → back to the frontend, which turns the response into what the user sees.
 * Each exchange moves through named phases, so the figure, the status strip and the cards always agree.
 *
 * The contract is the demo's own: GET /api/konser/{id}, GET /api/konser?kota=…, POST /api/pesanan.
 * The user comes from the login session; the price always comes from trusted data, never from the body.
 */

export type Method = "GET" | "POST";
export type Client = "web" | "hp" | "client" | "tool";
export type Server = "tiket" | "echo";

export interface Req {
  method: Method;
  /** Path with any query string, exactly as sent. */
  url: string;
  headers: Record<string, string>;
  /** Raw body text (JSON in this demo), or null. */
  body: string | null;
}
export interface Res {
  status: number;
  text: string;
  body: unknown;
}

export interface Category {
  kode: string;
  nama: string;
  harga: number;
}
export interface Concert {
  id: number;
  nama: string;
  lokasi: string;
  kategori: Category[];
}
export interface Order {
  kode_pesanan: string;
  konser_id: number;
  kategori: string;
  jumlah: number;
  total: number;
  status: "menunggu_pembayaran";
  pengguna: string;
}

export type Phase = "prepare" | "send" | "check" | "process" | "db" | "db-back" | "reply" | "render" | "done";
/** What the user sees for each phase (the status strip). */
export const PHASE_LABEL: Record<Phase, string> = {
  prepare: "Menyiapkan permintaan",
  send: "Mengirim",
  check: "Memeriksa",
  process: "Memproses",
  db: "Memproses",
  "db-back": "Memproses",
  reply: "Mengirim jawaban",
  render: "Memperbarui tampilan",
  done: "Selesai",
};
export const STRIP: Phase[] = ["prepare", "send", "check", "process", "reply", "render"];

export interface Exchange {
  id: number;
  from: Client;
  req: Req;
  res: Res | null;
  phase: Phase;
  since: number;
  until: number;
  startedAt: number;
  doneAt: number | null;
  /** Set when the check rejects the request: the request never reaches the application logic. */
  rejected: Res | null;
  /** The database visit this request needs, decided while processing. */
  db: "read" | "write" | null;
  /** A note the backend adds while processing (who the user is, where the price comes from). */
  note: string | null;
}

export interface Screen {
  loading: boolean;
  concert: Concert | null;
  order: Order | null;
  error: string | null;
}

export interface ClientForm {
  method: Method;
  target: "konser" | "daftar" | "pesanan";
  konserId: number;
  jumlah: number;
  contentType: boolean;
}

export type ApiAction =
  | { at: number; kind: "view"; from?: "web" | "hp"; id?: number }
  | { at: number; kind: "order"; jumlah: number; konserId?: number }
  | { at: number; kind: "send" }
  | { at: number; kind: "echo" };

export type ApiLog =
  | { at: number; kind: "sent"; id: number; from: Client; method: Method; url: string }
  | { at: number; kind: "rejected"; id: number; status: number }
  | { at: number; kind: "db"; id: number; access: "read" | "write" }
  | { at: number; kind: "response"; id: number; status: number; from: Client }
  | { at: number; kind: "rendered"; id: number; from: Client };

export interface ApiSim {
  t: number;
  server: Server;
  concerts: Concert[];
  orders: Order[];
  nextOrder: number;
  exchanges: Exchange[];
  nextId: number;
  screens: Record<"web" | "hp", Screen>;
  /** Clients drawn in the figure. */
  clients: Client[];
  form: ClientForm;
  /** The request part picked in the "parts of a request" scene. */
  part: string;
  /** The message card shown larger, if any. */
  zoom: "req" | "res" | null;
  /** The logged-in user, known to the backend from the session. */
  session: string;
  script: ApiAction[];
  log: ApiLog[];
}

export const CONCERTS: Concert[] = [{ id: 101, nama: "Konser Senja", lokasi: "Jakarta", kategori: [{ kode: "REG", nama: "Reguler", harga: 350000 }] }];

export const DURATION: Record<Exclude<Phase, "done">, number> = {
  prepare: 0.8,
  send: 1.3,
  check: 0.9,
  process: 0.8,
  db: 1.0,
  "db-back": 1.0,
  reply: 1.3,
  render: 0.9,
};
const EPS = 1e-9;

export const blankScreen = (): Screen => ({ loading: false, concert: null, order: null, error: null });

export interface ApiSeed {
  server?: Server;
  clients?: Client[];
  /** The concert card is already on the screen. */
  loaded?: boolean;
  orders?: number;
  form?: Partial<ClientForm>;
  part?: string;
  script?: ApiAction[];
}

export function createApiSim(seed: ApiSeed = {}): ApiSim {
  const sim: ApiSim = {
    t: 0,
    server: seed.server ?? "tiket",
    concerts: CONCERTS.map((c) => ({ ...c, kategori: c.kategori.map((k) => ({ ...k })) })),
    orders: [],
    nextOrder: 1,
    exchanges: [],
    nextId: 1,
    screens: { web: blankScreen(), hp: blankScreen() },
    clients: seed.clients ?? ["web"],
    form: { method: "GET", target: "konser", konserId: 101, jumlah: 2, contentType: true, ...seed.form },
    part: seed.part ?? "method",
    zoom: null,
    session: "Andi",
    script: [...(seed.script ?? [])].sort((a, b) => a.at - b.at),
    log: [],
  };
  if (seed.loaded) sim.screens.web.concert = sim.concerts[0];
  for (let i = 0; i < (seed.orders ?? 0); i++) writeOrder(sim, 101, "REG", 2);
  return sim;
}

/* ---------------------------------------------------------------- requests */
export const viewRequest = (id = 101): Req => ({ method: "GET", url: `/api/konser/${id}`, headers: { Accept: "application/json" }, body: null });
export const orderRequest = (jumlah: number, konserId = 101): Req => ({
  method: "POST",
  url: "/api/pesanan",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ konser_id: konserId, kategori: "REG", jumlah }, null, 2),
});
export const ECHO_URL = "https://postman-echo.com/get?konser=Senja&jumlah=2";

/** The request the mini API client would send for its current form. */
export function formRequest(f: ClientForm): Req {
  const url = f.target === "konser" ? `/api/konser/${f.konserId}` : f.target === "daftar" ? "/api/konser?kota=Jakarta" : "/api/pesanan";
  const headers: Record<string, string> = f.method === "POST" && f.contentType ? { "Content-Type": "application/json" } : f.method === "GET" ? { Accept: "application/json" } : {};
  const body = f.method === "POST" ? JSON.stringify({ konser_id: f.konserId, kategori: "REG", jumlah: f.jumlah }, null, 2) : null;
  return { method: f.method, url, headers, body };
}

export function send(sim: ApiSim, from: Client, req: Req) {
  const x: Exchange = { id: sim.nextId++, from, req, res: null, phase: "prepare", since: sim.t, until: sim.t + DURATION.prepare, startedAt: sim.t, doneAt: null, rejected: null, db: null, note: null };
  sim.exchanges.push(x);
  if (from === "web" || from === "hp") sim.screens[from] = { ...sim.screens[from], loading: true, error: null };
  sim.log.push({ at: sim.t, kind: "sent", id: x.id, from, method: req.method, url: req.url });
  return x;
}
export const view = (sim: ApiSim, from: "web" | "hp" = "web", id = 101) => send(sim, from, viewRequest(id));
export const placeOrder = (sim: ApiSim, jumlah: number, konserId = 101) => send(sim, "web", orderRequest(jumlah, konserId));
export const sendForm = (sim: ApiSim) => send(sim, "client", formRequest(sim.form));
export const sendEcho = (sim: ApiSim) => send(sim, "tool", { method: "GET", url: ECHO_URL, headers: {}, body: null });

/** Start again: no orders, empty screens, nothing in flight. */
export function resetDemo(sim: ApiSim) {
  sim.orders = [];
  sim.nextOrder = 1;
  sim.exchanges = [];
  sim.screens = { web: { ...blankScreen(), concert: sim.screens.web.concert ? sim.concerts[0] : null }, hp: blankScreen() };
}

/* ---------------------------------------------------------------- the backend, step by step */
const err = (status: number, text: string, message: string): Res => ({ status, text, body: { error: message } });
const pathOf = (url: string) => url.split("?")[0];
const queryOf = (url: string) => Object.fromEntries(new URLSearchParams(url.split("?")[1] ?? ""));

/** Step "check": the endpoint exists, the method fits, the body is well-formed and valid. */
export function check(sim: ApiSim, req: Req): Res | null {
  if (sim.server === "echo") return null;
  const path = pathOf(req.url);
  if (/^\/api\/konser\/[^/]+$/.test(path)) {
    if (req.method !== "GET") return err(405, "Method Not Allowed", "Endpoint ini hanya menerima GET.");
    if (!/^\d+$/.test(path.split("/").pop()!)) return err(400, "Bad Request", "ID konser harus berupa angka.");
    return null;
  }
  if (path === "/api/konser") return req.method === "GET" ? null : err(405, "Method Not Allowed", "Endpoint ini hanya menerima GET.");
  if (path === "/api/pesanan") {
    if (req.method !== "POST") return err(405, "Method Not Allowed", "Endpoint ini hanya menerima POST.");
    if ((req.headers["Content-Type"] ?? "") !== "application/json") return err(415, "Unsupported Media Type", "Body harus dikirim sebagai application/json.");
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(req.body ?? "");
    } catch {
      return err(400, "Bad Request", "Body bukan JSON yang valid.");
    }
    const jumlah = body.jumlah;
    if (typeof jumlah !== "number" || !Number.isInteger(jumlah) || jumlah < 1) return err(400, "Bad Request", "Jumlah tiket minimal 1.");
    if (typeof body.konser_id !== "number") return err(400, "Bad Request", "konser_id wajib berupa angka.");
    if (typeof body.kategori !== "string") return err(400, "Bad Request", "Kategori wajib diisi.");
    return null;
  }
  return err(404, "Not Found", "Endpoint tidak ditemukan.");
}

/** Which database access a checked request needs (none for the echo service). */
export function needsDb(sim: ApiSim, req: Req): "read" | "write" | null {
  if (sim.server === "echo") return null;
  if (req.method !== "POST") return "read";
  // a new order is written only when the concert and its category exist; otherwise the visit only reads
  const body = JSON.parse(req.body ?? "{}");
  const c = sim.concerts.find((x) => x.id === body.konser_id);
  return c && c.kategori.some((k) => k.kode === body.kategori) ? "write" : "read";
}

function writeOrder(sim: ApiSim, konserId: number, kategori: string, jumlah: number) {
  const concert = sim.concerts.find((c) => c.id === konserId)!;
  const harga = concert.kategori.find((k) => k.kode === kategori)!.harga;
  const order: Order = { kode_pesanan: `TKT-${String(sim.nextOrder++).padStart(3, "0")}`, konser_id: konserId, kategori, jumlah, total: harga * jumlah, status: "menunggu_pembayaran", pengguna: sim.session };
  sim.orders.push(order);
  return order;
}

/** Step "process" + database: the response for a request that passed the check. */
export function answer(sim: ApiSim, req: Req): { res: Res; wrote: boolean } {
  if (sim.server === "echo") return { res: { status: 200, text: "OK", body: { args: queryOf(req.url), url: req.url } }, wrote: false };
  const path = pathOf(req.url);
  if (path === "/api/konser") {
    const kota = queryOf(req.url).kota;
    const list = sim.concerts.filter((c) => !kota || c.lokasi === kota).map((c) => ({ id: c.id, nama: c.nama, lokasi: c.lokasi }));
    return { res: { status: 200, text: "OK", body: list }, wrote: false };
  }
  if (path.startsWith("/api/konser/")) {
    const c = sim.concerts.find((x) => x.id === Number(path.split("/").pop()));
    return { res: c ? { status: 200, text: "OK", body: c } : err(404, "Not Found", "Konser tidak ditemukan."), wrote: false };
  }
  const body = JSON.parse(req.body!);
  const c = sim.concerts.find((x) => x.id === body.konser_id);
  if (!c) return { res: err(404, "Not Found", "Konser tidak ditemukan."), wrote: false };
  if (!c.kategori.some((k) => k.kode === body.kategori)) return { res: err(400, "Bad Request", "Kategori tidak tersedia."), wrote: false };
  // the user comes from the session, the price from trusted data: anything else in the body is ignored
  const o = writeOrder(sim, c.id, body.kategori, body.jumlah);
  return { res: { status: 201, text: "Created", body: { kode_pesanan: o.kode_pesanan, jumlah: o.jumlah, total: o.total, status: o.status } }, wrote: true };
}

function enter(sim: ApiSim, x: Exchange, phase: Phase) {
  x.phase = phase;
  x.since = sim.t;
  x.until = phase === "done" ? Infinity : sim.t + DURATION[phase];
}

function step(sim: ApiSim, x: Exchange) {
  switch (x.phase) {
    case "prepare":
      return enter(sim, x, "send");
    case "send":
      return enter(sim, x, "check");
    case "check": {
      const bad = check(sim, x.req);
      if (bad) {
        x.rejected = bad;
        x.res = bad;
        sim.log.push({ at: sim.t, kind: "rejected", id: x.id, status: bad.status });
        return enter(sim, x, "reply");
      }
      return enter(sim, x, "process");
    }
    case "process":
      x.db = needsDb(sim, x.req);
      if (x.req.method === "POST" && sim.server === "tiket") x.note = `Pengguna: ${sim.session} (dari sesi login) · harga dari data konser`;
      if (!x.db) {
        x.res = answer(sim, x.req).res;
        return enter(sim, x, "reply");
      }
      return enter(sim, x, "db");
    case "db": {
      const { res, wrote } = answer(sim, x.req);
      x.res = res;
      // a POST that fails while processing only read; it changes nothing
      if (!wrote) x.db = "read";
      sim.log.push({ at: sim.t, kind: "db", id: x.id, access: x.db! });
      return enter(sim, x, "db-back");
    }
    case "db-back":
      return enter(sim, x, "reply");
    case "reply":
      sim.log.push({ at: sim.t, kind: "response", id: x.id, status: x.res!.status, from: x.from });
      return enter(sim, x, "render");
    case "render": {
      if (x.from === "web" || x.from === "hp") render(sim, x);
      sim.log.push({ at: sim.t, kind: "rendered", id: x.id, from: x.from });
      x.doneAt = sim.t;
      return enter(sim, x, "done");
    }
  }
}

/** The frontend turns the response into the screen. */
function render(sim: ApiSim, x: Exchange) {
  const s = sim.screens[x.from as "web" | "hp"];
  const res = x.res!;
  s.loading = false;
  if (res.status >= 400) s.error = (res.body as { error: string }).error;
  else if (x.req.method === "GET") s.concert = res.body as Concert;
  else s.order = sim.orders.find((o) => o.kode_pesanan === (res.body as { kode_pesanan: string }).kode_pesanan) ?? null;
}

function apply(sim: ApiSim, a: ApiAction) {
  if (a.kind === "view") view(sim, a.from ?? "web", a.id ?? 101);
  else if (a.kind === "order") placeOrder(sim, a.jumlah, a.konserId ?? 101);
  else if (a.kind === "send") sendForm(sim);
  else sendEcho(sim);
}

export function advance(sim: ApiSim, dt: number): ApiSim {
  const until = sim.t + Math.max(0, dt);
  for (let guard = 0; guard < 10000; guard++) {
    let next: { at: number; run: () => void } | null = null;
    const offer = (when: number, run: () => void) => {
      if (when <= until + EPS && (!next || when < next.at - EPS)) next = { at: when, run };
    };
    if (sim.script.length) {
      const a = sim.script[0];
      offer(a.at, () => (sim.script.shift(), apply(sim, a)));
    }
    for (const x of sim.exchanges) if (x.phase !== "done") offer(x.until, () => step(sim, x));
    if (!next) break;
    const chosen = next as { at: number; run: () => void };
    sim.t = Math.max(sim.t, chosen.at);
    chosen.run();
  }
  sim.t = until;
  return sim;
}

/* ---------------------------------------------------------------- reading the state */
/** The exchange the figure follows: the newest one. */
export const current = (sim: ApiSim) => sim.exchanges[sim.exchanges.length - 1] ?? null;
export const progressOf = (x: Exchange, t: number) => (x.phase === "done" ? 1 : Math.max(0, Math.min(1, (t - x.since) / (x.until - x.since || 1))));
/** Simulated latency in ms for a finished exchange: a fixed recipe, labelled as simulation, never measured. */
export function simulatedMs(x: Exchange) {
  return 2 * 24 + 6 + (x.rejected ? 0 : 8) + (x.db ? 2 * 7 + (x.db === "write" ? 18 : 9) : 0);
}
export const pretty = (body: unknown) => JSON.stringify(body, null, 2);
