import {
  BarChart3,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Clock,
  IndianRupee,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";


function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");


  // ---------------------------------------------
  // Load real transactions from FastAPI
  // ---------------------------------------------

  async function loadTransactions() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/transactions"
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load transaction analytics"
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid transaction data received from API"
        );
      }

      setTransactions(data);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load analytics"
      );

    } finally {
      setLoading(false);
    }
  }


  // ---------------------------------------------
  // Load when page opens
  // ---------------------------------------------

  useEffect(() => {
    loadTransactions();
  }, []);


  // ---------------------------------------------
  // Calculate analytics from real data
  // ---------------------------------------------

  const metrics = useMemo(() => {
    const total = transactions.length;


    const totalAmount = transactions.reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount || 0),
      0
    );


    const expectedLoss = transactions.reduce(
      (sum, transaction) =>
        sum + Number(transaction.expected_loss || 0),
      0
    );


    const approveCount = transactions.filter(
      (transaction) =>
        transaction.decision === "APPROVE"
    ).length;


    const reviewCount = transactions.filter(
      (transaction) =>
        transaction.decision === "REVIEW"
    ).length;


    const blockCount = transactions.filter(
      (transaction) =>
        transaction.decision === "BLOCK"
    ).length;


    const highRiskCount = transactions.filter(
      (transaction) =>
        Number(transaction.risk_score || 0) >= 50
    ).length;


    const criticalCount = transactions.filter(
      (transaction) =>
        Number(transaction.risk_score || 0) >= 90
    ).length;


    const averageRisk =
      total > 0
        ? transactions.reduce(
            (sum, transaction) =>
              sum +
              Number(
                transaction.risk_score || 0
              ),
            0
          ) / total
        : 0;


    const averageFraudProbability =
      total > 0
        ? transactions.reduce(
            (sum, transaction) =>
              sum +
              Number(
                transaction.fraud_probability || 0
              ),
            0
          ) / total
        : 0;


    const approveRate =
      total > 0
        ? (approveCount / total) * 100
        : 0;


    const reviewRate =
      total > 0
        ? (reviewCount / total) * 100
        : 0;


    const blockRate =
      total > 0
        ? (blockCount / total) * 100
        : 0;


    return {
      total,
      totalAmount,
      expectedLoss,
      approveCount,
      reviewCount,
      blockCount,
      highRiskCount,
      criticalCount,
      averageRisk,
      averageFraudProbability,
      approveRate,
      reviewRate,
      blockRate,
    };

  }, [transactions]);


  // ---------------------------------------------
  // Decision distribution
  // ---------------------------------------------

  const decisionData = [
    {
      label: "APPROVE",
      count: metrics.approveCount,
      icon: ShieldCheck,
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },

    {
      label: "REVIEW",
      count: metrics.reviewCount,
      icon: Clock,
      bg: "bg-amber-50",
      text: "text-amber-600",
    },

    {
      label: "BLOCK",
      count: metrics.blockCount,
      icon: ShieldAlert,
      bg: "bg-red-50",
      text: "text-red-600",
    },
  ];


  // ---------------------------------------------
  // Risk distribution
  // ---------------------------------------------

  const riskBuckets = [
    {
      label: "Low",
      range: "0-49",
      count: transactions.filter(
        (transaction) =>
          Number(transaction.risk_score || 0) < 50
      ).length,
    },

    {
      label: "Medium",
      range: "50-79",
      count: transactions.filter(
        (transaction) =>
          Number(transaction.risk_score || 0) >= 50 &&
          Number(transaction.risk_score || 0) < 80
      ).length,
    },

    {
      label: "High",
      range: "80-89",
      count: transactions.filter(
        (transaction) =>
          Number(transaction.risk_score || 0) >= 80 &&
          Number(transaction.risk_score || 0) < 90
      ).length,
    },

    {
      label: "Critical",
      range: "90-100",
      count: transactions.filter(
        (transaction) =>
          Number(transaction.risk_score || 0) >= 90
      ).length,
    },
  ];


  const maxRiskBucket = Math.max(
    ...riskBuckets.map(
      (bucket) => bucket.count
    ),
    1
  );


  return (
    <div className="space-y-6">

      {/* --------------------------------------- */}
      {/* Header */}
      {/* --------------------------------------- */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="text-sm font-semibold tracking-wide text-blue-600">
            DATA & INSIGHTS
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Analytics
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Performance and risk analytics from scored transactions.
          </p>

        </div>


        <button
          onClick={loadTransactions}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >

          <RefreshCw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh

        </button>

      </div>


      {/* --------------------------------------- */}
      {/* Loading */}
      {/* --------------------------------------- */}

      {loading && (

        <div className="flex min-h-[400px] items-center justify-center">

          <div className="text-center">

            <Loader2
              size={32}
              className="mx-auto animate-spin text-blue-600"
            />

            <p className="mt-3 text-sm text-slate-500">
              Loading analytics...
            </p>

          </div>

        </div>

      )}


      {/* --------------------------------------- */}
      {/* Error */}
      {/* --------------------------------------- */}

      {!loading && error && (

        <div className="flex min-h-[400px] items-center justify-center">

          <div className="text-center">

            <AlertTriangle
              size={32}
              className="mx-auto text-red-500"
            />

            <h3 className="mt-3 font-semibold text-slate-800">
              Unable to load analytics
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>

            <button
              onClick={loadTransactions}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try Again
            </button>

          </div>

        </div>

      )}


      {/* --------------------------------------- */}
      {/* Analytics */}
      {/* --------------------------------------- */}

      {!loading && !error && (

        <>

          {/* ----------------------------------- */}
          {/* KPI Cards */}
          {/* ----------------------------------- */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">


            {/* Total Transactions */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total Transactions
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {metrics.total.toLocaleString()}
                  </p>

                </div>


                <div className="rounded-lg bg-blue-50 p-2.5">

                  <BarChart3
                    size={20}
                    className="text-blue-600"
                  />

                </div>

              </div>

              <p className="mt-3 text-xs text-slate-400">
                From stored model predictions
              </p>

            </div>


            {/* Transaction Volume */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Transaction Volume
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">

                    ₹
                    {metrics.totalAmount.toLocaleString(
                      "en-IN",
                      {
                        maximumFractionDigits: 0,
                      }
                    )}

                  </p>

                </div>


                <div className="rounded-lg bg-emerald-50 p-2.5">

                  <IndianRupee
                    size={20}
                    className="text-emerald-600"
                  />

                </div>

              </div>

              <p className="mt-3 text-xs text-slate-400">
                Total amount processed
              </p>

            </div>


            {/* High Risk */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    High-Risk Transactions
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {metrics.highRiskCount.toLocaleString()}
                  </p>

                </div>


                <div className="rounded-lg bg-red-50 p-2.5">

                  <ShieldAlert
                    size={20}
                    className="text-red-600"
                  />

                </div>

              </div>

              <p className="mt-3 text-xs text-slate-400">
                Risk score ≥ 50
              </p>

            </div>


            {/* Expected Loss */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Expected Loss
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">

                    ₹
                    {metrics.expectedLoss.toLocaleString(
                      "en-IN",
                      {
                        maximumFractionDigits: 0,
                      }
                    )}

                  </p>

                </div>


                <div className="rounded-lg bg-amber-50 p-2.5">

                  <AlertTriangle
                    size={20}
                    className="text-amber-600"
                  />

                </div>

              </div>

              <p className="mt-3 text-xs text-slate-400">
                Sum of model expected-loss estimates
              </p>

            </div>

          </div>


          {/* ----------------------------------- */}
          {/* Secondary Metrics */}
          {/* ----------------------------------- */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">


            {/* Average Risk */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Average Risk Score
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">

                {metrics.averageRisk.toFixed(1)}

                <span className="text-sm font-normal text-slate-400">
                  /100
                </span>

              </p>

            </div>


            {/* Average Fraud Probability */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Average Fraud Probability
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">

                {(
                  metrics.averageFraudProbability * 100
                ).toFixed(2)}

                %

              </p>

            </div>


            {/* Critical Alerts */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Critical Alerts
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {metrics.criticalCount}
              </p>

            </div>

          </div>


          {/* ----------------------------------- */}
          {/* Charts */}
          {/* ----------------------------------- */}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">


            {/* Decision Distribution */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div>

                <h3 className="font-semibold text-slate-900">
                  Decision Distribution
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Actual decisions returned by the model
                </p>

              </div>


              <div className="mt-6 space-y-5">

                {decisionData.map(
                  (item) => {

                    const percentage =
                      metrics.total > 0
                        ? (
                            item.count /
                            metrics.total
                          ) * 100
                        : 0;


                    const Icon =
                      item.icon;


                    return (

                      <div key={item.label}>

                        <div className="flex items-center justify-between">

                          <div className="flex items-center gap-3">

                            <div
                              className={`rounded-lg p-2 ${item.bg}`}
                            >

                              <Icon
                                size={17}
                                className={item.text}
                              />

                            </div>

                            <span className="text-sm font-semibold text-slate-700">
                              {item.label}
                            </span>

                          </div>


                          <div className="text-right">

                            <span className="font-bold text-slate-800">
                              {item.count}
                            </span>

                            <span className="ml-2 text-xs text-slate-400">
                              ({percentage.toFixed(1)}%)
                            </span>

                          </div>

                        </div>


                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-slate-800 transition-all"
                            style={{
                              width: `${percentage}%`,
                            }}
                          />

                        </div>

                      </div>

                    );

                  }
                )}

              </div>

            </div>


            {/* Risk Distribution */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div>

                <h3 className="font-semibold text-slate-900">
                  Risk Score Distribution
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Transactions grouped by risk score
                </p>

              </div>


              <div className="mt-6 space-y-4">

                {riskBuckets.map(
                  (bucket) => {

                    const width =
                      (
                        bucket.count /
                        maxRiskBucket
                      ) * 100;


                    return (

                      <div
                        key={bucket.label}
                      >

                        <div className="flex items-center justify-between">

                          <div>

                            <span className="text-sm font-semibold text-slate-700">
                              {bucket.label}
                            </span>

                            <span className="ml-2 text-xs text-slate-400">
                              {bucket.range}
                            </span>

                          </div>


                          <span className="font-bold text-slate-800">
                            {bucket.count}
                          </span>

                        </div>


                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">

                          <div
                            className="h-full rounded-full bg-slate-700 transition-all"
                            style={{
                              width: `${width}%`,
                            }}
                          />

                        </div>

                      </div>

                    );

                  }
                )}

              </div>

            </div>

          </div>


          {/* ----------------------------------- */}
          {/* Empty State */}
          {/* ----------------------------------- */}

          {transactions.length === 0 && (

            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">

              <BarChart3
                size={36}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-4 font-semibold text-slate-800">
                No analytics data yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Score some transactions to populate
                the analytics dashboard.
              </p>

            </div>

          )}

        </>

      )}

    </div>
  );
}


export default Analytics;