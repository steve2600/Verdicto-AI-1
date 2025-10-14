import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";

// Generate a knowledge graph from prediction results
export const generateKnowledgeGraph = action({
  // Make args optional to allow demo generation without prediction
  args: {
    queryId: v.optional(v.id("queries")),
    predictionId: v.optional(v.id("predictions")),
    // Accept lightweight prediction data directly to avoid internal self-references
    predictionData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.runQuery(api.users.currentUser);
    if (!user) throw new Error("User not found");

    // Use provided prediction data (avoid calling functions in this same module to prevent TS circular inference)
    const prediction: any = args.predictionData ?? null;

    // Build nodes with safe fallbacks when prediction is unavailable
    const nodes: any[] = [
      {
        id: "current_case",
        label: "Current Case",
        group: "center",
        size: 3,
        color: "#FFD700", // Gold for central case
        courtLevel: "Query",
        // Add null-safe values
        biasScore: prediction?.confidenceScore ?? 0.2,
        summary: prediction?.prediction ?? "Analyze a case to populate this graph.",
        citation: "Current Analysis",
      },
    ];

    const edges: any[] = [];

    // Add nodes from source references if available
    if (prediction?.sourceReferences) {
      prediction.sourceReferences.forEach((ref: any, index: number) => {
        const nodeId = `case_${index}`;
        const relevance = ref.relevance || 0.5;
        
        // Determine color based on relevance/bias
        let color = "#3B82F6"; // Blue for High Court
        if (relevance > 0.8) color = "#FFD700"; // Gold for highly relevant
        else if (relevance < 0.4) color = "#EF4444"; // Red for low relevance

        nodes.push({
          id: nodeId,
          label: ref.documentTitle || `Case ${index + 1}`,
          group: "precedent",
          size: 1 + relevance * 2, // Size based on relevance (1-3)
          color,
          courtLevel: "Referenced Document",
          biasScore: 0.2,
          relevance,
          summary: ref.excerpt || "",
          citation: ref.case_citation || `Page ${ref.page || "N/A"}`,
        });

        // Create edge from current case to this reference
        edges.push({
          source: "current_case",
          target: nodeId,
          value: Math.ceil(relevance * 5), // Edge thickness 1-5
          type: "citation",
        });
      });
    }

    // If no source references, create sample nodes for demo
    if (nodes.length === 1) {
      const sampleCases = [
        { label: "Precedent A (2020)", relevance: 0.92, court: "Supreme Court", color: "#FFD700" },
        { label: "Precedent B (2018)", relevance: 0.84, court: "High Court", color: "#3B82F6" },
        { label: "Precedent C (2019)", relevance: 0.76, court: "High Court", color: "#3B82F6" },
        { label: "Related Case D (2021)", relevance: 0.68, court: "District Court", color: "#C0C0C0" },
        { label: "Related Case E (2017)", relevance: 0.55, court: "District Court", color: "#C0C0C0" },
      ];

      sampleCases.forEach((caseData, index) => {
        const nodeId = `sample_case_${index}`;
        nodes.push({
          id: nodeId,
          label: caseData.label,
          group: "precedent",
          size: 1 + caseData.relevance * 2,
          color: caseData.color,
          courtLevel: caseData.court,
          biasScore: 0.15 + Math.random() * 0.3,
          relevance: caseData.relevance,
          summary: `Sample case from ${caseData.court}`,
          citation: `${caseData.label} Citation`,
        });

        edges.push({
          source: "current_case",
          target: nodeId,
          value: Math.ceil(caseData.relevance * 5),
          type: "citation",
        });
      });
    }

    // Return graph to frontend (persistence is optional and can be done via a separate mutation to avoid circular type inference)
    return { success: true, nodes, edges };
  },
});

// Create a knowledge graph record
export const create = mutation({
  args: {
    userId: v.id("users"),
    queryId: v.optional(v.id("queries")),
    nodes: v.array(v.any()),
    edges: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const graphId = await ctx.db.insert("knowledgeGraphs", {
      userId: args.userId,
      queryId: args.queryId,
      nodes: args.nodes,
      edges: args.edges,
      createdAt: Date.now(),
    });
    return graphId;
  },
});

// Get a specific knowledge graph
export const getById = query({
  args: { graphId: v.id("knowledgeGraphs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.graphId);
  },
});

// Get all knowledge graphs for current user
export const getUserGraphs = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("knowledgeGraphs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Delete a knowledge graph
export const deleteGraph = mutation({
  args: { graphId: v.id("knowledgeGraphs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.graphId);
  },
});

// Add a simple query to fetch a prediction by id for the action above
export const getPredictionByIdForGraph = query({
  args: { predictionId: v.id("predictions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.predictionId);
  },
});

// Get latest prediction for the current user (used by frontend page)
export const getLatestPredictionForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", identity.email))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("predictions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});