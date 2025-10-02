import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables,

    users: defineTable({
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      email: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      role: v.optional(roleValidator),
    }).index("email", ["email"]),

    // Legal cases for reference
    cases: defineTable({
      caseNumber: v.string(),
      title: v.string(),
      description: v.string(),
      outcome: v.string(),
      jurisdiction: v.string(),
      year: v.number(),
      category: v.string(),
      tags: v.array(v.string()),
    })
      .index("by_category", ["category"])
      .index("by_jurisdiction", ["jurisdiction"]),

    // User queries and predictions
    queries: defineTable({
      userId: v.id("users"),
      queryText: v.string(),
      uploadedFiles: v.optional(v.array(v.id("_storage"))),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      ),
    }).index("by_user", ["userId"]),

    // AI predictions and analysis
    predictions: defineTable({
      queryId: v.id("queries"),
      userId: v.id("users"),
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
    })
      .index("by_query", ["queryId"])
      .index("by_user", ["userId"]),

    // Bias analysis reports
    biasReports: defineTable({
      predictionId: v.id("predictions"),
      userId: v.id("users"),
      overallScore: v.number(),
      categories: v.object({
        racial: v.number(),
        gender: v.number(),
        socioeconomic: v.number(),
        geographic: v.number(),
        age: v.number(),
      }),
      recommendations: v.array(v.string()),
    })
      .index("by_prediction", ["predictionId"])
      .index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  }
);

export default schema;