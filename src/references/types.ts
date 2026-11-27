import type { ComponentType } from "react";
import type { Navigate } from "../state/route";

/**
 * A reference module: a searchable page of notes, read in any order. Unlike a lesson it has no steps,
 * no figure and no simulation, and it scrolls like a normal page.
 */
export interface ReferenceModule {
  slug: string;
  /** Category id (see CATEGORIES in topics/index.ts). */
  category: string;
  title: string;
  shortName: string;
  summary: string;
  level: string;
  minutes: number;
  /** "56 catatan" on the catalogue card. */
  countLabel: string;
  image: (theme: "light" | "dark") => string;
  /** Search entries offered by the global search box; `item` opens that note. */
  searchEntries: () => { title: string; snippet: string; text: string; item: string }[];
  Page: ComponentType<{ navigate: Navigate; item: string | null }>;
}
