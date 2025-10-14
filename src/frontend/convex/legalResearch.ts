import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Search legal documents using RAG semantic search
 */
export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const RAG_BACKEND_URL = process.env.RAG_BACKEND_URL || "https://verdicto-ai-1-production-3dbc.up.railway.app";
    
    try {
      const response = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8",
        },
        body: JSON.stringify({
          query: args.query,
          limit: args.limit || 10,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("RAG backend error:", response.status, errorText);
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Get document details from Convex for each result
      const documentsWithDetails = await Promise.all(
        (result.results || []).map(async (item: any) => {
          try {
            const doc = await ctx.runQuery(internal.documents.getByIdInternal, {
              documentId: item.document_id,
            });
            return {
              ...item,
              document: doc,
            };
          } catch (error) {
            console.error(`Failed to fetch document ${item.document_id}:`, error);
            return {
              ...item,
              document: null,
            };
          }
        })
      );

      return documentsWithDetails.filter(item => item.document !== null);
    } catch (error) {
      console.error("Semantic search error:", error);
      throw error; // Re-throw to let frontend handle it
    }
  },
});

/**
 * Get all processed legal documents for browsing
 */
export const listProcessedDocuments = query({
  args: {
    jurisdiction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let documentsQuery = ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"));

    const documents = await documentsQuery.collect();

    let filtered = documents;
    if (args.jurisdiction) {
      filtered = filtered.filter((d) => d.jurisdiction === args.jurisdiction);
    }

    return filtered.sort((a, b) => b.uploadDate - a.uploadDate);
  },
});

/**
 * Get unique jurisdictions for filtering
 */
export const getJurisdictions = query({
  args: {},
  handler: async (ctx) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

    const jurisdictions = [...new Set(documents.map(d => d.jurisdiction))];
    return jurisdictions.sort();
  },
});