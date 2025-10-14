import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const deleteQuery = mutation({
  args: {
    queryId: v.id("queries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const query = await ctx.db.get(args.queryId);
    if (!query) throw new Error("Query not found");
    if (query.userId !== userId) throw new Error("Unauthorized");

    // Delete associated predictions first
    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_query", (q) => q.eq("queryId", args.queryId))
      .collect();

    for (const prediction of predictions) {
      await ctx.db.delete(prediction._id);
    }

    // Delete the query
    await ctx.db.delete(args.queryId);

    return { success: true };
  },
});
