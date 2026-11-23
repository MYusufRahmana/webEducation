import { describe, expect, it } from "vitest";
import { advance, createHttpsSim, send, tamper, type HttpsLog, type HttpsSim } from "./model";
import { HTTPS_STEPS } from "./scenarios";

const of = <K extends HttpsLog["kind"]>(sim: HttpsSim, kind: K) => sim.log.filter((e): e is Extract<HttpsLog, { kind: K }> => e.kind === kind);
const run = (i: number) => advance(HTTPS_STEPS[i].build(), HTTPS_STEPS[i].holdAt);

describe("HTTPS lesson model", () => {
  it("step 1: over plain HTTP the observer reads the message", () => {
    const sim = run(0);
    expect(sim.observed).toEqual(expect.objectContaining({ text: "Pesan rahasia", readable: true }));
    expect(sim.readableOnPath).toBe(1);
    expect(sim.received?.text).toBe("Pesan rahasia");
  });
  it("step 2: the certificate is checked against the domain before any data is sent", () => {
    const sim = run(1);
    expect(sim.cert.checked && sim.cert.valid).toBe(true);
    expect(sim.sent).toBe(0);
  });
  it("step 3: setup messages come before the connection is protected; no data travels", () => {
    const sim = run(2);
    expect(sim.setupMsgs).toBe(4);
    expect(sim.conn).toBe("secure");
    expect(sim.sent).toBe(0);
    const secureAt = of(sim, "secure")[0].at;
    expect(of(sim, "sent").every((e) => e.at < secureAt)).toBe(true);
  });
  it("step 4: on a protected connection the observer cannot read the content, the server can", () => {
    const sim = run(3);
    expect(sim.observed?.readable).toBe(false);
    expect(sim.readableOnPath).toBe(0);
    expect(sim.received).toEqual(expect.objectContaining({ text: "Pesan rahasia", ok: true }));
  });
  it("step 5: a message changed on the way is rejected", () => {
    const sim = run(4);
    expect(of(sim, "tampered").length).toBe(1);
    expect(sim.rejected).toBe(1);
    expect(sim.received?.ok).toBe(false);
    expect(of(sim, "accepted").length).toBe(0);
  });
  it("without protection a change is not detected", () => {
    const sim = createHttpsSim();
    send(sim, "Halo");
    advance(sim, 1);
    expect(tamper(sim)).toBe(true);
    advance(sim, 3);
    expect(sim.rejected).toBe(0);
    expect(sim.received?.text).toContain("diubah");
  });
  it("every scene finishes before it holds, and replays identically", () => {
    for (const step of HTTPS_STEPS) {
      const a = advance(step.build(), step.holdAt);
      expect(a.msgs.every((m) => m.result !== "pending")).toBe(true);
      expect(JSON.stringify(advance(step.build(), step.holdAt).log)).toBe(JSON.stringify(a.log));
    }
  });
});
