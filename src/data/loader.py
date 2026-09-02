"""Dataset download and loading."""

from __future__ import annotations

import logging
import shutil
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd

from src.config import get_project_root, load_config

logger = logging.getLogger(__name__)

DATASET_SOURCE = (
    "Credit Card Fraud Detection — Machine Learning Group, ULB "
    "(https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)"
)
GITHUB_MIRROR_URL = (
    "https://raw.githubusercontent.com/nsethi31/"
    "Kaggle-Data-Credit-Card-Fraud-Detection/master/creditcard.csv"
)
OPENML_DATASET_ID = 1597


def download_via_http(output_path: Path) -> Path:
    """Download a public CSV mirror of the ULB credit-card fraud dataset."""
    import urllib.request

    output_path.parent.mkdir(parents=True, exist_ok=True)
    logger.info("Downloading dataset from public mirror...")
    urllib.request.urlretrieve(GITHUB_MIRROR_URL, output_path)
    if output_path.stat().st_size < 1_000_000:
        output_path.unlink(missing_ok=True)
        raise RuntimeError("Downloaded file is unexpectedly small.")
    logger.info("Saved dataset to %s", output_path)
    return output_path


def download_via_openml(output_path: Path) -> Path:
    """Download creditcard fraud dataset via OpenML."""
    import openml

    logger.info("Downloading dataset from OpenML (id=%s)...", OPENML_DATASET_ID)
    dataset = openml.datasets.get_dataset(OPENML_DATASET_ID)
    X, y, _, _ = dataset.get_data(target=dataset.default_target_attribute)
    df = X.copy()
    df["Class"] = y.astype(int)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)
    logger.info("Saved %s rows to %s", len(df), output_path)
    return output_path


def download_via_kaggle(output_path: Path) -> Path:
    """Download using Kaggle CLI if configured."""
    kaggle_bin = shutil.which("kaggle")
    if not kaggle_bin:
        raise RuntimeError("Kaggle CLI not found.")

    raw_dir = output_path.parent
    raw_dir.mkdir(parents=True, exist_ok=True)
    import subprocess

    subprocess.run(
        [
            kaggle_bin,
            "datasets",
            "download",
            "-d",
            "mlg-ulb/creditcardfraud",
            "-p",
            str(raw_dir),
            "--unzip",
        ],
        check=True,
    )
    downloaded = raw_dir / "creditcard.csv"
    if downloaded.exists():
        return downloaded
    zip_path = raw_dir / "creditcardfraud.zip"
    if zip_path.exists():
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(raw_dir)
    if not downloaded.exists():
        raise FileNotFoundError("Kaggle download did not produce creditcard.csv")
    return downloaded


def ensure_dataset(config: dict[str, Any] | None = None) -> Path:
    """Ensure raw dataset exists; download if missing."""
    config = config or load_config()
    output_path = get_project_root() / config["data"]["raw_path"]
    if output_path.exists():
        logger.info("Dataset already present at %s", output_path)
        return output_path

    errors: list[str] = []
    for method, fn in [
        ("HTTP mirror", download_via_http),
        ("OpenML", download_via_openml),
        ("Kaggle", download_via_kaggle),
    ]:
        try:
            return fn(output_path)
        except Exception as exc:  # noqa: BLE001
            logger.warning("%s download failed: %s", method, exc)
            errors.append(f"{method}: {exc}")

    raise RuntimeError(
        "Could not download dataset automatically. "
        f"Place creditcard.csv at {output_path}. Source: {DATASET_SOURCE}. "
        f"Errors: {'; '.join(errors)}"
    )


def load_raw_dataset(config: dict[str, Any] | None = None) -> pd.DataFrame:
    """Load raw CSV dataset."""
    config = config or load_config()
    path = ensure_dataset(config)
    df = pd.read_csv(path)
    if "Class" in df.columns:
        df["Class"] = pd.to_numeric(df["Class"], errors="coerce").fillna(0).astype(int)
    logger.info("Loaded dataset with shape %s", df.shape)
    return df


def inspect_dataset(df: pd.DataFrame, config: dict[str, Any] | None = None) -> dict[str, Any]:
    """Compute EDA summary statistics."""
    config = config or load_config()
    target = config["data"]["target_column"]
    amount_col = config["data"]["amount_column"]

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    categorical_cols = df.select_dtypes(exclude="number").columns.tolist()
    feature_cols = [c for c in df.columns if c not in config["data"]["exclude_columns"]]

    fraud_count = int(df[target].sum())
    total = len(df)
    summary = {
        "source": DATASET_SOURCE,
        "n_rows": total,
        "n_columns": len(df.columns),
        "n_features": len(feature_cols),
        "feature_columns": feature_cols,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "target_distribution": {
            "legitimate": int((df[target] == 0).sum()),
            "fraud": fraud_count,
            "fraud_rate_pct": round(100 * fraud_count / total, 4),
        },
        "missing_values": df.isnull().sum().to_dict(),
        "duplicate_rows": int(df.duplicated().sum()),
        "class_imbalance_ratio": round((df[target] == 0).sum() / max(fraud_count, 1), 2),
        "amount_stats": {
            "mean": float(df[amount_col].mean()),
            "median": float(df[amount_col].median()),
            "std": float(df[amount_col].std()),
            "min": float(df[amount_col].min()),
            "max": float(df[amount_col].max()),
        },
        "possible_leakage_columns": [c for c in [target, config["data"]["time_column"]] if c in df.columns],
        "time_column_present": config["data"]["time_column"] in df.columns,
    }
    return summary
