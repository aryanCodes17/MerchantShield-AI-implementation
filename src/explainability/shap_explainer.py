"""SHAP-based explainability for fraud scoring."""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def extract_row_shap_values(shap_values, row_index: int = 0) -> np.ndarray:
    """
    Normalize SHAP outputs across SHAP versions to a 1-D vector for one row.

    Newer TreeExplainer outputs may be (n_samples, n_features, n_classes).
    """
    if isinstance(shap_values, list):
        picked = shap_values[1] if len(shap_values) > 1 else shap_values[0]
        return np.asarray(picked, dtype=float)[row_index].reshape(-1)

    arr = np.asarray(shap_values, dtype=float)
    if arr.ndim == 3:
        return arr[row_index, :, -1].reshape(-1)
    if arr.ndim == 2:
        return arr[row_index].reshape(-1)
    return arr.reshape(-1)


def explain_prediction_shap(
    model_pipeline,
    X: pd.DataFrame,
    feature_names: list[str],
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Generate top risk-increasing and decreasing feature contributions.

    Language is probabilistic — never claims definitive fraud.
    """
    try:
        import shap
    except ImportError:
        logger.error("SHAP not installed")
        return _fallback_explanation(feature_names, top_k)

    try:
        classifier = model_pipeline.named_steps["classifier"]
        preprocessor = model_pipeline.named_steps["preprocessor"]
        X_transformed = preprocessor.transform(X)

        if hasattr(classifier, "booster_") or hasattr(classifier, "estimators_"):
            explainer = shap.TreeExplainer(classifier)
            values = extract_row_shap_values(explainer.shap_values(X_transformed), 0)
        elif hasattr(classifier, "coef_"):
            row = np.asarray(X_transformed[0]).reshape(-1)
            values = classifier.coef_.flatten() * row
        else:
            return _fallback_explanation(feature_names, top_k)

        values = np.asarray(values, dtype=float).reshape(-1)
        n = min(len(feature_names), len(values))
        abs_vals = np.abs(values[:n])
        strong_cut = float(np.percentile(abs_vals, 75)) if n else 0.0

        contributions = list(zip(feature_names[:n], values[:n]))
        contributions.sort(key=lambda x: abs(float(x[1])), reverse=True)

        factors = []
        for feat, val in contributions[:top_k]:
            val_f = float(val)
            direction = "increased" if val_f > 0 else "reduced"
            strength = "strongly " if abs(val_f) > strong_cut else ""
            factors.append(
                {
                    "feature": feat,
                    "shap_value": val_f,
                    "description": (
                        f"{feat} {strength}{direction} fraud risk. "
                        "These features contributed most to the model's prediction."
                    ),
                    "direction": "increase" if val_f > 0 else "decrease",
                }
            )
        return factors
    except Exception as exc:  # noqa: BLE001
        logger.warning("SHAP explanation failed: %s", exc)
        return _fallback_explanation(feature_names, top_k)


def _fallback_explanation(feature_names: list[str], top_k: int) -> list[dict[str, Any]]:
    """Fallback when SHAP unavailable."""
    return [
        {
            "feature": f,
            "shap_value": 0.0,
            "description": (
                f"{f} contributed to the model's prediction "
                "(fallback attribution; SHAP was unavailable)."
            ),
            "direction": "unknown",
        }
        for f in feature_names[:top_k]
    ]


def format_top_factors(factors: list[dict[str, Any]]) -> list[str]:
    """Format factors for display."""
    lines = []
    for f in factors:
        sign = "+" if f.get("direction") == "increase" else "-"
        lines.append(f"{sign} {f['description']}")
    return lines
