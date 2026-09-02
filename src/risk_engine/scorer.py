"""Core fraud risk scoring engine."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from src.config import get_project_root, load_config
from src.evaluation.calibration import apply_calibrator
from src.explainability.shap_explainer import explain_prediction_shap
from src.risk_engine.policy import (
    Decision,
    apply_policy,
    compute_expected_loss,
    probability_to_risk_score,
)

logger = logging.getLogger(__name__)


class ModelNotLoadedError(Exception):
    """Raised when scoring is attempted without a loaded model."""


class FraudRiskEngine:
    """
    Production fraud risk engine.

    Loads persisted artifacts and scores transactions.
    Fails safely — never silently approves on error.
    """

    def __init__(self, config: dict[str, Any] | None = None):
        self.config = config or load_config()
        self.model = None
        self.calibrator = None
        self.feature_names: list[str] = []
        self.threshold_review: float = 0.15
        self.threshold_block: float = 0.65
        self.metadata: dict[str, Any] = {}
        self._loaded = False

    def load(self) -> None:
        """Load model artifacts from disk."""
        root = get_project_root()
        paths = self.config["paths"]["artifacts"]
        model_path = root / paths["model"]
        calibrator_path = root / paths["calibrator"]
        features_path = root / paths["feature_names"]
        threshold_path = root / paths["threshold_config"]
        metadata_path = root / paths["metadata"]

        if not model_path.exists():
            raise ModelNotLoadedError(
                f"Model not found at {model_path}. Run training first: python scripts/train.py"
            )

        self.model = joblib.load(model_path)
        self.calibrator = joblib.load(calibrator_path) if calibrator_path.exists() else None

        with features_path.open("r", encoding="utf-8") as f:
            self.feature_names = json.load(f)

        if threshold_path.exists():
            with threshold_path.open("r", encoding="utf-8") as f:
                thresholds = json.load(f)
                self.threshold_review = thresholds["threshold_review"]
                self.threshold_block = thresholds["threshold_block"]

        if metadata_path.exists():
            with metadata_path.open("r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        self._loaded = True
        logger.info("FraudRiskEngine loaded successfully")

    def _ensure_loaded(self) -> None:
        if not self._loaded or self.model is None:
            raise ModelNotLoadedError("Model not loaded. Cannot score transaction safely.")

    def score_transaction(
        self,
        features: dict[str, float],
        transaction_amount: float | None = None,
        include_explanation: bool = True,
    ) -> dict[str, Any]:
        """
        Score a single transaction.

        Returns fraud probability, risk score, decision, expected loss, and SHAP factors.
        """
        self._ensure_loaded()

        amount_col = self.config["data"]["amount_column"]
        if transaction_amount is None:
            if amount_col not in features or features[amount_col] is None:
                raise ValueError("Transaction amount is required for expected-loss estimation.")
            transaction_amount = float(features[amount_col])

        if abs(float(transaction_amount)) > 1e12:
            raise ValueError("Transaction amount is outside the supported range.")

        row: dict[str, float] = {}
        missing: list[str] = []

        for name in self.feature_names:

            if (
                name not in features
                or features[name] is None
                or features[name] == ""
            ):
                missing.append(name)
                continue

            try:
                value = float(features[name])

            except (TypeError, ValueError) as exc:
                raise ValueError(
                    f"Invalid value for feature '{name}'"
                ) from exc

            if not np.isfinite(value):
                raise ValueError(
                    f"Feature '{name}' must be a finite number."
                )

            row[name] = value


        if missing:
            raise ValueError(
                "Missing required features: "
                + ", ".join(missing)
            )

        X = pd.DataFrame([row], columns=self.feature_names)

        try:
            raw_prob = float(self.model.predict_proba(X)[0, 1])
        except Exception as exc:
            raise RuntimeError(f"Model scoring failed: {exc}") from exc

        if self.calibrator is not None:
            calibrated_prob = float(apply_calibrator(self.calibrator, np.array([raw_prob]))[0])
        else:
            calibrated_prob = raw_prob

        decision = apply_policy(calibrated_prob, self.threshold_review, self.threshold_block)
        risk_score = probability_to_risk_score(calibrated_prob)
        expected_loss = compute_expected_loss(calibrated_prob, transaction_amount)

        result: dict[str, Any] = {
            "fraud_probability": round(calibrated_prob, 4),
            "raw_fraud_probability": round(raw_prob, 4),
            "risk_score": risk_score,
            "decision": decision.value,
            "transaction_amount": transaction_amount,
            "expected_loss": expected_loss,
            "disclaimer": (
                "Expected loss is an expected-value estimate, not guaranteed loss. "
                "Feature contributions reflect model inputs, not confirmed fraud."
            ),
        }

        if include_explanation:
            factors = explain_prediction_shap(self.model, X, self.feature_names)
            result["top_risk_factors"] = factors

        return result

    def get_model_info(self) -> dict[str, Any]:
        """Return model metadata for /model-info endpoint."""
        self._ensure_loaded()
        return {
            "model_name": self.metadata.get("model_name", "unknown"),
            "calibration_method": self.config["calibration"]["method"],
            "training_date": self.metadata.get("training_date"),
            "features": self.feature_names,
            "threshold_review": self.threshold_review,
            "threshold_block": self.threshold_block,
            "validation_metrics": self.metadata.get("validation_metrics"),
            "test_metrics": self.metadata.get("test_metrics"),
            "business_costs": self.metadata.get("business_costs"),
        }
