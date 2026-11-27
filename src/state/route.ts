import { useCallback, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { createElement } from "react";

/**
 * Routes of the static site, kept in the query string so the build works from any folder:
 *   ?                               catalog (Belajar)
 *   ?topik=dns&langkah=root         a lesson step (langkah=ringkasan for the summary)
 *   ?topik=respons-api&kode=http-401  one note inside a reference page
 *   ?halaman=tentang                about
 * Old links (?topik=dns#langkah-tiers, ?lang=…) are read and mapped by the lesson.
 */
export type Route =
  | { page: "catalog" }
  | { page: "about" }
  | { page: "lesson"; slug: string; step: string | null; item?: string | null }
  | { page: "notfound"; what: string };

export function parseRoute(): Route {
  const params = new URLSearchParams(location.search);
  const page = params.get("halaman");
  if (page === "tentang") return { page: "about" };
  if (page) return { page: "notfound", what: page };
  const slug = params.get("topik");
  if (slug) {
    const legacy = location.hash.startsWith("#langkah-") ? decodeURIComponent(location.hash.slice("#langkah-".length)) : null;
    return { page: "lesson", slug, step: params.get("langkah") ?? legacy, item: params.get("kode") };
  }
  return { page: "catalog" };
}

export function hrefOf(route: Route): string {
  const params = new URLSearchParams();
  if (route.page === "about") params.set("halaman", "tentang");
  if (route.page === "lesson") {
    params.set("topik", route.slug);
    if (route.step) params.set("langkah", route.step);
    if (route.item) params.set("kode", route.item);
  }
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}`;
}

export type Navigate = (route: Route, options?: { replace?: boolean }) => void;

/** The current route, kept in sync with the address bar and Back/Forward. */
export function useRoute(): [Route, Navigate] {
  const [route, setRoute] = useState<Route>(parseRoute);
  useEffect(() => {
    const onPop = () => setRoute(parseRoute());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = useCallback<Navigate>((next, { replace = false } = {}) => {
    const href = hrefOf(next);
    if (replace) history.replaceState(null, "", href);
    else if (href !== `${location.pathname}${location.search}` || location.hash) history.pushState(null, "", href);
    setRoute(next);
  }, []);
  return [route, navigate];
}

/** A real link (open in a new tab works) that navigates in place on a plain click. */
export function Link({ to, navigate, onNavigate, ...rest }: { to: Route; navigate: Navigate; onNavigate?: () => void } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return createElement("a", {
    ...rest,
    href: hrefOf(to),
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(to);
      onNavigate?.();
    },
  });
}
