# MDIP: Spesifikasi Inovasi & Arsitektur Integrasi IRoom System (v1.0)

> **Produk:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Fokus Inovasi:** Transformasi Data Heterogen IRoom System Menjadi Rekomendasi Cerdas Operasional & Mitigasi Risiko Keterlambatan  
> **Mitra Industri:** PT Imajinasi Karya Bangsa (IMAJIN) & Riset Terapan BINUS RTT  
> **Status TRL:** TRL 3 (Proof-of-Concept Tervalidasi Analitis & Purwarupa Laboratorium)  

---

## 1. Latar Belakang & Inti Inovasi (Innovation Core)

Industri manufaktur presisi berbasis proyek (*project-based manufacturing*) di Indonesia dan Asia Tenggara menghadapi dilema koordinasi horizontal:
1. Data operasional terpecah pada sistem silo (*Material*, *Progress*, *Drawing*, *PO*, dan *Shop-Floor*).
2. Penilaian keterlambatan bersifat **reaktif** — bottleneck baru terdeteksi setelah tanggal jatuh tempo (*due date*) terlewati.
3. Supervisor lantai pabrik tidak memiliki pendukung keputusan instan yang mampu mengaitkan batasan mesin fisik dengan standar SOP teknis.

**Inovasi MDIP:**
MDIP menghadirkan lapisan inteligensi keputusan (*Decision Intelligence Layer*) yang secara langsung mengonsumsi 5 aliran telemetri dari **IRoom System**, memetakan ketergantungan lintas fungsi secara deterministik (CPM) dan prediktif (Machine Learning), serta menghadirkan **AI Manufacturing Copilot** yang dilengkapi mekanisme penelusuran sitasi dokumen (*Anti-Hallucination Guardrail*) dan audit verifikasi manusia (*Human-in-the-Loop*).

`
+-----------------------------------------------------------------------------------+
|                           IRoom System Data Streams                               |
|   [Material Delivery] [Project Progress] [Drawing Approval] [Quotation/PO] [Ops] |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       MDIP Ingestion & Normalization Layer                        |
| - WBS Activity Canonical Standardizer                                            |
| - Real-time Ingot Lead-Time & Stock-Cover Correlator                             |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        Decision Intelligence Core Engine                          |
| 1. Critical Path Method (CPM) + Supervised XGBoost Delay Risk Engine              |
| 2. Grounded RAG Semantic Knowledge Retriever (SOP-PROD, SOP-ENG, AS9100)          |
| 3. Multi-Criteria Prioritization (Impact x Urgency x Confidence)                  |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        Human-in-the-Loop Cockpit UI                               |
| - Role-Based Dashboard (Operations, Plant, Supervisor, Maintenance, QC, SCM)     |
| - Interactive WBS Timeline with Slippage Highlights                               |
| - One-Click Action Review Modal & Timestamped Audit Logging                      |
+-----------------------------------------------------------------------------------+
`

---

## 2. Pemetaan 5 Modul Utama IRoom System

### 2.1 Material Delivery Management
* **Masalah Bisnis:** Keterlambatan bahan baku kritis (misal: balok aluminium AL7075-T6 atau baja SKD11) menghentikan mesin CNC bernilai miliaran rupiah.
* **Fitur MDIP:**
  * Penghitungan otomatis *Stock Cover Hours* terhadap jadwal pemesinan aktif.
  * Peringatan dini jika Lead Time Pemasok > Jam Ketahanan Stok.
  * Korelasi instan dengan nomor Purchase Order aktif (contoh: PO-2026-IMJ-0891).

### 2.2 Project Progress Tracking
* **Masalah Bisnis:** Deviasi kumulatif pada aktivitas hulu (*upstream*) sering tidak terdeteksi oleh manajer proyek hingga perakitan akhir.
* **Fitur MDIP:**
  * Pelacakan capaian persentase aktivitas WBS terhadap tanggal target pelanggan.
  * Estimasi slippage proyek dalam hitungan hari kalender secara proaktif.

### 2.3 Drawing Approval (CAD/CAM Workflow)
* **Masalah Bisnis:** Revisi gambar teknik (GD&T) yang terlambat disetujui menghambat pembuatan program CNC (*G-code toolpath*).
* **Fitur MDIP:**
  * Penandaan gambar teknik berkategori kritis (*Critical Path Drawing*).
  * Pemantauan SLA *turnaround time* peninjauan oleh Lead Tooling Engineer (maksimal 4 jam kerja sesuai SOP-ENG-02).

### 2.4 Quotation & Purchase Order (PO)
* **Masalah Bisnis:** Siklus persetujuan PO darurat untuk perkakas potong (*cutting tools*) atau subkontrak *heat treatment* sering memakan waktu berhari-hari.
* **Fitur MDIP:**
  * Penandaan status transaksi PO (*RFQ Stage*, *Pending Approval*, *PO Issued*).
  * Peringatan kebutuhan *expedited shipping* pada komponen berisiko tinggi.

### 2.5 Operation Tracker (Shop-Floor IoT & Operator)
* **Masalah Bisnis:** Mesin mengalami anomali getaran mekanis (*spindle vibration*) yang berujung pada kerusakan perkakas potong dan *scrap*.
* **Fitur MDIP:**
  * Monitoring utilisasi spindle CNC dan OEE mesin secara real-time.
  * Deteksi dini anomali sensor getaran (Normal vs Elevated vs Critical).
  * Integrasi data kualifikasi operator (Level 2/3 Assembly Certification).

---

## 3. Alur Kerja Tata Kelola Human-in-the-Loop (HITL)

Untuk mencegah risiko operasional pada manufaktur presisi, MDIP menerapkan prinsip **Human-in-the-Loop Governance**:
1. **Deteksi AI:** Mesin analitik mendeteksi deviasi 2 hari pada WBS-1.2.
2. **AI Decision Brief:** AI menyusun rekomendasi terstruktur:
   - *Tindakan:* Otorisasi Overtime Operator CNC Cell A (3.5 jam).
   - *Estimasi Dampak:* Memulihkan 80% keterlambatan jalur kritis.
   - *Tingkat Kepercayaan AI:* 92.5%.
   - *Dasar Dokumen:* SOP-PROD-2024-V2.pdf (Klausul 1.4).
3. **Persetujuan Manusia:** Manajer Operasional membuka ReviewModal, meninjau justifikasi teknis, dan menekan tombol *Authorize Action*.
4. **Audit Trail:** Keputusan dicatat ke dalam log audit tak-terubah (*Immutable Audit Log*) dengan stempel waktu dan ID jabatan.
