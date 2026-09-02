"""SHAP output shape helpers."""

import numpy as np

from src.explainability.shap_explainer import extract_row_shap_values


def test_extract_row_shap_values_3d():
    arr = np.zeros((2, 4, 2))
    arr[0, 1, 1] = 0.5
    out = extract_row_shap_values(arr, 0)
    assert out.shape == (4,)
    assert out[1] == 0.5


def test_extract_row_shap_values_list():
    pos = np.array([[0.1, 0.2, 0.3]])
    out = extract_row_shap_values([np.zeros_like(pos), pos], 0)
    assert list(out) == [0.1, 0.2, 0.3]
