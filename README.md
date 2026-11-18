# MDIP — Manufacturing Decision Intelligence Platform
## AI Manufacturing Copilot (v3.1)

> **Riset Terverifikasi:** *Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek*  
> **Ketua Peneliti:** Dr. Ir. Indrajani, S.Kom., M.M. (D1521, BINUS RTT)  
> **Mitra Industri:** PT Imajinasi Karya Bangsa (IMAJIN)  

---

## 1. Ikhtisar Platform

MDIP adalah platform pendukung keputusan (*AI Decision Intelligence Layer*) terpadu yang dirancang khusus untuk industri manufaktur berbasis proyek (fabrikasi presisi, permesinan CNC, rekayasa perkakas, dan perakitan sub-sistem). Platform ini menggabungkan:
1. **AI Project Scheduler & Delay-Risk ML Engine:** Ekstraksi struktur aktivitas proyek (WBS) otomatis dari jadwal Excel/PDF tidak baku, normalisasi tanggal terencana vs kapasitas aktual, dan estimasi probabilitas deviasi keterlambatan (*Critical Path Method + Supervised XGBoost* dengan penjelasan *root-cause* berbasis SHAP, serta simulasi Monte Carlo untuk risiko tingkat proyek).
2. **AI Manufacturing Copilot:** Kokpit operasional interaktif berbasis peran kerja (*role-based cockpit*), memonitor risiko kritis secara proaktif, menyajikan rekomendasi tindakan terprioritas (*AI Decision Brief* dengan alur *human-in-the-loop audit review*), dan asisten RAG untuk penelusuran SOP dan panduan penanganan kendala mesin dengan sitasi dokumen terverifikasi (PoC saat ini memakai pencocokan kata kunci atas indeks SOP bawaan).
3. **iRoom Workspace:** Ruang kerja terhubung untuk pengiriman material, progres proyek, persetujuan gambar teknik, quotation & PO, dan pelacakan operasi.

> **Status PoC:** Model XGBoost saat ini dilatih pada **data jadwal sintetis** (7.855 aktivitas dari 900 proyek simulasi, `backend/ml/generate_dataset.py`) karena data historis mitra belum tersedia. Pada proyek uji yang tidak ikut dilatih, model mencapai ROC-AUC 0,93 (baseline aturan lama: 0,70); metrik lengkap ada di `backend/ml/artifacts/model_card.json`. Model akan dilatih ulang dengan data *planned vs. actual* mitra pada fase pilot. Data iRoom dan KPI lain masih berupa data contoh. Frontend memiliki *fallback* ke `web/src/lib/mock-data.ts` sehingga dapat berjalan tanpa backend (misalnya pada GitHub Pages).

### Cara Kerja Delay-Risk Engine
1. **Ingesti jadwal** (`backend/schedule_parser.py`): CSV/XLSX dengan nama kolom fleksibel (ID/Indonesia) dinormalisasi menjadi aktivitas WBS.
2. **CPM**: *forward/backward pass* menghitung *start day*, *total float*, jalur kritis, dan *slip* yang merambat dari aktivitas pendahulu.
3. **XGBoost** (`backend/ml/predictor.py`): klasifikasi peluang tiap aktivitas selesai melewati *float*-nya, plus regresi estimasi hari *slip*. Kontribusi SHAP per fitur menjadi *root-cause drivers*.
4. **Monte Carlo** (2.000 simulasi): *slip* tiap aktivitas disampel lalu dirambatkan lewat jaringan CPM untuk menghasilkan peluang proyek melewati *due date* (baseline + buffer 15%) serta *slippage* P50/P80.

---

## 2. Struktur Repositori Terpadu (Next.js App Router + FastAPI)

```text
youngprenur/ (MDIP)
├── README.md
├── package.json                          # Skrip root (dev/build/start/lint → web/)
├── pyrightconfig.json
├── .github/workflows/
│   └── deploy-pages.yml                  # Static export Next.js → GitHub Pages
│
├── docs/                                 # Dokumentasi & Spesifikasi Resmi
│   ├── MDIP_PRD.md                       # Product Requirement Document
│   ├── MDIP_TRD.md                       # Technical Requirement Document
│   ├── MDIP_DRD.md                       # Decision Requirement Document
│   ├── 01_INNOVATION_IROOM_SPEC.md       # Spesifikasi inovasi iRoom
│   ├── 02_MARKET_RESEARCH_COMPETITORS.md # Riset pasar & kompetitor
│   ├── 03_FEASIBILITY_STUDY.md           # Studi kelayakan
│   ├── 04_BUSINESS_MODEL_SWOT_TOWS.md    # Model bisnis, SWOT & TOWS
│   ├── 05_BUSINESS_PLAN_GTM.md           # Rencana bisnis & go-to-market
│   ├── 06_PITCH_DECK_PROPOSAL.md         # Proposal pitch deck
│   ├── 07_USER_PERSONAS_TARGET_USERS.md  # Persona & target pengguna
│   └── 08_PROOF_OF_TESTING_TRL3.md       # Bukti pengujian TRL 3
│
├── backend/                              # FastAPI Backend
│   ├── main.py                           # Endpoint API, Pydantic model & data contoh
│   ├── schedule_parser.py                # Parser CSV/XLSX + Critical Path Method (CPM)
│   ├── ml/                               # Delay-risk ML
│   │   ├── features.py                   # Fitur bersama untuk training & inferensi
│   │   ├── generate_dataset.py           # Generator data jadwal sintetis
│   │   ├── train.py                      # Training XGBoost + evaluasi + model card
│   │   ├── predictor.py                  # Inferensi, SHAP drivers & Monte Carlo
│   │   ├── data/                         # Dataset sintetis (CSV)
│   │   └── artifacts/                    # Model terlatih (.json) & model_card.json
│   ├── openapi.json                      # Snapshot spesifikasi OpenAPI
│   ├── requirements.txt                  # Python dependencies
│   ├── test_system.py                    # Suite verifikasi sistem (HTTP ke 127.0.0.1:8000)
│   └── test_results.json                 # Hasil eksekusi terakhir test_system.py
│
├── paper/                                # Abstrak lomba (.docx/.pdf), logo & generate_abstract.py
├── screenshots/                          # Tangkapan layar UI untuk dokumentasi
│
└── web/                                  # Next.js App Router Frontend
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts                    # Mode static export saat GITHUB_PAGES=true
    ├── public/
    │   └── sample_master_schedule_wbs.csv  # Contoh jadwal WBS untuk uji unggah
    └── src/
        ├── app/                          # Next.js App Router
        │   ├── layout.tsx
        │   ├── page.tsx                  # Public Architecture Overview
        │   ├── globals.css
        │   ├── (auth)/
        │   │   └── login/
        │   │       └── page.tsx          # Zero-Trust Persona Access Gateway
        │   └── dashboard/                # Shared Dashboard Shell
        │       ├── layout.tsx            # Global Sidebar, Topbar, Copilot & Toast Wrapper
        │       ├── page.tsx              # Overview Cockpit: KPIs, Decision Brief & Risks
        │       ├── iroom/
        │       │   └── page.tsx          # iRoom Workspace
        │       ├── scheduler/
        │       │   └── page.tsx          # AI Scheduler: Gantt, Ingestion & Variance Table
        │       ├── knowledge/
        │       │   └── page.tsx          # Knowledge Base: SOPs & Clause Inspector
        │       └── copilot/
        │           └── page.tsx          # Full-page Grounded Copilot
        │
        ├── components/                   # Shared Layout & UI Primitives
        │   ├── layout/
        │   │   ├── Sidebar.tsx           # App Router Navigation Links
        │   │   ├── Topbar.tsx            # Role Switcher & Live API Indicator
        │   │   └── DisclaimerBanner.tsx  # Integrity Disclaimer
        │   └── ui/
        │       ├── Toast.tsx             # System Notification Toast
        │       └── ReviewModal.tsx       # Human-in-the-Loop Audit Modal
        │
        ├── features/                     # Domain-Driven Feature Modules
        │   ├── dashboard/
        │   │   ├── PerformanceChart.tsx      # Grafik output / OEE / downtime
        │   │   └── ProductionLineStatus.tsx  # Status lini produksi & peta lantai produksi
        │   ├── iroom/
        │   │   └── IRoomWorkspace.tsx    # Material, progres, gambar, quotation/PO, operasi
        │   ├── scheduler/
        │   │   ├── GanttTimeline.tsx     # Interactive Gantt & Critical Path Bar Chart
        │   │   ├── ScheduleUploader.tsx  # Ingestion & Normalization Trigger
        │   │   └── DeviationTable.tsx    # WBS Variance & Float Buffer Table
        │   ├── risks/
        │   │   ├── KpiCards.tsx          # Role-based Metric Cards
        │   │   ├── DecisionBrief.tsx     # AI Prioritized Action Cards
        │   │   └── RisksMonitor.tsx      # Early Warning Signals & Opportunity Register
        │   └── copilot/
        │       ├── ChatDrawer.tsx        # Slide-over Grounded Copilot Drawer
        │       └── CitationBadge.tsx     # Traceable Source Citation Component
        │
        ├── lib/
        │   ├── api.ts                    # Backend API Client with Mock-Data Fallbacks
        │   └── mock-data.ts              # Calibrated Project Manufacturing Mock Data
        │
        └── types/
            └── index.ts                  # TypeScript Type Definitions
```

---

## 3. Cara Menjalankan Aplikasi

### A. Menjalankan Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# Server berjalan di http://localhost:8000
# Dokumentasi Swagger UI: http://localhost:8000/docs
# Endpoint Health Check: http://localhost:8000/api/health
```

### B. Menjalankan Frontend (Next.js)
```bash
cd web
npm install
npm run dev
# Dashboard berjalan di http://localhost:3000
```

Frontend memanggil backend di `http://localhost:8000` secara default; ubah lewat variabel lingkungan `NEXT_PUBLIC_API_URL`. Jika backend tidak aktif, frontend otomatis memakai data contoh.

### C. Melatih Ulang Model Delay-Risk (opsional)
Model terlatih sudah tersimpan di `backend/ml/artifacts/`. Untuk membuat ulang dataset dan melatih ulang:
```bash
cd backend
python -m ml.generate_dataset
python -m ml.train
```

### D. Verifikasi Sistem (TRL 3)
Dengan backend aktif:
```bash
cd backend
python test_system.py
# Hasil disimpan ke backend/test_results.json
```

### E. Deploy ke GitHub Pages
Setiap push ke `main` menjalankan `.github/workflows/deploy-pages.yml`, yang membangun static export (`GITHUB_PAGES=true`, `basePath` `/YoungPrenur`) dan menerbitkannya ke GitHub Pages. Pada mode ini hanya data contoh yang dipakai, karena backend tidak ikut di-deploy.
