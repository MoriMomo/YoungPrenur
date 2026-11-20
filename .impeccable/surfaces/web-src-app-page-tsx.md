---
version: 1
slug: "web-src-app-page-tsx"
primary_target: "web/src/app/page.tsx"
related_targets: ["web/src/app/(auth)/login/page.tsx","web/src/app/dashboard/layout.tsx"]
---

## Scope

Whole MDIP web app: landing page `/` (Persuade), login `/login`, and the dashboard routes `/dashboard`, `/dashboard/scheduler`, `/dashboard/iroom`, `/dashboard/knowledge`, `/dashboard/copilot` (Operate). One visual world across all of them.

## Audience and job

Evaluators/buyers decide in minutes whether MDIP's predictions are credible; plant staff use the dashboard daily to see which tasks will slip, why, and to approve the fix. Proof on hand: real-data model metrics only (ROC-AUC 0.78 vs 0.53 on 51 held-out real projects). Dashboard figures are sample data and are never presented as real results on the landing page. No partner names, no TRL label, no demo-data banner.

## Direction contract

THESIS: Every prediction is issued the way a plant already trusts a steel bar: as an inspection certificate listing measured value against spec limit, a verdict, and an inspector's stamp. It refuses the category default of a dark SaaS hero with a glowing dashboard screenshot beside the headline.

OWN-WORLD: Cool security-paper ground (#f3f5f1) with a fine guilloche border and double frame rules; black tabular print (#14181c); one ink-pad stamp blue (#2b3fbf) for the primary action and the inspector's stamp; red (#c8322b) only for out-of-spec (HOLD) values; green for PASS. Sharp 2–3px corners, 1px rules, no shadows, no gradients. Condensed grotesk for certificate headings and verdicts, workhorse sans for UI text, tabular mono for every measured value. Raises: committed plan solid, what-if scenarios dashed (from sewing pattern); one dominant axis per page, the schedule timeline (from indoor sun); honest absence, unscored values as labelled empty cells (from ekiben); one token source for landing and dashboard (from generative identity); one cell grid shared by tables, KPI fields and forms (from ANSI BBS).

STORY: The visitor sees a real certificate being issued for a sample project, understands that MDIP measures each task's forecast against its plan and stamps a verdict with reasons, believes it because the stamp carries real held-out metrics, and acts by submitting a schedule for inspection or signing in.

FIRST VIEWPORT: The landing page is one certificate sheet filling the viewport width inside a double-rule frame. Header band: MDIP mark and wordmark left, navigation as certificate header fields, certificate number and issue date right. Below it, the headline set large in the condensed face in the "Subject" field, one line of plain explanation, and the primary action as a working upload field "Submit a schedule for inspection" (stamp-blue button + file input) with a secondary "Sign in". The lower half of the sheet is the inspection table for the labelled sample project: task, planned days, forecast days, delay risk, drivers, verdict (PASS/HOLD), with a single blue round stamp overlapping the table's right edge certifying "Validated on 51 held-out real projects · ROC-AUC 0.78".

FORM: Mill Test Certificate (EN 10204 3.1 inspection certificate), position 6 on the ordered grounded list, seed:59ef055b938018cb.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment

The inspector's stamp landing on the certificate when a schedule is scored (one stamp per page, never decoration).

## Unresolved

- Exact condensed display face (to be chosen from Google Fonts, avoiding the saturated defaults list).
