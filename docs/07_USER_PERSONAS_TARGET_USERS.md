# MDIP: Pemetaan 6 User Personas & Arsitektur Keputusan 2-Lapisan (v1.0)

> **Produk:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Kemitraan:** Riset Terapan BINUS RTT (Dr. Ir. Indrajani, S.Kom., M.M.) & PT Imajinasi Karya Bangsa (IMAJIN)  
> **Status:** Tervalidasi TRL 3 & Terintegrasi Penuh pada Next.js 16 + FastAPI  

---

## 1. Ikhtisar Kerangka Narasi: Menjembatani Project-Based & Shop-Floor

Dalam manufaktur berbasis proyek (*project-based manufacturing*), operasi pabrik terbagi ke dalam **Dua Lapisan Keputusan** yang saling mengunci:

```
+---------------------------------------------------------------------------------------------------+
|                        LAPISAN MAKRO: TINGKAT PROYEK & RANTAI PASOK INDUK                         |
|                                                                                                   |
|  [Operations Manager]               [Plant Manager]                  [Supply Chain Lead]          |
|  - Jalur Kritis WBS-1.2            - On-Time Delivery Agregat        - Ketahanan Stok Ingot 36h   |
|  - Slippage Kumulatif +3.5d        - Penalti Finansial SLA           - Penerbitan Expedite PO     |
+---------------------------------------------------------------------------------------------------+
                                                  |
                     Siklus Koordinasi Horisontal | Umpan Balik Deviasi WBS
                                                  v
+---------------------------------------------------------------------------------------------------+
|                     LAPISAN MIKRO: TINGKAT EKSEKUSI LANTAI PRODUKSI (SHOP-FLOOR)                  |
|                                                                                                   |
|  [Production Supervisor]            [Maintenance Lead]               [Quality Manager]            |
|  - Throughput Lini 02 (-11%)       - Anomali Getaran Press P-07      - Yield Kualitas (97.1%)     |
|  - Alokasi Shift Operator          - Mitigasi Aus Pahat Potong       - Verifikasi Toleransi GD&T  |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. Matriks 6 User Personas (Target Users Specification)

| # | Nama Persona | Peran & Departemen | Metrik Kunci (KPIs) | Titik Masalah (Pain Points) | Alur Keputusan dalam Demo |
|---|---|---|---|---|---|
| **1** | **Operations Manager** | Manajemen Operasi & Jadwal | OEE Agregat (82.4%), Estimasi Slippage (+3.5 Hari), On-Time Rate (88.4%) | Keterlambatan proyek terdeteksi terlambat; koordinasi lintas divisi terisolasi. | Mengotorisasi lembur operator CNC Cell A untuk memulihkan 80% jalur kritis WBS-1.2. |
| **2** | **Plant Manager** | Pimpinan Pabrik / Eksekutif | Capaian Target Produksi (94.8%), Pesanan Berisiko (7 Order), Biaya Lembur | Kurang visibilitas performa makro pabrik; risiko penalti SLA pelanggan. | Meninjau kompromi antara biaya pengiriman darurat vs penalti keterlambatan order. |
| **3** | **Production Supervisor** | Lini Pemesinan & Perakitan | Throughput Lini 02 (-11%), Utilisasi Spindel (68%), Kualifikasi Operator | Kekurangan operator terlatih di shift berjalan; penumpukan antrian barang. | Menyetujui pergeseran 1 operator bersertifikasi Level 2 dari Lini 4 ke Lini 2. |
| **4** | **Maintenance Lead** | Pemeliharaan Mesin & Fasilitas | Getaran Kompresor (+18%), Rasio MTBF/MTTR, Jam Downtime Tidak Terencana | Kerusakan mendadak pada mesin press hidrolik; ausnya bantalan pahat potong. | Menjadwalkan inspeksi segel hidrolik Komatsu Press P-07 merujuk SOP-PRS-04. |
| **5** | **Quality Manager** | Penjaminan Kualitas (QA/QC) | Yield Kualitas (97.1%), Tingkat Cacat (-0.6%), Deviasi CMM Metrology | Cacat terulang pada batch pengelasan; proses review revisi gambar teknik CAD lama. | Menganalisis kode cacat berulang dan memverifikasi toleransi GD&T gambar teknik. |
| **6** | **Supply Chain Lead** | Pengadaan & Logistik | Jam Ketahanan Stok M-204 (36h), Lead Time Pemasok (3 Hari), Open PO | Bahan baku kritis habis sebelum pengiriman tiba; vendor sekunder belum siap. | Menerbitkan Purchase Order darurat (Expedite PO) untuk pelat paduan aluminium. |

---

## 3. Implementasi Teknis & Akses Cepat Demo (Next.js 16 + React 19)

1. **Role Matrix Explorer (`http://localhost:3000/#role-matrix`):**
   * Menampilkan tab interaktif 6 persona pada halaman muka.
   * Tombol *Launch [Persona] View* meneruskan parameter URL dinamis: `/dashboard?role=${encodeURIComponent(activeRoleTab)}`.
2. **Dual-Panel Fast Access (`http://localhost:3000/login`):**
   * Menyajikan 6 tombol persona dengan subteks operasional.
   * Akses instan 1-Click Login tanpa perlu mengetik kredensial manual saat presentasi juri.
3. **Bebas SSR Hydration Error (Zero Hydration Mismatch):**
   * Parameter `?role=` disinkronisasi melalui komponen `<Suspense fallback={null}><SearchParamsSync /></Suspense>` berbasis `useSearchParams()` dari `next/navigation`, menjamin transisi klien mulus tanpa reload halaman.

---

## 4. Teks Tambahan untuk Formulir Elabora (Test Log & Bukti Uji TRL 3)

### Cara Pengujian (How it was tested):
```text
Menguji fitur 1-Click Persona Fast Access pada halaman /login dan tab Role Matrix Explorer pada /#role-matrix menggunakan parameter URL dinamis (/dashboard?role=...) untuk memverifikasi sinkronisasi state otomatis pada 6 jabatan manufaktur tanpa reload manual.
```

### Berkas Tangkapan Layar Tersedia di Folder `screenshots/`:
* `foto_1_dashboard_utama.png` — Cockpit utama dengan KPI, grafik SVG harian, dan lini produksi.
* `foto_2_modul_iroom.png` — Agregasi 5 aliran data IRoom System.
* `foto_3_copilot_citations.png` — Manufacturing Copilot dengan lencana sitasi dokumen teknik resmi.
* `foto_4_persona_access_login.png` — Layar autentikasi cepat 6 user personas.
* `foto_5_role_matrix_landing.png` — Bagian Role Matrix Explorer pada halaman muka.