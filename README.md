# Alur — prototipe

Ruang belajar sistem interaktif berbahasa Indonesia, mengikuti **PRD 2.0** (`Claude outputs/PRD-WebEdukasi-Anatomi.md`) dan **Design.md 2.0** (18 November 2026). Setiap pelajaran memperlihatkan satu sistem sebagai mesin isometrik buatan kit **anatomy**, dijalankan langkah demi langkah.

Pelajaran yang tersedia (Tahap A/B, statis, tanpa backend):

| Kategori | Pelajaran | Langkah |
| --- | --- | --- |
| 01 Jaringan | Anatomi Load Balancer (`?topik=load-balancer`) | 5 + ringkasan |
| 01 Jaringan | Anatomi DNS (`?topik=dns`) | 8 + ringkasan |
| 02 Komunikasi | Anatomi Message Queue (`?topik=message-queue`) | 5 + ringkasan |

Caching dan Session/Token (kurikulum PRD §3) belum dibuat, sehingga tidak ditampilkan sebagai tautan.

## Menjalankan

Butuh Node.js 20+ (diuji dengan Node 22.15).

```sh
npm install
npm run dev        # server pengembangan Vite, http://localhost:5173
npm run build      # build figur + cek tipe + build statis ke dist/
npm run preview    # menyajikan dist/ (default port 4173; verifikasi di bawah memakai --port 4180)
npm test           # uji model simulasi (Vitest)
npm run print      # PDF lembar cetak, butuh preview berjalan di port 4180
```

`dist/` adalah website statis (`base: "./"`), bisa disalin ke hosting statis apa pun, termasuk subfolder.

### Alamat

| URL | Halaman |
| --- | --- |
| `./` | Katalog ringkas (Belajar) |
| `?topik=dns&langkah=root` | Satu langkah pelajaran; `langkah=ringkasan` untuk ringkasan |
| `?halaman=tentang` | Tentang |
| topik atau halaman lain | Halaman tidak ditemukan |

Tautan lama tetap bekerja: `?topik=dns#langkah-tiers` dipetakan ke `langkah=root` (peta `legacy` di tiap `lesson.ts`), dan `?lang=` dibuang. Kunci langkah yang tidak dikenal menampilkan “Langkah … tidak ditemukan” dan membuka langkah pertama. `?nofigure` mensimulasikan figur gagal dimuat.

## Ruang belajar

- **≥ 1280 px:** sidebar materi (kategori → pelajaran, `aria-current="page"`), kolom tengah (judul pelajaran, panggung anatomi, peta langkah), panel materi kanan (satu langkah), lalu tujuan belajar di bawahnya.
- **900–1279 px:** sidebar menjadi drawer “Daftar materi” (tombol menu di header); panggung dan materi dua kolom.
- **< 900 px:** satu kolom: judul, figur (ringkas, bisa disembunyikan atau layar penuh), materi, navigasi, lalu peta langkah sebagai “Langkah N dari M” + “Lihat semua langkah”.

**Navigasi langkah eksplisit.** Kembali, “Berikutnya: [judul pendek]”, peta langkah, URL, dan Back/Forward memakai satu jalur (`?langkah=`). Scroll tidak mengubah langkah dan tidak ada auto-next. Memilih langkah memindahkan fokus ke judul materi. Langkah yang pernah dibuka diberi penanda putus-putus di peta, bukan tanda “dipahami”. Pintasan ←/→, R, dan Spasi hanya aktif saat fokus di ruang belajar dan bukan di kontrol.

**Demonstrasi sekali jalan.** Membuka langkah membangun keadaan awal deterministik, menjalankan demonstrasi sampai `holdAt`, lalu menahannya: “Demonstrasi selesai. Kamu bisa mengulang atau melanjutkan.” Ulangi langkah membangun ulang; Jeda membekukan waktu, pesan, dan penghitung. Mengubah parameter masuk Eksplorasi bebas; memilih langkah atau “Kembali ke materi” mengakhirinya. Ringkasan menahan keadaan akhir langkah terakhir.

**Panel materi** berurutan: Langkah N dari M, jenis (Masalah/Analogi/Proses/Percobaan), judul kejadian, 2–3 paragraf, analogi opsional, Amati, Gagasan inti (bidang ungu), Kembali/Berikutnya. **Ringkasan** berisi mekanisme, tabel analogi beserta batasnya, batas penyederhanaan, materi lain, PDF cetak, “Pilih materi lain”, dan “Ulangi pelajaran”.

**Panggung** berisi nama keadaan dan readout, Ulangi/Jeda/Layar penuh, empat metrik dari model (label + satuan; peringatan diberi warna dan bingkai), figur dengan grid tipis, status mode, legenda, serta panel “Komponen, eksplorasi, dan rincian angka”.

**Header:** Alur, Belajar, pencarian lokal (judul, ringkasan, langkah, glosarium; hasil langsung ke langkah; hasil kosong menampilkan kueri dan “Hapus pencarian”), dan tema Sistem/Terang/Gelap. Pilihan bahasa dihapus karena hanya bahasa Indonesia yang lengkap.

**Token visual** mengikuti Design.md §13 (latar #F5F0E7, aksi #D3E5B1, gagasan inti #EAE2F3, beserta versi gelapnya). Figur memakai palet hangat yang sama dengan aksen hijau.

## Struktur

| Lapisan | Berkas |
| --- | --- |
| Materi pelajaran (Indonesia) | `src/topics/<topik>/lesson.ts`: langkah (kunci, judul pendek, judul, jenis, isi, analogi, Amati, gagasan inti), analogi + batas, ringkasan, tujuan, peta kunci lama |
| Langkah figur | `src/sim/scenarios.ts`, `src/topics/*/scenarios.ts`: keadaan awal, sorotan, dan `holdAt` per langkah (selaras 1:1 dengan `lesson.steps`) |
| Model simulasi | `src/sim/model.ts`, `src/topics/*/model.ts` (+ `*.test.ts`) |
| Modul topik | `src/topics/types.ts`, `src/topics/index.ts` (kategori, urutan, resolusi kunci langkah), `src/topics/*/index.tsx` (metrik, readout, kontrol eksplorasi) |
| Kerangka | `src/App.tsx`, `src/state/route.ts` (URL, Back/Forward, `Link`), `src/state/search.ts`, `src/components/Shell.tsx` (header, pencarian, sidebar, drawer), `src/components/Lesson.tsx` (ruang belajar, panel, peta, ringkasan), `src/components/Stage.tsx` (panggung), `src/components/Pages.tsx` (katalog, tentang, tidak ditemukan) |
| Runtime | `src/state/runtime.ts`: satu loop rAF, jalan sekali sampai `holdAt`, jeda, mode, pengumuman |
| Gaya | `src/styles/app.css` (token, tata letak), `src/styles/components.css` (kontrol, glosarium, readout), `src/styles/figure.css` (token figur, juga dipakai lembar cetak) |
| Geometri figur | `scripts/build-figure*.mjs` → `art.generated.json` + `public/*figure-*.svg` (fallback) |
| Kit anatomy | `src/figure/kit/`, arsip lengkap di `vendor/anatomy/` |

`src/content/topic.ts` dan `content.ts` per topik masih menyimpan teks dwibahasa lama (glosarium, nama komponen, readout); halaman hanya memakai versi Indonesia.

## Verifikasi pembaruan PRD/Design 2.0

Chrome headless terhadap `vite preview --port 4180` (skrip di `scripts/verify/room-*.json` dan `room-helpers.js`).

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | 33 uji model lulus, termasuk uji baru: tiap langkah DNS mulai dari akhir langkah sebelumnya, dan langkah Root/TLD berhenti tepat setelah rujukan kembali |
| 1440×900, semua langkah ketiga pelajaran | daftar materi, mesin (bawah ≤ 889 px), materi aktif, dan tombol Berikutnya (bawah ≤ 848 px) terlihat bersama; ringkasan lebih panjang dan di-scroll |
| Tombol Berikutnya, peta langkah, Back, Forward | URL, peta (`aria-current="step"`), judul, dan keadaan figur selalu sama; fokus pindah ke judul materi |
| Scroll 2000 px | langkah dan simulasi tidak berubah |
| Eksplorasi → ubah alamat DNS → pilih langkah 6 | eksplorasi berakhir dan langkah 6 berjalan dari awal |
| Ringkasan | keadaan akhir (t = 26,8 dtk untuk DNS), 2 materi lain, “Pilih materi lain”, “Ulangi pelajaran” |
| `#langkah-tiers` (lama), `langkah=nggak-ada`, `topik=nope` | dipetakan ke Root; pemberitahuan + langkah 1; halaman tidak ditemukan |
| Pencarian “ttl” dan “zzzqqq” | hasil glosarium dan langkah, Enter membuka langkah; hasil kosong + Hapus pencarian |
| Pintasan ← → Spasi R pada judul materi | pindah langkah, jeda membekukan readout, ulangi membangun ulang |
| Layar penuh, drawer (1024 px) | fokus ke tombol keluar, Escape menutup; drawer menahan fokus dan tertutup saat memilih pelajaran |
| `?nofigure` (1280×720), gerak dikurangi | gambar statis + teks + Coba muat ulang, materi tetap lengkap; demonstrasi tetap berjalan |
| 360, 390, 1024, 1440 px | tidak ada scroll horizontal |

Cacat yang ditemukan dan diperbaiki dalam putaran ini:
- Langkah Root berhenti 0,05 dtk terlambat, sehingga judul keadaan sudah “bertanya ke TLD”.
- Mesin terpotong di 1440×900.
- Panel materi terlalu panjang di beberapa langkah (dirapatkan, dua langkah dipangkas).
- Kontrol panggung terbungkus di 360 px.
- Gambar fallback Load Balancer tidak pernah tampil di `<img>`: atribut tanpa nilai (`data-static`, `hidden`) membuat SVG tidak valid sebagai XML.

### Belum sesuai atau belum dikerjakan

- Kurikulum PRD lima topik: **Caching** dan **Session dan Token** belum ada (Tahap B).
- Uji formatif dengan lima pemula, audit kontras dengan alat, pengukuran LCP pada profil 4G, pembaca layar nyata, serta Safari/Firefox belum dilakukan. Bundle aplikasi saat ini ±96 KB gzip (target < 200 KB), di luar figur yang dimuat lambat.
- Beberapa langkah berisi sekitar 60–100 kata, sedikit di bawah sasaran 70–140 kata, supaya panel muat di 1440×900.
- Lembar PDF berbahasa Inggris (`*-en.pdf`) masih memakai palet lama dan tidak ditautkan.
- Tahap C/D (dashboard, kontrak bundle iframe, progres lokal, latihan) di luar cakupan prototipe ini.

## Riwayat (sebelum PRD 2.0)

Bagian berikut menjelaskan figur, model, dan verifikasi putaran sebelumnya. Uraian hero, scroll, dan pilihan bahasa di dalamnya sudah digantikan oleh ruang belajar di atas.

### Figur

Konsep: **mesin pembagi permintaan di atas meja uji** (84 solid, 7 ruas kabel, SVG tanpa WebGL).

| Bagian mesin | Artinya |
| --- | --- |
| Klien dengan magazin token dan kenop laju | Klien yang mengirim permintaan |
| Token di rel | Satu permintaan; token bertanda silang = gagal |
| Drum distributor dengan lengan pemilih | Load balancer; lengan menunjuk lajur pilihan round robin |
| Tiga pin di atas drum | Catatan LB: pin berdiri = server dianggap sehat |
| Server A/B/C dengan rana di port masuk | Rana tertutup dan lampu samping padam = server mati secara fisik |
| Unit health check, kabel probe, kabel status | Pemeriksaan berkala; pulsa yang kembali = server menjawab |

Pin (pandangan LB) dan rana (kondisi fisik) sengaja dipisah, sehingga jeda deteksi terlihat langsung.

### Model simulasi

- Round robin memilih bergiliran di antara server yang **dianggap** sehat dan melewati yang tidak.
- `up` (fisik) dan `healthy` (menurut LB) adalah dua nilai terpisah; `healthy` hanya berubah oleh hasil health check.
- Permintaan yang tiba di server mati gagal dan tidak dipindah atau dicoba ulang.
- Health check: setiap 3 dtk, batas waktu 1 dtk, ambang 2 gagal / 2 lolos. Ini **parameter demonstrasi**, bukan konfigurasi produksi.
- Hitungan bersifat kumulatif sejak awal cerita. Laju terukur = forward dalam 10 dtk simulasi terakhir ÷ 10.
- Langkah 3–5 adalah jendela pada satu cerita: B mati pada t = 4,2 dtk, langkah 3 berhenti pada t = 9,8 dtk (sebelum pemeriksaan kedua selesai), dan B hidup kembali pada t = 16 dtk. Setiap langkah dibangun ulang dari t = 0, sehingga “Ulangi langkah” selalu deterministik.

### Verifikasi yang sudah dijalankan

Semua di Windows 11, Chrome headless, terhadap `npm run preview`.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test`: 13 uji model (urutan A→B→C, independensi ukuran frame, 2 kegagalan sebelum deteksi, B dilewati setelah ditandai, B kembali setelah 2 pemeriksaan lolos, tidak ada retry, jeda/laju/health check manual) | lulus |
| `node scripts/build-figure.mjs --audit` (kit anatomy: clearance, terminal kabel, support, kedalaman, crowding, stand-in) | `audit passed` |
| `vendor/anatomy/scripts/lines.mjs` pada halaman cek dan halaman hidup, tema terang dan gelap | 0 ujung garis mengambang |
| Langkah 4 di browser | B “Tidak sehat”, rotasi A↔C, Dikirim B berhenti di 3 |
| Langkah 5 di browser | B hidup tetapi “lolos 1/2”, lalu Sehat dan kembali menerima permintaan |
| Langkah 3 | berhenti di t = 9,8 dtk, 2 gagal, pesan henti tampil |
| Jeda / Ulangi langkah / Berikutnya / “Baca ringkasan” | waktu berhenti; reset deterministik; navigasi benar |
| Ganti bahasa | langkah aktif tetap; waktu simulasi lanjut |
| Ganti tema | simulasi tidak direset |
| Eksplorasi: matikan/hidupkan B, laju, health check manual, scroll | eksperimen bertahan saat scroll; tombol cek terkunci selama probe berjalan; “Kembali ke penjelasan” memulihkan langkah |
| Popover glosarium | Enter membuka, Escape menutup, fokus kembali ke istilah |
| Layar penuh | (headless tanpa Fullscreen API → fallback dialog) fokus ke tombol keluar, Escape keluar, fokus kembali ke pembuka |
| Gerak dikurangi | token muncul di stasiun tanpa perjalanan, pulsa tidak ditampilkan |
| `?nofigure` | gambar statis + pesan + “Coba muat ulang”; readout tetap berjalan |
| Lebar 360, 390, 768, 1024, 1440 | tidak ada scroll horizontal |

### Putaran hero → panel

| Pemeriksaan (`scripts/verify/transition.json`, `anchor.json`, `keyboard.json`, `sizes.json`, `mobile.json`) | Hasil |
| --- | --- |
| Layar awal 1440×900, 1440×768, 1024×768 | judul dan mesin utuh terlihat bersamaan tanpa scroll (bawah figur 888/900 px) |
| Scroll 0 → 160 → 420 → 0 | `--p` 0 → 0,5 → 1 → 0; waktu simulasi terus naik (tidak ada reset); kontrol panel `inert` selama hero |
| Panel belajar di 1440×900 / 1440×768 / 1024×768 / 1280×640 | seluruh panel muat (bawah 881/900, 749/768, 749/768, 621/640) |
| 1366×540 | jatuh ke layout statis tanpa sticky; kontrol aktif |
| “Pelajari cara kerjanya” | awal penjelasan mendarat 15 px di bawah header; fokus ke “Yang akan kamu pahami”; demo tidak direset |
| Sticky berakhir | bawah panel = atas ringkasan (300/300 px) |
| Eksplorasi lalu scroll ke hero dan kembali | mode dan kondisi B tetap |
| Buka `#langkah-health-check` | layout belajar langsung, state langkah 4 benar |
| Scroll ke langkah 5 lalu refresh | kembali ke langkah 5 (hash mengikuti langkah) |
| Ganti bahasa / tema di tengah | langkah dan waktu dipertahankan |
| Gerak dikurangi | layout lompat 0 → 1 tanpa interpolasi |
| Tab dari tombol hero | melewati kontrol tersembunyi, menyelesaikan transisi, fokus tidak tertutup header |
| Layar penuh lalu keluar | figur membesar; keluar mengembalikan fokus dan posisi figur di slot |
| `lines.mjs` pada figur hidup, kedua tema | 0 ujung garis mengambang; audit geometri `audit passed` |
| Ponsel 360/390, tablet 768 | satu kolom, tanpa scroll horizontal; strip figur 38–40% tinggi layar saat membaca |

Skrip aksi ada di `scripts/verify/*.json` (dengan `scripts/verify/helpers.js` sebagai `--preload`). `scripts/drive-viewport.mjs` adalah salinan `drive.mjs` dari kit yang menangkap viewport apa adanya, sehingga elemen sticky ikut terlihat. Contoh:

```sh
npm run preview
node scripts/drive-viewport.mjs "http://localhost:4173/?lang=id" --actions scripts/verify/steps-4-5.json --preload scripts/verify/helpers.js
```

### Topik Message Queue

**Figur:** mesin antrean pesan di atas meja uji (64 solid, 2 kabel), tanpa WebGL.

| Bagian mesin | Artinya |
| --- | --- |
| Pencetak kartu dengan magazin dan kenop laju | Producer |
| Kartu | Pesan; titik = dikirim ulang, silang = salinan hilang atau ditolak |
| Rak rol 12 slot | Antrean FIFO; ekor di kiri, kepala di kanan |
| Jembatan dan lemari broker | Broker yang mengambil pesan dari kepala antrean |
| Bay dan dial timer di atap broker | Salinan yang menunggu ack, dan batas waktu ack |
| Gerbang di port broker | Consumer terhubung atau tidak |
| Stasiun C1/C2 (landasan, dial progres, lampu daya, lampu ack) | Consumer |
| Kabel ack | Ack dari consumer ke broker |

**Model** (`src/topics/message-queue/model.ts`): producer mengirim setiap 2,5 dtk, perjalanan ke antrean 0,8 dtk, pengiriman ke consumer 0,7 dtk, proses 0,5 dtk, batas waktu ack 2 dtk, dan kapasitas 12. Prefetch 1 per consumer, dengan consumer yang menganggur bergiliran. Pesan tanpa ack dikembalikan ke kepala antrean, dan pesan yang tiba saat rak penuh ditolak. Angka-angka ini adalah parameter demonstrasi.

**Langkah:**
1. Mengapa perlu antrean.
2. Lonjakan 6 pesan; puncak kedalaman 5, FIFO.
3. C1 berhenti saat menganggur pada t = 5; antrean 0 → 4 tanpa kehilangan pesan; berhenti di t = 14.
4. C1 mati saat memproses #2; #2 dikirim ulang setelah 2 dtk sebagai percobaan ke-2.
5. Producer 1 per 0,7 dtk; C2 dihubungkan pada t = 8 dan antrean menyusut.

**Verifikasi yang dijalankan:**
- `npm test`: 11 uji MQ ditambah 13 uji LB, semuanya lulus. Yang diuji MQ: FIFO, independensi ukuran frame, penampungan lonjakan, consumer berhenti tanpa kehilangan pesan, producer tidak melambat, pengiriman ulang tepat satu kali dengan percobaan ke-2, pesan yang di-ack tidak kembali, competing consumers tanpa pesan ganda, penolakan saat penuh, lonjakan 5 pesan, dan determinisme.
- `node scripts/build-figure-mq.mjs --audit`: `audit passed`.
- `lines.mjs` pada halaman cek dan halaman hidup (langkah 4, kedua tema): 0 ujung mengambang.
- Di browser (`scripts/verify/mq-zoom.json`, `mq-flow.json`, `mq-helpers.js`):
  - langkah 2 menampilkan 5 kartu di slot kepala;
  - langkah 4 menampilkan salinan di bay C1 dengan timer, lalu “#2 percobaan ke-2”;
  - langkah 5 menampilkan C1 dan C2 bergantian.
  - Eksplorasi: matikan C1, lonjakan, hubungkan C2, laju cepat.
  - Ganti bahasa mempertahankan langkah dan waktu.
  - Pemilih topik dan topik terkait bekerja. Tidak ada scroll horizontal di 360/390 px.
- Regresi LB setelah refaktor generik: `steps-4-5.json` dan `transition.json` memberi hasil yang sama seperti sebelumnya.

**Masalah yang ditemukan saat verifikasi dan sudah diperbaiki:**
- Kartu di kepala antrean tergambar di atas atap broker. Penempatan kedalaman kini hanya mempertimbangkan bagian yang bertumpuk di layar.
- Lemari broker yang tinggi menutupi 2–3 slot kepala antrean. Broker diturunkan dan ditambah jembatan transfer.
- Header ponsel membungkus tombol ID/EN.

### Topik DNS

**Figur: meja pencarian alamat bertingkat** (51 solid, SVG tanpa WebGL). Skrip build: `scripts/build-figure-dns.mjs`; kode topik: `src/topics/dns/`.

| Bagian mesin | Artinya | Analogi di teks |
| --- | --- | --- |
| Terminal klien, keyboard, baki atas | Klien | orang yang bertanya |
| Kotak kartu dengan baki dan dial TTL | Cache lokal | catatan kecil milik sendiri |
| Rel lantai | Jalur klien ↔ resolver | — |
| Meja konter dengan baki masuk | Resolver | petugas meja informasi |
| Baki dan dial TTL di meja | Cache resolver | catatan bersama petugas |
| Tanjakan dan tiga podium bertingkat | Root (tertinggi, tiang antena), TLD `.id` (papan nama), authoritative `contoh.id` (baki catatan resmi) | kantor pusat, kantor wilayah, kantor yang memegang alamat |
| Kartu: lingkaran / panah / satu garis / dua garis | Pertanyaan / rujukan / jawaban alamat lama / jawaban alamat baru | — |

**Model** (`src/topics/dns/model.ts`): cek cache 0,3 dtk, klien ↔ resolver 0,6 dtk, resolver ↔ server 0,7 dtk (pencarian penuh 6 dtk), TTL 12 dtk, dan klien menyimpan paling lama 5 dtk. TTL dihitung sejak resolver menyimpan jawaban; klien menyimpan min(5 dtk, sisa TTL).

**Satu cerita, lima jendela:**
- #1 pencarian penuh, root → TLD → authoritative (langkah 1 dan 2).
- #2 dan #3 dijawab cache lokal (langkah 3).
- Cache lokal kedaluwarsa pada 11,5 dtk, lalu #4 dijawab cache resolver (langkah 4).
- Alamat berubah pada 15 dtk. #5 menerima alamat lama dari cache, kedua cache kedaluwarsa pada 17,9 dtk, dan #6 mendapat alamat baru (langkah 5).

Di mode eksplorasi, jadwal cerita dihentikan sehingga hanya pertanyaan pembaca yang berjalan. Aksinya: Tanyakan, Ubah alamat, Kosongkan cache lokal, dan Kosongkan cache resolver.

**Verifikasi yang dijalankan:**
- `npm test`: 7 uji DNS lulus (urutan root → TLD → authoritative, isi kedua cache dan batas klien, hit cache lokal tanpa kunjungan server, hit cache resolver, jawaban basi setelah perubahan, determinisme, aksi manual). Bersama LB dan MQ totalnya 31 uji lulus.
- `node scripts/build-figure-dns.mjs --audit`: `audit passed`.
- `lines.mjs` pada halaman cek dan halaman hidup langkah 5, kedua tema: 0 ujung mengambang.
- Lembar 12 bingkai (`scripts/verify/dns-sheet.json`) memperlihatkan seluruh perjalanan pencarian dengan urutan kedalaman benar.
- `dns-zoom.json` dan `dns-flow.json`:
  - jawaban #5 “alamat lama”, lalu #6 pencarian penuh;
  - eksplorasi: ubah alamat lalu tanya memberi alamat lama dari cache lokal; kosongkan cache lokal memberi alamat lama dari resolver; kosongkan keduanya memberi pencarian penuh dengan alamat baru;
  - ganti bahasa mempertahankan langkah dan waktu;
  - tidak ada scroll horizontal di 390 px.
- Regresi MQ setelah perubahan penempatan kartu: langkah 2 tetap 5 kartu di slot kepala.

**Masalah yang ditemukan saat verifikasi dan sudah diperbaiki:**
- Ujung tanjakan miring terbenam di meja dan podium. Tata letak diubah menjadi tanjakan lurus dan ujungnya diberi celah.
- Alas tanjakan tak terlihat. Kini diberi bilah melintang.
- Kartu bisa tergambar di bawah tanjakan karena uji tumpang-tindih memakai kotak layar yang terlalu longgar. Kini memakai selubung siluet.
- Pertanyaan terjadwal dari cerita bercampur dengan pertanyaan pembaca di mode eksplorasi.

### Lembar cetak (PDF A4)

Setiap topik punya tiga lembar cetak dalam bahasa Indonesia dan Inggris (18 PDF di `public/print/`, ditautkan di bagian penutup tiap halaman):

| Format | Halaman | Isi |
| --- | --- | --- |
| Poster | 1 | Nama besar, pertanyaan, pengantar, 4 angka dari model, figur dengan pin bernomor, semua bagian |
| Gambar teknik | 1 | Daftar bagian, spesifikasi, inset pose lain, strip 5 langkah dengan bagian yang disorot |
| Lembar rinci | 2 | Figur dengan pin dan 3 close-up; tiap langkah sebagai gambar besar, alasan (“mengapa”), dan spesifikasi |

Lembar diambil dari figur hidup, bukan digambar ulang. `scripts/print-topics.mjs` memakai `capture` dan `sheetHtml` dari kit anatomy apa adanya, ditambah tiga penyesuaian untuk situs ini:
- Pose diambil dari URL preview, lewat anchor langkah, pada momen yang ditunggu dari readout.
- CSS figur disuntikkan, karena Vite memuat CSS lewat `<link>`, sedangkan pengambil gambar kit hanya membaca `<style>`. Aturan sorotan halaman dibuang, karena lembar memakai sorotannya sendiri.
- Label tata letak diterjemahkan untuk versi Indonesia.

Spesifikasi lembar (pose, bagian, teks ID/EN, posisi pin dari koordinat dunia figur) ada di `scripts/sheets/<topik>.mjs`. Angkanya berasal dari model. Contoh: “6,4 dtk dari B mati sampai ditandai” diperiksa dengan model LB (ditandai pada 10,6 dtk, B mati pada 4,2 dtk).

```sh
npm run build && npm run preview      # terminal 1
npm run print                          # terminal 2; atau: node scripts/print-topics.mjs --topic dns --format poster --lang id --png
```

Pratinjau PNG dan HTML lembar ditulis ke `shots/print/`.

**Verifikasi:**
- Ke-18 PDF dicetak sesuai jumlah halamannya (tidak ada yang meluber).
- Semua pratinjau PNG diperiksa; tautan PDF dari halaman tersaji sebagai `application/pdf`.
- Cacat yang ditemukan dan sudah diperbaiki:
  - pose sempat diambil dalam tema gelap, sehingga garis pucat di kertas;
  - aturan CSS figur tidak berlaku pada klon cetak karena akhir baris CRLF dan awalan `.lb-svg`;
  - pin bertumpuk;
  - close-up “pin kelayakan” meleset karena jalur kosong `M0 0` pada lengan pemilih, yang juga sudah diperbaiki di figur web;
  - close-up unit health check terlalu lebar.


- DNS: resolver tidak menyimpan rujukan root/TLD, tidak ada CNAME/AAAA/DNSSEC, dan cache browser serta router digabung menjadi satu cache lokal (dijelaskan di bagian batas penyederhanaan pada halaman).
- DNS: figur di ponsel cukup kecil (strip ±26vh); baki dan kartu paling jelas dilihat lewat Layar penuh.

- Message Queue: urutan kartu yang menumpuk saat C1 mati dan menerima pesan baru (dua salinan di satu bay) hanya diuji lewat model, belum dilihat di browser.
- Message Queue: setiap pesan yang dikirim ulang kembali ke kepala antrean; produk nyata berbeda (lihat batas penyederhanaan di halaman).
- Header ponsel memakai tiga baris setelah menu topik ditambahkan (header tidak menempel di ponsel, jadi tidak mengurangi ruang baca saat scroll).

- **Belum diuji di perangkat dan pembaca layar nyata.** Pemeriksaan di atas dijalankan di Chrome headless. Fullscreen API asli, VoiceOver/NVDA, Safari, dan Firefox belum dicoba.
- **Kontras belum diaudit dengan alat.** Token warna mengikuti Design.md; rasio kontras belum diukur satu per satu.
- Gambar fallback statis (`public/figure-*.svg`) memakai palet abu-abu bawaan kit, bukan palet biru halaman, dan memperlihatkan pose diam (bukan keadaan langkah).
- Di desktop, readout panel dapat digulir di dalam panel bila tingginya melebihi ruang (terutama pada mode eksplorasi di layar ≤ 800 px).
- Strip figur ponsel masih ±38–40% tinggi layar (kepala keadaan + figur + bilah kontrol), sedikit di atas target sepertiga; tombol Ringkas figur tersedia.
- Transisi diuji di Chrome headless saja; kelancaran scroll di Safari/Firefox dan pada perangkat lemah belum diukur.
- Klik pada figur memilih komponen, tetapi tidak ada navigasi keyboard di dalam SVG. Alternatif keyboard tersedia lewat daftar “Komponen figur” dan tombol rujukan di teks.
- Lintasan token disederhanakan: token masuk ke drum dan server dengan memudar, bukan dengan model fisik penuh.
- URL bilingual memakai `?lang=` (bukan `/id/topik/...` seperti PRD), karena prototipe tidak memakai router.
