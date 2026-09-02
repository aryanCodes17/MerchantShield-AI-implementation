import {
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  AlertTriangle,
  BarChart3,
  FlaskConical,
  Settings,
} from "lucide-react";

const navigation = [
  {
    name: "Overview",
    icon: LayoutDashboard,
  },
  {
    name: "Transaction Scoring",
    icon: ShieldCheck,
  },
  {
    name: "Transactions",
    icon: Receipt,
  },
  {
    name: "Risk Alerts",
    icon: AlertTriangle,
  },
  {
    name: "Analytics",
    icon: BarChart3,
  },
  {
    name: "Model Lab",
    icon: FlaskConical,
  },
  {
    name: "Settings",
    icon: Settings,
  },
];

function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950 text-white">
      
      {/* Logo */}
      <div className="flex h-20 items-center border-b border-slate-800 px-6">
        <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
          <ShieldCheck size={23} />
        </div>

        <div>
          <h1 className="text-base font-bold">
            MerchantShield
          </h1>
          <p className="text-xs text-slate-400">
            AI Risk Platform
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = activePage === item.name;

          return (
            <button
              key={item.name}
              onClick={() => setActivePage(item.name)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon size={19} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* System status */}
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg bg-slate-900 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />

            <span className="text-xs font-medium text-slate-300">
              System Operational
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Risk engine online
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;