"""Lightweight monitoring and drift detection."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def compute_psi(expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
    """
    Population Stability Index for prediction distribution drift.

    PSI < 0.1: no significant shift
    PSI 0.1–0.2: moderate shift
    PSI > 0.2: significant shift — investigate
    """
    breakpoints = np.linspace(0, 1, buckets + 1)
    expected_pct = np.histogram(expected, bins=breakpoints)[0] / max(len(expected), 1)
    actual_pct = np.histogram(actual, bins=breakpoints)[0] / max(len(actual), 1)

    expected_pct = np.clip(expected_pct, 1e-6, None)
    actual_pct = np.clip(actual_pct, 1e-6, None)
    psi = np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct))
    return float(psi)


class FraudMonitor:
    """Track scoring volume, decisions, and drift."""

    def __init__(self, psi_threshold: float = 0.2):
        self.psi_threshold = psi_threshold
        self.history: list[dict[str, Any]] = []
        self.baseline_probs: list[float] | None = None

    def set_baseline(self, probabilities: np.ndarray) -> None:
        """Set baseline prediction distribution (e.g., from validation)."""
        self.baseline_probs = probabilities.tolist()

    def record(self, record: dict[str, Any]) -> None:
        """Record a scored transaction."""
        self.history.append(record)

    def summary(self) -> dict[str, Any]:
        """Compute monitoring summary."""
        if not self.history:
            return {"status": "no_data", "n_transactions": 0}

        df = pd.DataFrame(self.history)
        decisions = df["decision"].value_counts(normalize=True).to_dict() if "decision" in df else {}
        probs = df["fraud_probability"].values if "fraud_probability" in df else np.array([])

        psi = None
        drift_alert = False
        if self.baseline_probs and len(probs) > 0:
            psi = compute_psi(np.array(self.baseline_probs), probs)
            drift_alert = psi > self.psi_threshold

        return {
            "n_transactions": len(self.history),
            "decision_distribution_pct": {k: round(v * 100, 2) for k, v in decisions.items()},
            "avg_fraud_probability": float(probs.mean()) if len(probs) else 0.0,
            "avg_transaction_amount": float(df["transaction_amount"].mean())
            if "transaction_amount" in df
            else 0.0,
            "psi": psi,
            "drift_alert": drift_alert,
            "psi_threshold": self.psi_threshold,
        }
