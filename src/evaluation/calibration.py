"""Probability calibration for risk scoring."""

from __future__ import annotations

from typing import Any, Literal

import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression


def fit_calibrator(
    y_val: np.ndarray,
    y_prob_val: np.ndarray,
    method: Literal["isotonic", "sigmoid"] = "isotonic",
):
    """
    Fit probability calibrator on validation predictions.

    Uses isotonic regression or Platt scaling (sigmoid via logistic regression).
    """
    if method == "isotonic":
        calibrator = IsotonicRegression(out_of_bounds="clip")
        calibrator.fit(y_prob_val, y_val)
        return calibrator

    # Platt scaling
    calibrator = LogisticRegression(max_iter=1000)
    calibrator.fit(y_prob_val.reshape(-1, 1), y_val)
    return calibrator


def apply_calibrator(calibrator, y_prob: np.ndarray) -> np.ndarray:
    """Apply fitted calibrator to raw probabilities."""
    if hasattr(calibrator, "predict_proba"):
        return calibrator.predict_proba(y_prob.reshape(-1, 1))[:, 1]
    return calibrator.predict(y_prob)


def calibration_diagnostics(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> dict[str, Any]:
    """Compute calibration curve data."""
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="quantile")
    return {
        "fraction_of_positives": prob_true.tolist(),
        "mean_predicted_value": prob_pred.tolist(),
    }
