# MDIP — Manufacturing Decision Intelligence Platform
## AI Manufacturing Copilot (v3.1)

> **Riset Terverifikasi:** *Sistem Inteligensi Penjadwalan dan Pendukung Keputusan Berbasis AI untuk Mitigasi Risiko Keterlambatan pada Manufaktur Berbasis Proyek*  
> **Ketua Peneliti:** Dr. Ir. Indrajani, S.Kom., M.M. (D1521, BINUS RTT)  
> **Mitra Industri:** PT Imajinasi Karya Bangsa (IMAJIN)  

---

## 1. Ikhtisar Platform

MDIP adalah platform pendukung keputusan (*AI Decision Intelligence Layer*) terpadu yang dirancang khusus untuk industri manufaktur berbasis proyek (fabrikasi presisi, permesinan CNC, rekayasa perkakas, dan perakitan sub-sistem). Platform ini menggabungkan:
1. **AI Project Scheduler & Delay-Risk ML Engine:** Ekstraksi struktur aktivitas proyek (WBS) otomatis dari jadwal Excel/PDF tidak baku, normalisasi tanggal terencana vs kapasitas aktual, dan estimasi probabilitas deviasi keterlambatan (*Critical Path Method + Supervised XGBoost*).
2. **AI Manufacturing Copilot:** Kokpit operasional interaktif berbasis peran kerja (*role-based cockpit*), memonitor risiko kritis secara proaktif, menyajikan rekomendasi tindakan terprioritas (*AI Decision Brief* dengan alur *human-in-the-loop audit review*), dan asisten RAG untuk penelusuran SOP dan panduan penanganan kendala mesin dengan sitasi dokumen terverifikasi.

---

## 2. Struktur Repositori Terpadu (Next.js App Router + FastAPI)

```text
youngprenur/ (MDIP)
├── README.md
├── pyrightconfig.json
│
├── docs/                                 # Dokumentasi & Spesifikasi Resmi
│   ├── MDIP_PRD.md                       # Product Requirement Document
│   ├── MDIP_TRD.md                       # Technical Requirement Document
│   └── MDIP_DRD.md                       # Decision Requirement Document
│
├── backend/                              # FastAPI Backend & Intelligence Services
│   ├── main.py                           # API Entrypoint & Router Mounts
│   ├── requirements.txt                  # Python dependencies
│   └── app/
│       ├── api/                          # Thin Route Controllers
│       │   ├── scheduler.py              # WBS ingestion & deviation endpoints
│       │   ├── risks.py                  # Delay-risk prediction & action review endpoints
│       │   ├── copilot.py                # RAG Q&A with grounded citations
│       │   └── dashboard.py              # Role summaries & executive export brief
│       ├── services/                     # Core Intelligence & Business Logic
│       │   ├── parser.py                 # Excel/PDF schedule normalization
│       │   ├── delay_risk.py             # Critical Path Method (CPM) & ML risk engine
│       │   └── rag_copilot.py            # Knowledge retrieval & citation grounding
│       ├── schemas/                      # Pydantic Data Models
│       │   └── project.py                # Standardized WBS, risk & citation schemas
│       └── data/                         # Seed Data & Knowledge Base
│           ├── knowledge_docs.py         # Indexed manufacturing SOPs & technical standards
│           └── sample_schedules.py       # Standardized project manufacturing schedules
│
└── web/                                  # Next.js App Router Frontend
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    └── src/
        ├── app/                          # Next.js App Router (Real Sub-Routes)
        │   ├── layout.tsx
        │   ├── page.tsx                  # Public Architecture Overview
        │   ├── globals.css
        │   ├── (auth)/
        │   │   └── login/
        │   │       └── page.tsx          # Zero-Trust Persona Access Gateway
        │   └── dashboard/                # Shared Dashboard Shell
        │       ├── layout.tsx            # Global Sidebar, Topbar, Copilot & Toast Wrapper
        │       ├── page.tsx              # Overview Cockpit: KPIs, Decision Brief & Risks
        │       ├── scheduler/
        │       │   └── page.tsx          # AI Scheduler: Gantt, Ingestion & Variance Table
        │       └── knowledge/
        │           └── page.tsx          # Knowledge Base: SOPs & Clause Inspector
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
        ├── lib/                          # Single Lib Directory
        │   ├── api.ts                    # Backend API Client with Resilient Fallbacks
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
python main.py
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
