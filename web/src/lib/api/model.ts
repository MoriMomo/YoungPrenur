/** The delay-risk model card (with an offline snapshot). */

import { API_BASE } from "./client";

export interface MlModelMetrics {
  n_tasks?: number;
  n_projects?: number;
  roc_auc: number | null;
  baseline_rule_roc_auc: number | null;
  slip_mae_days: number;
  /** Late/not-late cut-off the precision and recall below were measured at. */
  threshold?: number;
  precision?: number;
  recall?: number;
}

export interface MlModelCard {
  n_tasks: number;
  n_real_tasks: number;
  n_projects: number;
  decision_threshold?: number;
  synthetic_test_metrics: MlModelMetrics;
  real_validation_metrics: (MlModelMetrics & {
    evaluation_mode: string;
    by_source?: Record<string, MlModelMetrics>;
  }) | null;
}

export const DEFAULT_MODEL_CARD: MlModelCard = {
  n_tasks: 12004,
  n_real_tasks: 4149,
  n_projects: 1151,
  decision_threshold: 0.25,
  synthetic_test_metrics: {
    roc_auc: 0.9257,
    baseline_rule_roc_auc: 0.7135,
    slip_mae_days: 0.936,
  },
  real_validation_metrics: {
    evaluation_mode: "held_out_real_projects",
    n_tasks: 936,
    n_projects: 51,
    roc_auc: 0.7833,
    baseline_rule_roc_auc: 0.5277,
    slip_mae_days: 0.69,
    threshold: 0.25,
    precision: 0.3553,
    recall: 0.4463,
    by_source: {
      dslib: { n_tasks: 537, n_projects: 15, roc_auc: 0.8122, baseline_rule_roc_auc: 0.6509, slip_mae_days: 0.885 },
      cnc: { n_tasks: 399, n_projects: 36, roc_auc: 0.7547, baseline_rule_roc_auc: 0.5062, slip_mae_days: 0.428 },
    },
  },
};

export async function fetchMlModelCard(): Promise<MlModelCard> {
  try {
    const res = await fetch(`${API_BASE}/ml/model-card`, {
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) return await res.json();
  } catch {
    // Fallback to trained artifact snapshot
  }
  return DEFAULT_MODEL_CARD;
}
