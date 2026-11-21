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
> | Evaluasi | ROC-AUC | Presisi | Recall | Baseline aturan lama (AUC) |
> |---|---|---|---|---|
> | Uji campuran (sintetis + nyata) | 0,92 | 0,64 | 0,89 | 0,67 |
> | **Proyek nyata yang tidak ikut dilatih** (51 proyek, 936 aktivitas) | **0,78** | **0,36** | **0,45** | 0,53 |
>
> Presisi dan recall diukur pada **ambang 0,25**. Ambang ini dipilih otomatis oleh `backend/ml/train.py` dengan memaksimalkan F1 pada 50 proyek nyata validasi yang disisihkan dari data latih (data uji tidak dipakai). Dibanding ambang bawaan 0,5, recall pada proyek nyata naik dari 0,16 menjadi 0,45 (F1 0,25 → 0,40), sementara presisi turun dari 0,61 menjadi 0,36: sekitar 1 dari 3 aktivitas yang ditandai benar-benar terlambat. Aplikasi menandai aktivitas dengan risiko ≥ 0,25 sebagai **Watch** dan ≥ 0,60 sebagai **Hold**. Dalam *mengurutkan* risiko, model jauh lebih baik dari aturan lama (AUC 0,78 vs 0,53); ambang dan kalibrasi tetap perlu disetel ulang dengan data mitra. Data iRoom dan KPI lain masih berupa data contoh. Frontend memiliki *fallback* ke `web/src/lib/mock-data.ts` sehingga tetap dapat berjalan tanpa backend.
>
> **Sumber data nyata** (diunduh ke `backend/ml/data/raw/`; data mentah maupun turunannya tidak di-commit dan tidak didistribusikan ulang):
> - **DSLIB v3.4** (*Dynamic Scheduling Empirical Project Library*, OR&S Group, Ghent University), basis data proyek empiris: [halaman data OR&S](https://www.projectmanagement.ugent.be/research/data/realdata) · [GitHub](https://github.com/MarioVanhoucke/DSLIB-Dynamic-Scheduling-Empirical-Project-Library). Tidak ada lisensi tertulis (repositori GitHub-nya tanpa berkas LICENSE); data dibagikan untuk penelitian dan pengguna diminta mengutip: Batselier, J. & Vanhoucke, M. (2015). *Construction and evaluation framework for a real-life project database*. International Journal of Project Management, 33(3), 697–710. https://doi.org/10.1016/j.ijproman.2014.09.004
> - **Production Data** (log *job-shop* CNC, Levy 2014): [4TU.ResearchData](https://data.4tu.nl/articles/_/12697997/1), dengan lisensi *4TU General Terms of Use*, yang mewajibkan sitasi berikut: Levy, D. (2014): *Production Analysis with Process Mining Technology*. 4TU.ResearchData. https://doi.org/10.4121/uuid:68726926-5ac5-4fab-b873-ee76ea412399
>
> Untuk pemakaian di luar penelitian dan kompetisi (misalnya komersial), mintalah izin tertulis lebih dulu kepada OR&S Ghent (DSLIB) dan 4TU.ResearchData.

### Cara Kerja Delay-Risk Engine
1. **Ingesti jadwal** (`backend/schedule_parser/`): CSV/XLSX dengan nama kolom fleksibel (ID/Indonesia) dinormalisasi menjadi aktivitas WBS.
2. **CPM**: *forward/backward pass* menghitung *start day*, *total float*, jalur kritis, dan *slip* yang merambat dari aktivitas pendahulu.
3. **XGBoost** (`backend/ml/predictor.py`): klasifikasi peluang tiap aktivitas selesai melewati *float*-nya, plus regresi estimasi hari *slip*. Kontribusi SHAP per fitur menjadi *root-cause drivers*.
4. **Monte Carlo** (2.000 simulasi): *slip* tiap aktivitas disampel lalu dirambatkan lewat jaringan CPM untuk menghasilkan peluang proyek melewati *due date* (baseline + buffer 15%) serta *slippage* P50/P80.

---

## 2. Struktur Repositori Terpadu (Next.js App Router + FastAPI)

```text
youngprenur/ (MDIP)
├── README.md
├── package.json                          # Skrip root (dev/build/start/lint → web/)
├── backend/vercel.json                  # Deploy backend sebagai Vercel Function
├── .mcp.json                             # Konfigurasi MCP (Supabase, Context7) untuk Claude Code
├── .github/workflows/
│   └── ci.yml                            # Lint, unit test & smoke test (frontend di-deploy oleh Vercel)
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
│   │   ├── state.py                      # Jadwal baseline pabrik + jadwal milik tiap pengguna
│   │   ├── security.py                   # Login wajib, rate limit, CORS, mode on-premises
│   │   ├── schemas.py                    # Model request Pydantic
│   │   └── config.py                     # Path & nilai default
│   ├── database/                         # Persistensi: Supabase jika SUPABASE_* key diset, selain itu SQLite
│   │                                     #   _core, accounts, setup, schedules, plant_data, decisions
│   ├── seed_data.py                      # Data contoh awal (IRoom, SOP, akun demo)
│   ├── schedule_parser/                  # Parser jadwal + Critical Path Method (CPM)
│   │                                     #   base, tables, documents, ai_reader, cpm
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
    ├── next.config.ts                    # Konfigurasi Next.js (di-host di Vercel)
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
pip install -r requirements-dev.txt
python -m unittest discover -s tests -p "test_*.py" -t .   # semua unit test (auth, akses, ML, parser, Copilot)
python tests/test_system.py      # suite HTTP, butuh backend aktif → docs/evidence/test_results.json
python scripts/export_openapi.py # kontrak API → docs/evidence/openapi.json

cd ../web
npm run lint && npm run typecheck
npm run build && npm run test:e2e   # smoke test Playwright: menyalakan backend (:8000) dan situs (:3100) sendiri
```
`npm run test:e2e` memakai `python` di PATH; arahkan ke Python lain dengan `MDIP_PYTHON`, atau ke browser terpasang dengan `PLAYWRIGHT_CHANNEL=msedge`. Semua pemeriksaan ini juga berjalan di GitHub Actions (`.github/workflows/ci.yml`) pada setiap push dan pull request.

### E. Deploy
- **Frontend (Vercel):** impor repositori di Vercel dengan **Root Directory** `web`; Vercel membangun ulang setiap push ke `main` dan membuat preview untuk tiap pull request.
- **Backend (Vercel, gratis tanpa kartu):** proyek Vercel kedua dengan **Root Directory** `backend`; Vercel mendeteksi FastAPI di `main.py` dan membangun ulang setiap push ke `main`. Disk function tidak permanen (SQLite di `/tmp` hilang saat cold start), jadi isi `SUPABASE_SERVICE_ROLE_KEY` agar data tersimpan di Supabase.
- Tanpa backend yang di-deploy, situs hanya menampilkan data contoh.

Langkah menghubungkan situs publik ke backend sungguhan:
1. Di Vercel: **Add New → Project**, impor repositori yang sama, set **Root Directory** `backend` (Framework Preset: FastAPI). Di **Settings → Environment Variables** isi `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MDIP_AUTH_SECRET` dan `MDIP_ADMIN_KEY` (string acak panjang, misalnya `python -c "import secrets;print(secrets.token_urlsafe(48))"`), `MDIP_CORS_ORIGINS=https://mdip-ecru.vercel.app`, dan bila perlu `DEEPSEEK_API_KEY` / `GEMINI_API_KEY`. Deployment production Vercel otomatis berjalan dalam mode produksi, yang menolak menandatangani sesi tanpa secret yang kuat. URL backend: domain proyek tersebut, misalnya `https://<nama-proyek>.vercel.app`.
2. Di Supabase: jalankan semua berkas di `supabase/migrations/` (termasuk tabel `user_schedules` untuk jadwal per pengguna).
3. Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di Vercel sebelum build. Di FastAPI, isi `SUPABASE_URL` untuk proyek yang sama dan `MDIP_CORS_ORIGINS` dengan origin frontend.
4. Di Supabase Authentication, aktifkan Email dengan konfirmasi dan Google. Masukkan OAuth client ID dan secret Google di dashboard Supabase. Tambahkan callback `https://mkurfdbznwhgocecombq.supabase.co/auth/v1/callback` ke authorized redirect URIs pada Google Cloud OAuth client.
5. Set Site URL ke origin Vercel. Izinkan URL redirect `<origin>/dashboard` untuk production dan localhost. Gunakan signing key asimetris ES256 atau RS256 aktif untuk verifikasi JWKS oleh FastAPI. Konfigurasikan SMTP untuk email konfirmasi pengguna produksi.

### Migrasi akun lama

Akun baru mendapat workspace dan identitas reviewer `supabase:<UUID>`. Untuk akun lama, verifikasi kepemilikan kedua identitas terlebih dahulu. Dengan Supabase Admin API server-side, set `app_metadata.mdip_user_id` ke ID internal MDIP lama dan, khusus pengguna Firebase, `app_metadata.mdip_firebase_uid` ke UID Firebase lama. Pertahankan field metadata lain ketika memperbarui akun. Pengguna perlu memperbarui sesi sesudahnya. Pemetaan eksplisit ini memulihkan akses ke jadwal, audit, dan grant reviewer lama. Jangan isi metadata ini dari input pengguna. Akun email/password Firebase perlu mendaftar atau diundang ke Supabase. Salin SOP dan record iRoom yang hanya tersimpan di Firestore ke backend sebelum cutover.

Function Vercel dimuat ulang setelah lama tidak dipakai; permintaan pertama butuh beberapa detik, jadi buka `<URL backend>/health` sekali sebelum demo. Retraining model (`/api/v1/ml/retrain`) tidak bisa menyimpan model di Vercel; jalankan secara lokal.

**Akses API:** semua endpoint memerlukan login, kecuali health check, login/registrasi, model card, dan `POST /api/v1/scheduler/inspect` (pratinjau publik CSV/Excel yang tidak menyimpan apa pun). Setiap pengguna punya jadwal aktif sendiri; unggahan satu pengguna tidak mengubah tampilan pengguna lain. Mode **On-premises** di dashboard membuat server tidak memanggil Google Gemini untuk dokumen maupun Copilot.

**Persetujuan produksi:** Tambahkan migrasi `supabase/migrations/20261120010000_workspace_decision_reviews.sql` ke database Supabase dan deploy ulang `firestore.rules` bersama rilis ini. Atur `MDIP_DECISION_REVIEWERS` di Environment Variables proyek backend dengan objek JSON yang memetakan `supabase:<UUID>`, `firebase:<UID>` atau `mdip:<ID akun>` ke peran reviewer, misalnya `{"supabase:UUID_REVIEWER":"Plant Manager"}`. Peran yang dipilih di UI hanya mengatur tampilan dashboard. Review tersimpan di FastAPI setelah status dan audit log berhasil ditulis dalam satu transaksi. Entri lama tanpa pemilik tetap tersimpan di database tetapi tidak muncul di workspace pengguna. Riwayat Firestore lama tetap tersimpan tanpa akses dari klien.
