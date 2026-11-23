import { createHttpsSim, SAMPLE_FORM, type HttpsSim } from "./model";

/**
 * Six short scenes on one ticket website. Each scene starts from the state the earlier ones established
 * (HTTPS turned on, certificate checked, connection protected), so every replay shows the same events.
 */
export type HttpsPartKey = "browser" | "address" | "path" | "server" | "observer" | "certificate" | "owner" | "message" | "check" | "trust";

export interface HttpsStepConfig {
  key: string;
  highlight: HttpsPartKey[];
  build: () => HttpsSim;
  holdAt: number;
}

export const TAMPER_AT = 1.5;

export const HTTPS_STEPS: HttpsStepConfig[] = [
  { key: "beli-tiket", highlight: ["browser", "address"], build: () => createHttpsSim({ script: [{ at: 0.4, kind: "page" }] }), holdAt: 4.6 },
  { key: "mengapa-peringatan", highlight: ["message", "observer", "path"], build: () => createHttpsSim({ script: [{ at: 0.5, kind: "send", text: SAMPLE_FORM }] }), holdAt: 4.6 },
  { key: "aktifkan-https", highlight: ["owner", "certificate", "server"], build: () => createHttpsSim({ script: [{ at: 0.4, kind: "install" }] }), holdAt: 4.4 },
  {
    key: "periksa-server",
    highlight: ["certificate", "check", "address"],
    build: () =>
      createHttpsSim({
        https: true,
        script: [
          { at: 0.4, kind: "certificate" },
          { at: 3.2, kind: "setup", from: "browser", text: "Siapkan kunci bersama" },
          { at: 4.7, kind: "setup", from: "server", text: "Siap, koneksi terlindungi", last: true },
        ],
      }),
    holdAt: 7.4,
  },
  { key: "data-terlindungi", highlight: ["message", "observer"], build: () => createHttpsSim({ conn: "secure", checked: true, script: [{ at: 0.5, kind: "send", text: SAMPLE_FORM }] }), holdAt: 4.6 },
  {
    key: "terpercaya",
    highlight: ["trust", "address"],
    build: () => createHttpsSim({ conn: "secure", checked: true, script: [{ at: 0.4, kind: "send", text: "Pesan 2 tiket Konser Senja" }, { at: 3.2, kind: "reply", text: "Pesanan diterima · pembayaran belum diproses" }] }),
    holdAt: 7.4,
  },
];
