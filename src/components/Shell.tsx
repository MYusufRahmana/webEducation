import { useEffect, useId, useRef, useState } from "react";
import { catalog } from "../topics";
import type { ThemePref } from "../state/prefs";
import { Link, type Navigate, type Route } from "../state/route";
import { search, type SearchEntry } from "../state/search";
import { Icon } from "./Icon";

/* ------------------------------------------------------------------ header */

export function AppHeader({
  route,
  navigate,
  theme,
  onMenu,
  menuOpen,
}: {
  route: Route;
  navigate: Navigate;
  theme: { pref: ThemePref; setPref: (pref: ThemePref) => void };
  onMenu: (() => void) | null;
  menuOpen: boolean;
}) {
  return (
    <header className="app-header">
      <div className="header-inner">
        {onMenu ? (
          <button type="button" className="icon-button menu-button" onClick={onMenu} aria-expanded={menuOpen} aria-controls="daftar-materi" aria-label="Daftar materi">
            <Icon name="menu" />
          </button>
        ) : null}
        <Link to={{ page: "catalog" }} navigate={navigate} className="brand" aria-label="Alur, ke daftar materi">
          <svg className="brand-mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h7a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4h1" fill="none"/>
            <circle cx="4" cy="6" r="3"/><circle cx="20" cy="18" r="3"/>
          </svg>
          <span>Alur</span>
        </Link>
        <nav className="header-nav" aria-label="Utama">
          <Link to={{ page: "catalog" }} navigate={navigate} aria-current={route.page === "catalog" || route.page === "lesson" ? "page" : undefined}>
            Belajar
          </Link>
        </nav>
        <SearchBox navigate={navigate} />
        <label className="theme-select">
          <span className="sr-only">Tema</span>
          <Icon name="sun" />
          <select value={theme.pref} onChange={(event) => theme.setPref(event.target.value as ThemePref)} aria-label="Tema">
            <option value="system">Sistem</option>
            <option value="light">Terang</option>
            <option value="dark">Gelap</option>
          </select>
        </label>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ search */

function SearchBox({ navigate }: { navigate: Navigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const results = query.trim() ? search(query) : [];

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const go = (entry: SearchEntry) => {
    navigate(entry.route);
    setOpen(false);
    setQuery("");
  };
  const clear = () => {
    setQuery("");
    setActive(0);
    input.current?.focus();
  };

  return (
    <div className="search" ref={box}>
      <Icon name="search" />
      <input
        ref={input}
        type="search"
        placeholder="Cari materi atau istilah"
        aria-label="Cari materi"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && Boolean(query.trim())}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && results[active] ? `${id}-${active}` : undefined}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") (setActive((value) => Math.min(results.length - 1, value + 1)), event.preventDefault());
          else if (event.key === "ArrowUp") (setActive((value) => Math.max(0, value - 1)), event.preventDefault());
          else if (event.key === "Enter" && results[active]) (go(results[active]), event.preventDefault());
          else if (event.key === "Escape") query ? clear() : setOpen(false);
        }}
      />
      {open && query.trim() ? (
        <div className="search-panel">
          {results.length ? (
            <ul id={`${id}-list`} role="listbox" aria-label="Hasil pencarian">
              {results.map((entry, index) => (
                <li
                  key={`${entry.kind}-${entry.title}-${entry.context}`}
                  id={`${id}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => go(entry)}
                >
                  <span className="search-kind">{entry.kind}</span>
                  <strong>{entry.title}</strong>
                  <span className="search-context">{entry.context}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div id={`${id}-list`} className="search-empty" role="status">
              <p>
                Tidak ada hasil untuk “<strong>{query}</strong>”.
              </p>
              <button type="button" className="button small-button" onClick={clear}>
                Hapus pencarian
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ course sidebar */

/**
 * One category open at a time. The choice outlives remounts (the sidebar is rendered again on every
 * lesson, and once more inside the mobile drawer), and is tied to the lesson it was made on: moving to a
 * lesson in another category opens that category instead.
 */
let remembered: { slug: string | null; group: string | null } | null = null;

export function CourseSidebar({ activeSlug, navigate, onNavigate, id }: { activeSlug: string | null; navigate: Navigate; onNavigate?: () => void; id?: string }) {
  const groups = catalog();
  const total = groups.reduce((sum, group) => sum + group.lessons.length, 0);
  const activeGroup = groups.find((group) => group.lessons.some((topic) => topic.slug === activeSlug))?.id ?? null;
  const initial = () => (remembered && (remembered.slug === activeSlug || !activeGroup) ? remembered.group : activeGroup);
  const [openGroup, setOpenGroup] = useState<string | null>(initial);
  useEffect(() => {
    setOpenGroup(initial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug]);
  const toggle = (group: string) => {
    const next = openGroup === group ? null : group;
    remembered = { slug: activeSlug, group: next };
    setOpenGroup(next);
  };
  return (
    <nav className="course-nav" aria-label="Daftar materi" id={id}>
      <div className="nav-head">
        <span className="nav-title">Materi</span>
        <span className="nav-total">{total} pelajaran</span>
      </div>
      <ol className="nav-groups">
        {groups.map((group, groupIndex) => {
          const open = openGroup === group.id;
          const active = group.lessons.some((topic) => topic.slug === activeSlug);
          return (
            <li key={group.id} className="nav-group-item" data-cat={group.id}>
              <button type="button" className="nav-group" aria-expanded={open} aria-controls={`kategori-${group.id}`} data-active={active || undefined} onClick={() => toggle(group.id)}>
                <span className="nav-caret" aria-hidden="true">
                  <Icon name="chevron" />
                </span>
                <span className="nav-folder" aria-hidden="true">
                  <Icon name="folder" />
                </span>
                <span className="nav-group-name">
                  <span className="nav-num">{String(groupIndex + 1).padStart(2, "0")}.</span> {group.name}
                </span>
                <span className="nav-count">
                  {group.lessons.length}
                  <span className="sr-only"> pelajaran</span>
                </span>
              </button>
              <ul id={`kategori-${group.id}`} className="nav-lessons" hidden={!open}>
                {group.lessons.map((topic) => (
                  <li key={topic.slug}>
                    <Link to={{ page: "lesson", slug: topic.slug, step: null }} navigate={navigate} onNavigate={onNavigate} aria-current={topic.slug === activeSlug ? "page" : undefined}>
                      <Icon name="doc" />
                      <span className="nav-lesson-name">{topic.shortName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The course list as a drawer for narrower screens: holds focus, closes with Escape. */
export function CourseDrawer({ open, onClose, activeSlug, navigate }: { open: boolean; onClose: () => void; activeSlug: string | null; navigate: Navigate }) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement;
    panel.current?.querySelector<HTMLElement>("button, a")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab" && panel.current) {
        const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>("button, a[href]")).filter((el) => el.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) (last.focus(), event.preventDefault());
        else if (!event.shiftKey && document.activeElement === last) (first.focus(), event.preventDefault());
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener.current?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div ref={panel} className="drawer" role="dialog" aria-modal="true" aria-label="Daftar materi" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <strong>Daftar materi</strong>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Tutup daftar materi">
            <Icon name="close" />
          </button>
        </div>
        <CourseSidebar activeSlug={activeSlug} navigate={navigate} onNavigate={onClose} id="daftar-materi" />
      </div>
    </div>
  );
}
