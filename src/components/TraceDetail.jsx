import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const TYPE_BADGE = {
  llm: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20',
  tool: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
  chain: 'bg-amber-500/15 text-amber-300 border border-amber-500/20',
};
const STATUS_DOT = {
  running: 'bg-warning animate-pulse-dot',
  success: 'bg-success',
  error: 'bg-danger',
};

function fmt(start, end) {
  if (!start) return '–';
  const ms = (end ? new Date(end) : new Date()) - new Date(start);
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-surface-800/50 rounded-xl border border-white/5 px-5 py-4">
      <p className="text-xs font-medium text-surface-200/50 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-xs text-surface-200/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function TraceDetail() {
  const { traceId } = useParams();
  const [trace, setTrace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`/api/traces/${traceId}`)
      .then((r) => r.json())
      .then(setTrace)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [traceId]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  if (!trace)
    return (
      <div className="flex flex-col items-center justify-center h-full text-surface-200/40">
        <p>Trace not found</p>
        <Link to="/" className="text-accent-light text-sm mt-2 hover:underline">
          ← Back
        </Link>
      </div>
    );

  const c = trace.total_cost_usd;
  return (
    <div className="p-8 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-surface-200/50 mb-6">
        <Link to="/" className="hover:text-accent-light transition-colors">
          Traces
        </Link>
        <span>/</span>
        <span className="text-surface-50 font-medium">{trace.name}</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 mb-1">
        {trace.name}
        <span
          className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[trace.status]}`}
        />
      </h1>
      <p className="text-xs text-surface-200/40 font-mono mb-8">
        {trace.trace_id}
      </p>
      {trace.error_message && (
        <div className="mb-6 bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 text-sm text-danger">
          {trace.error_message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Tokens"
          value={trace.total_tokens.toLocaleString()}
          sub={`${trace.prompt_tokens.toLocaleString()} prompt · ${trace.completion_tokens.toLocaleString()} completion`}
        />
        <MetricCard
          label="Cost"
          value={c < 0.01 && c > 0 ? `$${c.toFixed(4)}` : `$${c.toFixed(2)}`}
        />
        <MetricCard label="Model" value={trace.model || '–'} />
        <MetricCard
          label="Duration"
          value={fmt(trace.started_at, trace.ended_at)}
        />
      </div>

      <h2 className="text-lg font-semibold mb-1">Spans</h2>
      <p className="text-xs text-surface-200/40 mb-4">
        {trace.spans?.length || 0} recorded
      </p>

      {!trace.spans || trace.spans.length === 0 ? (
        <div className="bg-surface-800/40 rounded-xl border border-white/5 p-8 text-center text-surface-200/40 text-sm">
          No spans recorded.
        </div>
      ) : (
        <div className="space-y-2">
          {trace.spans.map((s) => (
            <div
              key={s.span_id}
              className="bg-surface-800/40 rounded-xl border border-white/5 overflow-hidden hover:border-white/10 transition-all"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === s.span_id ? null : s.span_id)
                }
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${TYPE_BADGE[s.span_type] || ''}`}
                  >
                    {s.span_type}
                  </span>
                  <span className="font-medium text-sm">{s.name}</span>
                  {s.model && (
                    <span className="text-xs text-surface-200/40 font-mono">
                      {s.model}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-surface-200/50">
                  <span>{s.total_tokens.toLocaleString()} tok</span>
                  <span className="text-accent-light font-medium">
                    ${s.cost_usd.toFixed(4)}
                  </span>
                  <span>{fmt(s.started_at, s.ended_at)}</span>
                </div>
              </button>
              {expanded === s.span_id && (
                <div className="border-t border-white/5 px-5 py-4 space-y-3 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    {s.input_text && (
                      <div>
                        <p className="text-xs font-semibold text-surface-200/50 uppercase mb-2">
                          Input
                        </p>
                        <pre className="bg-surface-900/60 rounded-lg p-3 text-xs font-mono text-surface-200/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {s.input_text}
                        </pre>
                      </div>
                    )}
                    {s.output_text && (
                      <div>
                        <p className="text-xs font-semibold text-surface-200/50 uppercase mb-2">
                          Output
                        </p>
                        <pre className="bg-surface-900/60 rounded-lg p-3 text-xs font-mono text-surface-200/80 whitespace-pre-wrap max-h-48 overflow-y-auto">
                          {s.output_text}
                        </pre>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-6 text-xs text-surface-200/40">
                    <span>
                      ID:{' '}
                      <code className="font-mono">
                        {s.span_id.slice(0, 12)}…
                      </code>
                    </span>
                    <span>Prompt: {s.prompt_tokens.toLocaleString()}</span>
                    <span>
                      Completion: {s.completion_tokens.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
