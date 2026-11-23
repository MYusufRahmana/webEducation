# Design Alur

Panduan UI dan UX ruang belajar sistem interaktif berbahasa Indonesia.

Tanggal revisi: 18 November 2026  
Versi: 2.0  
Dokumen pasangan: `Claude outputs/PRD-WebEdukasi-Anatomi.md`

## 1. Keputusan desain utama

Alur menggunakan ruang belajar terpadu: daftar pelajaran di kiri, panggung anatomi di tengah, panel materi satu langkah di kanan, dan peta langkah di bawah panggung. Figur dan penjelasan langsung terlihat saat pelajaran dibuka. Pembaca mengendalikan perpindahan melalui tombol atau peta langkah.

Rancangan ini menggantikan layout bacaan kiri dan figur kanan, hero panjang sebelum materi, serta perpindahan langkah berdasarkan scroll. Scroll hanya untuk mengakses konten; scroll tidak mengubah langkah atau menjalankan kejadian simulasi.

Bahasa Indonesia menjadi bahasa wajib untuk antarmuka, materi, label figur, glosarium, dan pesan kesalahan. Bahasa Inggris adalah pengembangan opsional berikutnya; publikasi materi Indonesia tidak menunggu terjemahan.

Tahap aktif adalah prototipe frontend statis tanpa backend, database, login, atau dashboard admin. Dashboard dan integrasi bundle tetap menjadi rencana tahap berikutnya di PRD.

## 2. Dasar referensi dan batas adaptasi

Referensi: https://designed-to-scale.vercel.app/ dan dua screenshot yang diberikan pengguna pada 18 November 2026: How a Request Travels dan Design a Chat System. Pengamatan visual yang digunakan adalah header lintas aktivitas, sidebar kategori, panggung diagram dominan, panel materi kanan, metrik, legenda, gagasan inti, serta peta langkah.

Screenshot tidak membuktikan perilaku animasi, penyimpanan progres, atau layout mobile referensi. Aturan interaksi dan responsivitas dalam dokumen ini merupakan keputusan desain Alur. Video yang disertakan belum menjadi dasar klaim perilaku terverifikasi.

Adaptasi mengikuti struktur belajar dan hierarki informasi. Gunakan identitas, ilustrasi, teks Indonesia, dan komponen milik Alur; tidak menyalin merek, materi, atau aset referensi.

## 3. Prinsip pengalaman

1. Satu langkah menjelaskan satu gagasan atau satu kejadian utama.
2. Masalah sehari-hari mendahului istilah teknis baru.
3. Anatomi memperlihatkan mekanisme, bukan sekadar dekorasi.
4. Materi menyebut bagian yang harus diamati dan akibatnya.
5. Pembaca dapat menjeda, mengulang, melompati, dan kembali ke langkah.
6. Keadaan figur, angka, dan narasi berasal dari model yang sama.
7. Eksplorasi bebas mempunyai jalan kembali yang jelas.
8. Penjelasan tetap lengkap tanpa animasi atau figur interaktif.

## 4. Arsitektur informasi

```text
Belajar
├── Daftar kategori dan pelajaran
├── Ruang belajar per pelajaran
│   ├── Judul, ringkasan, level, durasi
│   ├── Anatomi, metrik, legenda, kontrol
│   ├── Materi langkah aktif dan gagasan inti
│   ├── Peta langkah
│   └── Tujuan belajar dan ringkasan
└── Tentang dan halaman tidak ditemukan

Pengembangan berikutnya
├── Progres lokal
├── Latihan terstruktur
├── Ruang desain
├── Ringkasan konsep
└── Dashboard pengelolaan
```

Pada prototipe, navigasi hanya menampilkan aktivitas yang benar-benar tersedia. Jangan membuat tab Latihan, Ruang Desain, atau Ringkasan Konsep yang tidak memiliki halaman. Eksplorasi figur tetap tersedia dalam pelajaran, terpisah dari produk Latihan di masa depan.

## 5. Layout desktop

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ Alur   Belajar                 Cari materi             Tema       │
├───────────────┬──────────────────────────────────────┬──────────────────┤
│ Materi        │ Kategori / Pelajaran                 │ Langkah 2 dari 8 │
│               │ Judul pelajaran                      │ Proses           │
│ Kategori      │ Ringkasan pendek    level · durasi   │                  │
│  Pelajaran    ├──────────────────────────────────────┤ Judul kejadian   │
│  Aktif        │ Metrik relevan       Ulangi · Jeda   │ Penjelasan       │
│               │                                      │ Analogi singkat  │
│ Kategori lain │        ANATOMI INTERAKTIF             │ Amati ini        │
│               │                                      │ Gagasan inti     │
│               │                                      │                  │
│               │ Legenda                              │ Kembali  Lanjut  │
│               ├──────────────────────────────────────┤                  │
│               │ Peta langkah                         ├──────────────────┤
│               │ 1 — 2 — 3 — 4 — 5 — Ringkasan       │ Tujuan belajar   │
└───────────────┴──────────────────────────────────────┴──────────────────┘
```

### Ukuran dan perilaku

- Header sekitar 64 px; gap antarkolom 16 px, padding halaman 16–24 px.
- Mulai 1280 px, gunakan sidebar 224–256 px, kolom tengah fleksibel minimal sekitar 560 px, dan materi 320–380 px. Pada 1440 px dengan padding 16 px dan dua gap 16 px, contoh pembagian adalah 224 / 800 / 352 px.
- CSS grid menggunakan `minmax(0, 1fr)` pada kolom tengah; jangan memaksakan tiga kolom jika ruang tidak cukup.
- Panel kanan cukup lebar untuk teks Indonesia 16–18 px; panjang baris sekitar 35–50 karakter.
- Sidebar dan panel materi boleh sticky pada desktop tinggi. Halaman tetap dapat scroll dan semua kontrol terjangkau tanpa scroll bersarang yang wajib.
- Jangan mengunci halaman dengan `overflow: hidden`. Pada viewport pendek, zoom tinggi, atau konten panjang, gunakan alur dokumen normal.
- Navigasi panel materi berada setelah isi dan dapat didorong ke bawah dengan flex layout, tanpa posisi absolut yang menutup teks.
- Judul dan mesin terlihat pada area awal. Tidak ada gerakan hero mengecil atau perpindahan figur antar kolom.

### Urutan baca dan fokus

Urutan dokumen: header, navigasi materi, judul pelajaran, ringkasan keadaan figur, materi aktif, navigasi langkah, dan informasi tambahan. Urutan fokus harus tetap masuk akal walaupun peta langkah secara visual berada di bawah panggung. Sediakan Lewati ke materi dan Lewati ke kontrol langkah.

## 6. Header dan sidebar

Header menampilkan logo Alur, Belajar, pencarian, dan tema Sistem/Terang/Gelap. Bahasa Indonesia tidak membutuhkan tombol ID/EN yang belum berfungsi. Saat bahasa lain tersedia, barulah tampilkan pilihan bahasa.

Sidebar mengelompokkan pelajaran berdasarkan kategori yang memiliki konten. Kategori dapat dibuka atau ditutup; label menyebut nama dan jumlah pelajaran. Pelajaran aktif diberi latar hijau lembut, garis batas, serta `aria-current="page"`.

Gunakan folder dan ikon dokumen secara konsisten. Nomor kategori menunjukkan urutan kurikulum. Topik yang belum dibuat tidak ditampilkan sebagai tautan aktif.

Status sedang dibaca tidak sama dengan selesai. Tahap awal tidak menampilkan persentase progres yang dibuat-buat. Penyimpanan progres lokal dan tombol Tandai selesai berada di tahap berikutnya.

## 7. Panggung anatomi

Panggung memuat satu instance figur per pelajaran. Saat langkah berubah, mesin memakai keadaan awal deterministik yang telah ditetapkan; jangan memasang ulang komponen tanpa kebutuhan.

Elemen panggung:

- Dua sampai empat metrik yang berhubungan dengan langkah aktif.
- Ulangi langkah dan Jeda/Lanjutkan dengan status jelas.
- Figur isometrik dengan ruang untuk komponen bergerak.
- Legenda singkat dan tombol Layar penuh.
- Status mode Ikuti materi atau Eksplorasi bebas.

Grid isometrik sangat tipis dan boleh hilang pada ponsel. Label penting boleh menjadi penanda HTML di dekat objek; paragraf tetap di panel materi. Geometri menggunakan skill anatomy: volume, shading, sambungan, urutan kedalaman, dan bagian fisik yang berfungsi.

Metrik memiliki label dan satuan. Jika model belum memberi nilai, tampilkan Belum tersedia, bukan nol. Kecepatan animasi demonstrasi tidak boleh diklaim sebagai kinerja produksi.

## 8. Panel materi satu langkah

Urutan isi tetap:

1. Langkah N dari M.
2. Jenis tahap: Masalah, Analogi, Proses, Percobaan, atau Ringkasan.
3. Judul kejadian konkret sekitar 4–9 kata.
4. Dua sampai empat paragraf pendek; sasaran 70–140 kata di luar detail opsional.
5. Amati: satu instruksi menunjuk perubahan visual.
6. Gagasan inti: satu kalimat yang bisa diingat.
7. Kembali dan Berikutnya: [judul pendek tujuan].

Analogi boleh menjadi tahap tersendiri atau masuk dalam narasi. Jangan memaksakannya di setiap paragraf bila objek teknis sudah cukup konkret. Detail tambahan dapat dibuka lewat Pelajari lebih lanjut.

Gagasan inti memakai bidang ungu pucat, judul jelas, dan ikon sederhana. Bidang ini merupakan komponen materi yang konsisten, bukan dekorasi setiap paragraf.

## 9. Pola analogi dan bahasa Indonesia

Pola editorial: situasi yang dikenali → masalah → analogi → hubungan komponen → proses nyata → akibat → batas analogi.

### Contoh caching

- Situasi: petugas mengambil katalog dari gudang untuk setiap pelanggan.
- Masalah: perjalanan yang sama dilakukan berulang kali.
- Analogi: simpan salinan katalog di meja layanan.
- Hubungan: meja = cache; gudang = sumber data; permintaan pelanggan = request.
- Mekanisme: permintaan pertama mengambil data; berikutnya dapat memakai salinan.
- Batas: membaca cache tidak menghabiskan salinannya seperti mengambil barang fisik.

### Contoh DNS

- Domain = nama toko; IP = alamat tujuan; resolver = petugas pencari alamat.
- Root dan TLD memberi petunjuk kepada resolver; authoritative memegang catatan resmi.
- Cache adalah catatan sementara; TTL adalah batas penggunaan ulangnya.
- Setelah IP ditemukan, browser memulai koneksi; DNS tidak mengirim isi halaman.
- Jangan menyiratkan root meneruskan pertanyaan ke TLD secara otomatis. Pesan tanya dan jawab kembali ke resolver.

Istilah baru diperkenalkan setelah maknanya: petugas pencari alamat (resolver), lalu resolver pada kemunculan berikutnya. Gunakan kamu secara konsisten. Pertahankan istilah teknis yang lazim dengan definisi atau glosarium.

## 10. Peta langkah dan navigasi

Peta di bawah panggung menampilkan nomor dan judul pendek. Langkah aktif memakai aksen serta `aria-current="step"`. Langkah yang dilewati memakai penanda berbeda tanpa otomatis dianggap dipahami.

Semua langkah dapat dipilih tanpa menunggu animasi selesai. Satu fungsi navigasi mengendalikan panel materi, figur, metrik, peta, URL, dan fokus. Back/Forward browser mengembalikan langkah yang benar. Gunakan key langkah stabil dalam URL; dukung tautan lama lewat pemetaan eksplisit.

Saat pengguna memilih langkah, fokus menuju judul materi aktif; jangan pindahkan fokus akibat timer atau angka. Ulangi hanya mereset demonstrasi aktif. Pada langkah pertama, Kembali nonaktif. Pada ringkasan akhir, tampilkan Pilih materi lain atau Ulangi pelajaran.

Shortcut opsional: panah kiri/kanan untuk langkah, R untuk ulangi, Spasi untuk jeda. Hanya aktif saat fokus dalam ruang belajar dan bukan input, popover, atau kontrol yang memakai tombol itu. Jangan mengambil alih perilaku bawaan tombol atau scroll.

## 11. Simulasi dan eksplorasi

| Tindakan | Perilaku |
| --- | --- |
| Buka langkah | Bangun keadaan awal deterministik, jalankan demonstrasi berulang dalam batas kejadian langkah aktif |
| Jeda | Bekukan waktu simulasi, termasuk request, pemeriksaan, dan penghitung |
| Lanjutkan | Teruskan dari keadaan yang dijeda |
| Ulangi langkah | Kembali ke keadaan awal dan jalankan demonstrasi lagi |
| Pilih komponen | Sorot dan tampilkan fungsi; mode tetap |
| Ubah parameter | Masuk Eksplorasi bebas; materi aktif tetap |
| Kembali ke materi | Pulihkan keadaan awal langkah aktif dan ulangi demonstrasi |
| Pindah langkah saat eksplorasi | Akhiri eksplorasi dan jalankan tujuan; jelaskan aturan ini dekat kontrol |
| Scroll | Tidak mengubah langkah atau simulasi |

Di akhir siklus, ulangi jendela kejadian langkah aktif tanpa membekukan tampilan atau berpindah langkah otomatis. Tidak ada auto-next. Animasi langkah aktif berulang; jeda hanya atas pilihan pengguna. Tema, ukuran layar, dan pembukaan drawer tidak mereset mesin.

## 12. Tablet dan ponsel

| Lebar awal | Layout |
| --- | --- |
| Mulai 1280 px | Tiga kolom jika ruang mencukupi |
| 900–1279 px | Sidebar menjadi drawer; panggung dan materi dua kolom bila terbaca |
| Di bawah 900 px | Satu kolom: judul, figur, materi, navigasi, peta langkah |

Ponsel memakai drawer Daftar materi. Peta ditampilkan sebagai Langkah N dari M dan Lihat semua langkah yang membuka daftar vertikal. Jangan mengecilkan sepuluh label hingga tidak terbaca.

Figur ringkas maksimal sekitar 30–35% viewport boleh digunakan bila komponen penting jelas. Pengguna dapat menyembunyikan figur atau membukanya penuh. Pada layar pendek atau zoom tinggi, gunakan alur normal tanpa sticky.

Navigasi bawah boleh sticky hanya jika tidak menutupi materi, safe area, atau fokus; cadangkan ruang sesuai tinggi kontrol. Jika ruang tidak cukup, gunakan navigasi dalam alur dokumen.

## 13. Sistem visual

Karakter: buku kerja teknis interaktif dengan bidang hangat, garis tegas terukur, mesin isometrik, dan warna lembut. Kekhasan figur menjadi pusat identitas.

| Token | Terang | Gelap | Peran |
| --- | --- | --- | --- |
| background | #F5F0E7 | #171A19 | Latar aplikasi |
| surface | #FFFCF6 | #222724 | Panel dan panggung |
| text | #242820 | #F2F3EB | Teks utama |
| text-muted | #62675C | #BDC5B7 | Teks pendukung |
| border | #C9C0B1 | #536050 | Batas panel |
| action | #D3E5B1 | #AECF85 | Pilihan aktif dan tindakan utama |
| idea | #EAE2F3 | #393046 | Gagasan inti |

Teks tombol action memakai #242820 pada kedua tema. Status sukses, peringatan, dan gagal memiliki token serta label sendiri. Verifikasi seluruh pasangan; token ini bukan hasil audit kontras.

Source Sans 3 untuk paragraf dan kontrol; monospace lokal/system untuk nomor langkah, label metrik, dan kode. Jangan memakai monospace kecil untuk seluruh narasi.

- Judul pelajaran 28–32/36–40 px desktop, 24/32 px ponsel.
- Judul langkah 22/30 px; isi 17/28 px, minimal 16/26 px pada ponsel.
- Label sekunder 13–14/20 px; nilai metrik 18–22 px dengan angka tabular.
- Skala jarak 4, 8, 12, 16, 24, 32, 48 px.
- Radius panel 12 px; tombol/input 8 px; badge kapsul.
- Bayangan pendek untuk tombol utama dan panel mengambang; bukan untuk setiap bidang.

## 14. Keadaan sistem dan aksesibilitas

Cadangkan ruang panggung saat memuat; materi dapat digunakan segera. Jika figur gagal, tampilkan fallback, alasan singkat, dan Coba muat ulang. Thumbnail umum tidak boleh diklaim sebagai state langkah tertentu.

Hasil pencarian kosong menampilkan kueri dan Hapus filter. URL salah menampilkan Langkah tidak ditemukan dan kembali ke awal. Penyimpanan lokal gagal tidak memblokir pembelajaran.

Target WCAG 2.1 AA: keyboard, fokus terlihat, heading berurutan, kontras normal minimal 4,5:1, reflow 320 CSS px, dan zoom 200%. Target kontrol utama 44 × 44 px merupakan standar produk. Status memakai teks/simbol selain warna.

Glosarium dapat dibuka lewat tap/Enter dan ditutup lewat Escape, lalu mengembalikan fokus. Drawer/fullscreen menahan fokus dan punya tombol tutup. Readout tidak diumumkan setiap frame.

Reduced motion mengganti perjalanan animasi dengan perubahan state atau tahapan manual yang tetap menjelaskan hasil. Sediakan ringkasan tekstual proses.

## 15. Komponen dan kontrak konten

Komponen utama: AppHeader, CourseSidebar, LessonHeader, AnatomyStage, MetricStrip, FigureControls, StepPanel, KeyIdea, StepMap, LearningOutcomes, GlossaryPopover, CourseDrawer, FigureFallback.

Pelajaran mencakup kategori, slug, judul, ringkasan, level, durasi, tujuan, prasyarat, istilah, relasi, dan langkah. Langkah memiliki key stabil, judul pendek, judul utama, jenis tahap, narasi, analogi opsional, pemetaan analogi, batas analogi, petunjuk pengamatan, gagasan inti, state figur, dan metrik relevan.

Pisahkan konten, model simulasi, dan geometri. Adapter lokal menyediakan init, setStep, replay, pause/resume, setTheme, selectPart, explore, resetToStep, readout, serta stateApplied/error. Bundle masa depan memetakan kemampuan yang sama tanpa mengganti pengalaman pengguna.

## 16. Dashboard tahap berikutnya

Dashboard untuk satu admin menyediakan field pedagogi terstruktur, daftar langkah, state figur, preview ruang belajar yang sama, pemeriksaan Indonesia, dan status simpan.

Perubahan topik terbit menjadi revisi draft; Terbitkan perubahan mengganti snapshot publik secara atomik. Upload tidak otomatis aktif. Mapping diperiksa sebelum terbit, aktivasi, atau rollback. Versi aktif tidak dapat dihapus.

Inggris opsional dan dikelola per bahasa. Bahasa belum lengkap tidak dipublikasikan. Draft boleh belum lengkap; pesan validasi menautkan field bermasalah.

## 17. Validasi dan kriteria penerimaan

- Pada desktop 1440 × 900, daftar materi, mesin, penjelasan aktif, dan navigasi terlihat bersama.
- Pada 1280 × 720, semua isi dapat diakses tanpa terpotong.
- Pada 390 × 844 dan 360 × 740, teks serta figur terbaca tanpa scroll horizontal halaman.
- Scroll tidak mengubah langkah. Tombol, peta, URL, dan Back/Forward menghasilkan state yang sama.
- Replay deterministik; jeda membekukan waktu; eksplorasi dapat dipulihkan.
- Semua teks wajib tersedia dalam Indonesia, termasuk error dan label figur.
- Uji keyboard, reduced motion, tema gelap, fallback, zoom, dan fokus dialog.
- Pada uji formatif lima pemula, target minimal empat dapat menjelaskan mekanisme utama dan mengulang langkah tanpa arahan. Ini target, bukan hasil uji.

## 18. Prioritas pengerjaan

1. Terapkan shell ruang belajar dan satu Load Balancer tanpa backend.
2. Buktikan navigasi, replay, eksplorasi, dan ponsel pada figur nyata.
3. Uji narasi/analogi dan perbaiki berdasarkan temuan.
4. Terapkan pada DNS, Caching, dan Message Queue.
5. Lengkapi lima topik dan audit aksesibilitas/performa.
6. Setelah pengalaman stabil, bangun pengelolaan konten dan bundle sesuai PRD.

Dokumen ini menetapkan arah desain, bukan laporan implementasi atau pengujian. PRD menetapkan ruang lingkup dan kriteria produk; Design.md menetapkan presentasi serta perilakunya.

## Pembaruan gerak dan identitas 18 November 2026

Nama produk adalah Alur. Judul materi cukup Load Balancer, DNS, dan Message Queue. Diagram bertambah sesuai langkah, memakai elemen DOM yang tetap agar kemunculan objek, perubahan keadaan, serta pembingkaian dapat dianimasikan. Kamera menyesuaikan kumpulan komponen yang terlihat dengan transisi sekitar 720 ms. Animasi mengulang jendela kejadian aktif; angka demonstrasi memulai siklus baru bersama modelnya. Tombol Jeda tetap tersedia sebagai pilihan aksesibilitas. Pindah langkah memulai animasi tujuan. Reduced motion menampilkan perubahan keadaan tanpa gerakan kamera panjang. Ringkasan tetap dapat diam agar mudah ditinjau.
