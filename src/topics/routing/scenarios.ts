import { createRouteSim, type RouteSim } from "./model";

/**
 * Twelve scenes. Each builds its own state; nodes keep their places in every scene and appear as the
 * lesson introduces them (see `shows` in system.tsx).
 */
export type RoutePartKey = "laptop" | "dns" | "home" | "isp" | "transit" | "google" | "facebook" | "table" | "packet" | "terminal" | "ttl";

export interface RouteStepConfig {
  key: string;
  highlight: RoutePartKey[];
  build: () => RouteSim;
  holdAt: number;
}

/** Probe start times: each probe starts after the previous answer (or time-out) came back. */
export const PROBE_AT = [0.5, 1.9, 4.2, 7.4, 11.1];

export const ROUTE_STEPS: RouteStepConfig[] = [
  { key: "ketik-google", highlight: ["laptop", "google"], build: () => createRouteSim(), holdAt: 3 },
  { key: "cari-alamat", highlight: ["dns", "laptop"], build: () => createRouteSim({ script: [{ at: 0.5, kind: "dns", dest: "google" }] }), holdAt: 3.6 },
  { key: "keluar-rumah", highlight: ["home", "packet"], build: () => createRouteSim({ known: ["google"], script: [{ at: 0.5, kind: "send", dest: "google", stopAt: "H" }] }), holdAt: 2.6 },
  { key: "router-memilih", highlight: ["isp", "table"], build: () => createRouteSim({ known: ["google"], ispPause: 1.8, script: [{ at: 0.4, kind: "send", dest: "google", stopAt: "X1" }] }), holdAt: 5.6 },
  { key: "hop-ke-hop", highlight: ["transit", "packet"], build: () => createRouteSim({ known: ["google"], script: [{ at: 0.4, kind: "send", dest: "google" }] }), holdAt: 6.2 },
  { key: "jawaban", highlight: ["google", "laptop"], build: () => createRouteSim({ known: ["google"], screen: "loading", script: [{ at: 0.4, kind: "serve", dest: "google" }] }), holdAt: 9.8 },
  { key: "facebook", highlight: ["facebook", "table"], build: () => createRouteSim({ known: ["google", "facebook"], dest: "facebook", script: [{ at: 0.5, kind: "send", dest: "facebook" }] }), holdAt: 6.4 },
  {
    key: "jalur-putus",
    highlight: ["transit", "table"],
    build: () =>
      createRouteSim({
        known: ["google"],
        script: [
          { at: 0.4, kind: "send", dest: "google" },
          { at: 5.6, kind: "cut" },
          { at: 6.0, kind: "send", dest: "google" },
          { at: 9.4, kind: "send", dest: "google" },
        ],
      }),
    holdAt: 15,
  },
  { key: "tracert", highlight: ["terminal"], build: () => createRouteSim({ known: ["google"] }), holdAt: 3 },
  { key: "baca-tracert", highlight: ["terminal"], build: () => createRouteSim({ known: ["google"] }), holdAt: 3 },
  { key: "batas-langkah", highlight: ["ttl", "packet"], build: () => createRouteSim({ known: ["google"], script: PROBE_AT.map((at, i) => ({ at, kind: "probe" as const, ttl: i + 1 })) }), holdAt: 16.4 },
  { key: "rangkuman", highlight: ["packet", "google"], build: () => createRouteSim({ known: ["google"], autoServe: true, script: [{ at: 0.4, kind: "send", dest: "google" }] }), holdAt: 14.6 },
];
