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

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// ML API Configuration
const ML_API_URL = process.env.ML_API_URL || "http://localhost:8001";

/**
 * Comprehensive ML analysis for legal cases
 */
export const analyzeCaseWithML = action({
  args: {
    caseText: v.string(),
    ragSummary: v.optional(v.string()),
    sourceDocuments: v.optional(v.array(v.string())),
    queryId: v.optional(v.id("queries")),
    predictionId: v.optional(v.id("predictions")),
  },
  handler: async (ctx, args) => {
    try {
      // Prepare request payload
      const payload: any = {
        case_text: args.caseText,
      };

      if (args.ragSummary) {
        payload.rag_summary = args.ragSummary;
      }

      if (args.sourceDocuments) {
        payload.source_documents = args.sourceDocuments;
      }

      // Call ML API
      const response = await fetch(`${ML_API_URL}/api/v1/analyze/comprehensive`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`ML API error: ${response.statusText}`);
      }

      const result: any = await response.json();

      // Store bias analysis results if predictionId provided
      if (args.predictionId && result.document_bias) {
        const biasFlags = result.document_bias.bias_details || [];
        
        // Update prediction with enhanced bias data
        await ctx.runMutation(internal.predictions.updateBiasFlags, {
          predictionId: args.predictionId,
          biasFlags: biasFlags.map((flag: any) => ({
            type: flag.type,
            severity: flag.severity,
            description: flag.description,
          })),
        });
      }

      return {
        success: true,
        analysis: result,
      };
    } catch (error) {
      console.error("ML analysis failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "ML analysis failed",
      };
    }
  },
});

/**
 * Predict legal case outcome using ML
 */
export const predictOutcome = action({
  args: {
    caseText: v.string(),
    caseType: v.optional(v.string()),
    jurisdiction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const payload: any = {
        case_text: args.caseText,
        case_metadata: {},
      };

      if (args.caseType) {
        payload.case_metadata.case_type = args.caseType;
      }

      if (args.jurisdiction) {
        payload.case_metadata.jurisdiction = args.jurisdiction;
      }

      const response = await fetch(`${ML_API_URL}/api/v1/predict/outcome`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`ML API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        prediction: result.results,
      };
    } catch (error) {
      console.error("Outcome prediction failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Prediction failed",
      };
    }
  },
});

/**
 * Analyze systemic bias from historical cases
 */
export const analyzeSystemicBias = action({
  args: {
    timeRange: v.optional(
      v.object({
        startDate: v.number(),
        endDate: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      // Fetch historical predictions from Convex
      const predictions = await ctx.runQuery(internal.predictions.getHistoricalData, {
        timeRange: args.timeRange,
      });

      if (!predictions || predictions.length === 0) {
        return {
          success: false,
          error: "No historical data available for analysis",
        };
      }

      // Transform to ML API format
      const historicalCases: any = predictions.map((pred: any) => ({
        outcome: pred.prediction || "unknown",
        gender: pred.gender,
        region: pred.region,
        caste: pred.caste,
        case_type: pred.caseType,
        year: pred.year || new Date(pred._creationTime).getFullYear(),
      }));

      // Call ML API
      const response: any = await fetch(`${ML_API_URL}/api/v1/analyze/systemic-bias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          historical_cases: historicalCases,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        systemicBias: result.results,
      };
    } catch (error) {
      console.error("Systemic bias analysis failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      };
    }
  },
});

/**
 * Detect bias in RAG-generated output
 */
export const analyzeRAGBias = action({
  args: {
    ragSummary: v.string(),
    sourceDocuments: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/analyze/rag-bias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rag_summary: args.ragSummary,
          source_documents: args.sourceDocuments,
        }),
      });

      if (!response.ok) {
        throw new Error(`ML API error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        ragBias: result.results,
      };
    } catch (error) {
      console.error("RAG bias analysis failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Analysis failed",
      };
    }
  },
});

/**
 * Check ML API health status
 */
export const checkMLAPIStatus = action({
  args: {},
  handler: async (ctx) => {
    try {
      const response = await fetch(`${ML_API_URL}/api/v1/model/info`, {
        method: "GET",
      });

      if (!response.ok) {
        return {
          status: "offline",
          message: "ML API is not responding",
        };
      }

      const info = await response.json();

      return {
        status: "online",
        modelInfo: info,
      };
    } catch (error) {
      return {
        status: "offline",
        message: error instanceof Error ? error.message : "Connection failed",
      };
    }
  },
});

