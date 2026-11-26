import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { UI } from "../content/ui";
import { categoryOf, resolveStep, stepKeyAt, TOPICS } from "../topics";
import type { TopicModule } from "../topics/types";
import { Runtime, type Announcement } from "../state/runtime";
import { Link, type Navigate } from "../state/route";
import { plain } from "../state/search";
import { LearningStage } from "./Stage";
import { CourseSidebar } from "./Shell";
import { RichText } from "./RichText";
import { Icon } from "./Icon";

const announcementText = (value: Announcement) => (value.kind === "event" ? value.text.id : UI.id.announce[value.kind]);

export function LessonView({ topic, stepKey, navigate, theme }: { topic: TopicModule<any>; stepKey: string | null; navigate: Navigate; theme: "light" | "dark" }) {
  const lesson = topic.lesson;
  const total = lesson.steps.length;
  const runtime = useMemo(() => new Runtime(topic, { repeat: new URLSearchParams(location.search).get("tampilan") !== "mesin" }), [topic]);
  useEffect(() => {
    runtime.connect();
    return () => runtime.dispose();
  }, [runtime]);
  const snapshot = useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  const [selected, setSelected] = useState<string | null>(null);
  const [visited, setVisited] = useState<Set<number>>(() => new Set());
  const [missing, setMissing] = useState<string | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const room = useRef<HTMLDivElement>(null);
  const focusTitle = useRef(false);

  const { index, canonical, missing: unknown } = resolveStep(topic, stepKey);
  const isSummary = index === total;
  const step = isSummary ? null : lesson.steps[index];

  // the address always names the step shown (old and unknown keys are replaced, not added to history)
  useEffect(() => {
    if (unknown) setMissing(unknown);
    if (canonical !== stepKey) navigate({ page: "lesson", slug: topic.slug, step: canonical }, { replace: true });
  }, [canonical, stepKey, unknown, navigate, topic.slug]);

  // one place turns the active step into the figure state; the URL (buttons, map, Back/Forward) drives it
  useEffect(() => {
    runtime.setStep(Math.min(index, total - 1), { end: isSummary });
    setSelected(null);
    setVisited((value) => (value.has(index) ? value : new Set(value).add(index)));
    if (focusTitle.current) {
      focusTitle.current = false;
      title.current?.focus();
    }
  }, [runtime, index, total, isSummary]);

  useEffect(() => {
    document.title = `${step ? step.title : "Ringkasan"} · ${topic.meta.title.id} · Alur`;
  }, [step, topic]);

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(total, target));
      setMissing(null);
      if (clamped === index) {
        // choosing the step already shown starts it again (and leaves free exploration)
        runtime.setStep(Math.min(clamped, total - 1), { end: clamped === total });
        title.current?.focus();
        return;
      }
      focusTitle.current = true;
      navigate({ page: "lesson", slug: topic.slug, step: stepKeyAt(topic, clamped) });
    },
    [index, total, runtime, navigate, topic],
  );

  /* keyboard: ← → steps, R replays, Space pauses; only inside the room and never on a control that uses the key */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (!room.current?.contains(target) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (target.closest("input, textarea, select, button, a, summary, [contenteditable], .popover, [role='dialog']")) return;
      if (event.key === "ArrowRight") (goTo(index + 1), event.preventDefault());
      else if (event.key === "ArrowLeft") (goTo(index - 1), event.preventDefault());
      else if (event.key === "r" || event.key === "R") (runtime.replay(), event.preventDefault());
      else if (event.key === " ") (runtime.setPaused(!runtime.getSnapshot().paused), event.preventDefault());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [goTo, index, runtime]);

  // announcements for screen readers: phase changes only, never every frame
  const [live, setLive] = useState("");
  const lastAnnounced = useRef(0);
  useEffect(() => {
    const a = snapshot.announcement;
    if (!a || a.id === lastAnnounced.current) return;
    lastAnnounced.current = a.id;
    setLive(announcementText(a.value));
  }, [snapshot.announcement]);

  const highlight = snapshot.mode === "follow" && !isSummary ? topic.steps[index].highlight : [];
  const category = categoryOf(topic);
  const nextLabel = index + 1 < total ? lesson.steps[index + 1].short : "Ringkasan";

  return (
    <div className="room" ref={room}>
      <aside className="room-side">
        <CourseSidebar activeSlug={topic.slug} navigate={navigate} />
      </aside>

      <header className="lesson-head">
        <p className="crumbs">
          <Link to={{ page: "catalog" }} navigate={navigate}>
            {category.name}
          </Link>
          <span aria-hidden="true"> / </span>
          <span>{topic.shortName}</span>
        </p>
        <div className="lesson-title-row">
          <h1>{topic.meta.title.id}</h1>
          <p className="lesson-meta">
            <span className="badge" data-tone="time">{topic.meta.minutes} menit</span>
            <span className="badge" data-tone="level">{topic.meta.level.id}</span>
            <span className="badge" data-tone="steps">{total} langkah</span>
            <Outcomes items={lesson.outcomes} />
          </p>
        </div>
        <p className="lesson-summary">{topic.meta.summary.id}</p>
      </header>

      <div className="room-stage">
        <LearningStage
          topic={topic}
          runtime={runtime}
          snapshot={snapshot}
          theme={theme}
          stepTitle={step ? step.title : "Ringkasan"}
          highlight={highlight}
          selected={selected}
          onPart={setSelected}
        />
      </div>

      <section className="step-panel" id="materi" aria-labelledby="step-title">
        <div className="panel-head">
          <p className="step-label">
            <span className="mono">{step ? `Langkah ${index + 1} / ${total}` : "Ringkasan"}</span>
            <span className="kind" data-kind={step ? step.kind : "Ringkasan"}>
              {step ? step.kind : "Ringkasan"}
            </span>
          </p>
          <h2 id="step-title" ref={title} tabIndex={-1}>
            {step ? step.title : `Yang terjadi di ${topic.shortName}`}
          </h2>
        </div>
        <div className="panel-body">
        {missing ? (
          <div className="notice" role="alert">
            <p>
              Langkah “{missing}” tidak ditemukan. Kamu dibawa ke awal pelajaran.
            </p>
            <button type="button" className="icon-button small" onClick={() => setMissing(null)} aria-label="Tutup pemberitahuan">
              <Icon name="close" />
            </button>
          </div>
        ) : null}
        {step ? (
          <>
            <div className="step-body">
              {step.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>
                  <RichText text={paragraph} lang="id" onPart={setSelected} selected={selected} topic={topic} />
                </p>
              ))}
            </div>
            {step.practice?.length ? <Practice items={step.practice} onPart={setSelected} selected={selected} run={(action) => {
              // the practice panel already shows its controls: do not open the figure drawer
              runtime.actingFromFigure = true;
              try {
                topic.practiceAction?.(action, runtime);
              } finally {
                queueMicrotask(() => (runtime.actingFromFigure = false));
              }
            }} /> : null}
            {step.analogy ? (
              <div className="analogy">
                <h3>Analogi</h3>
                <p>{step.analogy}</p>
              </div>
            ) : null}
            <div className="observe">
              <h3>
                <Icon name="eye" />
                Amati
              </h3>
              <p>{step.observe}</p>
            </div>
            {step.changes?.length ? <section className="what-changed" aria-label="Yang berubah"><h3>Yang berubah</h3><ul>{step.changes.map(item=><li key={item}><span aria-hidden="true">~</span>{item}</li>)}</ul></section> : null}
            <KeyIdea text={step.idea} />
            {step.more?.length ? (
              <details className="more step-more">
                <summary>Pelajari lebih lanjut</summary>
                <ul>
                  {step.more.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <Summary topic={topic} navigate={navigate} onRestart={() => goTo(0)} />
        )}
        </div>
        <nav className="step-nav" id="kontrol-langkah" aria-label="Navigasi langkah">
          <button type="button" className="button" onClick={() => goTo(index - 1)} disabled={index === 0}>
            <Icon name="prev" />
            Kembali
          </button>
          {isSummary ? <span /> : null}
          {isSummary ? null : (
            <button type="button" className="button primary" onClick={() => goTo(index + 1)}>
              <span>
                Berikutnya: <span className="next-name">{nextLabel}</span>
              </span>
              <Icon name="next" />
            </button>
          )}
        </nav>
      </section>

      <StepMap topic={topic} index={index} visited={visited} onPick={goTo} />


      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {live}
      </div>
    </div>
  );
}

/** Learning goals behind a button, so they never lengthen the room. */
function Outcomes({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") (setOpen(false), button.current?.focus());
    };
    const onDown = (event: PointerEvent) => {
      if (!panel.current?.contains(event.target as Node) && !button.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <span className="popover-anchor">
      <button ref={button} type="button" className="badge badge-button" aria-expanded={open} aria-controls="tujuan-belajar" onClick={() => setOpen(!open)}>
        Tujuan belajar
      </button>
      {open ? (
        <span ref={panel} id="tujuan-belajar" className="float-panel outcomes-pop" role="dialog" aria-label="Tujuan belajar">
          <strong>Setelah pelajaran ini kamu bisa:</strong>
          <span className="outcome-list">
            {items.map((item) => (
              <span key={item} className="outcome-item">
                {item}
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </span>
  );
}

/** Lettered practice sub-steps: readable code, a copy button, explained pieces linked to the figure. */
function Practice({ items, onPart, selected, run }: { items: NonNullable<TopicModule<any>["lesson"]["steps"][number]["practice"]>; onPart: (part: string) => void; selected: string | null; run: (action: string) => void }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const item = items[Math.min(active, items.length - 1)];
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(item.id);
    window.setTimeout(() => setCopied(null), 1800);
  };
  return (
    <section className="practice" aria-label="Latihan">
      <div className="practice-tabs" role="tablist" aria-label="Langkah latihan">
        {items.map((entry, i) => (
          <button key={entry.id} type="button" role="tab" aria-selected={i === active} className="practice-tab" onClick={() => setActive(i)}>
            {entry.id}
          </button>
        ))}
      </div>
      <h3>
        Langkah {item.id} — {item.title}
      </h3>
      {item.explain?.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {item.code ? (
        <div className="practice-code">
          <pre>
            <code>{item.code}</code>
          </pre>
          <button type="button" className="button compact" onClick={() => copy(item.code!)}>
            {copied === item.id ? "Tersalin ✓" : "Salin SQL"}
          </button>
        </div>
      ) : null}
      {item.pieces?.length ? (
        <ul className="practice-pieces">
          {item.pieces.map((piece) => (
            <li key={piece.code}>
              {piece.part ? (
                <button type="button" className="part-ref" aria-pressed={selected === piece.part} onClick={() => onPart(piece.part!)}>
                  <code>{piece.code}</code>
                </button>
              ) : (
                <code>{piece.code}</code>
              )}{" "}
              {piece.text}
            </li>
          ))}
        </ul>
      ) : null}
      {item.expect ? <p className="practice-expect">{item.expect}</p> : null}
      {item.run ? (
        <button type="button" className="button" onClick={() => run(item.run!.action)}>
          {item.run.label}
        </button>
      ) : null}
      {item.note ? <p className="muted small">{item.note}</p> : null}
      <div className="practice-nav">
        <button type="button" className="button compact" disabled={active === 0} onClick={() => setActive(active - 1)}>
          Langkah sebelumnya
        </button>
        <button type="button" className="button compact" disabled={active >= items.length - 1} onClick={() => setActive(active + 1)}>
          Langkah latihan berikutnya
        </button>
      </div>
    </section>
  );
}

function KeyIdea({ text }: { text: string }) {
  return (
    <aside className="key-idea" aria-label="Gagasan inti">
      <h3>
        <Icon name="idea" />
        Gagasan inti
      </h3>
      <p>{text}</p>
    </aside>
  );
}

/** The step map: every step can be chosen at any time; visited steps are marked, never "understood". */
function StepMap({ topic, index, visited, onPick }: { topic: TopicModule<any>; index: number; visited: Set<number>; onPick: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const steps = [...topic.lesson.steps.map((step) => step.short), "Ringkasan"];
  const total = topic.lesson.steps.length;
  return (
    <nav className="step-map" aria-label="Peta langkah" data-open={open || undefined}>
      <div className="map-compact">
        <span className="mono">{index < total ? `Langkah ${index + 1} dari ${total}` : "Ringkasan"}</span>
        <button type="button" className="button compact" aria-expanded={open} aria-controls="peta-langkah" onClick={() => setOpen(!open)}>
          {open ? "Tutup daftar langkah" : "Lihat semua langkah"}
        </button>
      </div>
      <ol id="peta-langkah">
        {steps.map((short, i) => (
          <li key={short}>
            <button
              type="button"
              aria-current={i === index ? "step" : undefined}
              data-visited={visited.has(i) && i !== index ? "" : undefined}
              onClick={() => {
                setOpen(false);
                onPick(i);
              }}
            >
              <span className="map-num">{i < total ? i + 1 : "✓"}</span>
              <span className="map-name">{short}</span>
              {visited.has(i) && i !== index ? <span className="sr-only"> (sudah dibuka)</span> : null}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Summary({ topic, navigate, onRestart }: { topic: TopicModule<any>; navigate: Navigate; onRestart: () => void }) {
  const lesson = topic.lesson;
  const related = TOPICS.filter((other) => other.slug !== topic.slug);
  return (
    <>
      <ul className="summary-list">
        {lesson.summary.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      {lesson.check ? (
        <details className="more check-question">
          <summary>Pertanyaan pemahaman: {lesson.check.question}</summary>
          <p>
            <strong>Jawaban:</strong> {lesson.check.answer}
          </p>
        </details>
      ) : null}
      <div className="analogy">
        <h3>Analogi: {lesson.analogy.title}</h3>
        <table className="mapping">
          <thead>
            <tr>
              <th scope="col">Dalam analogi</th>
              <th scope="col">Sebenarnya</th>
            </tr>
          </thead>
          <tbody>
            {lesson.analogy.mapping.map(([from, to]) => (
              <tr key={from}>
                <td>{from}</td>
                <td>{to}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <h4>Batas analogi</h4>
        <ul>
          {lesson.analogy.limits.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
      </div>
      <KeyIdea text={lesson.steps[lesson.steps.length - 1].idea} />
      <details className="more">
        <summary>Batas penyederhanaan simulasi</summary>
        <ul>
          {lesson.simplifications.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
      <h3 className="related-title">Materi lain</h3>
      <ul className="related">
        {related.map((other) => (
          <li key={other.slug}>
            <Link to={{ page: "lesson", slug: other.slug, step: null }} navigate={navigate}>
              <strong>{other.meta.title.id}</strong>
              <span>{plain(other.meta.summary.id)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="print-line">
        Materi cetak (PDF A4):{" "}
        {(["poster", "drawing", "detailed"] as const).map((format, i) => (
          <span key={format}>
            {i ? " · " : ""}
            <a href={`${import.meta.env.BASE_URL}print/${topic.slug}-${format}-id.pdf`} target="_blank" rel="noopener" type="application/pdf">
              {UI.id.printFormats[format][0]}
            </a>
          </span>
        ))}
      </p>
      <p className="summary-actions">
        <Link to={{ page: "catalog" }} navigate={navigate} className="button">
          Pilih materi lain
        </Link>
        <button type="button" className="button" onClick={onRestart}>
          Ulangi pelajaran
        </button>
      </p>
    </>
  );
}
