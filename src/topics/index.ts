import { loadBalancer } from "./load-balancer";
import { messageQueue } from "./message-queue";
import { dns } from "./dns";
import { objectStorage } from "./object-storage";
import { https } from "./https";
import { replication } from "./replication";
import { cache } from "./cache";
import type { TopicModule } from "./types";

/** Categories in curriculum order. Only categories with at least one lesson are shown. */
export const CATEGORIES = [
  { id: "jaringan", name: "Jaringan", description: "Bagaimana permintaan menemukan dan mencapai server." },
  { id: "data", name: "Data dan Penyimpanan", description: "Di mana data dan file disimpan, dan bagaimana mereka tetap aman." },
  { id: "komunikasi", name: "Komunikasi", description: "Bagaimana layanan bertukar pekerjaan tanpa saling menunggu." },
  { id: "keamanan", name: "Keamanan", description: "Bagaimana data dilindungi dalam perjalanan." },
];

/** Published lessons, in curriculum order. */
export const TOPICS: TopicModule<any>[] = [loadBalancer, dns, messageQueue, objectStorage, replication, cache, https];

export const topicBySlug = (slug: string) => TOPICS.find((topic) => topic.slug === slug) ?? null;
export const categoryOf = (topic: TopicModule<any>) => CATEGORIES.find((category) => category.id === topic.lesson.category)!;

/** Categories that have lessons, each with its lessons. */
export const catalog = () =>
  CATEGORIES.map((category) => ({ ...category, lessons: TOPICS.filter((topic) => topic.lesson.category === category.id) })).filter((category) => category.lessons.length);

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
