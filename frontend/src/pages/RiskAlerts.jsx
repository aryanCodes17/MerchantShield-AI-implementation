import {
  AlertTriangle,
  ShieldAlert,
  Clock,
  Search,
  RefreshCw,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";


function severityFromScore(score) {
  if (score >= 90) {
    return "CRITICAL";
  }

  if (score >= 80) {
    return "HIGH";
  }

  return "MEDIUM";
}


function severityStyle(severity) {
  if (severity === "CRITICAL") {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (severity === "HIGH") {
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}


function severityIcon(severity) {
  if (severity === "CRITICAL") {
    return (
      <div className="rounded-lg bg-red-100 p-2">
        <ShieldAlert
          size={19}
          className="text-red-600"
        />
      </div>
    );
  }

  if (severity === "HIGH") {
    return (
      <div className="rounded-lg bg-orange-100 p-2">
        <AlertTriangle
          size={19}
          className="text-orange-600"
        />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-amber-100 p-2">
      <AlertTriangle
        size={19}
        className="text-amber-600"
      />
    </div>
  );
}


function RiskAlerts() {

  const [transactions, setTransactions] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("ALL");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ---------------------------------------------
  // Load transactions from FastAPI
  // ---------------------------------------------

  async function loadTransactions() {

    setLoading(true);
    setError("");

    try {

      const response = await fetch(
        `${API_URL}/transactions`
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load risk data"
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
          : "Unable to load risk data"
      );

    } finally {

      setLoading(false);

    }
  }


  // ---------------------------------------------
  // Initial load
  // ---------------------------------------------

  useEffect(() => {
    loadTransactions();
  }, []);


  // ---------------------------------------------
  // Convert high-risk transactions into alerts
  // ---------------------------------------------

  const alerts = useMemo(() => {

    return transactions

      .filter(
        (transaction) =>
          Number(
            transaction.risk_score || 0
          ) >= 50
      )

      .map((transaction) => {

        const score =
          Number(
            transaction.risk_score || 0
          );


        const severity =
          severityFromScore(score);


        let reason =
          "Transaction requires investigation";


        if (score >= 90) {

          reason =
            "Extremely high model risk score";

        } else if (score >= 80) {

          reason =
            "High-risk transaction pattern";

        } else {

          reason =
            "Transaction requires manual review";

        }


        /*
         * Stable alert ID.
         *
         * It is based on the transaction ID,
         * not the current array position.
         */

        const transactionId =
          String(
            transaction.id || "UNKNOWN"
          );


        const alertId =
          `ALT-${transactionId.replace(
            /[^a-zA-Z0-9]/g,
            ""
          )}`;


        return {
          ...transaction,
          alertId,
          severity,
          reason,
        };

      })

      .sort(
        (a, b) =>
          Number(
            b.risk_score || 0
          ) -
          Number(
            a.risk_score || 0
          )
      );

  }, [transactions]);


  // ---------------------------------------------
  // Search + severity filter
  // ---------------------------------------------

  const filteredAlerts =
    useMemo(() => {

      const searchValue =
        search.trim().toLowerCase();


      return alerts.filter(
        (alert) => {

          const matchesSearch =
            !searchValue ||
            String(alert.id || "")
              .toLowerCase()
              .includes(searchValue) ||
            String(alert.alertId || "")
              .toLowerCase()
              .includes(searchValue) ||
            String(alert.decision || "")
              .toLowerCase()
              .includes(searchValue);


          const matchesFilter =
            filter === "ALL" ||
            alert.severity === filter;


          return (
            matchesSearch &&
            matchesFilter
          );

        }
      );

    }, [
      alerts,
      search,
      filter,
    ]);


  // ---------------------------------------------
  // Summary counts
  // ---------------------------------------------

  const criticalCount =
    alerts.filter(
      (alert) =>
        alert.severity === "CRITICAL"
    ).length;


  const highCount =
    alerts.filter(
      (alert) =>
        alert.severity === "HIGH"
    ).length;


  const mediumCount =
    alerts.filter(
      (alert) =>
        alert.severity === "MEDIUM"
    ).length;


  return (
    <div className="space-y-6">


      {/* --------------------------------------- */}
      {/* Header */}
      {/* --------------------------------------- */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>

          <p className="text-sm font-semibold tracking-wide text-blue-600">
            RISK OPERATIONS
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Risk Alerts
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Monitor transactions requiring investigation.
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
      {/* Summary cards */}
      {/* --------------------------------------- */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">


        {/* Critical */}

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                Critical
              </p>

              <p className="mt-2 text-2xl font-bold text-red-700">
                {criticalCount}
              </p>

            </div>

            <ShieldAlert
              size={24}
              className="text-red-500"
            />

          </div>

          <p className="mt-2 text-xs text-red-500">
            Risk score ≥ 90
          </p>

        </div>


        {/* High */}

        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                High Risk
              </p>

              <p className="mt-2 text-2xl font-bold text-orange-700">
                {highCount}
              </p>

            </div>

            <AlertTriangle
              size={24}
              className="text-orange-500"
            />

          </div>

          <p className="mt-2 text-xs text-orange-500">
            Risk score 80-89
          </p>

        </div>


        {/* Medium */}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500">
                Medium Risk
              </p>

              <p className="mt-2 text-2xl font-bold text-amber-700">
                {mediumCount}
              </p>

            </div>

            <Clock
              size={24}
              className="text-amber-500"
            />

          </div>

          <p className="mt-2 text-xs text-amber-500">
            Risk score 50-79
          </p>

        </div>


        {/* Total */}

        <div className="rounded-xl border border-slate-200 bg-white p-5">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total Alerts
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {alerts.length}
              </p>

            </div>

            <ShieldAlert
              size={24}
              className="text-slate-400"
            />

          </div>

          <p className="mt-2 text-xs text-slate-400">
            Derived from scored transactions
          </p>

        </div>

      </div>


      {/* --------------------------------------- */}
      {/* Main card */}
      {/* --------------------------------------- */}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">


        {/* Toolbar */}

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">


          {/* Search */}

          <div className="relative w-full lg:w-80">

            <Search
              size={17}
              className="absolute left-3 top-2.5 text-slate-400"
            />

            <input
              type="text"
              placeholder="Search transaction, alert or decision..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

          </div>


          {/* Filter */}

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
          >

            <option value="ALL">
              All Severity
            </option>

            <option value="CRITICAL">
              Critical
            </option>

            <option value="HIGH">
              High
            </option>

            <option value="MEDIUM">
              Medium
            </option>

          </select>

        </div>


        {/* ----------------------------------- */}
        {/* Loading */}
        {/* ----------------------------------- */}

        {loading && (

          <div className="flex min-h-[350px] items-center justify-center">

            <div className="text-center">

              <Loader2
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-3 text-sm text-slate-500">
                Loading risk alerts...
              </p>

            </div>

          </div>

        )}


        {/* ----------------------------------- */}
        {/* Error */}
        {/* ----------------------------------- */}

        {!loading && error && (

          <div className="flex min-h-[350px] items-center justify-center p-6">

            <div className="text-center">

              <AlertTriangle
                size={32}
                className="mx-auto text-red-500"
              />

              <h3 className="mt-3 font-semibold text-slate-800">
                Unable to load alerts
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


        {/* ----------------------------------- */}
        {/* No alerts */}
        {/* ----------------------------------- */}

        {!loading &&
          !error &&
          alerts.length === 0 && (

            <div className="flex min-h-[350px] items-center justify-center p-6">

              <div className="text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">

                  <ShieldAlert
                    size={22}
                    className="text-emerald-500"
                  />

                </div>

                <h3 className="mt-4 font-semibold text-slate-800">
                  No risk alerts
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  No scored transactions currently exceed
                  the alert threshold.
                </p>

              </div>

            </div>

          )}


        {/* ----------------------------------- */}
        {/* Search returned nothing */}
        {/* ----------------------------------- */}

        {!loading &&
          !error &&
          alerts.length > 0 &&
          filteredAlerts.length === 0 && (

            <div className="flex min-h-[300px] items-center justify-center p-6">

              <div className="text-center">

                <Search
                  size={30}
                  className="mx-auto text-slate-300"
                />

                <h3 className="mt-3 font-semibold text-slate-800">
                  No matching alerts
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Try changing the search or severity filter.
                </p>

              </div>

            </div>

          )}


        {/* ----------------------------------- */}
        {/* Alerts */}
        {/* ----------------------------------- */}

        {!loading &&
          !error &&
          filteredAlerts.length > 0 && (

            <div className="divide-y divide-slate-100">

              {filteredAlerts.map(
                (alert) => (

                  <div
                    key={alert.alertId}
                    className="p-5 transition hover:bg-slate-50"
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">


                      {/* Left */}

                      <div className="flex items-start gap-4">

                        {severityIcon(
                          alert.severity
                        )}


                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-semibold text-slate-900">
                              {alert.alertId}
                            </h3>


                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${severityStyle(
                                alert.severity
                              )}`}
                            >
                              {alert.severity}
                            </span>

                          </div>


                          <p className="mt-1 text-sm text-slate-500">
                            Transaction{" "}
                            <span className="font-medium text-slate-700">
                              {alert.id}
                            </span>
                          </p>


                          <p className="mt-2 text-sm text-slate-600">
                            {alert.reason}
                          </p>

                        </div>

                      </div>


                      {/* Right */}

                      <div className="flex flex-wrap items-center gap-6 lg:justify-end">


                        {/* Amount */}

                        <div>

                          <p className="text-xs text-slate-400">
                            Amount
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">

                            ₹
                            {Number(
                              alert.amount || 0
                            ).toLocaleString(
                              "en-IN",
                              {
                                maximumFractionDigits: 2,
                              }
                            )}

                          </p>

                        </div>


                        {/* Risk */}

                        <div>

                          <p className="text-xs text-slate-400">
                            Risk Score
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">

                            {Number(
                              alert.risk_score || 0
                            ).toFixed(0)}

                            /100

                          </p>

                        </div>


                        {/* Decision */}

                        <div>

                          <p className="text-xs text-slate-400">
                            Decision
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {alert.decision}
                          </p>

                        </div>


                        {/* Timestamp */}

                        <div>

                          <p className="text-xs text-slate-400">
                            Time
                          </p>

                          <p className="mt-1 text-sm text-slate-600">

                            {alert.timestamp
                              ? new Date(
                                  alert.timestamp
                                ).toLocaleString()
                              : "—"}

                          </p>

                        </div>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

      </div>


      {/* --------------------------------------- */}
      {/* Footer */}
      {/* --------------------------------------- */}

      {!loading &&
        !error &&
        alerts.length > 0 && (

          <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">

            <span>
              Showing {filteredAlerts.length} of{" "}
              {alerts.length} alerts
            </span>

            <span>
              Alert threshold: risk score ≥ 50
            </span>

          </div>

        )}

    </div>
  );
}


export default RiskAlerts;

