import { HTTP_NOTES, INTERNAL_NOTES, NOTES } from "./respons-api/data";
import { ResponsApiPage, SLUG } from "./respons-api/Page";
import type { ReferenceModule } from "./types";

export const responsApi: ReferenceModule = {
  slug: SLUG,
  category: "komunikasi",
  title: "Respons API: Arti Kode dan Cara Menanganinya",
  shortName: "Respons API",
  summary: "Catatan referensi untuk frontend, backend, dan QA: arti status HTTP dan kode internal aplikasi, contoh respons, serta tindakan yang tepat. Cari langsung kode yang kamu temui.",
  level: "Referensi",
  minutes: 10,
  countLabel: `${HTTP_NOTES.length + INTERNAL_NOTES.length} catatan`,
  image: (theme) => `${import.meta.env.BASE_URL}respons-api-${theme}.png`,
  searchEntries: () =>
    NOTES.map((n) => ({
      title: n.kind === "http" ? `HTTP ${n.code} ${n.name}` : `Kode internal ${n.code} ${n.name}`,
      snippet: n.arti,
      text: `${n.keywords} ${n.kind === "http" ? n.contoh : `HTTP ${n.http} ${n.area}`}`,
      item: n.id,
    })),
  Page: ResponsApiPage,
};

export const REFERENCES: ReferenceModule[] = [responsApi];

/** The simulation that this reference replaced lived at ?topik=request-gagal. */
const ALIASES: Record<string, string> = { "request-gagal": "respons-api" };
export const referenceBySlug = (slug: string) => REFERENCES.find((r) => r.slug === (ALIASES[slug] ?? slug)) ?? null;
