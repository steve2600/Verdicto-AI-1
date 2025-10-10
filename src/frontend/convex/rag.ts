"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || "https://verdicto-ai-1-production.up.railway.app";

/**
 * Send document to RAG backend for processing
 */
export const processDocument = action({
  args: {
    documentId: v.id("documents"),
    fileUrl: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Update document status to processing
      await ctx.runMutation(internal.documents.updateStatus, {
        documentId: args.documentId,
        status: "processing",
      });

      // Send to RAG backend for ingestion
      const response = await fetch(`${RAG_BACKEND_URL}/api/v1/hackrx/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_url: args.fileUrl,
          document_title: args.title,
          document_id: args.documentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG backend error: ${response.statusText}`);
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

      // Send to RAG backend for analysis
      const response = await fetch(`${RAG_BACKEND_URL}/api/v1/hackrx/run`, {
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
        throw new Error(`RAG backend error: ${response.statusText}`);
      }

      const result = await response.json();

      // Extract RAG results
      const ragResponse = result.response || result.answer || "";
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
 * Search documents using RAG backend
 */
export const searchDocuments = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(`${RAG_BACKEND_URL}/api/v1/hackrx/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: args.query,
          limit: args.limit || 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`RAG backend error: ${response.statusText}`);
      }

      const result = await response.json();
      return result.results || [];
    } catch (error) {
      console.error("RAG search error:", error);
      return [];
    }
  },
});