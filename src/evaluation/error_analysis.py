"""False-positive and false-negative error analysis."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def analyze_errors(
    X: pd.DataFrame,
    y_true: np.ndarray,
    y_prob: np.ndarray,
    amounts: np.ndarray,
    threshold: float,
    top_n: int = 5,
) -> dict[str, Any]:
    """
    Summarize FP/FN cases on a labeled split.

    Used after model and threshold selection — typically on the held-out test set.
    """
    y_pred = (y_prob >= threshold).astype(int)
    fp_mask = (y_true == 0) & (y_pred == 1)
    fn_mask = (y_true == 1) & (y_pred == 0)
    tp_mask = (y_true == 1) & (y_pred == 1)

    def _amount_stats(mask: np.ndarray) -> dict[str, float]:
        vals = amounts[mask]
        if len(vals) == 0:
            return {"count": 0, "mean_amount": 0.0, "median_amount": 0.0, "total_amount": 0.0}
        return {
            "count": int(mask.sum()),
            "mean_amount": float(np.mean(vals)),
            "median_amount": float(np.median(vals)),
            "total_amount": float(np.sum(vals)),
        }

    fp_examples = []
    fn_examples = []
    for mask, bucket in ((fp_mask, fp_examples), (fn_mask, fn_examples)):
        idx = np.where(mask)[0]
        if len(idx) == 0:
            continue
        order = np.argsort(-y_prob[idx]) if bucket is fp_examples else np.argsort(y_prob[idx])
        chosen = idx[order[:top_n]]
        for i in chosen:
            bucket.append(
                {
                    "row_index": int(i),
                    "probability": float(y_prob[i]),
                    "amount": float(amounts[i]),
                    "feature_snapshot": {c: float(X.iloc[i][c]) for c in X.columns[:8]},
                }
            )

    return {
        "false_positives": _amount_stats(fp_mask),
        "false_negatives": _amount_stats(fn_mask),
        "true_positives": _amount_stats(tp_mask),
        "fn_mean_probability": float(y_prob[fn_mask].mean()) if fn_mask.any() else None,
        "fp_mean_probability": float(y_prob[fp_mask].mean()) if fp_mask.any() else None,
        "fp_examples": fp_examples,
        "fn_examples": fn_examples,
        "notes": {
            "false_positives": (
                "Legitimate transactions scored at or above the review threshold. "
                "These create customer friction and operational review cost."
            ),
            "false_negatives": (
                "Fraudulent transactions scored below the review threshold and would be approved. "
                "These drive expected fraud loss."
            ),
        },
    }
