import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    queryId: v.id("queries"),
    prediction: v.string(),
    confidenceScore: v.number(),
    reasoning: v.string(),
    relatedCases: v.array(v.id("cases")),
    biasFlags: v.array(
      v.object({
        type: v.string(),
        severity: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high")
        ),
        description: v.string(),
      })
    ),
    evidenceSnippets: v.array(
      v.object({
        caseId: v.id("cases"),
        snippet: v.string(),
        relevance: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const predictionId = await ctx.db.insert("predictions", {
      ...args,
      userId,
    });

    return predictionId;
  },
});

export const getByQuery = query({
  args: {
    queryId: v.id("queries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const prediction = await ctx.db
      .query("predictions")
      .withIndex("by_query", (q) => q.eq("queryId", args.queryId))
      .first();

    if (!prediction || prediction.userId !== userId) return null;

    return prediction;
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const predictions = await ctx.db
      .query("predictions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(20);

    return predictions;
  },
});

export const mockAnalysis = mutation({
  args: {
    queryId: v.id("queries"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const cases = await ctx.db.query("cases").take(3);
    const caseIds = cases.map((c) => c._id);

    const predictionId = await ctx.db.insert("predictions", {
      queryId: args.queryId,
      userId,
      prediction:
        "Based on analysis of similar cases, there is a 78% likelihood of a favorable outcome. The key factors include precedent from recent technology law cases and strong constitutional arguments.",
      confidenceScore: 0.78,
      reasoning:
        "This prediction is based on pattern matching with 127 similar cases in our database. The primary supporting factors are: (1) Strong precedent from Tech Corp v. Privacy Alliance (2022), (2) Recent judicial trends favoring privacy protections, and (3) Clear constitutional grounds for the argument.",
      relatedCases: caseIds,
      biasFlags: [
        {
          type: "Geographic Bias",
          severity: "low" as const,
          description:
            "Analysis shows slight regional variation in outcomes. Consider jurisdiction-specific factors.",
        },
        {
          type: "Temporal Bias",
          severity: "medium" as const,
          description:
            "Recent cases show evolving standards. Historical data may not fully reflect current judicial climate.",
        },
      ],
      evidenceSnippets: cases.map((c) => ({
        caseId: c._id,
        snippet: c.description.substring(0, 150) + "...",
        relevance: Math.random() * 0.5 + 0.5,
      })),
    });

    await ctx.db.insert("biasReports", {
      predictionId,
      userId,
      overallScore: 0.82,
      categories: {
        racial: 0.91,
        gender: 0.88,
        socioeconomic: 0.75,
        geographic: 0.79,
        age: 0.85,
      },
      recommendations: [
        "Consider additional review for socioeconomic factors",
        "Geographic variations detected - review jurisdiction-specific precedents",
        "Overall bias score is within acceptable range (>0.75)",
      ],
    });

    return predictionId;
  },
});
