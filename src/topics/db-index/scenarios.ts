import { createIdxSim, TARGET, type IdxSim } from "./model";

/**
 * Eight scenes. Each builds its own state; the rows stay in the same places in every scene.
 */
export type IdxPartKey = "andi" | "query" | "table" | "column" | "rows" | "index" | "pointer" | "pile" | "compare" | "sql";

export interface IdxStepConfig {
  key: string;
  highlight: IdxPartKey[];
  build: () => IdxSim;
  holdAt: number;
}

export const IDX_STEPS: IdxStepConfig[] = [
  { key: "andi-mencari", highlight: ["andi", "query", "table"], build: () => createIdxSim(), holdAt: 3 },
  { key: "satu-per-satu", highlight: ["rows", "table"], build: () => createIdxSim({ script: [{ at: 0.6, kind: "search", code: TARGET, mode: "scan" }] }), holdAt: 6.6 },
  { key: "semakin-banyak", highlight: ["pile", "rows"], build: () => createIdxSim({ extra: 992, script: [{ at: 0.6, kind: "search", code: TARGET, mode: "scan" }] }), holdAt: 7.4 },
  { key: "buat-katalog", highlight: ["index", "pointer", "column"], build: () => createIdxSim({ script: [{ at: 0.6, kind: "build" }] }), holdAt: 6.4 },
  { key: "cari-lewat-indeks", highlight: ["index", "pointer"], build: () => createIdxSim({ indexed: true, script: [{ at: 0.6, kind: "search", code: TARGET, mode: "index" }] }), holdAt: 4.6 },
  {
    key: "bandingkan",
    highlight: ["compare"],
    build: () => createIdxSim({ indexed: true, script: [{ at: 0.6, kind: "search", code: TARGET, mode: "scan" }, { at: 6.2, kind: "search", code: TARGET, mode: "index" }] }),
    holdAt: 9.4,
  },
  { key: "pelihara-indeks", highlight: ["index", "rows"], build: () => createIdxSim({ indexed: true, script: [{ at: 0.6, kind: "add", code: "TKT-109", name: "Lala" }] }), holdAt: 4.4 },
  { key: "latihan-sql", highlight: ["sql", "table"], build: () => createIdxSim(), holdAt: 3 },
];
