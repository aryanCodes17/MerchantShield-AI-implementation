"""Calibration and threshold helpers."""

import numpy as np

from src.evaluation.calibration import apply_calibrator, fit_calibrator
from src.evaluation.threshold import generate_threshold_grid, optimize_binary_threshold


def test_threshold_grid():
    grid = generate_threshold_grid(0.05, 0.15, 0.05)
    assert np.isclose(grid[0], 0.05)
    assert np.isclose(grid[-1], 0.15)


def test_optimize_threshold_uses_validation_labels():
    y = np.array([0, 0, 0, 1, 1])
    p = np.array([0.1, 0.2, 0.8, 0.7, 0.9])
    amt = np.ones(5) * 100
    result = optimize_binary_threshold(y, p, amt, cost_fp=10.0, cost_fn_multiplier=1.0, start=0.1, end=0.8, step=0.1)
    assert "best_threshold" in result
    assert result["best_result"]["expected_cost"] >= 0


def test_isotonic_calibrator_clips():
    y = np.array([0, 0, 1, 1])
    p = np.array([0.1, 0.2, 0.8, 0.9])
    cal = fit_calibrator(y, p, method="isotonic")
    out = apply_calibrator(cal, np.array([0.0, 1.0]))
    assert out.min() >= 0.0
    assert out.max() <= 1.0
