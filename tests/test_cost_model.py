"""Business cost model tests."""

import numpy as np

from src.evaluation.cost_model import compute_expected_cost


def test_binary_expected_cost():
    y = np.array([0, 0, 1, 1])
    p = np.array([0.1, 0.9, 0.2, 0.8])
    amt = np.array([10.0, 10.0, 50.0, 50.0])
    out = compute_expected_cost(y, p, amt, threshold=0.5, cost_fp=25.0, cost_fn_multiplier=1.0)
    # FP: second row; FN: third row amount 50
    assert out["false_positives"] == 1
    assert out["false_negatives"] == 1
    assert out["fp_cost_total"] == 25.0
    assert out["fn_cost_total"] == 50.0
    assert out["expected_cost"] == 75.0
