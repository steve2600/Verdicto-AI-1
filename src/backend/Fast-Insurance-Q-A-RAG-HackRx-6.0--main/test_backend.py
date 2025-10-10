#!/usr/bin/env python3
"""
Test script for RAG Backend
Tests the ingest endpoint and basic functionality
"""

import requests
import json
import os
from typing import Dict, Any

# Configuration
BACKEND_URL = os.getenv("RAG_BACKEND_URL", "https://verdicto-ai-1-production.up.railway.app")
TEAM_TOKEN = "8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8"

def test_health_check() -> bool:
    """Test the health check endpoint"""
    try:
        response = requests.get(f"{BACKEND_URL}/ping", timeout=10)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_ingest_endpoint() -> bool:
    """Test the ingest endpoint with a sample document"""
    try:
        # Sample document URL (you can replace with any PDF URL)
        sample_doc_url = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        
        payload = {
            "document_url": sample_doc_url,
            "document_title": "Test Document",
            "document_id": "test-doc-123"
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TEAM_TOKEN}"
        }
        
        print(f"Testing ingest endpoint with: {sample_doc_url}")
        response = requests.post(
            f"{BACKEND_URL}/api/v1/hackrx/ingest",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            print("✅ Ingest endpoint test passed")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Ingest endpoint failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ingest endpoint error: {e}")
        return False

def test_query_endpoint() -> bool:
    """Test the query endpoint"""
    try:
        # Sample query payload
        payload = {
            "documents": "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            "questions": ["What is this document about?"]
        }
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TEAM_TOKEN}"
        }
        
        print("Testing query endpoint...")
        response = requests.post(
            f"{BACKEND_URL}/api/v1/hackrx/run",
            json=payload,
            headers=headers,
            timeout=60
        )
        
        if response.status_code == 200:
            print("✅ Query endpoint test passed")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Query endpoint failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Query endpoint error: {e}")
        return False

def main():
    """Run all tests"""
    print(f"🧪 Testing RAG Backend at: {BACKEND_URL}")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_check),
        ("Ingest Endpoint", test_ingest_endpoint),
        ("Query Endpoint", test_query_endpoint)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name}...")
        result = test_func()
        results.append((test_name, result))
    
    print("\n" + "=" * 50)
    print("📊 Test Results:")
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 Summary: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! Backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the errors above.")

if __name__ == "__main__":
    main()
