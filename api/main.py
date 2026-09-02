"""
MerchantShield AI REST API.

Defense-only scoring service. Never silently approves when scoring fails.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.config import load_config
from src.monitoring.drift import FraudMonitor
from src.risk_engine.scorer import FraudRiskEngine, ModelNotLoadedError

logger = logging.getLogger("merchantshield.api")
logging.basicConfig(level=logging.INFO)

engine = FraudRiskEngine()
monitor = FraudMonitor()


class TransactionRequest(BaseModel):
    """Incoming authorization-time transaction features."""

    model_config = ConfigDict(extra="allow")

    Amount: float = Field(..., description="Transaction amount")
    Time: float | None = Field(default=None, description="Seconds elapsed; not used as a model feature")

    @field_validator("Amount")
    @classmethod
    def amount_must_be_finite(cls, value: float) -> float:
        if value != value:  # NaN
            raise ValueError("Amount cannot be NaN")
        if abs(value) > 1e12:
            raise ValueError("Amount is outside the supported range")
        return value


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        engine.load()
        cfg = load_config()
        monitor.psi_threshold = cfg["monitoring"]["psi_threshold"]
        logger.info("Model loaded")
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to load model at startup: %s", exc)
    yield


app = FastAPI(
    title="MerchantShield AI",
    description="Defense-only merchant transaction-fraud risk engine",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", model_loaded=engine._loaded)


@app.get("/model-info")
def model_info() -> dict[str, Any]:
    try:
        return engine.get_model_info()
    except ModelNotLoadedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/monitoring")
def monitoring_summary() -> dict[str, Any]:
    return monitor.summary()


@app.post("/predict")
def predict(payload: TransactionRequest) -> dict[str, Any]:
    if not engine._loaded:
        raise HTTPException(
            status_code=503,
            detail="Model is not loaded. Scoring refused (fail-safe: no silent APPROVE).",
        )

    raw = payload.model_dump()
    features = {k: v for k, v in raw.items() if v is not None}

    try:
        result = engine.score_transaction(features, transaction_amount=payload.Amount)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ModelNotLoadedError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        logger.exception("Scoring failed")
        raise HTTPException(
            status_code=500,
            detail=f"Scoring failed; transaction was not approved. Reason: {exc}",
        ) from exc

    monitor.record(
        {
            "decision": result["decision"],
            "fraud_probability": result["fraud_probability"],
            "transaction_amount": result["transaction_amount"],
        }
    )
    return result
