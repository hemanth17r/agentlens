import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const STATUS_STYLES = {
  running: 'bg-warning/15 text-warning border border-warning/20',
  success: 'bg-success/15 text-success border border-success/20',
  error: 'bg-danger/15 text-danger border border-danger/20',
};

const STATUS_DOT = {
  running: 'bg-warning animate-pulse-dot',
  success: 'bg-success',
  error: 'bg-danger',
};

function formatDuration(start, end) {
  if (!start) return '–';
  const s = new Date(start);
  const e = end ? new Date(end) : new Date();
  const ms = e - s;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatCost(cost) {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export default function TraceList() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchTraces = async () => {
    try {
      const url =
        filter === 'all'
          ? '/api/traces?limit=100'
          : `/api/traces?status=${filter}&limit=100`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch traces');
      setTraces(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTraces();
    const interval = setInterval(fetchTraces, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [filter]);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'running', label: 'Running' },
    { key: 'success', label: 'Success' },
    { key: 'error', label: 'Error' },
  ];

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Traces</h1>
          <p className="text-sm text-surface-200/60 mt-1">
            Monitor your LLM agent invocations in real time.
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchTraces();
          }}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-accent/10 text-accent-light border border-accent/20 hover:bg-accent/20 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
              filter === f.key
                ? 'bg-accent text-white shadow-glow'
                : 'bg-white/5 text-surface-200 hover:bg-white/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : traces.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-surface-200/40">
          <svg
            className="w-16 h-16 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={0.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
          <p className="text-sm font-medium">No traces found</p>
          <p className="text-xs mt-1">
            Use the SDK to start recording agent runs.
          </p>
        </div>
      ) : (
        <div className="bg-surface-800/40 backdrop-blur-sm rounded-xl border border-white/5 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-200/60 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-200/60 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-surface-200/60 uppercase tracking-wider">
                  Model
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-200/60 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-200/60 uppercase tracking-wider">
                  Cost
                </th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-surface-200/60 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {traces.map((trace, idx) => (
                <tr
                  key={trace.trace_id}
                  className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <td className="px-5 py-4">
                    <Link
                      to={`/traces/${trace.trace_id}`}
                      className="font-medium text-surface-50 group-hover:text-accent-light transition-colors"
                    >
                      {trace.name}
                    </Link>
                    <p className="text-xs text-surface-200/40 font-mono mt-0.5">
                      {trace.trace_id.slice(0, 12)}…
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[trace.status] || ''}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[trace.status] || ''}`}
                      />
                      {trace.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-surface-200/70 font-mono text-xs">
                    {trace.model || '–'}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums text-surface-200/70">
                    {trace.total_tokens.toLocaleString()}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums font-medium text-accent-light">
                    {formatCost(trace.total_cost_usd)}
                  </td>
                  <td className="px-5 py-4 text-right text-surface-200/50 text-xs">
                    {formatDuration(trace.started_at, trace.ended_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
