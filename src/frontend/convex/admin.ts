import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const resetDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    try {
      // Collect all IDs first to avoid reading during deletion
      const documentIds = (await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).map(d => d._id);

      const queryIds = (await ctx.db
        .query("queries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).map(q => q._id);

      const predictionIds = (await ctx.db
        .query("predictions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).map(p => p._id);

      const biasReportIds = (await ctx.db
        .query("biasReports")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).map(b => b._id);

      const verdictNoteIds = (await ctx.db
        .query("verdictNotes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).map(v => v._id);

      const comparisonIds = (await ctx.db
        .query("documentComparisons")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()).map(c => c._id);

      // Now delete all items using the collected IDs
      for (const id of documentIds) {
        await ctx.db.delete(id);
      }
      for (const id of queryIds) {
        await ctx.db.delete(id);
      }
      for (const id of predictionIds) {
        await ctx.db.delete(id);
      }
      for (const id of biasReportIds) {
        await ctx.db.delete(id);
      }
      for (const id of verdictNoteIds) {
        await ctx.db.delete(id);
      }
      for (const id of comparisonIds) {
        await ctx.db.delete(id);
      }

      return { success: true, message: "Database reset successfully" };
    } catch (error) {
      throw new Error(`Failed to reset database: ${error}`);
    }
  },
});