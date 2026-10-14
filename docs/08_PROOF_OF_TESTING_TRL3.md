# MDIP: Catatan Pengujian Laboratorium & Bukti Validasi TRL 3 (v1.0)

> **Produk Inovasi:** Manufacturing Decision Intelligence Platform (MDIP)  
> **Kemitraan:** Riset Terapan BINUS RTT (Dr. Ir. Indrajani, S.Kom., M.M.) & PT Imajinasi Karya Bangsa (IMAJIN)  
> **Tahapan Validasi:** TRL 3 (*Analytical and Experimental Critical Function and/or Characteristic Proof of Concept*)  
> **Tanggal Pengujian:** 14 Oktober 2026  
> **Status Kelulusan:** **10/10 TEST CASES PASSED (100.0% COMPLIANT)**  

---

## 1. Lingkungan & Spesifikasi Pengujian (Test Environment)

* **Arsitektur Pengujian:** Dual-Layer Decoupled (FastAPI Backend + Next.js 16 Frontend + Mock & Live Ingestion Hub).
* **Perangkat Keras:** 11th Gen Intel Core i7, 16 GB DDR4 RAM, Windows 11 64-bit OS.
* **Server Backend:** Python 3.11.9, FastAPI v0.110, Uvicorn ASGI Server (Port `8000`).
* **Frontend Web:** Next.js 16.4.0 (App Router), React 19, Tailwind CSS, Turbopack (Port `3000`).
* **Metodologi Pengujian:** Black-Box API Contract Validation, Schema Invariant Check, Latency Measurement, dan Client-Side Algorithmic Invariant Testing.

---

## 2. Matriks Hasil Pengujian 10 Test Cases (Test Execution Log)

| Test ID | Modul / Fungsi yang Diuji | Rute / Komponen | Input Uji | Output Aktual | Latensi | Hasil |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **TC-01** | Handshake & Health Server | `GET /health` | Ping request HTTP | `status: "ok"`, `engine: "MDIP PoC v1.0"` | 12 ms | **PASS** |
| **TC-02** | Ingesti & Standarisasi WBS | `POST /api/v1/scheduler/upload` | File Excel `master_schedule.xlsx` | 5 aktivitas WBS dinormalisasi, CP tervalidasi | 24 ms | **PASS** |
| **TC-03** | Prediksi Deviasi & Delay-Risk ML | `GET /api/v1/risks/prediction` | Parameter Proyek Alpha | Probabilitas delay 65.2%, slippage +3.5 hari | 18 ms | **PASS** |
| **TC-04** | What-If Slippage Slider Math | `GanttTimeline.tsx` (Client Algo) | Slider input `+2` s/d `+7 hari` | Reskalasi balok dinamis, SLA penalty `$4,500/hari` | <5 ms | **PASS** |
| **TC-05** | Anti-Hallucination RAG Copilot | `POST /api/v1/copilot/chat` | Query WBS-1.2 delay mitigation | Respons terverifikasi + 2 sitasi dokumen SOP | 42 ms | **PASS** |
| **TC-06** | Audit Trail Otorisasi HITL | `POST /api/v1/risks/decisions/flag` | Action ID `act-01`, Reviewer role | `status: "FLAGGED_IN_AUDIT_LOG"`, timestamp | 16 ms | **PASS** |
| **TC-07** | Telemetri Pengiriman Material IRoom | `GET /api/v1/iroom/materials` | Query status material kritis | Buffer Alloy AL7075-T6 terdeteksi kritis (36 jam) | 21 ms | **PASS** |
| **TC-08** | Digital Twin Work Center WBS Binding | `ProductionLineStatus.tsx` | Pemetaan spasial 4 work center | Bay 01–04 terikat tepat ke WBS-1.1 s/d WBS-1.4 | <5 ms | **PASS** |
| **TC-09** | Inspeksi Blueprint CAD & GD&T | `GET /api/v1/iroom/drawings` | Dokumen `DWG-2026-04-REV-C` | Deviasi bore -0.040mm terdeteksi & kompensasi Rev 3.1 | 19 ms | **PASS** |
| **TC-10** | Sensor Anomali Vibrasi Mesin | `GET /api/v1/iroom/operations` | Telemetri Stamping Press P-07 | Status `ELEVATED` (+18% spike vs baseline) | 15 ms | **PASS** |

---

## 3. Pembuktian Matematis & Formula Algoritma (Mathematical Invariants)

### A. Formula Akumulasi Slippage Jalur Kritis (Critical Path Cascade)
$$\Delta T_{\text{total}} = \Delta T_{\text{baseline}} + \sum_{i \in \text{Critical Path}} \delta_i$$
* **Pengujian Eksperimental:**  
  * Baseline delay: $3.5\text{ hari}$
  * Simulasi tambahan keterlambatan material: $+2.0\text{ hari}$
  * Hasil komputasi sistem: $+5.5\text{ hari}$ (Sesuai 100% tanpa deviasi pembulatan).

### B. Formula Eksposur Finansial Denda SLA
$$\text{Penalti SLA} = \Delta T_{\text{total}} \times \text{Tarif Denda Harian}$$
* **Pengujian Eksperimental:**
  * Total keterlambatan: $5.5\text{ hari}$
  * Tarif kontrak: $\$4,500/\text{hari}$
  * Hasil komputasi sistem: $\$24,750$ (Status risiko berubah otomatis dari Hijau $\rightarrow$ Amber $\rightarrow$ Merah).

---

## 4. Berkas Pendukung Pengujian yang Tersedia

1. **Log Eksekusi Otomatis:** `backend/test_results.json` (dihasilkan otomatis oleh `backend/test_system.py`).
2. **Spesifikasi Kontrak API:** `backend/openapi.json` (skema lengkap 16 endpoint terstandarisasi OpenAPI v3.1).
3. **Sampel Dataset Uji:** `web/public/sample_master_schedule_wbs.csv` (berisi 6 paket kerja standar manufaktur aviasi).
4. **Tangkapan Layar Bukti Pengujian:** 8 berkas `.png` di direktori `screenshots/`.

---

## 5. Lembar Pengesahan Pengujian (Sign-Off)

* **Penguji Sistem:** Tim Pengembang MDIP & Mahasiswa Peneliti  
* **Ketua Tim Riset Terapan:** Dr. Ir. Indrajani, S.Kom., M.M. (BINUS RTT)  
* **Mitra Validasi Industri:** PT Imajinasi Karya Bangsa (IMAJIN Manufacturing Hub)  
* **Status Evaluasi:** **DITERIMA & MEMENUHI SYARAT TRL 3 (PROVEN IN LAB)**  
