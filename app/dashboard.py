"""MerchantShield AI — professional risk-management dashboard."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.config import get_project_root, load_config
from src.risk_engine.scorer import FraudRiskEngine, ModelNotLoadedError

st.set_page_config(
    page_title="MerchantShield AI",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

CSS = """
<style>
    .stApp { background: #0b1220; color: #e8eef7; }
    [data-testid="stSidebar"] { background: #08101c; }
    h1, h2, h3 { color: #f4f7fb; font-family: "IBM Plex Sans", sans-serif; }
    .hero {
        background: linear-gradient(135deg, #10233f 0%, #0b1220 60%, #16324f 100%);
        border: 1px solid #1f3b5c;
        border-radius: 16px;
        padding: 1.4rem 1.6rem;
        margin-bottom: 1.2rem;
    }
    .kicker { color: #7fb3ff; letter-spacing: 0.14em; font-size: 0.75rem; font-weight: 600; }
    .metric-card {
        background: #121b2b;
        border: 1px solid #22344d;
        border-radius: 12px;
        padding: 0.9rem 1rem;
    }
    .decision-APPROVE { color: #3dd68c; font-weight: 700; }
    .decision-REVIEW { color: #f5c542; font-weight: 700; }
    .decision-BLOCK { color: #ff6b6b; font-weight: 700; }
    .fine-print { color: #9aa8bc; font-size: 0.85rem; }
</style>
"""
st.markdown(CSS, unsafe_allow_html=True)


@st.cache_resource
def load_engine() -> FraudRiskEngine:
    eng = FraudRiskEngine()
    eng.load()
    return eng


def load_json(rel: str):
    path = get_project_root() / rel
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def kpi(label: str, value: str) -> None:
    st.markdown(
        f'<div class="metric-card"><div class="fine-print">{label}</div>'
        f"<h3>{value}</h3></div>",
        unsafe_allow_html=True,
    )


def main() -> None:
    config = load_config()
    root = get_project_root()
    metadata = load_json(config["paths"]["artifacts"]["metadata"])
    test_results = load_json(config["paths"]["artifacts"]["test_results"])
    eda = load_json(config["paths"]["artifacts"]["eda_report"])
    demo = load_json(config["paths"]["artifacts"]["demo_transactions"]) or []
    comparison_path = root / config["paths"]["artifacts"]["model_comparison"]

    st.markdown(
        """
        <div class="hero">
          <div class="kicker">DEFENSE-ONLY RISK ENGINE</div>
          <h1>MerchantShield AI</h1>
          <p class="fine-print">
            Transaction-fraud risk scoring for merchants. Probabilities, expected loss, and
            explanations are decision-support outputs — not a determination of guilt.
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    page = st.sidebar.radio(
        "Workspace",
        [
            "Overview",
            "Model lab",
            "Threshold & cost",
            "Calibration",
            "Transaction scoring",
        ],
    )

    if metadata is None or test_results is None:
        st.error("Trained artifacts not found. Run `python scripts/train.py` first.")
        return

    try:
        engine = load_engine()
    except Exception as exc:  # noqa: BLE001
        st.error(f"Model failed to load: {exc}")
        return

    if page == "Overview":
        st.subheader("Dataset statistics")
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            kpi("Total transactions", f"{eda['n_rows']:,}")
        with c2:
            kpi("Fraud transactions", f"{eda['target_distribution']['fraud']:,}")
        with c3:
            kpi("Fraud rate", f"{eda['target_distribution']['fraud_rate_pct']}%")
        with c4:
            kpi("Avg amount", f"{eda['amount_stats']['mean']:.2f}")

        st.caption(eda["source"])
        splits = metadata["split_summary"]
        st.subheader("Temporal splits")
        st.dataframe(pd.DataFrame(splits).T, use_container_width=True)
        st.info(metadata["disclaimer"])

        st.subheader("Portfolio (held-out test, three-way policy)")
        port = test_results["portfolio"]
        p1, p2, p3, p4 = st.columns(4)
        with p1:
            kpi("Total value", f"{port['total_transaction_value']:,.0f}")
        with p2:
            kpi("Actual fraud amount", f"{port['actual_fraud_amount']:,.0f}")
        with p3:
            kpi("Expected loss (Σ p×amt)", f"{port['estimated_expected_loss']:,.0f}")
        with p4:
            kpi("Prevented under policy", f"{port['prevented_loss_under_policy']:,.0f}")

    elif page == "Model lab":
        st.subheader("Validation model comparison")
        if comparison_path.exists():
            cdf = pd.read_csv(comparison_path)
            st.dataframe(cdf, use_container_width=True)
            fig = px.bar(cdf, x="model", y="pr_auc", title="Validation PR-AUC")
            fig.update_layout(template="plotly_dark", paper_bgcolor="#0b1220", plot_bgcolor="#0b1220")
            st.plotly_chart(fig, use_container_width=True)
        st.markdown(f"**Selected model:** `{metadata['model_name']}`")
        st.write(metadata["selection_reason"])

        st.subheader("Held-out test performance")
        m = test_results["test_metrics"]
        cols = st.columns(5)
        for col, key in zip(cols, ["precision", "recall", "f1", "pr_auc", "roc_auc"]):
            with col:
                kpi(key.upper(), f"{m[key]:.4f}")
        st.json(m["confusion_matrix"])

        fig_path = root / "reports" / "figures" / "confusion_matrix.png"
        if fig_path.exists():
            st.image(str(fig_path))
        shap_path = root / "reports" / "figures" / "shap_summary.png"
        if shap_path.exists():
            st.subheader("Global feature contribution")
            st.image(str(shap_path))

        st.subheader("Error analysis")
        st.json(test_results["error_analysis"]["false_positives"])
        st.json(test_results["error_analysis"]["false_negatives"])
        st.caption(test_results["error_analysis"]["notes"]["false_positives"])
        st.caption(test_results["error_analysis"]["notes"]["false_negatives"])

    elif page == "Threshold & cost":
        st.subheader("Threshold vs expected cost (validation)")
        fig_path = root / "reports" / "figures" / "threshold_analysis.png"
        if fig_path.exists():
            st.image(str(fig_path))
        st.write(
            f"Selected binary threshold: **{metadata['selected_threshold']}** | "
            f"T_review={metadata['threshold_review']} | T_block={metadata['threshold_block']}"
        )
        st.write("Thresholds were chosen on validation only, then frozen before test evaluation.")
        c1, c2 = st.columns(2)
        with c1:
            kpi("Test expected cost (binary)", f"{test_results['test_cost']['expected_cost']:.2f}")
        with c2:
            kpi("FP cost / FN cost", f"{test_results['test_cost']['fp_cost_total']:.2f} / {test_results['test_cost']['fn_cost_total']:.2f}")

    elif page == "Calibration":
        st.subheader("Probability calibration")
        fig_path = root / "reports" / "figures" / "calibration_curve.png"
        if fig_path.exists():
            st.image(str(fig_path))
        cal = test_results["calibration"]
        kpi("Brier raw → calibrated", f"{cal['brier_raw']:.6f} → {cal['brier_calibrated']:.6f}")
        st.write(
            "Risk systems consume probabilities as inputs to expected loss and policy. "
            "A well-calibrated 0.20 should correspond to fraud in about 20% of similar cases."
        )

    else:
        st.subheader("Transaction risk assessment")
        st.caption("Demo examples are built from dataset feature distributions. They are not real customer transactions.")
        labels = ["Custom input"] + [f"{d['id']} — {d['label']}" for d in demo]
        choice = st.selectbox("Example transaction", labels)

        features = {name: 0.0 for name in engine.feature_names}
        amount = 100.0
        if choice != "Custom input":
            item = demo[labels.index(choice) - 1]
            features.update(item["features"])
            amount = item["amount"]

        amount = st.number_input("Amount", value=float(amount), min_value=0.0, step=1.0)
        with st.expander("Feature values"):
            cols = st.columns(3)
            updated = {}
            for i, name in enumerate(engine.feature_names):
                with cols[i % 3]:
                    updated[name] = st.number_input(name, value=float(features.get(name, 0.0)), format="%.6f")
            features = updated
        features["Amount"] = amount

        if st.button("Score transaction", type="primary"):
            try:
                result = engine.score_transaction(features, transaction_amount=amount)
            except (ValueError, ModelNotLoadedError, RuntimeError) as exc:
                st.error(f"Scoring refused (fail-safe). {exc}")
                return

            st.markdown("### TRANSACTION RISK ASSESSMENT")
            dclass = f"decision-{result['decision']}"
            a, b, c = st.columns(3)
            with a:
                kpi("Fraud probability", f"{result['fraud_probability']:.4f}")
            with b:
                kpi("Risk score", f"{result['risk_score']}/100")
            with c:
                st.markdown(
                    f'<div class="metric-card"><div class="fine-print">Decision</div>'
                    f'<h3 class="{dclass}">{result["decision"]}</h3></div>',
                    unsafe_allow_html=True,
                )
            d, e = st.columns(2)
            with d:
                kpi("Estimated amount", f"{result['transaction_amount']:,.2f}")
            with e:
                kpi("Expected fraud loss", f"{result['expected_loss']:,.2f}")
            st.write("Top contributing factors (model attribution, not proof of fraud):")
            for i, factor in enumerate(result.get("top_risk_factors", []), 1):
                st.write(f"{i}. {factor['description']}")
            st.caption(result["disclaimer"])


if __name__ == "__main__":
    main()
else:
    main()
