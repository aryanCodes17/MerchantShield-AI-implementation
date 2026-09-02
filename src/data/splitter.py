"""Temporal data splitting for fraud detection."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def temporal_split(
    df: pd.DataFrame,
    time_column: str,
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split data chronologically: train (earliest) → val → test (latest).

    Simulates real-world deployment where models train on past data
    and evaluate on future transactions.
    """
    if not np.isclose(train_ratio + val_ratio + test_ratio, 1.0):
        raise ValueError("Split ratios must sum to 1.0")

    df_sorted = df.sort_values(time_column).reset_index(drop=True)
    n = len(df_sorted)
    train_end = int(n * train_ratio)
    val_end = int(n * (train_ratio + val_ratio))

    train = df_sorted.iloc[:train_end].copy()
    val = df_sorted.iloc[train_end:val_end].copy()
    test = df_sorted.iloc[val_end:].copy()
    return train, val, test


def split_summary(
    splits: dict[str, pd.DataFrame],
    target_column: str,
) -> dict[str, Any]:
    """Summarize split sizes and fraud rates."""
    summary: dict[str, Any] = {}
    for name, split_df in splits.items():
        fraud = int(split_df[target_column].sum())
        total = len(split_df)
        summary[name] = {
            "n_transactions": total,
            "n_fraud": fraud,
            "fraud_rate_pct": round(100 * fraud / total, 4) if total else 0.0,
        }
    return summary
