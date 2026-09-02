# MerchantShield AI

**Defense-only AI risk engine for merchant transaction-fraud detection.**

MerchantShield AI scores a card transaction and returns:

1. Calibrated fraud probability (0–1)
2. Risk score (0–100)
3. Decision: `APPROVE` / `REVIEW` / `BLOCK`
4. Top contributing features
5. Expected fraud loss (probability × amount — an expected-value estimate, not guaranteed loss)

This project is strictly defensive. It does **not** generate fraud, simulate attacks, steal credentials, or teach evasion.

---

## 1. Project overview

A production-style internship portfolio system: imbalanced classification, cost-sensitive thresholds, probability calibration, explainability, a FastAPI scoring service, a Streamlit risk console, monitoring, and tests.

## 2. Problem statement

Merchants lose money when fraudulent payments are authorized (false negatives) and lose customers/operations time when legitimate payments are blocked or sent to review (false positives). The product problem is not “maximize accuracy”; it is **minimize expected business cost** under a three-way policy.

## 3. Why fraud detection is difficult

- Extreme class imbalance (typically well under 1% fraud).
- Accuracy is misleading: a model that always predicts legitimate looks strong.
- Decision thresholds must reflect **asymmetric costs**.
- Production traffic arrives in time; random splits leak the future into training.
- Probabilities must be calibrated if they drive expected-loss and policy.

## 4. Architecture

```
transaction features
        │
        ▼
 preprocessing pipeline (median impute + scale)
        │
        ▼
 classifier (selected on validation)
        │
        ▼
 probability calibrator (fit on validation)
        │
        ▼
 risk engine: score, policy, expected loss, SHAP
        │
        ├── FastAPI  POST /predict
        └── Streamlit risk console
```

## 5. Dataset

[Credit Card Fraud Detection](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) — Machine Learning Group, Université Libre de Bruxelles.

Anonymized PCA features `V1`–`V28`, `Time`, `Amount`, and binary target `Class` (1 = fraud).

Download:

```bash
python scripts/download_data.py
```

Do not invent metrics. All reported numbers are produced by `python scripts/train.py`.

## 6. Data preprocessing

- Drop duplicate rows before splitting.
- Exclude `Class` (target) and `Time` (split key only) from model features.
- Median impute + `StandardScaler` inside a sklearn pipeline fitted **on train only**.

## 7. Leakage prevention

Automated checks:

- Target not in feature list
- No overlapping row indices across splits
- Chronological order: train → validation → test

**All final performance metrics are calculated on a held-out test set that was not used for model selection or threshold optimization.**

## 8. Model selection

Candidates: logistic regression (balanced class weights), random forest (balanced class weights), LightGBM (`scale_pos_weight` from the **training** class ratio).

Selection criterion: **lowest expected business cost on validation** after threshold search. PR-AUC / ROC-AUC are reported and used as diagnostic metrics, not as the sole winner rule.

See `reports/model_comparison.csv` and `reports/final_report.md` after training.

## 9. Imbalanced classification strategy

- Class weights / `scale_pos_weight` (train-set derived)
- Threshold optimization on validation
- PR-AUC as the ranking metric of record

SMOTE is **not** used. If resampling is added later, it must be applied to the training set only. Resampling validation or test would distort operating-point estimates.

## 10. Threshold optimization

Grid: 0.05, 0.10, …, 0.90 on **validation calibrated probabilities**.

The test set is scored **once** after thresholds are frozen.

## 11. Business cost model

Configurable in `configs/config.yaml`:

- `C_FP`: cost of incorrectly blocking/reviewing a legitimate transaction
- `C_FN`: missed-fraud loss = multiplier × transaction amount
- REVIEW is cheaper than BLOCK for legitimate traffic, and still carries residual fraud risk

`Expected cost = FP cost + FN cost`

## 12. Probability calibration

Isotonic regression (default) or Platt scaling is fit on validation raw scores. Brier score and a calibration curve compare raw vs calibrated probabilities on the held-out test set.

Calibration matters because risk score, expected loss, and APPROVE/REVIEW/BLOCK all consume probabilities as if they were frequencies.

## 13. Explainability

Per-transaction SHAP (trees) or signed coefficient × value (linear). Language is attribution-only: these features contributed most to the model’s prediction — not “this is definitely fraud.”

Risk score mapping: `risk_score = round(calibrated_probability × 100)`.

## 14. API documentation

```bash
uvicorn api.main:app --reload --port 8000
```

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + model loaded flag |
| GET | `/model-info` | Frozen metadata, features, thresholds |
| GET | `/monitoring` | Volume, decision mix, PSI |
| POST | `/predict` | Score one transaction |

If the model cannot score a request, the API returns **4xx/5xx**. It never silently returns `APPROVE`.

Example:

```bash
curl -X POST http://127.0.0.1:8000/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"Amount\": 12500, \"V1\": -1.2, \"V2\": 0.4}"
```

(Include `V1`–`V28` in a real call; missing values are imputed. Completely empty feature sets are rejected.)

## 15. Dashboard

```bash
streamlit run app/dashboard.py
```

Dataset stats, model comparison, test metrics, cost/threshold plots, calibration, confusion matrix, SHAP, and a demo scoring workspace with preloaded **synthetic** examples drawn from feature distributions (not real customer transactions).

## 16. Monitoring

Lightweight in-process monitor: volume, decision mix, average amount, prediction distribution, Population Stability Index vs a baseline. Monitoring only — no attack simulation.

## 17. Testing

```bash
pytest
```

Covers preprocessing, leakage, policy, expected loss, calibration, monitoring, scorer fail-closed behavior, and API validation/`/predict`.

## 18. Results

**All final performance metrics are calculated on a held-out test set that was not used for model selection or threshold optimization.**

### Validation comparison (threshold 0.50, for diagnostics)

| Model | Precision | Recall | F1 | PR-AUC | ROC-AUC | Expected cost @ 0.50 |
|---|---:|---:|---:|---:|---:|---:|
| Logistic regression | 0.038 | 0.927 | 0.073 | 0.837 | 0.981 | 32,514 |
| Random forest | 0.652 | 0.818 | 0.726 | 0.859 | 0.981 | 1,001 |
| LightGBM | 0.104 | 0.745 | 0.183 | 0.090 | 0.905 | 9,988 |

**Selected model: random forest** — lowest expected business cost on validation after threshold search (435.63 at threshold 0.70 on raw scores; after calibration, operating threshold 0.55).

LightGBM is weaker here (validation PR-AUC 0.09). That is a real outcome, not hidden. Likely causes: PCA features plus a still-aggressive positive weight, and boosting over-focusing on hard negatives. Random forest with `class_weight="balanced"` ranked the rare class more stably. Next steps if boosting is required: leaf-wise regularization, lower learning rate, and tuning `min_child_samples` / `num_leaves` on validation only.

### Held-out test (random forest, threshold 0.55)

| Precision | Recall | F1 | PR-AUC | ROC-AUC | Expected cost |
|---:|---:|---:|---:|---:|---:|
| 0.902 | 0.712 | 0.796 | 0.684 | 0.959 | 2,769 |

Confusion: TP=37, FP=4, TN=42,503, FN=15 (52 fraud cases in test).

Test PR-AUC (0.68) is lower than validation PR-AUC (0.86). The later time window has a lower fraud rate and a different mix; that gap is expected with a chronological split and should not be papered over.

Error analysis: the 4 false positives are tiny-amount legitimate rows (mean amount ≈ 1.08). The 15 false negatives carry almost all remaining loss (mean amount ≈ 178). The policy is conservative on customer friction and still misses some higher-value fraud — the central product tradeoff.

Plots: `reports/figures/`. Full write-up: `reports/final_report.md`.

## 19. Limitations

- PCA features are not business-interpretable attributes.
- 2013 European card data ≠ your live merchant mix.
- Expected loss is not guaranteed loss.
- Public labels are not a production case-management system.

## 20. Future improvements

- Production feature store (device, velocity, merchant MCC) instead of PCA-only inputs
- Online calibration / champion-challenger
- Human-in-the-loop review outcomes as delayed labels
- Stronger drift monitors on each feature, not only scores

---

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python scripts/download_data.py
python scripts/train.py
python scripts/evaluate.py
uvicorn api.main:app --reload --port 8000
streamlit run app/dashboard.py
pytest
```

### Docker (API)

Train first so `models/*.joblib` exist, then:

```bash
docker build -t merchantshield-ai .
docker run -p 8000:8000 merchantshield-ai
```

## Security / defense-only

This repository scores and explains transaction risk for merchants. It does not include fraud generation, credential theft, bypass methods, or exploitation tooling.
