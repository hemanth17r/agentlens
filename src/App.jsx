import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
import TraceList from "./components/TraceList";
import TraceDetail from "./components/TraceDetail";
import CostBreakdown from "./components/CostBreakdown";

/* ── Sidebar Icon SVGs ──────────────────────────────────── */
const IconTraces = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
  </svg>
);

const IconCost = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconLogo = () => (
  <svg className="w-8 h-8" viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="14" stroke="url(#grad)" strokeWidth="2.5" />
    <path d="M10 16l4 4 8-8" stroke="url(#grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
        <stop stopColor="#818cf8" />
        <stop offset="1" stopColor="#6366f1" />
      </linearGradient>
    </defs>
  </svg>
);

/* ── Layout ─────────────────────────────────────────────── */
function Layout() {
  const [active, setActive] = useState("traces");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-800/60 backdrop-blur-xl border-r border-white/5 flex flex-col">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <IconLogo />
          <span className="text-lg font-semibold tracking-tight bg-gradient-to-r from-accent-light to-accent bg-clip-text text-transparent">
            AgentLens
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            to="/"
            onClick={() => setActive("traces")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              active === "traces"
                ? "bg-accent/10 text-accent-light shadow-glow"
                : "text-surface-200 hover:text-white hover:bg-white/5"
            }`}
          >
            <IconTraces />
            Traces
          </Link>
          <Link
            to="/costs"
            onClick={() => setActive("costs")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              active === "costs"
                ? "bg-accent/10 text-accent-light shadow-glow"
                : "text-surface-200 hover:text-white hover:bg-white/5"
            }`}
          >
            <IconCost />
            Cost Breakdown
          </Link>
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5">
          <p className="text-xs text-surface-200/50">AgentLens v0.1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<TraceList />} />
          <Route path="/traces/:traceId" element={<TraceDetail />} />
          <Route path="/costs" element={<CostBreakdown />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
