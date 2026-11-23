# Design WebEdukasi Anatomi

Panduan UI dan UX untuk website edukasi konsep sistem melalui figur mesin isometrik interaktif.

Tanggal: 12 November 2026  
Sumber kebutuhan: `Claude outputs/PRD-WebEdukasi-Anatomi.docx`  
Status: Usulan desain untuk ditinjau sebelum implementasi

## 1. Tujuan dan batas desain

WebEdukasi Anatomi membantu pelajar, mahasiswa IT, dan developer pemula memahami mekanisme sistem melalui penjelasan bertahap yang tersinkron dengan figur interaktif. Pengunjung harus dapat menghubungkan tindakan dengan akibatnya: misalnya melihat permintaan berpindah ketika satu server berhenti bekerja.

Keberhasilan pengalaman belajar dinilai dari kemampuan pembaca menjelaskan kembali mekanisme, bukan hanya menyelesaikan scroll atau menjalankan animasi.

Dokumen ini menerjemahkan PRD menjadi keputusan desain yang dapat dipakai untuk wireframe, prototipe, dan implementasi. Keputusan yang belum diuji ditandai sebagai usulan, bukan hasil riset pengguna.

### Batas MVP dari PRD

- Website publik tanpa akun pengunjung.
- Lima topik awal dalam bahasa Indonesia dan Inggris.
- Figur interaktif, penjelasan per langkah, glosarium, pencarian, serta tema terang dan gelap.
- Dashboard untuk satu admin, dengan konten Markdown dan upload bundle figur.
- Tidak mencakup kuis, progres belajar tersimpan, bookmark, komentar, poster PDF, atau editor figur visual.
- Jalur belajar khusus belum ditetapkan. Rekomendasi topik berikutnya menggunakan relasi topik yang sudah tersedia.

### Penambahan desain yang diusulkan

Mode eksplorasi bebas yang eksplisit, fallback figur, ringkasan hasil belajar, status penyimpanan editor, dan checklist penerbitan merupakan usulan untuk memperjelas pengalaman. Kebutuhan data atau perilaku baru yang menyertainya harus disepakati sebelum implementasi.

## 2. Pengguna dan pekerjaan utama

| Pengguna | Pekerjaan utama | Hambatan yang perlu diatasi |
| --- | --- | --- |
| Pemula | Memahami apa yang terjadi dan mengapa | Jargon, animasi tanpa konteks, terlalu banyak komponen sekaligus |
| Pembaca yang mencari konsep tertentu | Menemukan jawaban dan bagian relevan dengan cepat | Navigasi panjang, pencarian tanpa konteks, langkah sulit dilompati |
| Pembaca melalui ponsel | Membaca sambil melihat akibat di figur | Ruang layar terbatas, interaksi mengandalkan hover, figur terlalu kecil |
| Admin tunggal | Menerbitkan topik bilingual dengan figur yang benar | Terjemahan tertinggal, mapping langkah rusak, perubahan belum tersimpan |

Pertanyaan utama pembaca pada setiap langkah adalah: “Apa yang sedang terjadi?”, “Bagian mana yang berubah?”, dan “Apa akibatnya?”. Desain teks, sorotan figur, dan readout harus menjawab pertanyaan yang sama.

## 3. Prinsip pengalaman

1. **Satu langkah menjelaskan satu mekanisme utama.** Hindari memperkenalkan banyak konsep baru dalam satu perubahan figur.
2. **Teks dan figur saling menjelaskan.** Nama komponen, warna sorotan, istilah, dan keadaan harus konsisten.
3. **Pembaca mengendalikan ritme.** Scroll dan tombol langkah tersedia; tidak ada perpindahan langkah otomatis berdasarkan timer.
4. **Eksplorasi dapat dipulihkan.** Pengunjung selalu dapat kembali ke keadaan figur yang sesuai dengan bacaan.
5. **Penjelasan tetap berguna tanpa animasi.** Setiap langkah memiliki uraian yang lengkap dan alternatif visual saat figur gagal.
6. **Detail muncul sesuai kebutuhan.** Ringkasan mekanisme dibaca terlebih dahulu; definisi istilah dan informasi komponen tersedia saat diminta.
7. **Status selalu dapat dipahami.** Langkah aktif, mode figur, hasil upload, dan kesiapan terbit dinyatakan dengan teks yang jelas.

## 4. Arah visual

### Konsep

Gunakan karakter meja eksperimen digital: mesin isometrik menjadi elemen khas produk, sedangkan bidang bacaan dan navigasi memberikan struktur yang tenang. Kedalaman visual digunakan pada figur; antarmuka menggunakan permukaan sederhana, garis pembatas seperlunya, dan bayangan hanya untuk lapisan yang benar-benar mengambang.

Alternatif yang dipertimbangkan adalah gaya buku editorial yang menekankan bacaan dan gaya dashboard teknis yang menekankan data. Meja eksperimen dipilih sebagai usulan karena paling dekat dengan tujuan memahami sebab dan akibat melalui mesin fisik.

Jangan menambahkan dekorasi mesin, kabel, atau animasi pada semua bagian halaman. Identitas visual utama cukup dibawa oleh figur dan hubungan sorotannya dengan penjelasan.

### Warna antarmuka

Token berikut adalah titik awal. Seluruh pasangan teks, permukaan, fokus, dan status harus diperiksa kontrasnya sebelum ditetapkan untuk produksi.

| Peran | Tema terang | Tema gelap | Penggunaan |
| --- | --- | --- | --- |
| Background | `#F5F7FA` | `#101923` | Latar aplikasi |
| Surface | `#FFFFFF` | `#192632` | Bidang bacaan, panel, dialog |
| Text primary | `#172B3A` | `#EDF3F8` | Judul dan isi utama |
| Text secondary | `#506274` | `#B3C2D0` | Metadata dan teks pendukung |
| Action | `#175CD3` | `#91B8FF` | Tautan, fokus tindakan, indikator aktif |
| Border | `#CBD5DF` | `#445666` | Pemisah dan batas komponen |

Status keberhasilan, peringatan, dan kesalahan menggunakan token semantik tersendiri dengan ikon serta label. Warna komponen figur memiliki legenda yang konsisten antar langkah. Jangan menggunakan warna biru antarmuka sebagai satu-satunya pembeda server aktif, dan jangan mengandalkan merah serta hijau saja untuk menunjukkan kondisi.

### Tipografi

- Usulan keluarga huruf: **Source Sans 3** untuk antarmuka dan bacaan, disajikan secara lokal dengan fallback `system-ui, sans-serif`.
- Gunakan font monospace hanya untuk potongan kode dan nilai teknis yang memerlukannya.
- Judul halaman: 40/48 px desktop, 30/38 px ponsel.
- Judul bagian: 28/36 px desktop, 24/32 px ponsel.
- Judul langkah: 22/30 px.
- Isi bacaan: 18/30 px; antarmuka umum: 16/24 px; metadata: 14/20 px.
- Panjang baris bacaan sekitar 55–75 karakter dengan batas lebar sekitar 65ch.
- Teks rata kiri, sentence case, tanpa paragraf rata kanan-kiri.

### Ruang dan bentuk

- Skala jarak: 4, 8, 12, 16, 24, 32, 48, dan 64 px.
- Radius: 6 px untuk input dan tombol, 12 px untuk kartu topik serta bidang figur.
- Panel bacaan tidak perlu dipecah menjadi kartu pada setiap paragraf.
- Ikon mengikuti satu keluarga dengan label teks untuk tindakan yang belum familiar.
- Gerak noninteraktif dibatasi pada demonstrasi yang membantu memahami mekanisme.

## 5. Arsitektur informasi

```text
Website publik
├── Beranda
├── Daftar topik
│   ├── Pencarian
│   └── Filter kategori dan level
├── Halaman topik
│   ├── Pengantar dan tujuan
│   ├── Langkah dan figur
│   ├── Ringkasan
│   └── Topik terkait
├── Tentang
└── Halaman tidak ditemukan

Admin
├── Login
├── Ringkasan
├── Topik
│   └── Editor topik
│       ├── Informasi
│       ├── Figur dan versi
│       ├── Langkah dan terjemahan
│       └── Preview dan penerbitan
├── Kategori
├── Glosarium
└── Media
```

Header publik berisi identitas produk, Topik, Tentang, pencarian, pilihan bahasa, dan pilihan tema. Di ponsel, pencarian tetap mudah ditemukan; navigasi sekunder dapat dipindahkan ke menu. Akses admin melalui `/admin` dan tidak mengambil tempat utama dalam navigasi pembaca.

Gunakan URL bilingual sesuai PRD. Tautan langsung ke langkah menggunakan identitas langkah yang stabil, bukan nomor urut yang dapat berubah saat konten diurutkan ulang.

## 6. Beranda dan penemuan topik

### Beranda

Urutan konten:

1. Pernyataan singkat tentang apa yang dapat dipelajari dan tombol **Jelajahi topik**.
2. Satu figur unggulan dengan contoh sebab dan akibat yang mudah dipahami.
3. Topik awal yang direkomendasikan untuk pemula, dipilih secara editorial.
4. Kategori dan topik terbaru, maksimal enam sesuai jumlah konten terbit.

Contoh pesan pembuka: “Lihat cara kerja sistem, satu mekanisme setiap langkah.” Figur unggulan menggunakan satu instance yang sama pada desktop dan ponsel. Tampilkan thumbnail terlebih dahulu; animasi tidak boleh menunda navigasi dan bacaan.

Jika hanya lima topik yang tersedia, tampilkan lima. Jangan mengisi ruang dengan kartu kosong atau topik yang belum dapat dibaca.

### Daftar topik

Setiap kartu memuat thumbnail statis, judul, ringkasan maksimal dua hingga tiga baris, kategori, level, dan estimasi baca. Thumbnail tidak menjalankan iframe atau animasi masing-masing.

Gunakan satu kolom pada layar sempit, dua kolom pada tablet, dan maksimal tiga kolom pada desktop. Kartu memiliki satu tujuan navigasi yang jelas tanpa tautan bersarang.

Pencarian dan filter bekerja bersama. Tampilkan jumlah hasil, pilihan filter aktif, serta tindakan **Hapus filter**. Pertahankan kueri dan filter saat pengguna kembali dari halaman topik, idealnya melalui parameter URL.

Jika tidak ada hasil, ulangi kueri yang dicari dan tawarkan penghapusan filter atau penjelajahan semua topik. Hasil yang cocok melalui glosarium harus menjelaskan istilah yang cocok beserta topik tujuannya. Pencarian mengikuti bahasa aktif; pencarian sinonim lintas bahasa dapat dipertimbangkan setelah kebutuhan indeks diperiksa.

## 7. Halaman topik desktop

```text
┌──────────────────────────────────────────────────────────────────┐
│ Identitas       Topik       Cari             ID / EN     Tema   │
├──────────────────────────────────────────────────────────────────┤
│ Topik / Networking                                               │
│ Load Balancer                                                    │
│ Ringkasan · level · estimasi baca                                 │
│ Yang akan dipahami / Sebelum mulai                               │
├────────────────────────────┬─────────────────────────────────────┤
│ Daftar langkah ringkas     │ Figur sticky                        │
│                            │ Judul keadaan                       │
│ Langkah aktif              │                                     │
│ Apa yang terjadi           │ Mesin isometrik                     │
│ Mengapa berubah            │                                     │
│ Akibat yang perlu diamati  │ Readout relevan                     │
│                            │ Langkah 2 dari 5                    │
│ Langkah berikutnya         │ Sebelumnya  Berikutnya  Ulangi      │
├────────────────────────────┴─────────────────────────────────────┤
│ Ringkasan mekanisme dan topik terkait                             │
└──────────────────────────────────────────────────────────────────┘
```

- Lebar konten maksimal 1280 px dengan margin minimal 24–32 px pada desktop.
- Pembagian awal sekitar 45% bacaan dan 55% figur, disesuaikan dengan kepadatan ilustrasi.
- Figur sticky di bawah header dan berhenti sebelum ringkasan serta topik terkait.
- Hindari area scroll kedua di dalam teks. Scroll halaman menjadi navigasi utama.
- Daftar langkah dapat berupa daftar ringkas yang dapat dibuka, agar tidak menciptakan tiga kolom sempit.
- Judul figur menunjukkan keadaan yang sedang dilihat, bukan hanya mengulang judul topik.
- Ukuran panel figur tidak melompat saat label, readout, atau langkah berubah.

### Struktur isi satu langkah

Judul menyebut mekanisme atau peristiwa, misalnya **Server B berhenti merespons**. Paragraf awal menjelaskan kejadian, diikuti alasan dan akibat. Instruksi interaksi opsional harus spesifik, misalnya **Pilih Server B untuk melihat statusnya**.

Readout yang penting diberi konteks: **Server B menerima 0 permintaan per detik**, bukan angka tanpa penjelasan. Kesimpulan utama tetap tertulis dan tidak hanya disampaikan melalui nilai live.

## 8. Halaman topik ponsel

Usulan utama adalah figur ringkas yang tetap terlihat saat bagian langkah sedang dibaca. Pola ini harus diuji pada layar kecil sebelum diputuskan sebagai perilaku final.

```text
┌───────────────────────────┐
│ Identitas        Menu     │
│ Judul dan pengantar       │
├───────────────────────────┤
│ Figur ringkas             │
│ Keadaan aktif             │
│ Perbesar · Ringkas figur  │
├───────────────────────────┤
│ Langkah 2 dari 5           │
│ Judul langkah             │
│ Penjelasan                │
│                           │
│ Sebelumnya   Berikutnya   │
└───────────────────────────┘
```

- Pada awal topik, figur dapat tampil dengan rasio penuh. Saat membaca langkah, gunakan presentasi ringkas dengan tinggi maksimum sekitar 35% viewport.
- Mode ringkas harus dirancang sebagai tampilan yang tetap terbaca, bukan memotong figur secara acak. Jika bundle tidak mendukungnya, gunakan thumbnail keadaan dengan tombol membuka figur lengkap.
- Pada layar pendek, orientasi landscape, zoom tinggi, atau keyboard terbuka, nonaktifkan sticky jika menghalangi bacaan.
- Sediakan tindakan **Ringkas figur** dan **Tampilkan figur**. Pilihan ini berlaku selama kunjungan pada topik tersebut dan tidak dihitung sebagai progres belajar tersimpan.
- Kontrol langkah ditempatkan dalam alur halaman dan tidak menambah lapisan tetap yang menutupi isi.
- Mode layar penuh menampilkan figur, judul langkah, readout utama, kontrol langkah, serta tombol keluar yang selalu dapat dijangkau.
- Tidak ada interaksi penting yang hanya tersedia melalui hover atau gestur rumit. Zoom dan rotasi, bila didukung bundle, memiliki alternatif tombol.

## 9. Sinkronisasi bacaan dan figur

### Model keadaan

Halaman memiliki satu langkah bacaan aktif. Figur memiliki langkah yang ditampilkan dan mode **Ikuti penjelasan** atau **Eksplorasi bebas**. Pemisahan ini membuat keadaan saat figur diubah secara manual dapat dijelaskan dengan jujur.

| Pemicu | Perubahan bacaan | Perubahan figur |
| --- | --- | --- |
| Scroll dalam mode ikuti | Langkah aktif mengikuti posisi bacaan | Menampilkan state langkah aktif |
| Tombol sebelumnya atau berikutnya | Bergerak ke langkah tujuan dan menempatkan judul di area baca | Menampilkan state tujuan dan kembali ke mode ikuti |
| Memilih daftar langkah | Sama seperti navigasi tombol | Sama seperti navigasi tombol |
| Memilih komponen untuk informasi | Bacaan tidak berpindah otomatis | Komponen disorot dan detail ditampilkan |
| Mengubah simulasi secara manual | Bacaan tetap pada posisi semula | Beralih ke eksplorasi bebas |
| Scroll saat eksplorasi bebas | Langkah bacaan aktif tetap diperbarui | Keadaan eksplorasi dipertahankan |
| Memilih Kembali ke penjelasan | Bacaan tetap | Kembali ke state langkah bacaan aktif |
| Memilih Ulangi langkah | Bacaan tetap | Mereset dan mengulang state langkah aktif; kembali ke mode ikuti |

Di eksplorasi bebas, tampilkan pesan ringkas **Eksplorasi bebas** dan tombol **Kembali ke penjelasan**. Jangan menampilkan indikator seolah-olah figur masih tersinkron jika keadaannya sudah berbeda.

### Aturan scrollytelling

- Tentukan garis aktivasi di bagian atas area bacaan yang tidak tertutup header atau figur sticky.
- Langkah aktif adalah bagian terakhir yang judulnya melewati garis tersebut; sebelum itu gunakan langkah pertama.
- Tambahkan toleransi perpindahan agar langkah tidak berkedip saat pembaca berhenti di batas bagian.
- Selama navigasi tombol melakukan scroll, kunci tujuan sementara agar bagian yang dilewati tidak memicu animasi beruntun.
- Scroll manual yang menyela navigasi mengembalikan kontrol kepada pembaca.
- Pada langkah pertama, tombol sebelumnya tidak aktif; pada langkah terakhir, tindakan lanjutan menuju ringkasan diberi label **Baca ringkasan**.
- Jangan menggunakan scroll untuk memindahkan fokus keyboard atau mengumumkan seluruh isi langkah secara otomatis.

### Kebutuhan kontrak figur yang perlu diperjelas

Kontrak PRD sudah memiliki pesan langkah, bahasa, tema, readout, dan interaksi komponen. Untuk mendukung desain ini, perlu disepakati cara membedakan pemilihan komponen dari perubahan simulasi, cara mengulang state yang sama, dan cara menjeda animasi ketika figur tidak terlihat. Konfirmasi state yang sudah diterapkan juga perlu dipertimbangkan agar antarmuka tidak menyatakan sinkron sebelum figur siap.

Bagian ini adalah kebutuhan interaksi untuk dibahas pada Fase 0; belum menetapkan nama pesan atau perubahan API final.

## 10. Bahasa, tema, glosarium, dan readout

### Bahasa

- Gunakan label **ID** dan **EN** dengan nama bahasa yang jelas bagi pembaca layar; jangan menggunakan bendera.
- URL bahasa eksplisit menjadi acuan ketika halaman dibuka melalui tautan. Pada kunjungan tanpa bahasa eksplisit, gunakan preferensi tersimpan, lalu bahasa browser, lalu Indonesia sebagai fallback.
- Pergantian bahasa mempertahankan identitas langkah dan posisi relatif dalam bagian. Pertahankan komponen terpilih jika bundle mendukungnya.
- Pertahankan eksplorasi jika perubahan label dapat dilakukan tanpa reset. Jika reset diperlukan, beri pemberitahuan singkat dan kembalikan ke langkah bacaan aktif.
- Terjemahkan label UI, pesan kesalahan, pencarian, metadata, dan figur secara konsisten.

### Tema

Sediakan pilihan **Sistem**, **Terang**, dan **Gelap**, dengan preferensi tersimpan. Tema halaman dan figur berubah bersama tanpa memuat ulang topik. Kedalaman mesin, garis penghubung, serta teks kecil pada figur harus diperiksa pada kedua tema.

### Glosarium

- Istilah memakai garis bawah titik yang tidak tertukar dengan tautan navigasi.
- Hover atau fokus dapat menampilkan definisi ringkas; klik, Enter, atau tap membuka popover yang dapat dipertahankan untuk dibaca.
- Popover dapat ditutup dengan Escape, tombol tutup, atau klik di luar. Setelah ditutup, fokus kembali ke istilah pemicu.
- Tautan topik terkait ditempatkan hanya pada popover yang mendukung interaksi, bukan tooltip pasif.
- Definisi tidak keluar viewport dan tidak menutupi istilah tanpa jalan untuk menutupnya.

### Readout

Tampilkan hanya nilai yang membantu memahami langkah aktif. Gunakan label, nilai, dan satuan; angka memakai lebar stabil agar tata letak tidak bergeser. Batasi frekuensi pembaruan tampilan agar tetap terbaca. Jangan menjadikan semua perubahan readout sebagai pengumuman pembaca layar.

## 11. Keadaan sistem dan pemulihan

| Keadaan | Tampilan | Jalan keluar |
| --- | --- | --- |
| Figur dimuat | Thumbnail dengan ruang tetap dan teks Memuat figur | Bacaan dapat langsung digunakan |
| Figur siap | Kontrol dan keadaan aktif yang sesuai | Pembaca melanjutkan langkah |
| Figur terlalu lama merespons | Thumbnail dan pesan bahwa figur belum siap | Coba muat ulang figur |
| Figur gagal atau tidak didukung | Ilustrasi statis serta penjelasan lengkap | Coba lagi atau lanjut membaca |
| Readout belum tersedia | Label Nilai belum tersedia | Hindari angka nol yang terlihat seperti hasil simulasi |
| Topik tidak ditemukan | Pesan topik tidak tersedia | Cari topik atau lihat semua topik |
| API gagal | Pesan sesuai area yang gagal | Coba lagi tanpa menghapus kueri atau input |
| Daftar topik kosong | Penjelasan belum ada topik pada pilihan tersebut | Hapus filter |

Nilai timeout figur perlu ditentukan melalui pengujian Fase 0. Thumbnail umum hanya menjadi gambaran topik; jangan menyajikannya seolah-olah merupakan keadaan spesifik langkah apabila tidak sesuai.

## 12. Dashboard admin

### Struktur dan prioritas

Navigasi utama: Ringkasan, Topik, Kategori, Glosarium, dan Media. Ringkasan memprioritaskan pekerjaan yang membutuhkan tindakan: draft belum selesai, terjemahan belum lengkap, mapping figur bermasalah, dan upload terakhir. Jumlah total topik menjadi informasi pendukung.

Daftar topik menggunakan tabel pada desktop dengan judul, kategori, status terbit, kelengkapan ID/EN, dan waktu perubahan. Di layar sempit, tampilkan daftar ringkas dengan tindakan penting tetap terlihat.

### Alur membuat topik

1. Buat draft dengan judul, ringkasan, kategori, level, dan estimasi baca.
2. Upload figur dan periksa hasil validasi.
3. Tulis langkah serta pasangkan masing-masing dengan state figur.
4. Lengkapi terjemahan dan materi pendukung.
5. Preview kedua bahasa dan kedua tema.
6. Periksa kesiapan terbit, lalu terbitkan.

Urutan ini merupakan panduan, bukan wizard yang menghalangi admin berpindah bagian. Draft yang belum lengkap tetap boleh disimpan.

### Editor bilingual

- Desktop: dua panel ID dan EN yang sejajar, dengan mode fokus satu bahasa jika ruang tidak cukup.
- Layar sempit: tab ID dan EN dengan indikator kelengkapan masing-masing.
- Daftar langkah tetap dapat dijangkau; tiap langkah memuat judul, isi, dan dropdown state figur.
- Markdown dan preview merupakan dua mode yang jelas. Hindari menampilkan empat panel editor dan preview sekaligus.
- Sediakan tombol naik dan turun selain drag untuk mengurutkan langkah.
- Dropdown state menampilkan label yang dapat dipahami serta key teknis sebagai informasi sekunder.
- Indikator bahasa menampilkan pekerjaan tersisa, misalnya **EN: isi langkah 3 belum tersedia**, dengan tautan langsung ke field.

### Penyimpanan dan perubahan konten terbit

Usulan: simpan otomatis setelah jeda mengetik, ditambah tombol **Simpan sekarang**. Status yang terlihat adalah **Menyimpan**, **Tersimpan**, atau **Gagal menyimpan — Coba lagi**. Perubahan yang belum tersimpan memicu peringatan saat meninggalkan halaman.

PRD belum menjelaskan apakah mengedit topik published langsung mengubah halaman publik. Usulan desain adalah menyimpan perubahan sebagai draft dan menggunakan tindakan **Terbitkan perubahan** setelah preview. Ini membutuhkan revisi konten atau snapshot terbit di luar model data ringkas PRD dan harus disepakati sebelum pembangunan editor. Jangan menjanjikan perilaku ini hanya melalui tampilan.

### Upload dan versi figur

- Sebelum memilih file, tampilkan format ZIP dan batas ukuran 10 MB.
- Bedakan progres pengiriman, proses validasi, dan hasil akhir.
- Upload berhasil menambah versi; tidak otomatis mengganti versi publik.
- Hasil validasi menampilkan nama versi, ukuran, state, bahasa, serta masalah yang ditemukan.
- Mapping hilang menyebutkan langkah terdampak dan menyediakan jalan memperbaikinya.
- Aktivasi versi diblokir sampai mapping valid. Pemeriksaan yang sama berlaku saat rollback.
- Versi aktif diberi label jelas dan tidak dapat dihapus.
- Menghapus versi tidak aktif memerlukan konfirmasi yang menyebutkan versi tersebut.

### Preview dan penerbitan

Preview memakai tampilan pembaca yang sama, dengan indikator **Preview draft** di luar area konten. Sediakan pengalih bahasa, tema, dan ukuran viewport; simulasi ukuran layar tidak menggantikan uji perangkat nyata. Draft tidak dapat diakses melalui API publik biasa.

Checklist penerbitan memeriksa judul dan ringkasan ID/EN, semua langkah, figur aktif, mapping state, serta kelengkapan label dan bahasa figur sesuai kontrak. Pisahkan syarat wajib dari anjuran editorial, seperti meninjau terjemahan dan memeriksa tampilan ponsel.

Jika belum siap, tampilkan alasan di dekat tindakan penerbitan dan tautan perbaikannya. Setelah berhasil, tampilkan **Topik diterbitkan** dengan tindakan **Lihat topik**. Menarik topik dari publik membutuhkan konfirmasi singkat karena memengaruhi akses pembaca.

## 13. Aksesibilitas

Target mengikuti WCAG 2.1 AA dari PRD, dengan verifikasi manual dan otomatis sebelum rilis.

- Seluruh navigasi, langkah, glosarium, dialog, dan interaksi esensial figur dapat dioperasikan dengan keyboard.
- Target sentuh utama minimal 44 × 44 px sebagai standar desain produk; ikon di dalamnya boleh lebih kecil.
- Fokus terlihat dan tidak tertutup header, panel sticky, atau dialog.
- Sediakan tautan lewati navigasi dan lewati figur menuju penjelasan.
- Figur memiliki judul yang menjelaskan konteks; alternatif teks menerangkan mekanisme penting.
- Teks biasa memiliki kontras minimal 4,5:1; teks besar dan elemen antarmuka relevan mengikuti batas yang sesuai pada standar.
- Heading berurutan, label input eksplisit, dan kesalahan field terhubung ke input.
- Status tidak bergantung pada warna, posisi, atau gerakan saja.
- `prefers-reduced-motion` menonaktifkan perpindahan kamera dan gerak dekoratif; perubahan keadaan tetap terlihat tanpa animasi panjang.
- Sediakan kontrol jeda untuk animasi berulang yang memerlukan kontrol pengguna. Jeda gerak tidak boleh menghilangkan penjelasan keadaan.
- Halaman tetap dapat dibaca pada zoom 200% dan diuji reflow setara lebar 320 CSS px.
- Layar penuh dapat ditutup dengan keyboard dan mengembalikan fokus ke tombol pembukanya. Jika API fullscreen tidak tersedia, gunakan dialog yang mengisi viewport.

## 14. Responsivitas dan performa yang dirasakan

| Rentang awal | Perilaku desain |
| --- | --- |
| Di bawah 768 px | Satu kolom, navigasi ringkas, figur adaptif, editor satu bahasa |
| 768–1023 px | Grid dua kolom; halaman topik tetap satu kolom jika bacaan dan figur tidak cukup lebar |
| Mulai 1024 px | Halaman topik dua kolom dan figur sticky bila tinggi viewport mencukupi |

Breakpoint merupakan acuan awal, bukan alasan memaksakan dua kolom. Uji dari 360 hingga 1440 px sesuai PRD, ditambah reflow aksesibilitas.

- Cadangkan ruang figur menggunakan rasio manifest agar layout tidak bergeser.
- Pada halaman topik, mulai memuat figur segera karena berada pada area awal pengalaman; lazy loading digunakan untuk figur yang benar-benar di bawah layar.
- Beranda hanya memuat satu figur unggulan dan kartu menggunakan thumbnail statis.
- Bacaan, judul, dan navigasi tidak menunggu figur siap.
- Jeda rendering atau animasi figur di luar layar memerlukan dukungan kontrak yang disepakati.
- Muat dashboard terpisah agar editor tidak menambah beban halaman publik.
- Target LCP < 2,5 detik dan kesiapan figur < 1,5 detik berasal dari PRD, bukan hasil pengukuran. Definisikan titik awal pengukuran, perangkat, dan profil jaringan yang konsisten pada Fase 0.

## 15. Bahasa antarmuka

Gunakan kalimat singkat yang menjelaskan tindakan dan akibat. Pertahankan istilah teknis yang familiar, lalu berikan definisi bahasa Indonesia melalui penjelasan atau glosarium.

| Konteks | Contoh label atau pesan |
| --- | --- |
| Memulai penemuan | Jelajahi topik |
| Navigasi bacaan | Langkah berikutnya |
| Mengembalikan sinkronisasi | Kembali ke penjelasan |
| Mengulang state aktif | Ulangi langkah |
| Memperbesar figur | Buka layar penuh |
| Figur gagal | Figur belum dapat dimuat. Anda tetap bisa membaca penjelasannya. |
| Pencarian kosong | Tidak ada topik yang cocok dengan pencarian ini. |
| Terjemahan kurang | Lengkapi isi bahasa Inggris pada langkah 3 sebelum menerbitkan. |
| Simpan gagal | Perubahan belum tersimpan. Coba lagi. |
| Mapping tidak valid | Langkah 3 memakai state yang tidak tersedia pada versi ini. |

## 16. Kebutuhan konten dan data tambahan

| Usulan | Cara memenuhi | Dampak pada PRD |
| --- | --- | --- |
| Hasil belajar | Dua hingga tiga butir per topik, ID/EN | Field tambahan atau konvensi konten yang disepakati |
| Prasyarat | Penjelasan singkat dan relasi topik, ID/EN | Perlu struktur jika ingin dipakai untuk navigasi |
| Ringkasan akhir | Bagian penutup editorial | Bedakan dari langkah yang mengubah state figur |
| Tautan langkah stabil | Identitas atau anchor langkah yang tidak berubah saat reorder | Perlu kontrak URL langkah |
| Draft perubahan topik terbit | Revisi terpisah dari snapshot publik | Perlu perubahan penyimpanan dan alur penerbitan |
| Fallback visual per langkah | Aset opsional bila diperlukan | Tidak dijamin oleh thumbnail topik dalam bundle saat ini |
| Eksplorasi dan jeda figur | Kemampuan bridge yang terdefinisi | Perlu pembuktian pada Fase 0 |

Untuk MVP yang lebih sederhana, hasil belajar, prasyarat, dan ringkasan dapat memakai konvensi Markdown. Konvensinya harus konsisten dan tidak memaksa setiap bagian memiliki `figure_step` jika memang bukan langkah simulasi.

## 17. Validasi desain

### Prototipe pertama

Gunakan topik Load Balancer untuk menguji alur normal, server berhenti, perpindahan permintaan, dan pemulihan. Prototipe mencakup desktop, ponsel, eksplorasi bebas, pergantian bahasa, reduced motion, serta figur gagal dimuat.

Jangan memproduksi lima pola figur sekaligus sebelum hubungan teks dan figur pada satu topik terbukti dapat dipahami.

### Sesi uji pengguna yang diusulkan

Libatkan lima peserta pemula untuk putaran formatif awal. Jumlah ini digunakan untuk menemukan masalah awal, bukan membuktikan keberhasilan secara statistik. Admin juga menjalankan simulasi penerbitan dengan materi yang sudah siap.

| Tugas | Hal yang diamati | Kriteria awal yang diusulkan |
| --- | --- | --- |
| Menemukan topik dasar | Pemahaman pencarian dan filter | Sedikitnya 4 dari 5 peserta selesai tanpa arahan |
| Menjelaskan server yang berhenti | Hubungan figur, readout, dan teks | Sedikitnya 4 dari 5 menyebut perpindahan permintaan dengan alasan yang benar |
| Eksplorasi lalu kembali membaca | Penemuan kontrol pemulihan | Sedikitnya 4 dari 5 kembali ke state bacaan tanpa arahan |
| Mengganti bahasa di tengah topik | Kontinuitas konteks | Langkah aktif tetap sama dan pembaca memahami posisinya |
| Membaca di ponsel | Ruang baca dan kegunaan figur | Tidak ada konten tertutup atau tugas yang bergantung pada hover |
| Menerbitkan topik | Kelengkapan terjemahan dan mapping | Admin selesai < 30 menit setelah materi serta figur siap, sesuai target PRD |

Kriteria tersebut adalah usulan untuk evaluasi, belum merupakan hasil uji. Pencapaian pemahaman dinilai dengan pertanyaan singkat sebelum dan sesudah membaca, menggunakan rubrik mekanisme yang sama.

### Checklist sebelum desain diterapkan ke semua topik

- Pembaca dapat menemukan langkah aktif dan memahami keadaan figur.
- Scroll, tombol, dan eksplorasi tidak saling mengambil alih tanpa penjelasan.
- Ponsel tetap menyediakan ruang baca ketika figur ditampilkan.
- Bahasa dan tema berubah tanpa kehilangan konteks langkah.
- Keyboard, fokus, popover, reduced motion, dan fallback bekerja.
- Admin dapat memperbaiki field atau mapping langsung dari pesan validasi.
- Perilaku perubahan pada topik terbit telah ditentukan.
- Kemampuan bridge yang dibutuhkan desain terbukti pada figur nyata.

## 18. Urutan pekerjaan desain berikutnya

1. Tinjau keputusan mode eksplorasi, figur ponsel, dan draft perubahan konten terbit.
2. Buat wireframe halaman Load Balancer untuk desktop dan ponsel, termasuk keadaan gagal.
3. Buat prototipe sinkronisasi pada satu figur nyata sebagai bagian dari Fase 0.
4. Uji pemahaman dan navigasi; revisi pola interaksi berdasarkan temuan.
5. Tetapkan token visual dan komponen setelah kontras serta keterbacaan diperiksa.
6. Rancang editor admin, validasi upload, preview, dan penerbitan berdasarkan kontrak yang terbukti.
7. Terapkan pola yang telah lolos evaluasi ke beranda, daftar topik, dan topik berikutnya.

Dokumen ini menjadi dasar desain dan tidak menyatakan bahwa prototipe, pengujian aksesibilitas, pengukuran performa, atau riset pengguna telah dilakukan.
