"""
FastAPI endpoints for InLegalBERT Bias Detection & Outcome Prediction
=====================================================================

This module provides REST API endpoints for the ML analysis engine.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uvicorn
from datetime import datetime

from bias_prediction_engine import analyze_legal_case, get_model

# ============================================================================
# FASTAPI APP SETUP
# ============================================================================

app = FastAPI(
    title="InLegalBERT Analysis API",
    description="Bias detection and outcome prediction for Indian legal cases",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# PYDANTIC MODELS (Request/Response Schemas)
# ============================================================================

class CaseMetadata(BaseModel):
    """Optional metadata for case analysis"""
    case_type: Optional[str] = Field(None, description="Type of case (criminal, civil, bail, etc.)")
    jurisdiction: Optional[str] = Field(None, description="Court jurisdiction")
    year: Optional[int] = Field(None, description="Case year")
    

class HistoricalCase(BaseModel):
    """Historical case data for systemic bias analysis"""
    outcome: str = Field(..., description="Case outcome (conviction, acquittal, etc.)")
    gender: Optional[str] = Field(None, description="Gender of defendant")
    region: Optional[str] = Field(None, description="Geographic region")
    caste: Optional[str] = Field(None, description="Caste category")
    case_type: Optional[str] = Field(None, description="Type of case")
    year: Optional[int] = Field(None, description="Year of case")


class AnalysisRequest(BaseModel):
    """Main request model for comprehensive analysis"""
    case_text: str = Field(..., description="Legal document/FIR/judgment text", min_length=10)
    rag_summary: Optional[str] = Field(None, description="AI-generated summary for RAG bias detection")
    source_documents: Optional[List[str]] = Field(None, description="Source documents used for RAG")
    historical_cases: Optional[List[HistoricalCase]] = Field(None, description="Historical cases for systemic analysis")
    case_metadata: Optional[CaseMetadata] = Field(None, description="Case metadata")


class DocumentBiasRequest(BaseModel):
    """Request for document-only bias detection"""
    case_text: str = Field(..., description="Legal document text")
    threshold: float = Field(0.15, ge=0.0, le=1.0, description="Bias detection threshold")


class RAGBiasRequest(BaseModel):
    """Request for RAG output bias detection"""
    rag_summary: str = Field(..., description="AI-generated summary")
    source_documents: List[str] = Field(..., description="Source documents")


class SystemicBiasRequest(BaseModel):
    """Request for systemic bias analysis"""
    historical_cases: List[HistoricalCase] = Field(..., description="Historical case data")


class OutcomePredictionRequest(BaseModel):
    """Request for outcome prediction only"""
    case_text: str = Field(..., description="Legal case text")
    case_metadata: Optional[CaseMetadata] = Field(None, description="Optional case metadata")


class AnalysisResponse(BaseModel):
    """Response model for analysis results"""
    status: str
    analysis_id: str
    timestamp: str
    document_bias: Optional[Dict[str, Any]] = None
    rag_bias: Optional[Dict[str, Any]] = None
    systemic_bias: Optional[Dict[str, Any]] = None
    outcome_prediction: Optional[Dict[str, Any]] = None


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """API health check"""
    return {
        "service": "InLegalBERT Analysis API",
        "status": "operational",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/v1/analyze/comprehensive", response_model=AnalysisResponse)
async def comprehensive_analysis(request: AnalysisRequest):
    """
    Perform comprehensive legal case analysis including:
    - Document bias detection
    - RAG output bias detection (if RAG summary provided)
    - Systemic bias analysis (if historical cases provided)
    - Outcome prediction
    
    Returns:
        Complete analysis results in JSON format
    """
    try:
        # Convert Pydantic models to dicts
        historical_cases_dict = None
        if request.historical_cases:
            historical_cases_dict = [case.dict() for case in request.historical_cases]
        
        case_metadata_dict = None
        if request.case_metadata:
            case_metadata_dict = request.case_metadata.dict()
        
        # Run analysis
        results = analyze_legal_case(
            case_text=request.case_text,
            rag_summary=request.rag_summary,
            source_documents=request.source_documents,
            historical_cases=historical_cases_dict,
            case_metadata=case_metadata_dict
        )
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/api/v1/analyze/document-bias")
async def document_bias_analysis(request: DocumentBiasRequest):
    """
    Analyze document for textual biases (gender, caste, region, etc.)
    
    Returns:
        Bias flags and detailed scores
    """
    try:
        model = get_model()
        results = model.detect_document_bias(request.case_text, request.threshold)
        
        return {
            "status": "success",
            "analysis_id": f"doc_bias_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Document bias analysis failed: {str(e)}")


@app.post("/api/v1/analyze/rag-bias")
async def rag_bias_analysis(request: RAGBiasRequest):
    """
    Analyze RAG-generated output for tone, interpretive, and selectivity biases
    
    Returns:
        RAG-specific bias flags and details
    """
    try:
        model = get_model()
        results = model.detect_rag_output_bias(
            request.rag_summary,
            request.source_documents
        )
        
        return {
            "status": "success",
            "analysis_id": f"rag_bias_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG bias analysis failed: {str(e)}")


@app.post("/api/v1/analyze/systemic-bias")
async def systemic_bias_analysis(request: SystemicBiasRequest):
    """
    Analyze historical cases for systemic and statistical biases
    
    Returns:
        Dashboard-ready bias metrics and visualization data
    """
    try:
        model = get_model()
        historical_cases_dict = [case.dict() for case in request.historical_cases]
        results = model.detect_systemic_bias(historical_cases_dict)
        
        return {
            "status": "success",
            "analysis_id": f"systemic_bias_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Systemic bias analysis failed: {str(e)}")


@app.post("/api/v1/predict/outcome")
async def outcome_prediction(request: OutcomePredictionRequest):
    """
    Predict legal case outcome with confidence score
    
    Returns:
        Predicted outcome, confidence score, and justification
    """
    try:
        model = get_model()
        case_metadata_dict = None
        if request.case_metadata:
            case_metadata_dict = request.case_metadata.dict()
        
        results = model.predict_outcome(request.case_text, case_metadata_dict)
        
        return {
            "status": "success",
            "analysis_id": f"prediction_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "timestamp": datetime.now().isoformat(),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Outcome prediction failed: {str(e)}")


@app.get("/api/v1/model/info")
async def model_info():
    """
    Get information about the loaded model
    
    Returns:
        Model metadata and configuration
    """
    try:
        model = get_model()
        return {
            "model_name": "InLegalBERT (law-ai/InLegalBERT)",
            "device": str(model.device),
            "bias_types_supported": list(model.bias_keywords.keys()),
            "status": "loaded",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model info retrieval failed: {str(e)}")


@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    print("=" * 70)
    print("InLegalBERT Analysis API Starting Up...")
    print("=" * 70)
    # Pre-load model
    get_model()
    print("Model loaded successfully!")
    print("API is ready to serve requests.")
    print("=" * 70)


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )

