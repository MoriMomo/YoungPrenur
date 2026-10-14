# MDIP — Product Requirements Document (PRD)

> **Nama Produk:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Judul Riset / Hibah:** *Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek*  
> **Peneliti Utama / Pemilik:** Dr. Ir. Indrajani, S.Kom., M.M. (D1521, BINUS RTT)  
> **Mitra Industri & Validasi:** PT Imajinasi Karya Bangsa (IMAJIN) — Sistem Manufaktur Hub IRoom  
> **Versi Dokumen:** v3.0 (Direvisi total berbasis acuan Prototype Interaktif Mentor `mentor_copilot.html`)  
> **Tanggal Pembaruan:** 13 Oktober 2026  
>
> **Legenda Sumber Data:**  
> - `[DOC]` = Dokumen Feasibility, BMC, Business Plan, & Riset Hibah BINUS RTT  
> - `[PROTO]` = Implementasi Aktual Prototype HTML Mentor (`mentor_copilot.html`)  
> - `[BRIEF]` = Product Brief & Studi Kelayakan Bisnis AI Manufacturing Copilot  
> - `[INFER]` = Inferensi rekayasa produk standar industri  
>
> **Pernyataan Integritas Data:** Seluruh angka KPI, tren probabilitas, prediksi keterlambatan, dan rekomendasi yang tampil pada prototype saat ini berstatus **data simulasi (mockup)**. Prototype belum terhubung langsung secara real-time ke sistem ERP/MES/CMMS produksi atau inferensi model AI live `[PROTO]`.

---

## 1. Visi, Ringkasan Eksekutif, & Posisi Produk

### 1.1 Visi Produk
MDIP mengubah data manufaktur berbasis proyek yang tersebar dan tidak terstruktur (file Excel beragam format, dokumen PDF rancangan teknik, catatan harian, dan sistem parsial) menjadi sistem pendukung keputusan yang **prediktif, dapat dijelaskan (*explainable*), dan dapat diverifikasi (*verifiable*)** `[DOC]`. Tujuannya adalah mengidentifikasi potensi keterlambatan lebih awal serta mengganti keputusan operasional berbasis asumsi manual menjadi keputusan berbasis analitik data terintegrasi.

Platform ini mengintegrasikan dua pilar inteligensi utama:
1. **AI Project Scheduler** `[DOC]`: Ekstraksi jadwal otomatis, standardisasi WBS, estimasi durasi pekerjaan, deteksi deviasi jadwal, dan prediksi risiko keterlambatan (*delay-risk ML*).
2. **AI Manufacturing Copilot** `[PROTO]` + `[BRIEF]`: Kokpit operasional berbasis peran (*role-based*) yang menyajikan analitik lintas modul, pemantauan risiko & peluang proaktif, ringkasan keputusan AI (*AI Decision Brief*), serta asisten tanya-jawab terkurasi RAG (*Knowledge Base & SOP*).

### 1.2 Definisi Produk & Batasan Posisi Pasar `[BRIEF]`
> **Pernyataan Misi Copilot:** Mentransformasi aliran data operasional manufaktur (khususnya dari ekosistem **IRoom System**) menjadi wawasan cerdas dan rekomendasi tindakan terprioritas demi akselerasi pengambilan keputusan di lantai pabrik.

* **Target Pengguna Produk:**
  * **SaaS Eksternal**: Pabrik manufaktur skala menengah hingga grup multi-pabrik.
  * **Internal Operasional**: Manajemen proyek dan operasional PT Imajinasi Karya Bangsa (IMAJIN/IRoom).
* **Posisi Pasar Tegas (*Product Positioning*):** MDIP diposisikan murni sebagai **AI Decision-Support Layer** (lapisan pendukung keputusan cerdas) — **bukan chatbot percakapan umum** dan **bukan pengganti sistem ERP/MES/CMMS**. MDIP bertindak sebagai lapisan orkestrasi dan intelegensi yang mengekstraksi dan menyintesis data dari sistem-sistem pencatat (*systems of record*) yang sudah ada.

### 1.3 Tujuan Strategis (Goals) `[BRIEF]`
1. **Deliver Role-Based Operational Insights:** Memberikan visibilitas metrik dan anomali yang relevan dengan tanggung jawab jabatan masing-masing pemangku kepentingan.
2. **Accelerate Operational Decision-Making:** Memangkas waktu respons terhadap anomali dari hitungan hari menjadi hitungan menit melalui peringatan dini berperingkat prioritas.
3. **Improve Operational Efficiency:** Mengurangi pemborosan kapasitas (*idle time*), mencegah kehabisan material (*stockout*), dan menekan risiko denda penalti akibat keterlambatan proyek.

---

## 2. Problem Statement & Pemetaan Nilai Bisnis

### 2.1 Masalah Inti Manufaktur Berbasis Proyek `[DOC]`
Pada industri manufaktur berbasis pesanan (*make-to-order*) dan proyek rekayasa (fabrikasi logam, permesinan presisi, kontraktor EPC), tim manajerial tidak mampu mendeteksi kapan dan mengapa sebuah proyek mengalami deviasi hingga penundaan fisik telah terjadi. Akar penyebabnya:
* Format data jadwal dan progres terfragmentasi di puluhan sheet Excel dengan format tidak baku.
* Penilaian risiko keterlambatan hanya mengandalkan intuisi manajer proyek tanpa dasar analisis historis.
* Informasi tersekat (*data silos*) antar departemen (desain teknik, pengadaan material, permesinan, dan penjaminan mutu).
* Konsekuensi nyata: Pengiriman molor (*late delivery*), pembengkakan biaya lembur darurat (*cost overruns*), dan penalti kontrak yang menggerus margin laba.

### 2.2 Poin Fokus Masalah & Kebutuhan Solusi `[BRIEF]` + `[PROTO]`

| # | Poin Fokus Masalah | Deskripsi Hambatan Lapangan | Target Hasil yang Diharapkan |
|---|---|---|---|
| 1 | **Limited Role-Based Insights** | Informasi operasional tercampur; manajer pabrik kebanjiran data teknis mentah, sementara supervisor lini kekurangan konteks pesanan kritis. | Dasbor operasional terpersonalisasi sesuai peran kerja dan wewenang. |
| 2 | **Manual Cross-Module Analysis** | Analisis korelasi antara keterlambatan vendor material, beban kerja mesin, dan gambar kerja harus dikompilasi manual via rapat koordinasi panjang. | Dasbor analitik terpadu lintas modul secara real-time. |
| 3 | **Slow Operational Decision-Making** | Ketiadaan sintesis otomatis membuat isu operasional dibiarkan berlarut-larut hingga lini terhenti. | Ringkasan keputusan berbasis AI (*AI Decision Brief*) berdasar urgensi & dampak finansial. |
| 4 | **No Intelligent Decision Support** | Tidak tersedianya asisten analitik yang dapat langsung ditanyai konteks status proyek, akar masalah mesin, dan SOP penanganan. | Asisten interaktif *Manufacturing AI Copilot* yang berdasar pada basis data operasional. |
| 5 | **Delayed Risk & Opportunity Detection** | Sinyal awal kerusakan mesin (misal anomali vibrasi) atau kekurangan stok komponen baru disadari setelah terjadi downtime. | Monitor risiko dan peluang proaktif (*Risk & Opportunity Monitor*). |
| 6 | **Scattered Technical SOP & Knowledge** | Dokumen manual mesin dan SOP perawatan tersebar dalam binder fisik atau file terisolasi, menimbulkan ketergantungan ekstrem pada teknisi senior. | Integrasi basis pengetahuan RAG untuk pencarian SOP dan panduan penanganan instan. |

### 2.3 Validasi Nilai Komersial yang Harus Dibuktikan (*Proof of Value*) `[BRIEF]`

| Kebutuhan Industri Nyata | Nilai Bisnis yang Harus Dibuktikan dalam Pilot |
|---|---|
| **SOP sulit ditemukan & tercecer** | Pengurangan waktu pencarian dokumen dan pemecahan masalah mesin (*troubleshooting*) hingga >50%. |
| **Analisis lintas modul manual** | Pengurangan waktu penyusunan laporan status harian/mingguan dari 3-4 jam menjadi beberapa menit. |
| **Informasi berbeda antar jabatan** | Setiap level pengguna menerima data yang relevan dengan batasan hak akses yang terjaga (*governance*). |
| **Risiko operasional terlambat diketahui** | Waktu tanggap (*mean time to respond*) terhadap indikasi anomali dipercepat sebelum berdampak pada pengiriman. |
| **Ketergantungan pada personil ahli** | Mengurangi eskalasi pertanyaan operasional mendasar kepada kepala teknisi melalui panduan AI berbasis dokumen resmi. |

---

## 3. Profil Pengguna Sasaran (Target Personas)

Sesuai rancangan pada prototype mentor `[PROTO]` dan dokumen riset `[DOC]`, sistem dirancang untuk melayani peran-peran berikut:

```
                  ┌─────────────────────────────────────────────────┐
                  │           PLANT / OPERATIONS MANAGER            │
                  │   OEE · Pencapaian Produksi · Risiko Order      │
                  └───────────────┬─────────────────┬───────────────┘
                                  │                 │
         ┌────────────────────────┴──────┐   ┌──────┴─────────────────────────┐
         │ PRODUCTION SUPERVISOR / LEADS │   │  QUALITY / SUPPLY CHAIN LEADS  │
         │  Kendala Lini · Utilisasi     │   │   Hasil Yield · Stok Kritis    │
         │   Downtime · Jadwal Shift     │   │    Keterlambatan Pemasok       │
         └───────────────────────────────┘   └────────────────────────────────┘
                                  │
                  ┌───────────────┴─────────────────┐
                  │    PMO / PROJECT PLANNER [DOC]  │
                  │ Ekstraksi WBS · Jalur Kritis    │
                  │  Prediksi Keterlambatan (ML)    │
                  └─────────────────────────────────┘
```

1. **Plant Manager / Operations Manager** `[PROTO]`
   * **Tugas:** Bertanggung jawab atas efisiensi keseluruhan pabrik dan ketepatan pemenuhan kontrak pelanggan.
   * **Kebutuhan Informasi:** Metrik OEE agregat, ketercapaian target produksi pabrik (*plan attainment*), daftar pesanan berisiko (*at-risk orders*), dan arahan prioritas lintas divisi.
2. **Production Supervisor / Maintenance Lead** `[PROTO]`
   * **Tugas:** Menjaga kelancaran lini perakitan/mesin, alokasi operator, dan kelaikan peralatan.
   * **Kebutuhan Informasi:** Status utilisasi tiap lini/mesin, deteksi hambatan (*bottleneck*), sinyal anomali getaran/suhu mesin, jadwal perawatan preventif, dan ketersediaan teknisi.
3. **Quality Manager / Supply Chain Lead** `[PROTO]`
   * **Tugas:** Menjamin standar mutu produk akhir, ketersediaan bahan baku, dan kepatuhan jadwal vendor.
   * **Kebutuhan Informasi:** Persentase kualitas (*quality yield*), kode cacat berulang, estimasi sisa waktu material (*stock cover hours*), dan vendor dengan tren keterlambatan pengiriman.
4. **PMO / Project Manager / Project Planner** `[DOC]`
   * **Tugas:** Pengendalian jadwal proyek manufaktur, alokasi durasi aktivitas, dan negosiasi batas waktu.
   * **Kebutuhan Informasi:** Ekstraksi dokumen jadwal, identifikasi jalur kritis (*critical path*), skor probabilitas keterlambatan berbasis ML, dan simulasi penjadwalan ulang (*rescheduling*).

---

## 4. Spesifikasi Fitur Produk

### 4.1 Pemetaan Fitur Produk Utama (F1 – F9)

| ID | Nama Fitur | Modul Terkait | Deskripsi Fungsional & Acuan |
|---|---|---|---|
| **F1** | **Role-Based Operational Dashboard** | Copilot UI | Menampilkan konteks dasbor yang beradaptasi secara spesifik berdasarkan profil login peran (Operations, Plant, Production, Maintenance, Quality, Supply Chain). `[PROTO]` |
| **F2** | **Cross-Module Analytics & Status Table** | Copilot Analytics | Mengagregasi status operasional lini (utilisasi, output terencana vs aktual, status peringatan) dari modul produksi, mutu, dan mesin dalam satu tampilan ringkas. `[PROTO]` |
| **F3** | **AI Decision Brief** | Copilot Intelligence | Kartu rekomendasi tindakan taktis yang diprioritaskan otomatis berdasarkan urgensi (Urgent, High, Medium), estimasi dampak (misal: *recover 120 units*), dan skor keyakinan (*confidence score*). `[PROTO]` |
| **F4** | **Manufacturing AI Chat (Copilot Assistant)** | RAG & Copilot API | Panel percakapan interaktif untuk menjawab status operasional terkini serta melayani penelusuran dokumen SOP, penanganan kendala teknis mesin, dan panduan perbaikan berbasis dokumen. `[PROTO]` `[BRIEF]` |
| **F5** | **Risk & Opportunity Monitor** | Predictive Engine | Widget deteksi dini sinyal bahaya (misal: keterlambatan pemasok, anomali vibrasi) serta peluang pemulihan kapasitas (*capacity recovery*) yang siap dieksekusi. `[PROTO]` |
| **F6** | **Operational Summary Export** | Reporting Utility | Fasilitas ekspor cepat ringkasan KPI dan arahan tindakan harian ke format dokumen teks/laporan tervalidasi yang siap dibagikan dalam rapat koordinasi. `[PROTO]` |
| **F7** | **Human-in-the-Loop Review Flagging** | Governance / Safety | Mekanisme verifikasi manusia di mana setiap rekomendasi AI dapat ditandai (*Flag for Human Review*) untuk disetujui supervisor sebelum dieksekusi ke lantai pabrik. `[PROTO]` `[DOC]` |
| **F8** | **Schedule Extraction & Normalization** | AI Scheduler | Ekstraksi otomatis data tabel jadwal WBS dari format Excel (.xlsx), PDF rancangan, atau template perusahaan menjadi skema data terstandardisasi. `[DOC]` |
| **F9** | **Delay-Risk Machine Learning Engine** | Predictive Engine | Model prediktif yang menghitung probabilitas keterlambatan per aktivitas/proyek dan menyarankan alokasi durasi realistis berdasarkan data historis. `[DOC]` |

### 4.2 Integrasi Modul Ekosistem IRoom System `[BRIEF]`
Fitur Copilot dirancang untuk menyerap dan mengkorelasikan data dari 5 modul inti sistem manufaktur IRoom:
1. **Material Delivery Management:** Jadwal kedatangan bahan baku, status pengiriman pemasok, dan risiko penundaan material.
2. **Project Progress Tracking:** Milestone pekerjaan fisik, persentase penyelesaian proyek, dan pelacakan deviasi waktu.
3. **Drawing Approval:** Alur persetujuan gambar teknik produksi, revisi desain teknik, dan riwayat otorisasi engineering.
4. **Quotation & PO:** Nilai kontrak kerja, pesanan pembelian (*Purchase Order*), batas waktu pengiriman, dan klausa penalti keterlambatan.
5. **Operation Tracker:** Pelacakan stasiun kerja aktual, alokasi jam kerja mesin (*machine running hours*), dan pencatatan output riil per shift.

---

## 5. Ruang Lingkup & Batasan Implementasi (Scope & Honesty Rules)

### 5.1 Tahapan Pengembangan
* **Fase 1: Prototype Interaktif (Tercapai saat ini - `mentor_copilot.html`)**
  * Dasbor web interaktif berbasis browser tunggal (Chrome/Edge), bebas instalasi server lokal.
  * Demonstrasi fitur F1 hingga F7 dengan visualisasi SVG dinamis, dialog modal, dan manipulasi DOM client-side.
  * Logika tanya-jawab asisten berbasis pencocokan kata kunci (*keyword-based retrieval*) dan data sampel terstruktur.
* **Fase 2: Pilot MVP Terhubung (Fase Berikutnya)**
  * Menghubungkan Copilot API dengan basis data modul IRoom System (PostgreSQL / REST API).
  * Mengintegrasikan dokumen SOP/manual pabrik nyata menggunakan pipeline RAG embedding semantik + sitasi sumber dokumen.
  * Menyertakan engine aturan probabilitas risiko keterlambatan (*rule-based delay risk engine*) dengan opsi pelatihan model ML saat data historis mencukupi.
* **Fase 3: Produksi Skala Penuh (Enterprise Production)**
  * Integrasi dua arah dengan konektor ERP/MES/CMMS pihak ketiga melalui antarmuka abstraksi.
  * Multi-tenansi penuh dengan pemisahan data per pabrik (*plant-level data isolation*).

### 5.2 Batasan Kejujuran Data (*Mandatory Honesty Constraints*) `[PROTO]` + `[BRIEF]`
1. **Label Simulasi Eksplisit:** Seluruh angka OEE (82.4%), Plan Attainment (94.8%), Yield (97.1%), angka downtime, dan nama komponen (M-204) pada prototype adalah **data simulasi**. Label peringatan ini wajib tertera pada antarmuka dan berkas ekspor.
2. **Ketiadaan Klaim Integrasi Palsu:** Antarmuka dilarang mengeklaim koneksi real-time ke sistem ERP/MES/CMMS sebelum konektor fungsional selesai dibangun dan teruji.
3. **Klaim Penghematan Biaya:** Klaim kuantitatif efisiensi biaya pabrik, otomatisasi penuh, atau reduksi downtime **tidak boleh dijual sebagai fakta terbukti** sebelum divalidasi melalui proyek percontohan (*pilot study*) terukur.

---

## 6. Studi Kelayakan Bisnis & Rencana Go-to-Market `[BRIEF]`

### 6.1 Evaluasi Kelayakan Komersial Awal
Produk dinilai **layak diuji secara komersial (*commercially testable*)**, namun kelayakan model bisnisnya belum terbukti secara empiris. Peluang terbesar tercapai apabila produk mempertahankan posisinya sebagai **lapisan pendukung keputusan cerdas**, bukan sebagai penyedia ERP pengganti.

Tiga pertanyaan komersial kritis:
1. *Apakah industri benar-benar membutuhkan produk ini?* — Terbukti ada kebutuhan nyata efisiensi di lapangan.
2. *Apakah mereka bersedia membayar lisensi/implementasi?* — Harus dibuktikan melalui pilot berbayar pada sektor sasaran.
3. *Apakah pendapatan dapat menutup biaya infrastruktur AI dan penyesuaian integrasi?* — Memerlukan struktur harga yang membatasi biaya token API dan kustomisasi konektor.

### 6.2 Validasi Kategori Pasar Industri
Kategori pasar *Industrial AI Assistant* telah divalidasi oleh pemain global:
* **Siemens Industrial Copilot** (diperluas Mei 2025 dengan AI agents untuk otomasi industri).
* **Augury Machine Health AI** yang menghubungkan telemetri mesin dengan analisis lintas peran kerja.
Hal ini membuktikan bahwa kategori pasar telah terbentuk, meskipun permintaan spesifik untuk pasar Indonesia perlu dibentuk dan diedukasi secara langsung.

### 6.3 Segmentasi Pasar Sasaran

| Segmen Pasar | Karakteristik Perusahaan | Peluang Nilai Tambah Produk | Faktor Penentu Pembelian (*Buying Factor*) |
|---|---|---|---|
| **Segmen 1: Manufaktur Menengah** | Pengelolaan produksi masih berbasis Excel, laporan fisik harian, sistem parsial, ERP belum terpadu penuh. | Mengurangi waktu pencarian informasi, mempercepat penyusunan laporan, dan mencegah salah koordinasi. | Kemudahan adopsi, harga terjangkau, tidak memerlukan perombakan sistem yang ada. |
| **Segmen 2: Manufaktur Matang (Sudah Menggunakan ERP/MES)** | Memiliki ERP/MES mapan, namun data antar departemen sulit dicari dan dipahami secara holistik. | Bertindak sebagai lapisan pencarian cerdas (*unified search*) dan penjelasan naratif lintas modul. | Keamanan data, tata kelola hak akses (*RBAC*), dan kemudahan integrasi API. |
| **Segmen 3: Grup Industri Multi-Pabrik** | Memiliki beberapa lokasi pabrik fisik di wilayah terpisah. | Standardisasi SOP lintas pabrik, knowledge base terpusat, komparasi kinerja antarcabang. | Skalabilitas multi-lokasi, enkripsi enterprise, SLA keandalan sistem. |

### 6.4 Analisis Sinyal Pasar Domestik (Kemenperin & BPS)
* Data **Badan Pusat Statistik (BPS)** mengenai industri manufaktur besar dan sedang di Indonesia menyediakan direktori target prospek berdasarkan subsektor (logam, mesin, otomotif, plastik).
* **Peringatan Kementerian Perindustrian (September 2025):** Sebagian besar subsektor manufaktur domestik masih memandang transformasi digital sebagai beban biaya (*cost center*), bukan investasi produktif.
* **Strategi Edukasi:** Penjualan harus menekankan **ROI langsung** yang terukur (misal: penyelamatan 1 pesanan bernilai ratusan juta dari penalti keterlambatan sudah menutup biaya langganan software tahunan).

---

## 7. Metrik Keberhasilan (Success Metrics)

1. **Metrik Teknis AI & Retrieval `[DOC]`:**
   * Akurasi ekstraksi jadwal dari berkas tidak terstruktur: $F_1 \ge 0.85$.
   * Kualitas perolehan dokumen RAG (*Retrieval Quality / Hit Rate*): $\ge 90\%$.
   * Keandalan jawaban tanpa halusinasi (*RAG Faithfulness / Groundedness*): $\ge 95\%$.
2. **Metrik Efisiensi Operasional Bisnis `[BRIEF]`:**
   * Penurunan waktu pencarian dokumen teknis/SOP mesin: $\ge 60\%$.
   * Pengurangan waktu kompilasi laporan operasional harian: $\ge 70\%$.
   * Kecepatan waktu tanggap terhadap anomali lini/bahan baku: dari $\ge 24$ jam menjadi $< 2$ jam.
3. **Metrik Komersial & Pilot:**
   * Tingkat konversi proyek percontohan (*pilot-to-paid conversion rate*): target $\ge 30\%$.
   * Kepuasan pengguna (*User Acceptance Score*): $\ge 80\%$.

---

## 8. Manajemen Risiko & Strategi Mitigasi

| Kategori Risiko | Deskripsi Risiko | Tingkat Dampak | Strategi Mitigasi Produk |
|---|---|---|---|
| **Halusinasi AI** | AI memberikan saran perawatan mesin atau angka stok yang keliru dan membahayakan lini. | **Tinggi (Kritis)** | Membatasi jawaban percakapan hanya berdasar data hasil *retrieval* tervalidasi, menyertakan nomor dokumen/sitasi sumber, dan mewajibkan otorisasi manusia (*F7 Human Review*). |
| **Kerahasiaan Data** | Pelanggan khawatir data desain teknik, gambar kerja, atau harga PO bocor ke publik. | **Tinggi (Kritis)** | Menerapkan prinsip isolasi penyewa (*tenant isolation*), masking data sensitif, opsi *on-premise deployment*, dan larangan penggunaan data klien untuk pelatihan model publik. |
| **Kesiapan Data Historis** | Ketiadaan data keterlambatan historis berlabel untuk melatih model ML prediksi risiko delay. | **Sedang** | Menyediakan *Rule-based Risk Engine* transparan sebagai fallback awal sebelum model ML dilatih bertahap menggunakan data sintetis terverifikasi. |
| **Resistensi Adopsi** | Operator atau supervisor enggan menggunakan sistem karena merasa terancam atau rumit. | **Sedang** | Merancang UI seringkas mungkin (meniru antarmuka dasbor mentor yang intuitif), navigasi minim klik, dan fungsi asisten tanya jawab yang ramah operator. |
