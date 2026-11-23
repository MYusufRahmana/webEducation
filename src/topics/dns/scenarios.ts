import { advance, createDnsSim, type DnsAction, type DnsSim } from "./model";

/**
 * Steps of the DNS topic are windows on one story, so their caches and counters continue:
 *   0.5 s  question 1, nothing cached: the resolver walks root → TLD → authoritative
 *   8, 10  questions 2 and 3 answered by the client's own cache
 *   11.5   the client's copy expires (it keeps answers at most 5 s)
 *   13     question 4 answered by the resolver's cache
 *   15     the authoritative server starts publishing a new address
 *   16     question 5 still gets the old address from the client's cache
 *   17.9   both cached copies expire
 *   19     question 6 walks the hierarchy again and gets the new address
 */

export type DnsStepKey = "butuh-alamat" | "resolver" | "root" | "tld" | "authoritative" | "simpan-jawaban" | "cache-resolver" | "ttl";
export type DnsPartKey = "client" | "localCache" | "track" | "resolver" | "resolverCache" | "ramps" | "root" | "tld" | "auth";

export const ASKS = [0.5, 8, 10, 13, 16, 19, 26, 32];
export const CHANGE_AT = 15;
export const HOLD_FIRST = 6.7;
export const HOLD_CACHE = 11;
export const HOLD_RESOLVER = 14.95;
export const HOLD_TTL = 26.8;

const STORY: DnsAction[] = [...ASKS.map((at) => ({ at, kind: "ask" as const })), { at: CHANGE_AT, kind: "change" }];
const storyAt = (t: number): DnsSim => advance(createDnsSim({ script: STORY }), t);

export interface DnsStepConfig {
  key: DnsStepKey;
  highlight: DnsPartKey[];
  build: () => DnsSim;
  holdAt?: number;
}

/** Every step starts where the previous one ended and holds at its own end: one event per step. */
export const DNS_STEPS: DnsStepConfig[] = [
  { key: "butuh-alamat", highlight: ["client", "localCache"], build: () => storyAt(0), holdAt: 1.0 },
  { key: "resolver", highlight: ["resolver", "resolverCache", "track"], build: () => storyAt(0.8), holdAt: 2.0 },
  { key: "root", highlight: ["root", "ramps"], build: () => storyAt(1.7), holdAt: 3.05 },
  { key: "tld", highlight: ["tld", "ramps"], build: () => storyAt(3.05), holdAt: 4.45 },
  { key: "authoritative", highlight: ["auth", "resolver"], build: () => storyAt(4.45), holdAt: HOLD_FIRST },
  { key: "simpan-jawaban", highlight: ["localCache", "resolverCache"], build: () => storyAt(HOLD_FIRST), holdAt: HOLD_CACHE },
  { key: "cache-resolver", highlight: ["resolverCache", "resolver"], build: () => storyAt(HOLD_CACHE), holdAt: HOLD_RESOLVER },
  { key: "ttl", highlight: ["auth", "localCache", "resolverCache"], build: () => storyAt(HOLD_RESOLVER), holdAt: HOLD_TTL },
];
