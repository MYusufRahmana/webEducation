import { createOsSim, type OsSim, type Row } from "./model";

/**
 * Six short stories about a concert ticket website, each rebuilt from t = 0 so “Ulangi” always shows
 * the same events.
 *   1 small record → database, big poster → object storage; the database notes the poster's key
 *   2 three files under three keys in one bucket
 *   3 opening the concert page: read the key from the database, then fetch that key from storage
 *   4 a large video is stored in 4 pieces on 4 drives; drive 2 stops; the video is still read
 *   5 a temporary link: the browser downloads the e-ticket directly; after it expires it is refused
 *   6 the same key is written again: version 2 is served, version 1 is kept
 */

export type OsPartKey = "app" | "browser" | "db" | "api" | "bucket" | "objects" | "drives" | "shards" | "link" | "versions";

export interface OsStepConfig {
  key: string;
  highlight: OsPartKey[];
  build: () => OsSim;
  holdAt: number;
}

export const POSTER = "poster/senja.jpg";
export const TEASER = "video/teaser.mp4";
export const ETICKET = "etiket/A12.pdf";
export const D2_STOPS_AT = 3.4;
export const LINK_AT = 0.5;
export const SECOND_DOWNLOAD_AT = 9.2;

const ROW: Row = { label: "Konser Senja", key: POSTER };

export const OS_STEPS: OsStepConfig[] = [
  {
    key: "dua-jenis-data",
    highlight: ["app", "db", "api"],
    build: () =>
      createOsSim({
        script: [
          { at: 0.4, kind: "put", key: POSTER, sizeMb: 3 },
          { at: 2.6, kind: "db-write", label: ROW.label, key: POSTER },
        ],
      }),
    holdAt: 5.0,
  },
  {
    key: "bucket-key",
    highlight: ["bucket", "objects"],
    build: () =>
      createOsSim({
        script: [
          { at: 0.4, kind: "put", key: POSTER, sizeMb: 3 },
          { at: 1.4, kind: "put", key: TEASER, sizeMb: 40 },
          { at: 2.4, kind: "put", key: ETICKET, sizeMb: 1 },
        ],
      }),
    holdAt: 5.6,
  },
  {
    key: "ambil-lewat-key",
    highlight: ["db", "objects", "app"],
    build: () => createOsSim({ seed: { [POSTER]: 3, [TEASER]: 40, [ETICKET]: 1 }, rows: [ROW], script: [{ at: 0.4, kind: "db-read", label: ROW.label }] }),
    holdAt: 5.6,
  },
  {
    key: "tersebar",
    highlight: ["drives", "shards"],
    build: () =>
      createOsSim({
        script: [
          { at: 0.4, kind: "put", key: TEASER, sizeMb: 40 },
          { at: D2_STOPS_AT, kind: "drive", drive: "D2", up: false },
          { at: 4.4, kind: "get", key: TEASER },
        ],
      }),
    holdAt: 8.4,
  },
  {
    key: "link-sementara",
    highlight: ["link", "browser", "api"],
    build: () =>
      createOsSim({
        seed: { [ETICKET]: 1 },
        script: [
          { at: LINK_AT, kind: "presign", key: ETICKET },
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
        seed: { [POSTER]: 3 },
        rows: [ROW],
        script: [
          { at: 0.5, kind: "put", key: POSTER, sizeMb: 4 },
          { at: 3.6, kind: "get", key: POSTER },
        ],
      }),
    holdAt: 7.2,
  },
];
