# PRD WebEdukasi Anatomi
Revisi 2.0 | 18 November 2026
Ruang belajar sistem interaktif berbahasa Indonesia

## 1 Ringkasan dan keputusan produk
WebEdukasi Anatomi membantu pemula memahami sistem komputer melalui figur mesin isometrik yang dijalankan langkah demi langkah. Pelajaran dimulai dari situasi yang dikenali, memperlihatkan masalah, lalu menghubungkan analogi dengan mekanisme teknis sebenarnya.
Pengalaman utama adalah ruang belajar terpadu: navigasi materi di kiri, panggung anatomi dominan di tengah, materi satu langkah di kanan, dan peta langkah di bawah panggung. Materi serta figur langsung terlihat saat pelajaran dibuka.
Versi ini mengganti bacaan panjang dan scrollytelling menjadi navigasi langkah eksplisit. Scroll tidak menentukan langkah atau menjalankan simulasi. Bahasa Indonesia menjadi bahasa wajib; Inggris tidak menjadi syarat rilis.
### Dasar arah desain
Referensi struktur adalah designed-to-scale.vercel.app dan dua screenshot pengguna: How a Request Travels serta Design a Chat System. Layout dan hierarki diadaptasi dengan merek, ilustrasi, dan materi WebEdukasi. Perilaku mobile dan animasi ditetapkan sendiri; bukan klaim hasil audit website referensi.
### Tahapan produk
- Tahap A: prototipe statis React, TypeScript, dan Vite. Data lokal, simulasi browser, tanpa database, backend, login, atau dashboard.
- Tahap B: rilis belajar statis dengan lima topik, pencarian, glosarium, tema, responsivitas, dan aksesibilitas.
- Tahap C: pengelolaan oleh satu admin, Go dan PostgreSQL, upload bundle figur, revisi draft, preview, serta penerbitan tanpa deploy ulang.
- Tahap D: progres lokal, latihan terstruktur, terjemahan opsional, dan ekspor. Poster PDF merupakan pengembangan lanjutan.
### Batas ruang lingkup
Tidak ada akun pengunjung, komentar, multi-admin, editor figur visual, atau kewajiban SEO/SSR pada tahap awal. Menu Latihan, Ruang Desain, dan Ringkasan Konsep tidak ditampilkan sebelum tersedia. Dokumen ini mengubah spesifikasi; tidak menyatakan implementasi sudah selesai.
[[PAGE]]
## 2 Pengguna tujuan dan ukuran keberhasilan
### Pengguna utama
Pelajar, mahasiswa IT, dan developer pemula yang belum dapat membayangkan aliran request atau hubungan antar komponen. Mereka membutuhkan penjelasan singkat, petunjuk pengamatan, kesempatan mengulang, dan istilah yang diperkenalkan bertahap.
Pembaca yang mencari satu konsep membutuhkan pencarian, daftar materi, peta langkah, dan tautan langsung. Pada Tahap C, satu admin membutuhkan pengelolaan cepat serta penerbitan yang aman.
### Tujuan
- Pembaca dapat menjelaskan sebab dan akibat mekanisme utama pelajaran.
- Pembaca mengetahui posisi, tindakan berikutnya, dan cara kembali dari eksplorasi.
- Figur, teks, serta metrik menyampaikan keadaan yang sama.
- Penjelasan tetap dapat dipahami melalui teks ketika animasi tidak digunakan.
- Lima topik awal tersedia dalam Indonesia pada rilis belajar statis.
### Metrik penerimaan
- Uji formatif: sedikitnya 4 dari 5 pemula menjelaskan mekanisme utama menggunakan rubrik yang ditulis sebelum sesi.
- Sedikitnya 4 dari 5 dapat memilih langkah, mengulang, dan kembali dari eksplorasi tanpa arahan.
- Tombol, URL langsung, dan Back/Forward menghasilkan langkah serta state yang sama pada seluruh skenario verifikasi.
- Target LCP < 2,5 detik pada profil 4G yang disepakati. Figur siap < 1,5 detik setelah shell dan konten awal tampil. Catat kedua titik secara terpisah; ukur lima pemuatan dingin pada perangkat serta profil jaringan yang dicatat, laporkan median dan hasil terburuk.
- Bundle aplikasi publik ditargetkan < 200 KB gzip. Aset figur dan font dilaporkan terpisah beserta total beban awal. Semua angka ini target, bukan hasil pengukuran.
- Pada Tahap C, penerbitan satu pelajaran < 30 menit setelah teks dan figur siap. Semua bundle yang diterima harus memenuhi kontrak; bundle tidak valid ditolak dengan alasan.
### Batas penilaian
Membuka langkah atau menyelesaikan animasi tidak membuktikan pemahaman. Progres, jika tersedia nanti, menunjukkan aktivitas dan bukan skor penguasaan.
[[PAGE]]
## 3 Struktur materi dan pendekatan pembelajaran
Struktur adalah Kategori → Pelajaran atau Topik → Langkah. Urutan dikelola editorial. Pengguna boleh melompati langkah; prasyarat menjadi petunjuk, bukan penguncian akses.
### Pola editorial
Situasi sehari-hari → masalah → analogi → hubungan komponen teknis → proses → akibat → gagasan inti. Satu langkah berisi satu kejadian utama. Pengantar panjang tidak boleh menunda figur.
Jenis langkah: Masalah, Analogi, Proses, Percobaan, atau Ringkasan. Sasaran narasi 70–140 kata dalam dua sampai empat paragraf, di luar detail tambahan. Jika terlalu padat, pecah berdasarkan mekanisme.
Setiap langkah wajib memiliki judul pendek peta, judul utama, isi, petunjuk Amati, gagasan inti, dan state figur. Analogi tidak wajib di setiap langkah, tetapi setiap pelajaran dasar memiliki setidaknya satu analogi beserta pemetaan dan batasnya.
### Bahasa
Seluruh pengalaman wajib Indonesia: navigasi, materi, glosarium, label, status, fallback, dan kesalahan. Perkenalkan istilah melalui maknanya, misalnya petugas pencari alamat (resolver). Gunakan kamu secara konsisten. Istilah teknis lazim boleh dipertahankan dengan definisi.
Inggris opsional pada tahap berikutnya. Bahasa belum lengkap tidak ditampilkan sebagai pilihan publik. Struktur data boleh mendukung terjemahan, tetapi kelengkapan Inggris tidak memblokir Indonesia.
### Kurikulum awal
- Load Balancer: pembagian request, round robin, kegagalan server, deteksi, dan pemulihan. Prototipe pertama.
- DNS: pencarian alamat, resolver, rujukan, cache, dan TTL.
- Caching: tanpa cache, miss, hit, perubahan sumber, serta invalidasi atau kedaluwarsa.
- Message Queue: producer, antrean, consumer, penumpukan, acknowledgment, dan retry dengan batas jaminan jelas.
- Session dan Token: pemeriksaan identitas, penyimpanan sesi, dan verifikasi token. Detail final ditinjau sebelum produksi figur.
Kategori hanya dibuat jika memiliki pelajaran, misalnya Jaringan, Data dan Penyimpanan, Komunikasi, serta Keamanan. Jangan menyalin jumlah kategori atau pelajaran referensi yang belum dimiliki.
[[PAGE]]
## 4 Kebutuhan website publik
### Penemuan dan struktur
P-01 Ruang belajar adalah pengalaman utama. Akar website membuka katalog ringkas atau melanjutkan tautan pelajaran eksplisit; tidak ada hero panjang wajib sebelum materi.
P-02 Sidebar menampilkan kategori, pelajaran, serta penanda aktif. Pencarian lokal mencakup judul, ringkasan, langkah, dan glosarium; hasil dapat menuju langkah terkait.
P-03 Header memuat identitas, Belajar, pencarian, dan tema. Hanya aktivitas yang tersedia ditampilkan. Tentang dan halaman tidak ditemukan tetap tersedia.
### Pelajaran dan figur
P-04 Desktop lebar: navigasi kiri, anatomi tengah, materi kanan. Peta di bawah figur; tujuan belajar dapat di bawah panel materi.
P-05 Kembali, Berikutnya dengan nama tujuan, dan peta mengubah satu langkah aktif bersama. Scroll tidak mengubah langkah. Tidak ada auto-next timer.
P-06 Langkah memiliki URL stabil. Refresh dan Back/Forward memulihkan state awal tujuan. Tautan lama dipetakan jika format berubah.
P-07 Figur menyediakan Ulangi langkah, Jeda/Lanjutkan, Layar penuh, pemilihan komponen, dan eksplorasi relevan. Satu instance figur per pelajaran.
P-08 Metrik dan gerak berasal dari model sama. Tampilkan dua sampai empat nilai relevan, dengan label serta satuan. Angka demonstrasi diberi konteks.
P-09 Memilih komponen menampilkan fungsi tanpa mengganti mode. Perubahan parameter masuk Eksplorasi bebas. Kembali ke materi memulihkan langkah; pindah langkah mengakhiri eksplorasi dan menjalankan tujuan.
P-10 Glosarium dibuka lewat tap/keyboard. Tema Sistem/Terang/Gelap berubah tanpa reset. Tidak ada pilihan bahasa kosong pada tahap Indonesia.
P-11 Figur gagal memakai fallback dan teks proses lengkap dengan Coba muat ulang. Jangan menyatakan sinkron sebelum state terkonfirmasi.
P-12 Ringkasan memuat mekanisme, batas analogi, dan materi terkait yang tersedia.
### Pengembangan berikutnya
P-13 Progres lokal dan Tandai selesai berada di Tahap D, tanpa akun. P-14 Latihan/kuis terstruktur bukan syarat Tahap A/B. P-15 Poster PDF dihasilkan dari figur yang selesai pada tahap lanjutan.
[[PAGE]]
## 5 Konten keadaan dan aturan interaksi
### Model konten
Kategori: id, slug, nama, deskripsi, ikon, urutan. Pelajaran: id, slug, kategori, judul, ringkasan, level, estimasi menit, tujuan, prasyarat, relasi, istilah, urutan, versi konten, dan figur.
Langkah: id dan key stabil, urutan, judul pendek, judul utama, jenis, isi Markdown, analogi opsional, pemetaan, batas analogi, petunjuk pengamatan, gagasan inti, figure_step, metrik relevan, serta keadaan akhir demonstrasi.
Glosarium: key, istilah, definisi sederhana, contoh, relasi. Figur: id, versi, aspek, daftar state, label, kemampuan, fallback, metrik. Tahap awal menggunakan modul lokal bertipe tanpa database.
### Keadaan belajar
- activeStepKey menjadi acuan panel, peta, URL, dan perintah figur.
- mode adalah Ikuti materi atau Eksplorasi bebas. paused dan pemuatan dikelola terpisah.
- Membuka langkah membangun state deterministik lalu menjalankan demonstrasi sekali. Akhirnya tahan state dan tampilkan Demonstrasi selesai.
- Jeda membekukan waktu, termasuk pemeriksaan, request, dan penghitung. Lanjutkan meneruskan dari state tersebut.
- Replay membangun ulang state awal. Tema, viewport, dan drawer tidak mereset model.
- Eksplorasi tidak mengganti langkah bacaan. Memilih langkah berarti meninggalkan eksplorasi dan memulai tujuan.
### Pemuatan dan navigasi cepat
Status figur: memuat, siap, menerapkan langkah, selesai, atau gagal. Respons terlambat dari langkah lama diabaikan. Panel dan kontrol konsisten ketika langkah dipilih berulang dengan cepat. Shortcut tidak aktif dalam input atau kontrol lain yang memakai tombol sama.
### Publikasi dan progres masa depan
Tahap C menambah draft/published, revisi kerja, snapshot publik, figur aktif, media, waktu terbit, dan terjemahan opsional. Simpan revisi tidak mengubah publik; publish memvalidasi dan mengganti snapshot secara atomik.
Tahap D menyimpan versi konten, pelajaran terakhir, langkah terakhir, dan tanda selesai eksplisit. localStorage rusak/tidak tersedia tidak menghalangi belajar. Pernah dikunjungi tidak diberi label sudah dipahami.
[[PAGE]]
## 6 Contoh isi dan kebenaran simulasi
### DNS
Pembuka: tahu nama toko, belum tahu alamatnya. Domain = nama toko; IP = alamat tujuan; resolver = petugas pencari alamat. Root dan TLD memberi rujukan kepada resolver; authoritative memberi catatan resmi.
Urutan: butuh alamat → catatan perangkat → resolver → root → TLD → authoritative → simpan jawaban → alamat berubah dan TTL → ringkasan. Jumlah langkah dapat disesuaikan setelah uji.
Amati: pesan kembali ke resolver setelah setiap meja; root/TLD memberi petunjuk, bukan IP akhir. Browser menghubungi server setelah DNS selesai; DNS tidak mengirim isi halaman. TTL membatasi penggunaan ulang, bukan waktu tunggu membuka website. Cache yang belum kedaluwarsa bisa masih memuat alamat lama setelah catatan resmi berubah.
### Caching
Salinan katalog di meja layanan mengurangi perjalanan ke gudang. Meja = cache, gudang = sumber data. Miss mengambil lalu menyimpan data; hit memakai salinan. Perubahan sumber tidak otomatis mengganti semua cache.
Amati: permintaan berikutnya berhenti di cache dan penghitung akses sumber tidak bertambah. Batas analogi: membaca tidak menghabiskan salinan. Kecepatan dan TTL animasi merupakan parameter demonstrasi.
### Load Balancer
Distributor membagi request ke A, B, C. Round robin memilih backend yang dianggap eligible. Kondisi server dan pengetahuan health check dipisahkan: sebelum deteksi, request ke server mati dapat gagal; sesudah deteksi, request baru melewatinya.
Pemulihan mengembalikan server setelah pemeriksaan berhasil. Request gagal tidak otomatis dipindahkan atau diulang jika retry tidak disimulasikan. Jumlah request merata tidak menjamin CPU atau waktu proses merata.
### Message Queue
Konveyor memisahkan penerimaan dari pemrosesan. Consumer mengakui pekerjaan sesuai aturan berhasil yang ditetapkan. Retry dapat menimbulkan duplikasi; jangan menjanjikan exactly-once hanya karena ada antrean. Laju masuk dan proses berasal dari model sama.
### Aturan figur
Gunakan skill anatomy dan periksa volume, painter order, sambungan, serta jalur. Bagian fisik harus menjelaskan fungsi. Semua angka dapat ditelusuri ke model; jangan memakai readout acak yang tidak sesuai animasi.
[[PAGE]]
## 7 Arsitektur bertahap dan kontrak figur
### Tahap statis
React, TypeScript, Vite; konten lokal dan simulasi browser deterministik. Geometri, konten, model, dan tampilan dipisah. Satu adapter menyatukan kendali. Tidak wajib memasang backend atau pustaka kompleks hanya untuk prototipe.
Kemampuan adapter: init, setStep, replay, pause, resume, setTheme, selectPart, explore, resetToStep, readout, stateApplied, error. reducedMotion dan visibilitas diteruskan. Kemampuan yang tidak didukung tidak ditampilkan sebagai tombol aktif.
### Tahap pengelolaan
Go, PostgreSQL, penyimpanan file, dan React menjadi rencana Tahap C. Go melayani API dan aplikasi; figur konten dari origin terpisah. Versi pustaka dipilih kompatibel saat implementasi, bukan dianggap terpasang karena ditulis.
API publik: kategori, pelajaran, langkah, pencarian, glosarium. API admin: login, CRUD, revisi, upload, aktivasi versi, preview, publish/unpublish. Detail route ditetapkan dalam spesifikasi Tahap C.
### Kontrak bundle
Bundle berisi manifest.json, index.html, i18n/id.json, thumbnail.webp 1200 × 630, aset lokal; en.json opsional. Manifest memuat versi kontrak, id, versi figur, entry, aspek, state unik, label Indonesia, tema, readout, capabilities.
Bridge memetakan adapter ke postMessage. Perintah state mempunyai requestId; stateApplied mengembalikan id dan key sama. Replay/jeda didefinisikan eksplisit, bukan mengandalkan setStep identik. Schema dan handshake harus dibuktikan pada figur nyata sebelum dashboard dibangun. Kontrak baru versioned; dukungan kontrak lama diperiksa dengan fixture.
### Isolasi pesan
Rancangan lama perlu dikoreksi: sandbox tanpa allow-same-origin menghasilkan origin opak, sehingga tidak cukup membandingkan event.origin dengan host figur. Validasi event.source terhadap iframe terdaftar, schema, sesi/nonce, dan handshake; jangan percaya semua pesan ber-origin null. Penanganan targetOrigin pada konteks opak wajib diuji. Rancangan isolasi final adalah gerbang keamanan Tahap C, bukan asumsi selesai.
[[PAGE]]
## 8 Pengelolaan konten dan keamanan
### Dashboard satu admin pada Tahap C
A-01 Login email/password, hash argon2id, cookie HttpOnly/Secure/SameSite=Strict, batas lima percobaan per 15 menit, CSRF mutasi, dan sesi tujuh hari.
A-02 Ringkasan draft, materi belum lengkap, mapping bermasalah, dan upload terakhir. A-03 CRUD kategori dengan urutan dan pemeriksaan relasi.
A-04 Editor memakai field pedagogi terstruktur serta status Menyimpan/Tersimpan/Gagal menyimpan. Revisi terbit tidak mengubah publik sebelum Terbitkan perubahan.
A-05 Tambah/hapus/urutkan langkah lewat drag dan tombol. figure_step dari manifest; validasi menautkan langkah bermasalah.
A-06 Upload menambah versi tanpa otomatis aktif. A-07 Aktivasi/rollback memeriksa mapping; versi aktif tidak dapat dihapus. A-08 Preview memakai ruang belajar sama, tema, ukuran layar, dan akses draft yang dilindungi.
A-09 Terbit mensyaratkan field Indonesia lengkap, figur valid, mapping, dan kemampuan sesuai kontrol. Inggris tidak memblokir Indonesia. A-10 Glosarium mendukung definisi, contoh, relasi. A-11 Media memakai format didukung dan teks alternatif.
Ekspor beserta bundle dan statistik merupakan pengembangan berikutnya. Ekspor tidak menggantikan backup operasional.
### Upload dan isolasi
ZIP maksimal 10 MB, hasil ekstraksi 30 MB, 200 file. Tolak traversal, symlink, duplikasi path, ekstensi di luar allowlist, serta ekstraksi keluar tujuan. Allowlist: html, js, css, json, svg, webp, png, woff2. Gunakan direktori sementara dan pemindahan atomik.
Manifest wajib lolos schema. Scan URL statis bukan satu-satunya perlindungan; larangan jaringan ditegakkan dengan CSP serta isolasi. Akses aset dalam sandbox opak diuji di browser. Frame hanya boleh ditanam oleh origin aplikasi yang diizinkan.
### Operasional
Markdown tanpa HTML mentah yang tidak disanitasi. API publik memakai ETag/cache pendek; aset figur ber-versi immutable. Backup database harian dan storage ke lokasi kedua, retensi 14 hari, disertai uji pemulihan. Log terstruktur dan health endpoint tersedia ketika backend dibangun.
[[PAGE]]
## 9 Kualitas roadmap dan penerimaan rilis
### Responsivitas dan aksesibilitas
Desktop lebar menggunakan tiga kolom jika tetap terbaca. Tablet memindah sidebar ke drawer; ponsel memakai figur lalu materi satu kolom. Tidak ada scroll horizontal halaman pada 360 px. Uji juga 390, 768, 1024, 1280, 1440 px dan viewport pendek.
Target WCAG 2.1 AA: keyboard, fokus, heading, kontras, reflow 320 CSS px, zoom 200%, dan alternatif proses tekstual. Target utama 44 × 44 px adalah standar desain produk. Reduced motion tetap menjelaskan hasil; readout tidak diumumkan tiap frame.
### Gerbang pelaksanaan
- A: satu Load Balancer tanpa backend, shell ruang belajar, Indonesia, langkah eksplisit, replay, jeda, eksplorasi, URL langsung, dan fallback.
- B: lima topik Indonesia, pencarian, glosarium, tema, responsivitas, dan kinerja diuji. Temuan kritis uji pemahaman diselesaikan sebelum rilis.
- C: kontrak bundle dan isolasi terbukti, lalu CMS dibangun. Admin preview/publish tanpa deploy ulang; backup/pemulihan diuji.
- D: progres lokal, latihan, dan terjemahan diprioritaskan sesuai kebutuhan. Tanggal tidak dijanjikan sebelum estimasi implementasi.
### Kriteria selesai
PRD dan Design.md harus konsisten dalam bahasa, layout, navigasi, state, serta tahapan. Implementasi diterima melalui build, uji model relevan, keyboard, screenshot desktop/ponsel, fallback, serta review materi. Dokumen ini bukan bukti pemeriksaan tersebut telah lulus.
### Risiko dan mitigasi
Analogi menyesatkan: tulis pemetaan dan batasnya. Panggung padat: tampilkan komponen sesuai langkah dan batasi metrik. Narasi panjang: pecah per kejadian. Figur berat: prahitung geometri, hindari render seluruh React tiap frame, hentikan kerja saat tab tersembunyi.
Progres disangka penguasaan: gunakan tanda selesai eksplisit dan evaluasi terpisah. Bundle berbahaya: schema, validasi pesan, isolasi, serta uji keamanan sebelum CMS. Scope meniru seluruh menu referensi: hanya tampilkan fitur yang dibangun.
### Keputusan berikutnya
Domain/hosting, lisensi dan hak unduh, detail pelajaran kelima, profil perangkat pengukuran, serta rancangan isolasi iframe ditetapkan pada fase terkait. Ini tidak menghalangi prototipe frontend.
