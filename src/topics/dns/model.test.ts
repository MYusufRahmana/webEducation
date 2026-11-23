import { describe, expect, it } from "vitest";
import { advance, ask, changeRecord, createDnsSim, type DnsLog, type DnsSim } from "./model";
import { CHANGE_AT, DNS_STEPS, HOLD_CACHE, HOLD_FIRST, HOLD_RESOLVER } from "./scenarios";

const of = <K extends DnsLog["kind"]>(sim: DnsSim, kind: K) => sim.log.filter((entry): entry is Extract<DnsLog, { kind: K }> => entry.kind === kind);
const until = (index: number, t: number) => {
  const sim = DNS_STEPS[index].build();
  return advance(sim, t - sim.t);
};

describe("a first lookup", () => {
  const sim = until(4, HOLD_FIRST);
  it("misses both caches and walks root, TLD and authoritative in that order", () => {
    expect(of(sim, "local")[0].hit).toBe(false);
    expect(of(sim, "resolver")[0].hit).toBe(false);
    expect(of(sim, "referral").map((entry) => entry.from)).toEqual(["root", "tld"]);
    expect(of(sim, "authoritative").length).toBe(1);
    const answer = of(sim, "answer")[0];
    expect(answer.source).toBe("authoritative");
    expect(sim.serverHops).toBe(3);
  });
  it("stores the answer in both caches, the client's for no longer than its limit", () => {
    expect(sim.resolver).not.toBeNull();
    expect(sim.local).not.toBeNull();
    expect(sim.resolver!.expiresAt - sim.resolver!.storedAt).toBeCloseTo(sim.params.ttl);
    expect(sim.local!.expiresAt - sim.local!.storedAt).toBeLessThanOrEqual(sim.params.localMax + 1e-9);
    expect(sim.local!.expiresAt).toBeLessThanOrEqual(sim.resolver!.expiresAt + 1e-9);
  });
});

describe("caches", () => {
  it("answers repeated questions from the client's cache without any network trip", () => {
    const sim = until(5, HOLD_CACHE);
    const local = of(sim, "answer").filter((entry) => entry.source === "local");
    expect(local.length).toBe(2);
    expect(local.every((entry) => entry.took < 0.5)).toBe(true);
    expect(sim.serverHops).toBe(3); // still only the first lookup's three visits
  });

  it("answers from the resolver's cache once the client's copy has expired", () => {
    const sim = until(6, HOLD_RESOLVER);
    const answer = of(sim, "answer").slice(-1)[0];
    expect(answer.source).toBe("resolver");
    expect(answer.took).toBeGreaterThan(1);
    expect(answer.took).toBeLessThan(3);
    expect(sim.serverHops).toBe(3);
  });

  it("can give an old address after the record changed, until the TTL runs out", () => {
    const sim = until(7, 27);
    const after = of(sim, "answer").filter((entry) => entry.at > CHANGE_AT);
    expect(after[0].stale).toBe(true);
    expect(after[0].source).toBe("local");
    const fresh = after.find((entry) => entry.source === "authoritative")!;
    expect(fresh.version).toBe(1);
    expect(fresh.stale).toBe(false);
    expect(of(sim, "expire").map((entry) => entry.cache)).toContain("resolver");
  });
});

describe("steps", () => {
  it("each step starts where the previous one holds", () => {
    for (let i = 1; i < DNS_STEPS.length; i++) expect(DNS_STEPS[i].build().t).toBeLessThanOrEqual(DNS_STEPS[i - 1].holdAt! + 1e-9);
    for (const step of DNS_STEPS) expect(step.holdAt! > step.build().t).toBe(true);
  });
  it("the root and TLD steps end with a referral back at the resolver", () => {
    const root = until(2, DNS_STEPS[2].holdAt!);
    expect(of(root, "referral").map((entry) => entry.from)).toEqual(["root"]);
    const tld = until(3, DNS_STEPS[3].holdAt!);
    expect(of(tld, "referral").map((entry) => entry.from)).toEqual(["root", "tld"]);
    expect(of(tld, "authoritative").length).toBe(0);
  });
});

describe("controls", () => {
  it("is deterministic and independent of frame size", () => {
    const one = until(7, 30);
    const many = DNS_STEPS[7].build();
    while (many.t < 30 - 1e-9) advance(many, Math.min(1 / 60, 30 - many.t));
    expect(many.serverHops).toBe(one.serverHops);
    expect(of(many, "answer").map((entry) => entry.source)).toEqual(of(one, "answer").map((entry) => entry.source));
  });

  it("a manual question and a record change behave like the story", () => {
    const sim = createDnsSim();
    ask(sim);
    advance(sim, 7);
    changeRecord(sim);
    ask(sim);
    advance(sim, 1);
    expect(of(sim, "answer").slice(-1)[0].stale).toBe(true);
  });
});
