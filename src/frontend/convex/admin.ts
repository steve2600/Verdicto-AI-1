import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const resetDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user to check if they're an admin
    const user = await ctx.db.get(userId);
    
    // Optional: Add admin check here if needed
    // if (user?.role !== "admin") throw new Error("Unauthorized");

    try {
      // Delete all user's documents
      const documents = await ctx.db
        .query("documents")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const doc of documents) {
        await ctx.db.delete(doc._id);
      }

      // Delete all user's queries
      const queries = await ctx.db
        .query("queries")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const query of queries) {
        await ctx.db.delete(query._id);
      }

      // Delete all user's predictions
      const predictions = await ctx.db
        .query("predictions")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const prediction of predictions) {
        await ctx.db.delete(prediction._id);
      }

      // Delete all user's bias reports
      const biasReports = await ctx.db
        .query("biasReports")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const report of biasReports) {
        await ctx.db.delete(report._id);
      }

      // Delete all user's verdict notes
      const verdictNotes = await ctx.db
        .query("verdictNotes")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const note of verdictNotes) {
        await ctx.db.delete(note._id);
      }

      // Delete all user's document comparisons
      const comparisons = await ctx.db
        .query("documentComparisons")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      
      for (const comparison of comparisons) {
        await ctx.db.delete(comparison._id);
      }

      return { success: true, message: "Database reset successfully" };
    } catch (error) {
      throw new Error(`Failed to reset database: ${error}`);
    }
  },
});
