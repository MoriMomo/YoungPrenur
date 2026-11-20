# MDIP Product & Frontend Redesign Handoff

> Historical handoff. For current deployment and review setup, use the repository README and PRODUCT.md.

**Purpose:** Complete architectural, functional, design, and API contract handoff for redesigning the **MDIP (`web/`)** frontend from scratch or doing a deep visual/UX overhaul with another AI coding agent, while keeping the FastAPI backend (`backend/`), XGBoost + CPM ML engine (`backend/ml/`), SQLite + Supabase Postgres database (`backend/database.py`), authentication, and GitHub Pages static deployment intact.

---

## 1. Product Vision, Domain & Target Users

### What MDIP Is
**MDIP (Manufacturing Decision Intelligence Platform)** is an AI operations cockpit built for **custom / project-based Engineer-to-Order (ETO) and Make-to-Order (MTO) manufacturing** (industry partner context: **PT Imajinasi Karya Bangsa / IMAJIN**, research grant **BINUS RTT D1521** — CNC 5-axis milling, precision stamping, Wire EDM, subcontract heat treatment, CMM metrology, assembly, and logistics dispatch).

Instead of passively logging delays after a shift slips, MDIP:
1. **Ingests plant schedules** (CSV/XLSX) and computes **Critical Path Method (CPM)** early/late dates, total float, and upstream slippage propagation (`backend/schedule_parser.py`).
2. **Scores per-task delay risk** with a trained **two-stage XGBoost hurdle model** (`XGBClassifier` late probability + `XGBRegressor` conditional slip days + per-task SHAP root-cause drivers) and **2,000-run Gamma-frailty Monte Carlo simulation** (`backend/ml/predictor.py`).
3. **Surfaces plant telemetry** across 5 live IRoom streams (`materials`, `progress`, `drawings`, `quotations`, `operations`).
4. **Generates prioritized Human-in-the-Loop (HITL) mitigation decisions** linked to SOP clauses, recording every authorization or override into an **ISO 9001 Cl. 7.5 / AS9100D audit log**.
5. **Provides a Grounded SOP Copilot** that answers operator questions by citing real active WBS tasks, IRoom alerts, and indexed SOP clauses (`backend/main.py`).

### Target Personas (`web/src/types/index.ts` -> `ManufacturingRole`)
Every user operates within one of **6 selectable plant roles**, mapped internally to B2B Buying Center personas (`Economic Buyer`, `Operational Buyer`, `Technical Evaluator`):
1. `Operations Manager` — prioritizes cross-department schedule attainment, critical-path slippage, and HITL approvals.
2. `Plant Manager` — executive plant output, OEE, SLA penalty exposure, and on-prem vs. SaaS compliance.
3. `Production Supervisor` — shift allocation, bottlenecks (CNC milling, Stamping Press Bays, Cell 02 assembly).
4. `Maintenance Lead` — spindle utilization, elevated/critical vibration sensors, SOP preventative checks (`SOP-PRS-04`).
5. `Quality Manager` — CMM metrology acceptance gates, drawing revision approvals, audit trail traceability.
6. `Supply Chain Lead` — raw ingot/alloy stock cover (`<= 48h`), vendor lead times, expedited PO triggers (`SOP-SCM-12`).

---

## 2. Tech Stack & Build Architecture Constraints

### Frontend (`web/`)
- **Framework:** `next@16.4.6` (App Router, Turbopack), `react@19.3.0`, `react-dom@19.3.0`, `typescript@^5`
- **Styling:** `tailwindcss@^4` + `@tailwindcss/turbopack@^4`, `next/font/google` (`Geist` + `Geist_Mono`)
- **Icons & Motion:** `lucide-react@^1.56.0`, `gsap@^3.15.0`
- **Browserslist (`web/package.json`):** `Chrome >= 121`, `Edge >= 121`, `Firefox >= 121`, `Safari >= 18.2`
- **Deployment Targets (CRITICAL CONSTRAINT):**
  - Standard dev/Node build: `npm run dev` / `npm run build` (`cacheComponents: true`, `partialPrefetching: true` in `web/next.config.ts`).
  - **GitHub Pages Static Export:** `GITHUB_PAGES=true npm run build` (sets `output: "export"`, `basePath: "/YoungPrenur"`, `trailingSlash: true`, `images: { unoptimized: true }`).
  - **Rule for redesign:** Keep all pages client-compatible with `output: "export"`! **Never** add dynamic un-generated server routes (`[id]` without `generateStaticParams`), `cookies()`/`headers()` Next.js server components, or Next API route handlers inside `web/` (all backend APIs live in FastAPI under `backend/`). Prefix `public/` asset fetches (like `/sample_master_schedule_wbs.csv`) with `process.env.NEXT_PUBLIC_BASE_PATH || ""`.

### Backend (`backend/`)
- **API:** FastAPI `0.115.0` + Uvicorn `0.30.6` (`backend/main.py`)
- **Database:** Dual persistence (`backend/database.py`): Supabase Postgres via PostgREST (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, schema in `supabase/migrations/20261119000000_mdip_schema.sql`) with automatic local SQLite fallback (`backend/data/mdip.db`).
- **ML Stack:** `xgboost-cpu==3.2.0`, `scikit-learn==1.9.1`, `pandas==3.1.1`, `numpy==2.4.6`, `openpyxl==3.1.5`.
- **Deployment:** Docker (`backend/Dockerfile`) / Render free tier (`render.yaml` pointing `healthCheckPath: /api/health`).

---

## 3. Complete Frontend Route & File Inventory (`web/src/`)

### App Routes (10 prerendered static build targets incl. `/_not-found`)
| Route | File | Current Role in App |
|---|---|---|
| `/` | `web/src/app/page.tsx` | Public product landing page: dark telemetry strip, asymmetric split hero + coded WBS/cockpit preview, D1–D6 capability cards, interactive 6-role Buying Center switcher, research footer. |
| `/login` | `web/src/app/(auth)/login/page.tsx` | Dark gateway: 6 quick-persona login buttons, Plant Role selector, **Continue with Google** (GIS), Sign In / Sign Up email+password tabs. |
| `/dashboard` | `web/src/app/dashboard/page.tsx` | Role-scoped Operations Cockpit: KPI cards, real-data `ModelCardStrip`, 7-day OEE/downtime/output `PerformanceChart`, `DecisionBrief` queue, `ProductionLineStatus`, `RisksMonitor`, ISO 9001 HITL Audit Log, BMC Table VI Pilot Checklist. |
| `/dashboard/iroom` | `web/src/app/dashboard/iroom/page.tsx` | Thin route wrapper mounting `IRoomWorkspace` (5 telemetry tabs + ingest form). |
| `/dashboard/scheduler` | `web/src/app/dashboard/scheduler/page.tsx` | CSV/XLSX `ScheduleUploader`, delay-risk & P50 slippage summary + SHAP drivers, live `ModelCardStrip`, `GanttTimeline`, `DeviationTable`. |
| `/dashboard/knowledge` | `web/src/app/dashboard/knowledge/page.tsx` | Searchable SOP repository + SOP clause viewer + `POST /api/v1/knowledge/ingest` drawer/form (`?doc=SOP-...` deep-link support). |
| `/dashboard/copilot` | `web/src/app/dashboard/copilot/page.tsx` | Full-screen Grounded Copilot Console with quick manufacturing prompts and clickable `CitationBadge` links to `/dashboard/knowledge?doc=...`. |

### Full `web/src/` File Tree (31 files)
- **Core / Shared:**
  - `web/src/app/layout.tsx` (Geist fonts, root metadata, `#f6f7f9` body canvas)
  - `web/src/app/globals.css` (Tailwind v4 `@import "tailwindcss"`, CSS variables, `.font-mono-numbers`, WebKit custom scrollbars)
  - `web/src/app/dashboard/layout.tsx` (`DashboardContext` provider holding `selectedRole`, `deploymentMode` SaaS vs Internal VPC, `isApiLive`, `actions`, `auditLog`, `chatMessages`, `Toast`, `ReviewModal`, slide-over `ChatDrawer`)
  - `web/src/types/index.ts` (all strict TypeScript domain interfaces)
  - `web/src/lib/api.ts` (`798` lines — complete API client with offline fallback handlers)
  - `web/src/lib/mock-data.ts` (`ROLES`, `ROLE_PRESETS`, `INITIAL_ACTIONS`, `INITIAL_AUDIT_LOG`, `WBS_TASKS`, `RISK_DRIVERS`, `PILOT_CHECKS`, `RISKS_AND_OPPORTUNITIES`, `KNOWLEDGE_DOCS`)
- **Shell Components (`web/src/components/`):**
  - `layout/Sidebar.tsx`, `layout/Topbar.tsx`, `layout/DisclaimerBanner.tsx`
  - `ui/ReviewModal.tsx` (HITL Authorize/Override modal with checklist + reason notes), `ui/Toast.tsx`
- **Feature Modules (`web/src/features/`):**
  - `dashboard/PerformanceChart.tsx` (interactive SVG chart for `output`, `oee`, `downtime`)
  - `dashboard/ProductionLineStatus.tsx` (work-center utilization & status table)
  - `risks/KpiCards.tsx`, `risks/ModelCardStrip.tsx`, `risks/DecisionBrief.tsx`, `risks/RisksMonitor.tsx`
  - `scheduler/ScheduleUploader.tsx`, `scheduler/GanttTimeline.tsx`, `scheduler/DeviationTable.tsx`
  - `copilot/ChatDrawer.tsx`, `copilot/CitationBadge.tsx`
  - `iroom/IRoomWorkspace.tsx` (**47.5 KB — `#1` Fallow complexity hotspot (`cognitive: 72`, `cyclomatic: 45`) — split this into per-stream subcomponents during redesign!**)

---

## 4. Exact Backend API & `api.ts` Contracts (Preserve During Redesign)

All backend URLs resolve from:
`API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "")` and `API_BASE = ${API_ORIGIN}/api/v1`.
Redesigning components MUST keep calling `web/src/lib/api.ts` (or matching these exact FastAPI contracts):

| Group | Method & Path | Purpose & Key Response Fields |
|---|---|---|
| **Auth** | `POST /api/v1/auth/register` | `{ email, password, name, role }` -> `{ success, token, user }` |
| | `POST /api/v1/auth/login` | `{ email, password }` -> `{ success, token, user }` |
| | `POST /api/v1/auth/google` | `{ id_token, role }` -> verifies Google JWT via `GOOGLE_CLIENT_ID`, upserts user, returns `{ success, token, user, provider: "google" }` |
| | `GET /api/v1/auth/me` | Header `Authorization: Bearer <token>` -> `{ authenticated, user }` |
| **Health / DB** | `GET /health`, `GET /api/health`, `GET /api/v1/db/status` | Service liveness, active filename, `active_engine` (`supabase` or `sqlite`) |
| **Dashboard** | `GET /api/v1/dashboard/overview?role=...` | Role-scoped header, `kpis`, `decision_actions`, live `metrics` |
| | `GET /api/v1/dashboard/lines` | Array of `ProductionLineItem` derived from IRoom operations / active WBS |
| | `GET /api/v1/dashboard/export?role=...` | Plain operational summary payload |
| | `GET /api/v1/analytics/performance?metric=output\|oee\|downtime` | 7-day curve `{ actual, target, labels, min, max, unit }` |
| **Scheduler** | `GET /api/v1/scheduler/wbs` | Active CPM-scored WBS tasks |
| | `POST /api/v1/scheduler/upload` | Multipart CSV/XLSX upload (`max 5 MB`); falls back to bundled baseline CSV if no file |
| | `POST /api/scheduler/upload` | Legacy parse summary route |
| **ML & Risk** | `GET /api/v1/risks/prediction` | Full `DelayRiskPrediction`: `overall_delay_probability`, `estimated_project_slippage_days`, `p80_slippage_days`, `risk_drivers`, `tasks`, `methodology` |
| | `GET /api/v1/ml/model-card` | Full `model_card.json` (`n_tasks`, `n_real_tasks`, `n_projects`, `synthetic_test_metrics`, `real_validation_metrics`, `feature_importance`) |
| | `POST /api/v1/ml/retrain` | Multipart finished CSV/XLSX + `project_id` query + `X-Admin-Key` header |
| | `POST /api/risks/evaluate` | Legacy stateless task list evaluator |
| **HITL & Audit** | `GET /api/v1/risks/decisions` | Live sorted decision actions derived from XGBoost tasks + IRoom alerts |
| | `POST /api/v1/risks/decisions/flag` | `{ action_id, decision, reviewer_role, notes }` -> persists status + ISO audit row |
| | `GET /api/v1/risks/audit-log` | Reverse-chronological HITL `AuditLogEntry[]` |
| **IRoom** | `GET /api/v1/iroom/{materials\|progress\|drawings\|quotations\|operations}` | Individual IRoom telemetry tables |
| | `GET /api/v1/iroom/overview` | Combined overview stats across all 5 IRoom streams |
| | `POST /api/v1/iroom/{stream}` | Upsert new record into selected IRoom stream (`X-Stream` payload) |
| **RAG / Copilot** | `GET /api/v1/knowledge/docs` | All SOP documents (`doc_code`, `title`, `clause`, `keywords`, `excerpt`) |
| | `POST /api/v1/knowledge/ingest` | Upsert new SOP clause document into `sop_documents` |
| | `POST /api/v1/copilot/chat` (also alias `POST /api/copilot/ask`) | `{ message, active_role }` -> grounded answer + `citations[]` |

---

## 5. Authentication & Offline Resilience Contract

1. **Session Storage (`web/src/lib/api.ts`):**
   - Stores `{ token, user, mode: "backend" | "sandbox" }` under `localStorage["mdip_session_v1"]` (key used by `getStoredSession()` and `clearStoredSession()`).
   - Default seeded persona accounts (when backend runs SQLite): `ops.lead@mdip.id`, `plant.manager@mdip.id`, `production.supervisor@mdip.id`, `maintenance.lead@mdip.id`, `quality.manager@mdip.id`, `supply.chain.lead@mdip.id` (default password: `imajin2026`).
2. **Google Sign-In (Google Identity Services):**
   - Frontend loads `https://accounts.google.com/gsi/client` using `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
   - User picks their `Plant Role` **before** clicking Google's Sign-In button; `callback` sends `{ id_token, role }` to `POST /api/v1/auth/google`.
   - Backend validates `aud == GOOGLE_CLIENT_ID`, `iss` in Google accounts issuers, `email_verified == true`, and `exp > now`, upserts user in SQLite/Supabase, and issues an MDIP HMAC token.
   - **Important:** Redesign MUST preserve the graceful offline fallback (`mode: "sandbox"`) when the FastAPI backend is asleep/offline (e.g., cold-starting Render free tier or static GitHub Pages demo mode), and never show raw crashes if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is unset.

---

## 6. Real ML & RAG Capabilities (No Fake AI Claims)

The redesign MUST represent what the system actually computes without fabricating accuracy numbers:
- **ML Architecture (`backend/ml/`):**
  - **Two-stage XGBoost hurdle model** (`delay_risk_classifier.json` + `delay_slip_regressor.json`) using **18 features** (`planned_days`, `float_days`, `on_critical_path`, `forecast_variance_days`, `upstream_slip_days`, `external_dependency`, `n_predecessors`, `resource_utilization`, `drawing_revisions`, plus 9 one-hot `wc_*` work centers).
  - **2,000-run correlated Gamma-frailty Monte Carlo CPM simulator** (`simulate_project`) reporting P50/P80 slippage against a `15%` project buffer.
- **Actual Trained Metrics (`backend/ml/artifacts/model_card.json`):**
  - Training corpus: **`12,004` tasks across `1,151` projects** = **`4,149` real empirical tasks across `251` real projects** (`75` DSLIB DAG projects + `176` 4TU CNC machining orders, `5.0x` weight) + `7,855` synthetic tasks (`900` simulated projects).
  - **Held-out real validation (`51` real projects, `936` tasks):** `roc_auc = 0.7833` vs. `baseline_rule_roc_auc = 0.5277`, `slip_mae_days = 0.69`, `brier = 0.1013`.
    - `dslib` subset (`15` projects, `537` tasks): `roc_auc = 0.8122`, `slip_mae_days = 0.885`
    - `cnc` subset (`36` orders, `399` tasks): `roc_auc = 0.7547`, `slip_mae_days = 0.428`
  - **Synthetic held-out test (`1,562` tasks):** `roc_auc = 0.9257`, `f1 = 0.8374`.
- **COPILOT RAG Truthfulness:**
  - Uses **in-memory IDF token + keyword retrieval** over `sop_documents` + active WBS tasks + live IRoom rows (`_run_grounded_copilot`), with optional `GEMINI_API_KEY` natural-language synthesis (`gemini-2.5-flash`).
  - **There is currently NO vector database / `pgvector` embedding store** — do not label it "vector search" or "semantic embedding DB" unless you also build pgvector.

---

## 7. Design Direction, Current Issues & Redesign Brief

### Current Design Tokens (`web/src/app/globals.css`)
- **Dark Shell / Landing / Gateway:** `#07080d` (recessed panel), `#0b0d14` (page bg), `#0d131c` (sidebar), `#11141c` (cards), `#1a1e28` (raised inputs), `#eef0f5` / `#a3a9b8` / `#8f98ab` (text ramp), `white/8` hairlines.
- **Light App Workspace (`dashboard/*`):** `#f6f7f9` (canvas), `#ffffff` (cards), `#e5e7eb` (borders), `#111827` / `#4b5565` / `#64748b` (ink ramp).
- **Accent & Semantic:** `#2563eb` (primary blue accent), `#16a34a` / `#4cc38a` (normal/on-track), `#d97706` / `#f59e0b` (warning), `#dc2626` / `#e5484d` (critical risk).
- **Typography:** `Geist` (`--font-geist-sans`) + `Geist Mono` (`--font-geist-mono` with `.font-mono-numbers` tabular numerals).

### Known UX / UI Weaknesses Worth Redesigning
1. **`IRoomWorkspace.tsx` (`1,119` lines, `cognitive: 72`):** Monolithic component mixing 5 domain tables (`Materials`, `Projects`, `Drawings`, `Quotations`, `Operations`), modal add-record forms, search/filtering, and Copilot triggers. Split cleanly into reusable table primitives + per-stream configs.
2. **Dark vs. Light Visual Discontinuity:** Landing + Login use a dark machined-graphite palette (`#0b0d14`), whereas all `/dashboard/*` views switch abruptly to a white/light canvas (`#f6f7f9`) with a dark `#0d131c` sidebar. Decide cleanly during redesign: either unify into one unmistakable industrial instrument design language across Landing -> Login -> Cockpit, or make the dark-to-light handoff feel deeply intentional.
3. **Interactive Visualization Depth:** `PerformanceChart.tsx` (custom SVG polyline) and `GanttTimeline.tsx` work cleanly, but during a ground-up redesign you can elevate the **WBS Critical Path Gantt + Monte Carlo slip distribution** into an iconic, signature interactive centerpiece (`Unforgettable Moment`).
4. **Surface Residual Colors:** A few components (`Dashboard` sub-components like `ProductionLineStatus.tsx` or `ReviewModal.tsx`) still mix slate `#cbd5e1` / `#e2eaf3` / `#101e30` shades with `#e5e7eb` / `#111827`. Standardize strictly onto one neutral ramp.
5. **Dual Role Switcher Clarity:** Currently both `Login` (6 quick personas + role dropdown) and `Topbar` (role switcher dropdown) exist; ensure signed-in role updates stay synced with `DashboardLayout` state cleanly.

### Anti-Slop Guardrails (Mandatory)
- **Zero** purple/cyan neon gradients, gradient text headings, glowing blurs/blobs, emoji icons (`🚀`, `✨`, `⚡`), `"PRO"`/`"Beta"` filler pills, `animate-pulse` on static badges, `transition-all`, or `font-extrabold`/`font-black`.
- **Keep chrome quiet;** put visual richness into **data telemetry, the WBS critical path Gantt, SHAP driver bars, and real numbers** using `tabular-nums` (`font-mono-numbers`).

---

## 8. Non-Negotiable Env Vars & Quality Gates

### Environment Variables (Never Commit Secrets)
- **`web/.env.local` (see `web/.env.example`):**
  - `NEXT_PUBLIC_API_URL=http://localhost:8000`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID=` *(Web OAuth Client ID; mirrored in GitHub Repo Actions Variables)*
- **`backend/.env` (see `backend/.env.example`):**
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `MDIP_AUTH_SECRET`, `MDIP_ADMIN_KEY`, `GOOGLE_CLIENT_ID`

### Commands Every Redesign Agent MUST Pass Before Handing Back
Run from repo root (`youngprenur/`):
```powershell
# 1. Lint + Standard Next.js Production Build
Push-Location web; npm run lint; npm run build; Pop-Location

# 2. GitHub Pages Static Export Build (MUST succeed with zero dynamic server errors)
Push-Location web; $env:GITHUB_PAGES="true"; npm run build; Remove-Item Env:GITHUB_PAGES; Pop-Location

# 3. Fallow Codebase Intelligence (zero dead code, zero copy-paste clones)
fallow dead-code --root web --fail-on-issues
fallow dupes --root web

# 4. Backend tests remain green
backend\.venv\Scripts\python.exe -m unittest backend\tests\test_auth_google.py backend\tests\test_ml_pipeline.py -v
```
*(Note: Keep `web/.fallowrc.json` ignoring `@tailwindcss/turbopack`, which is used inside `web/next.config.ts`.)*

---

## 9. Ready-to-Paste Starter Prompt for Your Redesign Agent

```text
Read docs/handoffs/PRODUCT_REDESIGN_HANDOFF.md thoroughly before editing anything.

Your mission is to redesign the MDIP frontend inside web/ with a cohesive, memorable, industrial-grade UI/UX tailored to CNC/ETO manufacturing decision intelligence, while keeping 100% compatibility with all backend endpoints in backend/main.py, all data contracts in web/src/lib/api.ts and web/src/types/index.ts, offline sandbox fallbacks, Email + Google Sign-In (/api/v1/auth/google), real ML Model Card telemetry, and the GITHUB_PAGES=true static export build.

Requirements before finishing:
1. Refactor web/src/features/iroom/IRoomWorkspace.tsx to eliminate its high cognitive complexity without losing any of the 5 IRoom streams or add-record flows.
2. Elevate the WBS CPM Gantt + Delay-Risk + SHAP driver experience and Operations Cockpit visual hierarchy without introducing AI slop (zero gradients/glows/emojis/uppercase-tracked slop).
3. Verify zero regressions by passing: npm run lint, npm run build, GITHUB_PAGES=true npm run build, fallow dead-code --root web --fail-on-issues, fallow dupes --root web (0.0% duplication), and inspect key routes visually in headless browser / screenshots if available.
```
