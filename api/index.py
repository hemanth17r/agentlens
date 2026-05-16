import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

supabase: Client = None
if url and key:
    supabase = create_client(url, key)


class TraceCreate(BaseModel):
    trace_id: str
    name: str
    status: str
    started_at: str
    metadata_json: Optional[str] = None


class TraceUpdate(BaseModel):
    status: Optional[str] = None
    total_tokens: Optional[int] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_cost_usd: Optional[float] = None
    ended_at: Optional[str] = None
    model: Optional[str] = None
    error_message: Optional[str] = None


class SpanCreate(BaseModel):
    span_id: str
    trace_id: str
    parent_span_id: Optional[str] = None
    name: str
    span_type: str
    model: Optional[str] = None
    input_text: Optional[str] = None
    started_at: str
    status: str


@app.post("/api/traces")
async def create_trace(trace: TraceCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        supabase.table("traces").upsert(trace.dict(exclude_unset=True)).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/api/traces/{trace_id}")
async def update_trace(trace_id: str, trace_update: TraceUpdate):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        supabase.table("traces").update(trace_update.dict(exclude_unset=True)).eq(
            "trace_id", trace_id
        ).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/spans")
async def create_span(span: SpanCreate):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        supabase.table("spans").upsert(span.dict(exclude_unset=True)).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/traces")
async def get_traces():
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        response = (
            supabase.table("traces")
            .select("*")
            .order("started_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/traces/{trace_id}")
async def get_trace(trace_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")

    try:
        trace_response = (
            supabase.table("traces").select("*").eq("trace_id", trace_id).execute()
        )
        if not trace_response.data:
            raise HTTPException(status_code=404, detail="Trace not found")

        spans_response = (
            supabase.table("spans")
            .select("*")
            .eq("trace_id", trace_id)
            .order("started_at")
            .execute()
        )

        trace_data = trace_response.data[0]
        trace_data["spans"] = spans_response.data
        return trace_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
