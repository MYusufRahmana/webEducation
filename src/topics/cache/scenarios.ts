import { createCacheSim, type CacheSim } from "./model";

/**
 * Seven short scenes of one ticket sale. Requests in the basic scenes are spaced out on purpose so
 * hit and miss are easy to follow; concurrent misses on an empty cache (stampede) are not shown.
 */
export type CachePartKey = "client" | "server" | "cache" | "db" | "admin" | "lanes";

export interface CacheStepConfig {
  key: string;
  highlight: CachePartKey[];
  build: () => CacheSim;
  holdAt: number;
}

const info = (at: number, id: string, ask = "Jadwal konser") => ({ at, kind: "ask" as const, id, what: "info" as const, ask });
const map = (at: number, id: string) => ({ at, kind: "ask" as const, id, what: "seatmap" as const, ask: "Lihat denah" });

export const CACHE_STEPS: CacheStepConfig[] = [
  { key: "pertanyaan-sama", highlight: ["client", "server"], build: () => createCacheSim({ cacheOn: false, script: [info(0.4, "P1"), info(1.6, "P2", "Lokasi"), info(2.8, "P3", "Harga kategori")] }), holdAt: 8.4 },
  { key: "database-mengulang", highlight: ["db"], build: () => createCacheSim({ cacheOn: false, script: [info(0.4, "P1"), info(2.0, "P2"), info(3.6, "P3")] }), holdAt: 9.2 },
  { key: "siapkan-cache", highlight: ["cache"], build: () => createCacheSim(), holdAt: 2.6 },
  { key: "cache-miss", highlight: ["cache", "db"], build: () => createCacheSim({ script: [info(0.4, "P4")] }), holdAt: 9.2 },
  { key: "cache-hit", highlight: ["cache"], build: () => createCacheSim({ cached: { info: {} }, misses: 1, dbReads: 1, script: [info(0.4, "P5"), info(1.6, "P6")] }), holdAt: 6.4 },
  {
    key: "perbarui-salinan",
    highlight: ["admin", "db", "cache"],
    build: () => createCacheSim({ cached: { info: {} }, misses: 1, dbReads: 1, hits: 2, script: [{ at: 0.4, kind: "update", time: "20.00", invalidate: true }, info(1.6, "P7"), info(6.0, "P8")] }),
    holdAt: 14.8,
  },
  {
    key: "lihat-vs-beli",
    highlight: ["db", "cache"],
    build: () =>
      createCacheSim({
        time: "20.00",
        version: 2,
        cached: { info: {}, seatmap: {} },
        script: [map(0.4, "P9"), { at: 1.4, kind: "book", id: "P10", seat: "A12" }, { at: 2.3, kind: "book", id: "P11", seat: "A12" }, map(8.2, "P12")],
      }),
    holdAt: 17,
  },
];
