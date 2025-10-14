import { v } from "convex/values";
import { query, action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Search legal documents using RAG semantic search + title/metadata search
 */
export const semanticSearch = action({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
  },
  // Add an explicit return type to silence TS implicit any
  handler: async (ctx, args): Promise<any[]> => {
    const RAG_BACKEND_URL =
      process.env.RAG_BACKEND_URL ||
      "https://verdicto-ai-1-production-3dbc.up.railway.app";

    try {
      // Search titles/metadata first via internal query in a separate module (breaks TS cycles)
      const titleMatches: any[] = await ctx.runQuery(
        internal.legalResearchHelpers.searchByTitleInternal,
        { query: args.query }
      );

      // Then call RAG content search and merge
      let ragResults: any[] = [];
      try {
        const response = await fetch(
          `${RAG_BACKEND_URL}/api/v1/documents/search`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:
                "Bearer 8ad62148045cbf8137a66e1d8c0974e14f62a970b4fa91afb850f461abfbadb8",
            },
            body: JSON.stringify({
              query: args.query,
              limit: args.limit || 10,
            }),
          }
        );

        if (response.ok) {
          const result = await response.json();

          const documentsWithDetails: any[] = await Promise.all(
            (result.results || []).map(async (item: any) => {
              try {
                const doc = await ctx.runQuery(
                  internal.documents.getByIdInternal,
                  {
                    documentId: item.document_id,
                  }
                );
                return { ...item, document: doc };
              } catch (error) {
                console.error(
                  `Failed to fetch document ${item.document_id}:`,
                  error
                );
                return { ...item, document: null };
              }
            })
          );

          ragResults = documentsWithDetails.filter(
            (item) => item.document !== null
          );
        } else {
          console.warn(
            "RAG backend search failed, using title matches only"
          );
        }
      } catch (error) {
        console.warn(
          "RAG backend unavailable, using title matches only:",
          error
        );
      }

      const titleMatchIds = new Set(
        titleMatches.map((m: any) => m.document._id)
      );
      const uniqueRagResults: any[] = ragResults.filter(
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
}) as any;

/**
 * Internal query to search documents by title and metadata
 */
export const searchByTitleInternal = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase().trim();
    
    // Get all processed documents
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

    // Filter and score by title match
    const matches = documents
      .map((doc) => {
        const title = doc.title.toLowerCase();
        let relevanceScore = 0;
        
        // Exact match gets highest score
        if (title === searchTerm) {
          relevanceScore = 1.0;
        }
        // Title contains the search term
        else if (title.includes(searchTerm)) {
          relevanceScore = 0.9;
        }
        // Search term words appear in title
        else {
          const searchWords = searchTerm.split(/\s+/);
          const matchedWords = searchWords.filter(word => title.includes(word));
          relevanceScore = matchedWords.length / searchWords.length * 0.7;
        }

        return {
          document: doc,
          relevance_score: relevanceScore,
          excerpt: `Document: ${doc.title} (${doc.jurisdiction})`,
        };
      })
      .filter((match) => match.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    return matches;
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