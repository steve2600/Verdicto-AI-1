"use node";

import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const listProcessedDocuments = query({
  args: {
    jurisdiction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Fetch all processed documents, then restrict to research type (centralized/public)
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

    // Only research documents are public and visible to everyone
    let filtered = documents.filter((d) => d.documentType === "research");

    if (args.jurisdiction) {
      filtered = filtered.filter((d) => d.jurisdiction === args.jurisdiction);
    }

    return filtered;
  },
});

export const getAllResearchStats = query({
  args: {},
  handler: async (ctx) => {
    // Fetch ALL research documents regardless of jurisdiction for statistics
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

    // Only research documents are public
    const researchDocs = documents.filter((d) => d.documentType === "research");

    return {
      total: researchDocs.length,
      processed: researchDocs.filter((d) => d.status === "processed").length,
    };
  },
});

export const getJurisdictions = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all processed documents, then consider only research type (centralized/public)
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

    const set = new Set<string>();
    for (const d of docs) {
      if (d.documentType === "research" && d.jurisdiction) {
        set.add(d.jurisdiction);
      }
    }
    return Array.from(set).sort();
  },
});

export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const RAG_BACKEND_URL =
      process.env.RAG_BACKEND_URL ||
      "https://verdicto-ai-1-production-3dbc.up.railway.app";

    try {
      // 1) Title/metadata search via Convex (fast, exact/contains)
      const titleMatches: any[] = await ctx.runQuery(
        internal.legalResearchHelpers.searchByTitleInternal,
        { query: args.query }
      );

      // 2) Content (semantic) search via RAG backend
      let ragResults: any[] = [];
      try {
        const response = await fetch(`${RAG_BACKEND_URL}/api/v1/documents/search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization":
              "Bearer 8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8",
          },
          body: JSON.stringify({
            query: args.query,
            limit: args.limit || 10,
          }),
        });

        if (response.ok) {
          const result = await response.json();

          const documentsWithDetails = await Promise.all(
            (result.results || []).map(async (item: any) => {
              try {
                const doc = await ctx.runQuery(internal.documents.getByIdInternal, {
                  documentId: item.document_id,
                });
                return { ...item, document: doc };
              } catch (error) {
                console.error(`Failed to fetch document ${item.document_id}:`, error);
                return { ...item, document: null };
              }
            })
          );

          ragResults = documentsWithDetails.filter((item) => item.document !== null);
        } else {
          console.warn("RAG backend search failed, only using title matches");
        }
      } catch (error) {
        console.warn("RAG backend unavailable, only using title matches:", error);
      }

      // 3) Merge results, prioritizing title matches, de-dupe by document id
      const titleMatchIds = new Set(titleMatches.map((m: any) => m.document._id));
      const uniqueRagResults = ragResults.filter(
        (r: any) => !titleMatchIds.has(r.document._id)
      );

      const combinedResults: any[] = [
        ...titleMatches.map((m: any) => ({
          document_id: m.document._id,
          relevance_score: m.relevance_score,
          excerpt: m.excerpt,
          document: m.document,
        })),
        ...uniqueRagResults,
      ];

      return combinedResults.slice(0, args.limit || 20);
    } catch (error) {
      console.error("Semantic search error:", error);
      throw error;
    }
  },
});