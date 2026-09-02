import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  useEffect,
  useMemo,
  useState,
} from "react";


function MetricCard({
  title,
  value,
  change,
  positive,
  icon: Icon,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-start justify-between">

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="rounded-lg bg-slate-100 p-2">
          <Icon
            size={20}
            className="text-slate-700"
          />
        </div>

      </div>

      {change && (
        <div className="mt-4 flex items-center gap-1 text-xs">

          {positive ? (
            <ArrowUpRight
              size={14}
              className="text-emerald-600"
            />
          ) : (
            <ArrowDownRight
              size={14}
              className="text-red-500"
            />
          )}

          <span
            className={
              positive
                ? "text-emerald-600"
                : "text-red-500"
            }
          >
            {change}
          </span>

          <span className="text-slate-400">
            current data
          </span>

        </div>
      )}

    </div>
  );
}


function decisionClasses(decision) {

  if (decision === "BLOCK") {
    return "bg-red-100 text-red-700";
  }

  if (decision === "REVIEW") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}


function Overview() {

  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ---------------------------------------------
  // Load real transaction data
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
          "Unable to load dashboard data"
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          "Invalid transaction data received"
        );
      }

      setTransactions(data);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard data"
      );

    } finally {

      setLoading(false);

    }

  }


  useEffect(() => {
    loadTransactions();
  }, []);


  // ---------------------------------------------
  // Calculate dashboard metrics
  // ---------------------------------------------

  const metrics = useMemo(() => {

    const total =
      transactions.length;


    const totalAmount =
      transactions.reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.amount || 0
          ),
        0
      );


    const blockCount =
      transactions.filter(
        (transaction) =>
          transaction.decision === "BLOCK"
      ).length;


    const reviewCount =
      transactions.filter(
        (transaction) =>
          transaction.decision === "REVIEW"
      ).length;


    const approveCount =
      transactions.filter(
        (transaction) =>
          transaction.decision === "APPROVE"
      ).length;


    const highRiskCount =
      transactions.filter(
        (transaction) =>
          Number(
            transaction.risk_score || 0
          ) >= 50
      ).length;


    const fraudRate =
      total > 0
        ? (blockCount / total) * 100
        : 0;


    const highRiskRate =
      total > 0
        ? (highRiskCount / total) * 100
        : 0;


    const blockedAmount =
      transactions
        .filter(
          (transaction) =>
            transaction.decision === "BLOCK"
        )
        .reduce(
          (sum, transaction) =>
            sum +
            Number(
              transaction.amount || 0
            ),
          0
        );


    const expectedLoss =
      transactions.reduce(
        (sum, transaction) =>
          sum +
          Number(
            transaction.expected_loss || 0
          ),
        0
      );


    return {
      total,
      totalAmount,
      blockCount,
      reviewCount,
      approveCount,
      highRiskCount,
      fraudRate,
      highRiskRate,
      blockedAmount,
      expectedLoss,
    };

  }, [transactions]);


  // ---------------------------------------------
  // Risk distribution
  // ---------------------------------------------

  const riskDistribution =
    useMemo(() => {

      const low =
        transactions.filter(
          (transaction) =>
            Number(
              transaction.risk_score || 0
            ) < 50
        ).length;


      const medium =
        transactions.filter(
          (transaction) => {

            const score =
              Number(
                transaction.risk_score || 0
              );

            return (
              score >= 50 &&
              score < 80
            );

          }
        ).length;


      const high =
        transactions.filter(
          (transaction) => {

            const score =
              Number(
                transaction.risk_score || 0
              );

            return (
              score >= 80 &&
              score < 90
            );

          }
        ).length;


      const critical =
        transactions.filter(
          (transaction) =>
            Number(
              transaction.risk_score || 0
            ) >= 90
        ).length;


      return [
        {
          name: "Low",
          value: low,
        },
        {
          name: "Medium",
          value: medium,
        },
        {
          name: "High",
          value: high,
        },
        {
          name: "Critical",
          value: critical,
        },
      ];

    }, [transactions]);


  // ---------------------------------------------
  // Recent high-risk transactions
  // ---------------------------------------------

  const recentTransactions =
    useMemo(() => {

      return [...transactions]
        .filter(
          (transaction) =>
            Number(
              transaction.risk_score || 0
            ) >= 50
        )
        .sort(
          (a, b) =>
            new Date(b.timestamp) -
            new Date(a.timestamp)
        )
        .slice(0, 5);

    }, [transactions]);


  // ---------------------------------------------
  // Current transaction distribution
  // ---------------------------------------------

  const transactionActivity =
    useMemo(() => {

      if (transactions.length === 0) {
        return [];
      }


      const grouped = {};


      transactions.forEach(
        (transaction) => {

          const date =
            new Date(
              transaction.timestamp
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            return;
          }


          const label =
            date.toLocaleDateString(
              "en-IN",
              {
                day: "2-digit",
                month: "short",
              }
            );


          if (!grouped[label]) {

            grouped[label] = {
              day: label,
              transactions: 0,
              fraud: 0,
            };

          }


          grouped[label].transactions += 1;


          if (
            transaction.decision ===
              "BLOCK" ||
            Number(
              transaction.risk_score || 0
            ) >= 90
          ) {

            grouped[label].fraud += 1;

          }

        }
      );


      return Object.values(grouped)
        .sort(
          (a, b) =>
            new Date(a.day) -
            new Date(b.day)
        )
        .slice(-7);

    }, [transactions]);


  return (
    <div className="space-y-6">


      {/* --------------------------------------- */}
      {/* Header */}
      {/* --------------------------------------- */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="text-sm font-medium text-blue-600">
            RISK MANAGEMENT
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor transaction risk and fraud activity.
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
              Loading dashboard...
            </p>

          </div>

        </div>

      )}


      {/* --------------------------------------- */}
      {/* Error */}
      {/* --------------------------------------- */}

      {!loading && error && (

        <div className="rounded-xl border border-red-200 bg-red-50 p-6">

          <div className="flex items-start gap-3">

            <AlertTriangle
              size={20}
              className="mt-0.5 text-red-600"
            />

            <div>

              <h3 className="font-semibold text-red-800">
                Unable to load dashboard
              </h3>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>

            </div>

          </div>

          <button
            onClick={loadTransactions}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>

        </div>

      )}


      {/* --------------------------------------- */}
      {/* Dashboard */}
      {/* --------------------------------------- */}

      {!loading && !error && (

        <>


          {/* Metrics */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">


            <MetricCard
              title="Transactions Scanned"
              value={metrics.total.toLocaleString()}
              change="Live"
              positive={true}
              icon={Activity}
            />


            <MetricCard
              title="Fraud / Block Rate"
              value={`${metrics.fraudRate.toFixed(2)}%`}
              change={`${metrics.blockCount} blocked`}
              positive={false}
              icon={ShieldAlert}
            />


            <MetricCard
              title="Amount at Risk"
              value={`₹${metrics.blockedAmount.toLocaleString(
                "en-IN",
                {
                  maximumFractionDigits: 0,
                }
              )}`}
              change={`${metrics.highRiskCount} high risk`}
              positive={false}
              icon={Wallet}
            />


            <MetricCard
              title="Active Alerts"
              value={metrics.blockCount + metrics.reviewCount}
              change={`${metrics.reviewCount} review`}
              positive={false}
              icon={ShieldCheck}
            />

          </div>


          {/* Additional metrics */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">


            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <p className="text-sm text-slate-500">
                Approved
              </p>

              <p className="mt-2 text-2xl font-bold text-emerald-600">
                {metrics.approveCount}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {metrics.total > 0
                  ? (
                      (metrics.approveCount /
                        metrics.total) *
                      100
                    ).toFixed(1)
                  : "0.0"}%
                of transactions
              </p>

            </div>


            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <p className="text-sm text-slate-500">
                Under Review
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-600">
                {metrics.reviewCount}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Awaiting review
              </p>

            </div>


            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <p className="text-sm text-slate-500">
                Expected Loss
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">

                ₹
                {metrics.expectedLoss.toLocaleString(
                  "en-IN",
                  {
                    maximumFractionDigits: 0,
                  }
                )}

              </p>

              <p className="mt-1 text-xs text-slate-400">
                Current stored predictions
              </p>

            </div>

          </div>


          {/* Charts */}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">


            {/* Fraud activity */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="mb-5">

                <h3 className="font-semibold text-slate-900">
                  Fraud Activity
                </h3>

                <p className="text-xs text-slate-500">
                  Transactions and high-risk detections
                </p>

              </div>


              {transactionActivity.length > 0 ? (

                <ResponsiveContainer
                  width="100%"
                  height={280}
                >

                  <AreaChart
                    data={transactionActivity}
                  >

                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                    />

                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />

                    <Tooltip />


                    <Area
                      type="monotone"
                      dataKey="transactions"
                      name="Transactions"
                      stroke="#2563eb"
                      fill="#dbeafe"
                      strokeWidth={2}
                    />


                    <Area
                      type="monotone"
                      dataKey="fraud"
                      name="High Risk"
                      stroke="#ef4444"
                      fill="#fee2e2"
                      strokeWidth={2}
                    />

                  </AreaChart>

                </ResponsiveContainer>

              ) : (

                <div className="flex h-[280px] items-center justify-center">

                  <p className="text-sm text-slate-400">
                    Not enough timestamped data for a trend yet.
                  </p>

                </div>

              )}

            </div>


            {/* Risk distribution */}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

              <div className="mb-5">

                <h3 className="font-semibold text-slate-900">
                  Risk Distribution
                </h3>

                <p className="text-xs text-slate-500">
                  Current transaction risk levels
                </p>

              </div>


              {transactions.length > 0 ? (

                <>

                  <div className="flex items-center justify-center">

                    <PieChart
                      width={300}
                      height={260}
                    >

                      <Pie
                        data={riskDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
                      >

                        <Cell fill="#22c55e" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                        <Cell fill="#991b1b" />

                      </Pie>

                      <Tooltip />

                    </PieChart>

                  </div>


                  <div className="flex flex-wrap justify-center gap-5 text-xs">

                    <span className="text-emerald-600">
                      ● Low{" "}
                      {riskDistribution[0].value}
                    </span>

                    <span className="text-amber-600">
                      ● Medium{" "}
                      {riskDistribution[1].value}
                    </span>

                    <span className="text-orange-600">
                      ● High{" "}
                      {riskDistribution[2].value}
                    </span>

                    <span className="text-red-600">
                      ● Critical{" "}
                      {riskDistribution[3].value}
                    </span>

                  </div>

                </>

              ) : (

                <div className="flex h-[280px] items-center justify-center">

                  <p className="text-sm text-slate-400">
                    No scored transactions yet.
                  </p>

                </div>

              )}

            </div>

          </div>


          {/* Recent transactions */}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 p-5">

              <h3 className="font-semibold text-slate-900">
                Recent High-Risk Transactions
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Transactions requiring attention
              </p>

            </div>


            {recentTransactions.length > 0 ? (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">

                    <tr>

                      <th className="px-5 py-3">
                        Transaction
                      </th>

                      <th className="px-5 py-3">
                        Amount
                      </th>

                      <th className="px-5 py-3">
                        Risk Score
                      </th>

                      <th className="px-5 py-3">
                        Decision
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {recentTransactions.map(
                      (transaction) => (

                        <tr
                          key={transaction.id}
                          className="border-t border-slate-100"
                        >

                          <td className="px-5 py-4 font-medium text-slate-900">
                            {transaction.id}
                          </td>


                          <td className="px-5 py-4 text-slate-600">

                            ₹
                            {Number(
                              transaction.amount || 0
                            ).toLocaleString(
                              "en-IN"
                            )}

                          </td>


                          <td className="px-5 py-4">

                            <span className="font-semibold text-slate-900">

                              {Number(
                                transaction.risk_score || 0
                              ).toFixed(0)}

                              /100

                            </span>

                          </td>


                          <td className="px-5 py-4">

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${decisionClasses(
                                transaction.decision
                              )}`}
                            >
                              {transaction.decision}
                            </span>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            ) : (

              <div className="p-10 text-center">

                <ShieldCheck
                  size={34}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-3 font-semibold text-slate-800">
                  No high-risk transactions
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Transactions with risk score ≥ 50 will appear here.
                </p>

              </div>

            )}

          </div>


        </>

      )}

    </div>
  );
}


export default Overview;