# MerchantShield AI — Technical Report

## Problem
MerchantShield AI is a defense-only transaction-fraud risk engine. 
It scores incoming card transactions and returns a calibrated fraud probability, 
a 0–100 risk score, a three-way decision (APPROVE / REVIEW / BLOCK), 
an expected-loss estimate, and model explanations.

## Dataset
- Source: Credit Card Fraud Detection — Machine Learning Group, ULB (https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)
- Rows: 283726
- Columns: 31
- Features used: 29 (target and Time excluded)
- Fraud rate: 0.1667% (473 fraud / 283726 total)
- Duplicate rows dropped before splitting: 1081
- Missing values: none remaining after median imputation in the pipeline

## Methodology
- Chronological split: earliest transactions → train, next → validation, latest → test.
- The held-out test set was not used for model selection, calibration, or threshold search.
- Class imbalance handled with class_weight / scale_pos_weight and threshold optimization.
- SMOTE was not used. Resampling, if ever added, would be restricted to the training set.
- Leakage audit: PASS

### Splits
- Train: 198608 rows, fraud rate 0.1843%
- Validation: 42559 rows, fraud rate 0.1292%
- Held-out Test: 42559 rows, fraud rate 0.1222%

## Model comparison (validation, default threshold 0.50)
              model  precision   recall       f1   pr_auc  roc_auc  expected_cost_at_0.5
logistic_regression   0.037862 0.927273 0.072753 0.837165 0.981100              32513.69
      random_forest   0.652174 0.818182 0.725806 0.858796 0.981140               1000.57
           lightgbm   0.104326 0.745455 0.183036 0.089857 0.905414               9987.85

## Model selection
Selected model: **random_forest**
Reason: Lowest expected business cost on the validation set after threshold search (435.63). PR-AUC is reported but was not the sole selection criterion.

## Threshold selection
Binary and three-way thresholds were chosen by minimizing expected business cost 
**on the validation set only**.
- T_review: 0.15000000000000002
- T_block: 0.2
- Binary operating threshold (used for classification metrics): 0.2

## Business cost assumptions
- C_FP (block a legitimate transaction): 25.0
- C_FN multiplier × amount (missed fraud): 1.0
- REVIEW cost multiplier vs BLOCK: 0.5

All final performance metrics below are calculated on a held-out test set 
that was not used for model selection or threshold optimization.

## Held-out test results
- Precision: 0.8810
- Recall: 0.7115
- F1: 0.7872
- PR-AUC: 0.7649
- ROC-AUC: 0.9798
- Fraud detection rate: 0.7115
- False-positive rate: 0.0001
- False-negative rate: 0.2885
- Confusion: TP=37, FP=5, TN=42502, FN=15
- Expected cost (binary policy at selected threshold): 2794.16
- FP cost: 125.00
- FN cost: 2669.16

## Portfolio financial summary (test, three-way policy)
- total_transaction_value: 3096732.92
- actual_fraud_amount: 6168.880000000001
- estimated_expected_loss: 4743.811251804758
- prevented_loss_under_policy: 3795.7200000000003
- flagged_legitimate_count: 9
- false_positive_cost: 175.0
- net_expected_cost: 2696.1600000000003

## Probability calibration
- Brier score (raw): 0.004092
- Brier score (calibrated): 0.000431
Calibrated probabilities are used for risk score, expected loss, and policy decisions.

## Error analysis
- False positives: {'count': 5, 'mean_amount': 1.062, 'median_amount': 0.77, 'total_amount': 5.3100000000000005}
- False negatives: {'count': 15, 'mean_amount': 177.94400000000002, 'median_amount': 12.31, 'total_amount': 2669.1600000000003}
False positives are legitimate customers inconvenienced by review/block. 
False negatives are fraud that would be approved and drive expected loss. 
The selected policy is a cost-minimizing tradeoff, not a claim of perfect detection.

## Explainability
Per-transaction SHAP (or linear coefficient) attributions describe which features 
increased or reduced the model's predicted fraud risk. They do not prove that a 
transaction is fraudulent.

## Limitations
- Features V1–V28 are PCA components; they are not directly interpretable business attributes.
- The public dataset is European card transactions from 2013; it is not this product's live traffic.
- Expected loss is probability × amount, an expected-value estimate, not guaranteed loss.
- Chronological split still allows same-day timestamp ties at split boundaries.

Generated: 2026-08-31T12:52:56.363189+00:00
