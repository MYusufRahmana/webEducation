import { describe, expect, it } from "vitest";
import { advance, check, createRateSim, type RateLog, type RateSim } from "./model";
import { RATE_STEPS } from "./scenarios";

const of = <K extends RateLog["kind"]>(sim: RateSim, kind: K) => sim.log.filter((e): e is Extract<RateLog, { kind: K }> => e.kind === kind);
const play = (key: string) => {
  const s = RATE_STEPS.find((x) => x.key === key)!;
  const sim = s.build();
  return advance(sim, s.holdAt - sim.t);
};

describe("Rate limiting model", () => {
  it("step 1: one press is one request, served by the server and answered", () => {
    const sim = play("cek-kursi");
    expect(of(sim, "sent")).toHaveLength(1);
    expect(sim.served).toBe(1);
    expect(sim.screen.Andi?.ok).toBe(true);
  });
  it("step 2: without a limiter Andi's many requests fill the server's line and Budi waits behind them", () => {
    const sim = play("terlalu-cepat");
    expect(sim.limited).toBe(0);
    expect(sim.maxLine).toBeGreaterThanOrEqual(4);
    const served = of(sim, "served").map((e) => e.who);
    expect(served.indexOf("Budi")).toBeGreaterThanOrEqual(4);
    expect(sim.served).toBe(8);
  });
  it("step 3: with the limiter a forwarded request is counted for its account", () => {
    const sim = play("pasang-pemeriksa");
    expect(of(sim, "forwarded")[0]).toEqual(expect.objectContaining({ who: "Andi", count: 1 }));
    expect(sim.counts).toEqual({ Andi: 1, Budi: 0 });
  });
  it("step 4: five requests are forwarded, the sixth gets 429 at the limiter and never reaches the server", () => {
    const sim = play("jatah-habis");
    expect(of(sim, "forwarded")).toHaveLength(5);
    const limited = of(sim, "limited");
    expect(limited).toHaveLength(1);
    expect(limited[0].retryIn).toBeGreaterThan(0);
    expect(sim.served).toBe(5);
    expect(sim.counts.Andi).toBe(5);
    expect(sim.screen.Andi?.text ?? "").toMatch(/Selesai|Kursi|Coba lagi/);
  });
  it("step 5: Andi stays at 5/5 and is told to wait; Budi has his own count and is served", () => {
    const sim = play("budi-tetap-bisa");
    expect(of(sim, "limited").map((e) => e.who)).toEqual(["Andi"]);
    expect(sim.counts).toEqual({ Andi: 5, Budi: 1 });
    expect(of(sim, "served").map((e) => e.who)).toEqual(["Budi"]);
  });
  it("step 6: the window resets every count to 0 and Andi is served again", () => {
    const sim = play("coba-lagi");
    const reset = of(sim, "reset")[0];
    expect(reset.windowStart).toBe(10);
    const limited = of(sim, "limited")[0];
    expect(limited.at).toBeLessThan(reset.at);
    const forwarded = of(sim, "forwarded").filter((e) => e.who === "Andi");
    expect(forwarded[0].at).toBeGreaterThan(reset.at);
    expect(forwarded[0].count).toBe(1);
    expect(sim.screen.Andi?.ok).toBe(true);
  });
  it("a limited request is not queued at the server", () => {
    const sim = createRateSim({ counts: { Andi: 5 } });
    check(sim, "Andi");
    advance(sim, 1.05);
    expect(sim.line).toHaveLength(0);
    expect(sim.reqs[0].stage).toBe("gate-back");
  });
  it("the counter only resets at the window boundary, never gradually", () => {
    const sim = createRateSim({ counts: { Andi: 5 } });
    advance(sim, 9.9);
    expect(sim.counts.Andi).toBe(5);
    advance(sim, 0.2);
    expect(sim.counts.Andi).toBe(0);
  });
  it("every scene finishes before it holds, and replays identically", () => {
    for (const s of RATE_STEPS) {
      const a = play(s.key);
      expect(a.reqs.every((r) => r.doneAt !== null)).toBe(true);
      expect(JSON.stringify(play(s.key).log)).toBe(JSON.stringify(a.log));
    }
  });
});
