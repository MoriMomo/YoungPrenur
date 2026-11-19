# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Evaluators and buyers** (competition judges, plant leadership considering adoption) meet MDIP on the landing page and in a short guided walkthrough of the dashboard. They need to understand within minutes what MDIP predicts, why it is credible, and how a decision flows to a human.
- **Factory staff in project-based manufacturing** (CNC machining, tooling, precision fabrication, sub-assembly) use the dashboard as a daily tool. Six roles: Operations Manager, Plant Manager, Production Supervisor, Maintenance Lead, Quality Manager, Supply Chain Lead. Their job: spot schedule slippage early, decide what to do, and get the right person to approve it.

## Product Purpose

MDIP (Manufacturing Decision Intelligence Platform) turns messy project schedules into an early-warning system for delivery delays. It ingests CSV/XLSX work-breakdown schedules, computes the critical path, scores every task's delay risk with a machine-learning model, explains the risk drivers, and queues recommended actions for human approval with an audit trail. Success: a planner sees which tasks will slip and why before a work cell stalls, and acts in time.

## Positioning

Predicts which WBS tasks will slip before a work cell stalls, explains why (SHAP drivers), and routes the fix to a human for approval — for project-based manufacturers (CNC, tooling, fabrication).

## Operating Context

- Inputs: master schedules exported as CSV or Excel, with planned vs. forecast durations and dependencies; flexible column names in English or Indonesian.
- Plant streams surfaced in "IRoom": material delivery, project progress, drawing approval, quotation & PO, operation tracker.
- Decisions require human-in-the-loop authorization (authorize / override) and are logged for audit.
- An SOP knowledge base backs a copilot that answers with clause-level citations.

## Capabilities and Constraints

- Delay-risk engine: Critical Path Method + XGBoost hurdle model (late classifier + slip regressor), SHAP root-cause drivers, 2,000-run Monte Carlo project forecast.
- Roles change the dashboard view (role-scoped cockpit).
- Backend: FastAPI with Supabase Postgres or local SQLite; frontend: Next.js (App Router) + Tailwind v4. The public GitHub Pages build runs without a backend and falls back to bundled sample data.
- Dashboard telemetry, IRoom records and KPIs are sample/demonstration data; only the model metrics come from real data.

## Brand Commitments

- Product name: **MDIP** (Manufacturing Decision Intelligence Platform), with the existing MDIP logo mark.
- **No partner, university or company names anywhere on the public site** (user decision).
- No "TRL 4 prototype" label and no demo-data disclaimer banner on the public site (user decision). Consequence for honesty: sample dashboard numbers must never be presented on the landing page as real-world results.

## Evidence on Hand

- Real-data model evaluation (`backend/ml/artifacts/model_card.json`): trained on 4,149 real planned-vs-actual tasks from 251 public projects (DSLIB v3.4 project database and 4TU CNC production logs) plus 7,855 synthetic tasks. On 51 held-out real projects: ROC-AUC 0.78 vs 0.53 for the previous rule-based scoring. These may be shown publicly.
- At the default 0.5 threshold the model catches about 16% of late tasks on real data (recall 0.157); do not claim high recall.
- No customer testimonials, case studies, pricing, deployments or user counts exist. Do not invent them.

## Product Principles

1. **Explain every prediction.** A risk score always comes with its drivers and the evidence behind it.
2. **Humans decide.** The system recommends; a named role authorizes or overrides, and the decision is logged.
3. **Honest numbers.** Show real metrics as real, sample data as sample, and never overstate model performance.
4. **Fast to read on the shop floor.** Scanability and consistency beat decoration in the working dashboard.
5. **Credible in minutes.** An evaluator should grasp the problem, mechanism and proof in one short walkthrough.
