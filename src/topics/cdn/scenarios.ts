import { createCdnSim, type CdnSim } from "./model";

/**
 * Eight scenes. Each builds its own state from where the previous one ended, so a replay always shows
 * the same trips and the same counts.
 */
export type CdnPartKey = "users" | "andi" | "origin" | "cdn" | "copy" | "routes" | "buy" | "compare";

export interface CdnStepConfig {
  key: string;
  highlight: CdnPartKey[];
  build: () => CdnSim;
  holdAt: number;
}

export const CDN_STEPS: CdnStepConfig[] = [
  { key: "buka-website", highlight: ["andi", "origin"], build: () => createCdnSim(), holdAt: 3.0 },
  { key: "dari-singapura", highlight: ["routes", "origin", "andi"], build: () => createCdnSim({ script: [{ at: 0.6, kind: "load", who: "Andi" }] }), holdAt: 7.4 },
  {
    key: "banyak-orang",
    highlight: ["users", "origin"],
    build: () => createCdnSim({ shown: ["Andi"], originFetches: 1, script: [{ at: 0.4, kind: "load", who: "Budi" }, { at: 1.8, kind: "load", who: "Citra" }] }),
    holdAt: 8.6,
  },
  { key: "tambah-cdn", highlight: ["cdn", "copy"], build: () => createCdnSim({ cdnOn: true }), holdAt: 3.0 },
  { key: "cache-miss", highlight: ["cdn", "origin", "copy"], build: () => createCdnSim({ cdnOn: true, script: [{ at: 0.6, kind: "load", who: "Andi" }] }), holdAt: 7.6 },
  { key: "cache-hit", highlight: ["cdn", "copy"], build: () => createCdnSim({ cdnOn: true, copy: true, shown: ["Andi"], originFetches: 1, script: [{ at: 0.6, kind: "load", who: "Budi" }] }), holdAt: 4.6 },
  {
    key: "bandingkan",
    highlight: ["compare"],
    build: () => createCdnSim({ cdnOn: true, copy: true, script: [{ at: 0.6, kind: "load", who: "Andi", via: "direct" }, { at: 6.6, kind: "load", who: "Andi", via: "cdn" }] }),
    holdAt: 10.6,
  },
  { key: "lihat-vs-beli", highlight: ["buy", "cdn"], build: () => createCdnSim({ cdnOn: true, copy: true, script: [{ at: 0.4, kind: "load", who: "Andi" }, { at: 2.8, kind: "buy", who: "Andi" }] }), holdAt: 9.6 },
];
