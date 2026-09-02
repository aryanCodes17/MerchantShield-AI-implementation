"""
End-to-end training pipeline.

Stages:
  1. Load + inspect dataset
  2. Temporal split + leakage checks
  3. Train baseline models (train set only)
  4. Compare models on validation
  5. Select model + optimize thresholds on validation
  6. Calibrate probabilities on validation
  7. Evaluate ONCE on held-out test
  8. Persist artifacts, plots, and reports
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import get_project_root, load_config
from src.data.leakage import run_leakage_checks
from src.data.loader import DATASET_SOURCE, inspect_dataset, load_raw_dataset
from src.data.splitter import split_summary, temporal_split
from src.evaluation.calibration import apply_calibrator, fit_calibrator
from src.evaluation.cost_model import compute_expected_cost, portfolio_financial_summary
from src.evaluation.error_analysis import analyze_errors
from src.evaluation.metrics import compute_brier_score, compute_classification_metrics
from src.evaluation.plots import (
    plot_calibration_curve,
    plot_confusion_matrix,
    plot_model_comparison,
    plot_roc_pr_curves,
    plot_threshold_analysis,
)
from src.evaluation.threshold import optimize_binary_threshold, optimize_three_way_thresholds
from src.features.preprocessing import (
    build_preprocessor,
    compute_scale_pos_weight,
    extract_xy,
    get_feature_columns,
)
from src.models.train import create_model_pipeline, get_model_factories
from src.risk_engine.policy import apply_policy

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("merchantshield.train")


def _json_safe(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, (np.floating, np.integer)):
        return obj.item()
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(_json_safe(payload), f, indent=2)


def _predict_proba(pipeline, X: pd.DataFrame) -> np.ndarray:
    return pipeline.predict_proba(X)[:, 1]


def _decisions(probs: np.ndarray, t_review: float, t_block: float) -> np.ndarray:
    return np.array([apply_policy(float(p), t_review, t_block).value for p in probs])


def build_final_report(
    config: dict[str, Any],
    eda: dict[str, Any],
    splits: dict[str, Any],
    comparison_df: pd.DataFrame,
    selected_model: str,
    selection_reason: str,
    val_metrics: dict[str, Any],
    test_metrics: dict[str, Any],
    test_cost: dict[str, Any],
    portfolio: dict[str, Any],
    calibration: dict[str, Any],
    error_report: dict[str, Any],
    leakage: dict[str, Any],
) -> str:
    costs = config["business_costs"]
    lines = [
        "# MerchantShield AI — Technical Report",
        "",
        "## Problem",
        "MerchantShield AI is a defense-only transaction-fraud risk engine. ",
        "It scores incoming card transactions and returns a calibrated fraud probability, ",
        "a 0–100 risk score, a three-way decision (APPROVE / REVIEW / BLOCK), ",
        "an expected-loss estimate, and model explanations.",
        "",
        "## Dataset",
        f"- Source: {DATASET_SOURCE}",
        f"- Rows: {eda['n_rows']}",
        f"- Columns: {eda['n_columns']}",
        f"- Features used: {eda['n_features']} (target and Time excluded)",
        f"- Fraud rate: {eda['target_distribution']['fraud_rate_pct']}% "
        f"({eda['target_distribution']['fraud']} fraud / {eda['n_rows']} total)",
        f"- Duplicate rows dropped before splitting: {eda['duplicate_rows']}",
        f"- Missing values: none remaining after median imputation in the pipeline",
        "",
        "## Methodology",
        "- Chronological split: earliest transactions → train, next → validation, latest → test.",
        "- The held-out test set was not used for model selection, calibration, or threshold search.",
        "- Class imbalance handled with class_weight / scale_pos_weight and threshold optimization.",
        "- SMOTE was not used. Resampling, if ever added, would be restricted to the training set.",
        f"- Leakage audit: {leakage['status']}",
        "",
        "### Splits",
        f"- Train: {splits['train']['n_transactions']} rows, fraud rate {splits['train']['fraud_rate_pct']}%",
        f"- Validation: {splits['validation']['n_transactions']} rows, fraud rate {splits['validation']['fraud_rate_pct']}%",
        f"- Held-out Test: {splits['test']['n_transactions']} rows, fraud rate {splits['test']['fraud_rate_pct']}%",
        "",
        "## Model comparison (validation, default threshold 0.50)",
        comparison_df.to_string(index=False),
        "",
        f"## Model selection",
        f"Selected model: **{selected_model}**",
        f"Reason: {selection_reason}",
        "",
        "## Threshold selection",
        "Binary and three-way thresholds were chosen by minimizing expected business cost ",
        "**on the validation set only**.",
        f"- T_review: {val_metrics.get('threshold_review')}",
        f"- T_block: {val_metrics.get('threshold_block')}",
        f"- Binary operating threshold (used for classification metrics): {val_metrics.get('threshold')}",
        "",
        "## Business cost assumptions",
        f"- C_FP (block a legitimate transaction): {costs['cost_false_positive']}",
        f"- C_FN multiplier × amount (missed fraud): {costs['cost_false_negative']}",
        f"- REVIEW cost multiplier vs BLOCK: {costs['review_cost_multiplier']}",
        "",
        "All final performance metrics below are calculated on a held-out test set ",
        "that was not used for model selection or threshold optimization.",
        "",
        "## Held-out test results",
        f"- Precision: {test_metrics['precision']:.4f}",
        f"- Recall: {test_metrics['recall']:.4f}",
        f"- F1: {test_metrics['f1']:.4f}",
        f"- PR-AUC: {test_metrics['pr_auc']:.4f}",
        f"- ROC-AUC: {test_metrics['roc_auc']:.4f}",
        f"- Fraud detection rate: {test_metrics['fraud_detection_rate']:.4f}",
        f"- False-positive rate: {test_metrics['false_positive_rate']:.4f}",
        f"- False-negative rate: {test_metrics['false_negative_rate']:.4f}",
        f"- Confusion: TP={test_metrics['true_positives']}, FP={test_metrics['false_positives']}, "
        f"TN={test_metrics['true_negatives']}, FN={test_metrics['false_negatives']}",
        f"- Expected cost (binary policy at selected threshold): {test_cost['expected_cost']:.2f}",
        f"- FP cost: {test_cost['fp_cost_total']:.2f}",
        f"- FN cost: {test_cost['fn_cost_total']:.2f}",
        "",
        "## Portfolio financial summary (test, three-way policy)",
        *[f"- {k}: {v}" for k, v in portfolio.items()],
        "",
        "## Probability calibration",
        f"- Brier score (raw): {calibration['brier_raw']:.6f}",
        f"- Brier score (calibrated): {calibration['brier_calibrated']:.6f}",
        "Calibrated probabilities are used for risk score, expected loss, and policy decisions.",
        "",
        "## Error analysis",
        f"- False positives: {error_report['false_positives']}",
        f"- False negatives: {error_report['false_negatives']}",
        "False positives are legitimate customers inconvenienced by review/block. ",
        "False negatives are fraud that would be approved and drive expected loss. ",
        "The selected policy is a cost-minimizing tradeoff, not a claim of perfect detection.",
        "",
        "## Explainability",
        "Per-transaction SHAP (or linear coefficient) attributions describe which features ",
        "increased or reduced the model's predicted fraud risk. They do not prove that a ",
        "transaction is fraudulent.",
        "",
        "## Limitations",
        "- Features V1–V28 are PCA components; they are not directly interpretable business attributes.",
        "- The public dataset is European card transactions from 2013; it is not this product's live traffic.",
        "- Expected loss is probability × amount, an expected-value estimate, not guaranteed loss.",
        "- Chronological split still allows same-day timestamp ties at split boundaries.",
        "",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        "",
    ]
    return "\n".join(str(x) for x in lines)


def main() -> None:
    config = load_config()
    root = get_project_root()
    seed = config["project"]["random_seed"]
    np.random.seed(seed)

    logger.info("=== Stage 1: Load and inspect dataset ===")
    df = load_raw_dataset(config)
    n_dup = int(df.duplicated().sum())
    if n_dup:
        logger.info("Dropping %s duplicate rows before splitting", n_dup)
        df = df.drop_duplicates().reset_index(drop=True)

    eda = inspect_dataset(df, config)
    eda["duplicate_rows"] = n_dup
    _write_json(root / config["paths"]["artifacts"]["eda_report"], eda)
    logger.info(
        "Rows=%s features=%s fraud=%s rate=%.4f%%",
        eda["n_rows"],
        eda["n_features"],
        eda["target_distribution"]["fraud"],
        eda["target_distribution"]["fraud_rate_pct"],
    )

    logger.info("=== Stage 2: Temporal split + leakage checks ===")
    data_cfg = config["data"]
    train_df, val_df, test_df = temporal_split(
        df,
        time_column=data_cfg["time_column"],
        train_ratio=data_cfg["train_ratio"],
        val_ratio=data_cfg["val_ratio"],
        test_ratio=data_cfg["test_ratio"],
    )
    splits = split_summary(
        {"train": train_df, "validation": val_df, "test": test_df},
        data_cfg["target_column"],
    )
    logger.info("Split summary: %s", splits)

    feature_columns = get_feature_columns(df, data_cfg["exclude_columns"])
    leakage = run_leakage_checks(
        train_df,
        val_df,
        test_df,
        feature_columns,
        data_cfg["target_column"],
        data_cfg["time_column"],
    )
    logger.info("Leakage checks: %s", leakage["status"])

    X_train, y_train = extract_xy(train_df, feature_columns, data_cfg["target_column"])
    X_val, y_val = extract_xy(val_df, feature_columns, data_cfg["target_column"])
    X_test, y_test = extract_xy(test_df, feature_columns, data_cfg["target_column"])
    amount_col = data_cfg["amount_column"]
    amt_val = val_df[amount_col].to_numpy()
    amt_test = test_df[amount_col].to_numpy()

    spw = compute_scale_pos_weight(y_train)
    cap = float(config["models"]["lightgbm"].get("scale_pos_weight_cap", 50))
    if spw > cap:
        logger.info("Capping LightGBM scale_pos_weight from %.3f to %.3f", spw, cap)
        spw = cap
    logger.info("Train scale_pos_weight=%.3f", spw)

    logger.info("=== Stages 3–4: Train baselines + LightGBM ===")
    factories = get_model_factories(config, spw)
    val_rows = []
    fitted: dict[str, Any] = {}
    val_probs: dict[str, np.ndarray] = {}

    for name, factory in factories.items():
        logger.info("Training %s ...", name)
        preprocessor = build_preprocessor(feature_columns)
        pipeline = create_model_pipeline(preprocessor, factory())
        pipeline.fit(X_train, y_train)
        fitted[name] = pipeline
        probs = _predict_proba(pipeline, X_val)
        val_probs[name] = probs
        metrics = compute_classification_metrics(y_val, probs, threshold=0.5)
        cost = compute_expected_cost(
            y_val,
            probs,
            amt_val,
            0.5,
            config["business_costs"]["cost_false_positive"],
            config["business_costs"]["cost_false_negative"],
        )
        row = {
            "model": name,
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "f1": metrics["f1"],
            "pr_auc": metrics["pr_auc"],
            "roc_auc": metrics["roc_auc"],
            "expected_cost_at_0.5": cost["expected_cost"],
        }
        val_rows.append(row)
        logger.info("%s val PR-AUC=%.4f ROC-AUC=%.4f cost@0.5=%.2f", name, row["pr_auc"], row["roc_auc"], row["expected_cost_at_0.5"])

    comparison_df = pd.DataFrame(val_rows)
    comparison_path = root / config["paths"]["artifacts"]["model_comparison"]
    comparison_path.parent.mkdir(parents=True, exist_ok=True)
    comparison_df.to_csv(comparison_path, index=False)

    logger.info("=== Stage 5: Threshold optimization on VALIDATION only ===")
    search = config["threshold_search"]
    costs = config["business_costs"]
    per_model_opt = {}
    for name, probs in val_probs.items():
        opt = optimize_binary_threshold(
            y_val,
            probs,
            amt_val,
            costs["cost_false_positive"],
            costs["cost_false_negative"],
            start=search["start"],
            end=search["end"],
            step=search["step"],
        )
        per_model_opt[name] = opt
        logger.info(
            "%s best val threshold=%.2f expected_cost=%.2f",
            name,
            opt["best_threshold"],
            opt["best_result"]["expected_cost"],
        )

    selected_model = min(
        per_model_opt.keys(),
        key=lambda n: per_model_opt[n]["best_result"]["expected_cost"],
    )
    selection_reason = (
        f"Lowest expected business cost on the validation set after threshold search "
        f"({per_model_opt[selected_model]['best_result']['expected_cost']:.2f}). "
        f"PR-AUC is reported but was not the sole selection criterion."
    )
    logger.info("Selected model: %s — %s", selected_model, selection_reason)

    raw_val = val_probs[selected_model]
    binary_opt = per_model_opt[selected_model]
    best_binary_t = float(binary_opt["best_threshold"])

    logger.info("=== Stage 7: Probability calibration (fit on validation) ===")
    calibrator = fit_calibrator(y_val, raw_val, method=config["calibration"]["method"])
    cal_val = apply_calibrator(calibrator, raw_val)

    # Re-optimize thresholds on CALIBRATED validation probabilities
    binary_opt_cal = optimize_binary_threshold(
        y_val,
        cal_val,
        amt_val,
        costs["cost_false_positive"],
        costs["cost_false_negative"],
        start=search["start"],
        end=search["end"],
        step=search["step"],
    )
    three_way = optimize_three_way_thresholds(
        y_val,
        cal_val,
        amt_val,
        costs["cost_false_positive"],
        costs["cost_false_negative"],
        costs["review_cost_multiplier"],
        start=search["start"],
        end=search["end"],
        step=search["step"],
    )
    t_review = float(three_way["best_threshold_review"])
    t_block = float(three_way["best_threshold_block"])
    operating_threshold = float(binary_opt_cal["best_threshold"])
    logger.info("Calibrated T_review=%.2f T_block=%.2f binary_t=%.2f", t_review, t_block, operating_threshold)

    logger.info("=== Stage 6: Held-out TEST evaluation (once) ===")
    selected_pipeline = fitted[selected_model]
    raw_test = _predict_proba(selected_pipeline, X_test)
    cal_test = apply_calibrator(calibrator, raw_test)
    test_metrics = compute_classification_metrics(y_test, cal_test, threshold=operating_threshold)
    test_cost = compute_expected_cost(
        y_test,
        cal_test,
        amt_test,
        operating_threshold,
        costs["cost_false_positive"],
        costs["cost_false_negative"],
    )
    test_three_way_cost = compute_expected_cost(
        y_test,
        cal_test,
        amt_test,
        operating_threshold,
        costs["cost_false_positive"],
        costs["cost_false_negative"],
        costs["review_cost_multiplier"],
        threshold_review=t_review,
        threshold_block=t_block,
    )
    decisions = _decisions(cal_test, t_review, t_block)
    portfolio = portfolio_financial_summary(
        y_test,
        cal_test,
        amt_test,
        decisions,
        costs["cost_false_positive"],
        costs["review_cost_multiplier"],
    )
    logger.info("TEST PR-AUC=%.4f recall=%.4f expected_cost=%.2f", test_metrics["pr_auc"], test_metrics["recall"], test_cost["expected_cost"])

    val_metrics = compute_classification_metrics(y_val, cal_val, threshold=operating_threshold)
    val_metrics["threshold"] = operating_threshold
    val_metrics["threshold_review"] = t_review
    val_metrics["threshold_block"] = t_block

    brier_raw = compute_brier_score(y_test, raw_test)
    brier_cal = compute_brier_score(y_test, cal_test)
    calibration_info = {"brier_raw": brier_raw, "brier_calibrated": brier_cal, "method": config["calibration"]["method"]}

    error_report = analyze_errors(X_test, y_test, cal_test, amt_test, operating_threshold)

    logger.info("=== Persist artifacts, plots, demo examples ===")
    artifacts = config["paths"]["artifacts"]
    (root / "models").mkdir(parents=True, exist_ok=True)
    joblib.dump(selected_pipeline, root / artifacts["model"])
    joblib.dump(calibrator, root / artifacts["calibrator"])
    joblib.dump(selected_pipeline.named_steps["preprocessor"], root / artifacts["preprocessor"])
    _write_json(root / artifacts["feature_names"], feature_columns)
    _write_json(
        root / artifacts["threshold_config"],
        {
            "threshold": operating_threshold,
            "threshold_review": round(t_review, 4),
            "threshold_block": round(t_block, 4),
            "selected_on": "validation_calibrated_probabilities",
            "test_set_used_for_selection": False,
        },
    )

    metadata = {
        "model_name": selected_model,
        "training_date": datetime.now(timezone.utc).isoformat(),
        "dataset_version": DATASET_SOURCE,
        "n_train": int(len(train_df)),
        "n_validation": int(len(val_df)),
        "n_test": int(len(test_df)),
        "features": feature_columns,
        "exclude_columns": data_cfg["exclude_columns"],
        "validation_metrics": val_metrics,
        "test_metrics": test_metrics,
        "test_expected_cost": test_cost,
        "test_three_way_cost": test_three_way_cost,
        "portfolio_test": portfolio,
        "selected_threshold": operating_threshold,
        "threshold_review": t_review,
        "threshold_block": t_block,
        "threshold_analysis": binary_opt_cal["threshold_analysis"],
        "three_way_threshold_analysis": three_way["threshold_analysis"],
        "business_costs": costs,
        "calibration": calibration_info,
        "split_summary": splits,
        "model_comparison_validation": val_rows,
        "selection_reason": selection_reason,
        "leakage_audit": leakage,
        "disclaimer": (
            "All final performance metrics are calculated on a held-out test set "
            "that was not used for model selection or threshold optimization."
        ),
    }
    _write_json(root / artifacts["metadata"], metadata)

    figures = root / "reports" / "figures"
    plot_model_comparison(comparison_df, figures / "model_comparison.png")
    plot_threshold_analysis(binary_opt_cal["threshold_analysis"], operating_threshold, figures / "threshold_analysis.png")
    plot_calibration_curve(y_test, raw_test, cal_test, figures / "calibration_curve.png")
    plot_confusion_matrix(y_test, cal_test, operating_threshold, figures / "confusion_matrix.png")
    plot_roc_pr_curves(y_test, cal_test, figures / "roc_pr_curves.png")

    # Global SHAP on a small training sample
    try:
        import matplotlib.pyplot as plt
        import shap

        sample = X_train.sample(n=min(400, len(X_train)), random_state=seed)
        clf = selected_pipeline.named_steps["classifier"]
        pre = selected_pipeline.named_steps["preprocessor"]
        Xt = pre.transform(sample)
        if hasattr(clf, "booster_") or hasattr(clf, "estimators_"):
            explainer = shap.TreeExplainer(clf)
            sv = explainer.shap_values(Xt)
            if isinstance(sv, list):
                sv = sv[1] if len(sv) > 1 else sv[0]
            shap.summary_plot(sv, Xt, feature_names=feature_columns, show=False)
            plt.tight_layout()
            plt.savefig(figures / "shap_summary.png", dpi=120, bbox_inches="tight")
            plt.close()
        elif hasattr(clf, "coef_"):
            imp = pd.Series(np.abs(clf.coef_.flatten()), index=feature_columns).sort_values(ascending=False)
            imp.head(15).plot(kind="barh", figsize=(8, 6), title="Absolute logistic coefficients")
            plt.tight_layout()
            plt.savefig(figures / "shap_summary.png", dpi=120)
            plt.close()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Global SHAP plot skipped: %s", exc)

    # Demo transactions from training distributions (synthetic labels not claimed as customers)
    rng = np.random.default_rng(seed)
    demo = []
    fraud_pool = train_df[train_df[data_cfg["target_column"]] == 1]
    legit_pool = train_df[train_df[data_cfg["target_column"]] == 0]
    for label, pool, n in [("elevated-risk pattern", fraud_pool, 3), ("typical-legitimate pattern", legit_pool, 3)]:
        take = min(n, len(pool))
        idxs = rng.choice(len(pool), size=take, replace=False)
        for j, i in enumerate(idxs):
            row = pool.iloc[int(i)]
            demo.append(
                {
                    "id": f"demo_{label.split()[0]}_{j+1}",
                    "label": label,
                    "disclaimer": "Synthetic demo built from dataset feature distributions, not a real customer transaction.",
                    "features": {c: float(row[c]) for c in feature_columns},
                    "amount": float(row[amount_col]),
                }
            )
    _write_json(root / artifacts["demo_transactions"], demo)

    test_results = {
        "selected_model": selected_model,
        "selection_reason": selection_reason,
        "split_summary": splits,
        "validation_comparison": val_rows,
        "test_metrics": test_metrics,
        "test_cost": test_cost,
        "test_three_way_cost": test_three_way_cost,
        "portfolio": portfolio,
        "calibration": calibration_info,
        "error_analysis": error_report,
        "disclaimer": metadata["disclaimer"],
    }
    _write_json(root / artifacts["test_results"], test_results)

    report = build_final_report(
        config,
        eda,
        splits,
        comparison_df,
        selected_model,
        selection_reason,
        val_metrics,
        test_metrics,
        test_cost,
        portfolio,
        calibration_info,
        error_report,
        leakage,
    )
    report_path = root / artifacts["final_report"]
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    logger.info("Wrote %s", report_path)
    logger.info("Training complete.")


if __name__ == "__main__":
    main()
