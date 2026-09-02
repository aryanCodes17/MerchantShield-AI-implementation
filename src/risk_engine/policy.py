"""Three-way fraud decision policy."""

from __future__ import annotations

from enum import Enum
from typing import Literal


class Decision(str, Enum):
    APPROVE = "APPROVE"
    REVIEW = "REVIEW"
    BLOCK = "BLOCK"


def apply_policy(
    fraud_probability: float,
    threshold_review: float,
    threshold_block: float,
) -> Decision:
    """
    Map calibrated fraud probability to APPROVE / REVIEW / BLOCK.

    LOW RISK  (p < T_review)  → APPROVE
    MEDIUM    (T_review ≤ p < T_block) → REVIEW
    HIGH RISK (p ≥ T_block) → BLOCK
    """
    if fraud_probability >= threshold_block:
        return Decision.BLOCK
    if fraud_probability >= threshold_review:
        return Decision.REVIEW
    return Decision.APPROVE


def probability_to_risk_score(calibrated_probability: float) -> int:
    """
    Convert calibrated probability to 0–100 risk score.

    Transparent linear mapping: risk_score = round(probability × 100).
    """
    score = int(round(max(0.0, min(1.0, calibrated_probability)) * 100))
    return score


def compute_expected_loss(fraud_probability: float, transaction_amount: float) -> float:
    """
    Expected fraud loss (expected-value estimate, not guaranteed loss).

    expected_loss = fraud_probability × transaction_amount
    """
    return round(fraud_probability * transaction_amount, 2)
