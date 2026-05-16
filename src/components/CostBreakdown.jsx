import { useState, useEffect } from "react";

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-surface-800/50 rounded-xl border border-white/5 px-6 py-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-medium text-surface-200/50 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <span className="w-36 text-sm font-mono text-surface-200/70 truncate">{label}</span>
      <div className="flex-1 h-3 bg-surface-900/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-24 text-right text-sm tabular-nums text-surface-200/60">{typeof value === "number" && value < 1 ? `$${value.toFixed(4)}` : value.toLocaleString()}</span>
    </div>
  );
}

export default function CostBreakdown() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/cost").then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>;
  if (!data) return <div className="p-8 text-surface-200/40">Failed to load analytics.</div>;

  const costEntries = Object.entries(data.cost_by_model || {});
  const tokenEntries = Object.entries(data.tokens_by_model || {});
  const maxCost = Math.max(...costEntries.map(([, v]) => v), 0.001);
  const maxTokens = Math.max(...tokenEntries.map(([, v]) => v), 1);

  const c = data.total_cost_usd;

  return (
    <div className="p-8 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Cost Breakdown</h1>
      <p className="text-sm text-surface-200/60 mb-8">Aggregated cost and token usage across all traces.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Traces" value={data.total_traces} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>} />
        <StatCard label="Total Cost" value={c < 0.01 && c > 0 ? `$${c.toFixed(4)}` : `$${c.toFixed(2)}`} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard label="Total Tokens" value={data.total_tokens.toLocaleString()} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" /></svg>} />
        <StatCard label="Avg Cost / Trace" value={data.avg_cost_per_trace < 0.01 ? `$${data.avg_cost_per_trace.toFixed(4)}` : `$${data.avg_cost_per_trace.toFixed(2)}`} icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" /></svg>} />
      </div>

      {/* Cost by model */}
      {costEntries.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Cost by Model</h2>
          <div className="bg-surface-800/40 rounded-xl border border-white/5 p-6 space-y-3">
            {costEntries.sort((a, b) => b[1] - a[1]).map(([model, cost]) => (
              <Bar key={model} label={model} value={cost} max={maxCost} color="bg-gradient-to-r from-accent-dark to-accent-light" />
            ))}
          </div>
        </div>
      )}

      {/* Tokens by model */}
      {tokenEntries.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Tokens by Model</h2>
          <div className="bg-surface-800/40 rounded-xl border border-white/5 p-6 space-y-3">
            {tokenEntries.sort((a, b) => b[1] - a[1]).map(([model, tokens]) => (
              <Bar key={model} label={model} value={tokens} max={maxTokens} color="bg-gradient-to-r from-emerald-600 to-emerald-400" />
            ))}
          </div>
        </div>
      )}

      {data.total_traces === 0 && (
        <div className="text-center text-surface-200/40 py-16">
          <p className="text-lg font-medium">No data yet</p>
          <p className="text-sm mt-1">Start tracing agent runs with the SDK to see cost analytics here.</p>
        </div>
      )}

      {/* Token split */}
      {data.total_tokens > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold mb-4">Token Distribution</h2>
          <div className="bg-surface-800/40 rounded-xl border border-white/5 p-6">
            <div className="flex items-center gap-6 mb-3">
              <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded bg-accent" /> Prompt ({data.total_prompt_tokens.toLocaleString()})</span>
              <span className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded bg-emerald-400" /> Completion ({data.total_completion_tokens.toLocaleString()})</span>
            </div>
            <div className="h-4 rounded-full overflow-hidden flex bg-surface-900/60">
              <div className="bg-accent h-full transition-all duration-700" style={{ width: `${(data.total_prompt_tokens / data.total_tokens) * 100}%` }} />
              <div className="bg-emerald-400 h-full transition-all duration-700" style={{ width: `${(data.total_completion_tokens / data.total_tokens) * 100}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
