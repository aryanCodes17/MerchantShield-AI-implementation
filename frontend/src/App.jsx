import { useState } from "react";

import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import TransactionScoring from "./pages/TransactionScoring";
import Transactions from "./pages/Transactions";
import RiskAlerts from "./pages/RiskAlerts";
import ModelLab from "./pages/ModelLab";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";


function App() {

  const [activePage, setActivePage] = useState("Overview");

  return (
    <div className="min-h-screen bg-slate-100">

      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />


      <main className="ml-64 min-h-screen">

        {/* Top bar */}

        <div className="border-b border-slate-200 bg-white px-8 py-4">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-xs text-slate-400">
                MERCHANTSHIELD AI
              </p>

              <p className="text-sm font-medium text-slate-700">
                Risk Management Platform
              </p>

            </div>


            <div className="flex items-center gap-3">

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">

                <span className="h-2 w-2 rounded-full bg-emerald-500" />

                <span className="text-xs font-medium text-slate-600">
                  API Operational
                </span>

              </div>


              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                A
              </div>

            </div>

          </div>

        </div>


        {/* Page content */}

        <div className="p-8">

          {activePage === "Overview" && (
            <Overview />
          )}


          {activePage === "Transaction Scoring" && (
            <TransactionScoring />
          )}


          {activePage === "Transactions" && (
            <Transactions />
          )}


          {activePage === "Risk Alerts" && (
            <RiskAlerts />
          )}


          {activePage === "Model Lab" && (
            <ModelLab />
          )}


          {activePage === "Analytics" && (
            <Analytics />
          )}


          {activePage === "Settings" && (
            <Settings />
          )}


          {activePage !== "Overview" &&
           activePage !== "Transaction Scoring" &&
           activePage !== "Transactions" &&
           activePage !== "Risk Alerts" &&
           activePage !== "Model Lab" &&
           activePage !== "Analytics" &&
           activePage !== "Settings" && (

            <div className="flex min-h-[500px] items-center justify-center">

              <div className="text-center">

                <p className="text-sm font-medium text-blue-600">
                  MERCHANTSHIELD AI
                </p>

                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {activePage}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  This module will be connected next.
                </p>

              </div>

            </div>

          )}

        </div>

      </main>

    </div>
  );
}

export default App;


