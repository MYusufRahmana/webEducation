import type { ComponentType } from "react";
import type { Bilingual, Lang } from "../content/topic";
import type { Runtime } from "../state/runtime";

/**
 * Everything the page needs from one topic. The page, the runtime and the panel are shared;
 * a topic brings its content, its simulation and its figure.
 */

export interface TopicSim {
  t: number;
  log: unknown[];
}

export interface TopicStep<S extends TopicSim = TopicSim> {
  key: string;
  /** Parts drawn with the lit accent while the step is active. */
  highlight: string[];
  build: () => S;
  /** The demonstration holds still at this simulated time. */
  holdAt?: number;
}

export interface TopicStepContent {
  key: string;
  title: Bilingual;
  body: Bilingual<string[]>;
  observe: Bilingual<string[]>;
}

/** Step kinds from the editorial pattern (PRD §3). */
export type StepKind = "Masalah" | "Analogi" | "Proses" | "Percobaan" | "Ringkasan";

/**
 * One step of a lesson, in Indonesian. Inline markup: [[term|label]] opens a glossary entry,
 * {{part|label}} selects a part of the figure.
 */
export interface LessonStep {
  changes?: string[];
  /** Stable key used in the URL (?langkah=key). */
  key: string;
  /** Short title for the step map and the "Berikutnya" button. */
  short: string;
  /** Main title: one concrete event, about 4–9 words. */
  title: string;
  kind: StepKind;
  /** Two to four short paragraphs, 70–140 words in total. */
  body: string[];
  /** An optional short analogy shown in its own box. */
  analogy?: string;
  /** One instruction pointing at a visible change in the figure. */
  observe: string;
  /** One sentence to remember. */
  idea: string;
  /** Optional extra detail behind “Pelajari lebih lanjut”. */
  more?: string[];
}

export interface Lesson {
  /** Category id (see CATEGORIES in topics/index.ts). */
  category: string;
  /** Aligned 1:1 with TopicModule.steps (the figure state of each step). */
  steps: LessonStep[];
  /** Old step keys (from the scrollytelling version) mapped to current keys. */
  legacy?: Record<string, string>;
  /** The lesson's main analogy: what stands for what, and where it stops being true. */
  analogy: { title: string; mapping: [string, string][]; limits: string[] };
  /** Mechanism points for the summary. */
  summary: string[];
  /** What the simulation leaves out. */
  simplifications: string[];
  outcomes: string[];
}

/** A value shown above the figure. `value: null` reads "Belum tersedia", never zero. */
export interface Metric {
  label: string;
  value: string | null;
  unit?: string;
  warn?: boolean;
}

export interface FigureStageProps {
  representation?: "analogy" | "system";
  runtime: Runtime;
  lang: Lang;
  highlight: string[];
  selected: string | null;
  onPart: (part: string | null) => void;
}

export interface DetailsProps<S extends TopicSim = TopicSim> {
  sim: S;
  lang: Lang;
  runtime: Runtime;
  mode: "follow" | "explore";
}

export interface TopicModule<S extends TopicSim = TopicSim> {
  dualView?: boolean;
  /** Legend for the analogy/system views: token colours and line styles. */
  viewLegend?: { swatch: "request" | "response" | "referral" | "retry" | "fail" | "dash" | "probe"; text: string }[];
  /** Part names in the analogy and system views. */
  viewParts?: import("./view-parts").ViewParts;
  slug: string;
  fig: string;
  /** Width / height of the figure's viewBox. */
  aspect: number;
  meta: {
    category: Bilingual;
    title: Bilingual;
    summary: Bilingual;
    level: Bilingual;
    minutes: number;
    outcomes: Bilingual<string[]>;
  };
  stepContent: TopicStepContent[];
  closing: { title: Bilingual; points: Bilingual<string[]>; limitsTitle: Bilingual; limits: Bilingual<string[]> };
  glossary: Record<string, { term: Bilingual; definition: Bilingual }>;
  parts: Record<string, { name: Bilingual; role: Bilingual }>;
  partOrder: string[];
  legend: { swatch: "lit" | "token" | "pulse" | "ghost"; text: Bilingual }[];
  steps: TopicStep<S>[];
  advance: (sim: S, dt: number) => void;
  /** Simulation seconds per real second while playing (default 1). Below 1 slows every movement evenly. */
  pace?: number;
  /** Called once when the reader switches to free exploration (for example to stop the story's scripted events). */
  onExplore?: (sim: S) => void;
  /** A sentence for screen readers when a log entry marks a phase change, or null. */
  announce: (entry: unknown) => Bilingual | null;
  stateTitle: (sim: S, lang: Lang) => string;
  readout: (sim: S, lang: Lang) => string;
  heldNote: Bilingual;
  /** Explore controls (shown in free exploration) and the live readouts. */
  Details: ComponentType<DetailsProps<S>>;
  loadFigure: () => Promise<{ default: ComponentType<FigureStageProps> }>;
  /** The same simulation drawn as real components ("Sistem sebenarnya"). */
  loadSystem: () => Promise<{ default: ComponentType<FigureStageProps> }>;
  fallbackImage: (theme: "light" | "dark") => string;
  lesson: Lesson;
  /** Two to four values relevant to the lesson, read from the same model as the figure. */
  metrics: (sim: S) => Metric[];
  /** Page title for the document. */
  docTitle: Bilingual;
  /** Short name for the topic menu. */
  shortName: string;
  /** The hint under the hero button. */
  scrollHint: Bilingual;
}
