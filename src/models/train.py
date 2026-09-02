"""Model training utilities."""

from __future__ import annotations

from typing import Any

import lightgbm as lgb
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


def build_logistic_regression(config: dict[str, Any]) -> LogisticRegression:
    """Build logistic regression with class weights."""
    cfg = config["models"]["logistic_regression"]
    return LogisticRegression(
        C=cfg["C"],
        class_weight=cfg["class_weight"],
        max_iter=cfg["max_iter"],
        random_state=config["project"]["random_seed"],
        solver="lbfgs",
    )


def build_random_forest(config: dict[str, Any]) -> RandomForestClassifier:
    """Build random forest with class weights."""
    cfg = config["models"]["random_forest"]
    return RandomForestClassifier(
        n_estimators=cfg["n_estimators"],
        max_depth=cfg["max_depth"],
        class_weight=cfg["class_weight"],
        min_samples_leaf=cfg["min_samples_leaf"],
        random_state=config["project"]["random_seed"],
        n_jobs=-1,
    )


def build_lightgbm(config: dict[str, Any], scale_pos_weight: float) -> lgb.LGBMClassifier:
    """Build LightGBM with scale_pos_weight for imbalance."""
    cfg = config["models"]["lightgbm"]
    return lgb.LGBMClassifier(
        n_estimators=cfg["n_estimators"],
        learning_rate=cfg["learning_rate"],
        max_depth=cfg["max_depth"],
        num_leaves=cfg["num_leaves"],
        scale_pos_weight=scale_pos_weight,
        subsample=cfg["subsample"],
        colsample_bytree=cfg["colsample_bytree"],
        min_child_samples=cfg.get("min_child_samples", 20),
        random_state=config["project"]["random_seed"],
        n_jobs=-1,
        verbose=-1,
    )


def create_model_pipeline(preprocessor, estimator) -> Pipeline:
    """Wrap preprocessor and estimator in sklearn Pipeline."""
    return Pipeline([("preprocessor", preprocessor), ("classifier", estimator)])


def get_model_factories(config: dict[str, Any], scale_pos_weight: float) -> dict[str, Any]:
    """Return named model factory callables."""
    return {
        "logistic_regression": lambda: build_logistic_regression(config),
        "random_forest": lambda: build_random_forest(config),
        "lightgbm": lambda: build_lightgbm(config, scale_pos_weight),
    }
