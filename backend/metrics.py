from pathlib import Path
import json


PROJECT_ROOT = Path(__file__).resolve().parents[1]

METADATA_PATH = (
    PROJECT_ROOT
    / "models"
    / "model_metadata.json"
)


def load_metrics():

    if not METADATA_PATH.exists():
        raise FileNotFoundError(
            f"Model metadata not found: {METADATA_PATH}"
        )

    with open(
        METADATA_PATH,
        "r",
        encoding="utf-8",
    ) as file:

        metadata = json.load(file)


    test_metrics = metadata.get(
        "test_metrics",
        {}
    )

    if not test_metrics:
        raise ValueError(
            "test_metrics not found in model metadata"
        )


    confusion = test_metrics.get(
        "confusion_matrix",
        {}
    )


    return {

        "model_name":
            metadata.get(
                "model_name",
                "Unknown",
            ),

        "training_date":
            metadata.get(
                "training_date",
            ),

        "dataset_version":
            metadata.get(
                "dataset_version",
            ),

        "evaluation_type":
            "Held-out test set",

        "test_set_used_for_selection":
            False,

        "test_samples":
            metadata.get(
                "n_test",
                0,
            ),

        # -----------------------------
        # Actual held-out test metrics
        # -----------------------------

        "precision":
            float(
                test_metrics.get(
                    "precision",
                    0,
                )
            ),

        "recall":
            float(
                test_metrics.get(
                    "recall",
                    0,
                )
            ),

        "f1_score":
            float(
                test_metrics.get(
                    "f1",
                    0,
                )
            ),

        "roc_auc":
            float(
                test_metrics.get(
                    "roc_auc",
                    0,
                )
            ),

        "pr_auc":
            float(
                test_metrics.get(
                    "pr_auc",
                    0,
                )
            ),

        # -----------------------------
        # Confusion matrix
        # -----------------------------

        "confusion_matrix": {

            "tn": int(
                confusion.get(
                    "tn",
                    0,
                )
            ),

            "fp": int(
                confusion.get(
                    "fp",
                    0,
                )
            ),

            "fn": int(
                confusion.get(
                    "fn",
                    0,
                )
            ),

            "tp": int(
                confusion.get(
                    "tp",
                    0,
                )
            ),

        },

        # -----------------------------
        # Thresholds
        # -----------------------------

        "threshold":
            test_metrics.get(
                "threshold",
                metadata.get(
                    "selected_threshold"
                ),
            ),

        "threshold_review":
            metadata.get(
                "threshold_review",
            ),

        "threshold_block":
            metadata.get(
                "threshold_block",
            ),

        # -----------------------------
        # Business metrics
        # -----------------------------

        "test_expected_cost":
            metadata.get(
                "test_expected_cost",
                {},
            ),

        "portfolio_test":
            metadata.get(
                "portfolio_test",
                {},
            ),

        # -----------------------------
        # Calibration
        # -----------------------------

        "calibration":
            metadata.get(
                "calibration",
                {},
            ),

        # -----------------------------
        # Disclaimer
        # -----------------------------

        "disclaimer":
            metadata.get(
                "disclaimer",
                "Metrics are calculated on a held-out test set.",
            ),

    }