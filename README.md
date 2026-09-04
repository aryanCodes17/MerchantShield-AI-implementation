# MerchantShield AI

> **AI-powered fraud risk decisioning for merchant transactions**

MerchantShield AI is a production-style fraud risk management platform that helps merchants make safer payment decisions using machine learning, calibrated fraud probabilities, explainable AI, human review, and payment verification.

It converts a transaction into an actionable decision:

**APPROVE → REVIEW → BLOCK**

while showing why the model considers a transaction risky.

---

## 🚀 Why MerchantShield?

Traditional fraud detection systems often stop at:

> "This transaction looks suspicious."

MerchantShield goes further.

It answers:

- How risky is this transaction?
- How confident is the model?
- Why is it risky?
- Should we approve, review, or block it?
- What happens when a human needs to review it?
- Was the resulting payment actually verified?

The platform combines ML prediction, probability calibration, policy-based decisioning, explainability, human review, and payment verification into one workflow.

---

# 🎯 Problem Statement

Merchants face two competing risks:

### Fraud Loss

Fraudulent transactions that are incorrectly approved can directly cause financial loss.

### False Positive Loss

Legitimate transactions that are blocked unnecessarily can cause:

- Customer friction
- Lost revenue
- Manual operational workload
- Poor payment experience

Therefore, simply maximizing ML accuracy is not enough.

MerchantShield separates:

```text
ML Prediction
      ↓
Probability Calibration
      ↓
Risk Policy
      ↓
Business Decision
      ↓
Human Review / Payment

🧠 Core Features
1. AI Fraud Scoring

Each transaction is evaluated using a trained Random Forest fraud classifier.

The scoring engine produces:

Raw fraud probability
Calibrated fraud probability
Risk score from 0–100
Expected fraud loss estimate
Final risk decision
2. Three-Way Risk Decisioning

MerchantShield converts calibrated fraud probability into an operational action:

Decision	Meaning
APPROVE	Transaction is sufficiently low risk
REVIEW	Transaction requires human inspection
BLOCK	Transaction exceeds the configured fraud-risk threshold

The thresholds are configuration-driven and applied by the backend risk engine.

This keeps ML prediction separate from business policy.

📊 ML Pipeline
Transaction
     |
     v
V1 ... V28 + Amount
     |
     v
Random Forest Classifier
     |
     v
Raw Fraud Probability
     |
     v
Probability Calibration
     |
     v
Calibrated Fraud Probability
     |
     v
Risk Decision Policy
   /       |       \
APPROVE  REVIEW    BLOCK
             |
             v
       Risk Score
             |
             v
       Expected Loss
             |
             v
       SHAP Explanation
Why calibration?

A model's raw probability is not automatically a reliable business probability.

MerchantShield calibrates the model output before applying risk thresholds.

This allows the system to distinguish:

What the model predicts

from:

What action the business should take

🔍 Explainable AI

A fraud score alone is not enough for an operations team.

MerchantShield uses SHAP to identify the features that contributed most strongly to an individual prediction.

The dashboard displays:

Top risk factors
SHAP contribution values
Whether each feature increased or decreased risk
Human-readable explanations

Example:

V4   ↑ increased fraud risk
V19  ↑ increased fraud risk
V14  ↑ increased fraud risk
V3   ↓ reduced fraud risk
V10  ↓ reduced fraud risk

This allows an operator to understand:

"Why was this transaction flagged?"

rather than seeing only a probability.

👤 Human-in-the-Loop Review

Transactions classified as REVIEW can be inspected by an operator.

The review workflow includes:

Transaction details
Fraud probability
Risk score
Expected loss
SHAP risk factors
Review action
Review timestamp

This creates a human-in-the-loop fraud workflow instead of treating ML predictions as unquestionable decisions.

💳 Razorpay Integration

MerchantShield integrates with Razorpay Test Mode to demonstrate the complete payment lifecycle.

Payment Flow
APPROVE Transaction
        |
        v
Create Razorpay Order
        |
        v
Razorpay Test Payment
        |
        v
Client Payment Response
        |
        v
Server-side Signature Verification
        |
        v
Payment VERIFIED
Webhook Processing

The backend handles:

payment.authorized
payment.captured
payment.failed
order.paid

Webhook signatures are validated using the raw request body and configured webhook secret.

The implementation also includes:

Duplicate event handling
Server-side payment verification
Protection against payment state downgrades
Handling of out-of-order payment events

Razorpay is used in Test Mode for this project.

🧪 Verified Demo Transaction

The application includes a small, version-controlled demo transaction so that the production demo does not require the complete fraud dataset at runtime.

The demo feature vector was derived from a real dataset row and is re-scored live by the production fraud model.

Current verified result
Transaction Amount:       ₹7.58
Raw Fraud Probability:    0.6799
Calibrated Probability:   0.1874
Risk Score:                   19
Decision:                 REVIEW

The same production scoring pipeline generates the SHAP explanation.

This provides a deterministic demonstration while keeping the full dataset out of the production runtime.

🏗️ System Architecture
                  ┌───────────────────────┐
                  │   React + Vite UI     │
                  │   Merchant Dashboard  │
                  └───────────┬───────────┘
                              │
                           REST API
                              │
                              ▼
                  ┌───────────────────────┐
                  │    FastAPI Backend    │
                  └───────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌────────────┐ ┌──────────────┐ ┌─────────────┐
       │ Random     │ │ Probability  │ │    SHAP     │
       │ Forest     │ │ Calibration  │ │ Explanation │
       │ Model      │ │              │ │             │
       └────────────┘ └──────────────┘ └─────────────┘
              │               │
              └───────────────┘
                      │
                      ▼
              ┌─────────────────┐
              │   Risk Policy   │
              └───────┬─────────┘
                      │
             ┌────────┼────────┐
             ▼        ▼        ▼
          APPROVE   REVIEW    BLOCK
             │        │
             │        ▼
             │   Human Review
             │
             ▼
       Razorpay Test Mode
             │
             ▼
      Payment Verification
             │
             ▼
      Transaction Ledger
🛠️ Technology Stack
Frontend
React
Vite
Tailwind CSS
Recharts
Lucide Icons
Backend
Python
FastAPI
SQLAlchemy
SQLite
Pydantic
Machine Learning
scikit-learn
Random Forest
Probability Calibration
SHAP
pandas
NumPy
joblib
Payments
Razorpay Test Mode
Server-side payment signature verification
Webhook signature verification
Deployment
GitHub
Render
📁 Project Structure
merchantshield-ai/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   └── models.py
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── App.jsx
│
├── src/
│   ├── config/
│   └── risk_engine/
│       └── scorer.py
│
├── models/
│   ├── fraud_model.joblib
│   ├── calibrator.joblib
│   ├── preprocessor.joblib
│   ├── feature_names.json
│   ├── model_metadata.json
│   └── threshold_config.json
│
├── data/
│   └── processed/
│       └── demo_transactions.json
│
├── requirements.txt
└── README.md
⚙️ Running Locally
Backend

From the project root:

cd D:\merchantshield-ai

Activate the virtual environment:

.venv\Scripts\Activate.ps1

Start FastAPI:

uvicorn backend.main:app --reload --port 8000

Backend:

http://127.0.0.1:8000

Swagger API documentation:

http://127.0.0.1:8000/docs
Frontend

Open another terminal:

cd D:\merchantshield-ai\frontend
npm install
npm run dev

Frontend:

http://127.0.0.1:5173

The frontend backend URL is configured through:

VITE_API_URL
🔌 API Endpoints
Health
GET /health
Fraud Prediction
POST /predict
Transactions
GET /transactions
Demo Review
GET /demo/review
Human Review
POST /transactions/{transaction_id}/review
Razorpay
POST /razorpay/create-order
POST /razorpay/verify
POST /razorpay/webhook

Interactive API documentation:

/docs
🚀 Production Deployment

MerchantShield is deployed using Render.

React/Vite Frontend
        |
        v
FastAPI Backend
        |
        ├── Fraud Model
        ├── Calibration
        ├── SHAP
        ├── SQLite Transaction Ledger
        └── Razorpay Test Mode

The frontend communicates with the deployed backend through:

VITE_API_URL

Sensitive credentials are stored as environment variables and are not committed to the repository.

Required Razorpay configuration:

RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
🔐 Security

MerchantShield follows defensive security practices including:

Environment-based secret management
Server-side Razorpay payment verification
Raw-body webhook signature verification
Webhook duplicate-event handling
Protection against payment state downgrades
Database exclusion from version control
Environment-file exclusion from version control

This project is strictly defensive.

It does not generate fraud, attack payment systems, steal credentials, or provide fraud-evasion techniques.

🎬 Recommended Demo Flow

For a live demonstration:

Dashboard
    ↓
Transaction Scoring
    ↓
Analyze Transaction
    ↓
Risk Decision
    ↓
SHAP Explanation
    ↓
APPROVE / REVIEW / BLOCK
    ↓
Human Review
    ↓
Razorpay Test Payment
    ↓
Server-side Verification
    ↓
Transaction History
Product Story

Detect → Explain → Decide → Review → Transact → Verify

📌 Design Principles
Separate Prediction from Policy

The ML model estimates fraud probability.

The risk policy determines the operational action.

This makes business thresholds easier to change without retraining the model.

Explain Risk

A probability alone does not tell an operations team what to investigate.

SHAP provides feature-level evidence behind the prediction.

Keep Humans in the Loop

Uncertain transactions can be routed to human review instead of forcing an automatic decision.

Verify the Payment

A fraud decision and a successful payment are separate events.

MerchantShield therefore treats payment verification and fraud decisioning as distinct parts of the transaction lifecycle.

⚠️ Limitations

MerchantShield is a hackathon/prototype system and is not a production-certified payment fraud platform.

Current limitations include:

SQLite is used for the transaction ledger.
Razorpay integration uses Test Mode.
The demo transaction is deterministic.
Model performance depends on training data and feature quality.
Production deployment would require additional monitoring, access controls, database infrastructure, model governance, and operational safeguards.
🔮 Future Improvements

Potential production extensions include:

Real-time feature pipelines
Merchant-specific risk models
Behavioral transaction features
Model drift monitoring
Automated threshold optimization
Persistent production database
Role-based access control
Detailed audit logs
Continuous model evaluation
Feedback-driven model retraining
Fraud graph/network analysis
📜 Disclaimer

MerchantShield AI is an educational and defensive fraud-risk decisioning project.

Fraud probabilities and expected-loss values are model estimates and should not be interpreted as guarantees of fraud or financial loss.


### Then commit it on GitHub

At the bottom of GitHub:

**Commit changes → Commit directly to `main`**

Commit message:

```text
Update README for current architecture
