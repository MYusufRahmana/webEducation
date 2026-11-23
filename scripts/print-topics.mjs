/**
 * Printable A4 sheets for every topic, drawn from the live figures.
 *
 *   npm run preview            (in another terminal: the sheets are captured from the built site)
 *   node scripts/print-topics.mjs [--topic dns] [--format poster|drawing|detailed|all] [--lang id|en|all] [--png]
 *
 * Uses the anatomy kit's own `capture` (freezes each pose of the live SVG as vectors) and `sheetHtml`
 * (lays out the poster, the technical drawing and the detailed handout), then prints with Chrome.
 * Specs with the poses, parts and text live in scripts/sheets/<topic>.mjs; every number in them
 * comes from the topic's simulation model.
 *
 * PDFs go to public/print/<topic>-<format>-<lang>.pdf, review copies (HTML, PNG) to shots/print/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { capture, printPdf } from "../vendor/anatomy/scripts/print.mjs";
import { FORMATS, PAPER, pagesOf, sheetHtml } from "../vendor/anatomy/scripts/print-sheet.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const option = (flag, fallback) => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] : fallback);
const BASE = option("--base", process.env.PRINT_BASE ?? "http://localhost:4180/");
const TOPICS = option("--topic", "all") === "all" ? ["load-balancer", "message-queue", "dns"] : [option("--topic")];
const formats = option("--format", "all") === "all" ? FORMATS : [option("--format")];
const langs = option("--lang", "all") === "all" ? ["id", "en"] : [option("--lang")];
const png = argv.includes("--png");

/** The figure styles: the kit's own sheet, plus the page's figure tokens without its step highlights. */
function figureCss() {
  const kit = readFileSync(join(ROOT, "src/figure/kit/iso.css"), "utf8");
  const figure = readFileSync(join(ROOT, "src/styles/figure.css"), "utf8").split(String.fromCharCode(13)).join("");
  const rules = figure
    .split(/\n}\n/)
    .map((rule) => rule.trim())
    .filter((rule) => rule && !/data-hl|data-focus|data-sel/.test(rule.split("{")[0]))
    .map((rule) => `${rule}\n}`)
    .join("\n")
    .replace(/\.iso-art/g, ".iso")
    // on a sheet the figure is cloned without its root <svg class="lb-svg">, so drop that prefix
    .replace(/\.lb-svg /g, "");
  // paper is white on a sheet
  return `${kit}\n${rules}\n.iso[data-theme="light"]{--anatomy-paper:#ffffff;--anatomy-card:#ffffff}`;
}

/** The sheet layout is written in English; translate its fixed labels for the Indonesian sheets. */
const LABELS_ID = [
  [/<html lang="en">/, '<html lang="id">'],
  [/How it works/g, "Cara kerja"],
  [/>Parts</g, ">Bagian<"],
  [/>Specification</g, ">Spesifikasi<"],
  [/>Anatomy</g, ">Anatomi<"],
  [/>Not to scale</g, ">Tidak berskala<"],
  [/Explained drawing/g, "Gambar penjelas"],
  [/>Drawing</g, ">Gambar<"],
  [/>Assemblies</g, ">Rakitan<"],
  [/>Close-ups</g, ">Detail<"],
];
const localize = (html, lang) => (lang === "id" ? LABELS_ID.reduce((text, [from, to]) => text.replace(from, to), html) : html);

const outDir = join(ROOT, "public/print");
const reviewDir = join(ROOT, "shots/print");
mkdirSync(outDir, { recursive: true });
mkdirSync(reviewDir, { recursive: true });
const css = figureCss();
let failed = false;

for (const slug of TOPICS) {
  const spec = (await import(pathToFileURL(join(ROOT, "scripts/sheets", `${slug}.mjs`)).href)).default;
  const url = `${BASE}?topik=${slug}&lang=id`;
  console.log(`capturing ${slug} from ${url}`);
  const captured = await capture(spec, url);
  captured.css = css;
  for (const part of spec.parts) if (!captured.views[spec.main.view].boxes[part.id]) console.warn(`  warning: part ${part.id} matched nothing in view ${spec.main.view}`);
  for (const lang of langs) {
    const text = spec.text[lang];
    const full = { ...spec, ...text, parts: spec.parts.map((part) => ({ ...part, ...text.parts[part.id] })), steps: spec.steps.map((step, i) => ({ ...step, ...text.steps[i] })), details: spec.details.map((detail, i) => ({ ...detail, ...text.details[i] })), inset: { ...spec.inset, label: text.inset } };
    for (const format of formats) {
      const name = `${slug}-${format}-${lang}`;
      const htmlFile = join(reviewDir, `${name}.html`);
      writeFileSync(htmlFile, localize(sheetHtml(captured, full, PAPER.a4, format), lang));
      const expected = pagesOf(format, full);
      const { pages, bytes } = printPdf(htmlFile, join(outDir, `${name}.pdf`), { png: png ? join(reviewDir, `${name}.png`) : null, paper: PAPER.a4, pages: expected });
      const ok = pages === expected;
      if (!ok) failed = true;
      console.log(`  ${ok ? "wrote" : "OVERFLOW"} ${name}.pdf · ${pages}/${expected} page${expected === 1 ? "" : "s"} · ${(bytes / 1024).toFixed(0)} KB`);
    }
  }
}
if (failed) {
  console.error("some sheets ran past their page count: shorten their text");
  process.exitCode = 1;
}
