// ... keep existing code (imports and defineSchema start)

  liveVerdicts: defineTable({
    userId: v.id("users"),
    transcript: v.string(),
    verdict: v.string(),
    conclusion: v.string(),
    punishment: v.string(),
    fullAnalysis: v.string(),
    confidence: v.number(),
    recordedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "recordedAt"]),

// ... keep existing code (rest of tables and export)
