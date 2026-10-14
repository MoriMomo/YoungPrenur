# MDIP: Rencana Bisnis, Strategi Go-To-Market & Roadmap 3 Tahun (v1.0)

> **Produk:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Horizon Waktu:** Rencana Strategis 36 Bulan (Tahun 2026 - 2029)  

---

## 1. Strategi Masuk Pasar (Go-To-Market / GTM Strategy)

### Fase 1: Validasi Ekosistem Mitra Inti (Bulan 1 - 6)
* **Target:** 10 Fasilitas Manufaktur dalam jaringan PT IMAJIN (Kawasan Cikarang & Karawang).
* **Taktik:** Program Early Adopter Co-Innovation. Pengujian lapangan purwarupa Next.js + FastAPI dengan konektor data IRoom System riil.
* **Metrik Keberhasilan:** Pengurangan deviasi keterlambatan proyek minimal 25% dan tingkat retensi pengujian 90%.

### Fase 2: Penetrasi Kluster Manufaktur Regional (Bulan 7 - 18)
* **Target:** 65 Pabrik Menengah di Jawa Barat, Banten, dan Jawa Timur (Sektor Komponen Otomotif, Mold & Die, dan Elektronik).
* **Taktik:** Kerjasama dengan Asosiasi Manufaktur Logam (GAMMA, ASBEKINDO) dan partisipasi aktif dalam pameran industri (Manufacturing Indonesia Expo).
* **Metrik Keberhasilan:** 45 Pabrik menjadi pelanggan berbayar (Paying ARR).

### Fase 3: Ekspansi Skala Nasional & Regional ASEAN (Bulan 19 - 36)
* **Target:** 250+ Pabrik di Indonesia, Malaysia, dan Thailand.
* **Taktik:** Peluncuran Self-Serve SaaS Onboarding untuk bengkel mesin presisi, integrasi kemitraan bersama vendor perkakas mesin (DMG MORI, Makino, Fanuc channel partners).

---

## 2. Metrik Unit Ekonomi (Unit Economics)

| Metrik Keuangan | Nilai Estimasi | Catatan Analisis |
|---|---|---|
| **Average Revenue Per User (ARPU)** | **Rp 84.000.000 / tahun** | Rata-rata paket campuran Pro (Rp 90jt) & Starter (Rp 42jt). |
| **Customer Acquisition Cost (CAC)** | **Rp 14.500.000** | Direct enterprise sales + webinar asosiasi manufaktur. |
| **Customer Lifetime Value (LTV)** | **Rp 210.000.000** | Asumsi rata-rata masa berlangganan 30 bulan dengan churn < 1.2%/bln. |
| **Rasio LTV : CAC** | **14.4 : 1** | Sangat sehat (Standar SaaS B2B sehat > 3:1). |
| **Periode Pemulihan CAC (CAC Payback)** | **~2.1 Bulan** | Arus kas operasional positif dicapai dengan cepat. |
| **Target Margin Kotor (Gross Margin)** | **78.5%** | Biaya infrastruktur cloud dan inferensi model efisien. |

---

## 3. Proyeksi Keuangan 3 Tahun (Financial Projections)

```
+------------------------------------+-----------------+-----------------+-----------------+
| Indikator Finansial                |  Tahun 1 (2026) |  Tahun 2 (2027) |  Tahun 3 (2028) |
+------------------------------------+-----------------+-----------------+-----------------+
| Jumlah Klien Pabrik Aktif          | 15 Pabrik       | 75 Pabrik       | 240 Pabrik      |
| Pendapatan Berulang (ARR)          | Rp 1.15 Miliar  | Rp 5.80 Miliar  | Rp 18.9 Miliar  |
| Biaya Pokok Penjualan (COGS)       | Rp 260 Juta     | Rp 1.15 Miliar  | Rp 3.78 Miliar  |
| Laba Kotor (Gross Profit)          | Rp 890 Juta     | Rp 4.65 Miliar  | Rp 15.12 Miliar |
| Beban Operasional (OPEX)           | Rp 680 Juta     | Rp 2.45 Miliar  | Rp 6.80 Miliar  |
| EBITDA                             | + Rp 210 Juta   | + Rp 2.20 Miliar| + Rp 8.32 Miliar|
| Margin Bersih                      | 18.2%           | 37.9%           | 44.0%           |
+------------------------------------+-----------------+-----------------+-----------------+
```

---

## 4. Roadmap Pencapaian Tingkat Kesiapan Teknologi (TRL 3 -> TRL 8)

```
+-----------------------------------------------------------------------------------------+
| [SELESAI - BULAN INI] TRL 3: Pembuktian Konsep Analitis & Purwarupa Laboratorium         |
| - Antarmuka Next.js 16 interaktif dengan simulasi 6 peran manufaktur.                   |
| - API FastAPI PoC melayani 5 modul IRoom dan kalkulasi deviasi CPM.                     |
| - Validasi latensi <500ms dan ketersediaan data fallback lokal.                         |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
| [BULAN 4 - 8] TRL 4 & 5: Validasi Komponen di Lingkungan Laboratorium & Industri Nyata  |
| - Akuisisi dataset historis keterlambatan 500+ job order PT IMAJIN.                     |
| - Pelatihan model XGBoost delay-risk prediction dengan akurasi F1 > 85%.                |
| - Integrasi Vector DB (Qdrant) untuk pengindeksan 200+ berkas SOP pabrik.              |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
| [BULAN 9 - 14] TRL 6 & 7: Demonstrasi Sistem Purwarupa Penuh di Lingkungan Operasional |
| - Uji coba pilot live 24/7 pada 3 pabrik permesinan CNC di Jawa Barat.                  |
| - Pengesahan audit keselamatan data ISO 27001 dan audit alur keputusan ISO 9001.        |
+-----------------------------------------------------------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
| [BULAN 15 - 24] TRL 8: Sistem Teruji dan Memenuhi Syarat Komersialisasi Penuh          |
| - Peluncuran komersial B2B SaaS terpadu di pasar nasional.                             |
+-----------------------------------------------------------------------------------------+
```