import { describe, expect, it } from "vitest";
import { ADDRESSES, advance, BLOCKED, createDnsSim, SITE, TYPO, visit, WARNING_IP, type DnsLog, type DnsSim } from "./model";
import { DNS_STEPS } from "./scenarios";

const of = <K extends DnsLog["kind"]>(sim: DnsSim, kind: K) => sim.log.filter((e): e is Extract<DnsLog, { kind: K }> => e.kind === kind);
const step = (key: string) => DNS_STEPS.find((s) => s.key === key)!;
/** holdAt is an absolute scene time, as in the runtime. */
const play = (s: (typeof DNS_STEPS)[number]) => {
  const sim = s.build();
  return advance(sim, s.holdAt - sim.t);
};
const run = (key: string) => play(step(key));

describe("DNS lesson model", () => {
  it("step 1: with nothing cached the question leaves the device for the resolver", () => {
    const sim = run("butuh-alamat");
    expect(of(sim, "cache-hit")).toHaveLength(0);
    expect(sim.visits[0].stage).toBe("resolver-check");
  });
  it("steps 2–4: the resolver walks root → TLD → authoritative, one referral each, then caches the answer", () => {
    const sim = run("authoritative");
    expect(of(sim, "referral").map((e) => e.from)).toEqual(["root", "tld"]);
    expect(of(sim, "answer")[0]).toEqual(expect.objectContaining({ address: ADDRESSES[0] }));
    expect(sim.serverHops).toBe(3);
    expect(sim.resolver[SITE]?.address).toBe(ADDRESSES[0]);
  });
  it("step 5: DNS only gives the address; the browser then fetches the page from the site itself", () => {
    const sim = run("buka-situs");
    expect(sim.screen).toEqual(expect.objectContaining({ outcome: "page", stale: false }));
    expect(sim.device[SITE]?.address).toBe(ADDRESSES[0]);
  });
  it("step 6: the device's notes answer first, then the resolver's cache; no new server hops", () => {
    const sim = run("cache");
    const hits = of(sim, "cache-hit").map((e) => e.where);
    expect(hits).toEqual(["device", "resolver"]);
    expect(sim.serverHops).toBe(3);
    expect(sim.pagesOpened).toBe(3);
  });
  it("step 7: after the move a cached old address leads nowhere; after the TTL the new address is found", () => {
    const sim = run("ttl");
    const outcomes = of(sim, "outcome").slice(-2);
    expect(outcomes[0]).toEqual(expect.objectContaining({ outcome: "site-timeout", stale: true }));
    expect(outcomes[1]).toEqual(expect.objectContaining({ outcome: "page", stale: false }));
    expect(of(sim, "answer").slice(-1)[0]?.address).toBe(ADDRESSES[1]);
    expect(sim.serverHops).toBe(6);
  });
  it("step 8: a mistyped name is answered “does not exist” by the TLD; no website is visited", () => {
    const sim = run("salah-ketik");
    expect(of(sim, "nxdomain")[0].name).toBe(TYPO);
    expect(of(sim, "referral").map((e) => e.from)).toEqual(["root"]);
    expect(sim.screen?.outcome).toBe("not-found");
    expect(sim.device[TYPO]).toBeUndefined();
  });
  it("step 9: a blocked name gets the warning page address, without asking the hierarchy", () => {
    const sim = run("diblokir");
    expect(of(sim, "blocked")[0].name).toBe(BLOCKED);
    expect(sim.serverHops).toBe(0);
    expect(sim.screen?.outcome).toBe("blocked-page");
    expect(Object.values(sim.device).some((e) => e.address === WARNING_IP)).toBe(false);
  });
  it("step 10: when the resolver does not answer, the browser gives up although the site is up", () => {
    const sim = run("dns-gangguan");
    expect(sim.siteUp).toBe(true);
    expect(sim.screen?.outcome).toBe("dns-timeout");
  });
  it("step 11: DNS answers, but the site does not", () => {
    const sim = run("situs-mati");
    expect(of(sim, "cache-hit")[0]).toEqual(expect.objectContaining({ where: "resolver" }));
    expect(sim.screen?.outcome).toBe("site-timeout");
  });
  it("a name off the blocklist resolves normally", () => {
    const sim = createDnsSim();
    sim.blocklist = [];
    visit(sim, BLOCKED);
    advance(sim, 20);
    expect(sim.screen?.outcome).toBe("site-timeout"); // the demo has no server for that name: only DNS is modelled
    expect(of(sim, "answer")[0].address).not.toBe(WARNING_IP);
  });
  it("the device never keeps an answer longer than the resolver's TTL left", () => {
    const sim = createDnsSim({ resolverCache: { [SITE]: 3 } });
    visit(sim, SITE);
    advance(sim, 3.5);
    const answered = sim.log.find((e) => e.kind === "cache-hit")!.at;
    expect(sim.device[SITE]!.expiresAt - sim.device[SITE]!.storedAt).toBeLessThanOrEqual(3 - answered + 1e-9);
  });
  it("every scene finishes before it holds, and replays identically", () => {
    for (const s of DNS_STEPS) {
      expect(JSON.stringify(play(s).log)).toBe(JSON.stringify(play(s).log));
    }
    for (const key of ["buka-situs", "cache", "ttl", "salah-ketik", "diblokir", "dns-gangguan", "situs-mati"]) expect(run(key).visits.every((v) => v.doneAt !== null)).toBe(true);
  });
});
