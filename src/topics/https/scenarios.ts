import { createHttpsSim, type HttpsSim } from "./model";

/**
 * Six short scenes on one browser–server path. Each scene starts from the state the earlier ones
 * established (certificate checked, connection protected), so every replay shows the same events.
 */
export type HttpsPartKey = "browser" | "path" | "server" | "observer" | "certificate" | "message" | "lock";

export interface HttpsStepConfig {
  key: string;
  highlight: HttpsPartKey[];
  build: () => HttpsSim;
  holdAt: number;
}

const SETUP = [
  { at: 0.4, kind: "setup" as const, from: "browser" as const, text: "Halo, ini cara yang saya dukung" },
  { at: 1.8, kind: "setup" as const, from: "server" as const, text: "Setuju, pakai cara ini" },
  { at: 3.2, kind: "setup" as const, from: "browser" as const, text: "Bagian untuk membentuk kunci" },
  { at: 4.6, kind: "setup" as const, from: "server" as const, text: "Selesai, siap", last: true },
];
export const TAMPER_AT = 1.5;

export const HTTPS_STEPS: HttpsStepConfig[] = [
  { key: "tanpa-perlindungan", highlight: ["message", "observer", "path"], build: () => createHttpsSim({ script: [{ at: 0.5, kind: "send", text: "Pesan rahasia" }] }), holdAt: 4.2 },
  { key: "periksa-penerima", highlight: ["certificate", "server"], build: () => createHttpsSim({ script: [{ at: 0.5, kind: "certificate" }] }), holdAt: 4.6 },
  { key: "siapkan-koneksi", highlight: ["browser", "server", "lock"], build: () => createHttpsSim({ certChecked: true, travel: 1.3, script: SETUP }), holdAt: 7.2 },
  { key: "terlindungi", highlight: ["message", "observer", "lock"], build: () => createHttpsSim({ certChecked: true, conn: "secure", script: [{ at: 0.5, kind: "send", text: "Pesan rahasia" }] }), holdAt: 4.4 },
  {
    key: "perubahan-terdeteksi",
    highlight: ["observer", "message", "server"],
    build: () => createHttpsSim({ certChecked: true, conn: "secure", script: [{ at: 0.5, kind: "send", text: "Pesan rahasia" }, { at: TAMPER_AT, kind: "tamper" }] }),
    holdAt: 4.6,
  },
  {
    key: "manfaat-batas",
    highlight: ["message", "observer"],
    build: () => createHttpsSim({ certChecked: true, conn: "secure", script: [{ at: 0.5, kind: "send", text: "Pesan rahasia" }] }),
    holdAt: 4.4,
  },
];
