import { useState } from "react";
import { API_URL } from "../config";

import {
  ShieldCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Zap,
  DollarSign,
  Activity,
} from "lucide-react";


/*
|--------------------------------------------------------------------------
| Model features
|--------------------------------------------------------------------------
*/

const featureNames = Array.from(
  { length: 28 },
  (_, i) => `V${i + 1}`
);


/*
|--------------------------------------------------------------------------
| Demo fraud transaction
|--------------------------------------------------------------------------
*/

const DEMO_FRAUD = {
  amount: 0,

  features: {
    V1: -2.312227,
    V2: 1.951992,
    V3: -1.609851,
    V4: 3.997906,
    V5: -0.522188,
    V6: -1.426545,
    V7: -2.537387,
    V8: 1.391657,
    V9: -2.770089,
    V10: -2.772272,
    V11: 3.202033,
    V12: -2.899907,
    V13: -0.595222,
    V14: -4.289254,
    V15: 0.389724,
    V16: -1.140747,
    V17: -2.830056,
    V18: -0.016822,
    V19: 0.416956,
    V20: 0.126911,
    V21: 0.517232,
    V22: -0.035049,
    V23: -0.465211,
    V24: 0.320198,
    V25: 0.044519,
    V26: 0.17784,
    V27: 0.261145,
    V28: -0.143276,
  },
};


/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

function TransactionScoring() {

  const [amount, setAmount] = useState(100);

  const [features, setFeatures] = useState(
    Object.fromEntries(
      featureNames.map((name) => [name, 0])
    )
  );

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Razorpay state
  |--------------------------------------------------------------------------
  */

  const [payment, setPayment] = useState(null);

  const [paymentLoading, setPaymentLoading] =
    useState(false);


  /*
  |--------------------------------------------------------------------------
  | Feature updates
  |--------------------------------------------------------------------------
  */

  function updateFeature(name, value) {

    setFeatures((previous) => ({
      ...previous,
      [name]: value,
    }));

  }


  /*
  |--------------------------------------------------------------------------
  | Load fraud example
  |--------------------------------------------------------------------------
  */

  function loadDemoFraud() {

    setAmount(DEMO_FRAUD.amount);

    setFeatures({
      ...DEMO_FRAUD.features,
    });

    setResult(null);

    setPayment(null);

    setError("");

  }


  /*
  |--------------------------------------------------------------------------
  | Load a real REVIEW transaction from history
  |--------------------------------------------------------------------------
  |
  | The calibrated model does not guarantee that interpolating between
  | APPROVE and BLOCK examples will land inside the REVIEW band. Instead,
  | use a transaction that the real risk engine has already scored as REVIEW.
  | This keeps the demo honest and avoids hard-coding a fake prediction.
  */

  async function loadDemoReview() {
  setError("");
  setResult(null);
  setPayment(null);
  setLoading(true);

  try {
    const response = await fetch(`${API_URL}/demo/review`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.detail || "Unable to generate a REVIEW transaction."
      );
    }

    const reviewFeatures = Object.fromEntries(
      featureNames.map((name) => [
        name,
        Number(data.features?.[name] ?? 0),
      ])
    );

    setAmount(Number(data.amount || data.transaction_amount || 0));
    setFeatures(reviewFeatures);
    setResult(data);
    setPayment(null);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to generate a REVIEW transaction."
    );
  } finally {
    setLoading(false);
  }
}

  /*
  |--------------------------------------------------------------------------
  | Load normal transaction
  |--------------------------------------------------------------------------
  */

  function loadNormalTransaction() {

    setAmount(100);

    setFeatures(
      Object.fromEntries(
        featureNames.map((name) => [
          name,
          0,
        ])
      )
    );

    setResult(null);

    setPayment(null);

    setError("");

  }


  /*
  |--------------------------------------------------------------------------
  | Reset
  |--------------------------------------------------------------------------
  */

  function resetForm() {

    setAmount(100);

    setFeatures(
      Object.fromEntries(
        featureNames.map((name) => [
          name,
          0,
        ])
      )
    );

    setResult(null);

    setPayment(null);

    setError("");

  }


  /*
  |--------------------------------------------------------------------------
  | Score transaction
  |--------------------------------------------------------------------------
  */

  async function scoreTransaction() {

    setLoading(true);

    setError("");

    setResult(null);

    try {

      const response = await fetch(
        `${API_URL}/predict`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({

            amount: Number(amount),

            features: {
              ...Object.fromEntries(
                Object.entries(features).map(
                  ([key, value]) => [
                    key,
                    Number(value),
                  ]
                )
              ),

              Amount: Number(amount),

            },

          }),
        }
      );


      if (!response.ok) {

        const data =
          await response.json().catch(
            () => null
          );

        throw new Error(
          data?.detail ||
          "Prediction failed"
        );

      }


      const data =
        await response.json();

      setResult(data);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Prediction failed"
      );

    } finally {

      setLoading(false);

    }

  }


  /*
  |--------------------------------------------------------------------------
  | Razorpay — Create order
  |--------------------------------------------------------------------------
  */

  async function startRazorpayPayment() {

    const paymentAmount =
      Number(amount);


    if (
      !Number.isFinite(paymentAmount) ||
      paymentAmount <= 0
    ) {

      setError(
        "Enter a valid payment amount greater than ₹0."
      );

      return;

    }


    setPaymentLoading(true);

    setError("");

    setPayment(null);


    try {

      /*
      |--------------------------------------------------------------------------
      | Create Razorpay order through FastAPI
      |--------------------------------------------------------------------------
      */

      const response = await fetch(
        `${API_URL}/razorpay/create-order`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            amount: paymentAmount,
            transaction_id: result.transaction_id,
          }),
        }
      );


      if (!response.ok) {

        const data =
          await response.json().catch(
            () => null
          );

        throw new Error(
          data?.detail ||
          "Unable to create Razorpay order"
        );

      }


      const order =
        await response.json();


      /*
      |--------------------------------------------------------------------------
      | Make sure Razorpay Checkout loaded
      |--------------------------------------------------------------------------
      */

      if (
        typeof window.Razorpay !==
        "function"
      ) {

        throw new Error(
          "Razorpay Checkout failed to load. Check frontend/index.html."
        );

      }


      /*
      |--------------------------------------------------------------------------
      | Razorpay Checkout configuration
      |--------------------------------------------------------------------------
      */

      const options = {

        key: order.key_id,

        amount: order.amount,

        currency: order.currency,

        name: "MerchantShield AI",

        description:
          "MerchantShield AI Risk Assessment",

        order_id: order.order_id,


        /*
        |--------------------------------------------------------------------------
        | Successful Checkout callback
        |--------------------------------------------------------------------------
        */

        handler: async function (
          razorpayResponse
        ) {

          await verifyRazorpayPayment(
            razorpayResponse
          );

        },


        /*
        |--------------------------------------------------------------------------
        | Checkout closed
        |--------------------------------------------------------------------------
        */

        modal: {

          ondismiss: function () {

            setPaymentLoading(false);

          },

        },


        /*
        |--------------------------------------------------------------------------
        | Checkout appearance
        |--------------------------------------------------------------------------
        */

        theme: {
          color: "#2563eb",
        },

      };


      /*
      |--------------------------------------------------------------------------
      | Open Razorpay Checkout
      |--------------------------------------------------------------------------
      */

      const razorpay =
        new window.Razorpay(options);


      razorpay.open();

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start Razorpay payment"
      );

      setPaymentLoading(false);

    }

  }


  /*
  |--------------------------------------------------------------------------
  | Razorpay — Verify payment
  |--------------------------------------------------------------------------
  */

  async function verifyRazorpayPayment(
    razorpayResponse
  ) {

    try {

      const response = await fetch(
        `${API_URL}/razorpay/verify`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            
            transaction_id: result.transaction_id,

            razorpay_payment_id:
              razorpayResponse.razorpay_payment_id,

            razorpay_order_id:
              razorpayResponse.razorpay_order_id,

            razorpay_signature:
              razorpayResponse.razorpay_signature,

          }),

        }
      );


      if (!response.ok) {

        const data =
          await response.json().catch(
            () => null
          );

        throw new Error(
          data?.detail ||
          "Razorpay payment verification failed"
        );

      }


      const data =
        await response.json();


      setPayment(data);


    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Razorpay payment verification failed"
      );

    } finally {

      setPaymentLoading(false);

    }

  }


  /*
  |--------------------------------------------------------------------------
  | Decision styling
  |--------------------------------------------------------------------------
  */

  function decisionStyle(decision) {

    if (decision === "BLOCK") {

      return {

        container:
          "border-red-200 bg-red-50",

        text:
          "text-red-700",

        icon:
          <XCircle size={28} />,

        label:
          "BLOCK TRANSACTION",

      };

    }


    if (decision === "REVIEW") {

      return {

        container:
          "border-amber-200 bg-amber-50",

        text:
          "text-amber-700",

        icon:
          <AlertTriangle size={28} />,

        label:
          "MANUAL REVIEW",

      };

    }


    return {

      container:
        "border-emerald-200 bg-emerald-50",

      text:
        "text-emerald-700",

      icon:
        <CheckCircle2 size={28} />,

      label:
        "APPROVE TRANSACTION",

    };

  }


  /*
  |--------------------------------------------------------------------------
  | Derived result values
  |--------------------------------------------------------------------------
  */

  const probability =
    result
      ? Number(
          result.fraud_probability || 0
        )
      : 0;


  const riskScore =
    result
      ? Number(
          result.risk_score || 0
        )
      : 0;


  const probabilityPercent =
    Math.min(
      100,
      Math.max(
        0,
        probability * 100
      )
    );


  const decision =
    result?.decision || null;


  const decisionInfo =
    decision
      ? decisionStyle(decision)
      : null;


  /*
  |--------------------------------------------------------------------------
  | JSX
  |--------------------------------------------------------------------------
  */

  return (

    <div className="space-y-6">


      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <div className="rounded-lg bg-blue-600 p-2">

              <ShieldCheck
                size={20}
                className="text-white"
              />

            </div>

            <span className="text-sm font-semibold tracking-wide text-blue-600">
              AI RISK ENGINE
            </span>

          </div>


          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Transaction Scoring
          </h2>


          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Evaluate a transaction using the MerchantShield
            fraud-risk model and receive an explainable
            risk decision.
          </p>

        </div>


        <div className="flex flex-wrap gap-2">

          <button
            onClick={loadNormalTransaction}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >

            <CheckCircle2 size={16} />

            Normal Example

          </button>


          <button
            onClick={loadDemoFraud}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
          >

            <Zap size={16} />

            Fraud Example

          </button>


          <button
            onClick={loadDemoReview}
            type="button"
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AlertTriangle size={16} />
            Demo Review
          </button>


          <button
            onClick={resetForm}
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >

            <RotateCcw size={16} />

            Reset

          </button>

        </div>

      </div>


      {/* ========================================================= */}
      {/* MAIN GRID */}
      {/* ========================================================= */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">


        {/* ======================================================= */}
        {/* INPUT PANEL */}
        {/* ======================================================= */}

        <div className="xl:col-span-3">

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">


            {/* Input header */}

            <div className="border-b border-slate-100 p-6">

              <div className="flex items-center gap-3">

                <div className="rounded-lg bg-blue-50 p-2.5">

                  <Activity
                    size={20}
                    className="text-blue-600"
                  />

                </div>


                <div>

                  <h3 className="font-semibold text-slate-900">
                    Transaction Features
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-400">
                    Enter the features required by the model.
                  </p>

                </div>

              </div>

            </div>


            <div className="p-6">


              {/* ================================================= */}
              {/* AMOUNT */}
              {/* ================================================= */}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                <div className="mb-3 flex items-center gap-2">

                  <DollarSign
                    size={17}
                    className="text-slate-500"
                  />

                  <label className="text-sm font-semibold text-slate-700">
                    Transaction Amount
                  </label>

                </div>


                <div className="relative">

                  <span className="absolute left-3 top-2.5 text-sm font-medium text-slate-400">
                    ₹
                  </span>


                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-8 pr-3 text-sm font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

              </div>


              {/* ================================================= */}
              {/* RAZORPAY PAYMENT */}
              {/* ================================================= */}

              <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-5">

                <div className="flex items-start gap-3">

                  <div className="rounded-lg bg-blue-100 p-2">

                    <DollarSign
                      size={20}
                      className="text-blue-600"
                    />

                  </div>


                  <div className="flex-1">

                    <h3 className="font-semibold text-slate-900">
                      Razorpay Test Payment
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Create a Razorpay Test Mode payment
                      for this transaction.
                    </p>

                  </div>

                </div>

                <button
                type="button"
                onClick={startRazorpayPayment}
                disabled={
                    paymentLoading ||
                    !amount ||
                    Number(amount) <= 0 ||
                    !result ||
                    result.decision !== "APPROVE"
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                {!result ? (
                    <>
                    <Zap size={17} />
                    Analyze Transaction First
                    </>
                ) : result.decision === "BLOCK" ? (
                    <>
                    <Zap size={17} />
                    Payment Blocked by Risk Engine
                    </>
                ) : result.decision === "REVIEW" ? (
                    <>
                    <Zap size={17} />
                    Payment Requires Review
                    </>
                ) : paymentLoading ? (
                    <>
                    <Loader2
                        size={17}
                        className="animate-spin"
                    />
                    Opening Razorpay...
                    </>
                ) : (
                    <>
                    <Zap size={17} />
                    Pay ₹
                    {Number(amount || 0).toLocaleString("en-IN")}
                    {" "}with Razorpay
                    </>
                )}
                </button>
                
                {/* AI Risk Decision Message */}

                {result && (
                    <div
                        className={`mt-4 rounded-lg border p-3 text-sm font-medium ${
                        result.decision === "APPROVE"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : result.decision === "REVIEW"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                    >
                        {result.decision === "APPROVE" &&
                        "✓ Low-risk transaction — payment can proceed."}

                        {result.decision === "REVIEW" &&
                        "⚠ Transaction requires manual review before payment."}

                        {result.decision === "BLOCK" &&
                        "✕ High-risk transaction — payment has been blocked."}
                    </div>
                    )}


                {/* Verified payment */}

                {payment && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2">
                    <CheckCircle2
                        size={18}
                        className="text-emerald-600"
                    />

                    <p className="font-semibold text-emerald-800">
                        Razorpay payment verified
                    </p>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <p>
                        <span className="font-semibold">
                        Transaction:
                        </span>{" "}
                        {payment.transaction_id || result?.transaction_id || "—"}
                    </p>

                    <p>
                        <span className="font-semibold">
                        Decision:
                        </span>{" "}
                        {result?.decision || "—"}
                    </p>

                    <p>
                        <span className="font-semibold">
                        Risk Score:
                        </span>{" "}
                        {result?.risk_score ?? "—"}
                    </p>

                    <p>
                        <span className="font-semibold">
                        Fraud Probability:
                        </span>{" "}
                        {result?.fraud_probability != null
                        ? `${(Number(result.fraud_probability) * 100).toFixed(2)}%`
                        : "—"}
                    </p>

                    <p>
                        <span className="font-semibold">
                        Amount:
                        </span>{" "}
                        ₹{Number(amount || 0).toLocaleString("en-IN")}
                    </p>

                    <p>
                        <span className="font-semibold">
                        Payment Status:
                        </span>{" "}
                        {payment.payment_status || "VERIFIED"}
                    </p>

                    <p>
                        <span className="font-semibold">
                        Order:
                        </span>{" "}
                        {payment.order_id || "—"}
                    </p>

                    <p>
                        <span className="font-semibold">
                        Payment:
                        </span>{" "}
                        {payment.payment_id || "—"}
                    </p>
                    </div>

                    <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                    <p className="text-xs font-semibold text-emerald-700">
                        ✓ Server-side payment verification successful
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        Razorpay signature verified and payment linked
                        to the MerchantShield transaction.
                    </p>
                    </div>
                </div>
                )}
                </div>


              {/* ================================================= */}
              {/* DEMO TRANSACTION CONTEXT */}
              {/* ================================================= */}

              <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">

                <div className="flex items-start gap-3">

                  <div className="mt-0.5 rounded-lg bg-white p-2">

                    <ShieldCheck
                      size={17}
                      className="text-blue-600"
                    />

                  </div>


                  <div>

                    <p className="text-sm font-semibold text-blue-900">
                      Model Input Mode
                    </p>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      MerchantShield's current model was trained
                      on anonymized PCA features (V1–V28). These
                      fields represent transformed transaction
                      signals used internally by the fraud model.
                    </p>

                  </div>

                </div>

              </div>


              {/* ================================================= */}
              {/* PCA FEATURES */}
              {/* ================================================= */}

              <div className="mt-6">

                <div className="mb-4 flex items-end justify-between">

                  <div>

                    <h4 className="text-sm font-semibold text-slate-800">
                      PCA Features
                    </h4>

                    <p className="mt-1 text-xs text-slate-400">
                      28 anonymized principal components
                    </p>

                  </div>


                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    V1 — V28
                  </span>

                </div>


                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">

                  {featureNames.map(
                    (name) => (

                      <div key={name}>

                        <label className="mb-1.5 block text-xs font-medium text-slate-500">
                          {name}
                        </label>


                        <input
                          type="number"
                          step="0.000001"
                          value={features[name]}
                          onChange={(e) =>
                            updateFeature(
                              name,
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                        />

                      </div>

                    )
                  )}

                </div>

              </div>


              {/* ================================================= */}
              {/* ANALYZE BUTTON */}
              {/* ================================================= */}

              <button
                onClick={scoreTransaction}
                disabled={loading}
                type="button"
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (

                  <>

                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Analyzing Transaction...

                  </>

                ) : (

                  <>

                    <ShieldCheck size={18} />

                    Analyze Transaction

                  </>

                )}

              </button>


              {/* ================================================= */}
              {/* ERROR */}
              {/* ================================================= */}

              {error && (

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">

                  <div className="flex items-start gap-3">

                    <AlertTriangle
                      size={19}
                      className="mt-0.5 shrink-0 text-red-600"
                    />


                    <div>

                      <p className="text-sm font-semibold text-red-700">
                        Action Failed
                      </p>

                      <p className="mt-1 text-xs leading-5 text-red-600">
                        {error}
                      </p>

                    </div>

                  </div>

                </div>

              )}

            </div>

          </div>

        </div>


        {/* ======================================================= */}
        {/* RESULT PANEL */}
        {/* ======================================================= */}

        <div className="xl:col-span-2">


          {/* Awaiting analysis */}

          {!result && !error && (

            <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8">

              <div className="max-w-xs text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

                  <ShieldCheck
                    size={30}
                    className="text-slate-400"
                  />

                </div>


                <h3 className="mt-5 text-lg font-semibold text-slate-700">
                  Awaiting Analysis
                </h3>


                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Enter transaction features or load the
                  demo fraud transaction, then run the
                  risk engine.
                </p>

              </div>

            </div>

          )}


          {/* ===================================================== */}
          {/* RESULT */}
          {/* ===================================================== */}

          {result && decisionInfo && (

            <div className="space-y-4">


              {/* Main decision */}

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">


                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Risk Assessment
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Model decision for this transaction
                    </p>

                  </div>


                  <div className="rounded-lg bg-slate-50 p-2">

                    <ShieldCheck
                      size={20}
                      className="text-slate-500"
                    />

                  </div>

                </div>


                {/* Risk score */}

                <div className="mt-7 text-center">

                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Risk Score
                  </p>


                  <div className="mt-1">

                    <span className="text-6xl font-bold tracking-tight text-slate-900">
                      {riskScore}
                    </span>

                    <span className="ml-1 text-lg text-slate-400">
                      /100
                    </span>

                  </div>

                </div>


                {/* Risk bar */}

                <div className="mt-6">

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            riskScore
                          )
                        )}%`,
                      }}
                    />

                  </div>


                  <div className="mt-2 flex justify-between text-[10px] text-slate-400">

                    <span>
                      LOW
                    </span>

                    <span>
                      MEDIUM
                    </span>

                    <span>
                      HIGH
                    </span>

                  </div>

                </div>


                {/* Decision */}

                <div
                  className={`mt-6 flex items-center justify-center gap-3 rounded-xl border p-4 ${decisionInfo.container} ${decisionInfo.text}`}
                >

                  {decisionInfo.icon}

                  <div>

                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                      Decision
                    </p>

                    <p className="text-lg font-bold">
                      {decisionInfo.label}
                    </p>

                  </div>

                </div>


                {/* Metrics */}

                <div className="mt-5 grid grid-cols-2 gap-3">

                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                    <p className="text-xs text-slate-400">
                      Fraud Probability
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {probabilityPercent.toFixed(2)}%
                    </p>

                  </div>


                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">

                    <p className="text-xs text-slate-400">
                      Expected Loss
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">
                      ₹
                      {Number(
                        result.expected_loss || 0
                      ).toFixed(2)}
                    </p>

                  </div>

                </div>

              </div>


              {/* Probability detail */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-center justify-between">

                  <div>

                    <h3 className="font-semibold text-slate-900">
                      Fraud Probability
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Model-estimated probability
                    </p>

                  </div>


                  <span className="text-lg font-bold text-slate-900">
                    {probabilityPercent.toFixed(2)}%
                  </span>

                </div>


                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">

                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-500"
                    style={{
                      width: `${probabilityPercent}%`,
                    }}
                  />

                </div>


                <div className="mt-3 flex justify-between text-[10px] text-slate-400">

                  <span>
                    0%
                  </span>

                  <span>
                    50%
                  </span>

                  <span>
                    100%
                  </span>

                </div>

              </div>


              {/* Risk factors */}

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                <div className="flex items-start justify-between">

                  <div>

                    <h3 className="font-semibold text-slate-900">
                      Top Risk Factors
                    </h3>

                    <p className="mt-1 text-xs text-slate-400">
                      Model attribution, not proof of fraud
                    </p>

                  </div>


                  <Activity
                    size={18}
                    className="text-slate-400"
                  />

                </div>


                <div className="mt-4 space-y-3">

                  {result.top_risk_factors?.length ? (

                    result.top_risk_factors.map(
                      (factor, index) => (

                        <div
                          key={`${factor.feature}-${index}`}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >

                          <div className="flex items-center justify-between">

                            <span className="text-sm font-semibold text-slate-800">
                              {factor.feature}
                            </span>


                            <span className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-slate-400">
                              SHAP{" "}
                              {Number(
                                factor.shap_value
                              ).toFixed(4)}
                            </span>

                          </div>


                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            {factor.description}
                          </p>

                        </div>

                      )

                    )

                  ) : (

                    <p className="text-sm text-slate-400">
                      No risk factors were returned.
                    </p>

                  )}

                </div>

              </div>


              {/* Disclaimer */}

              {result.disclaimer && (

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                  <p className="text-xs leading-5 text-slate-500">
                    {result.disclaimer}
                  </p>

                </div>

              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );

}


export default TransactionScoring;

