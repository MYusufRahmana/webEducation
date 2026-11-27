import { loadBalancer } from "./load-balancer";
import { messageQueue } from "./message-queue";
import { api } from "./api";
import { dns } from "./dns";
import { cdn } from "./cdn";
import { routing } from "./routing";
import { objectStorage } from "./object-storage";
import { https } from "./https";
import { replication } from "./replication";
import { cache } from "./cache";
import { dbIndex } from "./db-index";
import { sharding } from "./sharding";
import { rateLimit } from "./rate-limit";
import { waitingRoom } from "./waiting-room";
import type { TopicModule } from "./types";
import { REFERENCES } from "../references";

/** Categories in curriculum order. Only categories with at least one lesson are shown. */
export const CATEGORIES = [
  { id: "jaringan", name: "Jaringan", description: "Bagaimana permintaan menemukan dan mencapai server." },
  { id: "data", name: "Data dan Penyimpanan", description: "Di mana data dan file disimpan, dan bagaimana mereka tetap aman." },
  { id: "komunikasi", name: "Komunikasi", description: "Bagaimana aplikasi dan layanan saling berbicara dan bertukar pekerjaan." },
  { id: "keamanan", name: "Keamanan", description: "Bagaimana data dan layanan dilindungi." },
];

/** Published lessons, in curriculum order. */
export const TOPICS: TopicModule<any>[] = [loadBalancer, dns, routing, cdn, api, messageQueue, objectStorage, replication, cache, dbIndex, sharding, https, rateLimit, waitingRoom];

/** Old lesson addresses that now live inside another lesson. */
const SLUG_ALIASES: Record<string, string> = { "dns-sehari-hari": "dns" };

export const topicBySlug = (slug: string) => TOPICS.find((topic) => topic.slug === (SLUG_ALIASES[slug] ?? slug)) ?? null;
export const categoryOf = (topic: TopicModule<any>) => CATEGORIES.find((category) => category.id === topic.lesson.category)!;

/** One entry of the course list: a lesson, or a reference page of notes. */
export interface CatalogItem {
  slug: string;
  shortName: string;
  title: string;
  summary: string;
  level: string;
  minutes: number;
  /** "12 langkah" for a lesson, "56 catatan" for a reference. */
  countLabel: string;
  kind: "lesson" | "reference";
  image: (theme: "light" | "dark") => string;
}

/** Where each reference sits in its category: right after this lesson. */
const REFERENCE_AFTER: Record<string, string> = { "respons-api": "api" };

/** Categories that have lessons, each with its lessons and references in curriculum order. */
export const catalog = () =>
  CATEGORIES.map((category) => {
    const items: CatalogItem[] = [];
    const refs = REFERENCES.filter((r) => r.category === category.id);
    const asRef = (r: (typeof REFERENCES)[number]): CatalogItem => ({ slug: r.slug, shortName: r.shortName, title: r.title, summary: r.summary, level: r.level, minutes: r.minutes, countLabel: r.countLabel, kind: "reference", image: r.image });
    for (const topic of TOPICS.filter((t) => t.lesson.category === category.id)) {
      items.push({ slug: topic.slug, shortName: topic.shortName, title: topic.meta.title.id, summary: topic.meta.summary.id, level: topic.meta.level.id, minutes: topic.meta.minutes, countLabel: `${topic.lesson.steps.length} langkah`, kind: "lesson", image: topic.fallbackImage });
      for (const r of refs) if (REFERENCE_AFTER[r.slug] === topic.slug) items.push(asRef(r));
    }
    for (const r of refs) if (!items.some((i) => i.slug === r.slug)) items.push(asRef(r));
    return { ...category, lessons: items };
  }).filter((category) => category.lessons.length);

/** Key of the summary entry that closes every lesson. */
export const SUMMARY_KEY = "ringkasan";

/**
 * Resolves a step key from the URL to an index: 0…n-1 for steps, n for the summary.
 * Unknown keys fall back to the first step and report `missing`; old keys report their new key.
 */
export function resolveStep(topic: TopicModule<any>, key: string | null) {
  const steps = topic.lesson.steps;
  if (!key) return { index: 0, canonical: steps[0].key, missing: null as string | null };
  if (key === SUMMARY_KEY) return { index: steps.length, canonical: SUMMARY_KEY, missing: null };
  const direct = steps.findIndex((step) => step.key === key);
  if (direct >= 0) return { index: direct, canonical: key, missing: null };
  const mapped = topic.lesson.legacy?.[key];
  const legacy = mapped ? steps.findIndex((step) => step.key === mapped) : -1;
  if (legacy >= 0) return { index: legacy, canonical: mapped!, missing: null };
  return { index: 0, canonical: steps[0].key, missing: key };
}

export const stepKeyAt = (topic: TopicModule<any>, index: number) => (index >= topic.lesson.steps.length ? SUMMARY_KEY : topic.lesson.steps[index].key);
