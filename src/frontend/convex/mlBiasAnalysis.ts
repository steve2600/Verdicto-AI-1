/**
 * ML-Powered Bias Analysis & Outcome Prediction using InLegalBERT
 * ================================================================
 * 
 * This Convex action integrates with the InLegalBERT ML backend for:
 * - Document bias detection
 * - RAG output bias analysis
 * - Systemic bias detection
 * - Legal outcome prediction
 */

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Unified ML API URL (now on port 8001)
const ML_API_URL = process.env.ML_API_URL || "https://a-i-c-a-verdicto-ml.hf.space";

export const analyzeCaseWithML = action({
  args: {
    caseText: v.string(),
    ragSummary: v.optional(v.string()),
    sourceDocuments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/analyze/comprehensive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          case_text: args.caseText,
          rag_summary: args.ragSummary,
          source_documents: args.sourceDocuments,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML API error: ${response.statusText}`);
      }

      const result: any = await response.json();
      return result;
    } catch (error: any) {
      console.error("ML bias analysis failed:", error);
      throw new Error(`ML analysis failed: ${error.message}`);
    }
  },
});

// Systemic bias analysis action
export const analyzeSystemicBias = action({
  args: {
    historicalCases: v.array(v.any()),
  },
  handler: async (ctx, args): Promise<any> => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/analyze/systemic-bias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          historical_cases: args.historicalCases,
        }),
      });

      if (!response.ok) {
        throw new Error(`Systemic bias analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error("Systemic bias analysis failed:", error);
      throw new Error(`Systemic bias analysis failed: ${error.message}`);
    }
  },
});