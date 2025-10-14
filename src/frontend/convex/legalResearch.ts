// Add missing imports at the top of the file (if not already present)
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listProcessedDocuments = query({
  args: {
    jurisdiction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Query documents for the current user with documentType = "research"
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter by processed status and research type
    let filtered = documents.filter((d) => d.status === "processed" && d.documentType === "research");

    // Apply jurisdiction filter if provided
    if (args.jurisdiction) {
      filtered = filtered.filter((d) => d.jurisdiction === args.jurisdiction);
    }

    return filtered;
  },
});

export const getJurisdictions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const docs = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Only get jurisdictions from research documents
    const researchDocs = docs.filter((d) => d.documentType === "research");

    const set = new Set<string>();
    for (const d of researchDocs) {
      if (d.jurisdiction) set.add(d.jurisdiction);
    }
    return Array.from(set).sort();
  },
});