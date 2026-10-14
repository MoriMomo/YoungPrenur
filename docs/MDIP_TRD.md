# MDIP — Technical Requirements Document (TRD)

> **Nama Produk:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Dokumen Pendamping:** `MDIP_PRD.md` (v3.0) & `MDIP_DRD.md` (v3.0)  
> **Acuan Desain Utama:** Prototype Interaktif Mentor (`mentor_copilot.html`)  
> **Status Dokumen:** v3.0 — Spesifikasi Arsitektur Teknis, Kontrak API, Pipeline RAG, & Engine Machine Learning  
> **Tanggal Pembaruan:** 13 Oktober 2026  
>
> **Pernyataan Integritas Teknis:** Data yang disajikan pada fase prototype saat ini berstatus **data simulasi (mockup)**. Konektor basis data dan model AI inferensi live disiapkan di balik antarmuka abstraksi (*abstraction interfaces*) sehingga dapat diintegrasikan mulus pada fase pilot `[PROTO]`.

---

## 1. Ikhtisar Arsitektur Sistem 4-Layer

Arsitektur MDIP dirancang modular, memisahkan lapisan presentasi, orkestrasi bisnis, analitik cerdas, dan integrasi sumber data fisik:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          1. USER INTERFACE (UI)                        │
│   • Single Page Application (HTML5 / Vanilla JS / CSS Tokens)         │
│   • Komponen: Responsive Sidebar, Dynamic SVG Charts, Chat Modal       │
│   • Desain Mandiri: Berjalan langsung di browser tanpa server lokal     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST / WebSocket
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     2. MANUFACTURING COPILOT API                       │
│   • Framework: Python (FastAPI) atau Node.js                           │
│   • Tanggung Jawab: RBAC, Session Management, Orchestration Router    │
│   • Middleware: Rate Limiting, Audit Logging, Context Filter           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│       3A. RAG & KNOWLEDGE BASE       │  │      3B. ANALYTICS & AI      │
│ • MVP: Keyword Retrieval (BM25)      │  │ • KPI Compute (OEE Engine)   │
│ • Pilot: Vector DB (Qdrant / PGVector│  │ • Statistical Anomaly Detect │
│ • Embeddings: Domain Manufacturing   │  │ • Delay-Risk ML (XGBoost)    │
│ • Prompt Guardrails & Citations      │  │ • WBS Duration Estimator     │
└──────────────────┬───────────────────┘  └──────────────┬───────────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       4. DATA INTEGRATION LAYER                        │
│   • IRoom Connectors: Material Delivery, Project Progress, Drawing,   │
│     Quotation & PO, Operation Tracker                                  │
│   • Document Ingestion: Parser Excel (.xlsx), PDF DWG, Template Unik   │
│   • Enterprise Connectors (Abstraction): ERP, MES, CMMS, QMS, SQL DB   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Teknis Tiap Lapisan

### 2.1 Lapisan Antarmuka Pengguna (User Interface)
* **Status Saat Ini (`mentor_copilot.html`):** Berkas HTML mandiri (*single-file architecture*) menggunakan CSS Grid/Flexbox modern, SVG murni (*zero external graphic library*), dan JavaScript modular.
* **Perilaku Responsif:**
  * Resolusi Lebar ($\ge 1050\text{px}$): Dua kolom grid (Sidebar 245px + Dasbor 1fr).
  * Tablet ($700\text{px} - 1050\text{px}$): Sidebar menyusut (205px), grid KPI 2 kolom.
  * Ponsel ($\le 700\text{px}$): Sidebar tersembunyi, navigasi via tombol burger, tabel dengan *horizontal overflow scrolling*.
* **Manajemen State Client-Side:**
  * Objek `roleContent`: Memetakan judul dan subteks dinamis per peran kerja.
  * Objek `roleInsights`: Memetakan fokus naratif per peran yang digunakan pada respons Copilot.
  * Objek `actionDetails`: Menampung metadata aksi keputusan (*title, body, impact, owner, due date*).
  * Objek `chartData`: Menampung koordinat titik aktual, target, dan label sumbu untuk metrik *output*, *oee*, dan *downtime*.

### 2.2 Lapisan API Orkestrasi (Manufacturing Copilot API)
Lapisan ini mengorkestrasi permintaan pengguna sebelum diarahkan ke modul RAG atau engine Analitik:
* **Logika Routing:**
  1. Jika pengguna meminta ringkasan dasbor $\rightarrow$ panggil `AnalyticsService.get_role_kpis(role)`.
  2. Jika pengguna mengajukan pertanyaan di AI Chat:
     * Evaluasi apakah pertanyaan membutuhkan data numerik spesifik (misal: "Berapa unit Lini 2?") $\rightarrow$ Arahkan ke `AnalyticsService`.
     * Evaluasi apakah pertanyaan terkait prosedur teknis/SOP (misal: "Bagaimana cara kalibrasi Press P-07?") $\rightarrow$ Arahkan ke `RAGKnowledgeService`.
     * Sintesis jawaban naratif dengan menyematkan sitasi data dan label keyakinan (*confidence score*).

### 2.3 RAG & Knowledge Base Engine
Mengelola dokumen tak terstruktur (SOP pabrik, manual pemeliharaan mesin, instruksi kerja perakitan):
* **Fase MVP (Aktif Saat Ini):**
  * Pencarian kata kunci (*keyword-based retrieval*) dengan pemetaan istilah teknis manufaktur (misal: "press", "line 2", "m-204", "quality", "sop").
* **Fase Pilot & Produksi (Target RAG Semantik):**
  * **Document Parsing & Chunking:** Pemotongan dokumen PDF/Docx menjadi segmen 400-600 token dengan *overlap* 100 token, mempertahankan metadata nomor bab/halaman.
  * **Vector Embeddings:** Menggunakan model embedding multibahasa berkemampuan domain teknis (*multilingual technical embedding*).
  * **Penyimpanan Vektor:** Vector database lokal (*ChromaDB / Qdrant*) atau ekstensi `pgvector` pada PostgreSQL.
  * **Grounded Prompting Template:**
    ```text
    Anda adalah AI Manufacturing Copilot untuk MDIP. Jawab pertanyaan pengguna HANYA berdasarkan konteks dokumen dan data terlampir di bawah ini.
    Jika informasi tidak terdapat pada konteks, katakan bahwa data tidak ditemukan pada sistem dan sarankan menghubungi supervisor lini.
    DILARANG mengarang angka metrik atau menyarankan modifikasi mesin di luar SOP.
    Sertakan sitasi resmi dalam format [Dokumen: Bab/Halaman] di akhir jawaban.
    ```
  * **Kontrol Halusinasi:** Verifikasi skor kedekatan semantik (*cosine similarity threshold* $\ge 0.78$) sebelum mengirim konteks ke LLM.

### 2.4 Analytics & AI Engine

#### A. Mesin Komputasi KPI
Menghitung metrik efisiensi industri secara periodik:
$$\text{OEE} = \text{Availability} \times \text{Performance} \times \text{Quality}$$
* $\text{Availability} = \frac{\text{Waktu Operasi Nyata}}{\text{Waktu Operasi Terencana}}$
* $\text{Performance} = \frac{\text{Total Unit Diproduksi} \times \text{Waktu Siklus Ideal}}{\text{Waktu Operasi Nyata}}$
* $\text{Quality} = \frac{\text{Unit Sesuai Standar}}{\text{Total Unit Diproduksi}}$

#### B. Engine Deteksi Anomali Statistik
Memonitor ambang batas deviasi telemetri operasional:
* *Sinyal Vibrasi Mesin:* Jika $\text{Vibrasi}_{\text{aktual}} > 1.15 \times \text{Baseline}$, trigger tiket `Inspect Machine (Medium Priority)`.
* *Sinyal Hambatan Output:* Jika $\text{Output}_{\text{aktual}} < 0.90 \times \text{Target}$, trigger rekomendasi `Rebalance Line Schedule (High Priority)`.
* *Sinyal Kritis Stok Bahan Baku:* Jika $\text{Jam Persediaan} < 1.5 \times \text{Lead Time Vendor}$, trigger peringatan `Material Shortage Risk (Urgent)`.

#### C. Model Prediksi Risiko Keterlambatan (Delay-Risk ML Engine `[DOC]`)
* **Masukan Fitur Model:**
  1. Kompleksitas gambar teknik & durasi *Drawing Approval* (hari).
  2. Variansi riwayat keterlambatan vendor material (*Material Delivery Variance*).
  3. Total jam kerja WBS terencana vs kapasitas mesin tersedia.
  4. Jumlah perubahan revisi desain (*Engineering Change Orders*).
  5. Rasio beban operator lini kerja.
* **Arsitektur Model:** Ensemble Supervised Learning (XGBoost / LightGBM Classifier) untuk memprediksi kelas risiko: *Tepat Waktu*, *Risiko Rendah*, *Risiko Tinggi*.
* **Strategi Fallback (Ketiadaan Data Historis):** Jika data log proyek belum mencukupi untuk pelatihan model ML berbobot tinggi, sistem mengaktifkan *Rule-based Critical Path Method (CPM)* dengan skor penalti deviasi terbobot.

### 2.5 Lapisan Integrasi Data (Data Integration Layer)

Menghubungkan MDIP dengan ekosistem pencatat data:
1. **Modul-Modul IRoom System `[BRIEF]`:**
   * `IRoom_MaterialDelivery`: Sinkronisasi status PO bahan baku, manifest pengiriman, dan estimasi tanggal kedatangan.
   * `IRoom_ProjectProgress`: Sinkronisasi persentase penyelesaian fisik WBS dan tanggal milestone.
   * `IRoom_DrawingApproval`: Sinkronisasi status otorisasi dokumen rancang bangun dari tim engineering.
   * `IRoom_QuotationPO`: Sinkronisasi nilai kontrak, klausul penalti denda keterlambatan, dan kuantitas pesanan.
   * `IRoom_OperationTracker`: Sinkronisasi pencatatan log harian operator, mesin yang digunakan, dan waktu henti (*downtime*).
2. **Konektor Eksternal (ERP/MES/CMMS Abstraction Interface):**
   ```python
   class IDataConnector(ABC):
       @abstractmethod
       async def get_production_metrics(self, line_id: str, date_range: tuple) -> ProductionMetrics:
           pass
       @abstractmethod
       async def get_inventory_status(self, part_number: str) -> InventoryStatus:
           pass
       @abstractmethod
       async def get_equipment_telemetry(self, machine_id: str) -> TelemetryRecord:
           pass
   ```

---

## 3. Spesifikasi Kontrak API (API Endpoint Specifications)

Semua endpoint menyajikan payload bertipe `application/json` berstandar RESTful:

### 3.1 Dasbor & Analitik
* **`GET /api/v1/dashboard/overview`**
  * *Query Params:* `role` (string), `plant_id` (string, opsional)
  * *Response 200:*
    ```json
    {
      "role": "Operations Manager",
      "kpis": {
        "oee": { "value": 82.4, "trend": "+3.2%", "status": "positive" },
        "plan_attainment": { "value": 94.8, "trend": "+1.8%", "status": "positive" },
        "quality_yield": { "value": 97.1, "trend": "-0.6%", "status": "warning" },
        "at_risk_orders": { "value": 7, "urgent_count": 3, "status": "warning" }
      },
      "sync_timestamp": "2026-10-13T14:20:00Z",
      "is_simulation": true
    }
    ```

* **`GET /api/v1/analytics/performance`**
  * *Query Params:* `metric` (`output` | `oee` | `downtime`), `days` (default: 7)
  * *Response 200:* Mengembalikan array deret waktu `actual` dan `target` beserta label sumbu.

* **`GET /api/v1/decisions/brief`**
  * *Response 200:* Daftar kartu rekomendasi terurut prioritas:
    ```json
    [
      {
        "id": "ACT-001",
        "title": "Rebalance Line 2 schedule",
        "description": "Line 2 is running 11% below target...",
        "department": "Production",
        "urgency": "High",
        "confidence_pct": 87,
        "impact_summary": "Recover approx 120 units/shift",
        "suggested_owner": "Production Supervisor",
        "due": "Before next shift",
        "is_flagged_for_review": false
      }
    ]
    ```

* **`POST /api/v1/decisions/{action_id}/flag-review`**
  * *Tujuan:* Melaksanakan verifikasi manusia (*F7 Human-in-the-Loop*).
  * *Response 200:* `{"action_id": "ACT-001", "status": "FLAGGED", "timestamp": "..."}`

### 3.2 Percakapan Cerdas (Copilot Chat)
* **`POST /api/v1/copilot/chat`**
  * *Request Body:*
    ```json
    {
      "message": "Where is the SOP for press changeover?",
      "active_role": "Maintenance Lead",
      "session_id": "sess-9821"
    }
    ```
  * *Response 200:*
    ```json
    {
      "reply": "SOP pergantian cetakan (die changeover) untuk mesin cetak hidrolik tercantum pada dokumen SOP-PRS-04 Rev.2. Tahapan kritis meliputi: 1. Matikan saklar utama dan pasang safety lock pin...",
      "citations": [
        { "doc_title": "SOP Pergantian Cetakan Mesin Press", "code": "SOP-PRS-04", "page": 4 }
      ],
      "confidence": 0.94,
      "is_simulated": true
    }
    ```

### 3.3 Ekspor Ringkasan Operasional
* **`GET /api/v1/export/summary`**
  * *Query Params:* `role` (string), `format` (`txt` | `pdf`)
  * *Response:* Mengirimkan berkas teks/dokumen terformat dengan label peringatan data simulasi.

---

## 4. Persyaratan Non-Fungsional (Non-Functional Requirements)

| Kategori | Parameter Kebutuhan | Spesifikasi Teknis |
|---|---|---|
| **Keamanan & Privasi** | *Role-Based Access Control (RBAC)* | Token otentikasi JWT; pemisahan visibilitas endpoint per peran kerja. |
| **Isolasi Penyewa** | *Multi-Tenancy Architecture* | Partisi data tingkat database per ID perusahaan pabrik (*Tenant Isolation*); enkripsi at-rest (AES-256). |
| **Integritas Pengetahuan** | *Anti-Hallucination Guardrail* | Respons numerik diwajibkan berasal dari kueri basis data operasional; respons teks wajib merujuk sitasi dokumen berlisensi. |
| **Performa & Latensi** | Waktu Muat Dasbor Client | Inisialisasi awal $\le 1.2$ detik pada jaringan broadband standar. |
| **Latensi Respon AI** | *Copilot Chat Latency* | Waktu perolehan respons percakapan $\le 2.5$ detik untuk model RAG terkompilasi. |
| **Skalabilitas Ekspor** | Pembuatan Berkas Ekspor | Dijalankan di sisi peramban (*client-side Blob*) untuk meminimalkan beban komputasi server. |

---

## 5. Rencana Tahapan Rilis Teknis (Technical Milestones)

1. **Milestone 1 — Prototype Mandiri Sisi Klien (`mentor_copilot.html`) `[SELESAI]`:**
   Implementasi antarmuka lengkap, visualisasi SVG, alur modal aksi review manusia, dan simulasi chat berbasis kata kunci dalam 1 berkas HTML.
2. **Milestone 2 — Perbaikan & Pemurnian Antarmuka (`mentor_copilot.html v2`) `[SELANJUTNYA]`:**
   Perbaikan formula skala SVG grafik saat berganti metrik, pemisahan kontainer modal chat dan review, serta kartu KPI dinamis per peran kerja.
3. **Milestone 3 — Backend API & Adapter Konektor IRoom:**
   Pembangunan service RESTful FastAPI dan mock adapter untuk modul IRoom (Material, Progress, Drawing, PO, Operation Tracker).
4. **Milestone 4 — Integrasi RAG Semantik & Sitasi Dokumen:**
   Penggantian pencarian kata kunci dengan pipeline embedding teks + Qdrant, menghubungkan berkas manual mesin dan SOP resmi.
5. **Milestone 5 — Pelatihan Model Delay-Risk ML & Uji Pilot Lapangan:**
   Pelatihan model klasifikasi keterlambatan jadwal pada lingkungan pilot terverifikasi bersama mitra industri PT Imajinasi Karya Bangsa (IMAJIN).
