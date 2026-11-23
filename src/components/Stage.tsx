import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentType, type LazyExoticComponent, type ReactNode } from "react";
import type { Runtime, Snapshot } from "../state/runtime";
import type { FigureStageProps, TopicModule } from "../topics/types";
import { Icon } from "./Icon";

type View = "analogy" | "system" | "machine";
const params = new URLSearchParams(location.search);
const failOnPurpose = params.has("nofigure");
/** `?tampilan=mesin` shows the original anatomy machine (used by the printable sheets). */
const machineOnly = params.get("tampilan") === "mesin";

/** One lazy figure component per lesson and kind, recreated when the reader asks to load it again. */
const stages = new Map<string, LazyExoticComponent<ComponentType<FigureStageProps>>>();
function stageOf(topic: TopicModule<any>, kind: "machine" | "system", fresh = false) {
  const key = `${topic.slug}:${kind}`;
  if (fresh || !stages.has(key)) stages.set(key, lazy(() => (failOnPurpose ? Promise.reject(new Error("figure disabled by ?nofigure")) : kind === "machine" ? topic.loadFigure() : topic.loadSystem())));
  return stages.get(key)!;
}

class FigureBoundary extends Component<{ onRetry: () => void; fallback: (retry: () => void) => ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  retry = () => {
    this.props.onRetry();
    this.setState({ failed: false });
  };
  render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}

function statusOf(snapshot: Snapshot) {
  if (snapshot.paused) return { kind: "paused", text: "Dijeda: waktu dan penghitung berhenti" };
  if (snapshot.mode === "explore") return { kind: "explore", text: "Eksplorasi bebas" };
  if (snapshot.atEnd) return { kind: "held", text: "Keadaan akhir pelajaran" };
  if (snapshot.held) return { kind: "held", text: "Ringkasan langkah" };
  // a new pass restarts the counters: say so, so the numbers going back do not look like an error
  if (snapshot.cycle > 1) return { kind: "follow", text: `Putaran ${snapshot.cycle} · kejadian langkah ini diulang dari awal` };
  return { kind: "follow", text: "Animasi berulang · lanjut saat kamu siap" };
}

const readView = (): View => {
  if (machineOnly) return "machine";
  try {
    return localStorage.getItem("webedukasi.view") === "analogy" ? "analogy" : "system";
  } catch {
    return "system";
  }
};

/** Closes a floating panel on Escape or a click outside, and returns focus to its opener. */
function useDismiss(open: boolean, close: () => void, panel: React.RefObject<HTMLElement>, opener: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        opener.current?.focus();
      }
    };
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || opener.current?.contains(target)) return;
      close();
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close, panel, opener]);
}

export function LearningStage({
  topic,
  runtime,
  snapshot,
  theme,
  stepTitle,
  highlight,
  selected,
  onPart,
}: {
  topic: TopicModule<any>;
  runtime: Runtime;
  snapshot: Snapshot;
  theme: "light" | "dark";
  stepTitle: string;
  highlight: string[];
  selected: string | null;
  onPart: (part: string | null) => void;
}) {
  const { sim, mode, paused } = snapshot;
  const panel = useRef<HTMLElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const exitButton = useRef<HTMLButtonElement>(null);
  const [full, setFull] = useState<"none" | "native" | "dialog">("none");
  const [hidden, setHidden] = useState(false);
  const [view, setViewState] = useState<View>(readView);
  const kind = view === "machine" ? "machine" : "system";
  const [figures, setFigures] = useState(() => ({ machine: stageOf(topic, "machine"), system: stageOf(topic, "system") }));
  const FigureStage = figures[kind];
  const [drawer, setDrawer] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const status = statusOf(snapshot);
  const Details = topic.Details;
  const names = topic.viewParts;
  const partName = (part: string) => (names?.[part] ? (view === "analogy" ? names[part].analogy : view === "system" ? names[part].system : topic.parts[part].name.id) : topic.parts[part]?.name.id ?? part);
  const partRole = (part: string) => (view !== "machine" && names?.[part] ? names[part].role : topic.parts[part]?.role.id ?? "");

  const setView = (next: View) => {
    setViewState(next);
    try {
      localStorage.setItem("webedukasi.view", next);
    } catch {
      /* the choice still applies for this visit */
    }
  };

  /* full screen: the Fullscreen API when available, otherwise a dialog that fills the viewport */
  const enterFull = useCallback(async () => {
    opener.current = document.activeElement as HTMLElement;
    const element = panel.current;
    if (element?.requestFullscreen) {
      try {
        await element.requestFullscreen();
        setFull("native");
        return;
      } catch {
        /* fall through to the dialog */
      }
    }
    setFull("dialog");
  }, []);
  const exitFull = useCallback(async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    setFull("none");
  }, []);
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull((value) => (value === "native" ? "none" : value));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const wasFull = useRef(false);
  useEffect(() => {
    if (full !== "none") {
      wasFull.current = true;
      exitButton.current?.focus();
    } else if (wasFull.current) {
      wasFull.current = false;
      opener.current?.focus();
    }
    if (full !== "dialog") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !drawer && !mapOpen) setFull("none");
      if (event.key === "Tab" && panel.current) {
        const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), [href], summary, select")).filter((el) => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) (last.focus(), event.preventDefault());
        else if (!event.shiftKey && document.activeElement === last) (first.focus(), event.preventDefault());
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [full, drawer, mapOpen]);

  // the simulation runs only while the figure is on screen and the page is visible
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries) => runtime.setVisible(entries[entries.length - 1].isIntersecting), { rootMargin: "120px 0px" });
    observer.observe(element);
    return () => {
      observer.disconnect();
      runtime.setVisible(false);
    };
  }, [runtime]);

  // changing a parameter means exploring: show its controls
  useEffect(() => {
    if (mode === "explore") setDrawer(true);
  }, [mode]);

  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerOpener = useRef<HTMLButtonElement>(null);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  useDismiss(drawer, closeDrawer, drawerRef, drawerOpener);
  useEffect(() => {
    if (drawer) drawerRef.current?.querySelector<HTMLElement>("button")?.focus();
  }, [drawer]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapOpener = useRef<HTMLButtonElement>(null);
  const closeMap = useCallback(() => setMapOpen(false), []);
  useDismiss(mapOpen, closeMap, mapRef, mapOpener);

  const isFull = full !== "none";
  const metrics = topic.metrics(sim).slice(0, 4);
  const mapping = topic.lesson.analogy;

  return (
    <section
      ref={panel}
      className="stage"
      id="anatomi"
      aria-labelledby="stage-heading"
      data-full={isFull ? full : undefined}
      role={full === "dialog" ? "dialog" : undefined}
      aria-modal={full === "dialog" ? true : undefined}
      aria-label={full === "dialog" ? stepTitle : undefined}
      tabIndex={-1}
    >
      <h2 id="stage-heading" className="sr-only">
        Figur {topic.shortName}
      </h2>
      <div className="stage-bar">
        {topic.dualView && !machineOnly ? (
          <div className="segmented view-toggle" role="group" aria-label="Cara melihat figur">
            <button type="button" aria-pressed={view === "analogy"} onClick={() => setView("analogy")}>
              Analogi sehari-hari
            </button>
            <button type="button" aria-pressed={view === "system"} onClick={() => setView("system")}>
              Sistem sebenarnya
            </button>
          </div>
        ) : null}
        <div className="popover-anchor">
          <button ref={mapOpener} type="button" className="button compact ghost" aria-expanded={mapOpen} aria-controls="hubungan-analogi" onClick={() => setMapOpen(!mapOpen)}>
            Hubungan analogi
          </button>
          {mapOpen ? (
            <div ref={mapRef} id="hubungan-analogi" className="float-panel analogy-pop" role="dialog" aria-label="Hubungan analogi">
              <div className="float-head">
                <strong>{mapping.title}</strong>
                <button type="button" className="icon-button small" onClick={() => (setMapOpen(false), mapOpener.current?.focus())} aria-label="Tutup hubungan analogi">
                  <Icon name="close" />
                </button>
              </div>
              <table className="mapping">
                <thead>
                  <tr>
                    <th scope="col">Analogi sehari-hari</th>
                    <th scope="col">Sistem sebenarnya</th>
                  </tr>
                </thead>
                <tbody>
                  {mapping.mapping.map(([from, to]) => (
                    <tr key={from}>
                      <td>{from}</td>
                      <td>{to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small muted">Kedua tampilan memakai posisi dan simulasi yang sama. Mengganti tampilan tidak mengulang demonstrasi.</p>
              <h4>Batas analogi</h4>
              <ul className="small">
                {mapping.limits.map((limit) => (
                  <li key={limit}>{limit}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="stage-buttons">
          <button type="button" className="button compact" onClick={() => runtime.replay()} title="Ulangi langkah (R)">
            <Icon name="replay" />
            <span className="btn-text">Ulangi</span>
            <span className="sr-only"> langkah</span>
          </button>
          <button type="button" className="button compact" onClick={() => runtime.setPaused(!paused)} aria-pressed={paused} title={paused ? "Lanjutkan (Spasi)" : "Jeda (Spasi)"}>
            <Icon name={paused ? "play" : "pause"} />
            <span className="btn-text">{paused ? "Lanjutkan" : "Jeda"}</span>
          </button>
          <button ref={drawerOpener} type="button" className="button compact" title="Rincian figur" aria-expanded={drawer} aria-controls="rincian-figur" onClick={() => setDrawer(!drawer)}>
            <Icon name="menu" />
            <span className="btn-text">Rincian</span>
          </button>
          {isFull ? (
            <button ref={exitButton} type="button" className="icon-button" onClick={exitFull} aria-label="Keluar layar penuh" title="Keluar layar penuh">
              <Icon name="shrink" />
            </button>
          ) : (
            <button type="button" className="icon-button" onClick={enterFull} aria-label="Layar penuh" title="Layar penuh">
              <Icon name="expand" />
            </button>
          )}
          <button type="button" className="icon-button narrow-only" onClick={() => setHidden(!hidden)} aria-pressed={hidden} aria-label={hidden ? "Tampilkan figur" : "Sembunyikan figur"} title={hidden ? "Tampilkan figur" : "Sembunyikan figur"}>
            <Icon name={hidden ? "show" : "hide"} />
          </button>
        </div>
      </div>

      <dl className="metrics" aria-label="Angka dari simulasi">
        {metrics.map((metric) => (
          <div key={metric.label} data-warn={metric.warn || undefined}>
            <dt>{metric.label}</dt>
            <dd>
              {metric.value === null ? (
                <span className="muted">—</span>
              ) : (
                <>
                  <b>{metric.value}</b>
                  {metric.unit ? <span> {metric.unit}</span> : null}
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>

      <div className="stage-figure" ref={box} hidden={hidden && !isFull}>
        <div className="iso-art iso" data-theme={theme} data-kind={kind}>
          <FigureBoundary
            onRetry={() => setFigures((value) => ({ ...value, [kind]: stageOf(topic, kind, true) }))}
            fallback={(retry) => (
              <div className="figure-fallback" role="status">
                <img className="figure-static" src={topic.fallbackImage(theme)} alt={`Gambar statis ${topic.meta.title.id}. Gambar ini tidak menunjukkan keadaan langkah tertentu.`} />
                <p>Figur belum dapat dimuat. Penjelasan di panel materi tetap lengkap.</p>
                <button type="button" className="button" onClick={retry}>
                  Coba muat ulang
                </button>
              </div>
            )}
          >
            <Suspense
              fallback={
                <div className="figure-loading" role="status">
                  Memuat figur…
                </div>
              }
            >
              <FigureStage representation={view === "analogy" ? "analogy" : "system"} runtime={runtime} lang="id" highlight={highlight} selected={selected} onPart={onPart} />
            </Suspense>
          </FigureBoundary>
        </div>
        {selected ? (
          <div className="part-info" role="region" aria-live="polite" aria-label={partName(selected)}>
            <div className="part-info-head">
              <strong>{partName(selected)}</strong>
              <button type="button" className="icon-button small" onClick={() => onPart(null)} aria-label="Tutup info komponen">
                <Icon name="close" />
              </button>
            </div>
            <p>{partRole(selected)}</p>
          </div>
        ) : null}
      </div>

      <div className="stage-foot">
        <p className="figure-note" data-kind={status.kind}>
          <span className="status-dot" aria-hidden="true" />
          <strong className="state-title">{topic.stateTitle(sim, "id")}</strong>
          <span className="note-text">{status.text}</span>
          <span className="state-readout">{topic.readout(sim, "id")}</span>
        </p>
        {mode === "explore" ? (
          <button type="button" className="button compact" onClick={() => runtime.backToExplanation()}>
            Kembali ke materi
          </button>
        ) : null}
        <ul className="legend legend-foot">
          {kind === "system" && topic.viewLegend
            ? topic.viewLegend.map((item) => (
                <li key={item.text}>
                  <span className={`vswatch vswatch-${item.swatch}`} aria-hidden="true" />
                  {item.text}
                </li>
              ))
            : topic.legend.map((item) => (
                <li key={item.text.en}>
                  <span className={`swatch swatch-${item.swatch}`} aria-hidden="true" />
                  {item.text.id}
                </li>
              ))}
          {kind === "system" ? (
            <li>
              <span className="vswatch vswatch-hl" aria-hidden="true" />
              disorot: bagian langkah ini
            </li>
          ) : null}
        </ul>
      </div>

      {drawer ? (
        <div ref={drawerRef} id="rincian-figur" className="float-panel stage-drawer" role="dialog" aria-label="Rincian figur">
          <div className="float-head">
            <strong>Rincian figur</strong>
            <button type="button" className="icon-button small" onClick={() => (setDrawer(false), drawerOpener.current?.focus())} aria-label="Tutup rincian">
              <Icon name="close" />
            </button>
          </div>
          <div className="mode">
            <div className="segmented" role="group" aria-label="Mode figur">
              <button type="button" aria-pressed={mode === "follow"} onClick={() => runtime.backToExplanation()}>
                Ikuti materi
              </button>
              <button type="button" aria-pressed={mode === "explore"} onClick={() => runtime.explore()}>
                Eksplorasi bebas
              </button>
            </div>
            <p className="muted small">Memilih langkah mengakhiri eksplorasi dan menjalankan langkah itu.</p>
          </div>
          <h4>Legenda</h4>
          <ul className="legend legend-drawer">
            {(kind === "system" && topic.viewLegend ? topic.viewLegend.map((item) => ({ key: item.text, cls: `vswatch vswatch-${item.swatch}`, text: item.text })) : topic.legend.map((item) => ({ key: item.text.en, cls: `swatch swatch-${item.swatch}`, text: item.text.id }))).map((item) => (
              <li key={item.key}>
                <span className={item.cls} aria-hidden="true" />
                {item.text}
              </li>
            ))}
          </ul>
          <h4>Komponen</h4>
          <ul className="parts-list" aria-label="Komponen figur">
            {topic.partOrder.map((part) => (
              <li key={part}>
                <button type="button" className="chip" aria-pressed={selected === part} data-lit={highlight.includes(part) || undefined} onClick={() => onPart(selected === part ? null : part)}>
                  {partName(part)}
                </button>
              </li>
            ))}
          </ul>
          <Details sim={sim} lang="id" runtime={runtime} mode={mode} />
          {!machineOnly ? (
            <p className="small muted">
              Mesin anatomy versi cetak:{" "}
              <a href={`${location.pathname}${location.search}&tampilan=mesin`} target="_blank" rel="noopener">
                buka tampilan mesin
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
