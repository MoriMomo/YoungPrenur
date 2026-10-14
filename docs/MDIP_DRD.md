# MDIP — Design Requirements Document (DRD)

> **Nama Produk:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Dokumen Pendamping:** `MDIP_PRD.md` (v3.0) & `MDIP_TRD.md` (v3.0)  
> **Acuan Desain Utama:** Prototype Interaktif Mentor (`mentor_copilot.html`)  
> **Status Dokumen:** v3.0 — Spesifikasi Lengkap UI/UX, Komponen Visual, & Interaksi Berbasis Peran  
> **Tanggal Pembaruan:** 13 Oktober 2026  
>
> **Pernyataan Integritas Desain:** Seluruh komponen visual dan nilai indikator dalam dokumen ini merefleksikan prototype `mentor_copilot.html`. Seluruh metrik berstatus **data simulasi** dan wajib diberi tanda penjelas pada antarmuka pengguna `[PROTO]`.

---

## 1. Arsitektur Sistem 4-Layer (Acuan Visual Mentor)

Berdasarkan rancangan arsitektur pengembangan yang disarankan, hierarki antarmuka dan aliran data disusun dalam empat lapisan terpadu:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           1. USER INTERFACE                             │
│   Web Dashboard · Role-Based Views · SVG Charts · Copilot AI Chat Modal │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    2. MANUFACTURING COPILOT API                         │
│   Autentikasi (RBAC) · Logika Bisnis · Orchestration RAG & Analytics    │
└──────────────────┬──────────────────────────────────┬───────────────────┘
                   │                                  │
                   ▼                                  ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────┐
│     3A. RAG & KNOWLEDGE BASE         │  │       3B. ANALYTICS & AI      │
│  SOP Operasional, Manual Mesin,      │  │  Kompilasi KPI, Forecasting,  │
│  Dokumen Gambar Teknik & WBS         │  │  Deteksi Anomali, Delay ML    │
└──────────────────┬───────────────────┘  └───────────────┬───────────────┘
                   │                                      │
                   └──────────────────┬───────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       4. DATA INTEGRATION LAYER                         │
│   Sistem IRoom: Material Delivery · Project Progress · Drawing Approval │
│                 Quotation & PO · Operation Tracker                      │
│   Konektor Eksternal: ERP · MES · CMMS · QMS · Inventory · Basis Data   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Prinsip Desain & Pengalaman Pengguna (UX Principles)

1. **Decision-Support, Bukan Pengganti Sistem Operasional `[BRIEF]`:**
   Antarmuka tidak dimaksudkan untuk menjadi tempat input data transaksional seperti ERP/MES, melainkan kokpit sintesis yang menyajikan *apa yang sedang terjadi, mengapa terjadi, dan apa tindakan terpenting berikutnya*.
2. **Role-First & Scoped Information `[PROTO]` `[BRIEF]`:**
   Pengguna tidak boleh disajikan tumpukan tabel yang tidak relevan dengan tugasnya. Setiap peran kerja (Manager, Supervisor, Quality, Maintenance) langsung melihat dasbor terfilter sesuai yurisdiksi tanggung jawabnya.
3. **Prioritas Berbasis Urgensi & Dampak Finansial `[PROTO]`:**
   Fitur *AI Decision Brief* mengelompokkan anomali ke dalam kartu berbobot dampak (*Urgent*, *High*, *Medium*) dilengkapi perkiraan unit yang dapat diselamatkan atau penalti yang dapat dicegah.
4. **Verifiable & Human-in-the-Loop (`F7`) `[DOC]` `[PROTO]`:**
   Setiap anomali atau rekomendasi AI tidak mengeksekusi sistem fisik secara otomatis. Pengguna disediakan tombol otorisasi manusia (*Mark for Human Review*) untuk menjamin akuntabilitas operasional.
5. **Transparansi Status Simulasi (*Honest State*) `[PROTO]`:**
   Sistem menyertakan lencana *“Live demo · Sample data”* dan catatan kaki permanen yang menjelaskan bahwa koneksi produksi nyata belum aktif.

---

## 3. Sistem Desain Visual & Token Desain (Design System Tokens)

Diekstraksi langsung dari implementasi prototype mentor (`mentor_copilot.html`), menghasilkan nuansa modern industrial yang elegan dan kontras:

### 3.1 Palet Warna (Color Palette)
| Token CSS | Kode Warna | Penggunaan Komponen |
|---|---|---|
| `--bg` | `#f4f7fb` | Latar belakang kanvas aplikasi utama |
| `--panel` | `#ffffff` | Kartu widget, modal, kontainer tabel |
| `--ink` | `#15243a` | Teks utama, judul, nilai metrik besar |
| `--muted` | `#6e7d91` | Teks sekunder, label satuan, waktu pembaruan |
| `--line` | `#e3eaf2` | Border panel, garis grid grafik, pemisah tabel |
| `--nav` | `#102238` | Sidebar navigasi gelap (*deep industrial navy*) |
| `--blue` | `#2563eb` | Tombol CTA utama, titik aktif, penanda brand |
| `--cyan` | `#16b8c8` | Progress bar utilisasi mesin, aksen gradien |
| `--green` | `#14966b` | Indikator tren positif (↑), status normal/on track |
| `--amber` | `#d88714` | Peringatan sedang (*Attention / Monitor / Medium*) |
| `--red` | `#d94f58` | Peringatan kritis (*Urgent / High Risk*) |

### 3.2 Tipografi & Elevasi
* **Font Family:** `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`
* **Skala Tipografi:**
  * Metrik KPI: `29px`, font-weight `750`, letter-spacing `-1px`
  * Judul H1 Dasbor: `27px`, font-weight `700`, letter-spacing `-0.7px`
  * Judul Sub-seksi: `15px`, font-weight `650`
  * Teks Tubuh: `14px` / line-height `1.45`
  * Label / Tag Kategori: `10px - 11px`, font-weight `750 - 800`, uppercase
* **Elevasi / Bayangan:**
  * Panel Card: `box-shadow: 0 8px 24px rgba(19, 44, 76, 0.06)`
  * Floating Chat FAB: `box-shadow: 0 10px 24px rgba(35, 91, 212, 0.27)`
  * Dialog Modal: `box-shadow: 0 24px 70px rgba(0, 0, 0, 0.2)`

---

## 4. Rincian Tata Letak & Spesifikasi Komponen UI

Struktur antarmuka menggunakan tata letak dua kolom responsif: **Sidebar Tetap (245px)** dan **Area Konten Utama (Fluid)**.

```
┌──────────────┬────────────────────────────────────────────────────────┐
│  BRAND MARK  │ Topbar: Breadcrumbs │ Role Selector │ Refresh │ Avatar │
├──────────────┼────────────────────────────────────────────────────────┤
│  WORKSPACE   │ Page Header: Greeting Title │ Export Summary │ Ask AI  │
│  Overview    ├────────────────────────────────────────────────────────┤
│  Production  │ 4 KPI Cards: OEE · Attainment · Yield · At-Risk Orders │
│  Supply      ├───────────────────────────┬────────────────────────────┤
│  Quality     │ Operational Performance   │ AI Decision Brief          │
│  Maintenance │ (SVG Chart: Actual vs Tgt)│ (Prioritized Action Cards) │
│  Workforce   ├───────────────────────────┼────────────────────────────┤
│  INTELLIGENCE│ Production Line Status    │ Risks & Opportunities      │
│  AI Insights │ (Table with progress bars)│ (Status Monitor Badges)    │
│  Reports     ├───────────────────────────┴────────────────────────────┤
│  Knowledge   │ Prototype Notice Footer                                │
└──────────────┴────────────────────────────────────────────────────────┘
```

### 4.1 Bilah Navigasi Samping (Sidebar - Nav Dark `#102238`)
* **Brand Header:** Logo gradien `M` (Cyan ke Blue) + Teks *"Manufacturing AI — Copilot workspace"*.
* **Grup Workspace:**
  * `Overview` (Default aktif - ID ikon `▦`)
  * `Production` (Ikon `⚙`)
  * `Supply chain` (Ikon `⇄`)
  * `Quality management` (Ikon `◈`)
  * `Maintenance` (Ikon `⌁`)
  * `Workforce` (Ikon `♙`)
* **Grup Intelligence:**
  * `AI insights` (Ikon `✧`)
  * `Reports & analytics` (Ikon `▤`)
  * `Knowledge base` (Ikon `▣`)
* **Status Lingkungan Bawah (*Side-bottom Panel*):**
  * Indikator denyut hijau (`#43d39e`): *"AI services operational"*
  * Keterangan lingkungan: *"Demo environment · Sample data"*
  * Waktu sinkronisasi data: *"Last sync: 2 minutes ago"*

### 4.2 Bilah Atas (Topbar - Height 76px)
* **Breadcrumb Tracker:** Menampilkan hierarki aktif (contoh: `Workspace / Overview`).
* **Menu Burger Seluler:** Tampil pada resolusi $\le 700\text{px}$.
* **Dropdown Pemilih Peran (`#roleSelect`):** Mengizinkan pergantian 6 peran secara instan.
* **Tombol Refresh (`#refreshBtn`):** Memicu pembaruan status data demo dan menampilkan toast konfirmasi.
* **Badge Avatar:** Inisial pengguna (`IM` untuk Indrajani / IMAJIN).

### 4.3 Empat Kartu KPI Utama (Grid 4 Kolom)
Empat kartu metrik dengan visual ringkas:
1. **Overall Equipment Effectiveness (OEE):** Nilai `82.4%`, tren `↑ 3.2% vs. last week` (Hijau).
2. **Production Plan Attainment:** Nilai `94.8%`, tren `↑ 1.8% vs. last week` (Hijau).
3. **Quality Yield:** Nilai `97.1%`, tren `↓ 0.6% vs. last week` (Amber / Warning).
4. **At-risk Orders:** Nilai `7`, subteks `3 need action today` (Amber / Warning).

### 4.4 Bagan Kinerja Operasional (SVG Chart Dinamis)
* **Pilihan Metrik:** Dropdown pemilih metrik:
  * *Units produced* (Rentang 300 s/d 1.2k unit)
  * *OEE (%)* (Rentang 40% s/d 100%)
  * *Downtime (hrs)* (Rentang 3 jam s/d 12 jam)
* **Visualisasi Garis:**
  * Garis Aktual: Garis biru solid tebal (`#2868e9`) dengan penanda lingkaran pada setiap titik hari (Senin s/d Minggu).
  * Garis Target: Garis putus-putus biru muda (`#9dc7ff`).
  * Area Bawah: Gradien arsiran transparan (`#dceaff`, opacity 0.65).
* **Catatan Perbaikan Desain (*Refinement*):** Formulasi rendering SVG dinamis harus menjaga skala titik tetap dalam kotak batas *viewBox* (tinggi 190) dan mempertahankan area gradien terisi saat berganti metrik.

### 4.5 AI Decision Brief (Widget Rekomendasi Terprioritas)
Menampilkan 3 kartu insight yang disusun berdasarkan tingkat urgensi:
1. **Rebalance Line 2 schedule** (Tag: `High` - Amber)
   * *Masalah:* Line 2 berjalan 11% di bawah target.
   * *Solusi:* Geser satu operator terlatih dari Line 4 pada shift berikutnya untuk memulihkan estimasi 120 unit.
   * *Metadata:* Departemen Produksi · Keyakinan AI `87%` · Tombol aksi *"Review action →"*.
2. **Prevent a material shortage** (Tag: `Urgent` - Red)
   * *Masalah:* Komponen M-204 diperkirakan habis dalam 36 jam. *Lead time* pemasok 3 hari.
   * *Solusi:* Lakukan pengiriman darurat (*expedite*) 500 unit untuk melindungi 2 pesanan pelanggan.
   * *Metadata:* Rantai Pasok · Keyakinan AI `91%` · Tombol aksi *"Review action →"*.
3. **Inspect Press P-07** (Tag: `Medium` - Amber)
   * *Masalah:* Sinyal getaran mesin naik 18% di atas nilai dasar (*baseline*).
   * *Solusi:* Jadwalkan inspeksi kondisional sebelum jendela operasional berikutnya.
   * *Metadata:* Perawatan Mesin · Keyakinan AI `82%` · Tombol aksi *"Review action →"*.

### 4.6 Tabel Status Lini Produksi (Cross-Module Snapshot)
Tabel terintegrasi status empat lini utama dengan bilah kemajuan (*progress bar*):
* **Assembly Line 01:** Utilisasi `92%` (Bar Cyan) · Output `1,240 / 1,300` · Status `On track` (Hijau).
* **Assembly Line 02:** Utilisasi `68%` (Bar Amber) · Output `890 / 1,000` · Status `Attention` (Amber).
* **Packaging Line 03:** Utilisasi `96%` (Bar Cyan) · Output `1,510 / 1,500` · Status `Above target` (Hijau).
* **Assembly Line 04:** Utilisasi `84%` (Bar Cyan) · Output `1,080 / 1,200` · Status `On track` (Hijau).

### 4.7 Pemantau Risiko & Peluang (Risks & Opportunities)
Tiga baris status anomali:
1. **Supplier delay risk (High Risk - Red):** Komponen M-204 · Potensi dampak 2 pesanan · Dept: Rantai Pasok.
2. **Unplanned downtime signal (Monitor - Amber):** Mesin Press P-07 · Vibrasi di atas toleransi wajar · Dept: Maintenance.
3. **Capacity recovery opportunity (Actionable - Green):** Lini 2 · Potensi penambahan output +120 unit per shift · Dept: Produksi.

---

## 5. Alur Interaksi & Spesifikasi Dialog Modal

### 5.1 Modal Asisten Percakapan (Manufacturing Copilot Dialog)
* **Pemicu:** Tombol *"✧ Ask Manufacturing AI"* di header atau Floating Action Button (FAB) di sudut kanan bawah.
* **Struktur Dialog:**
  * Header dialog dengan ikon AI dan tombol tutup `×`.
  * Area log pesan (*scrollable chat-log*) membedakan balon percakapan pengguna (`YOU`) dan Copilot (`MANUFACTURING COPILOT`).
  * Input pertanyaan teks + Tombol `Send ↑`.
  * Penjelasan disclaimer: *"Demo responses use predefined sample insights. Verify recommendations against source systems before acting."*
* **Kategori Pertanyaan & Respon Terstruktur:**
  1. *Pertanyaan Prioritas Hari Ini:* Menjawab prioritas tertinggi sesuai profil peran yang sedang aktif.
  2. *Pertanyaan Lini Produksi (Line 2 bottleneck):* Menjelaskan gap 890 vs 1000 unit dan alokasi operator Line 4.
  3. *Pertanyaan Material & Pemasok (M-204):* Menjelaskan ketersediaan 36 jam vs lead time 3 hari serta biaya expedite.
  4. *Pertanyaan Mesin & Vibrasi (Press P-07):* Menjelaskan kenaikan vibrasi 18% dan verifikasi sensor.
  5. *Pertanyaan Pengetahuan SOP & Dokumen Manual:* Menampilkan nama dokumen acuan, nomor klausul, dan prosedur teknis pemecahan masalah.

### 5.2 Modal Review Tindakan Rekomendasi (Human-in-the-Loop Workflow `F7`)
* **Pemicu:** Klik *"Review action →"* pada kartu Decision Brief atau tautan baris risiko.
* **Pemisahan Logika (*Design Isolation*):** Detail review tindakan harus disajikan dalam modal terpisah atau kartu tampilan transisi tersendiri agar **tidak menghapus riwayat obrolan percakapan chat**.
* **Elemen Tampilan Review:**
  * Judul Rekomendasi & Uraian Lengkap
  * Estimasi Dampak (*Estimated Impact*)
  * Penanggung Jawab (*Owner*) & Batas Waktu (*Due Date*)
  * **Tombol Verifikasi Manusia:** `Mark for human review`
  * **Status Setelah Otorisasi:** Tombol berubah menjadi warna abu-abu tidak aktif dengan label `Flagged for review`, disertai toast notifikasi: *"Recommendation flagged for human review"*.

### 5.3 Fasilitas Ekspor Ringkasan Operasional (`F6`)
* **Pemicu:** Klik tombol *"⇩ Export summary"* di area header.
* **Format Berkas:** Berkas teks (.txt) atau dokumen Markdown yang diunduh langsung melalui browser via *Blob Object URL*.
* **Struktur Konten Ekspor:**
  1. Header Dokumen: `AI MANUFACTURING COPILOT — DEMO SUMMARY`
  2. Rekapitulasi Metrik Kunci: Nilai OEE, Ketercapaian Rencana, Yield Mutu, dan Jumlah Pesanan Berisiko.
  3. Butir Arahan Tindakan Terprioritas: Daftar tindakan teratas hasil Decision Brief.
  4. Penegasan Legalitas Data: Catatan kaki bahwa berkas memuat data simulasi yang harus divalidasi ke sistem pencatat fisik sebelum keputusan dieksekusi.

---

## 6. Matriks Adaptasi Dasbor Berdasarkan Peran Pengguna (Role Adaptation Matrix)

Ketika pengguna mengganti nilai pada dropdown `#roleSelect`, elemen dasbor menyesuaikan kontennya sebagai berikut:

| Peran Pengguna (Role) | Ucapan Salam & Subtitle Header | Fokus Metrik KPI Utama | Prioritas Sinyal Keputusan (Decision Brief Focus) |
|---|---|---|---|
| **Operations Manager** | *"Good morning, Operations Manager" — One operational view across production, quality, maintenance, and supply chain.* | OEE, Plan Attainment, Yield, At-Risk Orders | Menyelesaikan risiko kekurangan komponen M-204, kemudian memulihkan kapasitas Lini 2. |
| **Plant Manager** | *"Good morning, Plant Manager" — Monitor plant performance, delivery risk, and opportunities to improve throughput.* | Plant Output Attainment, Total At-Risk Value | Evaluasi trade-off biaya pengiriman darurat M-204 vs risiko penalti kontrak pengiriman. |
| **Production Supervisor** | *"Good morning, Production Supervisor" — Focus on shift attainment, line constraints, staffing, and immediate production actions.* | Line Utilization, Shift Gap, Operator Allocation | Review kualifikasi dan izin keselamatan untuk pemindahan operator Line 4 ke Line 2. |
| **Maintenance Lead** | *"Good morning, Maintenance Lead" — Prioritize equipment health signals, planned maintenance, and downtime prevention.* | Machine Vibration Index, Unplanned Downtime, MTBF | Validasi keandalan sensor getaran Press P-07 dan riwayat perbaikan sebelum menerbitkan SPK. |
| **Quality Manager** | *"Good morning, Quality Manager" — Track yield, recurring defects, quality deviations, and corrective actions.* | Quality Yield, Defect Code Distribution, Scrap Rate | Segmentasi data cacat berdasarkan lini dan batch kerja sebelum menerapkan tindakan korektif. |
| **Supply Chain Lead** | *"Good morning, Supply Chain Lead" — Monitor material availability, supplier lead times, and at-risk customer orders.* | Stock Cover Hours, Supplier Delivery Reliability | Konfirmasi komitmen vendor M-204 dan analisis biaya pengiriman ekspres vs proteksi 2 PO. |

---

## 7. Model Data Konseptual Antarmuka (UI Conceptual Entities)

Antarmuka memproses entitas logika berikut:
1. `ProjectOrder`: Identifikasi pesanan, nomor PO, tanggal target, status risiko keterlambatan (*High/Medium/Low*).
2. `ProductionLine`: ID lini, nama stasiun, persentase utilisasi, target output, aktual output, status (*On track / Attention / Above target*).
3. `EquipmentSignal`: ID mesin (misal: *Press P-07*), metrik telemetri (vibrasi, suhu), deviasi persen dari baseline, status kerja.
4. `MaterialInventory`: Kode komponen (misal: *M-204*), sisa jam persediaan (*stock cover*), *lead time* vendor, jumlah unit darurat.
5. `DecisionAction`: Judul rekomendasi, departemen, skor keyakinan AI (%), tingkat urgensi, estimasi dampak, PIC, batas waktu, status flag review.
6. `KnowledgeDocument`: Dokumen SOP, manual mesin, prosedur pergantian cetakan (*changeover*), nomor revisi, bab sitasi.
