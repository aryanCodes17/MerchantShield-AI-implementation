"""Business cost model for fraud decisions."""

from __future__ import annotations

from typing import Any

import numpy as np


def compute_expected_cost(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    amounts: np.ndarray,
    threshold: float,
    cost_fp: float,
    cost_fn_multiplier: float,
    review_cost_multiplier: float = 0.5,
    threshold_review: float | None = None,
    threshold_block: float | None = None,
) -> dict[str, Any]:
    """
    Compute expected business cost for binary or three-way policy.

    FP cost: fixed cost per incorrectly flagged legitimate transaction.
    FN cost: cost_fn_multiplier × transaction amount (missed fraud loss).
    REVIEW: review_cost_multiplier × cost_fp for legitimate transactions,
            and 50% residual FN cost for fraud that is sent to review
            (analysts may still miss some cases).
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    amounts = np.asarray(amounts, dtype=float)

    if threshold_review is not None and threshold_block is not None:
        is_block = y_prob >= threshold_block
        is_review = (y_prob >= threshold_review) & ~is_block
        is_approve = ~is_block & ~is_review
        y_pred_flagged = ~is_approve

        legit = y_true == 0
        fraud = y_true == 1

        fp_cost_total = float(
            (legit & is_block).sum() * cost_fp
            + (legit & is_review).sum() * cost_fp * review_cost_multiplier
        )
        fn_cost_total = float(
            (amounts[fraud & is_approve] * cost_fn_multiplier).sum()
            + (amounts[fraud & is_review] * cost_fn_multiplier * 0.5).sum()
        )
        fp_count = int((legit & y_pred_flagged).sum())
        fn_count = int((fraud & is_approve).sum())
        prevented_fraud = float(amounts[fraud & ~is_approve].sum())
    else:
        y_pred_flagged = y_prob >= threshold
        fp_mask = (y_true == 0) & y_pred_flagged
        fn_mask = (y_true == 1) & ~y_pred_flagged
        fp_count = int(fp_mask.sum())
        fn_count = int(fn_mask.sum())
        fp_cost_total = float(fp_count * cost_fp)
        fn_cost_total = float((amounts[fn_mask] * cost_fn_multiplier).sum())
        prevented_fraud = float(amounts[(y_true == 1) & y_pred_flagged].sum())

    expected_cost = fp_cost_total + fn_cost_total

    return {
        "threshold": threshold,
        "threshold_review": threshold_review,
        "threshold_block": threshold_block,
        "false_positives": fp_count,
        "false_negatives": fn_count,
        "fp_cost_total": fp_cost_total,
        "fn_cost_total": fn_cost_total,
        "expected_cost": expected_cost,
        "prevented_fraud_amount": prevented_fraud,
        "net_expected_cost": expected_cost,
    }


def portfolio_financial_summary(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    amounts: np.ndarray,
    decisions: np.ndarray,
    cost_fp: float,
    review_cost_multiplier: float,
) -> dict[str, float]:
    """Portfolio-level financial risk summary (expected-value estimates)."""
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)
    amounts = np.asarray(amounts, dtype=float)
    decisions = np.asarray(decisions)

    flagged = decisions != "APPROVE"
    review = decisions == "REVIEW"
    block = decisions == "BLOCK"
    legit = y_true == 0
    fraud = y_true == 1

    fp_cost = float(
        (legit & block).sum() * cost_fp
        + (legit & review).sum() * cost_fp * review_cost_multiplier
    )

    return {
        "total_transaction_value": float(amounts.sum()),
        "actual_fraud_amount": float(amounts[fraud].sum()),
        "estimated_expected_loss": float((y_prob * amounts).sum()),
        "prevented_loss_under_policy": float(amounts[fraud & flagged].sum()),
        "flagged_legitimate_count": int((legit & flagged).sum()),
        "false_positive_cost": fp_cost,
        "net_expected_cost": fp_cost
        + float(amounts[fraud & ~flagged].sum())
        + float(amounts[fraud & review].sum() * 0.5),
    }
