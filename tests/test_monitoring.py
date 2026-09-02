"""PSI monitoring tests."""

import numpy as np

from src.monitoring.drift import FraudMonitor, compute_psi


def test_psi_identical_distributions_near_zero():
    rng = np.random.default_rng(0)
    x = rng.random(1000)
    assert compute_psi(x, x.copy()) < 0.05


def test_monitor_summary():
    mon = FraudMonitor(psi_threshold=0.2)
    mon.set_baseline(np.array([0.1, 0.2, 0.15]))
    mon.record({"decision": "APPROVE", "fraud_probability": 0.1, "transaction_amount": 20})
    mon.record({"decision": "BLOCK", "fraud_probability": 0.9, "transaction_amount": 80})
    summary = mon.summary()
    assert summary["n_transactions"] == 2
    assert "APPROVE" in summary["decision_distribution_pct"]
