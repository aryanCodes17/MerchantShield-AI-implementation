"""Leakage-prevention checks."""

import pandas as pd
import pytest

from src.data.leakage import (
    check_target_not_in_features,
    run_leakage_checks,
)
from src.data.splitter import temporal_split


def test_target_cannot_be_a_feature():
    with pytest.raises(ValueError, match="leakage"):
        check_target_not_in_features(["V1", "Class"], "Class")


def test_temporal_split_and_leakage_pass():
    df = pd.DataFrame(
        {
            "Time": list(range(10)),
            "V1": range(10),
            "Class": [0] * 10,
        }
    )
    train, val, test = temporal_split(df, "Time", 0.5, 0.3, 0.2)
    assert len(train) == 5
    assert train["Time"].max() <= val["Time"].min()
    report = run_leakage_checks(train, val, test, ["V1"], "Class", "Time")
    assert report["status"] == "PASS"
