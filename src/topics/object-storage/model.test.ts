import { describe, expect, it } from "vitest";
import { advance, createOsSim, download, put, get, presign, setDrive, latest, type OsLog, type OsSim } from "./model";
import { OS_STEPS, D2_STOPS_AT, SECOND_DOWNLOAD_AT } from "./scenarios";

const of = <K extends OsLog["kind"]>(sim: OsSim, kind: K) => sim.log.filter((entry): entry is Extract<OsLog, { kind: K }> => entry.kind === kind);
const run = (index: number, t = OS_STEPS[index].holdAt) => advance(OS_STEPS[index].build(), t);

describe("storing and reading by key", () => {
  it("stores one object and answers 200 within the step", () => {
    const sim = run(0);
    expect(Object.keys(sim.objects)).toEqual(["foto/kucing.jpg"]);
    expect(of(sim, "served").map((e) => e.status)).toEqual([200]);
  });
  it("keeps three keys in one flat bucket and reads one back by its key", () => {
    const sim = run(1);
    expect(Object.keys(sim.objects).sort()).toEqual(["foto/anjing.jpg", "foto/kucing.jpg", "laporan/2026.pdf"]);
    const read = of(sim, "served").slice(-1)[0];
    expect(read.key).toBe("foto/anjing.jpg");
    expect(read.status).toBe(200);
  });
  it("answers 404 for a key that does not exist", () => {
    const sim = createOsSim();
    get(sim, "tidak/ada.jpg");
    advance(sim, 3);
    expect(sim.lastStatus).toBe(404);
  });
});

describe("shards on four drives", () => {
  it("writes four shards, then still reads the video after one drive stops", () => {
    const sim = run(2);
    expect(of(sim, "stored")[0].drives).toBe(4);
    expect(of(sim, "drive")[0].at).toBeCloseTo(D2_STOPS_AT);
    const read = of(sim, "served").slice(-1)[0];
    expect(read.key).toBe("video/liburan.mp4");
    expect(read.status).toBe(200);
  });
  it("refuses a read when fewer than two shards are reachable, and a write below the write quorum", () => {
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
  it("lets the browser download with a fresh link and refuses the same link after it expires", () => {
    const sim = run(3);
    const browser = of(sim, "served").filter((e) => e.from === "browser");
    expect(browser.map((e) => e.status)).toEqual([200, 403]);
    expect(of(sim, "link")[0].expiresAt).toBeLessThan(SECOND_DOWNLOAD_AT + 0.7);
  });
  it("a download without any link does nothing", () => {
    expect(download(createOsSim())).toBeNull();
  });
});

describe("versions", () => {
  it("writing the same key keeps version 1 and serves version 2", () => {
    const sim = run(4);
    expect(sim.objects["foto/kucing.jpg"].map((v) => v.v)).toEqual([1, 2]);
    expect(latest(sim, "foto/kucing.jpg")!.sizeMb).toBe(4);
    expect(of(sim, "served").slice(-1)[0].version).toBe(2);
  });
});

describe("determinism", () => {
  it("does not depend on frame size", () => {
    const one = run(3, 12);
    const many = OS_STEPS[3].build();
    while (many.t < 12 - 1e-9) advance(many, Math.min(1 / 60, 12 - many.t));
    expect(of(many, "served").map((e) => e.status)).toEqual(of(one, "served").map((e) => e.status));
  });
  it("every step's story finishes before it holds", () => {
    for (const step of OS_STEPS) {
      const sim = advance(step.build(), step.holdAt);
      expect(sim.ops.every((op) => op.phase === "done")).toBe(true);
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
