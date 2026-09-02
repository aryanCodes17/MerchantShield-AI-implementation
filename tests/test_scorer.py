"""Risk engine scoring tests."""

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from src.features.preprocessing import build_preprocessor
from src.risk_engine.scorer import FraudRiskEngine, ModelNotLoadedError


def _tiny_engine() -> FraudRiskEngine:
    X = pd.DataFrame({"V1": [0.0, 2.0, -1.0, 3.0], "Amount": [10.0, 80.0, 12.0, 90.0]})
    y = np.array([0, 1, 0, 1])
    pipeline = Pipeline(
        [("preprocessor", build_preprocessor(["V1", "Amount"])), ("classifier", LogisticRegression())]
    )
    pipeline.fit(X, y)
    engine = FraudRiskEngine()
    engine.model = pipeline
    engine.calibrator = None
    engine.feature_names = ["V1", "Amount"]
    engine.threshold_review = 0.3
    engine.threshold_block = 0.8
    engine._loaded = True
    return engine


def test_unloaded_engine_refuses_to_score():
    engine = FraudRiskEngine()
    try:
        engine.score_transaction({"V1": 0.0, "Amount": 10.0})
        raise AssertionError("Should have failed closed")
    except ModelNotLoadedError:
        pass


def test_score_transaction_outputs():
    engine = _tiny_engine()
    result = engine.score_transaction({"V1": 2.5, "Amount": 85.0}, include_explanation=False)
    assert 0.0 <= result["fraud_probability"] <= 1.0
    assert 0 <= result["risk_score"] <= 100
    assert result["decision"] in {"APPROVE", "REVIEW", "BLOCK"}
    assert result["expected_loss"] == round(result["fraud_probability"] * 85.0, 2)


def test_missing_all_features_fails_closed():
    engine = _tiny_engine()
    try:
        engine.score_transaction({}, transaction_amount=10)
        raise AssertionError("Should have failed")
    except ValueError:
        pass
