import type { Lesson } from "../types";

/**
 * Web API lesson (Indonesian) for beginners. References: MDN Glossary "API"; Postman Learning Center
 * ("Send requests", "Postman Echo"); Bruno and Hoppscotch documentation. The figure is a local simulation
 * with its own small contract; it never contacts a server. Real practice happens in the reader's own tool.
 */

const ECHO_GET = "https://postman-echo.com/get?konser=Senja&jumlah=2";
const ECHO_ARGS = `{
  "args": {
    "konser": "Senja",
    "jumlah": "2"
  }
}`;
const CURL = `curl.exe "https://postman-echo.com/get?konser=Senja&jumlah=2"`;
const ECHO_POST = `{
  "konser": "Senja",
  "jumlah": 2
}`;

export const API_LESSON: Lesson = {
  category: "komunikasi",
  outcomes: [
    "Menjelaskan API dengan bahasa sendiri dan hubungan frontend, backend, serta database.",
    "Membedakan request dan response, serta mengenali method, endpoint, parameter, header, body, dan status code.",
    "Mengirim request sederhana dengan aplikasi pengujian API dan memeriksa apakah responsnya sesuai harapan.",
  ],
  steps: [
    {
      key: "satu-tombol",
      short: "Satu tombol",
      title: "Satu tombol, ada percakapan di belakangnya",
      kind: "Masalah",
      body: [
        "Andi membuka website konser dan menekan “Lihat konser”. Di layar ia hanya melihat tombol, tetapi informasinya belum ada di perangkatnya.",
        "{{frontend|Frontend}} (bagian aplikasi yang dilihat dan dipakai Andi) mengirim {{request|permintaan}} ke backend, lalu menunggu jawabannya.",
      ],
      analogy: "Andi mengisi formulir di papan layanan, lalu formulir itu dibawa ke loket. Andi sendiri tidak masuk ke ruang arsip.",
      observe: "Tombol tidak mengambil data sendiri. Sebuah kartu request berangkat di jalur atas, dan layar baru berubah setelah jawaban kembali di jalur bawah.",
      changes: ["Layar: belum dimuat → Konser Senja"],
      idea: "Di balik satu tombol, aplikasi mengirim permintaan dan menunggu jawaban.",
    },
    {
      key: "tujuan",
      short: "Tujuan",
      title: "Permintaan harus mempunyai tujuan",
      kind: "Proses",
      body: [
        "Permintaannya berbunyi GET /api/konser/101. GET adalah {{request|method}}: tindakan yang diminta, di sini membaca informasi.",
        "/api/konser/101 adalah {{endpoint|endpoint}}: alamat layanan untuk informasi konser 101. API (Application Programming Interface) adalah antarmuka dengan aturan yang disepakati agar satu perangkat lunak bisa meminta data atau tindakan dari perangkat lunak lain.",
      ],
      analogy: "Datang ke loket informasi, lalu menyebut konser yang ingin diketahui.",
      observe: "Kartu request menyorot GET. Kartu bergerak menuju pintu endpoint, bukan langsung ke database.",
      idea: "Method dan endpoint menentukan layanan yang dipanggil.",
      more: [
        "Materi ini membahas Web API yang diakses melalui HTTP. Tidak semua API bekerja melalui internet atau HTTP; sistem operasi dan pustaka program juga punya API.",
        "API bukan orang atau mesin tambahan yang harus berdiri terpisah. Pada contoh ini, endpoint API adalah bagian yang disediakan backend untuk menerima permintaan.",
      ],
    },
    {
      key: "backend-memproses",
      short: "Backend",
      title: "Backend memeriksa dan memproses permintaan",
      kind: "Proses",
      body: [
        "{{endpoint|Endpoint}} menerima permintaan. Backend {{check|memeriksa}} apakah permintaannya sesuai aturan, misalnya ID konser berupa angka.",
        "Setelah itu {{process|proses aplikasi}} mencari data konser 101 di {{db|database}}. Data dikembalikan kepada backend, bukan langsung ke browser.",
      ],
      analogy: "Petugas di balik loket memeriksa formulir, lalu rekannya membuka buku catatan untuk mencari datanya.",
      observe: "Lampu pemeriksaan menyala hijau, roda proses berputar, lalu kartu singgah di database dan kembali ke proses aplikasi lewat jalur bawah.",
      idea: "Browser tidak membuka database; backend yang mengaksesnya.",
      more: ["Backend tidak harus mengakses database untuk setiap request. Sebagian jawaban bisa dihitung langsung atau diambil dari cache."],
    },
    {
      key: "jawaban-data",
      short: "Jawaban",
      title: "Jawaban dikirim sebagai data",
      kind: "Proses",
      body: [
        "Backend mengirim {{response|response}} dengan status 200 OK, artinya permintaan berhasil. Isinya berupa JSON, format data berbentuk teks yang dipakai dalam contoh ini.",
        "{{frontend|Frontend}} membaca data itu, lalu menyusunnya menjadi kartu konser di layar Andi. API lain bisa memakai format lain.",
      ],
      analogy: "Petugas mengembalikan lembar jawaban. Papan layanan menyalin isinya ke kartu yang mudah dibaca Andi.",
      observe: "Cocokkan tanda ①②③: nama → judul konser, lokasi → lokasi pada kartu, harga → harga tiket.",
      idea: "Frontend mengubah data jawaban menjadi tampilan.",
    },
    {
      key: "tampilan-berbeda",
      short: "Web & HP",
      title: "API yang sama, tampilan berbeda",
      kind: "Analogi",
      body: [
        "Website dan aplikasi HP sama-sama memanggil GET /api/konser/101. Datanya sama, tetapi setiap {{frontend|frontend}} menyusunnya dengan caranya sendiri.",
        "Manfaatnya: backend bisa melayani beberapa jenis aplikasi, tim frontend dan backend punya aturan komunikasi yang jelas, dan klien tidak perlu diberi akses langsung ke database.",
      ],
      analogy: "Formulir di papan layanan dan formulir di HP diantar ke loket yang sama, lalu jawabannya disalin ke dua bentuk kartu.",
      observe: "Dua request dengan alamat yang sama berangkat ke satu endpoint. Kartu website lebar, sedangkan kartu HP ringkas dengan harga di tombol.",
      idea: "Satu API bisa dipakai banyak tampilan.",
      more: ["API tidak otomatis membuat aplikasi aman. Autentikasi, otorisasi, dan validasi tetap harus dirancang dan diperiksa di backend."],
    },
    {
      key: "buat-pesanan",
      short: "Buat pesanan",
      title: "Membaca informasi berbeda dengan membuat pesanan",
      kind: "Proses",
      body: [
        "Andi memilih dua tiket Reguler. Frontend mengirim POST /api/pesanan. Pada endpoint ini, POST meminta dibuatkan pesanan.",
        "{{request|Body}} berisi konser_id, kategori, dan jumlah. Header Content-Type: application/json memberi tahu format body. Identitas Andi diambil dari sesi login, dan harga dihitung backend dari data tepercaya, bukan dari angka yang dikirim frontend.",
      ],
      analogy: "Kali ini Andi menyerahkan formulir pemesanan. Petugas menghitung harga dari daftar resmi, bukan dari angka yang ditulis pembeli.",
      observe: "Saat proses berjalan muncul catatan “Pengguna: Andi (dari sesi login) · harga dari data konser”. Database menulis satu pesanan, dan layar menampilkan TKT-001 · Rp700.000.",
      changes: ["Pesanan tersimpan: 0 → 1", "Status: 201 Created"],
      idea: "GET membaca; POST di endpoint ini meminta pembuatan data baru.",
      more: ["Pesanan dibuat dengan status menunggu_pembayaran. Ini bukan implementasi pembayaran."],
    },
    {
      key: "periksa-dulu",
      short: "Validasi",
      title: "Backend memeriksa sebelum menerima",
      kind: "Percobaan",
      body: [
        "Bagaimana jika jumlahnya 0? {{check|Pemeriksaan}} menolaknya dengan 400 Bad Request dan pesan “Jumlah tiket minimal 1.”. Permintaan tidak sampai ke proses aplikasi dan data pesanan tidak berubah.",
        "Konser 999 lolos pemeriksaan format, tetapi tidak ditemukan di database, jadi jawabannya 404 Not Found. Pilihan status ini adalah kontrak demo; aplikasi lain bisa berbeda.",
      ],
      analogy: "Formulir yang tidak lengkap dikembalikan di loket. Buku catatan tidak disentuh.",
      observe: "Lampu pemeriksaan menyala merah dan kartu langsung kembali. “Pesanan tersimpan” tetap 1. Coba Jumlah 2 (201), Konser 999 (404), lalu Reset demo.",
      changes: ["400: tidak ada perubahan data", "201: pesanan baru", "404: hanya membaca"],
      idea: "Backend memeriksa setiap permintaan; error validasi tidak mengubah data.",
    },
    {
      key: "bagian-permintaan",
      short: "Bagian request",
      title: "Kenali bagian-bagian permintaan",
      kind: "Analogi",
      body: [
        "Klik setiap {{parts|bagian request}}: method, URL/endpoint, path parameter, query parameter, header, dan body.",
        "Tidak semua bagian wajib ada di setiap request. GET /api/konser/101 tidak membawa body, sedangkan POST /api/pesanan membawa header Content-Type dan body.",
      ],
      observe: "Bagian yang dipilih disorot di kartu request. Contohnya ikut berganti: ?kota=Jakarta untuk query parameter, POST untuk header dan body.",
      idea: "Setiap bagian request punya tugas sendiri, dan tidak semuanya selalu dipakai.",
      more: [
        "PUT: membuat atau mengganti representasi pada target, sesuai kontrak layanan.",
        "PATCH: menerapkan perubahan sebagian.",
        "DELETE: meminta penghapusan resource sesuai aturan layanan.",
        "Tidak semua Web API disebut REST. REST adalah satu gaya perancangan, bukan syarat setiap API.",
      ],
    },
    {
      key: "coba-kirim",
      short: "Coba kirim",
      title: "Coba mengirim request sendiri",
      kind: "Percobaan",
      body: [
        "Di kiri ada {{client|mini API client}}: pilih method dan endpoint, atur ID konser, jumlah, dan header, lalu tekan Kirim.",
        "Alat seperti ini mengirim request langsung tanpa memakai tampilan website. Kartu yang bergerak di diagram selalu sama dengan request di panel, begitu juga status dan JSON yang kembali.",
      ],
      analogy: "Seperti menyerahkan formulir langsung ke loket tanpa memakai papan layanan.",
      observe: "Coba keempat preset. Lalu coba GET ke /api/pesanan (405) atau matikan Content-Type pada POST (415). “Waktu simulasi” hanya hitungan demo, bukan pengukuran.",
      idea: "API client membantu mencoba endpoint tanpa membangun tampilan.",
      more: ["Simulasi ini lokal di halaman. Endpoint /api/... di sini tidak bisa dihubungi dari Postman."],
    },
    {
      key: "periksa-respons",
      short: "Periksa respons",
      title: "Periksa respons, jangan hanya menekan Send",
      kind: "Percobaan",
      body: [
        "Testing berarti membandingkan {{response|respons}} dengan kontrak: apakah statusnya tepat, field yang dibutuhkan ada, nilai dan tipe datanya benar, input tidak valid ditangani, dan respons sesuai permintaan.",
        "Mendapat status 200 belum membuktikan seluruh perilaku API sudah benar.",
      ],
      observe: "Daftar periksa terisi dari respons POST jumlah 2. Poin “Input tidak valid” baru tercentang setelah kamu mengirim preset POST jumlah 0 dan mendapat 400.",
      idea: "API yang diuji dengan baik memeriksa isi jawaban, bukan hanya statusnya.",
    },
    {
      key: "api-sungguhan",
      short: "API sungguhan",
      title: "Coba API sungguhan dengan Postman Echo",
      kind: "Percobaan",
      body: [
        "Sekarang coba di alatmu sendiri. Postman, Bruno, dan Hoppscotch adalah aplikasi untuk mengirim request dan memeriksa response, sedangkan curl dipakai dari terminal.",
        "Postman Echo mengembalikan informasi permintaan yang kita kirim. Ini bukan layanan tiket dan tidak membuat pesanan.",
      ],
      observe: "Diagram ini ilustrasi: pemeriksaan dan proses hanya mengembalikan isi permintaan, dan tidak ada database. Ikuti langkah A–C di bawah.",
      idea: "Alat pengujian API mengirim request sungguhan; periksa hasilnya dengan teliti.",
      practice: [
        {
          id: "A",
          title: "GET dengan Postman",
          explain: ["Buka request baru, pilih GET, tempel URL ini, lalu tekan Send. Periksa status, lalu cari objek args pada JSON."],
          code: ECHO_GET,
          pieces: [
            { code: "postman-echo.com", text: "layanan latihan milik Postman." },
            { code: "/get", text: "endpoint yang menerima GET." },
            { code: "?konser=Senja&jumlah=2", text: "query parameter yang akan dikembalikan." },
          ],
          expect: 'Status 200 OK. Di dalam JSON ada objek args berisi query parameter yang kamu kirim. Nilainya dikembalikan sebagai teks, jadi 2 ditulis "2".',
          sample: { label: "Potongan respons — ilustrasi, bukan keseluruhan", code: ECHO_ARGS },
          note: "Bruno dan Hoppscotch bekerja dengan cara serupa: pilih method, isi URL, lalu kirim. Jika latihan di browser terhalang CORS, jangan menonaktifkan keamanan browser; pakai aplikasi desktop.",
        },
        {
          id: "B",
          title: "Lewat terminal (Windows CMD)",
          code: CURL,
          note: "URL diberi tanda kutip agar karakter & tidak dianggap pemisah perintah.",
        },
        {
          id: "C",
          title: "POST (opsional)",
          explain: ["URL: https://postman-echo.com/post · Method: POST · Body: raw JSON · Content-Type: application/json."],
          code: ECHO_POST,
          expect: "Data JSON yang kamu kirim muncul kembali di respons. Data ini tidak disimpan sebagai pesanan sungguhan.",
          note: "Jangan mengirim data pribadi, password, atau token sungguhan ke layanan latihan.",
        },
      ],
    },
  ],
  analogy: {
    title: "Loket pelayanan konser",
    mapping: [
      ["Andi", "Pengguna"],
      ["Papan layanan dan formulir", "Layar website (frontend)"],
      ["Aturan layanan dan format formulir", "Kontrak API"],
      ["Alamat loket layanan tertentu", "Endpoint"],
      ["Formulir yang dikirim", "Request"],
      ["Petugas dan proses di balik loket", "Backend"],
      ["Buku catatan", "Database"],
      ["Jawaban atau bukti pesanan", "Response"],
      ["Mengirim formulir langsung ke loket", "Postman / Bruno / Hoppscotch"],
    ],
    limits: [
      "Loket digambar seperti tempat terpisah. Di aplikasi sungguhan, endpoint adalah bagian dari backend, bukan bangunan sendiri.",
      "Petugas bisa memaklumi formulir yang kurang rapi; backend hanya menerima yang sesuai kontrak.",
    ],
  },
  summary: [
    "API menyediakan aturan agar aplikasi bisa meminta data atau tindakan.",
    "Request membawa permintaan, backend memprosesnya, dan response membawa jawaban.",
    "Method, endpoint, parameter, header, dan body menyusun request; status code dan body menyusun response.",
    "Menguji API berarti memeriksa isi jawaban terhadap kontrak, bukan sekadar berhasil menekan Send.",
  ],
  check: {
    question: "Jika aplikasi menerima data konser sebagai JSON, siapa yang mengubahnya menjadi kartu konser di layar?",
    answer: "Frontend.",
  },
  simplifications: [
    "Semua request di diagram adalah simulasi lokal; tidak ada server, database, atau pembayaran sungguhan.",
    "Kontrak status (201, 400, 404, 405, 415) adalah pilihan demo ini; API lain bisa memilih berbeda.",
    "Autentikasi digambarkan sebagai sesi login yang sudah ada; cara login tidak dibahas. API key bukan syarat semua API, dan rahasia server tidak boleh ditanam di frontend.",
  ],
};
