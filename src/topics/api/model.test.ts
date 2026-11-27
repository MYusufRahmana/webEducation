import { describe, expect, it } from "vitest";
import { advance, createApiSim, formRequest, orderRequest, placeOrder, resetDemo, send, simulatedMs, view, type ApiLog, type ApiSim } from "./model";
import { API_STEPS } from "./scenarios";

const of = <K extends ApiLog["kind"]>(sim: ApiSim, kind: K) => sim.log.filter((e): e is Extract<ApiLog, { kind: K }> => e.kind === kind);
const play = (key: string) => {
  const s = API_STEPS.find((x) => x.key === key)!;
  const sim = s.build();
  return advance(sim, s.holdAt - sim.t);
};
const last = (sim: ApiSim) => sim.exchanges[sim.exchanges.length - 1];

describe("API model", () => {
  it("GET /api/konser/101: checked, reads the database, 200 with the concert, then the screen shows it", () => {
    const sim = play("satu-tombol");
    const x = last(sim);
    expect(x.res).toEqual(expect.objectContaining({ status: 200, text: "OK" }));
    expect((x.res!.body as { nama: string }).nama).toBe("Konser Senja");
    expect(of(sim, "db")).toEqual([expect.objectContaining({ access: "read" })]);
    expect(sim.screens.web.concert?.lokasi).toBe("Jakarta");
    expect(x.phase).toBe("done");
  });

  it("the screen only changes after the response arrives (the button does not fetch by itself)", () => {
    const sim = createApiSim();
    view(sim);
    advance(sim, 6);
    expect(sim.screens.web.concert).toBeNull();
    expect(sim.screens.web.loading).toBe(true);
    advance(sim, 3);
    expect(sim.screens.web.concert).not.toBeNull();
  });

  it("website and phone use the same endpoint and get the same data", () => {
    const sim = play("tampilan-berbeda");
    const urls = of(sim, "sent").map((e) => [e.from, e.url]);
    expect(urls).toEqual([
      ["web", "/api/konser/101"],
      ["hp", "/api/konser/101"],
    ]);
    expect(sim.screens.hp.concert).toEqual(sim.screens.web.concert);
  });

  it("POST 2 tickets: 201, total from trusted price, user from the session, written once", () => {
    const sim = play("buat-pesanan");
    const x = last(sim);
    expect(x.res).toEqual({ status: 201, text: "Created", body: { kode_pesanan: "TKT-001", jumlah: 2, total: 700000, status: "menunggu_pembayaran" } });
    expect(sim.orders).toHaveLength(1);
    expect(sim.orders[0].pengguna).toBe("Andi");
    expect(of(sim, "db")[0].access).toBe("write");
  });

  it("a total or user sent in the body is ignored", () => {
    const sim = createApiSim();
    send(sim, "client", { method: "POST", url: "/api/pesanan", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ konser_id: 101, kategori: "REG", jumlah: 2, total: 1, pengguna: "Budi" }) });
    advance(sim, 12);
    expect((last(sim).res!.body as { total: number }).total).toBe(700000);
    expect(sim.orders[0].pengguna).toBe("Andi");
  });

  it("jumlah 0: 400 at the check, no processing, no database, no order changed", () => {
    const sim = play("periksa-dulu");
    const x = last(sim);
    expect(x.res).toEqual({ status: 400, text: "Bad Request", body: { error: "Jumlah tiket minimal 1." } });
    expect(x.db).toBeNull();
    expect(of(sim, "db")).toHaveLength(0);
    expect(sim.orders).toHaveLength(1);
  });

  it("concert 999: 404 after a read; nothing written", () => {
    const sim = createApiSim();
    placeOrder(sim, 2, 999);
    advance(sim, 12);
    expect(last(sim).res).toEqual({ status: 404, text: "Not Found", body: { error: "Konser tidak ditemukan." } });
    expect(of(sim, "db")[0].access).toBe("read");
    expect(sim.orders).toHaveLength(0);
    const get = createApiSim();
    view(get, "web", 999);
    advance(get, 12);
    expect(last(get).res!.status).toBe(404);
  });

  it("the contract: wrong method 405, missing Content-Type 415, unknown endpoint 404, query parameter filters", () => {
    const run = (req: Parameters<typeof send>[2]) => {
      const sim = createApiSim();
      send(sim, "client", req);
      advance(sim, 12);
      return last(sim).res!;
    };
    expect(run(formRequest({ method: "GET", target: "pesanan", konserId: 101, jumlah: 2, contentType: true })).status).toBe(405);
    expect(run({ ...orderRequest(2), headers: {} }).status).toBe(415);
    expect(run({ method: "GET", url: "/api/tiket", headers: {}, body: null }).status).toBe(404);
    expect(run(formRequest({ method: "GET", target: "daftar", konserId: 101, jumlah: 2, contentType: true }))).toEqual({ status: 200, text: "OK", body: [{ id: 101, nama: "Konser Senja", lokasi: "Jakarta" }] });
  });

  it("reset demo clears orders and the next order is TKT-001 again", () => {
    const sim = createApiSim({ orders: 3 });
    resetDemo(sim);
    placeOrder(sim, 2);
    advance(sim, 12);
    expect((last(sim).res!.body as { kode_pesanan: string }).kode_pesanan).toBe("TKT-001");
  });

  it("the echo service returns the query parameters as text and stores nothing", () => {
    const sim = play("api-sungguhan");
    expect(last(sim).res).toEqual(expect.objectContaining({ status: 200, body: expect.objectContaining({ args: { konser: "Senja", jumlah: "2" } }) }));
    expect(of(sim, "db")).toHaveLength(0);
  });

  it("simulated time is a fixed recipe: rejected < read < write", () => {
    const a = play("periksa-dulu");
    const b = play("satu-tombol");
    const c = play("buat-pesanan");
    expect(simulatedMs(last(a))).toBeLessThan(simulatedMs(last(b)));
    expect(simulatedMs(last(b))).toBeLessThan(simulatedMs(last(c)));
  });

  it("every scene settles", () => {
    for (const s of API_STEPS) expect(() => advance(s.build(), s.holdAt)).not.toThrow();
  });
});
