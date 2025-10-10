from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import tempfile
import os
import gc
import asyncio
import time

from app.utils import load_pdf_ultra_fast, cleanup_temp_files
from app.qa_chain import get_ultra_fast_qa_chain, cleanup_client

from fastapi.concurrency import run_in_threadpool
import httpx

app = FastAPI()

TEAM_TOKEN = "8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8"

SEM_LIMIT = 10
semaphore = asyncio.Semaphore(SEM_LIMIT)

# Store for document processing status
document_store = {}

class QueryRequest(BaseModel):
    documents: str
    questions: List[str]

class IngestRequest(BaseModel):
    document_url: str
    document_id: str
    title: str

class QueryDocumentRequest(BaseModel):
    query: str
    document_id: Optional[str] = None

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

async def process_single_question_ultra_fast(qa, question: str, timeout: int = 8) -> str:
    async with semaphore:
        try:
            answer = await run_in_threadpool(qa.invoke, {"query": question})
            return answer["result"]
        except asyncio.TimeoutError:
            return f"Timeout: Question processing exceeded {timeout}s"
        except Exception as e:
            return f"Error: {str(e)}"


@app.post("/api/v1/hackrx/run")
async def run_query_ultra_fast(
    request: QueryRequest,
    authorization: Optional[str] = Header(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    start_time = time.time()

    if not authorization or authorization.split()[-1] != TEAM_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    temp_pdf_path = None
    cleanup_fn = None

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0),
            limits=httpx.Limits(max_connections=1, max_keepalive_connections=0)
        ) as client_http:
            pdf_response = await client_http.get(request.documents, follow_redirects=True)
            pdf_response.raise_for_status()

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
                temp_pdf.write(pdf_response.content)
                temp_pdf_path = temp_pdf.name

        docs = await load_pdf_ultra_fast(temp_pdf_path)
        if not docs:
            raise ValueError("No content extracted from PDF")

        qa, cleanup_fn = await get_ultra_fast_qa_chain(docs)

        max_concurrent = min(len(request.questions), 12)
        per_question_timeout = max(6, min(10, 80 // len(request.questions)))

        if len(request.questions) <= max_concurrent:
            tasks = [
                process_single_question_ultra_fast(qa, q, per_question_timeout)
                for q in request.questions
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
        else:
            results = []
            for i in range(0, len(request.questions), max_concurrent):
                batch = request.questions[i:i + max_concurrent]
                tasks = [
                    process_single_question_ultra_fast(qa, q, per_question_timeout)
                    for q in batch
                ]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                results.extend(batch_results)

        answers = [
            f"Error: {str(r)}" if isinstance(r, Exception) else str(r)
            for r in results
        ]

        total_time = time.time() - start_time

        if cleanup_fn:
            background_tasks.add_task(cleanup_fn)

        # Group all questions and answers into separate dicts
        questions_dict = {f"q{i + 1}": q for i, q in enumerate(request.questions)}
        answers_dict = {f"a{i + 1}": a for i, a in enumerate(answers)}

        print("Questions:", questions_dict)
        print("Answers:", answers_dict)

        return {
            "answers": answers
        }

    except asyncio.TimeoutError:
        raise HTTPException(status_code=408, detail="Ultra-fast timeout exceeded")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Download failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")
    finally:
        if temp_pdf_path:
            cleanup_temp_files(temp_pdf_path)
        gc.collect()


@app.post("/api/v1/documents/ingest")
async def ingest_document(
    request: IngestRequest,
    authorization: Optional[str] = Header(None),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Dedicated endpoint for document ingestion into vector store
    """
    if not authorization or authorization.split()[-1] != TEAM_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    temp_pdf_path = None
    
    try:
        # Update status to processing
        document_store[request.document_id] = {
            "status": "processing",
            "title": request.title,
            "started_at": time.time()
        }

        # Download document
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=30.0, write=5.0, pool=5.0),
            limits=httpx.Limits(max_connections=1, max_keepalive_connections=0)
        ) as client_http:
            pdf_response = await client_http.get(request.document_url, follow_redirects=True)
            pdf_response.raise_for_status()

            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
                temp_pdf.write(pdf_response.content)
                temp_pdf_path = temp_pdf.name

        # Load and process document
        docs = await load_pdf_ultra_fast(temp_pdf_path)
        if not docs:
            raise ValueError("No content extracted from PDF")

        # Create QA chain (this ingests into Weaviate)
        qa, cleanup_fn = await get_ultra_fast_qa_chain(docs)
        
        # Update status to completed
        document_store[request.document_id] = {
            "status": "completed",
            "title": request.title,
            "chunks": len(docs),
            "completed_at": time.time()
        }

        if cleanup_fn:
            background_tasks.add_task(cleanup_fn)

        return {
            "status": "success",
            "document_id": request.document_id,
            "chunks_processed": len(docs),
            "message": "Document ingested successfully"
        }

    except Exception as e:
        document_store[request.document_id] = {
            "status": "failed",
            "title": request.title,
            "error": str(e)
        }
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        if temp_pdf_path:
            cleanup_temp_files(temp_pdf_path)
        gc.collect()


@app.post("/api/v1/documents/query")
async def query_documents(
    request: QueryDocumentRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Query ingested documents
    """
    if not authorization or authorization.split()[-1] != TEAM_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # For now, we'll use a placeholder document URL since we need the QA chain
        # In production, you'd retrieve the actual document from storage
        placeholder_url = "https://example.com/placeholder.pdf"
        
        # Create a minimal QA chain for querying
        # Note: This is simplified - in production you'd maintain persistent vector store
        docs = []  # Empty docs since we're querying existing vectors
        qa, cleanup_fn = await get_ultra_fast_qa_chain(docs)
        
        answer = await process_single_question_ultra_fast(qa, request.query, timeout=10)
        
        return {
            "status": "success",
            "query": request.query,
            "answer": answer,
            "document_id": request.document_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")


@app.post("/api/v1/documents/search")
async def search_documents(
    request: SearchRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Semantic search across ingested documents
    """
    if not authorization or authorization.split()[-1] != TEAM_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        # Placeholder for semantic search
        # In production, this would query the Weaviate vector store directly
        return {
            "status": "success",
            "query": request.query,
            "results": [],
            "message": "Search functionality requires persistent vector store"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@app.get("/api/v1/documents/status/{document_id}")
async def get_document_status(
    document_id: str,
    authorization: Optional[str] = Header(None)
):
    """
    Check document processing status
    """
    if not authorization or authorization.split()[-1] != TEAM_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if document_id not in document_store:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": document_id,
        **document_store[document_id]
    }


@app.get("/ping")
def ping():
    return {"status": "ultra-fast", "mode": "lightning"}


@app.get("/health")
async def health_check():
    return {
        "status": "ultra-optimized",
        "target": "sub-15s processing",
        "optimizations": [
            "llama-3.1-8b-instant",
            "massive chunk sizes",
            "128 batch embedding upload",
            "max 50 chunks per document",
            "12 concurrent questions",
            "background cleanup"
        ]
    }

@app.on_event("startup")
async def startup_event():
    print("✅ RAG Backend started successfully (reranking disabled)")

@app.on_event("shutdown")
async def shutdown_event():
    cleanup_client()