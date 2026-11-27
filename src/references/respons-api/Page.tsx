import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { hrefOf, type Navigate } from "../../state/route";
import { CourseSidebar } from "../../components/Shell";
import { Icon } from "../../components/Icon";
import "./reference.css";
import {
  CONFUSED,
  DEV_QA_NOTES,
  filterOf,
  FILTERS,
  findNotes,
  FRONTEND_ACTIONS,
  HTTP_NOTES,
  INTERNAL_EXAMPLE,
  INTERNAL_NOTES,
  NOTES,
  REMINDERS,
  STATUS_GROUPS,
  type Example,
  type HttpNote,
  type InternalNote,
  type Note,
} from "./data";

export const SLUG = "respons-api";
const FAV_KEY = "alur.respons-api.favorit";

/* ---------------------------------------------------------------- small helpers */
function readFavourites(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function writeFavourites(list: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
  } catch {
    /* private mode or blocked storage: favourites just do not persist */
  }
}
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}
function CopyButton({ text, label = "Salin contoh" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="button compact ref-copy"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? "Tersalin ✓" : label}
    </button>
  );
}
const rangeOf = (code: number) => String(code)[0];

/** The badge that keeps HTTP 200 and application code 2002 apart, in words as well as colour. */
function CodeBadge({ note }: { note: Note }) {
  return note.kind === "http" ? (
    <span className="ref-badge" data-kind="http" data-range={rangeOf(note.code)}>
      <span className="ref-badge-kind">HTTP</span> {note.code}
    </span>
  ) : (
    <span className="ref-badge" data-kind="app">
      <span className="ref-badge-kind">Internal</span> {note.code}
    </span>
  );
}

function ExampleBlock({ example }: { example: Example }) {
  const text = example.body ? `${example.head}\n\n${example.body}` : example.head;
  return (
    <figure className="ref-example">
      <div className="ref-example-head"><span>Contoh respons</span><CopyButton text={text} label="Salin" /></div>
      <pre>
        <code>{text}</code>
      </pre>
      <div className="ref-example-foot">
        {example.note ? <figcaption>{example.note}</figcaption> : <span />}
      </div>
    </figure>
  );
}

function HttpDetail({ note }: { note: HttpNote }) {
  const success = note.code < 400;
  return (
    <div className="ref-detail">
      <div className="ref-pair-grid">
        <section className="ref-scenario"><h3>Bayangkan di website tiket</h3><p>{note.contoh}</p></section>
        <section className="ref-reasons"><h3>{success ? "Kapan dipakai" : "Kemungkinan penyebab"}</h3><ul>{note.sebab.map((s) => <li key={s}>{s}</li>)}</ul></section>
      </div>
      {note.example ? <ExampleBlock example={note.example} /> : null}
      <div className="ref-action-grid">
        <section><h3><Icon name="next" /> Tindakan frontend</h3><p>{note.frontend}</p></section>
        <section><h3><Icon name="eye" /> Pemeriksaan backend / QA</h3><p>{note.backend}</p></section>
      </div>
      {note.note ? <p className="ref-callout">{note.note}</p> : null}
      <p className="ref-remember">
        <strong>Pengingat:</strong> {note.pengingat}
      </p>
    </div>
  );
}
function InternalDetail({ note }: { note: InternalNote }) {
  return (
    <div className="ref-detail">
      <dl>
        <dt>Kode dan nama</dt>
        <dd>
          <code>{note.code}</code> · <code>{note.name}</code> · area {note.area}
        </dd>
        <dt>Status HTTP</dt>
        <dd>
          <span className="ref-badge" data-kind="http" data-range={rangeOf(note.http)}>
            <span className="ref-badge-kind">HTTP</span> {note.http}
          </span>{" "}
          <span className="muted small">menurut daftar error aplikasi</span>
        </dd>
        <dt>Arti sederhana</dt>
        <dd>{note.arti}</dd>
        <dt>Pemeriksaan pertama</dt>
        <dd>{note.periksa}</dd>
      </dl>
      {note.editorial ? (
        <p className="ref-callout" data-tone="editorial">
          <strong>Catatan editorial:</strong> {note.editorial}
        </p>
      ) : null}
    </div>
  );
}


function NoteRow({ note, selected, fav, onSelect, onFav }: { note: Note; selected: boolean; fav: boolean; onSelect: () => void; onFav: () => void }) {
  return <li className="ref-row" data-selected={selected || undefined}><div className="ref-row-head">
    <button type="button" className="ref-row-toggle" aria-pressed={selected} onClick={onSelect}>
      <CodeBadge note={note} /><span className="ref-row-text"><strong>{note.name}</strong><span className="ref-row-short">{note.kind === "http" ? note.pengingat : note.arti}</span></span><Icon name="next" />
    </button>
    <button type="button" className="ref-icon-button" aria-pressed={fav} aria-label={fav ? "Hapus " + note.code + " dari favorit" : "Tandai " + note.code + " sebagai favorit"} onClick={onFav}>{fav ? "★" : "☆"}</button>
  </div></li>;
}

const OVERVIEW = [
  { code: "2xx", filter: "berhasil", label: "Berhasil", hint: "Baca hasil respons", icon: "✓" },
  { code: "4xx", filter: "permintaan", label: "Permintaan & akses", hint: "Periksa input atau izin", icon: "!" },
  { code: "5xx", filter: "gangguan", label: "Gangguan layanan", hint: "Telusuri sisi server", icon: "↻" },
] as const;

type Section = "codes" | "kelompok" | "contoh" | "tindakan";
const SECTIONS: { id: Section; label: string; icon: "search" | "doc" | "next" | "eye" }[] = [
  { id: "codes", label: "Cari kode", icon: "search" },
  { id: "kelompok", label: "Kelompok & yang tertukar", icon: "doc" },
  { id: "contoh", label: "Contoh respons", icon: "eye" },
  { id: "tindakan", label: "Tindakan & QA", icon: "next" },
];

export function ResponsApiPage({ navigate, item }: { navigate: Navigate; item: string | null }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("semua");
  const [selectedId, setSelectedId] = useState(item ?? "http-200");
  const [favs, setFavs] = useState<string[]>(readFavourites);
  const [section, setSection] = useState<Section>("codes");
  const [mobileDetail, setMobileDetail] = useState(Boolean(item));
  // on phones the 35 application codes stay folded until asked for (or searched / filtered)
  const [showInternal, setShowInternal] = useState(Boolean(item?.startsWith("app-")));
  const localItem = useRef(item);
  const detailRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const browserRef = useRef<HTMLDivElement>(null);
  const mobileListScroll = useRef(0);
  useEffect(() => { document.title = "Respons API · Alur"; }, []);
  useEffect(() => {
    if (item === localItem.current) return;
    localItem.current = item;
    if (item && NOTES.some((n) => n.id === item)) {
      setSelectedId(item); setQuery(""); setFilter("semua"); setSection("codes"); setMobileDetail(true);
      if (item.startsWith("app-")) setShowInternal(true);
    } else if (!item) setMobileDetail(false);
  }, [item]);
  // the index and the note fill the rest of the screen, so the page itself does not need to scroll
  useLayoutEffect(() => {
    const el = browserRef.current;
    if (!el || section !== "codes") return;
    const fit = () => el.style.setProperty("--ref-top", `${Math.round(el.getBoundingClientRect().top + window.scrollY)}px`);
    fit();
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit).catch(() => undefined);
    return () => window.removeEventListener("resize", fit);
  }, [section]);
  const list = useMemo(() => {
    const base = filter === "semua" ? NOTES : filter === "favorit" ? NOTES.filter((n) => favs.includes(n.id)) : NOTES.filter((n) => filterOf(n) === filter);
    return findNotes(query, base);
  }, [query, filter, favs]);
  const selected = list.find((n) => n.id === selectedId) ?? list[0];
  const http = list.filter((n) => n.kind === "http");
  const internal = list.filter((n) => n.kind === "internal");
  const folded = !showInternal && filter === "semua" && !query && http.length > 0;
  useEffect(() => { if (listRef.current) listRef.current.scrollTop = 0; }, [filter, query]);
  useEffect(() => { if (detailRef.current) detailRef.current.scrollTop = 0; }, [selected?.id]);
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>('[data-selected="true"]');
    if (!list || !row || window.matchMedia("(max-width: 760px)").matches) return;
    const bounds = list.getBoundingClientRect();
    const target = row.getBoundingClientRect();
    if (target.top < bounds.top || target.bottom > bounds.bottom) list.scrollTop += target.top - bounds.top - 8;
  }, [selected?.id, section]);
  const select = (id: string) => {
    mobileListScroll.current = window.scrollY;
    setSelectedId(id); setMobileDetail(true); localItem.current = id;
    navigate({ page: "lesson", slug: SLUG, step: null, item: id }, { replace: true });
    if (window.matchMedia("(max-width: 760px)").matches) requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true }); window.scrollTo(0, 0);
    });
  };
  const fav = (id: string) => setFavs((old) => {
    const next = old.includes(id) ? old.filter((x) => x !== id) : [...old, id];
    writeFavourites(next); return next;
  });
  const changeFilter = (id: typeof filter) => { setFilter(id); setMobileDetail(false); };
  const rows = (notes: Note[]) => <ul className="ref-list">{notes.map((n) => <NoteRow key={n.id} note={n} selected={selected?.id === n.id} fav={favs.includes(n.id)} onSelect={() => select(n.id)} onFav={() => fav(n.id)} />)}</ul>;
  const goSection = (next: Section) => { setSection(next); window.scrollTo(0, 0); };
  return <div className="ref-layout ref-workspace" data-open-note={section === "codes" && mobileDetail && !!selected || undefined}>
    <aside className="ref-side"><CourseSidebar activeSlug={SLUG} navigate={navigate} /></aside>
    <article className="ref-main" id="materi">
      <header className="ref-head">
        <p className="crumbs">Komunikasi <span aria-hidden="true"> / </span> Catatan referensi</p>
        <div className="ref-heading-line"><h1>Pahami setiap respons API.</h1><span className="ref-count">{HTTP_NOTES.length} status HTTP <span aria-hidden="true">/</span> {INTERNAL_NOTES.length} kode internal</span></div>
        <p className="ref-lead">Temukan arti kodenya, lihat contoh jawaban backend, lalu ketahui apa yang perlu dilakukan.</p>
      </header>
      <div className="ref-overview" aria-label="Ringkasan status HTTP">{OVERVIEW.map((g) => <button key={g.code} type="button" className="ref-overview-item" data-range={g.code[0]} aria-pressed={section === "codes" && filter === g.filter} onClick={() => { setSection("codes"); changeFilter(filter === g.filter ? "semua" : g.filter); }}>
        <span className="ref-overview-code">{g.code}</span><span><strong>{g.label}</strong><small>{g.hint}</small></span><span className="ref-overview-icon" aria-hidden="true">{g.icon}</span>
      </button>)}</div>
      <div className="ref-section-tabs" role="tablist" aria-label="Bagian referensi" onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const i = SECTIONS.findIndex((s) => s.id === section);
        const n = SECTIONS.length;
        const next = SECTIONS[e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" ? 1 : n - 1)) % n].id;
        setSection(next); document.getElementById("ref-tab-" + next)?.focus();
      }}>
        {SECTIONS.map((s) => <button key={s.id} type="button" role="tab" id={"ref-tab-" + s.id} aria-selected={section === s.id} aria-controls={"ref-panel-" + s.id} tabIndex={section === s.id ? 0 : -1} onClick={() => goSection(s.id)}><Icon name={s.icon} /> {s.label}{s.id === "codes" ? <span>{NOTES.length}</span> : null}</button>)}
      </div>
      <section id="ref-panel-codes" role="tabpanel" aria-labelledby="ref-tab-codes" hidden={section !== "codes"}>
        <div className="ref-tools">
          <label className="ref-search"><Icon name="search" /><span className="sr-only">Cari kode, nama, atau masalah</span><input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setMobileDetail(false); }} placeholder="Cari kode, nama, atau masalah…" /></label>
          <div className="ref-filters" role="group" aria-label="Saring kode">{FILTERS.map((f) => <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => changeFilter(f.id)}>{f.label}{f.id === "favorit" ? " (" + favs.length + ")" : ""}</button>)}</div>
        </div>
        <div className="ref-browser" ref={browserRef} data-mobile-detail={mobileDetail && !!selected || undefined}>
          <div className="ref-index">
            <div className="ref-index-head"><h2>Daftar kode</h2><span aria-live="polite" aria-atomic="true">{list.length} catatan</span></div>
            <div className="ref-index-scroll" ref={listRef}>
              {http.length ? <><h3 className="ref-list-title">Status HTTP <span>{http.length}</span></h3>{rows(http)}</> : null}
              {internal.length ? <div className="ref-internal" data-folded={folded || undefined}>
                <h3 className="ref-list-title">Kode internal <span>{internal.length}</span></h3><p className="ref-index-note">Kode aplikasi, bukan status HTTP.</p>
                {folded ? <button type="button" className="button compact ref-unfold" onClick={() => setShowInternal(true)}>Tampilkan {internal.length} kode internal</button> : null}
                {rows(internal)}
              </div> : null}
              {!list.length ? <div className="ref-empty"><Icon name="search" /><strong>{filter === "favorit" ? "Simpan kode yang sering dipakai" : "Kode belum ditemukan"}</strong><p>{filter === "favorit" ? "Tekan bintang di samping kode untuk menyimpannya di browser ini." : "Coba kode 401, nama TokenInvalid, atau kata seperti login dan database."}</p><button type="button" className="button compact" onClick={() => { setQuery(""); changeFilter("semua"); }}>Lihat semua kode</button></div> : null}
            </div>
          </div>
          <section className="ref-note-panel" ref={detailRef} tabIndex={-1} aria-labelledby={selected ? "ref-note-title" : undefined} aria-label={selected ? undefined : "Detail catatan"}>
            {selected ? <>
              <button type="button" className="ref-back" onClick={() => { setMobileDetail(false); requestAnimationFrame(() => { listRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus({ preventScroll: true }); window.scrollTo(0, mobileListScroll.current); }); }}><Icon name="prev" /> Kembali ke daftar kode</button>
              <header className="ref-note-head" data-range={selected.kind === "http" ? rangeOf(selected.code) : "app"}>
                <div className="ref-note-kicker"><span>{selected.kind === "http" ? "Status HTTP" : "Kode internal aplikasi"}</span><button type="button" className="ref-save" aria-pressed={favs.includes(selected.id)} onClick={() => fav(selected.id)}>{favs.includes(selected.id) ? "★ Tersimpan" : "☆ Simpan"}</button></div>
                <div className="ref-note-identity"><span className="ref-note-number">{selected.code}</span><div><h2 id="ref-note-title">{selected.name}</h2><span>{selected.kind === "http" ? FILTERS.find((f) => f.id === selected.filter)?.label : selected.area + " · HTTP " + selected.http}</span></div></div>
                <p className="ref-note-intro">{selected.arti}</p>
              </header>
              <div className="ref-note-content">
                {selected.kind === "http" ? <HttpDetail note={selected} /> : <InternalDetail note={selected} />}
                <div className="ref-detail-footer"><span>Bagikan catatan ini</span><CopyButton text={location.origin + hrefOf({ page: "lesson", slug: SLUG, step: null, item: selected.id })} label="Salin tautan" /></div>
              </div>
            </> : <div className="ref-no-selection"><Icon name="doc" /><h2>Pilih catatan yang ingin dibaca</h2><p>Ubah pencarian atau filter untuk menemukan kode.</p></div>}
          </section>
        </div>
      </section>
      <section id="ref-panel-kelompok" role="tabpanel" aria-labelledby="ref-tab-kelompok" hidden={section !== "kelompok"}><GuideGroups /></section>
      <section id="ref-panel-contoh" role="tabpanel" aria-labelledby="ref-tab-contoh" hidden={section !== "contoh"}><GuideExamples /></section>
      <section id="ref-panel-tindakan" role="tabpanel" aria-labelledby="ref-tab-tindakan" hidden={section !== "tindakan"}><GuideActions /></section>
    </article>
  </div>;
}

function GuideGroups() {
  return <div className="ref-guide">
    <section className="ref-section" aria-labelledby="kelompok">
      <h2 id="kelompok">Kelompok status</h2>
      <ul className="ref-groups">
        {STATUS_GROUPS.map((g) => (
          <li key={g.range} className="ref-group" data-range={g.range[0]} data-extra={g.extra || undefined}>
            <strong className="mono">{g.range}</strong>
            <span>{g.arti}</span>
            <span className="ref-group-hint">{g.pengingat}</span>
            {g.extra ? <span className="muted small">Pengetahuan tambahan</span> : null}
          </li>
        ))}
      </ul>
      <p className="muted small">4xx bukan selalu kesalahan pengguna manusia: penyebabnya bisa kode frontend, kredensial, kontrak integrasi, atau keadaan resource.</p>
    </section>
    <section className="ref-section" aria-labelledby="sering-tertukar">
      <h2 id="sering-tertukar">Kode yang sering tertukar</h2>
      <dl className="ref-pairs ref-pairs-grid">
        {CONFUSED.map((c) => (
          <div key={c.pair}>
            <dt className="mono">{c.pair}</dt>
            <dd>{c.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  </div>;
}

function GuideExamples() {
  return <div className="ref-guide">
    <section className="ref-section ref-split" aria-labelledby="http-vs-internal">
      <div>
        <h2 id="http-vs-internal">Status HTTP dan kode internal</h2>
        <ul className="ref-bullets">
          <li><strong>401</strong> adalah status HTTP, kategori masalahnya.</li>
          <li><strong>2002</strong> adalah kode khusus aplikasi ini untuk membedakan masalah lebih detail.</li>
          <li><strong>TokenInvalid</strong> memperjelas jenis masalahnya.</li>
        </ul>
        <p className="muted small">Kode seperti 1000, 2002, atau 7001 bukan status HTTP. Status pesanan di dalam JSON menjelaskan keadaan transaksi, bukan hasil permintaan.</p>
      </div>
      <ExampleBlock example={INTERNAL_EXAMPLE} />
    </section>
    <section className="ref-section" aria-labelledby="contoh-respons">
      <h2 id="contoh-respons">Contoh respons</h2>
      <p className="muted small">Bentuk JSON di bawah adalah contoh kontrak aplikasi ini, bukan format wajib untuk semua API.</p>
      <div className="ref-examples">
        {[200, 400, 500, 204].map((code) => {
          const n = HTTP_NOTES.find((x) => x.code === code)!;
          return (
            <div key={code}>
              <h3>{code} {n.name}</h3>
              <ExampleBlock example={n.example!} />
            </div>
          );
        })}
      </div>
    </section>
  </div>;
}

function GuideActions() {
  return <div className="ref-guide">
    <section className="ref-section" aria-labelledby="tindakan-frontend">
      <h2 id="tindakan-frontend">Panduan tindakan frontend</h2>
      <dl className="ref-pairs compact ref-pairs-grid">
        {FRONTEND_ACTIONS.map(([k, v]) => (
          <div key={k}>
            <dt className="mono">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="ref-callout">Jangan menerapkan login ulang, logout, atau retry otomatis untuk semua error. Pada pembuatan pesanan dan pembayaran, jangan mencoba ulang tanpa mempertimbangkan idempotensi dan kemungkinan operasi sebelumnya sudah berhasil.</p>
    </section>
    <div className="ref-split">
      <section className="ref-section" aria-labelledby="catatan-qa">
        <h2 id="catatan-qa">Catatan untuk developer dan QA</h2>
        <ul className="ref-bullets">
          {DEV_QA_NOTES.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
      <section className="ref-section" aria-labelledby="kartu-pengingat">
        <h2 id="kartu-pengingat">Kartu pengingat</h2>
        <ul className="ref-reminders">
          {REMINDERS.map(([code, text]) => <li key={code}><strong className="mono">{code}</strong> {text}</li>)}
        </ul>
        <p className="ref-closing">Lalu selalu tanyakan: apakah operasi sempat mengubah data?</p>
        <p className="muted small">Referensi arti status: <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status">MDN — HTTP response status codes</a>. Kode internal mengikuti daftar error aplikasi contoh.</p>
      </section>
    </div>
  </div>;
}
