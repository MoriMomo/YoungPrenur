# MDIP: Model Bisnis, Analisis SWOT & Strategi TOWS (v1.0)

> **Produk:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Pendekatan Bisnis:** Hybrid B2B SaaS & Enterprise Internal Deployment  

---

## 1. Arsitektur Model Bisnis (Dual-Engine Business Model)

MDIP menerapkan model pendapatan ganda (*dual-stream monetization*) untuk menjangkau pabrikan berkembang maupun perusahaan manufaktur skala besar:

### 1.1 Aliran Pendapatan Utama: B2B SaaS Subscription (Cloud/Managed)
* **Paket Starter (Pabrik 1–5 Lini / Mesin CNC):**
  * Biaya: **Rp 3.500.000 / bulan** (ditagih tahunan).
  * Fitur: 5 Modul IRoom, Dashboard 6 Peran, WBS Scheduler Standar, Copilot RAG hingga 50 dokumen SOP.
* **Paket Pro (Pabrik 6–20 Mesin CNC / Presisi Tinggi):**
  * Biaya: **Rp 7.500.000 / bulan**.
  * Fitur: Semua fitur Starter + Prediksi Keterlambatan Real-time CPM/ML, Integrasi Sensor Getaran IoT, Audit Log ISO 9001, Dukungan Multi-User tak terbatas.
* **Paket Industrial Enterprise (Multi-Plant / Tier-1 Supplier):**
  * Biaya: Kustom (**Rp 15.000.000 – Rp 35.000.000 / bulan**).
  * Fitur: Partisi data eksklusif, konektor kustom ERP/SAP, SLA 99.9%, pelatihan model kustom dengan data historis pabrik.

### 1.2 Aliran Pendapatan Tambahan: Internal Enterprise Licensing & Integrasi Khusus
* **Lisensi On-Premise / Private VPC:** Biaya lisensi tahunan tetap + paket implementasi dan pelatihan operator lantai pabrik (*Professional Services & Operator Enablement*).

---

## 2. Matriks Analisis SWOT Komprehensif

`
+------------------------------------------+------------------------------------------+
|               STRENGTHS (S)              |              WEAKNESSES (W)              |
| 1. Sinergi langsung dengan data IRoom    | 1. Model ML tahap awal masih memerlukan  |
|    milik PT IMAJIN (konektor native).    |    akuisisi data historis mitra.         |
| 2. AI Copilot dengan sitasi dokumen      | 2. Ketergantungan awal pada konektivitas |
|    resmi (bebas halusinasi generatif).   |    sensor IoT pihak ketiga (spindle load)|
| 3. Fitur Human-in-the-Loop memenuhi      | 3. Brand purwarupa baru dibanding vendor |
|    standar audit ISO 9001 / AS9100.      |    MES global yang sudah mapan.          |
| 4. Antarmuka web modern ultra-cepat      |                                          |
|    (Next.js 16 + React 19) ramah tablet. |                                          |
+------------------------------------------+------------------------------------------+
|             OPPORTUNITIES (O)            |               THREATS (T)                |
| 1. Program akselerasi Making Indonesia   | 1. Resistensi operator senior terhadap   |
|    4.0 dan subsidi teknologi IKM Kemenperin tools digital baru di lantai pabrik.     |
| 2. Kebutuhan lokalisasi rantai pasok EV  | 2. Kekhawatiran kebocoran rahasia dagang |
|    dan komponen baterai di Jawa Barat.   |    desain gambar CAD ke platform cloud.  |
| 3. Banyaknya pabrik Tier-2 yang mencari  | 3. Fluktuasi biaya API LLM komersial     |
|    alternatif terjangkau dari MES Barat. |    jika tidak dioptimalkan secara lokal. |
+------------------------------------------+------------------------------------------+
`

---

## 3. Matriks Strategi TOWS Terpadu

### 3.1 Strategi SO (Memanfaatkan Kekuatan untuk Menangkap Peluang)
1. **Ekspansi Cepat ke Kluster Vendor PT IMAJIN (S1, S4 -> O1, O2):**
   * Memanfaatkan jaringan lebih dari 500 bengkel mesin dan mitra permesinan CNC di Jawa Barat yang sudah terhubung ke ekosistem IMAJIN sebagai basis pengguna awal (*early adopters*).
2. **Paket Solusi Kepatuhan Standar Kemenperin (S2, S3 -> O1):**
   * Mempromosikan fitur sitasi dokumen SOP dan pencatatan audit trail sebagai sarana mempermudah pabrikan lokal meraih sertifikasi Tingkat Komponen Dalam Negeri (TKDN) dan audit kualitas internasional.

### 3.2 Strategi WO (Meminimalkan Kelemahan dengan Mengambil Peluang)
1. **Penerapan Mesin Aturan Heuristik Sebelum Pelatihan ML Lengkap (W1 -> O2):**
   * Menggunakan aturan heuristik terkalibrasi (*Rule-Based Heuristic v0.1*) pada fase onboarding klien, sehingga pabrik langsung merasakan nilai efisiensi sambil mengumpulkan log data aktual untuk melatih model XGBoost.
2. **Kemitraan Sensor IoT Standar Terbuka (W2 -> O3):**
   * Mengintegrasikan protokol IoT standar (MQTT / OPC-UA) yang kompatibel dengan sensor getaran berbiaya rendah buatan lokal, menekan biaya pengadaan perangkat keras hingga 70%.

### 3.3 Strategi ST (Menggunakan Kekuatan untuk Menghadapi Ancaman)
1. **Opsi Deployment Dual-Mode & Private VPC (S3 -> T2):**
   * Menawarkan mode *Internal Enterprise* dengan partisi data on-premise bagi klien yang memproduksi komponen pertahanan atau kedirgantaraan, memastikan berkas CAD tidak pernah meninggalkan jaringan lokal perusahaan.
2. **Arsitektur RAG Hybrid Lokal (S2 -> T3):**
   * Menjalankan model embedding dan pencarian vektor di server lokal atau instance terdedikasi untuk menjaga biaya inferensi tetap dapat diprediksi (*flat-rate operational cost*).

### 3.4 Strategi WT (Meminimalkan Kelemahan dan Menghindari Ancaman)
1. **Pilot Sandbox Tanpa Instalasi (W3, W2 -> T1):**
   * Menyediakan purwarupa mandiri berbasis web yang dapat langsung diuji coba dalam hitungan menit tanpa mengganggu alur kerja lini produksi yang sedang berjalan (*zero-disruption onboarding*).
2. **Pelatihan Berbasis Komunitas & Sertifikasi Operator (W3 -> T1):**
   * Mengadakan lokakarya bersama asosiasi manufaktur permesinan untuk melatih supervisor lantai pabrik mengenai cara memanfaatkan AI Copilot sebagai asisten kerja, bukan ancaman pengganti tenaga kerja.
