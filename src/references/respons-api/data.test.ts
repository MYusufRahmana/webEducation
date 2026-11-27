import { describe, expect, it } from "vitest";
import { ERRORS } from "./internal";
import { findNotes, HTTP_NOTES, INTERNAL_NOTES, NOTES, noteById } from "./data";
import { referenceBySlug } from "..";
import { search } from "../../state/search";
import { catalog } from "../../topics";

describe("Respons API reference", () => {
  it("lists the 21 HTTP statuses from the brief, each with every field filled", () => {
    expect(HTTP_NOTES.map((n) => n.code)).toEqual([200, 201, 202, 204, 301, 302, 304, 400, 401, 403, 404, 405, 409, 413, 415, 422, 429, 500, 502, 503, 504]);
    for (const n of HTTP_NOTES) {
      for (const field of [n.arti, n.contoh, n.frontend, n.backend, n.pengingat]) expect(field.length).toBeGreaterThan(5);
      expect(n.sebab.length).toBeGreaterThan(0);
      expect(n.sebab.length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps all 35 application codes with their original name and HTTP status", () => {
    expect(INTERNAL_NOTES).toHaveLength(35);
    for (const e of ERRORS) {
      const n = INTERNAL_NOTES.find((x) => x.code === e.code)!;
      expect(n.name).toBe(e.name);
      expect(n.http).toBe(e.http);
    }
  });

  it("never mixes up HTTP and application codes: ids and kinds are distinct", () => {
    expect(new Set(NOTES.map((n) => n.id)).size).toBe(NOTES.length);
    expect(noteById("http-401")!.kind).toBe("http");
    expect(noteById("app-2002")!.kind).toBe("internal");
  });

  it("204 shows no JSON body", () => {
    const n = HTTP_NOTES.find((x) => x.code === 204)!;
    expect(n.example!.body).toBeUndefined();
  });

  it("finds notes by number, name and everyday words", () => {
    expect(findNotes("401")[0].id).toBe("http-401");
    expect(findNotes("2002").map((n) => n.id)).toEqual(["app-2002"]);
    expect(findNotes("TokenInvalid")[0].id).toBe("app-2002");
    expect(findNotes("Unauthorized")[0].id).toBe("http-401");
    expect(findNotes("login").map((n) => n.id)).toContain("http-401");
    expect(findNotes("izin")[0].id).toBe("http-403");
    expect(findNotes("file besar")[0].id).toBe("http-413");
    expect(findNotes("database").map((n) => n.id)).toEqual(expect.arrayContaining(["app-7001", "app-7014"]));
  });

  it("the old lesson address leads to the reference, which sits after API in the course list", () => {
    expect(referenceBySlug("request-gagal")!.slug).toBe("respons-api");
    const kom = catalog().find((c) => c.id === "komunikasi")!;
    expect(kom.lessons.map((l) => l.slug)).toEqual(["api", "respons-api", "message-queue"]);
  });

  it("the global search opens a single note", () => {
    const hit = search("TokenInvalid")[0];
    expect(hit.kind).toBe("Catatan");
    expect(hit.route).toEqual({ page: "lesson", slug: "respons-api", step: null, item: "app-2002" });
  });
});
