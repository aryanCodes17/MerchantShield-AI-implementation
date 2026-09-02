"""Threshold optimization on validation set."""

from __future__ import annotations

from typing import Any

import numpy as np

from src.evaluation.cost_model import compute_expected_cost
from src.evaluation.metrics import compute_classification_metrics


def generate_threshold_grid(start: float, end: float, step: float) -> np.ndarray:
    """Generate threshold search grid."""
    return np.arange(start, end + step / 2, step)


def optimize_binary_threshold(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    amounts: np.ndarray,
    cost_fp: float,
    cost_fn_multiplier: float,
    start: float = 0.05,
    end: float = 0.90,
    step: float = 0.05,
) -> dict[str, Any]:
    """
    Find threshold minimizing expected business cost on validation data.

    IMPORTANT: Use validation set only — never the held-out test set.
    """
    thresholds = generate_threshold_grid(start, end, step)
    results = []
    best = None

    for t in thresholds:
        metrics = compute_classification_metrics(y_true, y_prob, threshold=float(t))
        cost = compute_expected_cost(
            y_true, y_prob, amounts, float(t), cost_fp, cost_fn_multiplier
        )
        row = {**metrics, **cost}
        results.append(row)
        if best is None or row["expected_cost"] < best["expected_cost"]:
            best = row

    return {
        "best_threshold": best["threshold"] if best else 0.5,
        "best_result": best,
        "threshold_analysis": results,
    }


def optimize_three_way_thresholds(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    amounts: np.ndarray,
    cost_fp: float,
    cost_fn_multiplier: float,
    review_cost_multiplier: float,
    start: float = 0.05,
    end: float = 0.90,
    step: float = 0.05,
) -> dict[str, Any]:
    """
    Grid search for T_review and T_block (T_review < T_block).

    Selects thresholds minimizing expected cost on validation set.
    """
    thresholds = generate_threshold_grid(start, end, step)
    results = []
    best = None

    for t_review in thresholds:
        for t_block in thresholds:
            if t_block <= t_review:
                continue
            cost = compute_expected_cost(
                y_true,
                y_prob,
                amounts,
                threshold=0.0,
                cost_fp=cost_fp,
                cost_fn_multiplier=cost_fn_multiplier,
                review_cost_multiplier=review_cost_multiplier,
                threshold_review=float(t_review),
                threshold_block=float(t_block),
            )
            flagged = y_prob >= t_review
            y_pred = flagged.astype(int)
            tp = int(((y_true == 1) & (y_pred == 1)).sum())
            fp = int(((y_true == 0) & (y_pred == 1)).sum())
            fn = int(((y_true == 1) & (y_pred == 0)).sum())
            precision = tp / max(tp + fp, 1)
            recall = tp / max(tp + fn, 1)
            f1 = 2 * precision * recall / max(precision + recall, 1e-9)
            row = {
                "threshold_review": float(t_review),
                "threshold_block": float(t_block),
                "precision": precision,
                "recall": recall,
                "f1": f1,
                **cost,
            }
            results.append(row)
            if best is None or row["expected_cost"] < best["expected_cost"]:
                best = row

    return {
        "best_threshold_review": best["threshold_review"] if best else 0.15,
        "best_threshold_block": best["threshold_block"] if best else 0.65,
        "best_result": best,
        "threshold_analysis": results,
    }
