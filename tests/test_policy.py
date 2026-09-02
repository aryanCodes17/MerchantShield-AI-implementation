"""Policy, risk score, and expected-loss tests."""

from src.risk_engine.policy import apply_policy, compute_expected_loss, probability_to_risk_score
from src.risk_engine.policy import Decision


def test_policy_three_way():
    assert apply_policy(0.01, 0.15, 0.65) == Decision.APPROVE
    assert apply_policy(0.15, 0.15, 0.65) == Decision.REVIEW
    assert apply_policy(0.64, 0.15, 0.65) == Decision.REVIEW
    assert apply_policy(0.65, 0.15, 0.65) == Decision.BLOCK


def test_risk_score_linear_mapping():
    assert probability_to_risk_score(0.0) == 0
    assert probability_to_risk_score(0.823) == 82
    assert probability_to_risk_score(1.5) == 100
    assert probability_to_risk_score(-1) == 0


def test_expected_loss_is_probability_times_amount():
    assert compute_expected_loss(0.2, 1000) == 200.0
