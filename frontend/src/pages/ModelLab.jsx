import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Target,
  ShieldCheck,
} from "lucide-react";

import { useEffect, useState } from "react";


function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>

          <p className="mt-2 text-xs text-slate-400">
            {subtitle}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 p-2.5">
          <Icon
            size={20}
            className="text-blue-600"
          />
        </div>

      </div>
    </div>
  );
}

function ThresholdSimulator({ data }) {

  const rows =
    data.threshold_analysis || [];


  const [selectedThreshold, setSelectedThreshold] =
    useState(
      Number(data.selected_threshold || 0.55)
    );


  const selectedRow =
    rows.reduce(
      (closest, row) => {

        const currentDistance =
          Math.abs(
            Number(row.threshold) -
            selectedThreshold
          );

        const closestDistance =
          Math.abs(
            Number(closest.threshold) -
            selectedThreshold
          );

        return currentDistance < closestDistance
          ? row
          : closest;

      },
      rows[0]
    );


  if (!selectedRow) {
    return null;
  }


  const precision =
    Number(selectedRow.precision || 0);

  const recall =
    Number(selectedRow.recall || 0);

  const f1 =
    Number(selectedRow.f1 || 0);

  const expectedCost =
    Number(selectedRow.expected_cost || 0);


  const reviewThreshold =
    Number(data.threshold_review || 0.55);

  const blockThreshold =
    Number(data.threshold_block || 0.60);


  let policy = "APPROVE";

  let policyClass =
    "bg-emerald-50 text-emerald-700 border-emerald-200";


  if (selectedThreshold >= blockThreshold) {

    policy = "BLOCK";

    policyClass =
      "bg-red-50 text-red-700 border-red-200";

  } else if (
    selectedThreshold >= reviewThreshold
  ) {

    policy = "REVIEW";

    policyClass =
      "bg-amber-50 text-amber-700 border-amber-200";

  }


  return (

    <div className="mt-6 space-y-6">


      {/* Threshold slider */}

      <div>

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-semibold text-slate-700">
              Decision Threshold
            </p>

            <p className="text-xs text-slate-400">
              Select a threshold from the validation grid
            </p>

          </div>


          <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-lg font-bold text-blue-700">

            {selectedThreshold.toFixed(2)}

          </span>

        </div>


        <input
          type="range"
          min="0.05"
          max="0.90"
          step="0.05"
          value={selectedThreshold}
          onChange={(event) =>
            setSelectedThreshold(
              Number(event.target.value)
            )
          }
          className="mt-5 w-full accent-blue-600"
        />


        <div className="mt-2 flex justify-between text-[10px] text-slate-400">

          <span>0.05</span>

          <span>0.25</span>

          <span>0.45</span>

          <span>0.65</span>

          <span>0.90</span>

        </div>

      </div>


      {/* Policy */}

      <div
        className={`rounded-xl border p-4 ${policyClass}`}
      >

        <div className="flex items-center justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wide">
              Current Policy
            </p>

            <p className="mt-1 text-sm">
              Based on the selected threshold
            </p>

          </div>


          <p className="text-2xl font-bold">
            {policy}
          </p>

        </div>

      </div>


      {/* Metrics */}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">


        <div className="rounded-lg bg-slate-50 p-4">

          <p className="text-xs text-slate-400">
            Precision
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {(precision * 100).toFixed(2)}%
          </p>

        </div>


        <div className="rounded-lg bg-slate-50 p-4">

          <p className="text-xs text-slate-400">
            Recall
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {(recall * 100).toFixed(2)}%
          </p>

        </div>


        <div className="rounded-lg bg-slate-50 p-4">

          <p className="text-xs text-slate-400">
            F1 Score
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            {(f1 * 100).toFixed(2)}%
          </p>

        </div>


        <div className="rounded-lg bg-slate-50 p-4">

          <p className="text-xs text-slate-400">
            Expected Cost
          </p>

          <p className="mt-1 text-xl font-bold text-slate-900">
            ₹{expectedCost.toLocaleString(
              "en-IN",
              {
                maximumFractionDigits: 2,
              }
            )}
          </p>

        </div>

      </div>


      {/* Policy explanation */}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

        <p className="text-xs leading-5 text-slate-500">

          Transactions below{" "}

          <span className="font-semibold text-slate-700">
            {reviewThreshold.toFixed(2)}
          </span>

          {" "}are treated as low risk. Transactions from{" "}

          <span className="font-semibold text-slate-700">
            {reviewThreshold.toFixed(2)}
          </span>

          {" "}to{" "}

          <span className="font-semibold text-slate-700">
            {blockThreshold.toFixed(2)}
          </span>

          {" "}fall into the review range. Transactions at or above{" "}

          <span className="font-semibold text-slate-700">
            {blockThreshold.toFixed(2)}
          </span>

          {" "}are candidates for blocking.

        </p>

      </div>

    </div>

  );
}

function ModelLab() {

  const [metrics, setMetrics] = useState(null);

  const [thresholdData, setThresholdData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");


  // --------------------------------------------------
  // Load model metrics
  // --------------------------------------------------

  async function loadMetrics() {

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API_URL}/model-metrics`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load model metrics"
        );
      }

      const data = await response.json();

      setMetrics(data);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load model metrics"
      );

    } finally {

      setLoading(false);

    }
  }

  async function loadThresholdData() {

  try {

    const response = await fetch(
      `${API_URL}/threshold-analysis`
    );

    if (!response.ok) {
      throw new Error(
        "Unable to load threshold analysis"
      );
    }

    const data = await response.json();

    setThresholdData(data);

  } catch (err) {

    console.error(
      "Threshold analysis error:",
      err
    );

  }
}


  // --------------------------------------------------
  // Load when page opens
  // --------------------------------------------------

useEffect(() => {

  loadMetrics();

  loadThresholdData();

}, []);


  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------

  if (loading) {

    return (
      <div className="flex min-h-[500px] items-center justify-center">

        <div className="text-center">

          <Loader2
            size={32}
            className="mx-auto animate-spin text-blue-600"
          />

          <p className="mt-3 text-sm text-slate-500">
            Loading model evaluation...
          </p>

        </div>

      </div>
    );
  }


  // --------------------------------------------------
  // Error state
  // --------------------------------------------------

  if (error) {

    return (
      <div className="flex min-h-[500px] items-center justify-center">

        <div className="max-w-md text-center">

          <AlertTriangle
            size={34}
            className="mx-auto text-red-500"
          />

          <h3 className="mt-3 font-semibold text-slate-800">
            Unable to load model metrics
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {error}
          </p>

          <button
            onClick={loadMetrics}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Try Again
          </button>

        </div>

      </div>
    );
  }


  // --------------------------------------------------
  // Safety check
  // --------------------------------------------------

  if (!metrics) {

    return (
      <div className="flex min-h-[500px] items-center justify-center">

        <div className="text-center">

          <AlertTriangle
            size={34}
            className="mx-auto text-amber-500"
          />

          <h3 className="mt-3 font-semibold text-slate-800">
            No model data available
          </h3>

          <button
            onClick={loadMetrics}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Reload
          </button>

        </div>

      </div>
    );
  }


  // --------------------------------------------------
  // Backend data
  // --------------------------------------------------

  const cm = metrics.confusion_matrix || {};

  const tn = Number(cm.tn || 0);
  const fp = Number(cm.fp || 0);
  const fn = Number(cm.fn || 0);
  const tp = Number(cm.tp || 0);

  const precision = Number(
    metrics.precision || 0
  );

  const recall = Number(
    metrics.recall || 0
  );

  const f1Score = Number(
    metrics.f1_score || 0
  );

  const rocAuc = Number(
    metrics.roc_auc || 0
  );

  const prAuc = Number(
    metrics.pr_auc || 0
  );

  const threshold = Number(
    metrics.threshold || 0
  );

  const thresholdReview = Number(
    metrics.threshold_review || 0
  );

  const thresholdBlock = Number(
    metrics.threshold_block || 0
  );

  const testSamples = Number(
    metrics.test_samples || 0
  );

  const totalEvaluated =
    tn + fp + fn + tp;

  const correctPredictions =
    tn + tp;

  const incorrectPredictions =
    fp + fn;


  // --------------------------------------------------
  // Main UI
  // --------------------------------------------------

  return (

    <div className="space-y-6">


      {/* ================================================= */}
      {/* Header */}
      {/* ================================================= */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="text-sm font-semibold tracking-wide text-blue-600">
            MODEL GOVERNANCE
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Model Lab
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Evaluation metrics and fraud detection performance.
          </p>

        </div>


        <button
          onClick={loadMetrics}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >

          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />

          Refresh

        </button>

      </div>


      {/* ================================================= */}
      {/* Model status */}
      {/* ================================================= */}

      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

        <CheckCircle2
          size={20}
          className="shrink-0 text-emerald-600"
        />

        <div>

          <p className="text-sm font-semibold text-emerald-800">
            Model evaluation available
          </p>

          <p className="text-xs text-emerald-600">
            Final performance is calculated on a held-out test set.
          </p>

        </div>

      </div>


      {/* ================================================= */}
      {/* Model information */}
      {/* ================================================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Active Model
            </p>

            <p className="mt-1 text-lg font-bold text-slate-900">
              {metrics.model_name || "Unknown"}
            </p>

          </div>


          <div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Evaluation
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {metrics.evaluation_type || "Held-out test set"}
            </p>

          </div>


          <div>

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Test Samples
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {testSamples.toLocaleString()}
            </p>

          </div>

        </div>

      </div>


      {/* ================================================= */}
      {/* KPI cards */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">


        <MetricCard
          title="Precision"
          value={`${(
            precision * 100
          ).toFixed(2)}%`}
          subtitle="Flagged transactions that were fraud"
          icon={Target}
        />


        <MetricCard
          title="Recall"
          value={`${(
            recall * 100
          ).toFixed(2)}%`}
          subtitle="Actual fraud detected"
          icon={ShieldCheck}
        />


        <MetricCard
          title="F1 Score"
          value={`${(
            f1Score * 100
          ).toFixed(2)}%`}
          subtitle="Precision-recall balance"
          icon={Activity}
        />


        <MetricCard
          title="ROC-AUC"
          value={rocAuc.toFixed(3)}
          subtitle="Ranking discrimination"
          icon={Activity}
        />


        <MetricCard
          title="PR-AUC"
          value={prAuc.toFixed(3)}
          subtitle="Precision-recall area"
          icon={Target}
        />

      </div>


      {/* ================================================= */}
      {/* Confusion matrix + thresholds */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">


        {/* ----------------------------------------------- */}
        {/* Confusion matrix */}
        {/* ----------------------------------------------- */}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div>

            <h3 className="font-semibold text-slate-900">
              Confusion Matrix
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Actual versus predicted classifications
            </p>

          </div>


          <div className="mt-6">


            {/* Column labels */}

            <div className="mb-3 ml-24 grid grid-cols-2 text-center text-xs font-semibold text-slate-500">

              <span>
                Predicted Normal
              </span>

              <span>
                Predicted Fraud
              </span>

            </div>


            {/* Matrix */}

            <div className="grid grid-cols-[90px_1fr_1fr] gap-2">


              {/* Actual Normal */}

              <div className="flex items-center justify-end pr-2 text-right text-xs font-semibold text-slate-500">
                Actual Normal
              </div>


              {/* TN */}

              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50">

                <span className="text-2xl font-bold text-emerald-700">
                  {tn.toLocaleString()}
                </span>

                <span className="mt-1 text-[10px] font-semibold uppercase text-emerald-600">
                  True Negative
                </span>

              </div>


              {/* FP */}

              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50">

                <span className="text-2xl font-bold text-red-700">
                  {fp.toLocaleString()}
                </span>

                <span className="mt-1 text-[10px] font-semibold uppercase text-red-600">
                  False Positive
                </span>

              </div>


              {/* Actual Fraud */}

              <div className="flex items-center justify-end pr-2 text-right text-xs font-semibold text-slate-500">
                Actual Fraud
              </div>


              {/* FN */}

              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-orange-200 bg-orange-50">

                <span className="text-2xl font-bold text-orange-700">
                  {fn.toLocaleString()}
                </span>

                <span className="mt-1 text-[10px] font-semibold uppercase text-orange-600">
                  False Negative
                </span>

              </div>


              {/* TP */}

              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-blue-200 bg-blue-50">

                <span className="text-2xl font-bold text-blue-700">
                  {tp.toLocaleString()}
                </span>

                <span className="mt-1 text-[10px] font-semibold uppercase text-blue-600">
                  True Positive
                </span>

              </div>

            </div>

          </div>

        </div>


        {/* ----------------------------------------------- */}
        {/* Threshold policy */}
        {/* ----------------------------------------------- */}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div>

            <h3 className="font-semibold text-slate-900">
              Risk Decision Thresholds
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              Thresholds selected during model validation
            </p>

          </div>


          <div className="mt-6 space-y-4">


            {/* Approve */}

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    APPROVE
                  </p>

                  <p className="mt-1 text-sm text-emerald-700">
                    Low-risk transaction
                  </p>

                </div>


                <span className="text-lg font-bold text-emerald-700">
                  &lt; {thresholdReview.toFixed(2)}
                </span>

              </div>

            </div>


            {/* Review */}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    REVIEW
                  </p>

                  <p className="mt-1 text-sm text-amber-700">
                    Manual investigation required
                  </p>

                </div>


                <span className="text-lg font-bold text-amber-700">
                  {thresholdReview.toFixed(2)} – {thresholdBlock.toFixed(2)}
                </span>

              </div>

            </div>


            {/* Block */}

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                    BLOCK
                  </p>

                  <p className="mt-1 text-sm text-red-700">
                    High-risk transaction
                  </p>

                </div>


                <span className="text-lg font-bold text-red-700">
                  ≥ {thresholdBlock.toFixed(2)}
                </span>

              </div>

            </div>


          </div>


          {/* Operating threshold */}

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Operating Threshold
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Selected during validation
                </p>

              </div>


              <p className="text-2xl font-bold text-slate-900">
                {threshold.toFixed(2)}
              </p>

            </div>

          </div>

        </div>

      </div>


      {/* ================================================= */}
      {/* Evaluation summary */}
      {/* ================================================= */}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center gap-2">

          <Activity
            size={18}
            className="text-blue-600"
          />

          <h3 className="font-semibold text-slate-900">
            Evaluation Summary
          </h3>

        </div>


        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">


          {/* Total */}

          <div className="rounded-lg bg-slate-50 p-4">

            <p className="text-xs text-slate-400">
              Total Evaluated
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {totalEvaluated.toLocaleString()}
            </p>

          </div>


          {/* Correct */}

          <div className="rounded-lg bg-emerald-50 p-4">

            <p className="text-xs text-emerald-600">
              Correct Predictions
            </p>

            <p className="mt-1 text-xl font-bold text-emerald-700">
              {correctPredictions.toLocaleString()}
            </p>

          </div>


          {/* False positives */}

          <div className="rounded-lg bg-red-50 p-4">

            <p className="text-xs text-red-600">
              False Positives
            </p>

            <p className="mt-1 text-xl font-bold text-red-700">
              {fp.toLocaleString()}
            </p>

          </div>


          {/* False negatives */}

          <div className="rounded-lg bg-orange-50 p-4">

            <p className="text-xs text-orange-600">
              False Negatives
            </p>

            <p className="mt-1 text-xl font-bold text-orange-700">
              {fn.toLocaleString()}
            </p>

          </div>

        </div>


        {/* Accuracy-like diagnostic */}

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Correct Prediction Rate
              </p>

              <p className="mt-1 text-xs text-slate-500">
                TN + TP divided by all evaluated transactions
              </p>

            </div>


            <p className="text-xl font-bold text-slate-900">

              {totalEvaluated > 0
                ? (
                    (correctPredictions /
                      totalEvaluated) *
                    100
                  ).toFixed(2)
                : "0.00"
              }%

            </p>

          </div>

        </div>

      </div>


      {/* ================================================= */}
      {/* Business metrics */}
      {/* ================================================= */}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">


        {/* Expected cost */}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <h3 className="font-semibold text-slate-900">
            Business Impact
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Financial impact estimated on the held-out test set
          </p>


          <div className="mt-5 space-y-3">


            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">

              <span className="text-sm text-slate-500">
                Expected Cost
              </span>

              <span className="font-bold text-slate-900">
                ₹{Number(
                  metrics.test_expected_cost?.expected_cost || 0
                ).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </span>

            </div>


            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">

              <span className="text-sm text-slate-500">
                Prevented Fraud Amount
              </span>

              <span className="font-bold text-emerald-700">
                ₹{Number(
                  metrics.test_expected_cost?.prevented_fraud_amount || 0
                ).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </span>

            </div>


            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">

              <span className="text-sm text-slate-500">
                False Positive Cost
              </span>

              <span className="font-bold text-red-600">
                ₹{Number(
                  metrics.test_expected_cost?.fp_cost_total || 0
                ).toLocaleString("en-IN", {
                  maximumFractionDigits: 2,
                })}
              </span>

            </div>

          </div>

        </div>


        {/* Calibration */}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <h3 className="font-semibold text-slate-900">
            Probability Calibration
          </h3>

          <p className="mt-1 text-xs text-slate-400">
            Calibration quality from model evaluation
          </p>


          <div className="mt-5 space-y-3">


            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">

              <span className="text-sm text-slate-500">
                Method
              </span>

              <span className="font-semibold text-slate-800">
                {metrics.calibration?.method || "N/A"}
              </span>

            </div>


            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-4">

              <span className="text-sm text-slate-500">
                Raw Brier Score
              </span>

              <span className="font-bold text-slate-900">
                {Number(
                  metrics.calibration?.brier_raw || 0
                ).toFixed(6)}
              </span>

            </div>


            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4">

              <span className="text-sm text-emerald-600">
                Calibrated Brier Score
              </span>

              <span className="font-bold text-emerald-700">
                {Number(
                  metrics.calibration?.brier_calibrated || 0
                ).toFixed(6)}
              </span>

            </div>

          </div>

        </div>

      </div>

      {/* ================================================= */}
{/* Model Curves */}
{/* ================================================= */}

<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">


  {/* ROC / PR curves */}

  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

    <div>

      <h3 className="font-semibold text-slate-900">
        ROC & Precision-Recall Curves
      </h3>

      <p className="mt-1 text-xs text-slate-400">
        Held-out test-set discrimination performance
      </p>

    </div>


    <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">

      <img
        src={`${API_URL}/model-figures/roc-pr`}
        alt="ROC and Precision-Recall curves"
        className="h-auto w-full"
      />

    </div>


    <div className="mt-4 grid grid-cols-2 gap-3">

      <div className="rounded-lg bg-blue-50 p-3">

        <p className="text-xs text-blue-600">
          ROC-AUC
        </p>

        <p className="mt-1 text-lg font-bold text-blue-800">
          {rocAuc.toFixed(3)}
        </p>

      </div>


      <div className="rounded-lg bg-indigo-50 p-3">

        <p className="text-xs text-indigo-600">
          PR-AUC
        </p>

        <p className="mt-1 text-lg font-bold text-indigo-800">
          {prAuc.toFixed(3)}
        </p>

      </div>

    </div>

  </div>


  {/* Threshold analysis */}

  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

    <div>

      <h3 className="font-semibold text-slate-900">
        Threshold Analysis
      </h3>

      <p className="mt-1 text-xs text-slate-400">
        Validation-based operating threshold selection
      </p>

    </div>


    <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">

      <img
        src={`${API_URL}/model-figures/threshold`}

        alt="Threshold analysis"
        className="h-auto w-full"
      />

    </div>


    <div className="mt-4 rounded-lg bg-slate-50 p-4">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Selected Threshold
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Optimized on validation data
          </p>

        </div>


        <p className="text-2xl font-bold text-slate-900">
          {threshold.toFixed(2)}
        </p>

      </div>

    </div>

  </div>

</div>
    
       {/* ================================================= */}
{/* Interactive Threshold Simulator */}
{/* ================================================= */}

<div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

  <div>

    <div className="flex items-center gap-2">

      <Activity
        size={18}
        className="text-blue-600"
      />

      <h3 className="font-semibold text-slate-900">
        Threshold Simulator
      </h3>

    </div>

    <p className="mt-1 text-xs text-slate-400">
      Explore the precision, recall and business cost
      at thresholds evaluated on validation data.
    </p>

  </div>


  {thresholdData &&
  thresholdData.threshold_analysis &&
  thresholdData.threshold_analysis.length > 0 ? (

    <ThresholdSimulator
      data={thresholdData}
    />

  ) : (

    <div className="mt-5 rounded-lg bg-slate-50 p-5 text-center">

      <p className="text-sm text-slate-500">
        Threshold analysis is loading...
      </p>

    </div>

  )}

</div>         


      {/* ================================================= */}
      {/* Methodology disclaimer */}
      {/* ================================================= */}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

        <p className="text-xs leading-5 text-slate-500">
          {metrics.disclaimer}
        </p>

      </div>


    </div>
  );
}


export default ModelLab;

