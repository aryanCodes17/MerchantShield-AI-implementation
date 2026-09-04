# 🛡️ MerchantShield AI

### 🚨 AI-Powered Fraud Risk Decisioning for Merchant Transactions

> **Detect. Explain. Decide. Review. Verify.**  
> MerchantShield AI is a production-style fraud risk engine that combines machine learning, probability calibration, explainable AI, configurable risk policies, human review, and Razorpay payment verification into one end-to-end system.

---

## 🎯 Problem Statement

Merchants face two competing risks when processing online payments:

### 💸 Fraud Loss

Fraudulent transactions that are incorrectly approved can directly cause financial loss.

### ⚠️ False Positive Loss

Legitimate transactions that are blocked unnecessarily can cause:

- 😤 Customer friction
- 💰 Lost revenue
- 👨‍💼 Manual operational workload
- 😕 Poor payment experience

Therefore, simply maximizing ML accuracy is **not enough**.

MerchantShield separates machine learning prediction from business decisioning:

```text
🤖 ML Prediction
       ↓
📊 Probability Calibration
       ↓
⚖️ Risk Policy
       ↓
🎯 Business Decision
       ↓
👨‍💼 Human Review / 💳 Payment
```

This allows the system to make risk-aware operational decisions rather than treating every prediction as a simple binary classification.

---

# 🧠 Core Features

## 1️⃣ 🤖 AI Fraud Scoring

Each transaction is evaluated using a trained **Random Forest fraud classifier**.

The scoring engine produces:

- 🎲 Raw fraud probability
- 📈 Calibrated fraud probability
- 🔢 Risk score from 0–100
- 💰 Expected fraud loss estimate
- 🎯 Final risk decision

---

## 2️⃣ 🚦 Three-Way Risk Decisioning

MerchantShield converts calibrated fraud probability into an operational action:

| Decision | Meaning |
|---|---|
| 🟢 **APPROVE** | Transaction is sufficiently low risk |
| 🟡 **REVIEW** | Transaction requires human inspection |
| 🔴 **BLOCK** | Transaction exceeds the configured fraud-risk threshold |

The thresholds are configuration-driven and applied by the backend risk engine.

This keeps:

```text
🤖 ML Prediction
```

separate from:

```text
⚖️ Business Policy
```

---

## 3️⃣ 📊 Probability Calibration

Raw model probabilities are calibrated before being used for business decisions.

This is important because a classifier's raw probability output does not automatically represent a reliable estimate of real-world fraud likelihood.

MerchantShield therefore follows:

```text
Random Forest
     ↓
Raw Probability
     ↓
Probability Calibration
     ↓
Calibrated Fraud Probability
     ↓
Risk Policy
```

This calibrated probability is used by the decision engine.

---

## 4️⃣ 💰 Expected Fraud Loss

MerchantShield estimates the expected fraud loss associated with a transaction.

Conceptually:

```text
Expected Loss
    =
Fraud Probability × Potential Loss
```

This provides a business-oriented interpretation of model predictions instead of relying only on classification labels.

---

## 5️⃣ 🧠 Explainable AI with SHAP

MerchantShield uses **SHAP-based explanations** to show why a transaction received its risk score.

For each transaction, the system can surface influential features such as:

```text
🔺 Feature → increases fraud risk

🔻 Feature → decreases fraud risk
```

Example:

```text
Top Risk Factors

🔺 V4
🔺 V19
🔺 V14

🟢 V3
🟢 V10
```

This helps reviewers understand the model's reasoning instead of receiving an unexplained:

```text
BLOCK
```

or:

```text
REVIEW
```

---

# 👨‍💼 Human-in-the-Loop Review

Not every suspicious transaction should automatically be blocked.

Transactions inside the configured **REVIEW** band are routed to a human reviewer.

The review workflow is:

```text
🧾 Transaction
      ↓
🤖 ML Scoring
      ↓
📊 Calibration
      ↓
🟡 REVIEW
      ↓
👨‍💼 Human Investigation
      ↓
✅ Approve / ❌ Reject
```

This creates a practical balance between automation and human judgment.

---

# 💳 Razorpay Integration

MerchantShield integrates with **Razorpay Test Mode** to demonstrate payment-aware risk decisioning.

The payment flow is:

```text
🛒 Merchant Transaction
        ↓
🛡️ MerchantShield Risk Engine
        ↓
🎯 Risk Decision
        ↓
💳 Razorpay Test Payment
        ↓
🔐 Server-Side Verification
        ↓
✅ Verified Transaction
```

### 🔗 Razorpay Workflow

The backend supports:

- 🧾 Order creation
- 💳 Razorpay Test Mode checkout
- 🔐 Server-side payment signature verification
- 📡 Razorpay webhook processing
- 🔄 Payment state management
- 🛡️ Protection against invalid state downgrades

Supported webhook events include:

```text
payment.authorized
payment.captured
payment.failed
order.paid
```

A verified payment cannot be incorrectly downgraded by a late or stale webhook event.

---

# 🧪 Verified Demo Transaction

MerchantShield includes a verified transaction specifically designed to demonstrate the **REVIEW** workflow.

### 📌 Demo Transaction

| Metric | Value |
|---|---:|
| 💰 Amount | ₹7.58 |
| 🎲 Raw Probability | 0.6799 |
| 📊 Calibrated Probability | 0.1874 |
| 🔢 Risk Score | 19 |
| 🟡 Decision | **REVIEW** |
| 💸 Expected Loss | 1.42 |

### 🧠 Top SHAP Factors

| Feature | Contribution |
|---|---:|
| 🔺 V4 | +0.0779 |
| 🔺 V19 | +0.0777 |
| 🔺 V14 | +0.0747 |
| 🔻 V3 | -0.0552 |
| 🔻 V10 | -0.0294 |

This gives the reviewer a concrete example of a transaction that is **not obviously safe enough to auto-approve but also does not cross the blocking threshold**.

---

# 🏗️ System Architecture

```text
                    ┌──────────────────────┐
                    │    React Frontend    │
                    │   ⚛️ Vite + Tailwind │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      FastAPI API     │
                    │      🚀 Backend      │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
      🤖 ML Risk Engine    🧠 SHAP         💳 Razorpay
             │                 │                 │
             └─────────────────┼─────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    🗄️ SQLite DB      │
                    │   SQLAlchemy ORM     │
                    └──────────────────────┘
```

---

# 🔬 Machine Learning Pipeline

MerchantShield follows an end-to-end ML pipeline:

```text
📥 Transaction Data
        ↓
🧹 Data Preprocessing
        ↓
⚖️ Imbalanced Classification Handling
        ↓
🌲 Random Forest Training
        ↓
📊 Probability Calibration
        ↓
📈 Risk Scoring
        ↓
🎯 Threshold-Based Decisioning
        ↓
🧠 SHAP Explanation
```

### 🧮 Model Output

The model produces:

```text
Raw Fraud Probability
        ↓
Calibrated Fraud Probability
        ↓
Risk Score
        ↓
Expected Loss
        ↓
Business Decision
```

---

# 🎯 Risk Decision Policy

MerchantShield uses configurable probability thresholds.

The policy separates three operational outcomes:

```text
🟢 APPROVE
      ↓
Low-risk transaction

🟡 REVIEW
      ↓
Human investigation required

🔴 BLOCK
      ↓
High-risk transaction
```

The thresholds are stored in:

```text
models/threshold_config.json
```

This allows the business policy to be changed without rewriting the entire ML pipeline.

---

# 🖥️ Dashboard

The frontend provides a merchant-focused risk dashboard.

### 📊 Dashboard Capabilities

- 📈 Transaction risk overview
- 🤖 AI fraud scoring
- 🟢 APPROVE / 🟡 REVIEW / 🔴 BLOCK decisions
- 🧠 SHAP explanations
- 👨‍💼 Manual review workflow
- 💳 Razorpay Test Mode payment flow
- 🔐 Payment verification
- 🧾 Transaction history
- 🧪 Verified demo transaction

The goal is to present model output as an **operational decision**, not just a machine-learning prediction.

---

# 🧩 Technology Stack

## 🎨 Frontend

- ⚛️ React
- ⚡ Vite
- 🎨 Tailwind CSS
- 📊 Recharts
- 🧩 Lucide Icons

## 🚀 Backend

- 🐍 Python
- ⚡ FastAPI
- 🧾 Pydantic
- 🗄️ SQLAlchemy
- 💾 SQLite

## 🤖 Machine Learning

- 🐼 Pandas
- 🔢 NumPy
- 🌲 Scikit-learn
- 💡 LightGBM
- 🚀 XGBoost
- 🧠 SHAP
- 💾 Joblib

## 💳 Payments

- Razorpay Test Mode
- 🔐 Server-side signature verification
- 📡 Webhooks

## ☁️ Deployment

- 🌐 Render
- 🐙 GitHub

---

# 📁 Project Structure

```text
MerchantShield-AI-implementation/
│
├── 📁 backend/
│   ├── main.py
│   └── ...
│
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── App.jsx
│   │   ├── 📁 pages/
│   │   │   └── TransactionScoring.jsx
│   │   └── config.js
│   └── package.json
│
├── 📁 models/
│   ├── fraud_model.joblib
│   ├── calibrator.joblib
│   ├── preprocessor.joblib
│   ├── feature_names.json
│   ├── model_metadata.json
│   └── threshold_config.json
│
├── 📁 data/
│   └── 📁 processed/
│       └── demo_transactions.json
│
├── 📁 configs/
│   └── config.yaml
│
├── 📄 requirements.txt
├── 📄 README.md
└── 📄 .gitignore
```

---

# 🚀 Running Locally

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/aryanCodes17/MerchantShield-AI-implementation.git
cd MerchantShield-AI-implementation
```

## 2️⃣ Create a Python Environment

```bash
python -m venv .venv
```

### Windows

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

---

## 3️⃣ Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

## 4️⃣ Configure Environment Variables

Create a local `.env` file:

```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

⚠️ **Never commit `.env` or production secrets to GitHub.**

---

## 5️⃣ Start the Backend

From the project root:

```bash
uvicorn backend.main:app --reload --port 8000
```

Backend:

```text
http://127.0.0.1:8000
```

API documentation:

```text
http://127.0.0.1:8000/docs
```

---

## 6️⃣ Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://127.0.0.1:5173
```

---

# 🔌 API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| 🟢 GET | `/health` | Health check |
| 📚 GET | `/docs` | FastAPI Swagger documentation |
| 🧪 GET | `/demo/review` | Verified REVIEW demo transaction |
| 🤖 POST | `/predict` | Score a transaction |
| 📋 GET | `/transactions` | Retrieve transaction history |
| 👨‍💼 POST | `/transactions/{transaction_id}/review` | Submit review decision |
| 💳 POST | `/razorpay/create-order` | Create Razorpay order |
| 🔐 POST | `/razorpay/verify` | Verify Razorpay payment |
| 📡 POST | `/razorpay/webhook` | Process Razorpay webhook events |

---

# 🌐 Production Deployment

MerchantShield is designed to run as two deployed services:

```text
                    🌍 Internet
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
       🎨 Frontend              🚀 Backend
        Render                  Render
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
                    🗄️ Database
```

### 🔐 Production Configuration

The frontend uses:

```env
VITE_API_URL=https://merchantshield-ai-implementation-1.onrender.com.
```

The backend handles:

- 🌐 CORS
- 🔐 Razorpay secrets
- 🤖 ML inference
- 🧠 SHAP explanations
- 🗄️ Transaction persistence
- 📡 Webhook verification

---

# 🛡️ Security

MerchantShield follows several security practices:

### 🔐 Secrets

Sensitive credentials are loaded through environment variables.

```text
.env
```

is excluded from version control.

### 📡 Webhook Verification

Razorpay webhook requests are validated using:

```text
X-Razorpay-Signature
```

and the configured webhook secret.

### 🔄 Duplicate Event Handling

Webhook event IDs are tracked to reduce duplicate event processing during the running application lifecycle.

### 🧱 Payment State Protection

Verified payments cannot be downgraded by stale authorization or failure events.

Example:

```text
AUTHORIZED
     ↓
VERIFIED
```

A late:

```text
payment.authorized
```

or:

```text
payment.failed
```

event cannot incorrectly overwrite the verified state.

---

# 🧪 Example Risk Scoring

A transaction passes through the following pipeline:

```text
🧾 Input Transaction
        ↓
🤖 Random Forest
        ↓
🎲 Raw Probability
        ↓
📊 Calibration
        ↓
📈 Calibrated Probability
        ↓
⚖️ Risk Policy
        ↓
🎯 Decision
```

Possible outcomes:

```text
🟢 APPROVE
🟡 REVIEW
🔴 BLOCK
```

---

# 🧠 Why Calibration Matters

Suppose a model produces:

```text
Raw Probability = 0.68
```

That value does not automatically mean that the transaction has a true 68% probability of being fraudulent.

MerchantShield therefore calibrates model probabilities before using them for risk policy decisions.

Example:

```text
Raw Probability
      0.6799
        ↓
Calibration
        ↓
Calibrated Probability
      0.1874
        ↓
Risk Policy
        ↓
🟡 REVIEW
```

This separation makes the system easier to reason about and tune.

---

# 👨‍💻 Recommended Demo Flow

For a live demonstration, use this sequence:

### 1️⃣ Open the Dashboard

Show the merchant risk overview.

### 2️⃣ Score a Normal Transaction

Demonstrate:

```text
🧾 Transaction
      ↓
🤖 AI Scoring
      ↓
🟢 APPROVE
```

### 3️⃣ Open the Demo Review

Use the verified demo transaction:

```text
₹7.58
Raw Probability: 0.6799
Calibrated Probability: 0.1874
Decision: 🟡 REVIEW
```

### 4️⃣ Show SHAP

Explain the top factors contributing to the decision.

### 5️⃣ Perform Human Review

Show how a reviewer can inspect and act on the transaction.

### 6️⃣ Demonstrate Razorpay

Create a Razorpay Test Mode payment.

### 7️⃣ Verify Payment

Show:

```text
💳 Payment
   ↓
🔐 Server Verification
   ↓
✅ VERIFIED
```

### 🎤 Demo Story

The complete story is:

```text
🔍 DETECT
   ↓
🧠 EXPLAIN
   ↓
⚖️ DECIDE
   ↓
👨‍💼 REVIEW
   ↓
💳 TRANSACT
   ↓
🔐 VERIFY
```

---

# 🧱 Design Principles

MerchantShield is built around several principles:

### 🤖 ML Should Predict

The model estimates fraud risk.

### ⚖️ Policy Should Decide

Business thresholds determine whether the transaction should be approved, reviewed, or blocked.

### 🧠 Decisions Should Be Explainable

SHAP helps reviewers understand important model factors.

### 👨‍💼 Humans Should Handle Ambiguity

The REVIEW band provides a middle ground between automatic approval and automatic blocking.

### 🔐 Payments Should Be Verified Server-Side

Client-side payment success is not treated as sufficient proof of verification.

### 🔄 Payment State Should Be Monotonic

Once a payment reaches a verified state, stale events should not move it backward.

---

# 📌 Current Capabilities

| Capability | Status |
|---|---|
| 🤖 Fraud prediction | ✅ Implemented |
| 📊 Probability calibration | ✅ Implemented |
| 🎯 Three-way decisioning | ✅ Implemented |
| 🧠 SHAP explanations | ✅ Implemented |
| 👨‍💼 Human review | ✅ Implemented |
| 💳 Razorpay Test Mode | ✅ Implemented |
| 🔐 Server-side payment verification | ✅ Implemented |
| 📡 Razorpay webhooks | ✅ Implemented |
| 🛡️ Webhook state protection | ✅ Implemented |
| 📋 Transaction history | ✅ Implemented |
| 🌐 FastAPI backend | ✅ Implemented |
| ⚛️ React frontend | ✅ Implemented |
| ☁️ Render deployment | ✅ Implemented |

---

# ⚠️ Limitations

MerchantShield is a **hackathon / portfolio prototype** and should not be interpreted as a production-certified fraud prevention system.

Current limitations include:

- 🧪 Demonstration-oriented dataset and model setup
- 🗄️ SQLite is used for persistence
- 🧠 Model performance depends on the training data
- 🔄 Webhook duplicate tracking is process-lifetime based
- ☁️ Production persistence characteristics depend on the deployment environment
- 📈 Fraud patterns can change over time

A production deployment would require additional infrastructure, monitoring, security controls, model governance, and operational validation.

---

# 🔮 Future Improvements

Potential next steps include:

- 📡 Real-time streaming transaction ingestion
- 🧠 Advanced ensemble models
- 🌐 Graph-based fraud detection
- 👤 Merchant-specific risk models
- 📈 Continuous model monitoring
- 🔄 Automated model retraining
- 🚨 Real-time fraud alerts
- 🗄️ PostgreSQL / distributed database
- ⚡ Redis-based event deduplication
- 📊 Advanced fraud analytics
- 🧪 Automated model evaluation pipelines
- 🔐 Stronger production authentication and authorization
- 📋 Complete audit logging

---

# 📊 ML → Business Decision Architecture

One of the key ideas behind MerchantShield is keeping prediction and decisioning separate.

```text
                    🤖 MACHINE LEARNING
                           │
                           ▼
                 Fraud Probability
                           │
                           ▼
                  📊 Calibration Layer
                           │
                           ▼
                  Calibrated Probability
                           │
                           ▼
                    ⚖️ POLICY LAYER
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
          🟢 APPROVE     🟡 REVIEW     🔴 BLOCK
             │             │             │
             ▼             ▼             ▼
          💳 Pay       👨‍💼 Human       🚫 Stop
                       Investigation
```

This architecture makes the system easier to explain, test, and modify.

---

# 🏆 What Makes MerchantShield Different?

MerchantShield is not simply:

```text
Transaction → Fraud / Not Fraud
```

Instead, it treats fraud detection as a **decisioning problem**:

```text
Transaction
     ↓
🤖 Predict
     ↓
📊 Calibrate
     ↓
💰 Estimate Loss
     ↓
⚖️ Apply Policy
     ↓
🎯 Decide
     ↓
🧠 Explain
     ↓
👨‍💼 Review if Necessary
     ↓
💳 Verify Payment
```

The system therefore connects:

**Machine Learning + Business Risk + Explainability + Human Review + Payment Verification**

into a single workflow.

---

# 🚀 Project Goal

The goal of MerchantShield is to demonstrate how an AI fraud model can be transformed into a practical merchant-facing decision system.

Rather than optimizing only for model accuracy, the project focuses on:

```text
🎯 Risk-aware decisions
🧠 Explainable predictions
⚖️ Cost-sensitive policy
👨‍💼 Human oversight
💳 Payment verification
🔐 Secure event handling
```

---

# 👨‍💻 Author

**Aryan Codes17**

Built as an AI-powered fraud-risk decisioning project for the **Razorpay AI Buildathon 2026**.

---

# ⚠️ Disclaimer

MerchantShield AI is a demonstration and educational project.

It is **not intended to provide financial, payment, legal, or security advice**, and it should not be used as the sole decision-making system for real-world financial transactions without appropriate validation, monitoring, security controls, and regulatory review.

---

## ⭐ If you find the project interesting

Feel free to explore the code, experiment with the risk engine, and extend the system with your own fraud-detection ideas.

**🛡️ MerchantShield AI — Detect. Explain. Decide. Review. Verify.**
