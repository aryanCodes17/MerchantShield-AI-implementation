"""Unit tests for preprocessing helpers."""

from __future__ import annotations

import numpy as np
import pandas as pd

from src.features.preprocessing import (
    build_preprocessor,
    compute_scale_pos_weight,
    extract_xy,
    get_feature_columns,
)


def test_get_feature_columns_excludes_target_and_time():
    df = pd.DataFrame({"V1": [1], "Amount": [2], "Time": [3], "Class": [0]})
    cols = get_feature_columns(df, ["Class", "Time"])
    assert cols == ["V1", "Amount"]


def test_extract_xy_does_not_include_target():
    df = pd.DataFrame({"V1": [0.1, 0.2], "Amount": [10.0, 20.0], "Class": [0, 1]})
    X, y = extract_xy(df, ["V1", "Amount"], "Class")
    assert "Class" not in X.columns
    assert list(y) == [0, 1]


def test_preprocessor_imputes_and_scales():
    df = pd.DataFrame({"V1": [1.0, np.nan, 3.0], "Amount": [10.0, 20.0, 30.0]})
    pre = build_preprocessor(["V1", "Amount"])
    out = pre.fit_transform(df)
    assert out.shape == (3, 2)
    assert np.isfinite(out).all()


def test_scale_pos_weight():
    y = np.array([0, 0, 0, 1])
    assert compute_scale_pos_weight(y) == 3.0
    assert compute_scale_pos_weight(np.array([0, 0])) == 1.0
