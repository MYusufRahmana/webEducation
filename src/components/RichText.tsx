import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../content/topic";
import type { TopicModule } from "../topics/types";
import { UI } from "../content/ui";

/** Renders [[term|label]] as glossary buttons and {{part|label}} as component buttons. */
export function RichText({ text, lang, onPart, selected, topic }: { text: string; lang: Lang; onPart: (part: string) => void; selected: string | null; topic: TopicModule<any> }) {
  const out: ReactNode[] = [];
  const pattern = /\[\[([a-z-]+)\|([^\]]+)\]\]|\{\{([a-zA-Z][a-zA-Z0-9_-]*)\|([^}]+)\}\}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    if (match[1]) out.push(<GlossaryTerm key={key++} entry={topic.glossary[match[1]]} label={match[2]} lang={lang} />);
    else {
      const part = match[3];
      out.push(
        <button key={key++} type="button" className="part-ref" aria-pressed={selected === part} onClick={() => onPart(part)} title={topic.parts[part]?.name[lang]}>
          {match[4]}
        </button>,
      );
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}

/** A glossary term: tap, click, Enter or Space opens a definition; Escape, the close button or a click outside closes it. */
export function GlossaryTerm({ entry, label, lang }: { entry: TopicModule["glossary"][string] | undefined; label: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ left: number; top: number; above: boolean }>({ left: 0, top: 0, above: false });
  const button = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();

  useLayoutEffect(() => {
    if (!open || !button.current || !pop.current) return;
    const rect = button.current.getBoundingClientRect();
    const width = pop.current.offsetWidth;
    const height = pop.current.offsetHeight;
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    const above = rect.bottom + height + 16 > window.innerHeight && rect.top - height - 16 > 0;
    setPlace({ left, top: above ? rect.top - height - 8 : rect.bottom + 8, above });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        button.current?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (pop.current?.contains(target) || button.current?.contains(target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  if (!entry) return <>{label}</>;
  return (
    <>
      <button ref={button} type="button" className="term" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((value) => !value)}>
        {label}
      </button>
      {open ? (
        <div ref={pop} id={id} className="popover" role="dialog" aria-label={entry.term[lang]} style={{ left: place.left, top: place.top }} data-above={place.above || undefined}>
          <div className="popover-head">
            <strong>{entry.term[lang]}</strong>
            <button
              type="button"
              className="icon-button small"
              aria-label={UI[lang].glossaryClose}
              onClick={() => {
                setOpen(false);
                button.current?.focus();
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
          <p>{entry.definition[lang]}</p>
        </div>
      ) : null}
    </>
  );
}
