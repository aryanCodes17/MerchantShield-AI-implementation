"""Data leakage prevention checks."""

from __future__ import annotations

from typing import Any

import pandas as pd


def check_target_not_in_features(
    feature_columns: list[str],
    target_column: str,
) -> None:
    """Ensure target is not used as a model feature."""
    if target_column in feature_columns:
        raise ValueError(f"Data leakage: target '{target_column}' is in feature columns.")


def check_no_row_overlap(
    train: pd.DataFrame,
    val: pd.DataFrame,
    test: pd.DataFrame,
) -> None:
    """Ensure no overlapping pandas indices between splits."""
    train_idx = set(train.index)
    val_idx = set(val.index)
    test_idx = set(test.index)
    if train_idx & val_idx:
        raise ValueError("Data leakage: train/validation index overlap.")
    if train_idx & test_idx:
        raise ValueError("Data leakage: train/test index overlap.")
    if val_idx & test_idx:
        raise ValueError("Data leakage: validation/test index overlap.")


def check_no_duplicate_index_leakage(
    train: pd.DataFrame,
    val: pd.DataFrame,
    test: pd.DataFrame,
) -> None:
    """Backward-compatible alias."""
    check_no_row_overlap(train, val, test)


def check_temporal_ordering(
    train: pd.DataFrame,
    val: pd.DataFrame,
    test: pd.DataFrame,
    time_column: str,
) -> None:
    """Verify temporal ordering across splits."""
    if train[time_column].max() > val[time_column].min():
        raise ValueError("Temporal leakage: train extends past validation start.")
    if val[time_column].max() > test[time_column].min():
        raise ValueError("Temporal leakage: validation extends past test start.")


def run_leakage_checks(
    train: pd.DataFrame,
    val: pd.DataFrame,
    test: pd.DataFrame,
    feature_columns: list[str],
    target_column: str,
    time_column: str,
) -> dict[str, Any]:
    """Run all leakage checks; return audit report."""
    check_target_not_in_features(feature_columns, target_column)
    check_no_duplicate_index_leakage(train, val, test)
    check_temporal_ordering(train, val, test, time_column)
    return {
        "target_in_features": False,
        "index_overlap": False,
        "temporal_order_valid": True,
        "status": "PASS",
    }
