import { createApiSim, type ApiSim } from "./model";

/**
 * Eleven scenes. The same objects stay in place throughout: Andi, the frontend, the backend (endpoint,
 * check, application logic) and the database. One request is followed per scene.
 */
export type ApiPartKey = "user" | "frontend" | "endpoint" | "check" | "process" | "db" | "request" | "response" | "strip" | "client" | "parts";

export interface ApiStepConfig {
  key: string;
  highlight: ApiPartKey[];
  build: () => ApiSim;
  holdAt: number;
}

/** One request takes 8.0 s (with a database visit), so most scenes hold a little after it. */
export const API_STEPS: ApiStepConfig[] = [
  { key: "satu-tombol", highlight: ["frontend", "request"], build: () => createApiSim({ script: [{ at: 1.2, kind: "view" }] }), holdAt: 10.4 },
  { key: "tujuan", highlight: ["request", "endpoint"], build: () => createApiSim({ script: [{ at: 0.6, kind: "view" }] }), holdAt: 9.8 },
  { key: "backend-memproses", highlight: ["endpoint", "check", "process", "db"], build: () => createApiSim({ script: [{ at: 0.6, kind: "view" }] }), holdAt: 9.8 },
  { key: "jawaban-data", highlight: ["response", "frontend"], build: () => createApiSim({ script: [{ at: 0.4, kind: "view" }] }), holdAt: 10.4 },
  {
    key: "tampilan-berbeda",
    highlight: ["frontend", "endpoint"],
    build: () => createApiSim({ clients: ["web", "hp"], script: [{ at: 0.5, kind: "view", from: "web" }, { at: 1.4, kind: "view", from: "hp" }] }),
    holdAt: 11.4,
  },
  { key: "buat-pesanan", highlight: ["request", "process", "db"], build: () => createApiSim({ loaded: true, script: [{ at: 0.8, kind: "order", jumlah: 2 }] }), holdAt: 10.4 },
  { key: "periksa-dulu", highlight: ["check"], build: () => createApiSim({ loaded: true, orders: 1, script: [{ at: 0.6, kind: "order", jumlah: 0 }] }), holdAt: 6.6 },
  { key: "bagian-permintaan", highlight: ["parts", "request"], build: () => createApiSim({ loaded: true, part: "method" }), holdAt: 3 },
  { key: "coba-kirim", highlight: ["client"], build: () => createApiSim({ clients: ["client"], script: [{ at: 0.8, kind: "send" }] }), holdAt: 9.6 },
  {
    key: "periksa-respons",
    highlight: ["client", "response"],
    build: () => createApiSim({ clients: ["client"], form: { method: "POST", target: "pesanan", jumlah: 2 }, script: [{ at: 0.6, kind: "send" }] }),
    holdAt: 9.8,
  },
  { key: "api-sungguhan", highlight: ["client"], build: () => createApiSim({ server: "echo", clients: ["tool"], script: [{ at: 0.6, kind: "echo" }] }), holdAt: 7.4 },
];
