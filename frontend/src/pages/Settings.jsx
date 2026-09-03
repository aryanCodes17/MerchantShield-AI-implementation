import { useEffect, useState } from "react";

import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  SlidersHorizontal,
  Bell,
  Info,
  RefreshCw,
  Loader2,
} from "lucide-react";

function Settings() {
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadModelInfo() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/model-info`
      );

      if (!response.ok) {
        throw new Error("Unable to load model configuration");
      }

      const data = await response.json();

      setModelInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModelInfo();
  }, []);

  const reviewThreshold =
    Number(modelInfo?.threshold_review ?? 0.15);

  const blockThreshold =
    Number(modelInfo?.threshold_block ?? 0.20);

  const calibrationMethod =
    modelInfo?.calibration_method ||
    modelInfo?.calibration ||
    "Isotonic";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="text-sm font-semibold tracking-wide text-blue-600">
          SYSTEM
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Settings
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure MerchantShield risk engine and application preferences.
        </p>
      </div>

      {loading && (
  <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
    <Loader2
      size={18}
      className="animate-spin text-blue-600"
    />

    <p className="text-sm text-blue-700">
      Loading current model configuration...
    </p>
  </div>
)}

{!loading && error && (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">

    <div className="flex items-center gap-3">
      <Info
        size={18}
        className="text-red-600"
      />

      <p className="text-sm text-red-700">
        {error}
      </p>
    </div>

    <button
      onClick={loadModelInfo}
      className="flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
    >
      <RefreshCw size={14} />
      Retry
    </button>

  </div>
)}


      {/* Model Configuration */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2">
              <SlidersHorizontal
                size={20}
                className="text-blue-600"
              />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Risk Engine Configuration
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Current production model settings
              </p>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Model
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              Random Forest
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Primary fraud detection model
            </p>
          </div>


          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Calibration
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {calibrationMethod}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Probability calibration method
            </p>
          </div>


          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Review Threshold
            </p>

            <p className="mt-2 font-semibold text-amber-600">
              {reviewThreshold.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Transactions at or above this probability require review
            </p>
          </div>


          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Block Threshold
            </p>

            <p className="mt-2 font-semibold text-red-600">
              {blockThreshold.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Transactions at or above this probability are blocked
            </p>
          </div>

        </div>
      </div>


      {/* Decision Policy */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">

            <div className="rounded-lg bg-emerald-50 p-2">
              <ShieldCheck
                size={20}
                className="text-emerald-600"
              />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Decision Policy
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                How model probabilities are converted into actions
              </p>
            </div>

          </div>
        </div>


        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-600">
              APPROVE
            </p>

            <p className="mt-2 text-lg font-bold text-emerald-700">
              &lt; {reviewThreshold.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-emerald-700">
              Low-risk transaction
            </p>
          </div>


          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase text-amber-600">
              REVIEW
            </p>

            <p className="mt-2 text-lg font-bold text-amber-700">
              {reviewThreshold.toFixed(2)} - &lt; {blockThreshold.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-amber-700">
              Manual investigation required
            </p>
          </div>


          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase text-red-600">
              BLOCK
            </p>

            <p className="mt-2 text-lg font-bold text-red-700">
              = {blockThreshold.toFixed(2)}
            </p>

            <p className="mt-1 text-xs text-red-700">
              High-risk transaction
            </p>
          </div>

        </div>
      </div>


      {/* Data & Notifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="rounded-lg bg-slate-100 p-2">
              <Database
                size={20}
                className="text-slate-600"
              />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Data Storage
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Application transaction storage
              </p>
            </div>

          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">

            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Database
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              SQLite
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Local transaction history
            </p>

          </div>

        </div>


        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center gap-3">

            <div className="rounded-lg bg-slate-100 p-2">
              <Bell
                size={20}
                className="text-slate-600"
              />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Notifications
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Alert configuration
              </p>
            </div>

          </div>

          <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">

            <div>
              <p className="text-sm font-semibold text-slate-800">
                Risk alerts
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Alerts are generated for risk scores = 50
              </p>
            </div>

            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Active
            </span>

          </div>

        </div>

      </div>


      {/* System Information */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center gap-3">

          <div className="rounded-lg bg-slate-100 p-2">
            <Info
              size={20}
              className="text-slate-600"
            />
          </div>

          <div>
            <h3 className="font-semibold text-slate-900">
              System Information
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              MerchantShield AI platform
            </p>
          </div>

        </div>


        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div>
            <p className="text-xs text-slate-400">
              API
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              FastAPI
            </p>
          </div>


          <div>
            <p className="text-xs text-slate-400">
              Frontend
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-800">
              React + Vite
            </p>
          </div>


          <div>
            <p className="text-xs text-slate-400">
              Status
            </p>

            <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Operational
            </p>
          </div>

        </div>

      </div>


      {/* Footer note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">

        <SettingsIcon
          size={18}
          className="mt-0.5 shrink-0 text-blue-600"
        />

        <p className="text-xs leading-5 text-blue-800">
          Risk thresholds are controlled by the trained model artifacts
          and should not be changed from the frontend without retraining
          and re-evaluating the model.
        </p>

      </div>

    </div>
  );
}

export default Settings;


