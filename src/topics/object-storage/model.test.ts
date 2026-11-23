import { describe, expect, it } from "vitest";
import { advance, createOsSim, download, put, get, presign, setDrive, latest, type OsLog, type OsSim } from "./model";
import { OS_STEPS, D2_STOPS_AT, SECOND_DOWNLOAD_AT, POSTER, TEASER, ETICKET } from "./scenarios";

const of = <K extends OsLog["kind"]>(sim: OsSim, kind: K) => sim.log.filter((entry): entry is Extract<OsLog, { kind: K }> => entry.kind === kind);
const step = (key: string) => OS_STEPS.find((s) => s.key === key)!;
const run = (key: string, t = step(key).holdAt) => advance(step(key).build(), t);

describe("two kinds of data", () => {
  it("step 1: the poster goes to object storage, and the database keeps only a small record with its key", () => {
    const sim = run("dua-jenis-data");
    expect(Object.keys(sim.objects)).toEqual([POSTER]);
    expect(of(sim, "served").map((e) => e.status)).toEqual([200]);
    expect(sim.rows).toEqual([{ label: "Konser Senja", key: POSTER }]);
    // the record is written after the file is safely stored
    expect(of(sim, "db")[0].at).toBeGreaterThan(of(sim, "stored")[0].at);
  });
});

describe("storing and reading by key", () => {
  it("step 2: three keys in one flat bucket", () => {
    const sim = run("bucket-key");
    expect(Object.keys(sim.objects).sort()).toEqual([ETICKET, POSTER, TEASER].sort());
  });
  it("step 3: the key read from the database is the key fetched from storage", () => {
    const sim = run("ambil-lewat-key");
    const read = of(sim, "db")[0];
    expect(read).toEqual(expect.objectContaining({ op: "read", key: POSTER }));
    const served = of(sim, "served").slice(-1)[0];
    expect(served).toEqual(expect.objectContaining({ key: POSTER, status: 200 }));
    expect(served.at).toBeGreaterThan(read.at);
  });
  it("answers 404 for a key that does not exist", () => {
    const sim = createOsSim();
    get(sim, "tidak/ada.jpg");
    advance(sim, 3);
    expect(sim.lastStatus).toBe(404);
  });
});

describe("pieces on four drives", () => {
  it("step 4: writes four pieces, then still reads the video after one drive stops", () => {
    const sim = run("tersebar");
    expect(of(sim, "stored")[0].drives).toBe(4);
    expect(of(sim, "drive")[0].at).toBeCloseTo(D2_STOPS_AT);
    const read = of(sim, "served").slice(-1)[0];
    expect(read.key).toBe(TEASER);
    expect(read.status).toBe(200);
  });
  it("refuses a read when fewer than two pieces are reachable, and a write below the write quorum", () => {
    const sim = createOsSim({ seed: { "a.txt": 1 } });
    setDrive(sim, "D1", false);
    setDrive(sim, "D2", false);
    setDrive(sim, "D3", false);
    get(sim, "a.txt");
    put(sim, "b.txt", 1);
    advance(sim, 4);
    expect(of(sim, "served").map((e) => e.status)).toEqual([503, 503]);
  });
});

describe("temporary links", () => {
  it("step 5: the browser downloads with a fresh link and the same link is refused after it expires", () => {
    const sim = run("link-sementara");
    const browser = of(sim, "served").filter((e) => e.from === "browser");
    expect(browser.map((e) => e.status)).toEqual([200, 403]);
    expect(of(sim, "link")[0].expiresAt).toBeLessThan(SECOND_DOWNLOAD_AT + 0.7);
  });
  it("a download without any link does nothing", () => {
    expect(download(createOsSim())).toBeNull();
  });
});

describe("versions", () => {
  it("step 6: writing the same key keeps version 1 and serves version 2", () => {
    const sim = run("versi");
    expect(sim.objects[POSTER].map((v) => v.v)).toEqual([1, 2]);
    expect(latest(sim, POSTER)!.sizeMb).toBe(4);
    expect(of(sim, "served").slice(-1)[0].version).toBe(2);
  });
});

describe("determinism", () => {
  it("does not depend on frame size", () => {
    const one = run("link-sementara", 12);
    const many = step("link-sementara").build();
    while (many.t < 12 - 1e-9) advance(many, Math.min(1 / 60, 12 - many.t));
    expect(of(many, "served").map((e) => e.status)).toEqual(of(one, "served").map((e) => e.status));
  });
  it("every step's story finishes before it holds", () => {
    for (const s of OS_STEPS) {
      const sim = advance(s.build(), s.holdAt);
      expect(sim.ops.every((op) => op.phase === "done")).toBe(true);
      expect(sim.dbOps.every((op) => op.phase === "done")).toBe(true);
    }
  });
  it("presign on a missing key is a 404, not a link", () => {
    const sim = createOsSim();
    presign(sim, "x");
    advance(sim, 3);
    expect(sim.links.length).toBe(0);
    expect(sim.lastStatus).toBe(404);
  });
});
