"""Feature preprocessing pipeline."""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


def get_feature_columns(df: pd.DataFrame, exclude_columns: list[str]) -> list[str]:
    """Return model feature column names excluding target/leakage columns."""
    return [c for c in df.columns if c not in exclude_columns]


def build_preprocessor(feature_columns: list[str]) -> ColumnTransformer:
    """
    Build sklearn preprocessing pipeline.

    V1-V28 are already PCA-transformed; Amount is scaled.
    Time is excluded from features (used only for splitting).
    """
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    return ColumnTransformer(
        transformers=[("num", numeric_pipeline, feature_columns)],
        remainder="drop",
    )


def extract_xy(
    df: pd.DataFrame,
    feature_columns: list[str],
    target_column: str,
) -> tuple[pd.DataFrame, np.ndarray]:
    """Extract features X and target y from dataframe."""
    X = df[feature_columns].copy()
    y = df[target_column].values.astype(int)
    return X, y


def compute_scale_pos_weight(y_train: np.ndarray) -> float:
    """Compute LightGBM scale_pos_weight from training labels."""
    n_neg = int((y_train == 0).sum())
    n_pos = int((y_train == 1).sum())
    if n_pos == 0:
        return 1.0
    return n_neg / n_pos
