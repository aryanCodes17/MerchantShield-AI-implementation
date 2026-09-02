from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    String,
    JSON,
    Boolean
)

from .database import Base


class Transaction(Base):

    __tablename__ = "transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    transaction_id = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    amount = Column(
        Float,
        nullable=False,
    )

    fraud_probability = Column(
        Float,
        nullable=False,
    )

    raw_fraud_probability = Column(
        Float,
        nullable=False,
    )

    risk_score = Column(
        Float,
        nullable=False,
    )

    decision = Column(
        String,
        nullable=False,
    )

    expected_loss = Column(
        Float,
        nullable=False,
    )

    # Original model inputs
    features = Column(
        JSON,
        nullable=True,
    )

    # Model explanation / SHAP output
    top_risk_factors = Column(
        JSON,
        nullable=True,
    )

    razorpay_order_id = Column(
        String,
        nullable=True
    )
    razorpay_payment_id = Column(
        String,
        nullable=True
    )
    payment_status = Column(
        String, 
        nullable=True
    )
    payment_verified = Column(
        Boolean, 
        default=False
    )

    review_status = Column(
    String,
    nullable=True,
    )

    reviewed_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )