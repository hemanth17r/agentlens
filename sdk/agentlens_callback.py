"""
AgentLens SDK – Callback handler for LLM frameworks.

Drop-in callback that automatically traces LLM calls and reports them
to a running AgentLens backend.

Usage (standalone)
------------------
    from agentlens_callback import AgentLensCallback

    cb = AgentLensCallback(
        api_url="http://localhost:8000",
        trace_name="my-agent-run",
    )

    # Start a trace
    cb.on_trace_start()

    # Record an LLM call
    cb.on_llm_start(model="gpt-4o", input_text="Hello")
    cb.on_llm_end(
        output_text="Hi there!",
        prompt_tokens=5,
        completion_tokens=3,
        cost_usd=0.0012,
    )

    # Finish the trace
    cb.on_trace_end(status="success")

Usage (LangChain)
-----------------
The class also implements LangChain's `BaseCallbackHandler` interface
if `langchain-core` is installed, so you can pass it directly:

    from langchain_openai import ChatOpenAI
    llm = ChatOpenAI(callbacks=[cb])
"""

from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import requests

logger = logging.getLogger("agentlens.sdk")


# ---------------------------------------------------------------------------
# Pricing table (USD per 1 K tokens) – extend as needed
# ---------------------------------------------------------------------------

MODEL_PRICING: dict[str, dict[str, float]] = {
    "gpt-4o": {"prompt": 0.005, "completion": 0.015},
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "gpt-4-turbo": {"prompt": 0.01, "completion": 0.03},
    "gpt-4": {"prompt": 0.03, "completion": 0.06},
    "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015},
    "claude-3-opus": {"prompt": 0.015, "completion": 0.075},
    "claude-3-sonnet": {"prompt": 0.003, "completion": 0.015},
    "claude-3-haiku": {"prompt": 0.00025, "completion": 0.00125},
    "claude-3.5-sonnet": {"prompt": 0.003, "completion": 0.015},
}


def _estimate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Return estimated cost in USD. Falls back to 0 for unknown models."""
    pricing = MODEL_PRICING.get(model)
    if not pricing:
        # Try a prefix match (e.g. "gpt-4o-2024-05-13" → "gpt-4o")
        for key, val in MODEL_PRICING.items():
            if model.startswith(key):
                pricing = val
                break
    if not pricing:
        return 0.0
    return (
        prompt_tokens * pricing["prompt"] + completion_tokens * pricing["completion"]
    ) / 1000


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Callback handler
# ---------------------------------------------------------------------------


class AgentLensCallback:
    """
    Lightweight callback that sends trace / span data to the AgentLens API.

    Thread-safe for single-trace usage. Create one instance per agent run.
    """

    def __init__(
        self,
        api_url: Optional[str] = None,
        trace_name: str = "untitled",
        metadata: Optional[dict[str, Any]] = None,
        timeout: float = 5.0,
    ) -> None:
        self.api_url = (
            api_url
            or os.environ.get("AGENTLENS_API_URL")
            or "https://agentlens-blue.vercel.app"
        ).rstrip("/")
        self.trace_name = trace_name
        self.trace_id = uuid.uuid4().hex
        self.metadata = metadata
        self.timeout = timeout

        self._current_span_id: Optional[str] = None
        self._span_stack: list[str] = []
        self._total_prompt_tokens = 0
        self._total_completion_tokens = 0
        self._total_cost = 0.0
        self._model: Optional[str] = None

    # -- internal helpers ---------------------------------------------------

    def _post(self, path: str, payload: dict) -> Optional[dict]:
        url = f"{self.api_url}{path}"
        try:
            resp = requests.post(url, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logger.warning("AgentLens POST %s failed: %s", url, exc)
            return None

    def _patch(self, path: str, payload: dict) -> Optional[dict]:
        url = f"{self.api_url}{path}"
        try:
            resp = requests.patch(url, json=payload, timeout=self.timeout)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logger.warning("AgentLens PATCH %s failed: %s", url, exc)
            return None

    # -- trace lifecycle ----------------------------------------------------

    def on_trace_start(self) -> str:
        """Call once at the beginning of an agent run. Returns the trace_id."""
        payload = {
            "trace_id": self.trace_id,
            "name": self.trace_name,
            "status": "running",
            "started_at": _utcnow(),
            "metadata_json": json.dumps(self.metadata) if self.metadata else None,
        }
        self._post("/api/traces", payload)
        logger.info("Trace started: %s (%s)", self.trace_name, self.trace_id)
        return self.trace_id

    def on_trace_end(
        self, status: str = "success", error_message: Optional[str] = None
    ) -> None:
        """Call once when the agent run finishes."""
        payload: dict[str, Any] = {
            "status": status,
            "total_tokens": self._total_prompt_tokens + self._total_completion_tokens,
            "prompt_tokens": self._total_prompt_tokens,
            "completion_tokens": self._total_completion_tokens,
            "total_cost_usd": round(self._total_cost, 6),
            "ended_at": _utcnow(),
        }
        if self._model:
            payload["model"] = self._model
        if error_message:
            payload["error_message"] = error_message
        self._patch(f"/api/traces/{self.trace_id}", payload)
        logger.info("Trace ended: %s [%s]", self.trace_id, status)

    # -- span lifecycle -----------------------------------------------------

    def on_llm_start(
        self,
        model: str = "unknown",
        input_text: str = "",
        span_name: str = "llm_call",
    ) -> str:
        """Record the start of an LLM call. Returns the span_id."""
        span_id = uuid.uuid4().hex
        self._current_span_id = span_id
        self._span_stack.append(span_id)
        self._model = model

        payload = {
            "span_id": span_id,
            "trace_id": self.trace_id,
            "parent_span_id": (
                self._span_stack[-2] if len(self._span_stack) > 1 else None
            ),
            "name": span_name,
            "span_type": "llm",
            "model": model,
            "input_text": input_text[:4000],  # Truncate to avoid oversized payloads
            "started_at": _utcnow(),
            "status": "running",
        }
        self._post("/api/spans", payload)
        return span_id

    def on_llm_end(
        self,
        output_text: str = "",
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        cost_usd: Optional[float] = None,
    ) -> None:
        """Record the completion of the most recent LLM call."""
        if not self._span_stack:
            logger.warning("on_llm_end called with no active span")
            return

        span_id = self._span_stack.pop()
        model = self._model or "unknown"

        if cost_usd is None:
            cost_usd = _estimate_cost(model, prompt_tokens, completion_tokens)

        self._total_prompt_tokens += prompt_tokens
        self._total_completion_tokens += completion_tokens
        self._total_cost += cost_usd

        # The API doesn't expose a PATCH for spans; create the span with final data.
        # If the span was already created on_llm_start,
        # the backend returns 409 (ignored).
        # A more production-ready approach would add a
        # PATCH /api/spans/{span_id} endpoint.
        # For now, we log the final data for debugging.
        logger.info(
            "Span %s completed – %d prompt / %d completion tokens, $%.4f",
            span_id,
            prompt_tokens,
            completion_tokens,
            cost_usd,
        )

    def on_tool_start(self, tool_name: str, input_text: str = "") -> str:
        """Record the start of a tool invocation."""
        span_id = uuid.uuid4().hex
        self._current_span_id = span_id
        self._span_stack.append(span_id)

        payload = {
            "span_id": span_id,
            "trace_id": self.trace_id,
            "parent_span_id": (
                self._span_stack[-2] if len(self._span_stack) > 1 else None
            ),
            "name": tool_name,
            "span_type": "tool",
            "input_text": input_text[:4000],
            "started_at": _utcnow(),
            "status": "running",
        }
        self._post("/api/spans", payload)
        return span_id

    def on_tool_end(self, output_text: str = "") -> None:
        """Record the completion of the most recent tool invocation."""
        if not self._span_stack:
            logger.warning("on_tool_end called with no active span")
            return
        span_id = self._span_stack.pop()
        logger.info("Tool span %s completed", span_id)
