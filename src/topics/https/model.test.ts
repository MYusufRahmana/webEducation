import { describe, expect, it } from "vitest";
import { addressBar, advance, createHttpsSim, goBack, presentCertificate, SAMPLE_FORM, send, tamper, type HttpsLog, type HttpsSim } from "./model";
import { HTTPS_STEPS } from "./scenarios";

const of = <K extends HttpsLog["kind"]>(sim: HttpsSim, kind: K) => sim.log.filter((e): e is Extract<HttpsLog, { kind: K }> => e.kind === kind);
const step = (key: string) => HTTPS_STEPS.find((s) => s.key === key)!;
const run = (key: string) => advance(step(key).build(), step(key).holdAt);

describe("HTTPS lesson model", () => {
  it("step 1: the order page arrives over plain HTTP and the address bar says “Tidak aman”", () => {
    const sim = run("beli-tiket");
    expect(sim.shown?.text).toContain("pemesanan");
    expect(addressBar(sim)).toEqual(expect.objectContaining({ url: "http://tiket.example", status: "Tidak aman" }));
    expect(sim.sent).toBe(0);
  });
  it("step 2: over HTTP the observer reads the sample form data", () => {
    const sim = run("mengapa-peringatan");
    expect(sim.observed).toEqual(expect.objectContaining({ text: SAMPLE_FORM, readable: true }));
    expect(sim.readableOnPath).toBe(1);
  });
  it("step 3: HTTPS is turned on by the owner on the server side; the connection is not protected yet", () => {
    const sim = run("aktifkan-https");
    expect(of(sim, "installed")).toHaveLength(1);
    expect(sim.https).toBe(true);
    expect(sim.conn).toBe("plain");
  });
  it("step 4: the certificate is checked before the handshake, and only then the connection is protected", () => {
    const sim = run("periksa-server");
    expect(sim.check).toBe("ok");
    const checkedAt = of(sim, "certificate")[0].at;
    const secureAt = of(sim, "secure")[0].at;
    expect(checkedAt).toBeLessThan(secureAt);
    expect(sim.conn).toBe("secure");
    expect(addressBar(sim).url).toBe("https://tiket.example");
    expect(sim.sent).toBe(0);
  });
  it("step 5: on a protected connection the observer cannot read the data; the server can", () => {
    const sim = run("data-terlindungi");
    expect(sim.observed?.readable).toBe(false);
    expect(sim.readableOnPath).toBe(0);
    expect(sim.received).toEqual(expect.objectContaining({ text: SAMPLE_FORM, ok: true }));
  });
  it("step 6: a protected connection carries the order, but never claims the payment succeeded", () => {
    const sim = run("terpercaya");
    expect(sim.shown?.text).toContain("pembayaran belum diproses");
    expect(sim.log.some((e) => e.kind === "accepted" && /berhasil dibayar|pembayaran berhasil/i.test(e.text))).toBe(false);
  });
  it("a certificate for another domain fails the check: warning, no protected connection, user goes back", () => {
    const sim = createHttpsSim({ https: true, certDomain: "tiket-lain.example" });
    presentCertificate(sim);
    advance(sim, 3);
    expect(sim.check).toBe("fail");
    expect(sim.conn).toBe("untrusted");
    expect(sim.warning).toBe(true);
    expect(goBack(sim)).toBe(true);
    expect(sim.warning).toBe(false);
    expect(sim.conn).not.toBe("secure");
  });
  it("a site without HTTPS has no certificate to present", () => {
    expect(presentCertificate(createHttpsSim())).toBeNull();
  });
  it("a changed message is rejected on a protected connection, but not detected over HTTP", () => {
    const secure = createHttpsSim({ conn: "secure", checked: true });
    send(secure);
    advance(secure, 1);
    tamper(secure);
    advance(secure, 3);
    expect(secure.rejected).toBe(1);
    const plain = createHttpsSim();
    send(plain);
    advance(plain, 1);
    tamper(plain);
    advance(plain, 3);
    expect(plain.rejected).toBe(0);
    expect(plain.received?.text).toContain("diubah");
  });
  it("every scene finishes before it holds, and replays identically", () => {
    for (const s of HTTPS_STEPS) {
      const a = advance(s.build(), s.holdAt);
      expect(a.msgs.every((m) => m.result !== "pending")).toBe(true);
      expect(JSON.stringify(advance(s.build(), s.holdAt).log)).toBe(JSON.stringify(a.log));
    }
  });
});
