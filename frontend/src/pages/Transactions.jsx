import {
  Search,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  Loader2,
  AlertTriangle,
  X,
} from "lucide-react";

import { API_URL } from "../config";
import { useEffect, useMemo, useState } from "react";


function decisionStyle(decision) {
  if (decision === "BLOCK") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (decision === "REVIEW") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }

  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}


function scoreStyle(score) {
  if (score >= 80) {
    return "text-red-600";
  }

  if (score >= 50) {
    return "text-amber-600";
  }

  return "text-emerald-600";
}


function Transactions() {

  const [transactions, setTransactions] = useState([]);

  const [search, setSearch] = useState("");

  const [decisionFilter, setDecisionFilter] =
    useState("ALL");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedTransaction, setSelectedTransaction] =
    useState(null);


  async function loadTransactions() {

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API_URL}/transactions`
      );


      if (!response.ok) {

        throw new Error(
          "Unable to load transactions"
        );

      }


      const data = await response.json();

      setTransactions(data);

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }
  }

  const markReviewed = async () => {
    if (!selectedTransaction) return;

    try {
      const response = await fetch(
        `${API_URL}/transactions/${selectedTransaction.id}/review`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to mark transaction as reviewed."
        );
      }

      setTransactions((current) =>
        current.map((transaction) =>
          transaction.id === selectedTransaction.id
            ? {
                ...transaction,
                review_status: data.review_status,
                reviewed_at: data.reviewed_at,
              }
            : transaction
        )
      );

      setSelectedTransaction((current) =>
        current
          ? {
              ...current,
              review_status: data.review_status,
              reviewed_at: data.reviewed_at,
            }
          : current
      );
    } catch (err) {
      console.error("Review error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to mark transaction as reviewed."
      );
    }
  };

  useEffect(() => {

    loadTransactions();

  }, []);


  const filteredTransactions = useMemo(() => {

    return transactions.filter(
      (transaction) => {

        const matchesSearch =
          transaction.id
            .toLowerCase()
            .includes(
              search.toLowerCase()
            );


        const matchesDecision =
          decisionFilter === "ALL" ||
          transaction.decision ===
            decisionFilter;


        return (
          matchesSearch &&
          matchesDecision
        );

      }
    );

  }, [
    transactions,
    search,
    decisionFilter,
  ]);


  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="text-sm font-semibold tracking-wide text-blue-600">
            TRANSACTION MONITORING
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Transactions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review transactions processed by the
            MerchantShield risk engine.
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


      {/* Main card */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        {/* Toolbar */}

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">

          <div className="relative w-full lg:w-80">

            <Search
              size={17}
              className="absolute left-3 top-2.5 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search transaction ID..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

          </div>


          <div className="flex items-center gap-2">

            <SlidersHorizontal
              size={16}
              className="text-slate-400"
            />

            <select
              value={decisionFilter}
              onChange={(e) =>
                setDecisionFilter(
                  e.target.value
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            >

              <option value="ALL">
                All Decisions
              </option>

              <option value="APPROVE">
                Approve
              </option>

              <option value="REVIEW">
                Review
              </option>

              <option value="BLOCK">
                Block
              </option>

            </select>

          </div>

        </div>


        {/* Loading */}

        {loading && (

          <div className="flex min-h-[350px] items-center justify-center">

            <div className="text-center">

              <Loader2
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading transactions...
              </p>

            </div>

          </div>

        )}


        {/* Error */}

        {!loading && error && (

          <div className="flex min-h-[350px] items-center justify-center p-6">

            <div className="max-w-md text-center">

              <AlertTriangle
                size={32}
                className="mx-auto text-red-500"
              />

              <h3 className="mt-3 font-semibold text-slate-800">
                Unable to load transactions
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


        {/* Empty state */}

        {!loading &&
          !error &&
          transactions.length === 0 && (

            <div className="flex min-h-[350px] items-center justify-center p-6">

              <div className="text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">

                  <Search
                    size={22}
                    className="text-slate-400"
                  />

                </div>

                <h3 className="mt-4 font-semibold text-slate-800">
                  No transactions yet
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Score a transaction to create your
                  first transaction record.
                </p>

              </div>

            </div>

          )}


        {/* Table */}

        {!loading &&
          !error &&
          transactions.length > 0 && (

            <>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[900px] text-sm">

                  <thead className="bg-slate-50">

                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                      <th className="px-5 py-3">
                        Transaction
                      </th>

                      <th className="px-5 py-3">
                        Amount
                      </th>

                      <th className="px-5 py-3">
                        Fraud Probability
                      </th>

                      <th className="px-5 py-3">
                        Risk Score
                      </th>

                      <th className="px-5 py-3">
                        Decision
                      </th>

                      <th className="px-5 py-3">
                        Payment
                     </th>

                      <th className="px-5 py-3">
                        Timestamp
                      </th>

                      <th className="px-5 py-3">
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredTransactions.map(
                      (transaction) => (

                        <tr
                          key={transaction.id}
                          className="border-t border-slate-100 transition hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">

                            <span className="font-semibold text-slate-800">
                              {transaction.id}
                            </span>

                          </td>


                          <td className="px-5 py-4 font-medium text-slate-700">

                            ₹
                            {Number(
                              transaction.amount
                            ).toLocaleString(
                              "en-IN"
                            )}

                          </td>


                          <td className="px-5 py-4">

                            {(
                              Number(
                                transaction.fraud_probability
                              ) * 100
                            ).toFixed(2)}
                            %

                          </td>


                          <td className="px-5 py-4">

                            <span
                              className={`font-bold ${scoreStyle(
                                Number(
                                  transaction.risk_score
                                )
                              )}`}
                            >
                              {Number(
                                transaction.risk_score
                              ).toFixed(0)}
                            </span>

                            <span className="text-slate-400">
                              /100
                            </span>

                          </td>

                          <td className="px-5 py-4">
                            {transaction.payment_verified ? (
                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                                ✓ VERIFIED
                                </span>
                            ) : transaction.payment_status === "ORDER_CREATED" ? (
                                <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                PAYMENT PENDING
                                </span>
                            ) : transaction.decision === "BLOCK" ? (
                                <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                BLOCKED
                                </span>
                            ) : transaction.decision === "REVIEW" ? (
                                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                REVIEW
                                </span>
                            ) : (
                                <span className="text-xs text-slate-400">
                                NOT PAID
                                </span>
                            )}
                            </td>


                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${decisionStyle(
                                transaction.decision
                              )}`}
                            >
                              {transaction.decision}
                            </span>

                          </td>


                          <td className="px-5 py-4 text-xs text-slate-500">

                            {new Date(
                              transaction.timestamp
                            ).toLocaleString()}

                          </td>


                          <td className="px-5 py-4">

                            <button
                            onClick={() =>
                                setSelectedTransaction(transaction)
                            }
                            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                            >
                            <Eye size={14} />

                            View
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>


              {/* Footer */}

              <div className="border-t border-slate-200 px-5 py-3">

                <p className="text-xs text-slate-400">

                  Showing{" "}

                  <span className="font-medium text-slate-600">
                    {filteredTransactions.length}
                  </span>

                  {" "}of{" "}

                  <span className="font-medium text-slate-600">
                    {transactions.length}
                  </span>

                  {" "}transactions

                </p>

              </div>

            </>

          )}

      </div>


      {/* Transaction Investigation Drawer */}

      {selectedTransaction && (

        <div className="fixed inset-0 z-50">

          {/* Dark background */}

          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() =>
              setSelectedTransaction(null)
            }
          />


          {/* Drawer */}

          <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">

            {/* Drawer Header */}

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">

              <div>

                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  TRANSACTION INVESTIGATION
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {selectedTransaction.id}
                </h3>

              </div>


              <button
                onClick={() =>
                  setSelectedTransaction(null)
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >

                <X size={20} />

              </button>

            </div>


            {/* Drawer Content */}

            <div className="space-y-6 p-6">


              {/* Decision */}

              <div
                className={`rounded-xl border p-5 ${
                  selectedTransaction.decision === "BLOCK"
                    ? "border-red-200 bg-red-50"
                    : selectedTransaction.decision === "REVIEW"
                    ? "border-amber-200 bg-amber-50"
                    : "border-emerald-200 bg-emerald-50"
                }`}
              >

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Decision
                </p>


                <div className="mt-2 flex items-center justify-between">

                  <span
                    className={`text-2xl font-bold ${
                      selectedTransaction.decision === "BLOCK"
                        ? "text-red-700"
                        : selectedTransaction.decision === "REVIEW"
                        ? "text-amber-700"
                        : "text-emerald-700"
                    }`}
                  >
                    {selectedTransaction.decision}
                  </span>


                  <span className="text-sm font-semibold text-slate-500">

                    Risk Score{" "}

                    {Number(
                      selectedTransaction.risk_score
                    ).toFixed(0)}

                    /100

                  </span>

                </div>

              </div>


              {/* Transaction Details */}

              <div>

                <h4 className="font-semibold text-slate-900">
                  Transaction Details
                </h4>


                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">


                  <div className="flex justify-between px-4 py-3">

                    <span className="text-sm text-slate-500">
                      Transaction ID
                    </span>

                    <span className="text-sm font-semibold text-slate-800">
                      {selectedTransaction.id}
                    </span>

                  </div>


                  <div className="flex justify-between px-4 py-3">

                    <span className="text-sm text-slate-500">
                      Amount
                    </span>

                    <span className="text-sm font-semibold text-slate-800">

                      ₹
                      {Number(
                        selectedTransaction.amount
                      ).toLocaleString("en-IN")}

                    </span>

                  </div>


                  <div className="flex justify-between px-4 py-3">

                    <span className="text-sm text-slate-500">
                      Fraud Probability
                    </span>

                    <span className="text-sm font-semibold text-slate-800">

                      {(
                        Number(
                          selectedTransaction.fraud_probability
                        ) * 100
                      ).toFixed(2)}

                      %

                    </span>

                  </div>


                  <div className="flex justify-between px-4 py-3">

                    <span className="text-sm text-slate-500">
                      Expected Loss
                    </span>

                    <span className="text-sm font-semibold text-slate-800">

                      ₹
                      {Number(
                        selectedTransaction.expected_loss
                      ).toLocaleString("en-IN")}

                    </span>

                  </div>


                  <div className="flex justify-between px-4 py-3">

                    <span className="text-sm text-slate-500">
                      Timestamp
                    </span>

                    <span className="text-sm text-slate-600">

                      {new Date(
                        selectedTransaction.timestamp
                      ).toLocaleString()}

                    </span>

                  </div>


                </div>

              </div>

              {/* ================================================= */}
{/* Payment Audit */}
{/* ================================================= */}

<div>

  <h4 className="font-semibold text-slate-900">
    Payment Audit
  </h4>

  <p className="mt-1 text-xs text-slate-400">
    Razorpay payment and verification status
  </p>

  <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">

    {/* Payment Status */}
    <div className="flex justify-between gap-4 px-4 py-3">

      <span className="text-sm text-slate-500">
        Payment Status
      </span>

      <span
        className={`text-sm font-semibold ${
          selectedTransaction.payment_verified
            ? "text-emerald-600"
            : selectedTransaction.payment_status === "ORDER_CREATED"
            ? "text-blue-600"
            : "text-slate-500"
        }`}
      >
        {selectedTransaction.payment_verified
          ? "✓ VERIFIED"
          : selectedTransaction.payment_status || "NOT PAID"}
      </span>

    </div>


    {/* Payment Verified */}
    <div className="flex justify-between gap-4 px-4 py-3">

      <span className="text-sm text-slate-500">
        Payment Verified
      </span>

      <span className="text-sm font-semibold text-slate-800">
        {selectedTransaction.payment_verified
          ? "Yes"
          : "No"}
      </span>

    </div>


    {/* Razorpay Order ID */}
    <div className="flex justify-between gap-4 px-4 py-3">

      <span className="text-sm text-slate-500">
        Razorpay Order ID
      </span>

      <span className="max-w-[230px] truncate text-right text-xs font-mono text-slate-700">
        {selectedTransaction.razorpay_order_id || "—"}
      </span>

    </div>


    {/* Razorpay Payment ID */}
    <div className="flex justify-between gap-4 px-4 py-3">

      <span className="text-sm text-slate-500">
        Razorpay Payment ID
      </span>

      <span className="max-w-[230px] truncate text-right text-xs font-mono text-slate-700">
        {selectedTransaction.razorpay_payment_id || "—"}
      </span>

    </div>


    {/* Analyst Review */}
    <div className="flex justify-between gap-4 px-4 py-3">

      <span className="text-sm text-slate-500">
        Analyst Review
      </span>

      <span
        className={`text-sm font-semibold ${
          selectedTransaction.review_status === "REVIEWED"
            ? "text-emerald-600"
            : selectedTransaction.decision === "REVIEW"
            ? "text-amber-600"
            : "text-slate-500"
        }`}
      >
        {selectedTransaction.review_status === "REVIEWED"
          ? "✓ REVIEWED"
          : selectedTransaction.decision === "REVIEW"
          ? "PENDING REVIEW"
          : "NOT REQUIRED"}
      </span>

    </div>


    {/* Reviewed At */}
    {selectedTransaction.reviewed_at && (
      <div className="flex justify-between gap-4 px-4 py-3">

        <span className="text-sm text-slate-500">
          Reviewed At
        </span>

        <span className="text-xs text-slate-600">
          {new Date(
            selectedTransaction.reviewed_at
          ).toLocaleString()}
        </span>

      </div>
    )}

  </div>


  {/* Server-side verification confirmation */}
  {selectedTransaction.payment_verified && (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">

      <p className="text-xs font-semibold text-emerald-700">
        ✓ Server-side payment verification successful
      </p>

      <p className="mt-1 text-xs leading-5 text-emerald-600">
        Razorpay payment was cryptographically verified
        and linked to this MerchantShield transaction.
      </p>

    </div>
  )}


  {/* Pending manual review message */}
  {selectedTransaction.decision === "REVIEW" &&
    selectedTransaction.review_status !== "REVIEWED" && (
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">

        <p className="text-xs font-semibold text-amber-700">
          ⚠ Manual review required
        </p>

        <p className="mt-1 text-xs leading-5 text-amber-600">
          This transaction was flagged by the AI risk
          engine and requires analyst review before payment.
        </p>

      </div>
    )}


  {/* Review completed message */}
  {selectedTransaction.review_status === "REVIEWED" && (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">

      <p className="text-xs font-semibold text-emerald-700">
        ✓ Analyst review completed
      </p>

      <p className="mt-1 text-xs leading-5 text-emerald-600">
        This REVIEW transaction has been manually reviewed
        and recorded in the audit trail.
      </p>

    </div>
  )}

</div>

              {/* Risk Factors */}

                <div>

                <div className="flex items-center justify-between">

                    <div>

                    <h4 className="font-semibold text-slate-900">
                        Top Risk Factors
                    </h4>

                    <p className="mt-1 text-xs text-slate-400">
                        Model attribution for this transaction
                    </p>

                    </div>

                </div>


                <div className="mt-3 space-y-2">

                    {selectedTransaction.top_risk_factors?.length > 0 ? (

                    selectedTransaction.top_risk_factors.map(
                        (factor, index) => (

                        <div
                            key={`${factor.feature}-${index}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >

                            <div className="flex items-center justify-between">

                            <span className="text-sm font-semibold text-slate-800">
                                {factor.feature}
                            </span>

                            <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-500">
                                SHAP:{" "}
                                {Number(
                                factor.shap_value || 0
                                ).toFixed(4)}
                            </span>

                            </div>


                            <p className="mt-2 text-xs leading-5 text-slate-500">
                            {factor.description}
                            </p>


                            {factor.direction &&
                            factor.direction !== "unknown" && (

                                <p className="mt-2 text-xs font-medium text-slate-600">

                                Direction:{" "}

                                <span className="font-semibold">
                                    {factor.direction}
                                </span>

                                </p>

                            )}

                        </div>

                        )
                    )

                    ) : (

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                        <p className="text-sm text-slate-400">
                        No risk-factor attribution is available
                        for this transaction.
                        </p>

                    </div>

                    )}

                </div>

                </div>


              {/* Risk Level */}

              <div>

                <div className="flex items-center justify-between">

                  <h4 className="font-semibold text-slate-900">
                    Risk Level
                  </h4>

                  <span className="text-sm font-bold text-slate-700">

                    {Number(
                      selectedTransaction.risk_score
                    ).toFixed(0)}

                    /100

                  </span>

                </div>


                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className={`h-full rounded-full ${
                      Number(
                        selectedTransaction.risk_score
                      ) >= 80
                        ? "bg-red-500"
                        : Number(
                            selectedTransaction.risk_score
                          ) >= 50
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        Number(
                          selectedTransaction.risk_score
                        ),
                        100
                      )}%`,
                    }}
                  />

                </div>


                <div className="mt-2 flex justify-between text-[10px] text-slate-400">

                  <span>Low</span>

                  <span>Medium</span>

                  <span>High</span>

                </div>

              </div>

              {/* Model Features */}

<div>

  <div className="flex items-center justify-between">

    <div>

      <h4 className="font-semibold text-slate-900">
        Model Features
      </h4>

      <p className="mt-1 text-xs text-slate-400">
        PCA-transformed inputs supplied to the fraud model
      </p>

    </div>

    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
      V1 — V28
    </span>

  </div>


  {selectedTransaction.features ? (

    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">

      {Object.entries(
        selectedTransaction.features
      )
        .filter(
          ([key]) =>
            key.startsWith("V")
        )
        .map(
          ([key, value]) => (

            <div
              key={key}
              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
            >

              <p className="text-[10px] font-semibold uppercase text-slate-400">
                {key}
              </p>

              <p className="mt-1 font-mono text-xs font-medium text-slate-700">
                {Number(value).toFixed(6)}
              </p>

            </div>

          )
        )}

    </div>

  ) : (

    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

      <p className="text-sm text-slate-400">
        Feature values are not available for this
        transaction.
      </p>

    </div>

  )}

</div>


{/* Model Explanation */}

<div className="space-y-6">

  {/* Top Risk Factors */}

  <div>

    <h4 className="font-semibold text-slate-900">
      Top Risk Factors
    </h4>

    <p className="mt-1 text-xs text-slate-400">
      Features associated with this model prediction.
    </p>


    <div className="mt-3 space-y-2">

      {selectedTransaction.top_risk_factors &&
      selectedTransaction.top_risk_factors.length > 0 ? (

        selectedTransaction.top_risk_factors.map(
          (factor, index) => (

            <div
              key={`${factor.feature}-${index}`}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >

              <div className="flex items-center justify-between">

                <div>

                  <p className="font-semibold text-slate-800">
                    {factor.feature}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {factor.description}
                  </p>

                </div>


                <div className="text-right">

                  <p
                    className={`font-bold ${
                      Number(factor.shap_value) > 0
                        ? "text-red-600"
                        : Number(factor.shap_value) < 0
                        ? "text-emerald-600"
                        : "text-slate-400"
                    }`}
                  >
                    {Number(
                      factor.shap_value
                    ).toFixed(4)}
                  </p>

                  <p className="text-[10px] uppercase text-slate-400">
                    {factor.direction || "unknown"}
                  </p>

                </div>

              </div>

            </div>

          )
        )

      ) : (

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

          <p className="text-xs text-slate-500">
            No feature-level explanation is available
            for this prediction.
          </p>

        </div>

      )}

    </div>

  </div>


  {/* Model Inputs */}

  <div>

    <h4 className="font-semibold text-slate-900">
      Model Inputs
    </h4>

    <p className="mt-1 text-xs text-slate-400">
      Values supplied to the fraud detection model.
    </p>


    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">

      {selectedTransaction.features &&
        Object.entries(
          selectedTransaction.features
        ).map(([feature, value]) => (

          <div
            key={feature}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >

            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {feature}
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-800">
              {feature === "Amount"
                ? `₹${Number(value).toLocaleString("en-IN")}`
                : Number(value).toFixed(6)}
            </p>

          </div>

        ))}

    </div>

  </div>


  {/* Disclaimer */}

  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">

    <p className="text-xs leading-5 text-blue-700">

      Model explanations describe how the supplied
      features contributed to the prediction. They do
      not establish that a transaction is fraudulent.

    </p>

  </div>

</div>


              {/* Actions */}

              <div>

                <h4 className="font-semibold text-slate-900">
                  Investigation
                </h4>


                <div className="mt-3 grid grid-cols-2 gap-3">

                  <button
                    onClick={() =>
                      setSelectedTransaction(null)
                    }
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>


                  <button
                    onClick={markReviewed}
                    disabled={
                      selectedTransaction.decision !== "REVIEW" ||
                      selectedTransaction.review_status === "REVIEWED"
                    }
                    className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedTransaction.review_status === "REVIEWED"
                      ? "✓ Reviewed"
                      : "Mark Reviewed"}
                  </button>

                </div>

              </div>


            </div>

          </div>

        </div>

      )}


    </div>
  );
}

export default Transactions;

