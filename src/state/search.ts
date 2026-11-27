import { TOPICS } from "../topics";
import { REFERENCES } from "../references";
import type { Route } from "./route";

/** Local search over lesson titles, summaries, steps and glossary terms (PRD P-02). */

export interface SearchEntry {
  kind: "Pelajaran" | "Langkah" | "Glosarium" | "Catatan";
  title: string;
  /** Where it lives, e.g. the lesson title. */
  context: string;
  snippet: string;
  route: Route;
  /** Normalised title and body for matching. */
  titleKey: string;
  textKey: string;
}

/** Plain text: markup labels kept, keys dropped. */
export const plain = (text: string) => text.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1").replace(/\{\{[^|}]+\|([^}]+)\}\}/g, "$1");
export const normalise = (text: string) =>
  plain(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

let index: SearchEntry[] | null = null;
function build(): SearchEntry[] {
  const out: SearchEntry[] = [];
  for (const topic of TOPICS) {
    const lesson = topic.lesson;
    const title = topic.meta.title.id;
    const add = (entry: Omit<SearchEntry, "titleKey" | "textKey">, text: string) => out.push({ ...entry, titleKey: normalise(entry.title), textKey: normalise(`${entry.title} ${text}`) });
    add({ kind: "Pelajaran", title, context: topic.shortName, snippet: topic.meta.summary.id, route: { page: "lesson", slug: topic.slug, step: lesson.steps[0].key } }, `${topic.meta.summary.id} ${topic.shortName}`);
    lesson.steps.forEach((step, i) =>
      add({ kind: "Langkah", title: step.title, context: `${title} · langkah ${i + 1}`, snippet: plain(step.body[0]), route: { page: "lesson", slug: topic.slug, step: step.key } }, `${step.short} ${step.body.join(" ")} ${step.observe} ${step.idea}`),
    );
    for (const [key, entry] of Object.entries(topic.glossary)) {
      // a term leads to the first step that uses it
      const first = lesson.steps.find((step) => step.body.some((paragraph) => paragraph.includes(`[[${key}|`))) ?? lesson.steps[0];
      add({ kind: "Glosarium", title: entry.term.id, context: title, snippet: entry.definition.id, route: { page: "lesson", slug: topic.slug, step: first.key } }, entry.definition.id);
    }
  }
  for (const ref of REFERENCES) {
    const add = (entry: Omit<SearchEntry, "titleKey" | "textKey">, text: string) => out.push({ ...entry, titleKey: normalise(entry.title), textKey: normalise(`${entry.title} ${text}`) });
    add({ kind: "Pelajaran", title: ref.title, context: ref.shortName, snippet: ref.summary, route: { page: "lesson", slug: ref.slug, step: null } }, `${ref.summary} ${ref.shortName}`);
    for (const e of ref.searchEntries()) add({ kind: "Catatan", title: e.title, context: ref.shortName, snippet: e.snippet, route: { page: "lesson", slug: ref.slug, step: null, item: e.item } }, `${e.snippet} ${e.text}`);
  }
  return out;
}

export function search(query: string, limit = 8): SearchEntry[] {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  index ??= build();
  return index
    .filter((entry) => words.every((word) => entry.textKey.includes(word)))
    .map((entry) => ({ entry, score: words.filter((word) => entry.titleKey.includes(word)).length * 4 + (entry.kind === "Catatan" && words.some((w) => entry.titleKey.split(" ").includes(w)) ? 6 : 0) + (entry.kind === "Pelajaran" ? 2 : entry.kind === "Glosarium" ? 1 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ entry }) => entry);
}
