import { useCallback, useEffect, useState } from "react";
import { topicBySlug } from "./topics";
import { referenceBySlug } from "./references";
import { useTheme } from "./state/prefs";
import { Link, useRoute } from "./state/route";
import { AppHeader, CourseDrawer } from "./components/Shell";
import { LessonView } from "./components/Lesson";
import { AboutPage, CatalogPage, NotFoundPage } from "./components/Pages";

/**
 * Alur: one learning room per lesson (course list, anatomy stage, one-step material
 * panel and a step map), plus a short catalogue, an about page and a not-found page. Indonesian only.
 */
export default function App() {
  const theme = useTheme();
  const [route, navigate] = useRoute();
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const topic = route.page === "lesson" ? topicBySlug(route.slug) : null;
  const reference = route.page === "lesson" && !topic ? referenceBySlug(route.slug) : null;

  useEffect(() => {
    document.documentElement.lang = "id";
    // the language switch is gone until a second language is complete: drop ?lang= from old links
    const url = new URL(location.href);
    if (url.searchParams.has("lang")) {
      url.searchParams.delete("lang");
      history.replaceState(history.state, "", url);
    }
  }, []);

  // the learning room fills one screen on desktop (see .is-lesson in app.css); other pages scroll
  useEffect(() => {
    document.body.classList.toggle("is-lesson", Boolean(topic));
  }, [topic]);

  // a new page starts at the top; changing steps inside a lesson does not scroll
  const pageKey = route.page === "lesson" ? `lesson:${route.slug}` : route.page;
  useEffect(() => {
    window.scrollTo(0, 0);
    setDrawer(false);
  }, [pageKey]);

  return (
    <>
      <a className="skip-link" href={topic ? "#materi" : "#isi"}>
        Lewati ke materi
      </a>
      {topic ? (
        <a className="skip-link" href="#kontrol-langkah">
          Lewati ke kontrol langkah
        </a>
      ) : null}
      <AppHeader route={route} navigate={navigate} theme={theme} onMenu={topic || reference ? () => setDrawer(true) : null} menuOpen={drawer} />
      {reference ? (
        <>
          <CourseDrawer open={drawer} onClose={closeDrawer} activeSlug={reference.slug} navigate={navigate} />
          <main id="isi">
            <reference.Page navigate={navigate} item={route.page === "lesson" ? (route.item ?? null) : null} />
          </main>
        </>
      ) : topic ? (
        <>
          <CourseDrawer open={drawer} onClose={closeDrawer} activeSlug={topic.slug} navigate={navigate} />
          <main id="isi">
            <LessonView key={topic.slug} topic={topic} stepKey={route.page === "lesson" ? route.step : null} navigate={navigate} theme={theme.resolved} />
          </main>
        </>
      ) : route.page === "lesson" ? (
        <NotFoundPage navigate={navigate} what={route.slug} />
      ) : route.page === "about" ? (
        <AboutPage navigate={navigate} />
      ) : route.page === "notfound" ? (
        <NotFoundPage navigate={navigate} what={route.what} />
      ) : (
        <CatalogPage navigate={navigate} theme={theme.resolved} />
      )}
      {topic || reference ? null : (
      <footer className="site-footer">
        <p>Prototipe Alur. Simulasi berjalan di browser; angka waktu sengaja diperlambat.</p>
        <Link to={{ page: "about" }} navigate={navigate}>
          Tentang
        </Link>
      </footer>
      )}
    </>
  );
}
