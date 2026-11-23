import { advance, BLOCKED, createDnsSim, SITE, TYPO, type DnsAction, type DnsSim } from "./model";

/**
 * Steps 1–7 are windows on one story, so caches and counters continue from step to step:
 *   0.4    first visit: nothing cached, the resolver walks root → TLD → authoritative (answer at 9.2),
 *          the browser gets the address at 10.4 and opens the page at 12.8
 *   15     second visit: answered from the device's own notes (kept 6 s)
 *   18.5   third visit: the device's copy expired, the resolver's copy (TTL 20 s) answers
 *   25.5   the site moves to a new address
 *   26.5   fourth visit: the device still holds the old address → nobody answers there
 *   32     fifth visit: both copies expired → the walk again → the new address → page
 * Steps 8–11 are separate everyday situations, each starting fresh.
 */

export type DnsStepKey = "butuh-alamat" | "root" | "tld" | "authoritative" | "buka-situs" | "cache" | "ttl" | "salah-ketik" | "diblokir" | "dns-gangguan" | "situs-mati";
export type DnsPartKey = "device" | "resolver" | "root" | "tld" | "auth" | "site" | "warning" | "deviceCache" | "resolverCache";

const STORY: DnsAction[] = [
  { at: 0.4, kind: "visit", name: SITE },
  { at: 15, kind: "visit", name: SITE },
  { at: 18.5, kind: "visit", name: SITE },
  { at: 25.5, kind: "move" },
  { at: 26.5, kind: "visit", name: SITE },
  { at: 32, kind: "visit", name: SITE },
];
const storyAt = (t: number): DnsSim => advance(createDnsSim({ script: STORY }), t);
const once = (name: string, seed: Parameters<typeof createDnsSim>[0] = {}) => createDnsSim({ ...seed, script: [{ at: 0.4, kind: "visit", name }] });

export interface DnsStepConfig {
  key: DnsStepKey;
  highlight: DnsPartKey[];
  build: () => DnsSim;
  holdAt: number;
}

export const DNS_STEPS: DnsStepConfig[] = [
  { key: "butuh-alamat", highlight: ["device", "deviceCache"], build: () => storyAt(0), holdAt: 2.1 },
  { key: "root", highlight: ["resolver", "resolverCache", "root"], build: () => storyAt(1.9), holdAt: 4.8 },
  { key: "tld", highlight: ["tld"], build: () => storyAt(4.6), holdAt: 7.0 },
  { key: "authoritative", highlight: ["auth", "resolverCache"], build: () => storyAt(6.8), holdAt: 10.4 },
  { key: "buka-situs", highlight: ["site", "device"], build: () => storyAt(10.2), holdAt: 14.6 },
  { key: "cache", highlight: ["deviceCache", "resolverCache"], build: () => storyAt(14.4), holdAt: 25.0 },
  { key: "ttl", highlight: ["site", "deviceCache", "resolverCache"], build: () => storyAt(25.0), holdAt: 45.6 },
  { key: "salah-ketik", highlight: ["tld", "device"], build: () => once(TYPO), holdAt: 10.6 },
  { key: "diblokir", highlight: ["resolver", "warning"], build: () => once(BLOCKED), holdAt: 8.6 },
  { key: "dns-gangguan", highlight: ["resolver", "device"], build: () => once(SITE, { resolverUp: false }), holdAt: 7.5 },
  { key: "situs-mati", highlight: ["site", "resolver"], build: () => once(SITE, { siteUp: false, resolverCache: { [SITE]: 100 } }), holdAt: 10.4 },
];
