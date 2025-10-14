import { query } from "./_generated/server";
import { v } from "convex/values";

export const listProcessedDocuments = query({
  args: {
    jurisdiction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

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
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

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
