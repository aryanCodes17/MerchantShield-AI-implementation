"""API validation and /predict integration tests."""

from __future__ import annotations

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from api.main import app, engine
from src.features.preprocessing import build_preprocessor


def _attach_tiny_model() -> None:
    X = pd.DataFrame({"V1": [0.0, 2.0, -1.0, 3.0], "Amount": [10.0, 80.0, 12.0, 90.0]})
    y = np.array([0, 1, 0, 1])
    pipeline = Pipeline(
        [("preprocessor", build_preprocessor(["V1", "Amount"])), ("classifier", LogisticRegression())]
    )
    pipeline.fit(X, y)
    engine.model = pipeline
    engine.calibrator = None
    engine.feature_names = ["V1", "Amount"]
    engine.threshold_review = 0.3
    engine.threshold_block = 0.8
    engine.metadata = {"model_name": "test_logistic"}
    engine._loaded = True


def test_health():
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert "model_loaded" in res.json()


def test_predict_malformed_amount():
    _attach_tiny_model()
    client = TestClient(app)
    res = client.post("/predict", json={"Amount": "not-a-number", "V1": 0.1})
    assert res.status_code == 422


def test_predict_success():
    _attach_tiny_model()
    client = TestClient(app)
    res = client.post("/predict", json={"Amount": 85.0, "V1": 2.4})
    assert res.status_code == 200
    body = res.json()
    assert "fraud_probability" in body
    assert "risk_score" in body
    assert body["decision"] in {"APPROVE", "REVIEW", "BLOCK"}
    assert "expected_loss" in body
    assert "top_risk_factors" in body


def test_predict_without_model_is_not_approve():
    engine._loaded = False
    engine.model = None
    client = TestClient(app)
    res = client.post("/predict", json={"Amount": 10.0, "V1": 0.0})
    assert res.status_code == 503
    assert "APPROVE" not in res.json().get("detail", "").split()[:1]
