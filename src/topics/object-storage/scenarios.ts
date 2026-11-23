import { createOsSim, type OsSim } from "./model";

/**
 * Each step is its own short story, rebuilt from t = 0 so "Ulangi langkah" always shows the same events.
 *   1 the application stores one photo
 *   2 three files under three keys, then one is read back by its key
 *   3 a large video is written as 4 shards; drive 2 stops; the video is still read from the others
 *   4 a temporary link: the browser downloads directly; after it expires the same link is refused
 *   5 the same key is written again: version 2 replaces what readers get, version 1 is kept
 */

export type OsPartKey = "app" | "browser" | "api" | "bucket" | "objects" | "drives" | "shards" | "link" | "versions";

export interface OsStepConfig {
  key: string;
  highlight: OsPartKey[];
  build: () => OsSim;
  holdAt: number;
}

export const D2_STOPS_AT = 3.4;
export const LINK_AT = 0.5;
export const SECOND_DOWNLOAD_AT = 9.2;

export const OS_STEPS: OsStepConfig[] = [
  { key: "mengapa", highlight: ["app", "api", "bucket"], build: () => createOsSim({ script: [{ at: 0.5, kind: "put", key: "foto/kucing.jpg", sizeMb: 3 }] }), holdAt: 4.2 },
  {
    key: "bucket-key",
    highlight: ["bucket", "objects"],
    build: () =>
      createOsSim({
        script: [
          { at: 0.4, kind: "put", key: "foto/kucing.jpg", sizeMb: 3 },
          { at: 1.4, kind: "put", key: "foto/anjing.jpg", sizeMb: 2 },
          { at: 2.4, kind: "put", key: "laporan/2026.pdf", sizeMb: 1 },
          { at: 4.8, kind: "get", key: "foto/anjing.jpg" },
        ],
      }),
    holdAt: 8.4,
  },
  {
    key: "tersebar",
    highlight: ["drives", "shards"],
    build: () =>
      createOsSim({
        script: [
          { at: 0.4, kind: "put", key: "video/liburan.mp4", sizeMb: 40 },
          { at: D2_STOPS_AT, kind: "drive", drive: "D2", up: false },
          { at: 4.4, kind: "get", key: "video/liburan.mp4" },
        ],
      }),
    holdAt: 8.4,
  },
  {
    key: "link-sementara",
    highlight: ["link", "browser", "api"],
    build: () =>
      createOsSim({
        seed: { "laporan/2026.pdf": 1 },
        script: [
          { at: LINK_AT, kind: "presign", key: "laporan/2026.pdf" },
          { at: 2.8, kind: "download" },
          { at: SECOND_DOWNLOAD_AT, kind: "download" },
        ],
      }),
    holdAt: 12,
  },
  {
    key: "versi",
    highlight: ["versions", "objects"],
    build: () =>
      createOsSim({
        seed: { "foto/kucing.jpg": 3 },
        script: [
          { at: 0.5, kind: "put", key: "foto/kucing.jpg", sizeMb: 4 },
          { at: 3.6, kind: "get", key: "foto/kucing.jpg" },
        ],
      }),
    holdAt: 7.2,
  },
];
