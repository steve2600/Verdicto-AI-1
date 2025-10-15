import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Internal-only query to search documents by title/metadata.
 * Kept fast by first indexing by status=processed, then local scoring by title.
 */
export const searchByTitleInternal = internalQuery({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase().trim();

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_status", (q) => q.eq("status", "processed"))
      .collect();

    const matches = documents
      .map((doc) => {
        const title = doc.title.toLowerCase();
        let relevanceScore = 0;

        if (title === searchTerm) {
          relevanceScore = 1.0; // exact
        } else if (title.includes(searchTerm)) {
          relevanceScore = 0.9; // contains
        } else {
          const searchWords = searchTerm.split(/\s+/);
          const matchedWords = searchWords.filter((word) => title.includes(word));
          relevanceScore = (matchedWords.length / searchWords.length) * 0.7;
        }

        return {
          document: doc,
          relevance_score: relevanceScore,
          excerpt: `Document: ${doc.title} (${doc.jurisdiction})`,
        };
      })
      .filter((m) => m.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    return matches;
  },
});
