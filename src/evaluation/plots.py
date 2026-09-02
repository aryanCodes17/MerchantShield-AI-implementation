"""Generate evaluation plots for reports and dashboard."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import ConfusionMatrixDisplay, precision_recall_curve, roc_curve


def plot_threshold_analysis(threshold_results: list[dict], best_threshold: float, output_path: Path) -> None:
    """Plot threshold vs metrics and expected cost."""
    thresholds = [r["threshold"] for r in threshold_results]
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))

    axes[0, 0].plot(thresholds, [r["precision"] for r in threshold_results], label="Precision")
    axes[0, 0].plot(thresholds, [r["recall"] for r in threshold_results], label="Recall")
    axes[0, 0].plot(thresholds, [r["f1"] for r in threshold_results], label="F1")
    axes[0, 0].axvline(best_threshold, color="red", linestyle="--", label=f"Selected={best_threshold:.2f}")
    axes[0, 0].set_xlabel("Threshold")
    axes[0, 0].set_title("Threshold vs Classification Metrics")
    axes[0, 0].legend()

    axes[0, 1].plot(thresholds, [r["expected_cost"] for r in threshold_results])
    axes[0, 1].axvline(best_threshold, color="red", linestyle="--")
    axes[0, 1].set_xlabel("Threshold")
    axes[0, 1].set_ylabel("Expected Cost")
    axes[0, 1].set_title("Threshold vs Expected Business Cost")

    axes[1, 0].plot(thresholds, [r["false_positive_rate"] for r in threshold_results], label="FPR")
    axes[1, 0].plot(thresholds, [r["false_negative_rate"] for r in threshold_results], label="FNR")
    axes[1, 0].axvline(best_threshold, color="red", linestyle="--")
    axes[1, 0].set_xlabel("Threshold")
    axes[1, 0].legend()
    axes[1, 0].set_title("Error Rates vs Threshold")

    axes[1, 1].axis("off")
    axes[1, 1].text(0.1, 0.5, f"Optimal threshold (validation): {best_threshold:.2f}", fontsize=14)

    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=120)
    plt.close()


def plot_calibration_curve(y_true, y_prob_raw, y_prob_cal, output_path: Path) -> None:
    """Compare raw vs calibrated calibration curves."""
    fig, ax = plt.subplots(figsize=(8, 6))
    for prob, label in [(y_prob_raw, "Raw"), (y_prob_cal, "Calibrated")]:
        try:
            pt, pp = calibration_curve(y_true, prob, n_bins=10, strategy="quantile")
        except ValueError:
            pt, pp = calibration_curve(y_true, prob, n_bins=10, strategy="uniform")
        ax.plot(pp, pt, marker="o", label=label)
    ax.plot([0, 1], [0, 1], "k--", label="Perfect calibration")
    ax.set_xlabel("Mean predicted probability")
    ax.set_ylabel("Fraction of positives")
    ax.set_title("Calibration Curve")
    ax.legend()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=120)
    plt.close()


def plot_confusion_matrix(y_true, y_prob, threshold: float, output_path: Path) -> None:
    """Plot confusion matrix at selected threshold."""
    y_pred = (y_prob >= threshold).astype(int)
    fig, ax = plt.subplots(figsize=(6, 5))
    ConfusionMatrixDisplay.from_predictions(y_true, y_pred, ax=ax, cmap="Blues")
    ax.set_title(f"Confusion Matrix (threshold={threshold:.2f})")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=120)
    plt.close()


def plot_roc_pr_curves(y_true, y_prob, output_path: Path) -> None:
    """Plot ROC and PR curves."""
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    fpr, tpr, _ = roc_curve(y_true, y_prob)
    prec, rec, _ = precision_recall_curve(y_true, y_prob)
    axes[0].plot(fpr, tpr)
    axes[0].plot([0, 1], [0, 1], "k--")
    axes[0].set_title("ROC Curve")
    axes[0].set_xlabel("FPR")
    axes[0].set_ylabel("TPR")
    axes[1].plot(rec, prec)
    axes[1].set_title("Precision-Recall Curve")
    axes[1].set_xlabel("Recall")
    axes[1].set_ylabel("Precision")
    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=120)
    plt.close()


def plot_model_comparison(comparison_df, output_path: Path) -> None:
    """Bar chart comparing model PR-AUC."""
    fig, ax = plt.subplots(figsize=(8, 5))
    models = comparison_df["model"].tolist()
    ax.bar(models, comparison_df["pr_auc"])
    ax.set_ylabel("PR-AUC")
    ax.set_title("Model Comparison (Validation PR-AUC)")
    plt.xticks(rotation=15)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=120)
    plt.close()
