import { useEffect } from "react";
import { catalog } from "../topics";
import { Link, type Navigate } from "../state/route";
import { Icon } from "./Icon";

/** The root: a short catalogue, no long hero before the lessons (PRD P-01). */
export function CatalogPage({ navigate, theme }: { navigate: Navigate; theme: "light" | "dark" }) {
  useEffect(() => {
    document.title = "Belajar · Alur";
  }, []);
  return (
    <main className="page" id="isi">
      <header className="page-head">
        <h1>Lihat alurnya. Pahami sistemnya.</h1>
        <p className="lesson-summary">Pelajari cara kerja sistem melalui diagram bergerak dan contoh sehari-hari. Pilih satu materi untuk mulai.</p>
      </header>
      {catalog().map((group, groupIndex) => (
        <section key={group.id} className="catalog-group" aria-labelledby={`cat-${group.id}`}>
          <h2 id={`cat-${group.id}`}>
            <span className="mono">{String(groupIndex + 1).padStart(2, "0")}</span> {group.name}
          </h2>
          <p className="muted">{group.description}</p>
          <ul className="lesson-cards">
            {group.lessons.map((topic) => (
              <li key={topic.slug}>
                <Link to={{ page: "lesson", slug: topic.slug, step: null }} navigate={navigate} className="lesson-card" data-kind={topic.kind}>
                  <img src={topic.image(theme)} alt="" loading="lazy" />
                  <span className="lesson-card-text">
                    <strong>{topic.title}</strong>
                    <span>{topic.summary}</span>
                    <span className="lesson-meta">
                      <span className="badge">{topic.kind === "reference" ? "Catatan referensi" : `Level: ${topic.level}`}</span>
                      <span>{topic.minutes} menit</span>
                      <span>{topic.countLabel}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

export function AboutPage({ navigate }: { navigate: Navigate }) {
  useEffect(() => {
    document.title = "Tentang · Alur";
  }, []);
  return (
    <main className="page prose" id="isi">
      <h1>Tentang Alur</h1>
      <p>Alur membantu pemula memahami sistem komputer lewat diagram interaktif yang berkembang langkah demi langkah. Setiap pelajaran dimulai dari situasi yang dikenali, memperlihatkan masalahnya, lalu menghubungkan analogi dengan mekanisme teknis sebenarnya.</p>
      <p>Ini prototipe statis: materi dan simulasi berjalan di browser, tanpa akun atau penyimpanan di server. Angka waktu dalam simulasi sengaja diperlambat agar mudah diamati dan bukan ukuran kinerja sistem nyata.</p>
      <p>Diagram, gerakan pesan, dan angka berasal dari model yang sama. Animasi berulang pada langkah aktif; kamu bebas menjeda atau pindah langkah.</p>
      <p>
        <Link to={{ page: "catalog" }} navigate={navigate} className="button primary">
          Lihat daftar materi
        </Link>
      </p>
    </main>
  );
}

export function NotFoundPage({ navigate, what }: { navigate: Navigate; what: string }) {
  useEffect(() => {
    document.title = "Halaman tidak ditemukan · Alur";
  }, []);
  return (
    <main className="page prose" id="isi">
      <h1>Halaman tidak ditemukan</h1>
      <p>
        Kami tidak menemukan “{what}”. Mungkin tautannya sudah berubah atau materinya belum tersedia.
      </p>
      <p>
        <Link to={{ page: "catalog" }} navigate={navigate} className="button primary">
          <Icon name="prev" />
          Kembali ke daftar materi
        </Link>
      </p>
    </main>
  );
}
