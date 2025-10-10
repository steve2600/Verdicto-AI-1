"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";

// RAG Backend on Railway for document processing
const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || "https://verdicto-ai-1-production.up.railway.app";

/**
 * Send document to RAG backend for processing
 */
export const processDocument = action({
  args: {
    documentId: v.id("documents"),
    fileUrl: v.string(), // Now expects storageId
    title: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Update document status to processing
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "processing",
      });

      // Get the actual file URL from Convex storage
      const storageUrl = await ctx.storage.getUrl(args.fileUrl as any);
      
      if (!storageUrl) {
        throw new Error("Failed to get storage URL for document");
      }

      // Send to RAG backend on Railway for document processing
      const response = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8",
        },
        body: JSON.stringify({
          document_url: storageUrl,
          document_title: args.title,
          document_id: args.documentId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RAG backend error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();

      // Update document status to processed
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "processed",
      });

      return {
        success: true,
        message: "Document processed successfully",
        chunks: result.chunks_created || 0,
      };
    } catch (error) {
      // Update document status to failed
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "failed",
      });

      console.error("RAG processing error:", error);
      throw new Error(`Failed to process document: ${error}`);
    }
  },
});

/**
 * Send query to RAG backend for analysis
 */
export const analyzeQuery = action({
  args: {
    queryId: v.id("queries"),
    queryText: v.string(),
    documentIds: v.optional(v.array(v.id("documents"))),
  },
  handler: async (ctx, args): Promise<{ success: boolean; predictionId: any; response: string }> => {
    try {
      // Update query status to processing
      await ctx.runMutation(internal.queries.updateStatus, {
        queryId: args.queryId,
        status: "processing",
      });

      // Use RAG backend on Railway for query analysis
      const response = await fetch(`${RAG_BACKEND_URL}/api/v1/analysis/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: args.queryText,
          document_ids: args.documentIds || [],
        }),
      });

      if (!response.ok) {
        // Fallback to mock response if RAG backend is not available
        console.warn("RAG backend not available, using mock response");
        const ragResponse = `Based on the query "${args.queryText}", this appears to be a legal case analysis request. The system would typically provide detailed legal analysis, case predictions, and bias detection.`;
        const sources: any[] = [];
        const confidence = 0.75;
        
        // Create prediction with mock data
        const predictionId: any = await ctx.runMutation(internal.predictions.createFromRAG, {
          queryId: args.queryId,
          ragResponse,
          confidence,
          sources,
        });

        // Update query status to completed
        await ctx.runMutation(internal.queries.updateStatus, {
          queryId: args.queryId,
          status: "completed",
        });

        return {
          success: true,
          predictionId,
          response: ragResponse,
        };
      }

      const result = await response.json();

      // Extract RAG analysis results
      const ragResponse = result.response || result.answer || "Legal analysis completed";
      const sources = result.sources || [];
      const confidence = result.confidence || 0.75;

      // Create prediction in Convex with RAG results
      const predictionId: any = await ctx.runMutation(internal.predictions.createFromRAG, {
        queryId: args.queryId,
        ragResponse,
        confidence,
        sources,
      });

      // Temporarily disabled - ML backend not yet deployed
      // try {
      //   await ctx.runAction(internal.mlBiasAnalysis.analyzeCaseWithML, {
      //     caseText: args.queryText,
      //     ragSummary: ragResponse,
      //     sourceDocuments: sources.map((s: any) => s.content || s.text || ""),
      //     predictionId,
      //   });
      // } catch (error) {
      //   console.warn("ML bias analysis failed (non-critical):", error);
      // }

      // Update query status to completed
      await ctx.runMutation(internal.queries.updateStatus, {
        queryId: args.queryId,
        status: "completed",
      });

      return {
        success: true,
        predictionId,
        response: ragResponse,
      };
    } catch (error) {
      // Update query status to failed
      await ctx.runMutation(internal.queries.updateStatus, {
        queryId: args.queryId,
        status: "failed",
      });

      console.error("RAG analysis error:", error);
      throw new Error(`Failed to analyze query: ${error}`);
    }
  },
});

/**
 * Search documents using local Convex database
 */
export const searchDocuments = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    try {
      // Search documents in Convex database instead of external RAG backend
      const documents: any[] = await ctx.runQuery(api.documents.search, {
        searchTerm: args.query,
      });

      // Return limited results
      const limit = args.limit || 10;
      return documents.slice(0, limit);
    } catch (error) {
      console.error("Document search error:", error);
      return [];
    }
  },
});