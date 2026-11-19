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

> **Status PoC:** Model XGBoost (*hurdle model*: klasifikasi terlambat + regresi slip) dilatih pada **4.149 aktivitas historis nyata** (251 proyek publik: DSLIB dan log CNC 4TU, bobot 5×) ditambah **7.855 aktivitas sintetis** (900 proyek simulasi, `backend/ml/generate_dataset.py`). Data mitra (PT IMAJIN) belum tersedia dan akan dipakai pada fase pilot. Metrik lengkap ada di `backend/ml/artifacts/model_card.json`:
>
> | Evaluasi | ROC-AUC | Recall (ambang 0,5) | Baseline aturan lama |
> |---|---|---|---|
> | Uji campuran (sintetis + nyata) | 0,92 | 0,78 | 0,67 |
> | **Proyek nyata yang tidak ikut dilatih** (51 proyek, 936 aktivitas) | **0,78** | **0,16** | 0,53 |
>
> Pada data nyata model jauh lebih baik dari aturan lama dalam *mengurutkan* risiko (AUC 0,78 vs 0,53), tetapi pada ambang 0,5 baru menangkap ~16% aktivitas yang benar-benar terlambat; ambang dan kalibrasi perlu disetel dengan data mitra. Data iRoom dan KPI lain masih berupa data contoh. Frontend memiliki *fallback* ke `web/src/lib/mock-data.ts` sehingga dapat berjalan tanpa backend (misalnya pada GitHub Pages).
>
> **Sumber data nyata** (diunduh ke `backend/ml/data/raw/`, tidak di-commit): DSLIB v3.4 (UGent, basis data proyek empiris) dan 4TU *Production_Data.csv* (Levy 2014, log *job-shop* CNC). *TODO: cantumkan tautan unduhan resmi dan lisensi masing-masing dataset di sini sebelum publikasi.*

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
├── render.yaml                           # Deploy backend ke Render
├── .mcp.json                             # Konfigurasi MCP (Supabase, Context7) untuk Claude Code
├── .github/workflows/
│   └── deploy-pages.yml                  # Static export Next.js → GitHub Pages
│
├── docs/
│   ├── MDIP_PRD.md / MDIP_TRD.md / MDIP_DRD.md   # Product / Technical / Decision Requirement Docs
│   ├── 01_…08_*.md                       # Dokumen lomba: inovasi, riset pasar, kelayakan, SWOT/TOWS,
│   │                                     #   rencana bisnis, pitch deck, persona, bukti uji TRL 3
│   ├── evidence/
│   │   ├── test_results.json             # Log otomatis dari backend/tests/test_system.py
│   │   └── openapi.json                  # Kontrak API (python scripts/export_openapi.py)
│   └── handoffs/                         # Catatan serah-terima antar agen AI
│
├── supabase/migrations/                  # Skema Postgres untuk mode Supabase
│
├── backend/                              # FastAPI Backend
│   ├── main.py                           # Entrypoint: membuat app + memasang router
│   ├── app/
│   │   ├── api/                          # Router per area: auth, system, scheduler, risks, ml,
│   │   │                                 #   iroom, dashboard, knowledge, legacy (pra-v1)
│   │   ├── services/
│   │   │   ├── insights.py               # Decision brief, KPI, lini produksi, performa, ringkasan IRoom
│   │   │   └── copilot.py                # Copilot SOP (retrieval + sintesis Gemini opsional)
│   │   ├── state.py                      # Analisis jadwal aktif (dibagi semua router)
│   │   ├── schemas.py                    # Model request Pydantic
│   │   └── config.py                     # Path & nilai default
│   ├── database.py                       # Persistensi: Supabase jika SUPABASE_* key diset, selain itu SQLite
│   ├── seed_data.py                      # Data contoh awal (IRoom, SOP, akun demo)
│   ├── schedule_parser.py                # Parser CSV/XLSX + Critical Path Method (CPM)
│   ├── ml/
│   │   ├── features.py                   # Fitur bersama untuk training & inferensi
│   │   ├── generate_dataset.py           # Generator data jadwal sintetis
│   │   ├── build_real_dataset.py         # ETL dataset nyata (DSLIB + 4TU CNC) tanpa kebocoran label
│   │   ├── train.py                      # Training XGBoost + evaluasi + model card
│   │   ├── predictor.py                  # Inferensi, SHAP drivers & Monte Carlo
│   │   ├── data/                         # Dataset sintetis (tracked); historis & raw/ (tidak di-commit)
│   │   └── artifacts/                    # Model terlatih (.json) & model_card.json
│   ├── data/                             # Jadwal contoh (CSV); mdip.db lokal (tidak di-commit)
│   ├── scripts/export_openapi.py         # Membuat ulang docs/evidence/openapi.json
│   ├── tests/                            # Unit test (auth, ML) & suite verifikasi sistem HTTP
│   ├── Dockerfile / requirements.txt / .env.example
│
└── web/                                  # Next.js App Router Frontend
    ├── next.config.ts                    # Mode static export saat GITHUB_PAGES=true
    ├── public/sample_master_schedule_wbs.csv
    └── src/
        ├── app/                          # Halaman: landing, (auth)/login, dashboard/{overview,
        │                                 #   iroom, scheduler, knowledge, copilot}
        ├── components/
        │   ├── layout/                   # Navbar, Sidebar, Topbar, DisclaimerBanner
        │   └── ui/                       # MdipLogo, Toast, ReviewModal (HITL audit)
        ├── features/
        │   ├── dashboard/                # PerformanceChart, ProductionLineStatus
        │   ├── iroom/
        │   │   ├── IRoomWorkspace.tsx    # Shell: tab, pencarian, tambah record, aksi AI
        │   │   ├── IRoomTable.tsx        # Tabel bersama
        │   │   └── tabs/                 # Material, Progress, Drawing (CAD inspector), Quotation, Operations
        │   ├── scheduler/                # GanttTimeline, ScheduleUploader, DeviationTable
        │   ├── risks/                    # KpiCards, DecisionBrief, RisksMonitor, ModelCardStrip
        │   └── copilot/                  # ChatDrawer, CitationBadge
        ├── lib/                          # api.ts (klien API + fallback), mock-data.ts
        └── types/index.ts
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
python -m ml.generate_dataset      # data sintetis
python -m ml.build_real_dataset    # data nyata (butuh berkas di ml/data/raw/)
python -m ml.train
```
Retraining lewat API (`POST /api/v1/ml/retrain`) hanya aktif jika server memiliki `MDIP_ADMIN_KEY`, dan permintaan harus mengirim header `X-Admin-Key`.

### D. Pengujian & Verifikasi Sistem (TRL 3)
```bash
cd backend
python -m unittest discover -s tests -p "test_[am]*.py"   # unit test auth & ML
python tests/test_system.py      # suite HTTP, butuh backend aktif → docs/evidence/test_results.json
python scripts/export_openapi.py # kontrak API → docs/evidence/openapi.json
```

### E. Deploy
- **Frontend (GitHub Pages):** setiap push ke `main` menjalankan `.github/workflows/deploy-pages.yml`, yang membangun static export (`GITHUB_PAGES=true`, `basePath` `/YoungPrenur`).
- **Backend (Render):** `render.yaml` men-deploy folder `backend/` (`uvicorn main:app`). Isi `SUPABASE_SERVICE_ROLE_KEY` agar data tersimpan di Supabase; tanpa itu backend memakai SQLite lokal yang hilang saat server restart.
- Tanpa backend yang di-deploy, situs GitHub Pages hanya menampilkan data contoh.
