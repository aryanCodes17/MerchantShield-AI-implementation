from pathlib import Path
from datetime import datetime

from fastapi.responses import FileResponse,JSONResponse
import uuid
from uuid import uuid4
from .metrics import load_metrics
from fastapi import (
    Depends,
    FastAPI,
    HTTPException,
)
import os
import hmac
import hashlib
from fastapi import Request
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pandas as pd
from pydantic import BaseModel  
from src.evaluation.calibration import apply_calibrator
from sqlalchemy.orm import Session
from src.config import get_project_root

from .database import (
    Base,
    engine as db_engine,
    get_db,
)

from .models import Transaction

from src.risk_engine.scorer import (
    FraudRiskEngine,
    ModelNotLoadedError,
)
from dotenv import load_dotenv
PROJECT_ROOT = Path(__file__).resolve().parents[1]

load_dotenv(PROJECT_ROOT / ".env")

load_dotenv()
class RazorpayOrderRequest(BaseModel):
    amount: float
    transaction_id: str

from .razorpay_service import RazorpayService
razorpay_service = RazorpayService()

# --------------------------------------------------
# Database
# --------------------------------------------------

Base.metadata.create_all(bind=db_engine)


# --------------------------------------------------
# FastAPI
# --------------------------------------------------

app = FastAPI(
    title="MerchantShield AI API",
    description="AI-powered transaction risk scoring API",
    version="1.0.0",
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:4174",
        "http://127.0.0.1:4174",
        "https://merchantshield-ai.onrender.com",
        "https://merchantshield-ai-implementation-1.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# ML Model
# --------------------------------------------------

risk_engine = FraudRiskEngine()

try:
    risk_engine.load()
except Exception as exc:
    print(f"Model loading failed: {exc}")


# --------------------------------------------------
# Request Schema
# --------------------------------------------------

class TransactionRequest(BaseModel):
    amount: float
    features: dict[str, float]


# --------------------------------------------------
# Basic Routes
# --------------------------------------------------

@app.get("/")
def root():

    return {
        "status": "online",
        "service": "MerchantShield AI",
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
    }


@app.get("/features")
def features():

    return {
        "feature_names": risk_engine.feature_names,
    }

@app.get("/model-info")
def model_info():
    try:
        return risk_engine.get_model_info()

    except ModelNotLoadedError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        )


# --------------------------------------------------
# Prediction
# --------------------------------------------------

@app.post("/predict")
def predict(
    transaction: TransactionRequest,
    db: Session = Depends(get_db),
):
    try:

        # Run the fraud-risk model
        result = risk_engine.score_transaction(
            transaction.features,
            transaction_amount=transaction.amount,
            include_explanation=False,
        )

        # Save prediction to database
        db_transaction = Transaction(
            transaction_id=f"TXN-{uuid.uuid4().hex[:8].upper()}",

            amount=float(transaction.amount),

            fraud_probability=float(
                result.get("fraud_probability", 0)
            ),

            raw_fraud_probability=float(
                result.get("raw_fraud_probability", 0)
            ),

            risk_score=float(
                result.get("risk_score", 0)
            ),

            decision=result.get(
                "decision",
                "UNKNOWN"
            ),

            expected_loss=float(
                result.get("expected_loss", 0)
            ),

            # Store the original model inputs
            features=transaction.features,

            # Store model explanation if the risk engine provides it
            top_risk_factors=result.get(
                "top_risk_factors",
                []
            ),
        )

        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)

        return{
            **result,
            "transaction_id": db_transaction.transaction_id,
        }

    except (
        ValueError,
        ModelNotLoadedError,
        RuntimeError,
    ) as exc:

        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )


# --------------------------------------------------
# Demo Review Transaction
# --------------------------------------------------

@app.get("/demo/review")
def demo_review(db: Session = Depends(get_db)):
    """Find one real dataset transaction that falls into REVIEW."""

    root = get_project_root()
    data_path = root / "data" / "raw" / "creditcard.csv"

    if not data_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Dataset not found at {data_path}",
        )

    try:
        df = pd.read_csv(data_path)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to load credit-card dataset: {exc}",
        ) from exc

    feature_names = risk_engine.feature_names

    missing = [
        name for name in feature_names
        if name not in df.columns
    ]

    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Dataset is missing model features: {missing}",
        )

    # Use the real dataset features.
    X = df[feature_names].copy()

    try:
        # Batch prediction: much faster than scoring row-by-row.
        raw_probs = risk_engine.model.predict_proba(X)[:, 1]

        if risk_engine.calibrator is not None:
            calibrated_probs = apply_calibrator(
                risk_engine.calibrator,
                raw_probs,
            )
        else:
            calibrated_probs = raw_probs

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to score dataset: {exc}",
        ) from exc

    # Find genuine REVIEW examples using the production thresholds.
    review_indices = np.where(
        (calibrated_probs >= risk_engine.threshold_review)
        & (calibrated_probs < risk_engine.threshold_block)
    )[0]

    if len(review_indices) == 0:
        raise HTTPException(
            status_code=404,
            detail=(
                "No genuine REVIEW transaction was found "
                "in creditcard.csv using the current model thresholds."
            ),
        )

    # Take the first real REVIEW transaction.
    idx = int(review_indices[0])

    features = {
        name: float(df.iloc[idx][name])
        for name in feature_names
    }

    # Amount is stored separately in the dataset.
    amount = float(df.iloc[idx]["Amount"])

    # Run the normal production scorer ONCE.
    result = risk_engine.score_transaction(
        features,
        transaction_amount=amount,
        include_explanation=True,
    )

    # Safety check — never save something that isn't actually REVIEW.
    if result["decision"] != "REVIEW":
        raise HTTPException(
            status_code=500,
            detail=(
                "Internal consistency error: "
                "selected transaction is no longer REVIEW."
            ),
        )

    transaction_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"

    db_transaction = Transaction(
        transaction_id=transaction_id,
        amount=amount,
        fraud_probability=float(
            result.get("fraud_probability", 0)
        ),
        raw_fraud_probability=float(
            result.get("raw_fraud_probability", 0)
        ),
        risk_score=float(
            result.get("risk_score", 0)
        ),
        decision="REVIEW",
        expected_loss=float(
            result.get("expected_loss", 0)
        ),
        features=features,
        top_risk_factors=result.get(
            "top_risk_factors",
            [],
        ),
    )

    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)

    return {
        **result,
        "transaction_id": transaction_id,
        "amount": amount,
        "features": features,
        "demo": True,
        "source": "real_creditcard_dataset",
    }
# --------------------------------------------------
# Transaction History
# --------------------------------------------------

@app.get("/transactions")
def get_transactions(
    db: Session = Depends(get_db),
):

    transactions = (
        db.query(Transaction)
        .order_by(
            Transaction.created_at.desc()
        )
        .all()
    )


    return [

        {
            "id": transaction.transaction_id,

            "amount": transaction.amount,

            "fraud_probability":
                transaction.fraud_probability,

            "raw_fraud_probability":
                transaction.raw_fraud_probability,

            "risk_score":
                transaction.risk_score,

            "decision":
                transaction.decision,

            "expected_loss":
                transaction.expected_loss,

            "features":
                transaction.features,

            "top_risk_factors":
                transaction.top_risk_factors,

            # Razorpay payment audit information
            "razorpay_order_id": 
                transaction.razorpay_order_id,
            "razorpay_payment_id": 
                transaction.razorpay_payment_id,
            "payment_status": 
                transaction.payment_status,
            "payment_verified":
                transaction.payment_verified,

            # Analyst review audit information
            "review_status":
                transaction.review_status,
            "reviewed_at":
                (
                    transaction.reviewed_at.isoformat()
                    if transaction.reviewed_at
                    else None
                ),

            "timestamp":
                transaction.created_at.isoformat(),
        }

        for transaction in transactions

    ]

# --------------------------------------------------
# Transaction Review
# --------------------------------------------------

@app.post("/transactions/{transaction_id}/review")
def mark_transaction_reviewed(
    transaction_id: str,
    db: Session = Depends(get_db),
):
    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_id == transaction_id
        )
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found.",
        )

    if transaction.decision != "REVIEW":
        raise HTTPException(
            status_code=400,
            detail="Only REVIEW transactions can be marked as reviewed.",
        )

    transaction.review_status = "REVIEWED"
    transaction.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(transaction)

    return {
        "success": True,
        "transaction_id": transaction.transaction_id,
        "review_status": transaction.review_status,
        "reviewed_at": (transaction.reviewed_at.isoformat()
                        if transaction.reviewed_at
                        else None
        ),
        "message": "Transaction marked as reviewed.",
    }

@app.get("/model-metrics")
def model_metrics():

    return load_metrics()

@app.get("/model-figures/roc-pr")
def roc_pr_curve():

    figure_path = (
        Path(__file__).resolve().parents[1]
        / "reports"
        / "figures"
        / "roc_pr_curves.png"
    )

    if not figure_path.exists():
        raise HTTPException(
            status_code=404,
            detail="ROC/PR curve figure not found"
        )

    return FileResponse(
        figure_path,
        media_type="image/png"
    )

@app.get("/model-figures/threshold")
def threshold_analysis():

    figure_path = (
        Path(__file__).resolve().parents[1]
        / "reports"
        / "figures"
        / "threshold_analysis.png"
    )

    if not figure_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Threshold analysis figure not found"
        )

    return FileResponse(
        figure_path,
        media_type="image/png"
    )

@app.get("/threshold-analysis")
def threshold_analysis():
    from pathlib import Path
    import json

    metadata_path = (
        Path(__file__).resolve().parents[1]
        / "models"
        / "model_metadata.json"
    )

    if not metadata_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Model metadata not found"
        )

    with open(
        metadata_path,
        "r",
        encoding="utf-8"
    ) as file:
        metadata = json.load(file)

    return {
        "selected_threshold": metadata.get(
            "selected_threshold",
            0.55
        ),

        "threshold_review": metadata.get(
            "threshold_review",
            0.55
        ),

        "threshold_block": metadata.get(
            "threshold_block",
            0.60
        ),

        "threshold_analysis": metadata.get(
            "threshold_analysis",
            []
        ),

        "three_way_threshold_analysis": metadata.get(
            "three_way_threshold_analysis",
            []
        )
    }

# --------------------------------------------------
# Razorpay Order Creation
# --------------------------------------------------

@app.post("/razorpay/create-order")
def create_razorpay_order(
    request: RazorpayOrderRequest,
    db: Session = Depends(get_db),
):
    try:
        # Find the MerchantShield transaction
        transaction = (
            db.query(Transaction)
            .filter(
                Transaction.transaction_id == request.transaction_id
            )
            .first()
        )

        if not transaction:
            raise HTTPException(
                status_code=404,
                detail="MerchantShield transaction not found.",
            )

        # Only APPROVED transactions can create a payment
        if transaction.decision != "APPROVE":
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Payment cannot be created for "
                    f"{transaction.decision} transaction."
                ),
            )

        receipt = f"ms_{uuid.uuid4().hex[:12]}"

        order = razorpay_service.create_order(
            amount=request.amount,
            receipt=receipt,
        )

        # Save Razorpay order against MerchantShield transaction
        transaction.razorpay_order_id = order["id"]
        transaction.payment_status = "ORDER_CREATED"
        transaction.payment_verified = False

        db.commit()
        db.refresh(transaction)

        return {
            "key_id": razorpay_service.key_id,
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "receipt": order["receipt"],
            "transaction_id": transaction.transaction_id,
        }

    except HTTPException:
        raise

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=f"Razorpay order creation failed: {exc}",
        )

# --------------------------------------------------
# Razorpay Payment Verification
# --------------------------------------------------

class RazorpayVerificationRequest(BaseModel):
    transaction_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


# --------------------------------------------------
# Razorpay Payment Verification
# --------------------------------------------------

@app.post("/razorpay/verify")
def verify_razorpay_payment(
    payment: RazorpayVerificationRequest,
    db: Session = Depends(get_db),
):
    try:
        # Find the MerchantShield transaction
        transaction = (
            db.query(Transaction)
            .filter(
                Transaction.transaction_id
                == payment.transaction_id
            )
            .first()
        )

        if not transaction:
            raise HTTPException(
                status_code=404,
                detail="MerchantShield transaction not found.",
            )

        # Make sure the Razorpay order belongs to this transaction
        if (
            transaction.razorpay_order_id
            != payment.razorpay_order_id
        ):
            raise HTTPException(
                status_code=400,
                detail="Razorpay order does not match transaction.",
            )

        # Server-side Razorpay signature verification
        razorpay_service.verify_payment_signature(
            order_id=payment.razorpay_order_id,
            payment_id=payment.razorpay_payment_id,
            signature=payment.razorpay_signature,
        )

        # Save verified payment information
        transaction.razorpay_payment_id = (
            payment.razorpay_payment_id
        )

        transaction.payment_status = "VERIFIED"

        transaction.payment_verified = True

        db.commit()
        db.refresh(transaction)

        return {
            "verified": True,
            "transaction_id": transaction.transaction_id,
            "order_id": transaction.razorpay_order_id,
            "payment_id": transaction.razorpay_payment_id,
            "payment_status": transaction.payment_status,
            "message": "Razorpay payment verified successfully.",
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Payment verification failed: {str(exc)}",
        )

# --------------------------------------------------
# Razorpay Webhook
# --------------------------------------------------

# Razorpay can retry the same webhook event. Keep recently processed
# event IDs in memory so duplicate deliveries are not processed twice
# while this application process is running.
processed_webhook_events = set()


@app.post("/razorpay/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        # IMPORTANT:
        # Signature validation must use the exact raw request body.
        payload = await request.body()

        signature = request.headers.get("X-Razorpay-Signature")
        event_id = request.headers.get("x-razorpay-event-id")

        if not signature:
            raise HTTPException(
                status_code=400,
                detail="Missing Razorpay webhook signature.",
            )

        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

        if not webhook_secret:
            raise HTTPException(
                status_code=500,
                detail="Razorpay webhook secret is not configured.",
            )

        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(
            expected_signature,
            signature,
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid webhook signature.",
            )

        # Parse JSON only after signature validation.
        data = await request.json()
        event = data.get("event")

        print(f"Razorpay webhook received: {event}")

        # Idempotency:
        # Razorpay may deliver the same event more than once.
        if event_id and event_id in processed_webhook_events:
            return {
                "success": True,
                "event": event,
                "duplicate": True,
                "message": "Webhook event already processed.",
            }

        # --------------------------------------------------
        # Extract payment/order information
        # --------------------------------------------------

        payment_entity = (
            data.get("payload", {})
            .get("payment", {})
            .get("entity", {})
        )

        order_entity = (
            data.get("payload", {})
            .get("order", {})
            .get("entity", {})
        )

        payment_id = payment_entity.get("id")
        order_id = (
            payment_entity.get("order_id")
            or order_entity.get("id")
        )

        # --------------------------------------------------
        # Handle payment.authorized
        # --------------------------------------------------

        if event == "payment.authorized":
            if order_id:
                transaction = (
                    db.query(Transaction)
                    .filter(
                        Transaction.razorpay_order_id == order_id
                    )
                    .first()
                )

                if transaction:
                    transaction.payment_status = "AUTHORIZED"

                    if payment_id:
                        transaction.razorpay_payment_id = payment_id

                    db.commit()

        # --------------------------------------------------
        # Handle payment.captured / order.paid
        # --------------------------------------------------

        elif event in {"payment.captured", "order.paid"}:
            if order_id:
                transaction = (
                    db.query(Transaction)
                    .filter(
                        Transaction.razorpay_order_id == order_id
                    )
                    .first()
                )

                if transaction:
                    # A captured payment is a successful payment.
                    transaction.payment_status = "VERIFIED"
                    transaction.payment_verified = True

                    if payment_id:
                        transaction.razorpay_payment_id = payment_id

                    db.commit()

                    print(
                        f"Payment captured for MerchantShield transaction "
                        f"{transaction.transaction_id}"
                    )
                else:
                    print(
                        f"No MerchantShield transaction found for "
                        f"Razorpay order {order_id}"
                    )

        # --------------------------------------------------
        # Handle payment.failed
        # --------------------------------------------------

        elif event == "payment.failed":
            if order_id:
                transaction = (
                    db.query(Transaction)
                    .filter(
                        Transaction.razorpay_order_id == order_id
                    )
                    .first()
                )

                if transaction:
                    # Do not downgrade an already verified payment if
                    # Razorpay delivers events out of order.
                    if not transaction.payment_verified:
                        transaction.payment_status = "FAILED"

                        if payment_id:
                            transaction.razorpay_payment_id = payment_id

                        db.commit()

                    print(
                        f"Payment failure received for MerchantShield "
                        f"transaction {transaction.transaction_id}"
                    )
                else:
                    print(
                        f"No MerchantShield transaction found for "
                        f"Razorpay order {order_id}"
                    )

        # --------------------------------------------------
        # Unsupported event
        # --------------------------------------------------

        else:
            print(f"Unhandled Razorpay webhook event: {event}")

        # Mark the event as processed only after successful handling.
        if event_id:
            processed_webhook_events.add(event_id)

        return {
            "success": True,
            "event": event,
            "event_id": event_id,
            "order_id": order_id,
            "payment_id": payment_id,
            "message": "Webhook processed successfully.",
        }

    except HTTPException:
        raise

    except Exception as exc:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail=f"Webhook processing failed: {str(exc)}",
        )

