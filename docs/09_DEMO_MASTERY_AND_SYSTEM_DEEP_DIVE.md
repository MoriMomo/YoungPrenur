# MDIP — Complete System Deep Dive & Demo Mastery Guide

> **Purpose:** Everything you need to **understand deeply** and **memorize effortlessly** before tomorrow's B2B SaaS demo: how every engine works under the hood, what every recent code update fixed, why the landing page currently under-sells the SaaS product (plus the 5 fixes), and how to defend every technical question from industry judges.

---

## 1. 60-Second Elevator Pitch & Numbers to Memorize

### The Core Analogy ("Mill / Inspection Certificate")
> *"MDIP inspects a manufacturing project schedule the way your plant inspects an incoming steel bar: every task's forecast is measured against its critical-path float, scored by an XGBoost hurdle model for slip probability and severity, stress-tested across 2,000 Monte Carlo runs, paired with exact SOP clause citations, and finalized only when a named supervisor authorizes or overrides it in an ISO 9001 Clause 7.5 audit trail."*

### The 6 Numbers to Cold-Memorize

| Metric | Exact Value | Meaning & Why It Matters |
| --- | --- | --- |
| **Held-Out Real ROC-AUC** | **`0.7833`** (`0.78`) vs **`0.5277`** (`0.53`) rule baseline | Evaluated on **51 completely unseen real projects** (`936` tasks: CNC machining + DSLIB projects). Proves true generalization—not synthetic memorization. |
| **Source Breakdown (Real Held-Out)** | **`0.7547`** on 36 CNC projects / **`0.8122`** on 15 DSLIB projects | Outperforms simple `forecast > planned` rules (`0.5062` CNC / `0.6509` DSLIB) on both discrete shop-floor and project-portfolio schedules. |
| **Training Corpus** | **`12,004` tasks** (`4,149` real at `5x` weight + `7,855` synthetic) across **`1,151` projects** | Real tasks come from `251` real projects; `900` synthetic schedules fill sparse precedence/fan-in patterns (`late_rate = 34.15%`). |
| **Feature Count & Thresholds** | **`18` engineered features** · Watch `>= 0.25` · Hold `>= 0.60` | Watch cut-off `0.25` maximizes F1 on 50 real validation projects (`recall = 44.63%`, `accuracy = 82.37%` held-out) for early warning before work cells stall. |
| **Monte Carlo Engine** | **`2,000` runs** (`DEFAULT_PROJECT_BUFFER_RATIO = 0.15`) | Computes **P50**, **P80**, and **P(finish > baseline + 15% buffer)** with plant-wide + work-center correlated gamma frailty shocks. |
| **Native Schedule Formats** | **6 formats** (`.csv`, `.xlsx/.xlsm/.xls`, `.xer`, `.xml`, `.pdf`, `.docx`) | Ingests Primavera P6 `.xer`, MS Project `.xml`, multi-tab Excel with English/Indonesian aliases, plus AI fallback for unstructured PDF/Word. |

> **Important Distinction (Don't Trip Up):**
> `test_metrics.roc_auc` on the combined train/test split is `0.9151` (`0.9257` synthetic), whereas `real_validation_metrics.roc_auc` on the **51 held-out real projects** is `0.7833` (`0.78`). Always quote **`0.78` on 51 held-out real projects** publicly—`ml/predictor.py` (`_validation_phrase`) enforces this deliberately so MDIP never overclaims.

---

## 2. End-to-End Architecture & Data Flow

### System Pipeline

```
+-----------------------------------------------------------------------------------+
| 1. INGESTION & NORMALIZATION (backend/schedule_parser/tables.py, base.py)         |
|    CSV / Multi-tab XLSX (scan top 15 rows) / Primavera P6 .xer / MS Project .xml  |
|    -> Map EN & ID column aliases -> Strip parent WBS roll-up rows & repoint links |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 2. DETERMINISTIC PDM / CPM ENGINE (backend/schedule_parser/cpm.py)                |
|    Kahn's Topological Sort -> Forward Pass (ES, EF) & Backward Pass (LS, LF)      |
|    Supports FS, SS, FF, SF + lags -> Isolates disconnected subgraphs (no fake     |
|    float) -> Time-weighted work-center concurrency -> upstream_slip_days          |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 3. FEATURE VECTOR + HURDLE ML + SHAP (backend/ml/features.py, predictor.py)       |
|    18 features/task -> Dampen upstream slip if variance <= 0 & low utilization    |
|    -> Stage 1: XGBClassifier (P_late) [+ optional Platt calibration]              |
|    -> Stage 2: XGBRegressor (conditional slip | late) capped by _slip_caps()      |
|    -> TreeSHAP (pred_contribs=True) top-3 positive drivers per task               |
+-----------------------------------------------------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
| 4. CORRELATED MONTE CARLO SIMULATION (backend/ml/predictor.py::simulate_project)  |
|    2,000 runs: Gamma(2, 0.5) plant shock + work-center group shock                |
|    Re-runs vectorized PDM forward pass per run -> P50, P80, Buffer Exceedance %   |
+-----------------------------------------------------------------------------------+
                                          |
              +---------------------------+---------------------------+
              v                                                       v
+---------------------------------------+   +---------------------------------------+
| 5. GROUNDED SOP COPILOT               |   | 6. HITL SUPERVISOR SIGN-OFF           |
|    (backend/app/services/copilot.py)  |   |    (backend/app/api/risks.py)         |
|    IDF-weighted SOP retrieval +       |   |    AUTHORIZED or OVERRIDDEN (requires |
|    live WBS + IRoom streams           |   |    notes on override) -> SQLite/audit |
|    On-prem retrieval-only OR cloud    |   |    log immutable record               |
+---------------------------------------+   +---------------------------------------+
```

### Public vs. Authenticated Surface
- **Anonymous Landing Inspector (`POST /api/v1/scheduler/inspect` in `backend/app/api/public.py`):**
  - Accepts tabular schedules only (`.csv`, `.xlsx`, `.xls`, `.xer`, `.xml`), capped at **2 MB**, IP rate-limited (`inspections`).
  - **Nothing is saved** (`"stored": false`) and **no external AI API is called**, making it safe to expose publicly without auth.
- **Authenticated Workspace (`POST /api/v1/scheduler/upload` in `backend/app/api/scheduler.py`):**
  - Accepts files up to **10 MB**, including PDF/Word via AI extraction when `allow_external_ai=True`.
  - Updates the signed-in user's isolated active schedule (`state.set_analysis(user["id"], analysis)`), clears stale decision flags for that workspace, and populates the **Cockpit**, **Scheduler**, **IRoom**, **Copilot**, and **Audit Log**.

---

## 3. Deep Dive: What Every Recent Code Update Did & Why

This section covers the exact engineering updates currently in the repository and explains *why* each one exists.

### A. Messy Excel Header & Multi-Sheet Auto-Detection (`backend/schedule_parser/tables.py`)
Real factory Excel exports almost never start at cell `A1`. They have company logos, document control blocks, revision tables, and an `"Instructions"` or `"Agenda"` first tab.
- **Before:** `pd.read_excel()` assumed sheet 0, row 0 was the header, failing on real plant exports.
- **What the update built:**
  - `_ALIAS_TO_FIELD` maps normalized English and Indonesian `COLUMN_ALIASES` (e.g., `"Nama Tugas"`, `"Durasi"`, `"WBS"`, `"Planned Start"`) to canonical field names.
  - `_score_header_row(values)` counts unique matched canonical fields on a candidate row and checks whether it satisfies the minimum schema: `"task"` AND (`"planned_days"` OR (`"planned_start"` AND `"planned_finish"`)).
  - `_read_excel_best_sheet(content, max_header_scan=15)` reads all sheets (`sheet_name=None, header=None`) and scans the first **15 rows** of every sheet, ranking candidates by `(meets_required, unique_matched_count)` and rebuilding the DataFrame below the winning header row with deduplicated column names.
- **Bonus hardening already in `tables.py`:**
  - `_strip_wbs_summary_rows`: Drops parent WBS roll-up rows (e.g., `1.2` when `1.2.1` and `1.2.2` exist and parent duration `>=` max child duration) and automatically re-points external predecessors onto the parent's **terminal leaf children**, preventing double-counting in CPM and Monte Carlo.
  - `_read_xer_tables`: Parses Primavera P6 `.xer` `%T/%F/%R` tables with **CP1252 fallback** (`utf-8-sig` -> `cp1252`), strips `TT_WBS` and `TT_LOE` (Level of Effort) rows, reads per-calendar `day_hr_cnt`, maps work centers from `TASKRSRC` + `RSRC`, converts `TASKPRED` lags from hours to calendar days, and computes active task forecast as `elapsed_days + remain_days` using `PROJECT.last_recalc_date`.
  - `_read_msp_xml_tables`: Parses MS Project XML `<Task>`, ISO-8601 `PT...H` durations (8h/day), `PredecessorLink` types (`0=FF, 1=FS, 2=SF, 3=SS`), and `LinkLag / 4800.0` (tenths of a minute -> 8h workdays).

### B. Full PDM / CPM Network Engine (`backend/schedule_parser/cpm.py`)
Standard toy schedulers only handle sequential `Finish-to-Start` arrays. Manufacturing schedules use overlapping machining/assembly handoffs and multiple work orders in one export.
- **What `compute_cpm` does:**
  1. **Topological Ordering (Kahn's Algorithm):** Validates that no circular dependencies exist (raises `ScheduleParseError` on cycles). When an Excel sheet has no dependency column, infers precedence from dates if present (creating `date_es_floor`), otherwise chains sequentially.
  2. **All 4 PDM Link Types with Lags:**
     - **FS:** $ES_s \ge EF_p + \text{lag}$
     - **SS:** $ES_s \ge ES_p + \text{lag}$
     - **FF:** $ES_s \ge EF_p - D_s + \text{lag}$
     - **SF:** $ES_s \ge ES_p - D_s + \text{lag}$
     And exact symmetric backward-pass `LF` constraints (for example, `SF` uses $(LF_s - \text{lag}) + D_c$).
  3. **Connected-Component Float Isolation:** Groups tasks into undirected connected components (`comp_id` / `comp_end`) so a short 3-day work order in the same Excel file doesn't receive 40 days of fake float from an unrelated 45-day work order.
  4. **Time-Weighted Work-Center Concurrency (`_compute_wc_concurrency`):** For tasks sharing the same `work_center`, computes $\text{concurrency} = \frac{\sum_j \text{overlap}(i, j)}{D_i}$. When `concurrency > 1.0`, stores `computed_utilization = min(0.98, 0.72 + 0.10 * (concurrency - 1.0))` so parallel machine bottlenecks automatically raise modeled risk even when the spreadsheet lacks an explicit utilization column.
  5. **Upstream Slip Propagation:** Computes `variance = actual_days - planned_days` and propagates `carried[c] = max(0.0, upstream + variance)` forward in topological order.

### C. The 18-Feature Vector & Hurdle ML Engine (`backend/ml/features.py`, `backend/ml/predictor.py`)
Look closely at why MDIP is **not** a black-box classifier:

#### All 18 Model Features (`FEATURE_NAMES`)
1–9. **Core Numeric Schedule & Pressure Features:**
   - `planned_days`, `float_days`, `on_critical_path` (`float_days <= 1e-6`), `forecast_variance_days` (`actual - planned`), `upstream_slip_days`, `external_dependency` (`1.0` if procurement/subcontract or flagged), `n_predecessors`, `resource_utilization` (explicit column -> `computed_utilization` -> category default `0.60..0.90`), `drawing_revisions`.
10–18. **9 Manufacturing Archetype One-Hots (`wc_*`):**
   - Checked in priority order by `infer_category`: `subcontract`, `procurement`, `engineering`, `stamping`, `machining`, `assembly`, `quality`, `logistics`, `other`.

#### Two-Stage Hurdle Architecture + Guardrails (`predictor.py`)
- **Stage 1 (`XGBClassifier`):** Predicts $P(\text{finishes later than total float} + \text{tolerance})$.
  - `HIGH` ("Hold") if $p \ge 0.60$.
  - `MEDIUM` ("Watch") if $p \ge \text{watch\_threshold()}$ (model card `decision_threshold = 0.25`, capped at `0.60`).
  - `LOW` ("Pass") otherwise.
- **Stage 2 (`XGBRegressor` trained only on `late == 1`):** Predicts `conditional_slip_days`, clipped to $[0.25, \text{max\_prop\_slip}]$.
  - **Expected Slip:** $E[\text{slip}] = P_{\text{late}} \times \text{conditional\_slip\_days}$.
  - **`_slip_caps()` Safety Guardrail:** Internal tasks are capped at $\max(0.25, 0.75 \times \text{planned})$ so a noisy leaf cannot predict +20 days slip on a 2-day inspection. Overrunning external/vendor tasks relax to $\max(\text{base\_cap}, \text{overrun} \times 1.25, \min(10.0, \text{planned} \times 1.5))$ because supplier waits frequently exceed internal task duration.
- **Anti-Double-Counting Dampening (`score_tasks` lines 113–118):**
  - If a downstream task has `forecast_variance_days <= 0`, Monte Carlo *already* shifts its Early Start when an upstream predecessor slips.
  - To prevent counting upstream slip twice unless the shop floor is congested, MDIP smoothly scales `upstream_slip_days` by `clamp((utilization - 0.65) / 0.25, 0.0, 1.0)`.
- **Explainability (TreeSHAP):**
  - Calls XGBoost's native `clf.predict(dm, pred_contribs=True)` (exact TreeSHAP in log-odds space), drops the bias column, ranks positive contributors $> 0.05$, and exposes the top 3 human-readable `drivers` per task plus risk-weighted `project_risk_drivers` (`weight %` and `impact (+X.Xd)`).
- **Correlated 2,000-Run Monte Carlo (`simulate_project`):**
  - Samples a **plant-wide Gamma shock** ($\text{Gamma}(2.0, 0.5)$, mean $1.0$) and a **per-work-center/vendor group Gamma shock**, averaging them $0.5 \times \text{plant} + 0.5 \times \text{group}$.
  - Applies shock via hazard exponentiation $p_{\text{eff}} = 1 - (1 - p)^{\text{shock}}$ so work centers fail together during plant/vendor disruptions instead of unrealistically averaging out!
  - Samples slip sizes from $\text{Gamma}(\text{shape}=2, \text{scale}=\frac{\text{cond\_mean} \cdot (0.75 + 0.25 \cdot \text{shock})}{2})$, re-runs the full vectorized `FS/SS/FF/SF` forward pass 2,000 times, and reports `p50_slip_days`, `p80_slip_days`, and `delay_probability = P(project_slip > 0.15 * baseline_end)`.

### D. Leakage-Free Dataset Adapters (`backend/ml/adapters.py`)
Why was adding `adapters.py` so critical?
- **The Target Leakage Trap:** If you feed a completed historical project's final `Actual Duration` into `compute_cpm`, then `forecast_variance_days = actual - planned` immediately leaks the ground-truth label! The model would memorize *"late if actual > planned"* (`AUC ~ 0.99` offline) and fail on live mid-project schedules where actual duration isn't finished yet.
- **How `load_dslib_snapshot_pairs` (DSLIB v3.4 `.xlsx`) solves it:**
  - Scans `Baseline Schedule`, `Resources`, and Tracking Period (`TP`) tabs.
  - Pairs **up to 3 intermediate `TP` snapshots** (`X`, mid-execution progress where active tasks estimate forecast via `actual_dur / max(pc, 0.10)` and unstarted tasks still sit at `planned`) against the **final `TP` tab** (`y`, true completed outcome).
  - Strips summary WBS roll-up rows (`1.2` above `1.2.1`), parses PDM predecessor tokens (`FS/SS/FF/SF + lag`), and computes resource demand ratios against `Resources.Availability`.
- **How `load_levy_production_schedules` (Levy 2014 `Production_Data.csv`) solves it:**
  - Splits `Case ID` orders **chronologically (70% train / 30% test)** by order start timestamp—zero future leakage.
  - Computes planned duration baselines **strictly on the train split** (median total duration per `Activity`, avoiding test-set leakage).
  - **Rework DAG Collapse:** Real factory event logs contain rework loops (`Turning -> Inspection -> Turning`), which would fail Kahn's topological sort (`Circular task dependencies`). The adapter aggregates repeated executions of the same `Activity` within a `Case ID` (`first_start`, `last_end`, summed `dur_days`) sorted by `first_start`, preserving true delay severity while forming a strict DAG.
  - Computes **instantaneous resource concurrency** across overlapping intervals (`conc / res_max_conc`) for `resource_utilization`.
  - Cuts every order at its chronological **midpoint** (`cutoff`) to synthesize realistic `Completed`, `In Progress` (`max(planned, elapsed)`), and `Not Started` (`planned`) snapshot inputs paired against final ground truth.

### E. Warm-Start XGBoost Fine-Tuning & Platt Calibration (`backend/ml/finetune.py`, `backend/ml/predictor.py`)
When onboarding MDIP onto a new factory's data (like DSLIB or Levy), training from scratch throws away the learned 51-project tooling/stamping knowledge, while naive retraining destroys tree compatibility or shifts probability calibration.
- **Warm-Start Tree Continuation (`xgb_model=...`):**
  - Appends `60` low-learning-rate (`lr=0.02`) trees onto saved `delay_risk_classifier.json` and `delay_slip_regressor.json`, requiring the **exact 18-feature matrix** from `features.py`.
  - Mixes optional `--replay-npz` (original tooling projects) at **`2.0x` sample weight** to prevent catastrophic forgetting.
- **Post-Hoc 2-Parameter Platt Calibration (`fit_platt_calibrator`, wired into `predictor.py`):**
  - Splits validation data in half: first half fits `LogisticRegression` on raw XGBoost log-odds (`output_margin=True`), producing `{"slope": a, "intercept": b}`; second half evaluates **Brier score**, **ROC-AUC**, and tunes `decision_threshold` (`0.25..0.75`).
  - Why this matters mathematically: different factories have different baseline lateness rates (e.g., 15% vs 45%). Updating just 2 scalar log-odds parameters:
    $$P_{\text{calibrated}} = \frac{1}{1 + \exp\big(-(a \cdot \text{margin} + b)\big)}$$
    shifts base probabilities cleanly without corrupting the relative ordering learned across all trees!
  - In `backend/ml/predictor.py` (`score_tasks`), if `model_card.json` contains `"platt_calibration": {"slope", "intercept"}`, inference calls `clf.predict(dm, output_margin=True)` and applies the clipped sigmoid (`[-40, 40]`); otherwise it cleanly falls back to `clf.predict(dm)`—fully backward-compatible with v1 artifacts.

### F. Frontend Visual Polish & GSAP Reliability (`web/src/app/page.tsx`, `web/src/components/landing/ShinyText.jsx`)
- Fixed Next.js App Router + React Strict Mode `ScrollTrigger` silent failure by replacing `gsap.from()` with `gsap.fromTo()` inside `gsap.context()` / `useGSAP()` with `mm.add("(prefers-reduced-motion: no-preference)")`, `clearProps`, and `ScrollTrigger.refresh()` after `requestAnimationFrame` + `document.fonts.ready`.
- Added `ShinyText` sweep highlight on the main hero H1 (`color="#14181c"`, `shineColor="#2b3fbf"`) alongside interactive WebGL `Threads`, `Dither`, and `GradientWaves` layers guarded by `motion-reduce:hidden`.
- *(Note from Fallow audit: `ShinyText.jsx` added 12 JS cyclomatic complexity findings and `web/scripts/rehearse-demo.mjs` is flagged as an unused file—good cleanup items before shipping.)*

---

## 4. Why the Site Still Feels Like a Form—And the 5 B2B SaaS Upgrades

### Root Cause Diagnosis
Right now, `web/src/app/page.tsx` reads like an **editorial brochure + standalone file uploader**:
1. Dropping a file inspects it nicely in the landing table, **but clicking "Open live cockpit" discards that inspection result** (never calls `writeStoredUserSchedule`)—breaking the #1 SaaS *"aha!"* moment during a live demo.
2. There is no executive benchmark strip above the fold: the strongest proof numbers (`ROC-AUC 0.78`, `2,000 runs`, `ISO 9001 HITL`) sit buried in paragraph text at line 869.
3. The hero dropzone looks static until someone hunts for a file on disk—fatal in a timed pitch if you have to fumble in Windows Explorer.
4. Expanding a task in `InspectionDetail.tsx` shows static text instead of proving the interactive **SOP citation + Supervisor Sign-Off workflow**.
5. The pricing section uses flat equal-weight boxes and exposes a fake email (`sales@mdip.example`), breaking B2B buyer trust.

### The 5 High-Impact Demo Fixes (`web/src/app/page.tsx` & `InspectionDetail.tsx`)

| # | Upgrade | Exact Target | Why Judges & B2B Buyers Care |
| --- | --- | --- | --- |
| **1** | **Persist Landing Upload → Cockpit** | `inspect()` in `web/src/app/page.tsx` (lines 385–428) + `writeStoredUserSchedule` (`dashboard-context.tsx`) | Eliminates dead-end friction: upload once on the landing page, click **"Open this schedule in Live Cockpit ->"**, and your exact uploaded schedule appears inside the authenticated cockpit, Gantt scheduler, and Copilot. |
| **2** | **3 Instant Factory Scenario Presets + Telemetry Strip** | Hero dropzone + inspection header (`web/src/app/page.tsx` lines 610–690) | Lets you switch live in 1 click between *Stamping Die Bottleneck*, *Vendor Heat-Treat Slip*, and *On-Track Cell*, updating P50/P80 Monte Carlo KPI cards and triggering the ink-press SVG `<Stamp />`. |
| **3** | **B2B Benchmark & Proof Bar** | Governance strip (`web/src/app/page.tsx` lines 650–666) | Promotes `0.78` held-out ROC-AUC (vs `0.53` rules), `2,000` Monte Carlo runs, `4+` native ERP/PM exports (`.xer`, `.xml`, `.xlsx`, `.csv`), and `100%` ISO 9001 HITL audit trail into scannable mono KPI blocks immediately below the hero. |
| **4** | **Interactive Supervisor Sign-Off + SOP Citation Preview** | `InspectionDetail.tsx` (lines 112–189) | Turns row expansion from passive text into an interactive preview showing the matched SOP clause badge (e.g., `SOP-012 Cl. 4.2`), a simulated **Authorize Mitigation** action, and an **Ask Copilot** deep-link. |
| **5** | **SaaS Pricing Polish & Real CTA** | `PLANS` + pricing section (`web/src/app/page.tsx` lines 34, 974–1056) | Adds a **Monthly / Annual (Save 20%)** billing toggle, dark `#14181c` header treatment on the featured **Pro** plan, and removes the amateur `sales@mdip.example` placeholder. |

---

## 5. Tomorrow's 3-Minute Live Demo Choreography

Rehearse this exact sequence so you never lose momentum:

1. **0:00–0:30 — Landing Hero & Identity (`/`):**
   - Point to the Blueprint / Mill Certificate frame: *"Plants don't trust black-box scores—they trust inspection certificates."*
   - Highlight the **30-day pilot** promise, **EN/ID language toggle** (crucial for Indonesian factories), and ERP export compatibility (SAP PS, Primavera P6 `.xer`, MS Project `.xml`, messy multi-sheet Excel).
2. **0:30–1:15 — Live Schedule Inspection (`/` Inspection Table & Cockpit Preview):**
   - Click **"Use the sample schedule"** (or drop a prepared messy `.xlsx` with a logo banner above row 6 to prove multi-sheet/offset header detection).
   - Click `WBS-1.4 Final stamping and tooling FAT` (`HOLD` / `80%`). Show the **SHAP drivers** (`Forecast overrun vs. plan`, `Upstream predecessor slippage`, `No float on the critical path`).
   - Scroll slightly to **Inside the cockpit** (`CockpitPreview`) showing dashed Planned vs solid Verdict bars; click a bar to jump straight back to that row.
3. **1:15–2:00 — Live Operations Cockpit & Scheduler (`/dashboard`, `/dashboard/scheduler`):**
   - Open `/dashboard`: show role-switching (`Operations Manager` vs `Quality Control Lead` vs `Procurement`)—same project, accountable KPIs per reader.
   - Open `/dashboard/scheduler`: show the full **2,000-run Monte Carlo P50/P80 forecast**, `delay_probability` against the 15% Critical Chain buffer, and **what-if re-inspection** when uploading an updated `.xer` or `.xlsx`.
4. **2:00–2:40 — Grounded SOP Copilot (`/dashboard/copilot`):**
   - Ask a question referencing a task or bottleneck (e.g., *"What SOP applies if PRESS-P07 / WBS-1.4 slips?"*).
   - Point out the **exact SOP document code & clause citation**, IDF-grounded retrieval, and **On-Premises / Private VPC** mode where zero factory data leaves the plant server.
5. **2:40–3:00 — Human-in-the-Loop Sign-Off & Pricing Close (`/dashboard` -> `/#plans`):**
   - Authorize or override a recommended mitigation action (noting that overriding *requires* written justification—enforced by `POST /api/v1/risks/decisions/flag`).
   - Show the timestamped **Audit Log** (`ISO 9001 Cl. 7.5`), then land on **30-day guided pilot** (`Starter Rp 3,5 jt/mo` -> `Pro Rp 7,5 jt/mo` -> `Enterprise On-Prem/VPC`).

---

## 6. Judge & Industry Mentor Q&A Defense Playbook

### Q1: *"Why shouldn't I just upload my Excel schedule to ChatGPT or Claude and let an LLM predict delays?"*
- **Answer:** LLMs cannot deterministically execute forward/backward `FS/SS/FF/SF` CPM passes across 200+ linked tasks, cannot run 2,000 correlated gamma-frailty Monte Carlo trials, and have no calibrated probability guarantee (`Brier = 0.1013`, held-out `ROC-AUC = 0.7833`). MDIP uses **deterministic math (`cpm.py`) + XGBoost (`predictor.py`)** for numbers, and restricts LLMs to **PDF/Word ingestion + SOP retrieval synthesis (`copilot.py`)**—grounded in cited clauses, never hallucinated probabilities.

### Q2: *"Isn't your accuracy fake because you evaluated on the same projects or leaked actual durations?"*
- **Answer:** No—we deliberately engineered three safeguards against leakage:
  1. Our public benchmark (`0.7833 ROC-AUC`) comes strictly from **51 completely held-out real projects** (`936` tasks across CNC and DSLIB) that never touched training or threshold selection (`0.25` was tuned on a separate 50-project validation split).
  2. In `adapters.py`, DSLIB pairs **intermediate Tracking Period (`TP`) snapshots** as inputs against the **final `TP`** as targets, and Levy computes planned duration medians **strictly on the earlier 70% chronological orders**.
  3. On `POST /api/v1/ml/retrain` (`api/ml.py`), live in-progress forecasts are never ingested as ground truth—only completed schedules.

### Q3: *"Why didn't your fine-tuning code replace the 18 features with 50 new factory features?"*
- **Answer:** XGBoost incremental warm-start (`xgb_model=...`) appends boosting trees onto existing saved boosters (`delay_risk_classifier.json` and `delay_slip_regressor.json`), which mathematically requires the exact `FEATURE_NAMES` vector (`18` features). Instead of breaking tree compatibility, `finetune.py` pairs experience replay (`2.0x` weight) with **2-parameter Platt scaling** on raw log-odds so base delay probabilities adapt immediately to a new factory without forgetting the original tooling/stamping splits.

### Q4: *"Indonesian factory Excel sheets are notoriously messy—logos in rows 1–5, blank columns, Indonesian headers, summary rows. Will your parser break?"*
- **Answer:** Built explicitly for that:
  - `_read_excel_best_sheet` scans **every tab** and the **top 15 rows** of each sheet using English and Indonesian aliases (`COLUMN_ALIASES`), picking the true schedule header automatically.
  - `_strip_wbs_summary_rows` detects parent roll-up rows (`1.2` above `1.2.1`) and removes them while re-pointing dependencies onto terminal leaves so CPM never double-counts parent durations.
  - And if a schedule arrives in Primavera P6 `.xer` or MS Project `.xml`, native parsers extract calendars, `TASKRSRC` work centers, and PDM lags (`FS/SS/FF/SF`) directly.

### Q5: *"Manufacturing schedules aren't independent coin flips—when a heat-treatment furnace or vendor stalls, multiple tasks slip together. Does Monte Carlo miss that?"*
- **Answer:** No—`simulate_project` models **correlated failures** using nested **Gamma frailty shocks**: a plant-wide shock ($\text{Gamma}(2, 0.5)$) combined 50/50 with a per-work-center/vendor group shock, applied via $p_{\text{eff}} = 1 - (1 - p)^{\text{shock}}$. That captures realistic tail risk (`P80`) instead of falsely assuming statistical independence.

### Q6: *"How do you prevent AI liability on the shop floor?"*
- **Answer:** Strict **Human-in-the-Loop (HITL) accountability**:
  - MDIP only *recommends*; `POST /api/v1/risks/decisions/flag` binds the authenticated `user["id"]` and role (never trusting client body reviewer fields), enforces non-empty written notes whenever a supervisor overrides (`422` otherwise), and logs every decision with timestamp + cited SOP reference (`database.record_decision_flag`) for **ISO 9001 Cl. 7.5** traceability.

### Q7: *"Factories won't give a startup direct SAP write-access on Day 1. How do you deploy?"*
- **Answer:** **Zero-IT 30-day pilot**: planners already export `.xlsx`, `.csv`, `.xer`, or `.xml` weekly. Day 1 takes a single file upload—no VPN, no SAP integration ticket. Once the pilot proves slip-detection lift over Week 4, customers optionally add direct ERP connectors or **On-Premises / Private VPC** deployment (where Copilot switches to deterministic local SOP retrieval and zero data leaves their network).

---

## 7. Quick Flashcard Cheat Sheet (Review 5 Minutes Before Demo)

1. **Identity:** *Mill / Inspection Certificate* (`HOLD >= 60%`, `WATCH >= 25%`, `PASS < 25%`).
2. **Engine Pipeline:** *Ingest (`.xlsx` top-15-row scan / `.xer` / `.xml`) -> Kahn PDM/CPM (`FS/SS/FF/SF` + connected components) -> 18 features -> XGBoost Hurdle (`Clf + Cond. Reg` + optional Platt calibration) -> TreeSHAP drivers -> 2,000-run Gamma-frailty Monte Carlo -> SOP Copilot -> Supervisor HITL Sign-Off.*
3. **Golden Benchmark:** **`0.7833` ROC-AUC** vs **`0.5277` rule baseline** on **51 held-out real projects** (`936` tasks).
4. **Why Hurdle Model?** Separates *"Will it be late?"* (`XGBClassifier`, calibrated probability) from *"By how many days if late?"* (`XGBRegressor` with `_slip_caps` guardrail).
5. **Anti-Leakage Strategy:** DSLIB intermediate `TP` -> final `TP`; Levy chronological `70/30` split + train-only medians + DAG rework collapse.
6. **Warm-Start Adaptation:** `xgb_model` tree continuation + `2.0x` replay buffer + 2-parameter **Platt scaling** on raw margins (`output_margin=True`).
7. **Governance:** Zero public training on customer schedules, on-prem retrieval-only Copilot toggle, mandatory justification on supervisor override (`ISO 9001 Cl. 7.5`).
