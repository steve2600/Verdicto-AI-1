import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    transcript: v.string(),
    verdict: v.string(),
    conclusion: v.string(),
    punishment: v.string(),
    fullAnalysis: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const verdictId = await ctx.db.insert("liveVerdicts", {
      userId,
      transcript: args.transcript,
      verdict: args.verdict,
      conclusion: args.conclusion,
      punishment: args.punishment,
      fullAnalysis: args.fullAnalysis,
      confidence: args.confidence,
      recordedAt: Date.now(),
    });

    return verdictId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const verdicts = await ctx.db
      .query("liveVerdicts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    return verdicts;
  },
});

export const getById = query({
  args: { verdictId: v.id("liveVerdicts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const verdict = await ctx.db.get(args.verdictId);
    if (!verdict || verdict.userId !== userId) {
      throw new Error("Verdict not found or unauthorized");
    }

    return verdict;
  },
});

export const deleteVerdict = mutation({
  args: { verdictId: v.id("liveVerdicts") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const verdict = await ctx.db.get(args.verdictId);
    if (!verdict || verdict.userId !== userId) {
      throw new Error("Verdict not found or unauthorized");
    }

    await ctx.db.delete(args.verdictId);
  },
});
